import { Injectable, inject } from '@angular/core';
import { Observable, of, tap, firstValueFrom, take } from 'rxjs';
import { StoreService } from './store.service';
import { DailySales, Transaction } from '../models/store.model';

@Injectable({
    providedIn: 'root'
})
export class ReportStateService {
    private storeService = inject(StoreService);

    // Cache Storage
    // Key: "YYYY-MM"
    private monthlyCache = new Map<string, { days: DailySales[], total: number }>();

    // Key: "YYYY-MM-USERID"
    private userSalesCache = new Map<string, { transactions: Transaction[], total: number }>();

    /**
     * Get Monthly Report (Cached or Network)
     */
    getMonthlyReport(year: number, month: number, forceRefresh = false): Observable<{ days: DailySales[], total: number }> {
        const key = `${year}-${month}`;

        if (!forceRefresh && this.monthlyCache.has(key)) {
            return of(this.monthlyCache.get(key)!);
        }

        return this.storeService.getMonthlySalesReport(year, month).pipe(
            tap(data => this.monthlyCache.set(key, data))
        );
    }

    /**
     * Get User Sales Report (Cached or Network)
     */
    getUserSalesReport(userId: string, date: Date, forceRefresh = false): Observable<{ transactions: Transaction[], total: number }> {
        const year = date.getFullYear();
        const month = date.getMonth();
        const key = `${year}-${month}-${userId}`;

        if (!forceRefresh && this.userSalesCache.has(key)) {
            return of(this.userSalesCache.get(key)!);
        }

        // We need to reconstruct the logic from the component here to make it cacheable as a unit
        // The component fetched Transactions (limited) and Total (aggregated) separately.
        // We should expose a method in StoreService that does both, OR compose them here.
        // Let's compose them here similar to the Component logic, but flattened.

        // ACTUALLY: The component combines them. It's better if we move that combining logic HERE
        // so the result { transactions, total } is what we cache.

        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59);

        // Using the StoreService methods directly
        const transactions$ = this.storeService.getTransactions({
            startDate,
            endDate,
            staffId: userId,
            limit: 100
        });

        const totalPromise = this.storeService.getSalesTotal({
            startDate,
            endDate,
            staffId: userId
        });

        // We need to return an Observable that emits the combined result
        // We can use the logic from the component, but we can't use `combineLatest` seamlessly with the Promise unless we convert it.

        return new Observable(observer => {
            const txPromise = firstValueFrom(transactions$.pipe(take(1)));

            Promise.all([txPromise, totalPromise]).then(([txs, total]) => {
                // Normalize dates
                const transactions = txs.map(tx => ({
                    ...tx,
                    date: tx.date instanceof Date ? tx.date : (tx.date as any).toDate()
                }));

                const result = { transactions, total };
                this.userSalesCache.set(key, result);
                observer.next(result);
                observer.complete();
            }).catch(err => observer.error(err));
        });
    }

    /**
     * Clear all caches (e.g. on Logout or Hard Refresh)
     */
    clearCache() {
        this.monthlyCache.clear();
        this.userSalesCache.clear();
    }
}
