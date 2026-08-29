export interface ShiftDefinition {
    id: string;
    name: string;
    startTime: string; // '06:00' or 'Flexible'
    endTime: string;   // '13:00' or 'Flexible'
    requiredHours: number;
    isFlexible?: boolean;
    colorHex?: string;
    isActive: boolean;
    createdAt?: Date | any;
    updatedAt?: Date | any;
}

export interface DayShiftAssignment {
    shiftId: string;       // e.g. 'opening', 'morning', 'night', 'flexible', or 'OFF'
    shiftName: string;
    startTime: string;
    endTime: string;
    isFlexible?: boolean;
    colorHex?: string;
    notes?: string;
}

export interface StaffWeeklyAssignment {
    staffId: string;
    staffName: string;
    roles: string[];
    days: Record<string, DayShiftAssignment | null>; // null = Unscheduled / Day Off
    totalScheduledHours: number;
    daysScheduled: number;
    hasDayOff: boolean; // True if at least 1 day is null / OFF
}

export interface WeeklySchedule {
    id: string;             // Week ID: '2026-W35' or '2026-08-30_2026-09-05'
    startDate: string;      // '2026-08-30' (Sunday)
    endDate: string;        // '2026-09-05' (Saturday)
    status: 'PUBLISHED' | 'DRAFT';
    assignments: Record<string, StaffWeeklyAssignment>;
    createdBy: string;
    createdByName: string;
    createdAt: Date | any;
    updatedAt: Date | any;
}

export type ShiftSwapStatus = 'PENDING_MANAGER' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface ShiftSwapRequest {
    id: string;
    weekId: string;
    requesterId: string;
    requesterName: string;
    requesterDate: string;        // Date requester wants to swap out
    requesterShift: DayShiftAssignment;
    targetStaffId: string;
    targetStaffName: string;
    targetDate: string;           // Date of target shift
    targetShift: DayShiftAssignment;
    reason: string;
    status: ShiftSwapStatus;
    reviewedBy?: string;
    reviewedByName?: string;
    reviewedAt?: Date | any;
    rejectionReason?: string;
    createdAt: Date | any;
}
