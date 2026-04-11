import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom, take, shareReplay } from 'rxjs';
import { StoreService } from './store.service';
import { DailySales, Transaction } from '../models/store.model';

@Injectable({
    providedIn: 'root'
})
export class ReportStateService {
    private storeService = inject(StoreService);

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
            const live$ = this.storeService.getMonthlySalesReport(year, month).pipe(
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
     * Get User Sales Report — shared live observable.
     */
    getUserSalesReport(userId: string, date: Date): Observable<{ transactions: Transaction[], total: number }> {
        const year = date.getFullYear();
        const month = date.getMonth();
        const key = `${year}-${month}-${userId}`;

        if (!this.userSalesObservableCache.has(key)) {
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0, 23, 59, 59);

            const live$ = new Observable<{ transactions: Transaction[], total: number }>(observer => {
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

                const txPromise = firstValueFrom(transactions$.pipe(take(1)));

                Promise.all([txPromise, totalPromise]).then(([txs, total]) => {
                    const transactions = txs.map(tx => ({
                        ...tx,
                        date: tx.date instanceof Date ? tx.date : (tx.date as any).toDate()
                    }));
                    observer.next({ transactions, total });
                    observer.complete();
                }).catch(err => observer.error(err));
            }).pipe(
                shareReplay({ bufferSize: 1, refCount: true })
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
