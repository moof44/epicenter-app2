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

@Injectable({
    providedIn: 'root',
})
export class CheckoutService {
    private firestore = inject(Firestore);
    private injector = inject(Injector);
    private authService = inject(AuthService);
    private cartStore = inject(CartStore);
    private reportStateService = inject(ReportStateService);
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
            batch.set(logRef, log);
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
        batch.set(transactionRef, transaction);

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
