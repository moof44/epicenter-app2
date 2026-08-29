import { Injectable, inject } from '@angular/core';
import {
    Firestore,
    collection,
    collectionData,
    doc,
    docData,
    setDoc,
    updateDoc,
    query,
    where,
    getDoc,
    Timestamp
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
    ShiftDefinition,
    DayShiftAssignment,
    StaffWeeklyAssignment,
    WeeklySchedule,
    ShiftSwapRequest
} from '../models/shift-schedule.model';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { toLocalDateStr } from '../utils/date.utils';

export const DEFAULT_SHIFTS: ShiftDefinition[] = [
    {
        id: 'opening',
        name: 'Opening Shift',
        startTime: '06:00',
        endTime: '13:00',
        requiredHours: 7,
        colorHex: '#f59e0b', // Amber
        isActive: true
    },
    {
        id: 'morning',
        name: 'Morning Shift',
        startTime: '08:00',
        endTime: '15:00',
        requiredHours: 7,
        colorHex: '#0284c7', // Sky Blue
        isActive: true
    },
    {
        id: 'night',
        name: 'Night / Closing Shift',
        startTime: '15:00',
        endTime: '22:00',
        requiredHours: 7,
        colorHex: '#8b5cf6', // Purple
        isActive: true
    },
    {
        id: 'flexible',
        name: 'Flexible Shift',
        startTime: 'Flexible',
        endTime: 'Flexible',
        isFlexible: true,
        requiredHours: 7,
        colorHex: '#10b981', // Emerald
        isActive: true
    }
];

export function formatTime12Hour(time24?: string): string {
    if (!time24 || time24 === 'Flexible' || time24 === '-') return time24 || '-';
    const parts = time24.split(':');
    if (parts.length < 2) return time24;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    const mStr = m.toString().padStart(2, '0');
    return `${h12}:${mStr} ${period}`;
}

export function formatShiftSchedule(shift?: { startTime?: string; endTime?: string; isFlexible?: boolean } | null): string {
    if (!shift) return '-';
    if (shift.isFlexible || shift.startTime === 'Flexible' || shift.endTime === 'Flexible') {
        return 'Flexible (7 hrs)';
    }
    const start = formatTime12Hour(shift.startTime);
    const end = formatTime12Hour(shift.endTime);
    return `${start} – ${end}`;
}

@Injectable({
    providedIn: 'root'
})
export class ShiftScheduleService {
    private firestore = inject(Firestore);
    private authService = inject(AuthService);
    private userService = inject(UserService);

    private shiftsCol = collection(this.firestore, 'shift_definitions');
    private schedulesCol = collection(this.firestore, 'weekly_schedules');
    private swapRequestsCol = collection(this.firestore, 'shift_swap_requests');

    // =========================================================================
    // 1. SHIFT DEFINITIONS CRUD
    // =========================================================================

    /**
     * Gets all shift definitions from Firestore. If empty, returns default shifts.
     */
    getShiftDefinitions(): Observable<ShiftDefinition[]> {
        return (collectionData(this.shiftsCol, { idField: 'id' }) as Observable<ShiftDefinition[]>).pipe(
            map(shifts => {
                if (!shifts || shifts.length === 0) {
                    return DEFAULT_SHIFTS;
                }
                // Merge custom shifts with defaults if defaults not present
                const combined = [...shifts];
                for (const def of DEFAULT_SHIFTS) {
                    if (!combined.some(s => s.id === def.id)) {
                        combined.push(def);
                    }
                }
                return combined.filter(s => s.isActive !== false);
            }),
            catchError(err => {
                console.warn('Error fetching shift definitions, using defaults:', err);
                return of(DEFAULT_SHIFTS);
            })
        );
    }

    /**
     * Creates or updates a custom shift definition.
     */
    async saveShiftDefinition(shift: Partial<ShiftDefinition>): Promise<void> {
        const id = shift.id || ('custom_' + Date.now().toString(36));
        const docRef = doc(this.firestore, 'shift_definitions', id);
        
        const payload: ShiftDefinition = {
            id,
            name: shift.name || 'Custom Shift',
            startTime: shift.startTime || '08:00',
            endTime: shift.endTime || '15:00',
            requiredHours: Number(shift.requiredHours || 7),
            isFlexible: !!shift.isFlexible,
            colorHex: shift.colorHex || '#64748b',
            isActive: shift.isActive !== false,
            updatedAt: Timestamp.now()
        };

        await setDoc(docRef, payload, { merge: true });
    }

