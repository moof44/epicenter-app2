# Business Rules Compliance Audit

> Auditor: Senior Angular Developer
> Date: April 12, 2026
> Reference: `.kiro/steering/business-rules.md`
> Scope: All financial computation paths in the codebase

---

## Audit Method

Each business rule was traced to its implementing code. The code was checked for:
- Correct data source (daily_sales vs transactions)
- Correct formula
- Correct VOID exclusion
- Correct date/timezone handling
- Correct data flow (who calls what)

---

## Results

### Rule 1.1 — Transaction Total (Single Sale)

**Rule:** Computed ONCE in `StoreService.checkout()` as `cartItems.reduce((sum, item) => sum + item.subtotal, 0)`

**Code:** `store.service.ts` line ~222: `const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);`

**Verdict: ✅ COMPLIANT.** Single computation point, stored in `transactions/{id}.totalAmount`.

---

### Rule 1.2 — Daily Sales Total

**Rule:** Source of truth is `daily_sales/{YYYY-MM-DD}.totalSales`. Written atomically during checkout, decremented during void.

**Code:**
- Checkout: `batch.set(dfsRef, { totalSales: increment(total) }, { merge: true })` — ✅
- Void: `batch.set(dfsRef, { totalSales: increment(-txData.totalAmount) }, { merge: true })` — ✅
- Date key: `toLocalDateStr(timestamp)` — ✅

**Verdict: ✅ COMPLIANT.**

---

### Rule 1.3 — Monthly Sales Total

**Rule:** Source of truth is `daily_sales` collection. Computed in `StoreService.getMonthlySalesReport()`. All consumers MUST use `ReportStateService.getMonthlyReport()`.

**Consumers:**
- `QuotaStatusWidget` → `reportStateService.getMonthlyReport()` → ✅
- `MonthlySalesReport` → `reportStateService.getMonthlyReport()` → ✅
- `SalesAnalytics` → `storeService.getSalesAnalytics()` → ❌ VIOLATION (see Rule 1.6)

**Verdict: ⚠️ PARTIAL COMPLIANCE.** Two of three consumers are correct. SalesAnalytics uses a different data source (see 1.6).

---

### Rule 1.4 — Sales by Staff (User)

**Rule:** VOID transactions are NOT explicitly excluded. This is a known gap.

**Code:** `ReportStateService.getUserSalesReport()`:
- `getTransactions({ staffId, startDate, endDate, limit: 100 })` — no VOID filter
- `getSalesTotal({ staffId, startDate, endDate })` — no VOID filter

**Verdict: ❌ BUG — VOID transactions are included in staff sales totals.**

**Impact:** If a transaction is voided, the staff member's sales total still includes it. The Sales by User report shows inflated numbers.

**Fix location:** `StoreService.getTransactions()` and `StoreService.getSalesTotal()` — neither filters by `status`. Add `where('status', '==', 'COMPLETED')` or exclude VOID client-side.

**Firestore constraint:** Adding `where('status', '==', 'COMPLETED')` alongside `where('staffId', '==', ...)` and `orderBy('date', 'desc')` requires a composite index. Alternatively, filter client-side after fetch.

---

### Rule 1.5 — Sales Analytics (Reports Dashboard)

**Rule:** VOID transactions excluded via `if (tx.status === 'VOID') return` in the iteration.

**Code:** `ReportsService.getSalesAnalytics()` — iterates `transactions.forEach(tx => { ... })`:

**Verdict: ❌ BUG — NO VOID exclusion exists.**

The `forEach` loop in `ReportsService.getSalesAnalytics()` does NOT check `tx.status`. Every transaction, including voided ones, is counted in:
- `salesPerDay` totals
- `salesPerPerson` totals
- `productSales` totals
- `staffPerformance` totals

**Impact:** The Reports Dashboard (admin analytics) shows inflated sales figures that include voided transactions. Daily sales breakdown, top spenders, top products, and staff performance are all overstated.

**Fix:** Add `if (tx.status === 'VOID') return;` as the first line inside the `forEach` callback, matching the pattern used in `StoreService.getSalesAnalytics()`.

---

### Rule 1.6 — Sales Analytics (Store Stats Page)

