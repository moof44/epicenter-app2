import { Injectable, inject, Injector } from '@angular/core';
import {
    Firestore,
    collection,
    doc,
    query,
    writeBatch,
    increment,
    where,
    documentId,
    getDocs,
    arrayUnion,
} from '@angular/fire/firestore';
import { CartItem, Transaction, InventoryLog, Product } from '../models/store.model';
import { AuthService } from './auth.service';
import { CartStore } from '../store/cart.store';
import { CashRegisterService } from './cash-register.service';
import { ReportStateService } from './report.state.service';
import { toLocalDateStr } from '../utils/date.utils';

import { SyncEngineService } from './dexie/sync-engine.service';
import { OutboxQueueService } from './dexie/outbox-queue.service';
import { ProductRepository } from '../repositories/product.repository';

export function cleanUndefined(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    const proto = Object.getPrototypeOf(obj);
    const isPlain = proto === null || proto === Object.prototype;
    if (!isPlain && !Array.isArray(obj)) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(cleanUndefined);
    }
    const cleanObj: any = {};
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (val !== undefined) {
            cleanObj[key] = cleanUndefined(val);
        }
    }
    return cleanObj;
}

@Injectable({
    providedIn: 'root',
})
export class CheckoutService {
    private firestore = inject(Firestore);
    private injector = inject(Injector);
    private authService = inject(AuthService);
    private cartStore = inject(CartStore);
    private reportStateService = inject(ReportStateService);
    private syncEngineService = inject(SyncEngineService);
    private outboxQueueService = inject(OutboxQueueService);
    private productRepository = inject(ProductRepository);

    private productsCollection = collection(this.firestore, 'products');
    private transactionsCollection = collection(this.firestore, 'transactions');
    private inventoryLogsCollection = collection(this.firestore, 'inventory_logs');

