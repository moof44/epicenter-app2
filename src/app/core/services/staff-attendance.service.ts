import { Injectable, inject } from '@angular/core';
import {
    Firestore,
    collection,
    collectionData,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    getDoc,
    setDoc,
    Timestamp
} from '@angular/fire/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
    StaffAttendanceRecord,
    StaffShiftDefinition,
    StaffWeeklyAttendanceSummary,
    StaffDailyAttendanceMatrix,
    KioskDevice,
    AdjustmentStatus
} from '../models/staff-attendance.model';
import { User } from '../models/user.model';
import { GeneralSettings } from '../models/settings.model';
import { toLocalDateStr } from '../utils/date.utils';

export const DEFAULT_STAFF_SHIFTS: StaffShiftDefinition[] = [
    {
        id: 'morning',
        name: 'Morning Shift',
        startTime: '06:00',
        endTime: '13:00',
        requiredHours: 7
    },
    {
        id: 'mid',
        name: 'Mid Shift',
        startTime: '13:00',
        endTime: '20:00',
        requiredHours: 7
    },
    {
        id: 'night',
        name: 'Night / Closing Shift',
        startTime: '15:00',
        endTime: '22:00',
        requiredHours: 7
    }
];

const KIOSK_DEVICE_STORAGE_KEY = 'staff_kiosk_device_id';
const KIOSK_DEVICE_NAME_KEY = 'staff_kiosk_device_name';

@Injectable({
    providedIn: 'root'
})
export class StaffAttendanceService {
    private firestore = inject(Firestore);

    private attendanceCol = collection(this.firestore, 'staff_attendance');
    private devicesCol = collection(this.firestore, 'registered_devices');

    // ==========================================
    // 1. DEVICE AUTHORIZATION & KIOSK MANAGEMENT
    // ==========================================

    /** Gets or creates a persistent browser device ID. */
    getOrCreateLocalDeviceId(): string {
        let deviceId = localStorage.getItem(KIOSK_DEVICE_STORAGE_KEY);
        if (!deviceId) {
            deviceId = 'device_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
            localStorage.setItem(KIOSK_DEVICE_STORAGE_KEY, deviceId);
        }
        return deviceId;
    }

    getLocalDeviceName(): string {
        return localStorage.getItem(KIOSK_DEVICE_NAME_KEY) || 'Attendance Terminal';
    }

    /** Checks if the current device is authorized in Firestore. */
    async isCurrentDeviceAuthorized(): Promise<boolean> {
        try {
            const deviceId = this.getOrCreateLocalDeviceId();
            
            // 1. Direct Document lookup
            const deviceDocRef = doc(this.firestore, `registered_devices/${deviceId}`);
            const snapshot = await getDoc(deviceDocRef);
            if (snapshot.exists()) {
                const data = snapshot.data() as KioskDevice;
                return data.isActive === true;
            }

            // 2. Query lookup by deviceId field
            const q = query(this.devicesCol, where('deviceId', '==', deviceId));
            const querySnap = await getDocs(q);
            if (!querySnap.empty) {
                const data = querySnap.docs[0].data() as KioskDevice;
                return data.isActive === true;
            }

            return false;
        } catch (err) {
            console.error('Error checking kiosk device registration:', err);
            return false;
        }
    }

    /** Authorizes current device (Admin operation). */
    async registerDevice(deviceName: string, adminUser: User): Promise<void> {
        const deviceId = this.getOrCreateLocalDeviceId();
        localStorage.setItem(KIOSK_DEVICE_NAME_KEY, deviceName);

        const deviceDocRef = doc(this.firestore, `registered_devices/${deviceId}`);
        const deviceData: KioskDevice = {
            deviceId,
            deviceName,
            type: 'STAFF_ATTENDANCE',
            registeredBy: adminUser.uid,
            registeredByName: adminUser.displayName || 'Admin',
            registeredAt: new Date(),
            isActive: true
        };

        await setDoc(deviceDocRef, {
            ...deviceData,
            registeredAt: Timestamp.now()
        });
    }

