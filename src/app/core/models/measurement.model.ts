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
}
