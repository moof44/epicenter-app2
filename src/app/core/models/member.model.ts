import { AuditTrace } from '../utils/firestore-converter.utils';

export interface Member {
    id?: string;
    name: string;
    address: string;
    contactNumber: string;
    gender: 'Male' | 'Female' | 'Other';
    birthday: Date;
    expiration?: Date;
    membershipExpiration?: Date;
    trainingExpiration?: Date;
    goal: string;
    membershipStatus: 'Active' | 'Inactive' | 'Pending';
    createdBy?: AuditTrace;
    lastModifiedBy?: AuditTrace;
    remarks?: string;
    portalUid?: string;
    portalStatus?: 'Active' | 'Inactive';
    attendanceBadgeLevel?: number; // 0=None, 1=Bronze, 2=Silver, 3=Gold
    attendanceStreak?: number;
    earnedMonthlyBadges?: string[]; // e.g. ["2026-01", "2026-02"]
    equippedBadges?: string[]; // e.g. ["bronze-active", "2026-05"]
    tags?: string[];
    hasPendingProgressScan?: boolean;
    pendingProgressDate?: any;
    latestScanImageUrl?: string;
    pendingProgressScanUrl?: string;
}