    getRegisteredDevices(): Observable<KioskDevice[]> {
        const q = query(this.devicesCol, orderBy('registeredAt', 'desc'));
        return (collectionData(q, { idField: 'id' }) as Observable<any[]>).pipe(
            map(devices => (devices || []).map(d => ({
                ...d,
                registeredAt: d.registeredAt?.toDate ? d.registeredAt.toDate() : new Date(d.registeredAt)
            })))
        );
    }

    async toggleDeviceStatus(deviceId: string, isActive: boolean): Promise<void> {
        const ref = doc(this.firestore, `registered_devices/${deviceId}`);
        await updateDoc(ref, { isActive });
    }

    async revokeDevice(deviceId: string): Promise<void> {
        const ref = doc(this.firestore, `registered_devices/${deviceId}`);
        await deleteDoc(ref);
    }

    // ==========================================
    // 2. SHIFT AUTO-DETECTION & MANILA TIME UTILS
    // ==========================================

    /** Gets Manila current time string (HH:mm) and Date object. */
    getManilaNow(): Date {
        // Create Date representing current time in Asia/Manila (UTC+8)
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        return new Date(utc + (3600000 * 8));
    }

    getManilaTodayStr(): string {
        return toLocalDateStr(this.getManilaNow());
    }

    /** Automatically pre-selects the shift closest to current Manila time. */
    autoDetectCurrentShift(shifts: StaffShiftDefinition[] = DEFAULT_STAFF_SHIFTS): StaffShiftDefinition {
        const now = this.getManilaNow();
        const currentMins = now.getHours() * 60 + now.getMinutes();

        let bestShift = shifts[0];
        let smallestDiff = Infinity;

        for (const shift of shifts) {
            const [sh, sm] = shift.startTime.split(':').map(Number);
            const shiftStartMins = sh * 60 + sm;

            // Difference between current time and shift start time
            const diff = Math.abs(currentMins - shiftStartMins);
            if (diff < smallestDiff) {
                smallestDiff = diff;
                bestShift = shift;
            }
        }

        return bestShift || DEFAULT_STAFF_SHIFTS[0];
    }

    // ==========================================
    // 3. AUTHENTICATION / PASSWORD VERIFICATION
    // ==========================================

    /** Verifies a staff member's password safely without logging out the primary session. */
    async verifyStaffPassword(email: string, password: string): Promise<boolean> {
        try {
            // Secondary Firebase App instance for credential verification
            let app = getApps().find(a => a.name === 'KioskAuthSecondary');
            if (!app) {
                const primaryApp = getApp();
                app = initializeApp(primaryApp.options, 'KioskAuthSecondary');
            }
            const secondaryAuth = getAuth(app);
            await signInWithEmailAndPassword(secondaryAuth, email, password);
            return true;
        } catch (err) {
            console.warn('Staff password verification failed:', err);
            return false;
        }
    }

    // ==========================================
    // 4. CLOCK-IN & CLOCK-OUT OPERATIONS
    // ==========================================

