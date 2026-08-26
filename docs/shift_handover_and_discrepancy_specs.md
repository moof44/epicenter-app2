# Shift Handover Reconciliation & Discrepancy Specifications

## ?? Overview
This document outlines the architecture, data models, calculation formulas, and alert workflows for reconciling cash drawer balances between consecutive shifts and detecting discrepancies inside and between shifts.

---

## ?? Two Levels of Cash Discrepancies

`
+-------------------------------------------------------------+
¦  Shift A (Previous Shift)                                   ¦
¦  - Expected Balance: ?6,100.00                              ¦
¦  - Actual Counted Closing Cash: ?1,500.00                   ¦
¦  - Shift Close Variance: -?4,600.00 (Level 1: Intra-Shift)  ¦
+-------------------------------------------------------------+
                               ¦
                               ¦ ?? Handover Gap: ?1,400 - ?1,500 = -?100.00 (Level 2: Inter-Shift)
                               ?
+-------------------------------------------------------------+
¦  Shift B (Next Shift)                                       ¦
¦  - Incoming Opening Balance Entered: ?1,400.00              ¦
¦  - Handover Status: SHORTAGE (-?100.00 missing cash)        ¦
+-------------------------------------------------------------+
`

1. **Level 1: Intra-Shift Close Variance (Inside a Shift)**
   - Variance = actualClosingBalance - expectedClosingBalance
   - Measures cashier reconciliation accuracy during their active shift (comparing actual cash in drawer vs registered cash sales, expenses, and floats).

2. **Level 2: Inter-Shift Handover Discrepancy (Between Shifts)**
   - Handover Discrepancy = currentShift.openingBalance - previousShift.actualClosingBalance
   - Measures cash integrity during drawer handovers between shifts. Detects unrecorded cash withdrawals, skimming, or opening count errors.

---

## ?? Data Model & Classification

### Statuses:
- **MATCHED** (Math.abs(handoverDiff) <= 0.01): Current opening balance exactly matches the previous shift's counted closing balance.
- **SHORTAGE** (handoverDiff < -0.01): Incoming cashier recorded less opening cash than the previous cashier left in the drawer.
- **OVERAGE** (handoverDiff > 0.01): Incoming cashier recorded more opening cash than the previous cashier left in the drawer.
- **INITIAL** (No predecessor shift): First recorded shift in timeline.

---

## ?? Notification & Chat Alert Workflows

### 1. Shift Opening Trigger (onShiftCreated)
When a shift document is created in /shifts/{shiftId}:
1. Fetch immediately preceding closed shift (where('status', '==', 'CLOSED'), orderBy('endTime', 'desc'), limit(1)).
2. If predecessor exists:
   - Compute handoverDiff = shift.openingBalance - prevShift.actualClosingBalance.
   - **If Mismatch (Math.abs(handoverDiff) > 0.01)**:
     - **Push & In-App Notification to ADMIN and MANAGER**:
       - Title: ?? Shift Handover Mismatch Alert
       - Body: Shift opened by [Staff] with ?[Opening], but previous shift ([PrevStaff]) closed with ?[PrevClosing] (Diff: ?[Diff]).
       - Action URL: /store/reports
     - **Global Chat Message**:
       - ?? **Shift Opened** by **[Staff]**. Starting Float: **?[Opening]**. ?? *Note: Mismatches previous shift close of ?[PrevClosing] (Diff: ?[Diff])*
   - **If Matched**:
     - **Global Chat Message**:
       - ?? **Shift Opened** by **[Staff]**. Starting Float: **?[Opening]** *(? Matches previous shift close)*

### 2. Shift Closure Trigger (onShiftUpdated)
When a shift is closed (efore.status === 'OPEN' and fter.status === 'CLOSED'):
1. **If Shift Discrepancy (Math.abs(after.discrepancy) > 0.01)**:
   - **Push & In-App Notification to ADMIN and MANAGER**:
     - Title: ?? Shift Closed - Discrepancy Alert
     - Body: Shift closed by [Staff] with a discrepancy of ?[after.discrepancy].
     - Action URL: /store/reports
2. **Global Chat Summary**:
   - ?? **Shift Closed** by **[Staff]**. Expected: **?[Exp]** | Actual: **?[Act]** | Discrepancy: **?[Discrepancy]** (Sales: ?[Sales]).

---

## ?? UI Locations
- **Reports & History Page**: /store/reports
  - **KPI Header**: Total Revenue, Total Expenses, Total Shift Variances, Total Handover Discrepancies.
  - **Table Column**: Opening & Handover Audit badge with tooltips.
  - **Detail Drawer**: Shift Handover Audit Card comparing previous closer, previous closing count, and takeover variance.