    /**
     * Deactivates / deletes a shift definition.
     */
    async deleteShiftDefinition(id: string): Promise<void> {
        const docRef = doc(this.firestore, 'shift_definitions', id);
        await updateDoc(docRef, { isActive: false });
    }

    // =========================================================================
    // 2. WEEKLY CALENDAR & SCHEDULE CALCULATIONS (SUNDAY TO SATURDAY)
    // =========================================================================

    /**
     * Calculates the Sunday-to-Saturday date range for a given date.
     */
    getWeekRange(referenceDate: Date = new Date()): {
        startDate: string;
        endDate: string;
        weekId: string;
        days: { dateStr: string; dayName: string; formattedDate: string }[];
    } {
        const d = new Date(referenceDate);
        // Get day of week (0 = Sun, 1 = Mon, ..., 6 = Sat)
        const dayOfWeek = d.getDay();
        
        // Sunday is start
        const sunday = new Date(d);
        sunday.setDate(d.getDate() - dayOfWeek);
        sunday.setHours(0, 0, 0, 0);

        // Saturday is end
        const saturday = new Date(sunday);
        saturday.setDate(sunday.getDate() + 6);
        saturday.setHours(23, 59, 59, 999);

        const startDate = toLocalDateStr(sunday);
        const endDate = toLocalDateStr(saturday);
        const weekId = `${startDate}_${endDate}`;

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const days = [];
        for (let i = 0; i < 7; i++) {
            const current = new Date(sunday);
            current.setDate(sunday.getDate() + i);
            const dateStr = toLocalDateStr(current);
            days.push({
                dateStr,
                dayName: dayNames[i],
                formattedDate: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            });
        }

        return { startDate, endDate, weekId, days };
    }

    /**
     * Gets today's Manila date string (YYYY-MM-DD).
     */
    getTodayManilaDateStr(): string {
        const now = new Date();
        const manilaStr = now.toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        const manilaDate = new Date(manilaStr);
        return toLocalDateStr(manilaDate);
    }

    /**
     * Returns true if the given dateStr is strictly in the past (before today in Manila time).
     */
    isPastDate(dateStr: string): boolean {
        const todayStr = this.getTodayManilaDateStr();
        return dateStr < todayStr;
    }

    /**
     * Real-time observable of a specific week schedule.
     */
    getWeeklySchedule(weekId: string): Observable<WeeklySchedule | null> {
        const docRef = doc(this.firestore, 'weekly_schedules', weekId);
        return docData(docRef, { idField: 'id' }) as Observable<WeeklySchedule | null>;
    }

    /**
     * Updates an individual day's shift assignment for a staff member.
     * Enforces Past Date Immutability: Rejects updates to dates in the past.
     */
    async updateDayAssignment(
        weekId: string,
        startDate: string,
        endDate: string,
        staffId: string,
        staffName: string,
        roles: string[],
        dateStr: string,
        shift: DayShiftAssignment | null
    ): Promise<void> {
        if (this.isPastDate(dateStr)) {
            throw new Error('Past schedules cannot be modified. Only today and future dates can be edited.');
        }

        const user = this.authService.userProfile();
        const docRef = doc(this.firestore, 'weekly_schedules', weekId);
        const snapshot = await getDoc(docRef);

        let schedule: WeeklySchedule;
        if (snapshot.exists()) {
            schedule = snapshot.data() as WeeklySchedule;
        } else {
            schedule = {
                id: weekId,
                startDate,
                endDate,
                status: 'PUBLISHED',
                assignments: {},
                createdBy: user?.uid || '',
                createdByName: user?.displayName || '',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };
        }

        if (!schedule.assignments) schedule.assignments = {};
        if (!schedule.assignments[staffId]) {
            schedule.assignments[staffId] = {
                staffId,
                staffName,
                roles: roles || [],
                days: {},
                totalScheduledHours: 0,
                daysScheduled: 0,
                hasDayOff: true
            };
        }

        // Sanitize assignment object to prevent Firestore undefined errors
        const cleanShift: DayShiftAssignment | null = shift ? {
            shiftId: shift.shiftId || 'flexible',
            shiftName: shift.shiftName || 'Shift',
            startTime: shift.startTime || '08:00',
            endTime: shift.endTime || '15:00',
            isFlexible: Boolean(shift.isFlexible),
            colorHex: shift.colorHex || '#0284c7'
        } : null;

        // Set assignment
        schedule.assignments[staffId].days[dateStr] = cleanShift;

        // Recalculate summary metrics for this staff
        let scheduledHours = 0;
        let daysScheduled = 0;
        const weekDays = this.getWeekRange(new Date(startDate)).days;

        for (const d of weekDays) {
            const dayShift = schedule.assignments[staffId].days[d.dateStr];
            if (dayShift && dayShift.shiftId !== 'OFF') {
                daysScheduled++;
                scheduledHours += dayShift.isFlexible ? 7 : (this.computeShiftDuration(dayShift.startTime, dayShift.endTime) || 7);
            } else if (dayShift === undefined) {
                schedule.assignments[staffId].days[d.dateStr] = null;
            }
        }

        schedule.assignments[staffId].totalScheduledHours = scheduledHours;
        schedule.assignments[staffId].daysScheduled = daysScheduled;
        schedule.assignments[staffId].hasDayOff = (daysScheduled < 7);
        schedule.updatedAt = Timestamp.now();

        await setDoc(docRef, schedule, { merge: true });
    }