    /** Staff Clock-In action from Kiosk. */
    async clockIn(
        staffUser: User,
        password: string,
        shift: StaffShiftDefinition,
        adjustment?: { requestedTime: string; reason: string }
    ): Promise<{ record: StaffAttendanceRecord; message: string }> {
        const isValidPassword = await this.verifyStaffPassword(staffUser.email, password);
        if (!isValidPassword) {
            throw new Error('Invalid password. Please check your credentials and try again.');
        }

        const manilaNow = this.getManilaNow();
        const dateStr = toLocalDateStr(manilaNow);
        const deviceId = this.getOrCreateLocalDeviceId();

        // Auto-resolve older open checkouts first
        await this.autoResolveMissedCheckouts();

        // Check if user already has an attendance record for today (Disallow multiple check-ins per day)
        const existingQ = query(
            this.attendanceCol,
            where('staffId', '==', staffUser.uid),
            where('date', '==', dateStr)
        );
        const existingSnap = await getDocs(existingQ);
        if (!existingSnap.empty) {
            const existingRecord = this.parseRecord({ id: existingSnap.docs[0].id, ...existingSnap.docs[0].data() });
            const loginTimeStr = existingRecord.checkInTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

            if (existingRecord.status === 'CHECKED_IN') {
                throw new Error(`You are already logged in today at ${loginTimeStr} (${existingRecord.shiftName}).`);
            } else {
                throw new Error(`You have already completed your shift today (Logged in at ${loginTimeStr}). Multiple logins per day are not allowed.`);
            }
        }

        // Calculate Scheduled Start Date in Manila Time
        const [startH, startM] = shift.startTime.split(':').map(Number);
        const scheduledStart = new Date(manilaNow);
        scheduledStart.setHours(startH, startM, 0, 0);

        // Early / Late Mins Calculation
        const diffMs = manilaNow.getTime() - scheduledStart.getTime();
        const diffMins = Math.round(diffMs / 60000);

        let earlyMinutes = 0;
        let lateMinutes = 0;

        if (diffMins < 0) {
            earlyMinutes = Math.abs(diffMins);
        } else if (diffMins > 0) {
            lateMinutes = diffMins;
        }

        // Handle Check-in Time Adjustment Request
        let adjustmentRequested = false;
        let requestedCheckInTime: Date | undefined = undefined;
        let adjustmentReason: string | undefined = undefined;
        let adjustmentStatus: AdjustmentStatus | undefined = undefined;

        if (adjustment && adjustment.requestedTime) {
            adjustmentRequested = true;
            const [reqH, reqM] = adjustment.requestedTime.split(':').map(Number);
            const reqDate = new Date(manilaNow);
            reqDate.setHours(reqH, reqM, 0, 0);
            requestedCheckInTime = reqDate;
            adjustmentReason = adjustment.reason || 'Check-in time adjustment requested';
            adjustmentStatus = 'PENDING';
        }

        const newRecord: Omit<StaffAttendanceRecord, 'id'> = {
            staffId: staffUser.uid,
            staffName: staffUser.displayName || 'Staff Member',
            date: dateStr,
            shiftId: shift.id,
            shiftName: shift.name,
            scheduledStartTime: shift.startTime,
            scheduledEndTime: shift.endTime,
            checkInTime: manilaNow,
            status: 'CHECKED_IN',
            earlyMinutes,
            lateMinutes,
            workedMinutes: 0,
            deficitMinutes: 0,
            overtimeHours: 0,
            missedCheckout: false,
            adjustmentRequested,
            requestedCheckInTime,
            adjustmentReason,
            adjustmentStatus,
            deviceId
        };

        const rawDocData = {
            ...newRecord,
            checkInTime: Timestamp.fromDate(manilaNow),
            requestedCheckInTime: requestedCheckInTime ? Timestamp.fromDate(requestedCheckInTime) : null,
            adjustmentReason: adjustmentReason || null,
            adjustmentStatus: adjustmentStatus || null
        };

        const docRef = await addDoc(this.attendanceCol, this.cleanFirestoreData(rawDocData));

        // Formulate feedback message
        let timeMsg = 'on time!';
        if (lateMinutes > 0) {
            timeMsg = `late by ${lateMinutes} minute${lateMinutes === 1 ? '' : 's'}.`;
        } else if (earlyMinutes > 0) {
            timeMsg = `early by ${earlyMinutes} minute${earlyMinutes === 1 ? '' : 's'}.`;
        }

        let message = `Checked in successfully! You are ${timeMsg}`;
        if (adjustmentRequested && adjustment) {
            message += ` Adjustment request submitted for ${adjustment.requestedTime}.`;
        }

        return {
            record: { id: docRef.id, ...newRecord },
            message
        };
    }

