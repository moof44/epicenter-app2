import { OutflowCategory, OutflowPaymentSource } from './outflow.model';

export type CashTransactionType = 'Sale' | 'Expense' | 'Float_In' | 'Float_Out';

export interface CashTransaction {
    id?: string;
    type: CashTransactionType;
    amount: number;
    reason: string;
    timestamp: Date;
    performedBy: string;
    relatedTransactionId?: string;
    paymentMethod?: 'CASH' | 'GCASH' | 'SPLIT';
    cashAmount?: number;
    gcashAmount?: number;
    productsSummary?: string;
    voided?: boolean;
    memberName?: string;
    category?: OutflowCategory;
    paymentSource?: OutflowPaymentSource;
    billerOrSupplier?: string;
    billId?: string;
}

export type ShiftStatus = 'OPEN' | 'CLOSED';

export type DenominationBreakdown = Record<string, number>;

export interface DenominationAuditDiffItem {
    denomination: number;
    label: string;
    type: 'BILL' | 'COIN';
    prevCount: number;
    openCount: number;
    unitDiff: number;       // openCount - prevCount
    prevSubtotal: number;
    openSubtotal: number;
    valueDiff: number;      // openSubtotal - prevSubtotal
    isMatched: boolean;
}

export type HandoverStatus = 'PERFECT_MATCH' | 'DENOM_REALLOCATION' | 'CASH_MISMATCH' | 'INITIAL_SHIFT' | 'MANUAL_OVERRIDE';

export interface HandoverDenominationAudit {
    status: HandoverStatus;
    isTotalMatched: boolean;
    isDenomMatched: boolean;
    previousClosingCash: number;
    openingCash: number;
    cashVariance: number;
    prevShiftId?: string;
    prevShiftClosedBy?: string;
    openingRemarks?: string;
    diffItems: DenominationAuditDiffItem[];
    recordedAt: Date;
}

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
    isManualClosingCountOverride?: boolean;
    closingDenominations?: DenominationBreakdown | null;
    isManualOpeningCountOverride?: boolean;
    openingDenominations?: DenominationBreakdown | null;
    openingRemarks?: string;
    handoverAudit?: HandoverDenominationAudit | null;
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
