import { Injectable, inject } from '@angular/core';
import {
    Firestore,
    collection,
    collectionData,
    doc,
    query,
    writeBatch,
    where,
    documentId,
    getDocs,
    setDoc,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { Transaction, DailySales } from '../models/store.model';
import { toLocalDateStr } from '../utils/date.utils';

@Injectable({
    providedIn: 'root',
})
export class DailySalesService {
    private firestore = inject(Firestore);
    private transactionsCollection = collection(this.firestore, 'transactions');
    private dailySalesCollection = collection(this.firestore, 'daily_sales');

    getMonthlySalesReport(
        year: number,
        month: number
    ): Observable<{ days: DailySales[]; total: number }> {
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59);

        const startId = toLocalDateStr(startDate);
        const endId = toLocalDateStr(endDate);

        const q = query(
            this.dailySalesCollection,
            where(documentId(), '>=', startId),
            where(documentId(), '<=', endId)
        );

        return collectionData(q, { idField: 'id' }).pipe(
            map(docs => {
                let monthlyTotal = 0;

                // Pre-fill all days of the month with 0 for chart/table continuity
                const dailyMap = new Map<string, number>();
                const daysInMonth = endDate.getDate();
                for (let i = 1; i <= daysInMonth; i++) {
                    const d = new Date(year, month, i);
                    dailyMap.set(toLocalDateStr(d), 0);
                }

                docs.forEach((d: any) => {
                    dailyMap.set(d.id, d.totalSales);
                    monthlyTotal += d.totalSales;
                });

                const sortedDays = Array.from(dailyMap.entries())
                    .map(([k, v]) => ({ date: new Date(k), totalSales: v }))
                    .sort((a, b) => a.date.getTime() - b.date.getTime());

                return { days: sortedDays, total: monthlyTotal };
            })
        );
    }

    /**
     * ADMIN UTILITY: Rebuilds the entire daily_sales collection from transactions.
     * Run once for initial population or full reconciliation.
     */
    async recalculateDailySales(): Promise<void> {
        const allTransactions = await getDocs(this.transactionsCollection);
        const salesMap = new Map<string, number>();

        allTransactions.forEach(docSnap => {
            const data = docSnap.data() as Transaction;
            if (data.status === 'VOID') return;

            const date =
                data.date instanceof Date ? data.date : (data.date as any).toDate();
            const dateStr = toLocalDateStr(date);
            salesMap.set(dateStr, (salesMap.get(dateStr) || 0) + data.totalAmount);
        });

        let batch = writeBatch(this.firestore);
        let count = 0;

        for (const [dateStr, total] of salesMap.entries()) {
            const ref = doc(this.firestore, 'daily_sales', dateStr);
            batch.set(ref, {
                totalSales: total,
                date: new Date(dateStr + 'T00:00:00'),
            });
            count++;
            if (count >= 400) {
                await batch.commit();
                batch = writeBatch(this.firestore);
                count = 0;
            }
        }
        if (count > 0) {
            await batch.commit();
        }
    }

    async recalculateSalesForDay(date: Date): Promise<void> {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        const q = query(
            this.transactionsCollection,
            where('date', '>=', start),
            where('date', '<=', end)
        );

        const snapshot = await getDocs(q);
        let totalSales = 0;

        snapshot.forEach(docSnap => {
            const data = docSnap.data() as Transaction;
            if (data.status === 'VOID') return;
            totalSales += data.totalAmount || 0;
        });

        const dateStr = toLocalDateStr(start);
        const ref = doc(this.firestore, 'daily_sales', dateStr);
        await setDoc(ref, { totalSales, date: start }, { merge: true });
    }

    async recalculateSalesForMonth(year: number, month: number): Promise<void> {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

        const q = query(
            this.transactionsCollection,
            where('date', '>=', start),
            where('date', '<=', end)
        );

        const snapshot = await getDocs(q);
        const salesMap = new Map<string, number>();

        snapshot.forEach(docSnap => {
            const data = docSnap.data() as Transaction;
            if (data.status === 'VOID') return;

            const date =
                data.date instanceof Date ? data.date : (data.date as any).toDate();
            const dateStr = toLocalDateStr(date);
            salesMap.set(dateStr, (salesMap.get(dateStr) || 0) + data.totalAmount);
        });

        let batch = writeBatch(this.firestore);
        let count = 0;

        for (const [dateStr, total] of salesMap) {
            const ref = doc(this.firestore, 'daily_sales', dateStr);
            batch.set(ref, {
                totalSales: total,
                date: new Date(dateStr + 'T00:00:00'),
            });
            count++;
            if (count >= 400) {
                await batch.commit();
                batch = writeBatch(this.firestore);
                count = 0;
            }
        }
        if (count > 0) {
            await batch.commit();
        }
    }

    /**
     * MIGRATION: Deletes all daily_sales docs and rebuilds using local-date keys.
     * Run once after deploying the timezone fix.
     */
    async migrateDailySalesToLocalDateKeys(): Promise<void> {
        const allDocs = await getDocs(this.dailySalesCollection);
        let deleteBatch = writeBatch(this.firestore);
        let deleteCount = 0;

        allDocs.forEach(docSnap => {
            deleteBatch.delete(docSnap.ref);
            deleteCount++;
            if (deleteCount >= 400) {
                deleteBatch.commit();
                deleteBatch = writeBatch(this.firestore);
                deleteCount = 0;
            }
        });
        if (deleteCount > 0) {
            await deleteBatch.commit();
        }

        await this.recalculateDailySales();
    }
}