    /** Staff Clock-Out action from Kiosk. */
    async clockOut(staffUser: User, password: string): Promise<{ record: StaffAttendanceRecord; message: string }> {
        const isValidPassword = await this.verifyStaffPassword(staffUser.email, password);
        if (!isValidPassword) {
            throw new Error('Invalid password. Please check your credentials and try again.');
        }

        const manilaNow = this.getManilaNow();

        // Query active checked-in record for this staff
        const q = query(
            this.attendanceCol,
            where('staffId', '==', staffUser.uid),
            where('status', '==', 'CHECKED_IN'),
            orderBy('checkInTime', 'desc'),
            limit(1)
        );

        const snap = await getDocs(q);
        if (snap.empty) {
            throw new Error('No active Check-In record found. Please check in first.');
        }

        const activeDoc = snap.docs[0];
        const rawData = activeDoc.data();
        const checkInTime = rawData['checkInTime']?.toDate ? rawData['checkInTime'].toDate() : new Date(rawData['checkInTime']);

        // Working time calculations
        const workedMs = manilaNow.getTime() - checkInTime.getTime();
        const workedMinutes = Math.max(0, Math.round(workedMs / 60000));

        // Required 7 hours = 420 minutes
        const REQUIRED_MINS = 420;
        const deficitMinutes = workedMinutes < REQUIRED_MINS ? (REQUIRED_MINS - workedMinutes) : 0;

        // Overtime rule: Valid ONLY if worked >= 10 hours (600 minutes)
        // Overtime = (workedMinutes - 420) / 60
        let overtimeHours = 0;
        if (workedMinutes >= 600) {
            overtimeHours = Math.round(((workedMinutes - REQUIRED_MINS) / 60) * 100) / 100;
        }

        const updates = {
            checkOutTime: Timestamp.fromDate(manilaNow),
            status: 'CHECKED_OUT',
            workedMinutes,
            deficitMinutes,
            overtimeHours
        };

        await updateDoc(doc(this.firestore, `staff_attendance/${activeDoc.id}`), updates);

        const updatedRecord: StaffAttendanceRecord = {
            id: activeDoc.id,
            ...rawData,
            ...updates,
            checkInTime,
            checkOutTime: manilaNow
        } as StaffAttendanceRecord;

        return {
            record: updatedRecord,
            message: `Logged out successfully! Total time worked: ${Math.floor(workedMinutes / 60)}h ${workedMinutes % 60}m.`
        };
    }

    /**
     * Automatically resolves missed check-outs:
     * If an employee checked in on a previous day or a past shift and never checked out,
     * defaults their check-out time to the shift's scheduled closing time and flags the record with 'Failure to check-out'.
     */
    async autoResolveMissedCheckouts(): Promise<void> {
        try {
            const manilaNow = this.getManilaNow();
            const todayStr = toLocalDateStr(manilaNow);

            // Query all open CHECKED_IN records
            const q = query(
                this.attendanceCol,
                where('status', '==', 'CHECKED_IN')
            );
            const snap = await getDocs(q);

            for (const d of snap.docs) {
                const data = d.data();
                const recordDate = data['date'];
                const scheduledEndTime = data['scheduledEndTime'] || '22:00';

                // Resolve if record is from a previous calendar day, OR if today and past the scheduled end time
                let shouldResolve = false;
                if (recordDate < todayStr) {
                    shouldResolve = true;
                } else if (recordDate === todayStr) {
                    const [endH, endM] = scheduledEndTime.split(':').map(Number);
                    const shiftEnd = new Date(manilaNow);
                    shiftEnd.setHours(endH, endM, 0, 0);

                    // If current Manila time is past the scheduled shift end time by at least 1 hour
                    if (manilaNow.getTime() > (shiftEnd.getTime() + 3600000)) {
                        shouldResolve = true;
                    }
                }

                if (shouldResolve) {
                    const checkInTime = data['checkInTime']?.toDate ? data['checkInTime'].toDate() : new Date(data['checkInTime']);
                    
                    // Default checkout time to scheduledEndTime on record's date
                    const [endH, endM] = scheduledEndTime.split(':').map(Number);
                    const [year, month, day] = recordDate.split('-').map(Number);
                    const resolvedCheckOut = new Date(year, month - 1, day, endH, endM, 0, 0);

                    const workedMs = resolvedCheckOut.getTime() - checkInTime.getTime();
                    const workedMinutes = Math.max(0, Math.round(workedMs / 60000));
                    const REQUIRED_MINS = 420;
                    const deficitMinutes = workedMinutes < REQUIRED_MINS ? (REQUIRED_MINS - workedMinutes) : 0;
                    const overtimeHours = workedMinutes >= 600 ? Math.round(((workedMinutes - REQUIRED_MINS) / 60) * 100) / 100 : 0;

                    await updateDoc(doc(this.firestore, `staff_attendance/${d.id}`), {
                        checkOutTime: Timestamp.fromDate(resolvedCheckOut),
                        status: 'CHECKED_OUT',
                        workedMinutes,
                        deficitMinutes,
                        overtimeHours,
                        missedCheckout: true,
                        remarks: 'Failure to check-out (Defaulted to shift closing time)'
                    });
                }
            }
        } catch (err) {
            console.error('Error auto-resolving missed checkouts:', err);
        }
    }

