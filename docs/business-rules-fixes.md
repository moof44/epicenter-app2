# Business Rules Compliance — Fix Plan

> Role: Senior Angular Developer
> Date: April 12, 2026
> Reference: `docs/business-rules-compliance-audit.md`
> Steering: `.kiro/steering/business-rules.md`, `.kiro/steering/coding-standards.md`

---

## Validated Bugs

All 7 bugs from the audit are confirmed valid after code review.

| # | Bug | Severity | Confirmed |
| --- | --- | --- | --- |
| 1 | `getSalesTotal()` — no VOID exclusion in server-side aggregation | High | ✅ Yes |
| 2 | `getTransactions()` — returns VOID transactions to all consumers | Medium | ✅ Yes |
| 3 | `ReportsService.getSalesAnalytics()` — no VOID exclusion in forEach | High | ✅ Yes |
| 4 | `SalesAnalytics.getMonthlyProgress()` — wrong data source for quota | Medium | ✅ Yes |
| 5 | `ReportsService.getVolumeAnalytics()` — `toISOString()` timezone violation | Medium | ✅ Yes |
| 6 | `ReportsService.getTopAttendees()` — `toISOString()` timezone violation | Medium | ✅ Yes |
| 7 | `QuotaStatusWidget.todayRevenue` — `toISOString()` date comparison | Medium | ✅ Yes |

---

## Fix 1: Add VOID exclusion to `ReportsService.getSalesAnalytics()`

**File:** `src/app/core/services/reports.service.ts`
**Rule:** 1.5 — VOID transactions excluded via `if (tx.status === 'VOID') return`

**Change:** Add VOID check as first line in the `forEach` callback.

```typescript
// Current:
transactions.forEach(tx => {
    const date = tx.date instanceof Date ? tx.date : (tx.date as any).toDate();
    // ... aggregation logic

// Fixed:
transactions.forEach(tx => {
    if (tx.status === 'VOID') return;

    const date = tx.date instanceof Date ? tx.date : (tx.date as any).toDate();
    // ... aggregation logic
```

**Side effects:** None. This only removes voided transactions from the report aggregation. The `transactions` array itself is unchanged — the TransactionHistory component that also displays voided transactions (with strikethrough) is unaffected because it reads from `getTransactions()` directly, not from `ReportsService`.

**Firestore billing:** Zero change. Same query, same reads. Filtering is client-side.

---

## Fix 2: Compute staff sales total client-side from filtered transactions

**File:** `src/app/core/services/report.state.service.ts`
**Rule:** 1.4 — VOID transactions must be excluded from staff sales totals

**Original approach (REVERTED):** Adding `where('status', '==', 'COMPLETED')` to `getSalesTotal()` server-side aggregation. This broke because legacy transaction documents don't have a `status` field — Firestore excludes documents where the filtered field doesn't exist, resulting in ₱0.00 totals.

**Corrected approach:** Remove the separate `getSalesTotal()` call from `getUserSalesReport()`. Instead, compute the total client-side from the already-fetched and VOID-filtered transaction list: `transactions.reduce((sum, tx) => sum + tx.totalAmount, 0)`. This ensures the total and the list are always consistent.

**`getSalesTotal()` reverted** to its original form (no status filter) for any future consumers that may need it. The method is currently unused.

**Side effects:** The total now comes from the same filtered list the UI displays. If a transaction is VOID, it's excluded from both the list and the total. Legacy transactions without a `status` field pass the `tx.status !== 'VOID'` filter (because `undefined !== 'VOID'` is `true`), so they're correctly included.

**Firestore billing:** Reduced — one fewer `getAggregateFromServer` call per staff sales report load.

---

## Fix 3: VOID exclusion in `getUserSalesReport()` — MERGED INTO FIX 2

This fix was merged into Fix 2 above. The `.filter(tx => tx.status !== 'VOID')` and the client-side `reduce()` total are both applied in the same code block in `getUserSalesReport()`.

---

## Fix 4: Fix `SalesAnalytics` quota progress data source

**File:** `src/app/features/store/components/sales-analytics/sales-analytics.ts`
**Rule:** 2.2 — Quota progress MUST use `ReportStateService.getMonthlyReport().total`

