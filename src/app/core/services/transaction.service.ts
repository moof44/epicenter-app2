import { Injectable, inject, Injector } from '@angular/core';
import {
    Firestore,
    collection,
    collectionData,
    doc,
    query,
    orderBy,
    writeBatch,
    increment,
    limit,
    where,
    documentId,
    getDoc,
    getDocs,
    sum,
    getAggregateFromServer,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { Product, Transaction, ProductSalesData, InventoryLog, PaymentMethod } from '../models/store.model';
import { AuthService } from './auth.service';
import { CashRegisterService } from './cash-register.service';
import { toLocalDateStr } from '../utils/date.utils';
import { createConverter } from '../utils/firestore-converter.utils';

@Injectable({
    providedIn: 'root',
})
export class TransactionService {
    private firestore = inject(Firestore);
    private injector = inject(Injector);
    private authService = inject(AuthService);
    private transactionsCollection = collection(this.firestore, 'transactions').withConverter(
        createConverter<Transaction>()
    );
    private inventoryLogsCollection = collection(this.firestore, 'inventory_logs').withConverter(
        createConverter<InventoryLog>()
    );

    getTransactions(
        constraints: {
            limit?: number;
            startDate?: Date;
            endDate?: Date;
            paymentMethod?: PaymentMethod;
            memberId?: string;
            referenceNumber?: string;
            staffName?: string;
            staffId?: string;
        } = {}
    ): Observable<Transaction[]> {
        const queryConstraints: any[] = [orderBy('date', 'desc')];

        if (constraints.startDate) {
            queryConstraints.push(where('date', '>=', constraints.startDate));
        }
        if (constraints.endDate) {
            queryConstraints.push(where('date', '<=', constraints.endDate));
        }
        if (constraints.paymentMethod) {
            queryConstraints.push(where('paymentMethod', '==', constraints.paymentMethod));
        }
        if (constraints.memberId) {
            queryConstraints.push(where('memberId', '==', constraints.memberId));
        }
        if (constraints.referenceNumber) {
            queryConstraints.push(where('referenceNumber', '==', constraints.referenceNumber));
        }
        if (constraints.staffName) {
            queryConstraints.push(where('staffName', '==', constraints.staffName));
        }
        if (constraints.staffId) {
            queryConstraints.push(where('staffId', '==', constraints.staffId));
        }

        const limitCount = constraints.limit ?? 50;
        queryConstraints.push(limit(limitCount));

        const q = query(this.transactionsCollection, ...queryConstraints);
        return collectionData(q);
    }

    async getSalesTotal(constraints: {
        startDate?: Date;
        endDate?: Date;
        staffId?: string;
    }): Promise<number> {
        const queryConstraints: any[] = [];
        if (constraints.startDate) queryConstraints.push(where('date', '>=', constraints.startDate));
        if (constraints.endDate) queryConstraints.push(where('date', '<=', constraints.endDate));
        if (constraints.staffId) queryConstraints.push(where('staffId', '==', constraints.staffId));
        queryConstraints.push(where('status', '==', 'COMPLETED'));

        const q = query(this.transactionsCollection, ...queryConstraints);
        const snapshot = await getAggregateFromServer(q, {
            totalSales: sum('totalAmount'),
        });

        return snapshot.data().totalSales;
    }

    /**
     * One-time read of transactions (no real-time listener).
     * Use for reports where fresh server data is required and real-time updates are not needed.
     * Note: 'status' filter is NOT applied at the Firestore query level to avoid requiring
     * a composite index with staffId + status + date. Filter VOID client-side instead.
     */
    async getTransactionsOnce(constraints: {
        limit?: number;
        startDate?: Date;
        endDate?: Date;
        staffId?: string;
    } = {}): Promise<Transaction[]> {
        const queryConstraints: any[] = [orderBy('date', 'desc')];

        if (constraints.startDate) queryConstraints.push(where('date', '>=', constraints.startDate));
        if (constraints.endDate) queryConstraints.push(where('date', '<=', constraints.endDate));
        if (constraints.staffId) queryConstraints.push(where('staffId', '==', constraints.staffId));

        const limitCount = constraints.limit ?? 500;
        queryConstraints.push(limit(limitCount));

        const q = query(this.transactionsCollection, ...queryConstraints);
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data());
    }

    getSalesAnalytics(): Observable<{
        topSelling: ProductSalesData[];
        lowPerformance: ProductSalesData[];
        totalRevenue: number;
        monthlyRevenue: number;
        todayRevenue: number;
    }> {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        return this.getTransactions({ limit: 1000 }).pipe(
            map((transactions) => {
                const salesMap = new Map<string, ProductSalesData>();
                let totalRevenue = 0;
                let monthlyRevenue = 0;
                let todayRevenue = 0;

                transactions.forEach((tx) => {
                    if (tx.status === 'VOID') return;

                    const txDate = tx.date;
                    totalRevenue += tx.totalAmount;

                    if (txDate >= startOfMonth && txDate <= endOfMonth) {
                        monthlyRevenue += tx.totalAmount;
                    }
                    if (txDate >= startOfToday && txDate <= endOfToday) {
                        todayRevenue += tx.totalAmount;
                    }

                    tx.items.forEach((item) => {
                        const existing = salesMap.get(item.productId);
                        if (existing) {
                            existing.totalQuantitySold += item.quantity;
                            existing.totalRevenue += item.subtotal;
                        } else {
                            salesMap.set(item.productId, {
                                productId: item.productId,
                                productName: item.productName,
                                totalQuantitySold: item.quantity,
                                totalRevenue: item.subtotal,
                            });
                        }
                    });
                });

                const salesData = Array.from(salesMap.values());
                const sortedBySales = [...salesData].sort(
                    (a, b) => b.totalQuantitySold - a.totalQuantitySold
                );

                return {
                    topSelling: sortedBySales.slice(0, 5),
                    lowPerformance: sortedBySales.slice(-5).reverse(),
                    totalRevenue,
                    monthlyRevenue,
                    todayRevenue,
                };
            })
        );
    }

    async voidTransaction(transactionId: string, reason: string): Promise<void> {
        const staff = this.authService.userProfile();
        if (!staff) throw new Error('Authentication required');

        const txRef = doc(this.firestore, 'transactions', transactionId).withConverter(
            createConverter<Transaction>()
        );
        const txSnap = await getDoc(txRef);
        if (!txSnap.exists()) throw new Error('Transaction not found');

        const txData = txSnap.data();

        if (txData.status === 'VOID') {
            throw new Error('Transaction is already voided');
        }

        const batch = writeBatch(this.firestore);
        const now = new Date();

        const productIds = [...new Set(txData.items.map((i) => i.productId))];
        const productsMap = new Map<string, Product>();

        const chunkedIds: string[][] = [];
        for (let i = 0; i < productIds.length; i += 10) {
            chunkedIds.push(productIds.slice(i, i + 10));
        }

        const productConverter = createConverter<Product>();
        for (const chunk of chunkedIds) {
            const q = query(
                collection(this.firestore, 'products').withConverter(productConverter),
                where(documentId(), 'in', chunk)
            );
            const snapshot = await getDocs(q);
            snapshot.forEach((d) => productsMap.set(d.id, d.data()));
        }

        for (const item of txData.items) {
            const product = productsMap.get(item.productId);
            if (!product) continue;

            const productRef = doc(this.firestore, 'products', item.productId);
            batch.update(productRef, { stock: increment(item.quantity) });

            const logRef = doc(this.inventoryLogsCollection);
            const log: InventoryLog = {
                productId: item.productId,
                productName: product.name,
                type: 'AUDIT_ADJUSTMENT',
                changeAmount: item.quantity,
                previousStock: product.stock,
                newStock: product.stock + item.quantity,
                timestamp: now,
                performedBy: 'VOID_SYSTEM',
                staffId: staff.uid,
                staffName: staff.displayName,
                notes: `Voided Transaction: ${transactionId} (${reason})`,
            };
            batch.set(logRef, log);
        }

        batch.update(txRef, {
            status: 'VOID',
            voidedBy: staff.displayName || staff.uid,
            voidReason: reason,
            voidedAt: now,
        });

        const txDate = txData.date;
        const dateStr = toLocalDateStr(txDate);
        const dfsRef = doc(this.firestore, 'daily_sales', dateStr);
        batch.set(dfsRef, { totalSales: increment(-txData.totalAmount) }, { merge: true });

        const cashRegisterService = this.injector.get(CashRegisterService);
        let shiftDataUpdates: { shiftRef: any; updates: any } | null = null;
        try {
            shiftDataUpdates = await cashRegisterService.getVoidTransactionShiftUpdates(
                transactionId,
                txDate
            );
            if (shiftDataUpdates) {
                batch.update(shiftDataUpdates.shiftRef, shiftDataUpdates.updates);
            }
        } catch (e) {
            console.error('Failed to pre-fetch shift updates for voiding:', e);
        }

        await batch.commit();

        // Invalidate user sales cache for the affected staff member
        const { ReportStateService } = await import('./report.state.service');
        const reportStateService = this.injector.get(ReportStateService);
        if (txData.staffId) {
            reportStateService.invalidateUserSalesReport(txData.staffId, txDate);
        }

        if (
            shiftDataUpdates &&
            cashRegisterService.getCurrentShiftId() === shiftDataUpdates.shiftRef.id
        ) {
            cashRegisterService.refreshShift();
        }
    }
}