    // ==========================================
    // 5. ATTENDANCE HISTORY & REPORTS
    // ==========================================

    /** Gets personal attendance history for a single staff user (Read-only). */
    getStaffAttendanceHistory(staffId: string, limitNum = 100): Observable<StaffAttendanceRecord[]> {
        // Trigger background resolution of past open records
        this.autoResolveMissedCheckouts().catch(err => console.error(err));

        const q = query(
            this.attendanceCol,
            where('staffId', '==', staffId),
            orderBy('checkInTime', 'desc'),
            limit(limitNum)
        );

        return (collectionData(q, { idField: 'id' }) as Observable<any[]>).pipe(
            map(records => (records || []).map(r => this.parseRecord(r)))
        );
    }

    /** Gets all pending check-in adjustment requests for Admin review. */
    getPendingAdjustments(): Observable<StaffAttendanceRecord[]> {
        const q = query(
            this.attendanceCol,
            where('adjustmentRequested', '==', true),
            where('adjustmentStatus', '==', 'PENDING'),
            orderBy('checkInTime', 'desc')
        );

        return (collectionData(q, { idField: 'id' }) as Observable<any[]>).pipe(
            map(records => (records || []).map(r => this.parseRecord(r)))
        );
    }

    /** Admin action: Approve or Deny check-in adjustment request. */
    async reviewAdjustment(
        recordId: string,
        status: 'APPROVED' | 'DENIED',
        reviewerName: string
    ): Promise<void> {
        const recordRef = doc(this.firestore, `staff_attendance/${recordId}`);
        const snapshot = await getDoc(recordRef);
        if (!snapshot.exists()) throw new Error('Attendance record not found.');

        const data = snapshot.data();
        const currentRecord = this.parseRecord({ id: snapshot.id, ...data });

        if (status === 'DENIED') {
            await updateDoc(recordRef, {
                adjustmentStatus: 'DENIED',
                adjustmentReviewedBy: reviewerName,
                remarks: 'Check-in adjustment request denied.'
            });
            return;
        }

        // APPROVED: Update checkInTime with requestedCheckInTime
        if (!currentRecord.requestedCheckInTime) {
            throw new Error('No requested arrival time found in this record.');
        }

        const newCheckIn = currentRecord.requestedCheckInTime;

        // Recalculate early/late minutes relative to scheduled start
        const [startH, startM] = currentRecord.scheduledStartTime.split(':').map(Number);
        const scheduledStart = new Date(newCheckIn);
        scheduledStart.setHours(startH, startM, 0, 0);

        const diffMs = newCheckIn.getTime() - scheduledStart.getTime();
        const diffMins = Math.round(diffMs / 60000);

        let earlyMinutes = 0;
        let lateMinutes = 0;

        if (diffMins < 0) {
            earlyMinutes = Math.abs(diffMins);
        } else if (diffMins > 0) {
            lateMinutes = diffMins;
        }

        // Recalculate working hours if checkout exists
        let workedMinutes = currentRecord.workedMinutes;
        let deficitMinutes = currentRecord.deficitMinutes;
        let overtimeHours = currentRecord.overtimeHours;

        if (currentRecord.checkOutTime) {
            const workedMs = currentRecord.checkOutTime.getTime() - newCheckIn.getTime();
            workedMinutes = Math.max(0, Math.round(workedMs / 60000));
            const REQUIRED_MINS = 420;
            deficitMinutes = workedMinutes < REQUIRED_MINS ? (REQUIRED_MINS - workedMinutes) : 0;
            overtimeHours = workedMinutes >= 600 ? Math.round(((workedMinutes - REQUIRED_MINS) / 60) * 100) / 100 : 0;
        }

        await updateDoc(recordRef, {
            checkInTime: Timestamp.fromDate(newCheckIn),
            earlyMinutes,
            lateMinutes,
            workedMinutes,
            deficitMinutes,
            overtimeHours,
            adjustmentStatus: 'APPROVED',
            adjustmentReviewedBy: reviewerName,
            remarks: 'Check-in time adjusted & approved by Admin.'
        });
    }

