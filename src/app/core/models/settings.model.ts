import { AuditTrace } from '../utils/firestore-converter.utils';
import { StaffShiftDefinition } from './staff-attendance.model';

export interface GeneralSettings {
    id?: string;
    monthlyQuota: number;
    defaultDailySalaryRate?: number;
    staffShifts?: StaffShiftDefinition[];
    updatedBy?: AuditTrace;
}
