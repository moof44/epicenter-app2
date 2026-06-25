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
}
