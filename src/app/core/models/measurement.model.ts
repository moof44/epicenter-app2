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
}
