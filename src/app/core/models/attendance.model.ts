import { AuditTrace } from '../utils/firestore-converter.utils';

export interface AttendanceRecord {
    id?: string;
    memberId: string;
    memberName: string;
    memberGender: 'Male' | 'Female' | 'Other';
    checkInTime: Date;
    checkOutTime?: Date;
    lockerNumber?: number | null; // 1-12 or null
    date: string; // YYYY-MM-DD
    status: 'Checked In' | 'Checked Out';
    memberSubscription?: string | null;
    memberExpiration?: Date | null;
    checkedInBy?: { uid: string; name: string | null };
    checkedOutBy?: { uid: string; name: string | null };
    memberRemarks?: string | null;
}
