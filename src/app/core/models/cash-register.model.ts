export type CashTransactionType = 'Sale' | 'Expense' | 'Float_In' | 'Float_Out';

export interface CashTransaction {
  id?: string;
  type: CashTransactionType;
  amount: number;
  reason: string;
  timestamp: any; // Firestore Timestamp or Date
  performedBy: string;
  relatedTransactionId?: string; // Links to POS transaction for Sales
}

export type ShiftStatus = 'OPEN' | 'CLOSED';

export interface ShiftSession {
  id?: string;
  openingBalance: number;
  expectedClosingBalance: number;
  actualClosingBalance: number | null;
  discrepancy: number | null;
  status: ShiftStatus;
  startTime: any;
  endTime: any | null;
  openedBy: string;
  closedBy: string | null;
  transactions: CashTransaction[];
  totalSales: number;
  totalExpenses: number;
  totalFloatIn: number;
  totalFloatOut: number;
}

export interface ShiftSummary {
  openingBalance: number;
  totalSales: number;
  totalFloatIn: number;
  totalExpenses: number;
  totalFloatOut: number;
  expectedClosingBalance: number;
}
