import { ShiftSession, CashTransaction } from '../models/cash-register.model';

export interface ShiftAnalytics {
  variance: number;
  varianceType: 'balanced' | 'shortage' | 'overage';
  netCashFlow: number;
  salesCount: number;
  expenseCount: number;
  floatInCount: number;
  floatOutCount: number;
}

/**
 * Calculate variance/discrepancy between actual and expected closing balance
 * Negative = Shortage (money missing), Positive = Overage (extra money)
 */
export function calculateVariance(shift: ShiftSession): number {
  if (shift.actualClosingBalance === null) return 0;
  return shift.actualClosingBalance - shift.expectedClosingBalance;
}

/**
 * Determine variance type for styling
 */
export function getVarianceType(variance: number): 'balanced' | 'shortage' | 'overage' {
  if (variance === 0) return 'balanced';
  return variance < 0 ? 'shortage' : 'overage';
}

/**
 * Calculate net cash flow: (Sales + Float In) - (Expenses + Float Out)
 */
export function calculateNetCashFlow(shift: ShiftSession): number {
  return (shift.totalSales + shift.totalFloatIn) - (shift.totalExpenses + shift.totalFloatOut);
}

/**
 * Get full analytics for a shift
 */
export function getShiftAnalytics(shift: ShiftSession): ShiftAnalytics {
  const variance = calculateVariance(shift);
  return {
    variance,
    varianceType: getVarianceType(variance),
    netCashFlow: calculateNetCashFlow(shift),
    salesCount: shift.transactions.filter(t => t.type === 'Sale').length,
    expenseCount: shift.transactions.filter(t => t.type === 'Expense').length,
    floatInCount: shift.transactions.filter(t => t.type === 'Float_In').length,
    floatOutCount: shift.transactions.filter(t => t.type === 'Float_Out').length
  };
}

/**
 * Filter transactions by type
 */
export function filterTransactionsByType(
  transactions: CashTransaction[],
  type: CashTransaction['type']
): CashTransaction[] {
  return transactions.filter(t => t.type === type);
}

/**
 * Format shift date for display
 */
export function formatShiftDate(timestamp: any): Date {
  if (!timestamp) return new Date();
  return timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
}
