export interface AttendanceRecord {
    id?: string;
    memberId: string;
    memberName: string;
    memberGender: 'Male' | 'Female' | 'Other';
    checkInTime: any; // Timestamp
    checkOutTime?: any; // Timestamp
    lockerNumber?: number | null; // 1-12 or null
    date: string; // YYYY-MM-DD
    status: 'Checked In' | 'Checked Out';
    memberSubscription?: string | null;
    memberExpiration?: any | null; // Timestamp or Date or string
}