    private computeShiftDuration(start?: string, end?: string): number {
        if (!start || !end || !start.includes(':') || !end.includes(':')) return 7;
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        let mins = (eh * 60 + em) - (sh * 60 + sm);
        if (mins < 0) mins += 24 * 60; // Overnight
        return Math.round((mins / 60) * 10) / 10;
    }

    /**
     * Copies shift assignments from a source week into a target week.
     */
    async copyPreviousWeek(
        targetWeekId: string,
        targetStartDate: string,
        targetEndDate: string,
        sourceWeekId: string
    ): Promise<void> {
        const sourceDoc = await getDoc(doc(this.firestore, 'weekly_schedules', sourceWeekId));
        if (!sourceDoc.exists()) {
            throw new Error('Previous week schedule was not found.');
        }

        const sourceData = sourceDoc.data() as WeeklySchedule;
        const user = this.authService.userProfile();

        const sourceRange = this.getWeekRange(new Date(sourceData.startDate));
        const targetRange = this.getWeekRange(new Date(targetStartDate));

        const newAssignments: Record<string, StaffWeeklyAssignment> = {};

        // Clone each staff's assignments day-by-day (mapping day index 0..6)
        for (const [staffId, staffData] of Object.entries(sourceData.assignments || {})) {
            const newDays: Record<string, DayShiftAssignment | null> = {};
            let scheduledHours = 0;
            let daysScheduled = 0;

            for (let i = 0; i < 7; i++) {
                const sourceDate = sourceRange.days[i].dateStr;
                const targetDate = targetRange.days[i].dateStr;
                const shift = staffData.days?.[sourceDate] || null;
                
                newDays[targetDate] = shift;
                if (shift && shift.shiftId !== 'OFF') {
                    daysScheduled++;
                    scheduledHours += shift.isFlexible ? 7 : (this.computeShiftDuration(shift.startTime, shift.endTime) || 7);
                }
            }

            newAssignments[staffId] = {
                staffId: staffData.staffId,
                staffName: staffData.staffName,
                roles: staffData.roles || [],
                days: newDays,
                totalScheduledHours: scheduledHours,
                daysScheduled,
                hasDayOff: (daysScheduled < 7)
            };
        }

        const targetSchedule: WeeklySchedule = {
            id: targetWeekId,
            startDate: targetStartDate,
            endDate: targetEndDate,
            status: 'PUBLISHED',
            assignments: newAssignments,
            createdBy: user?.uid || '',
            createdByName: user?.displayName || '',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };

        await setDoc(doc(this.firestore, 'weekly_schedules', targetWeekId), targetSchedule);
    }

    // =========================================================================
    // 3. STAFF KIOSK / ATTENDANCE INTEGRATION
    // =========================================================================