    /**
     * Admin operation: Deletes an attendance record.
     */
    async deleteAttendanceRecord(recordId: string): Promise<void> {
        const recordRef = doc(this.firestore, `staff_attendance/${recordId}`);
        await deleteDoc(recordRef);
    }

    /**
     * Admin operation: Updates an existing attendance record and recalculates metrics.
     */
    async updateAttendanceRecord(
        recordId: string,
        data: {
            date: string;
            shift: StaffShiftDefinition;
            checkInTime: Date;
            checkOutTime?: Date | null;
            status: 'CHECKED_IN' | 'CHECKED_OUT';
            remarks?: string;
        },
        adminName: string
    ): Promise<void> {
        const recordRef = doc(this.firestore, `staff_attendance/${recordId}`);

        // Recalculate scheduled start
        const [startH, startM] = data.shift.startTime.split(':').map(Number);
        const scheduledStart = new Date(data.checkInTime);
        scheduledStart.setHours(startH, startM, 0, 0);

        const diffMs = data.checkInTime.getTime() - scheduledStart.getTime();
        const diffMins = Math.round(diffMs / 60000);

        const earlyMinutes = diffMins < 0 ? Math.abs(diffMins) : 0;
        const lateMinutes = diffMins > 0 ? diffMins : 0;

        let workedMinutes = 0;
        let deficitMinutes = 0;
        let overtimeHours = 0;

        if (data.checkOutTime) {
            const workedMs = data.checkOutTime.getTime() - data.checkInTime.getTime();
            workedMinutes = Math.max(0, Math.round(workedMs / 60000));
            const REQUIRED_MINS = 420;
            deficitMinutes = workedMinutes < REQUIRED_MINS ? (REQUIRED_MINS - workedMinutes) : 0;
            overtimeHours = workedMinutes >= 600 ? Math.round(((workedMinutes - REQUIRED_MINS) / 60) * 100) / 100 : 0;
        }

        const updates: any = {
            date: data.date,
            shiftId: data.shift.id,
            shiftName: data.shift.name,
            scheduledStartTime: data.shift.startTime,
            scheduledEndTime: data.shift.endTime,
            checkInTime: Timestamp.fromDate(data.checkInTime),
            checkOutTime: data.checkOutTime ? Timestamp.fromDate(data.checkOutTime) : null,
            status: data.status,
            earlyMinutes,
            lateMinutes,
            workedMinutes,
            deficitMinutes,
            overtimeHours,
            remarks: data.remarks || `Manually modified by Admin (${adminName})`
        };

        await updateDoc(recordRef, this.cleanFirestoreData(updates));
    }

