export interface AuditTrail {
    uid: string;
    name: string;
    timestamp: any;
}

export interface Measurement {
    id?: string;
    date: any;
    weight: number; // kg
    bodyFat: number; // %
    visceralFat: number; // level
    muscleMass: number; // %
    bmi: number;
    metabolism: number; // kcal
    bodyAge: number;
    height: number; // cm
    subcutaneousFat: number; // %
    sinistralFatFull: number; // % (S-Fat Full)
    muscleFull: number; // % (Muscle Full)
    subcutaneousFatArms: number; // %
    muscleArms: number; // %
    subcutaneousFatTrunk: number; // %
    muscleTrunk: number; // %
    subcutaneousFatLegs: number; // %
    muscleLegs: number; // %
    createdBy?: AuditTrail;
    lastModifiedBy?: AuditTrail;
}

export interface DeletedMeasurement extends Measurement {
    deletedBy: AuditTrail;
    deletedFrom: string;
    originalMemberId: string;
    originalDocId: string;
}
