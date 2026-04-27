import { AuditTrace } from '../utils/firestore-converter.utils';

export interface GeneralSettings {
    id?: string;
    monthlyQuota: number;
    updatedBy?: AuditTrace;
}