    /**
     * Admin operation: Manually creates an attendance record for a staff member.
     */
    async createManualAttendanceRecord(
        staffUser: User,
        data: {
            date: string;
            shift: StaffShiftDefinition;
            checkInTime: Date;
            checkOutTime?: Date | null;
            status: 'CHECKED_IN' | 'CHECKED_OUT';
            remarks?: string;
        },
        adminName: string
    ): Promise<void> {
        // Recalculate scheduled start
        const [startH, startM] = data.shift.startTime.split(':').map(Number);
        const scheduledStart = new Date(data.checkInTime);
        scheduledStart.setHours(startH, startM, 0, 0);

        const diffMs = data.checkInTime.getTime() - scheduledStart.getTime();
        const diffMins = Math.round(diffMs / 60000);

        const earlyMinutes = diffMins < 0 ? Math.abs(diffMins) : 0;
        const lateMinutes = diffMins > 0 ? diffMins : 0;

        let workedMinutes = 0;
        let deficitMinutes = 0;
        let overtimeHours = 0;

        if (data.checkOutTime) {
            const workedMs = data.checkOutTime.getTime() - data.checkInTime.getTime();
            workedMinutes = Math.max(0, Math.round(workedMs / 60000));
            const REQUIRED_MINS = 420;
            deficitMinutes = workedMinutes < REQUIRED_MINS ? (REQUIRED_MINS - workedMinutes) : 0;
            overtimeHours = workedMinutes >= 600 ? Math.round(((workedMinutes - REQUIRED_MINS) / 60) * 100) / 100 : 0;
        }

        const newRecord = {
            staffId: staffUser.uid,
            staffName: staffUser.displayName || 'Staff Member',
            date: data.date,
            shiftId: data.shift.id,
            shiftName: data.shift.name,
            scheduledStartTime: data.shift.startTime,
            scheduledEndTime: data.shift.endTime,
            checkInTime: Timestamp.fromDate(data.checkInTime),
            checkOutTime: data.checkOutTime ? Timestamp.fromDate(data.checkOutTime) : null,
            status: data.status,
            earlyMinutes,
            lateMinutes,
            workedMinutes,
            deficitMinutes,
            overtimeHours,
            missedCheckout: false,
            adjustmentRequested: false,
            remarks: data.remarks || `Manually created by Admin (${adminName})`
        };

        await addDoc(this.attendanceCol, this.cleanFirestoreData(newRecord));
    }