**Problem:** `SalesAnalytics` computes quota progress from `StoreService.getSalesAnalytics().monthlyRevenue` (transactions, limit 1000) instead of `daily_sales`.

**Decision: NOT fixing this.** Here's why:

The `SalesAnalytics` component (Store Stats page) is a product-level analytics view. Its `monthlyRevenue` is used alongside `topSelling`, `lowPerformance`, `todayRevenue` — all derived from the same `transactions` query. Replacing just the quota progress data source with `daily_sales` while keeping everything else from `transactions` would create a visual inconsistency: the progress bar would show a different number than the "Monthly Revenue" card right next to it.

The business rules document (Rule 1.6) already acknowledges this: "The `monthlyRevenue` here may differ from `getMonthlySalesReport().total`... This is a SEPARATE computation."

The real fix would be to refactor the entire SalesAnalytics page to use `daily_sales` for totals and `transactions` only for product breakdown. That's a larger scope change. For now, the documented caveat stands.

**Status: DEFERRED — documented as known divergence in business rules.**

---

## Fix 5: Replace `toISOString()` with `toLocalDateStr()` in `ReportsService`

**File:** `src/app/core/services/reports.service.ts`
**Rule:** 6.1 — NEVER use `toISOString().split('T')[0]` for date keys

**Change:** Replace in both `getVolumeAnalytics()` and `getTopAttendees()`.

```typescript
// Current (getVolumeAnalytics, lines 19-20):
const startStr = startDate.toISOString().split('T')[0];
const endStr = endDate.toISOString().split('T')[0];

// Fixed:
const startStr = toLocalDateStr(startDate);
const endStr = toLocalDateStr(endDate);
```

```typescript
// Current (getTopAttendees, lines 134-135):
const startStr = startDate.toISOString().split('T')[0];
const endStr = endDate.toISOString().split('T')[0];

// Fixed:
const startStr = toLocalDateStr(startDate);
const endStr = toLocalDateStr(endDate);
```

`toLocalDateStr` is already imported from `store.service.ts` at the top of the file.

**Side effects:** Attendance date range queries will now use local timezone dates instead of UTC. In UTC+8 (Philippines), a query at 11 PM local time previously used the next day's UTC date as the boundary. Now it correctly uses today's local date.

**Firestore billing:** Zero change. Same query structure, different date string values.

---

## Fix 6: Replace `toISOString()` with local date comparison in `QuotaStatusWidget`

**File:** `src/app/core/components/quota-status-widget/quota-status-widget.ts`
**Rule:** 6.1 — use local date strings for comparison

**Change:** Replace the `toISOString()` comparison with `toLocalDateStr()`.

```typescript
// Current:
todayRevenue = computed(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const localTodayStr = `${year}-${month}-${day}`;

    const days = this.report().days || [];
    const todayItem = days.find(d => {
        try {
            return d.date.toISOString().split('T')[0] === localTodayStr;
        } catch {
            return false;
        }
    });
    return todayItem ? todayItem.totalSales : 0;
});

// Fixed:
todayRevenue = computed(() => {
    const localTodayStr = toLocalDateStr(new Date());

    const days = this.report().days || [];
    const todayItem = days.find(d => {
        try {
            return toLocalDateStr(d.date) === localTodayStr;
        } catch {
            return false;
        }
    });
    return todayItem ? todayItem.totalSales : 0;
});
```

Requires adding import: `import { toLocalDateStr } from '../../services/store.service';`

**Side effects:** Today's revenue will now correctly match at all hours in UTC+8. Previously, between 4 PM and midnight UTC (12 AM - 8 AM local Philippines time), the `toISOString()` comparison could fail because the UTC date would be the next day.

**Firestore billing:** Zero change. No Firestore queries affected — this is a client-side date comparison on already-fetched data.

---

## Summary of Changes

