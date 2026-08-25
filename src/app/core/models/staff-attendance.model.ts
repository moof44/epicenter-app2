export interface StaffShiftDefinition {
    id: string; // e.g. 'morning' | 'mid' | 'night'
    name: string; // e.g. 'Morning Shift'
    startTime: string; // '06:00' 24-hr format
    endTime: string; // '13:00' 24-hr format
    requiredHours: number; // 7
}

export type StaffAttendanceStatus = 'CHECKED_IN' | 'CHECKED_OUT';
export type AdjustmentStatus = 'PENDING' | 'APPROVED' | 'DENIED';

export interface StaffAttendanceRecord {
    id?: string;
    staffId: string;
    staffName: string;
    date: string; // YYYY-MM-DD (Manila date)
    shiftId: string;
    shiftName: string;
    scheduledStartTime: string; // '06:00'
    scheduledEndTime: string; // '13:00'
    checkInTime: Date;
    checkOutTime?: Date;
    status: StaffAttendanceStatus;
    earlyMinutes: number;
    lateMinutes: number;
    workedMinutes: number;
    deficitMinutes: number;
    overtimeHours: number;
    missedCheckout: boolean;
    adjustmentRequested: boolean;
    requestedCheckInTime?: Date;
    adjustmentReason?: string;
    adjustmentStatus?: AdjustmentStatus;
    adjustmentReviewedBy?: string;
    remarks?: string;
    deviceId?: string;
}

export interface StaffDailyAttendanceMatrix {
    date: string; // YYYY-MM-DD
    dayName: string; // 'Sun', 'Mon', etc.
    record?: StaffAttendanceRecord;
    isPresent: boolean;
    lateMinutes: number;
    earlyMinutes: number;
    deficitMinutes: number;
    overtimeHours: number;
    compensation: number;
    remarks: string[];
}

export interface StaffWeeklyAttendanceSummary {
    staffId: string;
    staffName: string;
    roles: string[];
    dailySalaryRate: number;
    daysPresent: number;
    totalLateMinutes: number;
    totalEarlyMinutes: number;
    totalDeficitMinutes: number;
    totalOvertimeHours: number;
    totalCompensation: number;
    hasMissedCheckout: boolean;
    hasPendingAdjustment: boolean;
    dailyMatrix: StaffDailyAttendanceMatrix[];
}

export interface KioskDevice {
    id?: string;
    deviceId: string;
    deviceName: string;
    type: 'STAFF_ATTENDANCE';
    registeredBy: string;
    registeredByName: string;
    registeredAt: Date;
    isActive: boolean;
}
