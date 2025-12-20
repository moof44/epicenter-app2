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
    memberSubscription?: string;
    memberExpiration?: any; // Timestamp or Date or string
}
