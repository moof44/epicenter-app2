import {
  ShiftSession,
  CashTransaction,
  DenominationBreakdown,
  DenominationAuditDiffItem,
  HandoverDenominationAudit,
  HandoverStatus
} from '../models/cash-register.model';

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

export const STANDARD_DENOMINATIONS = [
  { denomination: 1000, label: '₱1,000 Bill', type: 'BILL' as const },
  { denomination: 500, label: '₱500 Bill', type: 'BILL' as const },
  { denomination: 200, label: '₱200 Bill', type: 'BILL' as const },
  { denomination: 100, label: '₱100 Bill', type: 'BILL' as const },
  { denomination: 50, label: '₱50 Bill', type: 'BILL' as const },
  { denomination: 20, label: '₱20 Bill / Coin', type: 'BILL' as const },
  { denomination: 10, label: '₱10 Coin', type: 'COIN' as const },
  { denomination: 5, label: '₱5 Coin', type: 'COIN' as const },
  { denomination: 1, label: '₱1 Coin', type: 'COIN' as const },
  { denomination: 0.25, label: '25¢ Coin', type: 'COIN' as const }
];

export function compareDenominations(
  prevBreakdown: DenominationBreakdown | null | undefined,
  openBreakdown: DenominationBreakdown | null | undefined,
  prevClosingCash: number,
  openingCash: number,
  prevShiftId?: string,
  prevShiftClosedBy?: string,
  openingRemarks?: string
): HandoverDenominationAudit {
  const diffItems: DenominationAuditDiffItem[] = [];
  let isDenomMatched = true;

  for (const item of STANDARD_DENOMINATIONS) {
    const key = String(item.denomination);
    const prevCount = Number(prevBreakdown?.[key] || 0);
    const openCount = Number(openBreakdown?.[key] || 0);
    const unitDiff = openCount - prevCount;
    const prevSubtotal = prevCount * item.denomination;
    const openSubtotal = openCount * item.denomination;
    const valueDiff = openSubtotal - prevSubtotal;
    const isMatched = unitDiff === 0;

    if (!isMatched) {
      isDenomMatched = false;
    }

    diffItems.push({
      denomination: item.denomination,
      label: item.label,
      type: item.type,
      prevCount,
      openCount,
      unitDiff,
      prevSubtotal,
      openSubtotal,
      valueDiff,
      isMatched
    });
  }

  const cashVariance = Math.round((openingCash - prevClosingCash) * 100) / 100;
  const isTotalMatched = Math.abs(cashVariance) < 0.01;

  let status: HandoverStatus = 'PERFECT_MATCH';
  if (!isTotalMatched) {
    status = 'CASH_MISMATCH';
  } else if (!isDenomMatched) {
    status = 'DENOM_REALLOCATION';
  }

  return {
    status,
    isTotalMatched,
    isDenomMatched,
    previousClosingCash: prevClosingCash,
    openingCash,
    cashVariance,
    prevShiftId,
    prevShiftClosedBy,
    openingRemarks: openingRemarks || '',
    diffItems,
    recordedAt: new Date()
  };
}

/**
 * Format shift date for display
 */
export function formatShiftDate(timestamp: any): Date {
  if (!timestamp) return new Date();
  return timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
}
