import { Injectable, inject } from '@angular/core';
import {
    Firestore,
    doc,
    setDoc,
    getDocs,
    collection,
    query,
    where,
    documentId,
} from '@angular/fire/firestore';
import { increment } from '@angular/fire/firestore';
import { toLocalDateStr } from '../utils/date.utils';

@Injectable({
    providedIn: 'root',
})
export class StaffActivityService {
    private firestore = inject(Firestore);
    private activityCollection = collection(this.firestore, 'staff_activity');

    /**
     * Fire-and-forget: mark today as active for this staff.
     * Uses setDoc with merge — idempotent, creates or updates.
     */
    async updateActivity(
        uid: string,
        increments: Partial<{ salesCount: number; checkInsCount: number; totalSales: number }>
    ): Promise<void> {
        const todayStr = toLocalDateStr(new Date());
        const docId = `${uid}_${todayStr}`;
        const ref = doc(this.firestore, 'staff_activity', docId);

        const data: any = {
            uid,
            date: todayStr,
            lastActionAt: new Date(),
        };

        if (increments.salesCount) data.salesCount = increment(increments.salesCount);
        if (increments.checkInsCount) data.checkInsCount = increment(increments.checkInsCount);
        if (increments.totalSales) data.totalSales = increment(increments.totalSales);

        await setDoc(ref, data, { merge: true });
    }

    /**
     * Calculate the current streak by fetching the last 30 days of activity.
     */
    async getStreak(uid: string): Promise<number> {
        const activeDates = await this.getActivityDays(uid, 30);
        return this.calculateStreak(activeDates, new Date());
    }

    async getActivityDays(uid: string, days: number): Promise<Set<string>> {
        const today = new Date();
        const past = new Date(today);
        past.setDate(past.getDate() - days);

        const startId = `${uid}_${toLocalDateStr(past)}`;
        const endId = `${uid}_${toLocalDateStr(today)}`;

        const q = query(
            this.activityCollection,
            where(documentId(), '>=', startId),
            where(documentId(), '<=', endId)
        );

        const snapshot = await getDocs(q);
        const dates = new Set<string>();
        snapshot.docs.forEach(d => {
            const data = d.data();
            if (data['date']) dates.add(data['date']);
        });
        return dates;
    }

    private calculateStreak(activeDates: Set<string>, today: Date): number {
        let streak = 0;
        const current = new Date(today);

        const todayStr = toLocalDateStr(current);
        if (!activeDates.has(todayStr)) {
            current.setDate(current.getDate() - 1);
        }

        while (true) {
            const dateStr = toLocalDateStr(current);
            if (activeDates.has(dateStr)) {
                streak++;
                current.setDate(current.getDate() - 1);
            } else {
                break;
            }
        }

        return streak;
    }
}