    async checkout(
        customItems?: CartItem[],
        performedBy = 'SYSTEM_POS',
        paymentMethod: 'CASH' | 'GCASH' = 'CASH',
        referenceNumber?: string,
        amountTendered?: number,
        changeDue?: number,
        memberId?: string | null,
        memberName?: string
    ): Promise<string> {
        // Enforce Open Register — lazy-resolve to avoid circular DI
        const cashRegisterService = this.injector.get(CashRegisterService);

        const valid = await cashRegisterService.ensureValidShiftForTransaction();
        if (!valid) {
            throw new Error('Transaction blocked: Register is closed. Please open a shift.');
        }

        const isCustomTransaction = !!customItems;
        const cartItems = customItems || this.cartStore.items();

        if (cartItems.length === 0) throw new Error('Cart is empty');

        const clientTxId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        const isOnline = this.syncEngineService.isOnlineSignal();

        // OFFLINE OUTBOX FALLBACK
        if (!isOnline) {
            // 1. Optimistically deduct local stock in Dexie
            for (const item of cartItems) {
                await this.productRepository.deductStockLocal(item.productId, item.quantity);
            }

            // 2. Queue transaction payload into Dexie Outbox Queue
            await this.outboxQueueService.addToOutbox({
                clientTxId,
                type: 'POS_SALE',
                payload: {
                    cartItems,
                    performedBy,
                    paymentMethod,
                    referenceNumber: referenceNumber || null,
                    amountTendered: amountTendered || null,
                    changeDue: changeDue || null,
                    memberId: memberId || null,
                    memberName: memberName || 'Walk-in',
                },
            });

            if (!isCustomTransaction) {
                this.cartStore.clear();
            }

            return clientTxId;
        }

        const batch = writeBatch(this.firestore);
        const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
        const timestamp = new Date();

        // 1. Fetch current product states for stock deduction + audit log
        const productIds = [...new Set(cartItems.map(i => i.productId))];
        const productsMap = new Map<string, Product>();

        const chunkedIds: string[][] = [];
        for (let i = 0; i < productIds.length; i += 10) {
            chunkedIds.push(productIds.slice(i, i + 10));
        }
        for (const chunk of chunkedIds) {
            const q = query(this.productsCollection, where(documentId(), 'in', chunk));
            const snapshot = await getDocs(q);
            snapshot.forEach(d => productsMap.set(d.id, { id: d.id, ...d.data() } as Product));
        }

        // 2. Deduct stock + create inventory logs
        const staff = this.authService.userProfile();
        for (const item of cartItems) {
            const product = productsMap.get(item.productId);
            if (!product) continue;

            const productRef = doc(this.firestore, 'products', item.productId);
            const previousStock = product.stock;
            const newStock = previousStock - item.quantity;

            batch.update(productRef, { stock: increment(-item.quantity) });

            const logRef = doc(this.inventoryLogsCollection);
            const log: InventoryLog = {
                productId: item.productId,
                productName: product.name,
                type: 'SALE',
                changeAmount: -item.quantity,
                previousStock,
                newStock,
                timestamp,
                performedBy,
                staffId: staff?.uid,
                staffName: staff?.displayName,
            };
            batch.set(logRef, cleanUndefined(log));
        }

        // 3. Create transaction record
        const transaction: Omit<Transaction, 'id'> = {
            date: timestamp,
            totalAmount: total,
            status: 'COMPLETED',
            items: cartItems,
            staffId: staff?.uid || null,
            staffName: staff?.displayName || null,
            paymentMethod,
            referenceNumber: referenceNumber || null,
            amountTendered: amountTendered || null,
            changeDue: changeDue || null,
            memberId: memberId || null,
            memberName: memberName || 'Walk-in',
        };
        const transactionRef = doc(this.transactionsCollection);
        batch.set(transactionRef, cleanUndefined(transaction));

        // 3.5. Auto-tag member with 'FOUNDER' badge if buying eligible launch products (July 1 - August 31, 2026)
        if (memberId) {
            const startWindow = new Date('2026-07-01T00:00:00');
            const endWindow = new Date('2026-08-31T23:59:59');
            if (timestamp >= startWindow && timestamp <= endWindow) {
                const targetProductIds = [
                    'Qfi33eVnbxN6kIPRTGbT', // Monthly Membership
                    'TKNm92Ekg87gub4eHCHO', // Monthly Membership (w/ coaching)
                    'GxNrhJR5CVSpnQuy4PwN', // Personal Training (1 Month)
                    'kA3g2qW4jS1u235leAjK'  // Personal Training (1 Month) (Group)
                ];
                const hasEligibleProduct = cartItems.some(item => targetProductIds.includes(item.productId));
                if (hasEligibleProduct) {
                    const memberRef = doc(this.firestore, 'members', memberId);
                    batch.update(memberRef, {
                        tags: arrayUnion('FOUNDER')
                    });
                }
            }
        }

        // 4. Update daily_sales (denormalized aggregate)
        const dateStr = toLocalDateStr(timestamp);
        const dfsRef = doc(this.firestore, 'daily_sales', dateStr);
        batch.set(dfsRef, { date: timestamp, totalSales: increment(total) }, { merge: true });

        // 5. Update shift atomically
        const shiftId = cashRegisterService.getCurrentShiftId();
        if (shiftId) {
            const shiftRef = doc(this.firestore, 'shifts', shiftId);

            const productSummary = cartItems
                .map(item => (item.quantity > 1 ? `${item.productName} (x${item.quantity})` : item.productName))
                .join(', ');

            const cashTx = {
                type: 'Sale',
                amount: total,
                reason: `POS Sale #${transactionRef.id.slice(0, 8)}`,
                performedBy: staff?.displayName || performedBy,
                relatedTransactionId: transactionRef.id,
                paymentMethod,
                timestamp,
                productsSummary: productSummary,
                memberName: memberName || 'Walk-in',
            };

            const shiftUpdates: any = {
                transactions: arrayUnion(cashTx),
                totalSales: increment(total),
                totalRevenue: increment(total),
            };

            if (paymentMethod === 'GCASH') {
                shiftUpdates.totalGcashSales = increment(total);
            } else {
                shiftUpdates.totalCashSales = increment(total);
                shiftUpdates.expectedClosingBalance = increment(total);
            }

            batch.update(shiftRef, shiftUpdates);
        }

        await batch.commit();

        // 6. Post-commit: refresh shift UI, clear cart, invalidate sales cache
        cashRegisterService.refreshShift();

        if (staff?.uid) {
            this.reportStateService.invalidateUserSalesReport(staff.uid, timestamp);
        }

        if (!isCustomTransaction) {
            this.cartStore.clear();
        }



        return transactionRef.id;
    }
}
