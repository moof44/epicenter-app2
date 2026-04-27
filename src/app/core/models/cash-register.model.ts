export type CashTransactionType = 'Sale' | 'Expense' | 'Float_In' | 'Float_Out';

export interface CashTransaction {
    id?: string;
    type: CashTransactionType;
    amount: number;
    reason: string;
    timestamp: Date;
    performedBy: string;
    relatedTransactionId?: string;
    paymentMethod?: 'CASH' | 'GCASH';
    productsSummary?: string;
    voided?: boolean;
    memberName?: string;
}

export type ShiftStatus = 'OPEN' | 'CLOSED';

export interface ShiftSession {
    id?: string;
    openingBalance: number;
    expectedClosingBalance: number;
    actualClosingBalance: number | null;
    discrepancy: number | null;
    status: ShiftStatus;
    startTime: Date;
    endTime: Date | null;
    openedBy: string;
    closedBy: string | null;
    transactions: CashTransaction[];
    totalSales: number;
    totalCashSales: number;
    totalGcashSales: number;
    totalRevenue: number;
    totalExpenses: number;
    totalFloatIn: number;
    totalFloatOut: number;
}

export interface ShiftSummary {
    openingBalance: number;
    totalSales: number;
    totalCashSales: number;
    totalGcashSales: number;
    totalRevenue: number;
    totalFloatIn: number;
    totalExpenses: number;
    totalFloatOut: number;
    expectedClosingBalance: number;
}
