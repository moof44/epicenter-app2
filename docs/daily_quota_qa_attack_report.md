# Daily Quota Widget — QA Attack Report

**Date:** April 11, 2026
**Role:** Senior QA Engineer
**Target:** `QuotaStatusWidget` and its upstream data pipeline

---

## Computation Trace

The daily quota flows through this chain:

```
Firestore `daily_sales` collection
  → StoreService.getMonthlySalesReport()
    → ReportStateService.getMonthlyReport() [cached]
      → QuotaStatusWidget (Angular signals)
```

### Key Computed Values

| Signal | Formula |
|---|---|
| `monthlyQuota` | `settings.monthlyQuota` from Firestore `settings/general` |
| `monthlyRevenue` | Sum of all `daily_sales.totalSales` docs for the current month |
| `todayRevenue` | Finds today's entry in the `days` array by matching `d.date.toISOString().split('T')[0]` against a local date string |
| `dailyTarget` | `max(monthlyQuota - monthlyRevenue, 0) / remainingDays` where `remainingDays = lastDayOfMonth - today + 1` |
| `dailyStatus` | Color bucket based on `todayRevenue / dailyTarget` percentage |

### Data Write Path (checkout)

1. `checkout()` creates a `Transaction` doc (no `status` field set).
2. Denormalizes into `daily_sales/{YYYY-MM-DD}` using `increment(total)`.
3. Date key is generated via `timestamp.toISOString().split('T')[0]` (UTC).

### Data Write Path (void)

1. `voidTransaction()` marks the transaction `status: 'VOID'`.
2. Decrements `daily_sales/{date}.totalSales` via `increment(-totalAmount)`.
3. Reverts inventory stock.

---

## Findings

### BUG 1 — Voided transactions still inflate `todayRevenue` until cache is busted

**Severity:** CRITICAL

`ReportStateService.getMonthlyReport()` caches the result in a `Map`. The widget calls it once on construction with `forceRefresh = false`. After a void, `daily_sales` is correctly decremented in Firestore, but the cached snapshot in `monthlyCache` is never invalidated.

**Reproduction:**
1. Make a sale for ₱5,000.
2. Observe widget shows ₱5,000 for today.
3. Void the transaction from Cash Management.
4. Widget still shows ₱5,000 — no change until full page refresh.

**Impact:** Daily quota displays inflated sales and a falsely optimistic status color.

---

### BUG 2 — `todayRevenue` uses timezone-unsafe date comparison

**Severity:** HIGH

The widget builds `localTodayStr` using local time:
```ts
const localTodayStr = `${year}-${month}-${day}`; // e.g. "2026-04-11" in UTC+8
```

But compares it against:
```ts
d.date.toISOString().split('T')[0] // UTC date string
```

The `daily_sales` document ID is also generated in `checkout()` using `toISOString()` (UTC). In UTC+ timezones, a sale at 11 PM local time is keyed to the next UTC day. The widget lookup uses the local date and won't find it.

**Reproduction (UTC+8):**
1. Make a sale at 11:30 PM local time (April 11).
2. `checkout()` keys it as `2026-04-12` (UTC).
3. Widget looks for `2026-04-11` — no match.
4. `todayRevenue` = 0 despite the sale just happening.

**Impact:** Late-night sales disappear from the daily quota widget in positive UTC offset timezones.

---

### BUG 3 — `checkout()` does not set `status: 'COMPLETED'` on new transactions

**Severity:** MEDIUM

The `Transaction` model defines `status?: 'COMPLETED' | 'VOID'` but `checkout()` never sets this field. New transactions have `status: undefined`. The void guard (`status === 'VOID'`) works because `undefined !== 'VOID'`, and recalculation utilities filter with `if (data.status === 'VOID') return` which also passes for `undefined`.

**Impact:** Works by accident. Any future logic checking `status === 'COMPLETED'` will silently exclude every normal transaction.

---

### BUG 4 — `dailyTarget` produces absurd values on the last day of the month

**Severity:** MEDIUM

On the last day: `remainingDays = lastDay - lastDay + 1 = 1`, so `dailyTarget = remainingQuota`. If the gym is ₱45,000 behind quota, the widget shows `"500 / 45,000"` for the day — an unachievable target that guarantees a red status.

**Reproduction:**
1. Set monthly quota to ₱100,000.
2. Reach the last day of the month with ₱55,000 in sales.
3. Widget shows daily target of ₱45,000 — always red.