**Rule:** Uses `transactions` directly (limit: 1000). `monthlyRevenue` may differ from `getMonthlySalesReport().total`. For authoritative monthly totals, always use `daily_sales`.

**Code:** `StoreService.getSalesAnalytics()`:
- VOID exclusion: `if (tx.status === 'VOID') return;` — ✅
- Limit: 1000 — ✅ (documented limitation)
- `monthlyRevenue` computed from transactions, not daily_sales — ✅ (documented as separate, acknowledged divergence)

**Verdict: ✅ COMPLIANT with documented caveat.** The business rules acknowledge this is a separate computation for product-level breakdown. The divergence from `daily_sales` is expected and documented.

---

### Rule 2.2 — Quota Progress Percentage

**Rule:** `Math.min((monthlySalesTotal / monthlyQuota) * 100, 100)`. Both values MUST come from `ReportStateService.getMonthlyReport()` and `SettingsService.getSettings()`.

**Consumers:**

1. `QuotaStatusWidget.monthlyStatus`:
   - `monthlyRevenue` from `reportStateService.getMonthlyReport().total` — ✅
   - `monthlyQuota` from `settingsService.getSettings().monthlyQuota` — ✅
   - Formula: `(current / quota) * 100` — ✅
   - BUT: no `Math.min(..., 100)` cap — ⚠️ MINOR (percentage can exceed 100, but color logic handles it: `>= 100` → green)

2. `MonthlySalesReport.progress`:
   - `total` from `reportStateService.getMonthlyReport().total` — ✅
   - `quota` from `settingsService.getSettings().monthlyQuota` — ✅
   - Formula: `Math.min((total / quota) * 100, 100)` — ✅

3. `SalesAnalytics.getMonthlyProgress(current)`:
   - `current` parameter comes from `storeService.getSalesAnalytics().monthlyRevenue` — ❌ WRONG DATA SOURCE
   - `quota` from `settingsService.getSettings().monthlyQuota` — ✅
   - Formula: `Math.min((current / quota) * 100, 100)` — ✅

**Verdict: ❌ BUG in SalesAnalytics.** It computes quota progress using `monthlyRevenue` from `StoreService.getSalesAnalytics()` (which reads from `transactions` with a 1000 limit) instead of `ReportStateService.getMonthlyReport().total` (which reads from `daily_sales`). This means the Store Stats page shows a different quota progress than the QuotaStatusWidget and MonthlySalesReport.

**Impact:** If there are more than 1000 transactions, the Store Stats page underreports monthly revenue and shows lower quota progress than the sidebar widget.

---

### Rule 2.3 — Daily Target

**Rule:** `remainingQuota / remainingDays` where `remainingDays = lastDayOfMonth - today + 1`.

**Consumers:**

1. `QuotaStatusWidget.dailyTarget`:
   - `remainingQuota = Math.max(quota - current, 0)` — ✅
   - `remainingDays = lastDay - now.getDate() + 1` — ✅
   - Guard: `if (quota === 0) return 0` — ✅
   - Guard: `remainingDays > 0` — ✅

2. `SalesAnalytics.getDailyQuota(monthlyRevenue)`:
   - Same formula — ✅
   - BUT: `monthlyRevenue` comes from wrong data source (see Rule 2.2) — ❌ INHERITED BUG

**Verdict: ✅ Formula correct in both. ❌ SalesAnalytics uses wrong input data (inherited from Rule 2.2 violation).**

---

### Rule 2.4 — Quota Status Colors

**Rule:** green ≥100%, yellow ≥75%, orange ≥50%, red <50%, neutral = quota 0.

**Code:** `QuotaStatusWidget.monthlyStatus`:
```typescript
if (quota === 0) return 'neutral';
if (percentage >= 100) return 'green';
if (percentage >= 75) return 'yellow';
if (percentage >= 50) return 'orange';
return 'red';
```

**Verdict: ✅ COMPLIANT.**

---

### Rule 3.1 — Shift Totals (Atomic Increments)

**Rule:** All shift totals maintained via Firestore `increment()`. Never computed client-side except in `recalculateShiftTotals()`.