| Fix | File | Change | Billing Impact |
| --- | --- | --- | --- |
| 1 | `reports.service.ts` | Add `if (tx.status === 'VOID') return` | Zero |
| 2 | `store.service.ts` | Add `where('status', '==', 'COMPLETED')` to `getSalesTotal` | Negligible (may need composite index) |
| 3 | `report.state.service.ts` | Add `.filter(tx => tx.status !== 'VOID')` | Zero |
| 4 | — | DEFERRED — documented known divergence | — |
| 5 | `reports.service.ts` | Replace `toISOString()` with `toLocalDateStr()` (2 locations) | Zero |
| 6 | `quota-status-widget.ts` | Replace `toISOString()` comparison with `toLocalDateStr()` | Zero |

**Total files modified:** 4
**Total lines changed:** ~15
**Firestore billing impact:** Negligible
**Risk of crashing changes:** Zero — all fixes are additive filters or string replacements

---

## Audit of Solutions

### Fix 1 — Side effect check
- `ReportsService.getSalesAnalytics()` is only called by `ReportsDashboardComponent.refreshCharts()`. No other consumer.
- Adding VOID filter means the Reports Dashboard will show lower totals if voided transactions exist. This is the CORRECT behavior.
- No crashing risk — `tx.status` is always present on Transaction documents (set to `'COMPLETED'` on creation, `'VOID'` on void).
- Edge case: very old transactions created before the `status` field was added may have `undefined` status. `undefined !== 'VOID'` evaluates to `true`, so they pass the filter. ✅ Safe.

### Fix 2 — Side effect check
- `getSalesTotal()` is called by `ReportStateService.getUserSalesReport()` only.
- Adding `where('status', '==', 'COMPLETED')` means transactions without a `status` field (legacy) will be EXCLUDED from the aggregate. This could undercount if legacy transactions exist.
- However, `status` was added when the void feature was implemented. All transactions since then have `status: 'COMPLETED'`. Legacy transactions predate the void feature and were never voided.
- If legacy data is a concern, a one-time migration to backfill `status: 'COMPLETED'` on old transactions would resolve it. This is a data migration, not a code change.
- **Recommendation:** Add a note in the business rules about legacy data. For now, the fix is correct for all current and future transactions.

### Fix 3 — Side effect check
- Filters the transaction list displayed in the Sales by User page. Voided transactions will no longer appear in the list.
- The `total` (from Fix 2) and the list are now consistent — both exclude VOID.
- No crashing risk.

### Fix 5 — Side effect check
- `toLocalDateStr` is already imported and used elsewhere in the same file (line 1: `import { StoreService, toLocalDateStr } from './store.service'`).
- The attendance `date` field is stored as `YYYY-MM-DD` in local timezone (set by `getLocalDateString()` in `AttendanceService`). The query uses `where('date', '>=', startStr)`. Using `toLocalDateStr()` for the query boundary ensures the comparison is in the same timezone as the stored data. ✅ Correct.

### Fix 6 — Side effect check
- `d.date` in the `days` array comes from `getMonthlySalesReport()` which creates dates via `new Date(k)` where `k` is a `YYYY-MM-DD` string. `new Date('2026-04-12')` creates a date at midnight UTC, not local. `toLocalDateStr()` on this date in UTC+8 would produce `2026-04-12` (correct) because `getFullYear/getMonth/getDate` use local timezone.
- Wait — `new Date('2026-04-12')` is parsed as UTC midnight. In UTC+8, `getDate()` returns 12 (because UTC midnight + 8 hours = 8 AM on the 12th). So `toLocalDateStr(new Date('2026-04-12'))` in UTC+8 = `'2026-04-12'`. ✅ Correct.
- But if the date were `new Date('2026-04-12T00:00:00Z')` and the local timezone were UTC-5, `getDate()` would return 11 (previous day). This is the same edge case that `toISOString()` had but in reverse. However, since the gym operates in a single timezone (Philippines, UTC+8), and dates are always ahead of UTC, this is safe. ✅

### Goal achievement check
- Fix 1 + Fix 3: Reports Dashboard and Sales by User will now exclude voided transactions → totals will match `daily_sales` (which is already correctly decremented on void). ✅
- Fix 2: Server-side aggregation for staff sales will exclude voided transactions. ✅
- Fix 5 + Fix 6: Date boundaries will use local timezone consistently. ✅
- The primary divergence issue (monthly sales total ≠ quota progress) is caused by voided transactions being counted in reports but not in `daily_sales`. Fixes 1-3 resolve this. ✅
