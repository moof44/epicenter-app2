import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { TransactionService } from './transaction.service';
import { DailySalesService } from './daily-sales.service';
import { DailySales, Transaction } from '../models/store.model';

@Injectable({
    providedIn: 'root'
})
export class ReportStateService {
    private transactionService = inject(TransactionService);
    private dailySalesService = inject(DailySalesService);

    // Observable caches — shared live Firestore listeners via shareReplay
    private monthlyObservableCache = new Map<string, Observable<{ days: DailySales[], total: number }>>();
    private userSalesObservableCache = new Map<string, Observable<{ transactions: Transaction[], total: number }>>();

    /**
     * Get Monthly Report — shared live observable.
     * All subscribers share the same Firestore listener.
     * New subscribers get the last emitted value immediately via shareReplay.
     */
    getMonthlyReport(year: number, month: number): Observable<{ days: DailySales[], total: number }> {
        const key = `${year}-${month}`;

        if (!this.monthlyObservableCache.has(key)) {
            const live$ = this.dailySalesService.getMonthlySalesReport(year, month).pipe(
                shareReplay({ bufferSize: 1, refCount: true })
            );
            this.monthlyObservableCache.set(key, live$);
        }

        return this.monthlyObservableCache.get(key)!;
    }

    /**
     * Invalidate a specific month's cached observable.
     * Next call to getMonthlyReport() for this month will create a fresh listener.
     */
    invalidateMonthlyReport(year: number, month: number): void {
        const key = `${year}-${month}`;
        this.monthlyObservableCache.delete(key);
    }

    /**
     * Get User Sales Report — fresh server data on each unique month+user combination.
     * Uses getTransactionsOnce (getDocs) for the transaction list.
     * Total is computed from the filtered transaction list (client-side).
     * Cache is invalidated after checkout/void operations.
     */
    getUserSalesReport(userId: string, date: Date): Observable<{ transactions: Transaction[], total: number }> {
        const year = date.getFullYear();
        const month = date.getMonth();
        const key = `${year}-${month}-${userId}`;

        if (!this.userSalesObservableCache.has(key)) {
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

            const live$ = new Observable<{ transactions: Transaction[], total: number }>(observer => {
                this.transactionService.getTransactionsOnce({
                    startDate,
                    endDate,
                    staffId: userId,
                    limit: 500
                }).then(txs => {
                    const transactions = txs.filter(tx => tx.status !== 'VOID');
                    const total = transactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
                    observer.next({ transactions, total });
                    observer.complete();
                }).catch(() => {
                    observer.next({ transactions: [], total: 0 });
                    observer.complete();
                });
            }).pipe(
                shareReplay({ bufferSize: 1, refCount: false })
            );

            this.userSalesObservableCache.set(key, live$);
        }

        return this.userSalesObservableCache.get(key)!;
    }

    /**
     * Invalidate a specific user sales cached observable.
     */
    invalidateUserSalesReport(userId: string, date: Date): void {
        const year = date.getFullYear();
        const month = date.getMonth();
        const key = `${year}-${month}-${userId}`;
        this.userSalesObservableCache.delete(key);
    }

    /**
     * Clear all caches (e.g. on Logout)
     */
    clearCache(): void {
        this.monthlyObservableCache.clear();
        this.userSalesObservableCache.clear();
    }
}
