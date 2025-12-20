import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, query, where, orderBy, addDoc, doc, updateDoc, Timestamp, getDocs, limit } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AttendanceRecord } from '../models/attendance.model';
import { Member } from '../models/member.model';

@Injectable({
    providedIn: 'root'
})
export class AttendanceService {
    private firestore: Firestore = inject(Firestore);
    private collectionPath = 'attendance';
    private attendanceCollection = collection(this.firestore, this.collectionPath);

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
            where('memberId', '==', memberId)
        );
        
        const snapshot = await getDocs(q);
        const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
        
        // Sort descending and take top 50
        return records.sort((a, b) => b.checkInTime.seconds - a.checkInTime.seconds).slice(0, 50);
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
    async checkIn(member: Member, lockerNumber?: number): Promise<void> {
        // Validate locker if selected
        if (lockerNumber) {
            const occupied = await this.getOccupiedLockers(member.gender);
            if (occupied.includes(lockerNumber)) {
                throw new Error(`Locker ${lockerNumber} (${member.gender}) is already occupied.`);
            }
        }

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

        const record: AttendanceRecord = {
            memberId: member.id!,
            memberName: member.name,
            memberGender: member.gender,
            checkInTime: Timestamp.fromDate(now),
            lockerNumber: lockerNumber || null,
            date: dateStr,
            status: 'Checked In',
            memberSubscription: member.subscription || undefined,
            memberExpiration: member.expiration || undefined
        };

        await addDoc(this.attendanceCollection, record);
    }

    /**
     * Check Out a member.
     */
    async checkOut(recordId: string): Promise<void> {
        const docRef = doc(this.firestore, this.collectionPath, recordId);
        await updateDoc(docRef, {
            checkOutTime: Timestamp.now(),
            status: 'Checked Out'
        });
    }
}