**Impact:** Demoralizing UX on the last day of every month when quota isn't fully met.

---

### BUG 5 — Negative `daily_sales.totalSales` is possible after voiding

**Severity:** MEDIUM

`voidTransaction()` decrements `daily_sales.totalSales` by the transaction amount. The application-level guard (`if (txData.status === 'VOID') throw`) prevents double-voids through the UI. However, concurrent batch commits, direct Firestore console edits, or race conditions between two admins voiding simultaneously could bypass this check.

If the only sale of the day (₱1,000) is voided twice, `totalSales` becomes -₱1,000. This negative value flows into `monthlyRevenue`, which inflates `dailyTarget` (since `remainingQuota = quota - negative = quota + |negative|`).

**Impact:** Negative daily sales corrupt monthly totals and inflate daily targets.

---

### BUG 6 — `monthlyQuota = 0` hides the widget entirely, masking sales data

**Severity:** LOW

The template gate:
```html
<div class="quota-widget" *ngIf="isWidgetVisible() && monthlyQuota() > 0">
```

If `monthlyQuota` is 0 or never configured, the entire widget is hidden. Staff lose visibility into today's revenue entirely, even though that data exists independently of the quota setting.

**Impact:** No daily sales visibility when quota isn't configured.

---

### BUG 7 — `report` signal initialValue causes false red flash on load

**Severity:** LOW

```ts
report = toSignal(this.report$, { initialValue: { days: [], total: 0 } });
```

Before Firestore data arrives, the widget renders `0 / [target]` with a red status indicator. On slow connections this false alarm persists for several seconds. There is no loading state.

**Impact:** False negative status flash on every page load.

---

### BUG 8 — `currentDate` is set once at component construction, stale after midnight

**Severity:** LOW

```ts
private currentDate = new Date();
```

This is evaluated once when the component is created. If the app stays open past midnight (common for gym closing staff), the widget still queries the previous day's month. On the 1st of a new month, it shows last month's data until a page refresh.

**Reproduction:**
1. Open the app at 11 PM on April 30.
2. Leave it open past midnight (now May 1).
3. Widget still queries April data — shows stale monthly totals.

**Impact:** Stale month/day data after midnight rollover without refresh.

---

### BUG 9 — `dailyStatus` returns green when `target <= 0` even with zero sales

**Severity:** COSMETIC

```ts
if (target <= 0) return 'green';
```

When the monthly quota is already exceeded, `dailyTarget` = 0, so `dailyStatus` = green. The widget shows `"0 / 0"` in green. Technically correct (no more quota needed), but visually confusing — it looks like "no sales today and that's great."

**Impact:** Misleading green status when quota is met but today had no activity.

---

### BUG 10 — ReportStateService cache kills Firestore live reactivity

**Severity:** HIGH (Architectural)

When the cache has data, `getMonthlyReport()` returns `of(cachedData)` — a one-shot observable that completes immediately. The original `collectionData()` call from `getMonthlySalesReport()` is a live Firestore listener. After the first load populates the cache, all subsequent reads are frozen snapshots.

**Reproduction:**
1. Staff A opens the dashboard — widget loads live data, caches it.
2. Staff B makes a ₱2,000 sale from POS.
3. Staff A's widget still shows the old total — the cache is serving stale data.
4. Only a full page refresh or explicit `forceRefresh` fixes it.

**Impact:** Widget becomes stale in multi-user environments. Other staff's sales don't appear.

---

## Summary Matrix

| # | Bug | Severity | Category |
|---|-----|----------|----------|
| 1 | Stale cache after void | CRITICAL | Data Integrity |
| 2 | Timezone-unsafe date comparison | HIGH | Data Integrity |
| 3 | Missing `status: 'COMPLETED'` on checkout | MEDIUM | Data Integrity |
| 4 | Absurd daily target on last day of month | MEDIUM | UX / Logic |
| 5 | Negative `daily_sales` after double-void | MEDIUM | Data Integrity |
| 6 | Widget hidden when quota = 0 | LOW | UX |
| 7 | False red flash on initial load | LOW | UX |
| 8 | Stale date after midnight rollover | LOW | Data Freshness |
| 9 | Misleading green on zero-sales quota-met day | COSMETIC | UX |
| 10 | Cache kills live Firestore reactivity | HIGH | Architecture |
