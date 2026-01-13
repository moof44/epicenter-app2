import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Firestore, collection, collectionData, query, where, orderBy, addDoc, doc, updateDoc, Timestamp, getDocs, limit, startAfter } from '@angular/fire/firestore';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { AttendanceRecord } from '../models/attendance.model';
import { Member } from '../models/member.model';

@Injectable({
    providedIn: 'root'
})
export class AttendanceService {
    private firestore: Firestore = inject(Firestore);
    private authService = inject(AuthService);
    private collectionPath = 'attendance';
    private attendanceCollection = collection(this.firestore, this.collectionPath);

    private get _currentUserSnapshot() {
        const user = this.authService.userProfile();
        if (!user) throw new Error('Action requires authentication');
        return {
            uid: user.uid,
            name: user.displayName
        };
    }

    private getLocalDateString(date: Date = new Date()): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Get all currently checked-in members.
     */
    getActiveCheckIns(): Observable<AttendanceRecord[]> {
        const q = query(
            this.attendanceCollection,
            where('status', '==', 'Checked In')
        );
        return collectionData(q, { idField: 'id' }).pipe(
            map(records => (records as AttendanceRecord[]).sort((a, b) =>
                b.checkInTime.seconds - a.checkInTime.seconds
            ))
        );
    }

    /**
     * Get attendance history for a specific date.
     * @param dateStr Format YYYY-MM-DD
     */
    /**
     * Get attendance history for a specific date.
     * @param dateStr Format YYYY-MM-DD
     */
    async getHistoryByDate(dateStr: string): Promise<AttendanceRecord[]> {
        const q = query(
            this.attendanceCollection,
            where('date', '==', dateStr)
        );

        const snapshot = await getDocs(q);
        const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));

        return records.sort((a, b) => b.checkInTime.seconds - a.checkInTime.seconds);
    }

    /**
     * Get all records for a specific member (for charts/profile).
     */
    /**
     * Get all records for a specific member (for charts/profile).
     */
    async getMemberAttendance(memberId: string): Promise<AttendanceRecord[]> {
        const q = query(
            this.attendanceCollection,
            where('memberId', '==', memberId),
            orderBy('checkInTime', 'desc'),
            limit(100)
        );

        const snapshot = await getDocs(q);
        const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));

        // Sort descending and take top 50
        return records.sort((a, b) => b.checkInTime.seconds - a.checkInTime.seconds).slice(0, 365);
    }

    async getMemberAttendancePage(memberId: string, limitCount = 20, lastDoc?: any): Promise<{ records: AttendanceRecord[], lastDoc: any | null }> {
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
        const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
        const lastDocument = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

        return { records, lastDoc: lastDocument };
    }

    /**
     * Retrieve currently occupied locker numbers for a specific gender.
     */
    async getOccupiedLockers(gender: 'Male' | 'Female' | 'Other'): Promise<number[]> {
        const q = query(
            this.attendanceCollection,
            where('status', '==', 'Checked In'),
            where('memberGender', '==', gender)
        );

        const snapshot = await getDocs(q);
        const occupied: number[] = [];
        snapshot.forEach(doc => {
            const data = doc.data() as AttendanceRecord;
            if (data.lockerNumber) {
                occupied.push(data.lockerNumber);
            }
        });
        return occupied;
    }

    /**
     * Check In a member.
     */
    private _refreshHistory$ = new BehaviorSubject<void>(undefined);
    refreshHistory$ = this._refreshHistory$.asObservable();

    /**
     * Check In a member.
     */
    async checkIn(member: Member, lockerNumber?: number): Promise<void> {
        // ... existing validation ...
        if (lockerNumber) {
            const occupied = await this.getOccupiedLockers(member.gender);
            if (occupied.includes(lockerNumber)) {
                throw new Error(`Locker ${lockerNumber} (${member.gender}) is already occupied.`);
            }
        }

        const now = new Date();
        const dateStr = this.getLocalDateString(now); // YYYY-MM-DD

        const record: AttendanceRecord = {
            memberId: member.id!,
            memberName: member.name,
            memberGender: member.gender,
            checkInTime: Timestamp.fromDate(now),
            lockerNumber: lockerNumber || null,
            date: dateStr,
            status: 'Checked In',
            memberExpiration: member.membershipExpiration || null,
            memberRemarks: member.remarks || null,
            checkedInBy: this._currentUserSnapshot
        };

        await addDoc(this.attendanceCollection, record);
        this._refreshHistory$.next(); // Trigger refresh
    }

    /**
     * Check Out a member.
     */
    async checkOut(recordId: string): Promise<void> {
        const docRef = doc(this.firestore, this.collectionPath, recordId);
        await updateDoc(docRef, {
            checkOutTime: Timestamp.now(),
            status: 'Checked Out',
            checkedOutBy: this._currentUserSnapshot
        });
        this._refreshHistory$.next(); // Trigger refresh
    }
}