**Code:**
- `CashRegisterService.addCashTransaction()` — uses `increment()` for all totals — ✅
- `StoreService.checkout()` — uses `increment()` for shift updates — ✅
- `StoreService.voidTransaction()` — uses `increment(-amount)` via pre-fetched updates — ✅

**Verdict: ✅ COMPLIANT.**

---

### Rule 3.2 — Expected Closing Balance

**Rule:** `openingBalance + totalCashSales + totalFloatIn - totalExpenses - totalFloatOut`. GCASH sales do NOT affect expected balance.

**Code:**
- CASH sale: `expectedClosingBalance: increment(amount)` — ✅
- GCASH sale: no `expectedClosingBalance` update — ✅
- Float In: `expectedClosingBalance: increment(amount)` — ✅
- Expense: `expectedClosingBalance: increment(-amount)` — ✅
- Float Out: `expectedClosingBalance: increment(-amount)` — ✅

**Verdict: ✅ COMPLIANT.**

---

### Rule 3.3 — Shift Variance

**Rule:** `actualClosingBalance - expectedClosingBalance`. Computed once in `closeShift()`.

**Code:** `CashRegisterService.closeShift()`: `const discrepancy = actualClosingBalance - shift.expectedClosingBalance;`

**Verdict: ✅ COMPLIANT.**

---

### Rule 3.5 — Void Impact on Shift

**Rule:** All void operations in a single `writeBatch`.

**Code:** `StoreService.voidTransaction()` — single batch with stock revert, transaction status, daily_sales, and shift updates.

**Verdict: ✅ COMPLIANT.**

---

### Rule 4.1 — Membership Renewal Cycle

**Rule:** 30 days from base date. If current expiration is in the future, stack from it.

**Code:** `MemberService.renewMembership()`:
```typescript
if (currentExpiry > now) { baseDate = currentExpiry; }
newExpiration.setDate(newExpiration.getDate() + 30);
```

**Verdict: ✅ COMPLIANT.**

---

### Rule 4.3 — Membership Status

**Rule:** `Active` with `null` expiration is a valid walk-in member, NOT a bug.

**Code:** `CheckInKiosk.confirmCheckIn()`:
```typescript
const hasActiveSubscription = member.membershipStatus === 'Active' && !!member.membershipExpiration && !isExpired;
```

**Verdict: ✅ COMPLIANT.** Correctly treats Active + null expiration as no subscription (walk-in dialog shown).

---

### Rule 5.1 — Volume Analytics

**Rule:** Daily volume = unique member visits per day. Hourly traffic = total check-ins (not deduplicated).

**Code:** `ReportsService.getVolumeAnalytics()`:
- Daily: `dailyVisitors` Set with `date_memberId` key — ✅
- Hourly: `hourlyCounts` incremented for every check-in — ✅

**Verdict: ✅ COMPLIANT.**

---

### Rule 5.2 — Top Attendees

**Rule:** Counted by unique visit DAYS per member.

**Code:** `ReportsService.getTopAttendees()`: `dailyVisits` Set with `date_memberId` key — ✅

**Verdict: ✅ COMPLIANT.**

---

### Rule 6.1 — Local Date String

**Rule:** NEVER use `toISOString().split('T')[0]` for date keys. Use `toLocalDateStr()`.

**Violations found:**

1. `ReportsService.getVolumeAnalytics()` lines 19-20:
   ```typescript
   const startStr = startDate.toISOString().split('T')[0];
   const endStr = endDate.toISOString().split('T')[0];
   ```
   ❌ Uses `toISOString()` for attendance date range query.

2. `ReportsService.getTopAttendees()` lines 134-135:
   ```typescript
   const startStr = startDate.toISOString().split('T')[0];
   const endStr = endDate.toISOString().split('T')[0];
   ```
   ❌ Same violation.

3. `QuotaStatusWidget.todayRevenue` line 50:
   ```typescript
   return d.date.toISOString().split('T')[0] === localTodayStr;
   ```
   ❌ Compares `daily_sales` date (which is a Date object from `new Date(k)` in `getMonthlySalesReport`) using `toISOString()`. The `localTodayStr` is correctly built from local components, but `d.date.toISOString()` produces a UTC string. At UTC midnight boundary, these won't match.

