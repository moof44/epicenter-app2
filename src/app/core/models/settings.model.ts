export interface GeneralSettings {
    id?: string;
    monthlyQuota: number;
    lastUpdated?: any;
    updatedBy?: {
        uid: string;
        name: string;
    };
}