    /**
     * Look up an employee's scheduled shift for today.
     */
    async getTodayShiftForStaff(staffId: string): Promise<DayShiftAssignment | null> {
        const todayStr = this.getTodayManilaDateStr();
        const weekRange = this.getWeekRange(new Date(todayStr));
        
        try {
            const scheduleDoc = await getDoc(doc(this.firestore, 'weekly_schedules', weekRange.weekId));
            if (!scheduleDoc.exists()) return null;

            const schedule = scheduleDoc.data() as WeeklySchedule;
            const staffAssignment = schedule.assignments?.[staffId];
            if (!staffAssignment || !staffAssignment.days) return null;

            const shift = staffAssignment.days[todayStr];
            if (!shift || shift.shiftId === 'OFF') return null;

            return shift;
        } catch (e) {
            console.warn('Error fetching today scheduled shift for staff:', e);
            return null;
        }
    }

    // =========================================================================
    // 4. SHIFT SWAP REQUESTS & APPROVALS
    // =========================================================================

    /**
     * Submits a peer-to-peer shift swap request.
     */
    async submitSwapRequest(req: Omit<ShiftSwapRequest, 'id' | 'status' | 'createdAt'>): Promise<string> {
        const docRef = doc(this.swapRequestsCol);
        const payload: ShiftSwapRequest = {
            ...req,
            id: docRef.id,
            status: 'PENDING_MANAGER',
            createdAt: Timestamp.now()
        };

        await setDoc(docRef, payload);
        return docRef.id;
    }

    /**
     * Gets all pending shift swap requests.
     */
    getPendingSwapRequests(): Observable<ShiftSwapRequest[]> {
        const q = query(
            this.swapRequestsCol,
            where('status', '==', 'PENDING_MANAGER')
        );
        return (collectionData(q, { idField: 'id' }) as Observable<ShiftSwapRequest[]>).pipe(
            map(requests => {
                return (requests || []).sort((a, b) => {
                    const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
                    const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
                    return tB - tA;
                });
            })
        );
    }

    /**
     * Gets all swap requests for a specific staff member (as requester or target).
     */
    getMySwapRequests(staffId: string): Observable<ShiftSwapRequest[]> {
        return (collectionData(this.swapRequestsCol, { idField: 'id' }) as Observable<ShiftSwapRequest[]>).pipe(
            map(requests => {
                return (requests || []).filter(r => r.requesterId === staffId || r.targetStaffId === staffId);
            })
        );
    }

    /**
     * Manager approves a shift swap $ightarrow$ atomically swaps the two shift assignments in weekly_schedules.
     */
    async approveSwapRequest(requestId: string, reviewerId: string, reviewerName: string): Promise<void> {
        const reqDoc = await getDoc(doc(this.firestore, 'shift_swap_requests', requestId));
        if (!reqDoc.exists()) throw new Error('Swap request not found.');

        const req = reqDoc.data() as ShiftSwapRequest;
        if (req.status !== 'PENDING_MANAGER') {
            throw new Error('Swap request is already processed.');
        }

        const scheduleDocRef = doc(this.firestore, 'weekly_schedules', req.weekId);
        const scheduleSnap = await getDoc(scheduleDocRef);
        if (!scheduleSnap.exists()) throw new Error('Weekly schedule not found.');

        const schedule = scheduleSnap.data() as WeeklySchedule;

        // Execute shift exchange
        if (schedule.assignments[req.requesterId] && schedule.assignments[req.targetStaffId]) {
            schedule.assignments[req.requesterId].days[req.requesterDate] = req.targetShift;
            schedule.assignments[req.targetStaffId].days[req.targetDate] = req.requesterShift;
            schedule.updatedAt = Timestamp.now();

            await setDoc(scheduleDocRef, schedule, { merge: true });
        }

        // Update swap request status
        await updateDoc(doc(this.firestore, 'shift_swap_requests', requestId), {
            status: 'APPROVED',
            reviewedBy: reviewerId,
            reviewedByName: reviewerName,
            reviewedAt: Timestamp.now()
        });
    }

    /**
     * Manager rejects a shift swap request.
     */
    async rejectSwapRequest(requestId: string, reviewerId: string, reviewerName: string, reason: string): Promise<void> {
        await updateDoc(doc(this.firestore, 'shift_swap_requests', requestId), {
            status: 'REJECTED',
            reviewedBy: reviewerId,
            reviewedByName: reviewerName,
            reviewedAt: Timestamp.now(),
            rejectionReason: reason || 'Declined by Management'
        });
    }
}