**Impact:**
- Violations 1 & 2: If the user is in a timezone ahead of UTC (e.g., UTC+8 Philippines), a date range query at 11 PM local time would use the next day's UTC date as the boundary, potentially missing or including wrong records.
- Violation 3: Today's revenue could show 0 or yesterday's value near midnight in non-UTC timezones.

**Fix:** Replace `toISOString().split('T')[0]` with `toLocalDateStr()` from `store.service.ts` (or `getLocalDateString()` from `date.utils.ts`).

---

### Rule 6.2 — Firestore Timestamps

**Rule:** Safe conversion pattern: `value.toDate ? value.toDate() : new Date(value)`

**Verdict: ✅ COMPLIANT in most places.** The WalkInDialog template crash (TC-23) was already fixed in a previous commit.

---

## Summary

| Rule | Status | Severity |
| --- | --- | --- |
| 1.1 Transaction Total | ✅ Compliant | — |
| 1.2 Daily Sales Total | ✅ Compliant | — |
| 1.3 Monthly Sales Total | ⚠️ Partial | Medium — SalesAnalytics uses wrong source |
| 1.4 Sales by Staff | ❌ Bug | High — VOID transactions included |
| 1.5 Reports Dashboard Analytics | ❌ Bug | High — VOID transactions included |
| 1.6 Store Stats Analytics | ✅ Compliant (with caveat) | — |
| 2.2 Quota Progress | ❌ Bug in SalesAnalytics | Medium — wrong data source |
| 2.3 Daily Target | ❌ Inherited bug | Medium — wrong input in SalesAnalytics |
| 2.4 Quota Status Colors | ✅ Compliant | — |
| 3.1 Shift Totals | ✅ Compliant | — |
| 3.2 Expected Closing Balance | ✅ Compliant | — |
| 3.3 Shift Variance | ✅ Compliant | — |
| 3.5 Void Impact on Shift | ✅ Compliant | — |
| 4.1 Membership Renewal | ✅ Compliant | — |
| 4.3 Membership Status | ✅ Compliant | — |
| 5.1 Volume Analytics | ✅ Compliant | — |
| 5.2 Top Attendees | ✅ Compliant | — |
| 6.1 Local Date String | ❌ 3 violations | Medium — timezone boundary errors |
| 6.2 Firestore Timestamps | ✅ Compliant | — |

## Bugs Found

| # | Rule | Location | Bug | Severity |
| --- | --- | --- | --- | --- |
| 1 | 1.4 | `StoreService.getSalesTotal()` | No VOID exclusion — server-side `sum('totalAmount')` includes voided transactions | High |
| 2 | 1.4 | `StoreService.getTransactions()` | No VOID exclusion — returns all transactions including voided ones | Medium (consumers must filter) |
| 3 | 1.5 | `ReportsService.getSalesAnalytics()` | No VOID exclusion in `forEach` loop — all report aggregates include voided transactions | High |
| 4 | 2.2 | `SalesAnalytics.getMonthlyProgress()` | Uses `monthlyRevenue` from `StoreService.getSalesAnalytics()` (transactions, limit 1000) instead of `ReportStateService.getMonthlyReport()` (daily_sales) | Medium |
| 5 | 6.1 | `ReportsService.getVolumeAnalytics()` | Uses `toISOString().split('T')[0]` instead of `toLocalDateStr()` for date range | Medium |
| 6 | 6.1 | `ReportsService.getTopAttendees()` | Same `toISOString()` violation | Medium |
| 7 | 6.1 | `QuotaStatusWidget.todayRevenue` | Compares dates using `toISOString()` instead of local date string | Medium |

## Recommendations

Bugs 1-3 (VOID exclusion) are the highest priority — they directly cause the sales total divergence you've been experiencing. When a transaction is voided, `daily_sales` is correctly decremented but `ReportsService.getSalesAnalytics()` and `getSalesTotal()` still count the voided amount. This is why the Reports Dashboard shows different totals than the Monthly Sales Report.

Bugs 5-7 (timezone) are latent — they only manifest near midnight in non-UTC timezones. Since the gym is in the Philippines (UTC+8), these could cause incorrect date boundaries for attendance queries and today's revenue display between 4 PM and midnight UTC (12 AM - 8 AM local).
