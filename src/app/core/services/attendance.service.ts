import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import {
    Firestore,
    collection,
    collectionData,
    query,
    where,
    orderBy,
    addDoc,
    doc,
    updateDoc,
    Timestamp,
    getDocs,
    limit,
    startAfter,
    QueryDocumentSnapshot,
} from '@angular/fire/firestore';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { AttendanceRecord } from '../models/attendance.model';
import { Member } from '../models/member.model';
import { createConverter } from '../utils/firestore-converter.utils';

import { SyncEngineService } from './dexie/sync-engine.service';
import { OutboxQueueService } from './dexie/outbox-queue.service';

@Injectable({
    providedIn: 'root',
})
export class AttendanceService {
    private firestore: Firestore = inject(Firestore);
    private authService = inject(AuthService);
    private syncEngineService = inject(SyncEngineService);
    private outboxQueueService = inject(OutboxQueueService);
    private collectionPath = 'attendance';
    private attendanceCollection = collection(this.firestore, this.collectionPath).withConverter(
        createConverter<AttendanceRecord>()
    );

    private get _currentUserSnapshot() {
        const user = this.authService.userProfile();
        if (!user) throw new Error('Action requires authentication');
        return {
            uid: user.uid,
            name: user.displayName,
        };
    }

    private getLocalDateString(date: Date = new Date()): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    getActiveCheckIns(): Observable<AttendanceRecord[]> {
        const q = query(this.attendanceCollection, where('status', '==', 'Checked In'));
        return collectionData(q).pipe(
            map((records) => [...records].sort((a, b) => b.checkInTime.getTime() - a.checkInTime.getTime()))
        );
    }

    async getHistoryByDate(dateStr: string): Promise<AttendanceRecord[]> {
        const q = query(this.attendanceCollection, where('date', '==', dateStr));

        const snapshot = await getDocs(q);
        const records = snapshot.docs.map((doc) => doc.data());

        return records.sort((a, b) => b.checkInTime.getTime() - a.checkInTime.getTime());
    }

    async getAttendanceRange(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
        const q = query(
            this.attendanceCollection,
            where('date', '>=', startDate),
            where('date', '<=', endDate)
        );

        const snapshot = await getDocs(q);
        const records = snapshot.docs.map((doc) => doc.data());

        return records.sort((a, b) => {
            const timeA = a.checkInTime?.getTime() || 0;
            const timeB = b.checkInTime?.getTime() || 0;
            return timeB - timeA;
        });
    }

    async getMemberAttendance(memberId: string): Promise<AttendanceRecord[]> {
        const q = query(
            this.attendanceCollection,
            where('memberId', '==', memberId),
            orderBy('checkInTime', 'desc'),
            limit(100)
        );

        const snapshot = await getDocs(q);
        const records = snapshot.docs.map((doc) => doc.data());

        return records
            .sort((a, b) => b.checkInTime.getTime() - a.checkInTime.getTime())
            .slice(0, 365);
    }

    async getMemberAttendancePage(
        memberId: string,
        limitCount = 20,
        lastDoc?: QueryDocumentSnapshot<AttendanceRecord>
    ): Promise<{
        records: AttendanceRecord[];
        lastDoc: QueryDocumentSnapshot<AttendanceRecord> | null;
    }> {
        let q = query(
            this.attendanceCollection,
            where('memberId', '==', memberId),
            orderBy('checkInTime', 'desc'),
            limit(limitCount)
        );

        if (lastDoc) {
            q = query(q, startAfter(lastDoc));
        }

        const snapshot = await getDocs(q);
        const records = snapshot.docs.map((doc) => doc.data());
        const lastDocument =
            snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

        return { records, lastDoc: lastDocument };
    }

    async getOccupiedLockers(gender: 'Male' | 'Female' | 'Other'): Promise<number[]> {
        const q = query(
            this.attendanceCollection,
            where('status', '==', 'Checked In'),
            where('memberGender', '==', gender)
        );

        const snapshot = await getDocs(q);
        const occupied: number[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.lockerNumber) {
                occupied.push(data.lockerNumber);
            }
        });
        return occupied;
    }

    private _refreshHistory$ = new BehaviorSubject<void>(undefined);
    refreshHistory$ = this._refreshHistory$.asObservable();

    async isMemberCheckedIn(memberId: string): Promise<boolean> {
        const q = query(
            this.attendanceCollection,
            where('memberId', '==', memberId),
            where('status', '==', 'Checked In'),
            limit(1)
        );
        const snapshot = await getDocs(q);
        return !snapshot.empty;
    }

    async checkIn(member: Member, lockerNumber?: number): Promise<void> {
        if (lockerNumber) {
            const occupied = await this.getOccupiedLockers(member.gender);
            if (occupied.includes(lockerNumber)) {
                throw new Error(`Locker ${lockerNumber} (${member.gender}) is already occupied.`);
            }
        }

        const alreadyCheckedIn = await this.isMemberCheckedIn(member.id!);
        if (alreadyCheckedIn) {
            throw new Error(`Member ${member.name} is already checked in.`);
        }

        const now = new Date();
        const dateStr = this.getLocalDateString(now);

        const record: AttendanceRecord = {
            memberId: member.id!,
            memberName: member.name,
            memberGender: member.gender,
            checkInTime: now,
            lockerNumber: lockerNumber || null,
            date: dateStr,
            status: 'Checked In',
            memberExpiration: member.membershipExpiration || null,
            memberRemarks: member.remarks || null,
            checkedInBy: this._currentUserSnapshot,
        };

        const isOnline = this.syncEngineService.isOnlineSignal();
        if (!isOnline) {
            const clientTxId = 'chk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
            await this.outboxQueueService.addToOutbox({
                clientTxId,
                type: 'CHECKIN',
                payload: record,
            });
            this._refreshHistory$.next();
            return;
        }

        await addDoc(this.attendanceCollection, record as AttendanceRecord);
        this._refreshHistory$.next();
    }

    async checkOut(recordId: string): Promise<void> {
        const docRef = doc(this.firestore, this.collectionPath, recordId).withConverter(
            createConverter<AttendanceRecord>()
        );
        await updateDoc(docRef, {
            checkOutTime: new Date(),
            status: 'Checked Out',
            checkedOutBy: this._currentUserSnapshot,
        });
        this._refreshHistory$.next();
    }

    async getCheckInsByStaff(
        staffUid: string,
        dateStr: string,
        limitCount = 20
    ): Promise<AttendanceRecord[]> {
        const q = query(
            this.attendanceCollection,
            where('checkedInBy.uid', '==', staffUid),
            where('date', '==', dateStr),
            orderBy('checkInTime', 'desc'),
            limit(limitCount)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((d) => d.data());
    }
}