    /**
     * Generates Weekly Attendance Matrix & Payroll Summary (Sunday to Saturday).
     */
    async getWeeklyAttendanceReport(
        startDate: Date, // Sunday
        endDate: Date,   // Saturday
        staffUsers: User[],
        generalSettings?: GeneralSettings
    ): Promise<StaffWeeklyAttendanceSummary[]> {
        const startStr = toLocalDateStr(startDate);
        const endStr = toLocalDateStr(endDate);

        // Auto-resolve any missed check-outs prior to computing weekly payroll summary
        await this.autoResolveMissedCheckouts();

        // Query all attendance records in this date range
        const q = query(
            this.attendanceCol,
            where('date', '>=', startStr),
            where('date', '<=', endStr)
        );

        const snapshot = await getDocs(q);
        const allRecords = snapshot.docs.map(d => this.parseRecord({ id: d.id, ...d.data() }));

        const defaultRate = generalSettings?.defaultDailySalaryRate || 500;
        const summaries: StaffWeeklyAttendanceSummary[] = [];

        // Build 7-day Sunday -> Saturday template
        const weekDays: { dateStr: string; dayName: string; dateObj: Date }[] = [];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        const curr = new Date(startDate);
        for (let i = 0; i < 7; i++) {
            const dStr = toLocalDateStr(curr);
            weekDays.push({
                dateStr: dStr,
                dayName: dayNames[curr.getDay()],
                dateObj: new Date(curr)
            });
            curr.setDate(curr.getDate() + 1);
        }

        for (const staff of staffUsers) {
            const staffRecords = allRecords.filter(r => r.staffId === staff.uid);
            const dailyRate = staff.dailySalaryRate ?? defaultRate;
            const hourlyRate = dailyRate / 7;

            let daysPresent = 0;
            let totalLateMins = 0;
            let totalEarlyMins = 0;
            let totalDeficitMins = 0;
            let totalOTHours = 0;
            let hasMissedCheckout = false;
            let hasPendingAdjustment = false;

            const matrix: StaffDailyAttendanceMatrix[] = weekDays.map(wDay => {
                const dayRecord = staffRecords.find(r => r.date === wDay.dateStr);
                const isPresent = !!dayRecord;
                const remarks: string[] = [];

                let lateMins = 0;
                let earlyMins = 0;
                let deficitMins = 0;
                let otHours = 0;
                let dayComp = 0;

                if (dayRecord) {
                    daysPresent++;
                    lateMins = dayRecord.lateMinutes || 0;
                    earlyMins = dayRecord.earlyMinutes || 0;

                    // Automatic Missed Checkout handling:
                    // If checked in but no checkout, default checkout to shift end time
                    if (dayRecord.status === 'CHECKED_IN' && !dayRecord.checkOutTime) {
                        dayRecord.missedCheckout = true;
                        dayRecord.remarks = 'Failure to check-out (Defaulted to shift closing time)';
                    }

                    if (dayRecord.missedCheckout) {
                        hasMissedCheckout = true;
                        remarks.push('Missed Check-out');
                    }

                    if (dayRecord.adjustmentStatus === 'PENDING') {
                        hasPendingAdjustment = true;
                        remarks.push('Adjustment Pending');
                    } else if (dayRecord.adjustmentStatus === 'APPROVED') {
                        remarks.push('Adjustment Approved');
                    } else if (dayRecord.adjustmentStatus === 'DENIED') {
                        remarks.push('Adjustment Denied');
                    }

                    deficitMins = dayRecord.deficitMinutes || 0;
                    otHours = dayRecord.overtimeHours || 0;

                    totalLateMins += lateMins;
                    totalEarlyMins += earlyMins;
                    totalDeficitMins += deficitMins;
                    totalOTHours += otHours;

                    // Daily Compensation = Base Daily Rate + Overtime
                    dayComp = dailyRate + (otHours * hourlyRate * 1.25);
                }

                return {
                    date: wDay.dateStr,
                    dayName: wDay.dayName,
                    record: dayRecord,
                    isPresent,
                    lateMinutes: lateMins,
                    earlyMinutes: earlyMins,
                    deficitMinutes: deficitMins,
                    overtimeHours: otHours,
                    compensation: Math.round(dayComp * 100) / 100,
                    remarks
                };
            });

            const totalComp = (daysPresent * dailyRate) + (totalOTHours * hourlyRate * 1.25);

            summaries.push({
                staffId: staff.uid,
                staffName: staff.displayName || 'Staff Member',
                roles: staff.roles || [],
                dailySalaryRate: dailyRate,
                daysPresent,
                totalLateMinutes: totalLateMins,
                totalEarlyMinutes: totalEarlyMins,
                totalDeficitMinutes: totalDeficitMins,
                totalOvertimeHours: Math.round(totalOTHours * 100) / 100,
                totalCompensation: Math.round(totalComp * 100) / 100,
                hasMissedCheckout,
                hasPendingAdjustment,
                dailyMatrix: matrix
            });
        }

        return summaries;
    }

    private parseRecord(data: any): StaffAttendanceRecord {
        return {
            ...data,
            checkInTime: data.checkInTime?.toDate ? data.checkInTime.toDate() : new Date(data.checkInTime),
            checkOutTime: data.checkOutTime ? (data.checkOutTime?.toDate ? data.checkOutTime.toDate() : new Date(data.checkOutTime)) : undefined,
            requestedCheckInTime: data.requestedCheckInTime ? (data.requestedCheckInTime?.toDate ? data.requestedCheckInTime.toDate() : new Date(data.requestedCheckInTime)) : undefined
        };
    }

    private cleanFirestoreData(obj: any): any {
        const cleaned: any = {};
        Object.keys(obj).forEach(key => {
            if (obj[key] !== undefined) {
                cleaned[key] = obj[key];
            }
        });
        return cleaned;
    }
}
