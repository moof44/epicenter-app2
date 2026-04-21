import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { StaffRecords } from '../models/staff-records.model';

@Injectable({
    providedIn: 'root',
})
export class StaffRecordsService {
    private firestore = inject(Firestore);

    async getRecords(uid: string): Promise<StaffRecords | null> {
        const ref = doc(this.firestore, 'staff_records', uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        return snap.data() as StaffRecords;
    }

    /**
     * Checks today's metrics against stored records and updates if any are broken.
     * Returns the list of record keys that were broken.
     */
    async checkAndUpdate(
        uid: string,
        todayMetrics: {
            dailySales: number;
            transactionCount: number;
            highestSingleTx: number;
            checkInsCount: number;
        }
    ): Promise<string[]> {
        const current = await this.getRecords(uid);
        const updates: Partial<StaffRecords> = {};
        const broken: string[] = [];
        const today = new Date();

        if (todayMetrics.dailySales > (current?.highestDailySales?.value || 0)) {
            updates.highestDailySales = { value: todayMetrics.dailySales, date: today };
            broken.push('highestDailySales');
        }

        if (todayMetrics.transactionCount > (current?.mostTransactionsInDay?.value || 0)) {
            updates.mostTransactionsInDay = { value: todayMetrics.transactionCount, date: today };
            broken.push('mostTransactionsInDay');
        }

        if (todayMetrics.highestSingleTx > (current?.highestSingleTransaction?.value || 0)) {
            updates.highestSingleTransaction = { value: todayMetrics.highestSingleTx, date: today };
            broken.push('highestSingleTransaction');
        }

        if (todayMetrics.checkInsCount > (current?.mostCheckInsInDay?.value || 0)) {
            updates.mostCheckInsInDay = { value: todayMetrics.checkInsCount, date: today };
            broken.push('mostCheckInsInDay');
        }

        if (broken.length > 0) {
            updates.lastUpdated = today;
            const ref = doc(this.firestore, 'staff_records', uid);
            await setDoc(ref, updates, { merge: true });
        }

        return broken;
    }
}
