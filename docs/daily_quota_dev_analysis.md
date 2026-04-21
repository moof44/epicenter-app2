# Daily Quota — Senior Developer Analysis of QA Bug Report

**Date:** April 11, 2026  
**Analyst:** Senior Angular Developer  
**Source:** `docs/daily_quota_qa_attack_report.md`

---

## Methodology

Each QA finding was traced through the actual source code across the full data pipeline:

```
checkout() / voidTransaction()  →  daily_sales (Firestore)
  → StoreService.getMonthlySalesReport()
    → ReportStateService.getMonthlyReport() 
      → QuotaStatusWidget (signals)
```

Files reviewed:
- `src/app/core/components/quota-status-widget/quota-status-widget.ts`
- `src/app/core/components/quota-status-widget/quota-status-widget.html`
- `src/app/core/services/report.state.service.ts`
- `src/app/core/services/store.service.ts` (checkout, voidTransaction, getMonthlySalesReport)
- `src/app/core/services/settings.service.ts`
- `src/app/core/models/store.model.ts`
- `src/app/features/store/components/cash-management/cash-management.ts`
- `src/app/app.html`

---

## BUG 1 — Stale cache after void

**QA Claim:** After voiding a transaction, the widget still shows inflated revenue because `ReportStateService` cache is never invalidated.

**Code Trace:**

1. `voidTransaction()` in `store.service.ts` correctly decrements `daily_sales.totalSales` via `increment(-txData.totalAmount)` in a Firestore batch.
2. However, `voidTransaction()` never calls `reportStateService.clearCache()` or emits any event.
3. `cash-management.ts` calls `storeService.voidTransaction()` but does not call `clearCache()` either.
4. The widget calls `reportStateService.getMonthlyReport(year, month)` once at construction with `forceRefresh = false`.
5. On first load, the cache is empty, so it goes through to `getMonthlySalesReport()` which returns a `collectionData()` live listener. The `tap()` operator caches the first emission.
6. Because `collectionData()` is a live Firestore listener, subsequent Firestore changes (including void decrements) DO emit new values through the same observable. The `tap()` updates the cache with each emission. The `toSignal()` in the widget keeps the subscription alive.
7. BUT — if the widget is destroyed and recreated (e.g., navigation), the next call to `getMonthlyReport()` finds the cache populated and returns `of(cachedData)` — a dead snapshot. From that point on, no live updates.

**Verdict: CONFIRMED BUG — but nuanced.**

On the very first load, the widget IS reactive because `collectionData()` is a live listener and `toSignal()` keeps the subscription. Voids will update in near-real-time. However, if the component is ever destroyed and recreated (which doesn't happen here since it's in `app.html` toolbar and never destroyed), the cache would serve stale data.

The real problem is: the widget lives in `app.html` and is never destroyed, so the first subscription stays alive. The cache `tap()` keeps updating. So for the widget specifically, this bug does NOT manifest in normal usage.

BUT — if another component (like the Monthly Sales Report page) calls `getMonthlyReport()` first and populates the cache, then the widget's later call gets `of(cachedData)` — a dead snapshot. This IS a real scenario: user opens Monthly Sales Report page first, cache is populated, then navigates to a page with the widget visible — widget gets stale data.

**Actual severity: MEDIUM** (depends on navigation order, not CRITICAL as QA stated)

**Suggested Fix:**
- Option A: Remove the `monthlyCache` entirely for the monthly report path. `collectionData()` already provides live updates and AngularFire handles its own internal caching. The `ReportStateService` cache is redundant and harmful.
- Option B: If caching is needed for performance, switch to a `BehaviorSubject`-based cache that forwards live emissions instead of snapshotting with `of()`. The `getMonthlyReport()` method should return the live observable and only use the cache as a fallback initial value, not a replacement.

---

## BUG 2 — Timezone-unsafe date comparison

**QA Claim:** `todayRevenue` uses local date but compares against UTC dates, causing mismatches in UTC+ timezones.

**Code Trace:**

Verified on this machine (UTC+8):

| Expression | Result |
|---|---|
| `new Date(2026, 3, 11).toISOString()` | `2026-04-10T16:00:00.000Z` |
| `new Date(2026, 3, 11, 23, 30).toISOString()` | `2026-04-11T15:30:00.000Z` |
| `new Date('2026-04-11').toISOString()` | `2026-04-11T00:00:00.000Z` |

The full chain has THREE timezone-sensitive points:

**Point A — checkout() writes daily_sales doc ID:**
```ts
const dateStr = timestamp.toISOString().split('T')[0]; // UTC date
```
A sale at 7:30 AM local (April 11, UTC+8) = `2026-04-10T23:30:00Z` → doc ID = `"2026-04-10"` (previous day in UTC).

**Point B — getMonthlySalesReport() pre-fills the map:**
```ts
const d = new Date(year, month, i);
const k = d.toISOString().split('T')[0]; // Also UTC
```
For day `i = 11` in UTC+8: `new Date(2026, 3, 11)` = midnight local = `2026-04-10T16:00:00Z` → key = `"2026-04-10"`.

So Point A and Point B are consistently UTC — they match each other. A sale at 7:30 AM local on April 11 goes into doc `"2026-04-10"`, and the map key for local day 11 is also `"2026-04-10"`. The `sortedDays` array entry for local day 11 has `date: new Date("2026-04-10")` which is midnight UTC on April 10.

**Point C — Widget todayRevenue lookup:**
```ts
const localTodayStr = `${year}-${month}-${day}`; // "2026-04-11" (local)
// ...
d.date.toISOString().split('T')[0] // "2026-04-10" (UTC, from Point B)
```

`"2026-04-11" !== "2026-04-10"` → **NO MATCH**. `todayRevenue = 0`.

**Verdict: CONFIRMED BUG — and it's worse than QA described.**

The QA report focused on late-night sales. In reality, for UTC+8, ALL sales before 4 PM local time (midnight UTC) are keyed to the previous UTC day. And the widget lookup ALWAYS fails because the map keys are UTC but the lookup is local. The entire `todayRevenue` computation is broken for any timezone with a positive UTC offset.

For UTC- timezones, the reverse happens: early-morning sales (before midnight UTC) are keyed to the previous local day.

The only timezone where this works correctly is UTC+0.

**Actual severity: CRITICAL** (higher than QA's HIGH rating — affects all non-UTC timezones, not just late-night)

**Suggested Fix:**
Standardize all date key generation to use local dates instead of UTC. Replace every `toISOString().split('T')[0]` with a local date formatter:

```ts
function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

Apply this in all 8 touch points (the `toISOString().split('T')[0]` pattern appears in each):

1. `store.service.ts` → `checkout()` — daily_sales doc ID generation
2. `store.service.ts` → `voidTransaction()` — dateStr for daily_sales decrement
3. `store.service.ts` → `getMonthlySalesReport()` — map key generation AND query range boundaries (`startId`/`endId`)
4. `store.service.ts` → `recalculateDailySales()` — dateStr from transaction dates
5. `store.service.ts` → `recalculateSalesForDay()` — dateStr for daily_sales doc ID
6. `store.service.ts` → `recalculateSalesForMonth()` — dateStr from transaction dates
7. `reports.service.ts` → `getSalesAnalytics()` — groups transactions by date for the "Sales per Day" chart
8. `quota-status-widget.ts` → `todayRevenue` — already uses local date for lookup, but compares against UTC dates from `getMonthlySalesReport()`. After fixing #3, this comparison will align automatically.

Note: `attendance.service.ts` already uses a correct `getLocalDateString()` helper for attendance records. The same pattern should be adopted for the store/sales pipeline. `member.service.ts` → `normalizeDate()` and `attendance-chart.ts` also use `toISOString()` but operate on attendance data (not `daily_sales`), so they are out of scope for this fix — though they carry the same timezone bug for attendance-related features.

**Migration — critical: must delete orphaned UTC-keyed docs.**

This is a breaking change for existing Firestore data. The migration must:

1. Patch all 8 touch points above FIRST.
2. Run `recalculateDailySales()` (now patched to use local dates) to create new correctly-keyed docs.
3. **Delete orphaned UTC-keyed docs** that no longer match any local-date key. Without this step, `getMonthlySalesReport()` will query both old UTC-keyed docs and new local-keyed docs in the same month range, double-counting revenue.

The safest migration approach:

```ts
async migrateToLocalDateKeys(): Promise<void> {
  // Step 1: Delete ALL existing daily_sales docs
  const allDocs = await getDocs(collection(this.firestore, 'daily_sales'));
  let batch = writeBatch(this.firestore);
  let count = 0;
  allDocs.forEach(docSnap => {
    batch.delete(docSnap.ref);
    count++;
    if (count >= 400) {
      batch.commit();
      batch = writeBatch(this.firestore);
      count = 0;
    }
  });
  if (count > 0) await batch.commit();

  // Step 2: Rebuild from transactions using patched (local-date) logic
  await this.recalculateDailySales();
}
```

Firestore billing impact is negligible (~9K reads + ~180 deletes + ~180 writes for a 6-month history, roughly $0.01 one-time).

---

## BUG 3 — Missing `status: 'COMPLETED'` on checkout

**QA Claim:** `checkout()` never sets `status` on new transactions, leaving it `undefined`.

**Code Trace:**

The `Transaction` interface defines:
```ts
status?: 'COMPLETED' | 'VOID';
```

In `checkout()`, the transaction object is:
```ts
const transaction: Omit<Transaction, 'id'> = {
  date: timestamp,
  totalAmount: total,
  items: cartItems,
  // ... no status field
};
```

All void-checking code uses `if (data.status === 'VOID') return;` which correctly skips voided transactions. For `undefined` status, this evaluates to `false`, so normal transactions pass through.

The recalculation utilities (`recalculateDailySales`, `recalculateSalesForDay`, `recalculateSalesForMonth`) all use the same pattern: `if (data.status === 'VOID') return;` — they work correctly with `undefined`.

No code anywhere checks `status === 'COMPLETED'`.

**Verdict: CONFIRMED — but low practical risk.**

This is a code hygiene issue, not a functional bug today. The `undefined` status works because all filtering is negative (`=== 'VOID'`). However, it's a latent defect — any future feature that needs to positively identify completed transactions (e.g., a "completed transactions" filter, an export, or a report) would silently exclude all historical transactions.

**Actual severity: LOW** (downgraded from QA's MEDIUM — no current functional impact)

**Suggested Fix:**
Add `status: 'COMPLETED'` to the transaction object in `checkout()`:
```ts
const transaction: Omit<Transaction, 'id'> = {
  date: timestamp,
  totalAmount: total,
  status: 'COMPLETED',
  // ...rest
};
```
Consider a one-time Firestore migration to backfill `status: 'COMPLETED'` on all existing transactions where `status` is undefined. Note: Firestore's `where('status', '==', null)` may not match documents where the field was never written (as opposed to explicitly set to `null`). A full collection scan with client-side filtering is safer — use a Cloud Function or admin script rather than client-side code.

---

## BUG 4 — Absurd daily target on last day of month

**QA Claim:** On the last day, `dailyTarget` equals the entire remaining shortfall, producing an unachievable number.

**Code Trace:**

```ts
const remainingDays = lastDay - now.getDate() + 1;
return remainingDays > 0 ? remainingQuota / remainingDays : 0;
```

On April 30 (last day): `remainingDays = 30 - 30 + 1 = 1`. If `remainingQuota = 45000`, then `dailyTarget = 45000`.

**Verdict: NOT A BUG — this is mathematically correct behavior.**

The daily target answers the question: "How much do we need to sell per remaining day (including today) to hit the monthly quota?" On the last day, the answer IS the entire remaining shortfall. That's the honest truth.

The QA report frames this as "demoralizing UX," but displaying a false lower number would be dishonest. The real problem is the quota was not met over the month — the widget is just the messenger.

**Actual severity: NOT A BUG (design/UX preference)**

**Suggested Enhancement (optional, not a fix):**
If the team wants softer UX, add a "quota missed" state when it's the last day and `remainingQuota > todayRevenue * 3` (or some threshold). Show a different icon/message like "Monthly target unlikely" instead of an impossible daily number. But this is a product decision, not a code fix.

---

## BUG 5 — Negative daily_sales after double-void

**QA Claim:** Concurrent voids or direct Firestore edits could cause negative `totalSales`.

**Code Trace:**

`voidTransaction()` has an application-level guard:
```ts
if (txData.status === 'VOID') {
  throw new Error('Transaction is already voided');
}
```

This prevents double-voids through the UI. However:
- There is no Firestore security rule or transaction-level lock shown in the codebase.
- The check is a read-then-write pattern (read status, then write in batch). Two concurrent calls could both read `status !== 'VOID'` before either commits.
- Direct Firestore console edits bypass all application logic.

The `increment(-txData.totalAmount)` on `daily_sales` has no floor constraint. Firestore `increment()` is atomic but doesn't enforce non-negative values.

**Verdict: CONFIRMED BUG — but narrow attack surface.**

The race condition window is small (two admins voiding the exact same transaction within milliseconds). Direct Firestore edits are an admin-only concern. But the lack of a Firestore transaction (as opposed to a batch) means the read-check-write is not atomic.

**Actual severity: LOW** (downgraded from QA's MEDIUM — requires very specific race condition or manual DB tampering)

**Suggested Fix:**
Wrap the void logic in a Firestore `runTransaction()` instead of `writeBatch()`. This makes the read-check-write atomic:

```ts
await runTransaction(this.firestore, async (txn) => {
  // 1. Read transaction doc (atomic check)
  const txSnap = await txn.get(txRef);
  if (!txSnap.exists()) throw new Error('Transaction not found');
  if (txSnap.data()?.status === 'VOID') throw new Error('Already voided');

  // 2. Read daily_sales doc (for floor check)
  const dfsSnap = await txn.get(dfsRef);
  const currentTotal = dfsSnap.data()?.totalSales || 0;
  const newTotal = Math.max(currentTotal - txData.totalAmount, 0);

  // 3. Read product docs (for stock revert)
  // ... read all product docs here ...

  // 4. Read shift doc (inline the shift lookup)
  // ... read shift doc here ...

  // 5. All reads done — now write
  txn.update(txRef, { status: 'VOID', voidedBy: ..., voidReason: ..., voidedAt: now });
  txn.update(dfsRef, { totalSales: newTotal });
  txn.update(productRef, { stock: currentStock + item.quantity }); // explicit, not increment()
  txn.update(shiftRef, { ... });
});
```

**Important constraint: `runTransaction()` does not support `FieldValue` sentinels (`increment()`, `arrayUnion()`, `arrayRemove()`) inside `transaction.update()`.** All current `increment()` calls must be converted to a read-compute-write pattern: read the current value inside the transaction, compute the new value in code, and write the explicit result. This adds more reads (one per doc that currently uses `increment()`), but voids are rare so the billing impact is negligible.

The current code's `cashRegisterService.getVoidTransactionShiftUpdates()` async read must also be inlined into the transaction callback, since `runTransaction()` requires all reads to happen before any writes.

This eliminates the race condition entirely. The `Math.max(..., 0)` floor check prevents negative `daily_sales.totalSales`.

---

## BUG 6 — Widget hidden when quota = 0

**QA Claim:** `*ngIf="monthlyQuota() > 0"` hides the entire widget when quota isn't configured.

**Code Trace:**

Template:
```html
<div class="quota-widget" *ngIf="isWidgetVisible() && monthlyQuota() > 0">
```

When `monthlyQuota` is 0 (default from `{ monthlyQuota: 0 }`), the widget is completely hidden.

**Verdict: NOT A BUG — this is intentional design.**

The widget's purpose is to show progress toward a quota. If there's no quota configured, showing "0 / 0" or "500 / 0" is meaningless and confusing. Hiding the widget when there's no quota is the correct UX decision. The daily revenue is visible in other places (Monthly Sales Report, POS dashboard).

**Actual severity: NOT A BUG**

No fix needed. If the team wants a "daily sales only" mode without quota, that would be a new feature request, not a bug fix.

---

## BUG 7 — False red flash on initial load

**QA Claim:** `initialValue: { days: [], total: 0 }` causes a red status flash before data loads.

**Code Trace:**

```ts
report = toSignal(this.report$, { initialValue: { days: [], total: 0 } });
```

Before Firestore responds:
- `monthlyRevenue()` = 0
- `todayRevenue()` = 0
- `dailyTarget()` = `monthlyQuota / remainingDays` (non-zero if quota is set)
- `dailyStatus()` = `(0 / target) * 100` = 0% → `'red'`

So yes, the widget briefly shows red with "0 / X" until data arrives.

**Verdict: CONFIRMED BUG — minor UX issue.**

The flash duration depends on Firestore latency (typically 100-500ms on warm connections, 1-2s on cold). It's noticeable.

**Actual severity: LOW** (matches QA rating)

**Suggested Fix:**
Add a loading state. Keep the `initialValue` but add a `isLoaded` guard to avoid changing the signal type:

```ts
report = toSignal(this.report$, { initialValue: { days: [], total: 0 } });
isReportLoaded = toSignal(this.report$.pipe(map(() => true)), { initialValue: false });
```

Then in the template, gate on the loaded flag:

```html
<div class="quota-widget" *ngIf="isWidgetVisible() && monthlyQuota() > 0 && isReportLoaded()">
```

This avoids the false red flash while keeping the signal type as `Signal<{ days: DailySales[], total: number }>` (non-nullable). All downstream computed signals (`monthlyRevenue`, `todayRevenue`, `dailyTarget`, etc.) continue to work without any null-check changes.

**Why not remove `initialValue`?** Removing it changes the signal type to `Signal<T | undefined>`, which would cause compile errors in every downstream computed that reads `this.report().total` or `this.report().days` without optional chaining. That cascading type change is unnecessary for this fix.

---

## BUG 8 — Stale date after midnight rollover

**QA Claim:** `currentDate` is set once at construction; after midnight the widget queries the wrong month.

**Code Trace:**

```ts
private currentDate = new Date();
report$ = this.reportStateService.getMonthlyReport(
  this.currentDate.getFullYear(), 
  this.currentDate.getMonth()
);
```

The widget is in `app.html` and is constructed once when the app boots. If the app stays open past midnight on the last day of a month, `currentDate` still points to the old month. The `report$` observable queries the old month's data. `todayRevenue` builds `localTodayStr` from `new Date()` (fresh), but searches in the old month's `days` array — it won't find today's date there.

Additionally, `dailyTarget` uses `new Date()` for `remainingDays` calculation, which would be correct for the new month, but `monthlyRevenue` is from the old month. This creates a nonsensical calculation.

**Verdict: CONFIRMED BUG.**

This is a real scenario for gym staff who open the app in the evening and leave it running overnight. On the 1st of a new month, the widget shows last month's data with this month's remaining-days calculation.

**Actual severity: LOW** (matches QA — only affects overnight sessions crossing month boundaries)

**Suggested Fix:**
Replace the static `currentDate` + direct observable with a `BehaviorSubject<Date>` driving a `switchMap`. This lets the signal re-wire reactively when the date changes:

```ts
private currentDate$ = new BehaviorSubject<Date>(new Date());

report$ = this.currentDate$.pipe(
  switchMap(date => this.reportStateService.getMonthlyReport(date.getFullYear(), date.getMonth()))
);

report = toSignal(this.report$, { initialValue: { days: [], total: 0 } });

constructor() {
  // Check every 60s if the day/month has changed
  interval(60_000).pipe(
    filter(() => {
      const now = new Date();
      const current = this.currentDate$.getValue();
      return now.getDate() !== current.getDate()
          || now.getMonth() !== current.getMonth();
    }),
    takeUntilDestroyed()
  ).subscribe(() => {
    this.currentDate$.next(new Date());
  });
}
```

This approach:
- Keeps `toSignal()` wired once at construction (no re-assignment needed).
- When `currentDate$` emits a new date, `switchMap` unsubscribes from the old month's observable and subscribes to the new one.
- Works correctly with the BUG 10 `shareReplay({ refCount: true })` cache — the old month's refCount drops, detaching its Firestore listener.
- Firestore billing impact: ~30 reads once at midnight when the month rolls over.

---

## BUG 9 — Green status on zero-sales quota-met day

**QA Claim:** When quota is met, widget shows "0 / 0" in green, which is confusing.

**Code Trace:**

```ts
dailyTarget = computed(() => {
  const remainingQuota = Math.max(quota - current, 0); // 0 when quota met
  return remainingDays > 0 ? 0 / remainingDays : 0;   // = 0
});

dailyStatus = computed(() => {
  if (target <= 0) return 'green'; // target = 0 → green
});
```

Template shows: `{{ todayRevenue() | number }} / {{ dailyTarget() | number }}` → "0 / 0" in green.

**Verdict: NOT A BUG — but could be improved.**

When the monthly quota is met, the daily target is correctly 0 (no more needed). Green is the right color (goal achieved). The "0 / 0" display is technically accurate but lacks context.

**Actual severity: NOT A BUG (cosmetic preference)**

**Suggested Enhancement (optional):**
When `monthlyRevenue >= monthlyQuota`, show a "Quota Met" badge instead of the daily breakdown. Something like:
```html
<span *ngIf="monthlyRevenue() >= monthlyQuota()">✓ Quota Met</span>
<span *ngIf="monthlyRevenue() < monthlyQuota()">{{ todayRevenue() }} / {{ dailyTarget() }}</span>
```

---

## BUG 10 — Cache kills Firestore live reactivity

**QA Claim:** After caching, `of(cachedData)` replaces the live `collectionData()` listener, killing reactivity.

**Code Trace:**

```ts
// ReportStateService
getMonthlyReport(year, month, forceRefresh = false) {
  const key = `${year}-${month}`;
  if (!forceRefresh && this.monthlyCache.has(key)) {
    return of(this.monthlyCache.get(key)!); // ← dead snapshot
  }
  return this.storeService.getMonthlySalesReport(year, month).pipe(
    tap(data => this.monthlyCache.set(key, data)) // ← caches each emission
  );
}
```

**Scenario analysis:**

**Scenario A — Widget loads first (most common):**
Cache is empty → returns live `collectionData()` observable → `toSignal()` subscribes → stays alive in `app.html` → receives live updates → `tap()` updates cache on each emission. Widget IS reactive.

**Scenario B — Monthly Sales Report page loads first:**
That page calls `getMonthlyReport()` → cache empty → returns live observable → `tap()` caches first emission → user navigates away → subscription destroyed → cache retains last snapshot. Widget then calls `getMonthlyReport()` → cache hit → returns `of(staleSnapshot)` → widget gets dead data.

**Scenario C — Widget loads, then another component calls getMonthlyReport:**
Widget already has a live subscription. Other component gets `of(cachedData)` from the cache. The cache IS being updated by the widget's live subscription, so the other component gets reasonably fresh data (from the last emission). But it's still a one-shot — it won't receive future updates.

**Verdict: CONFIRMED BUG — navigation-order dependent.**

The severity depends on typical user flow. If users always land on the dashboard first (widget loads first → Scenario A), the widget stays reactive. But if they bookmark the Monthly Sales Report page or navigate there first, the widget gets stale data.

The `clearCache()` method exists but is only called from the Monthly Sales Report page's manual "Recalculate" buttons — not from normal operations like checkout or void.

**Actual severity: HIGH** (matches QA rating — the caching strategy is architecturally flawed)

**Suggested Fix:**
Replace the snapshot cache with a `shareReplay`-based approach. Instead of caching the data, cache the observable itself:

```ts
private monthlyObservableCache = new Map<string, Observable<{days: DailySales[], total: number}>>();

getMonthlyReport(year: number, month: number): Observable<{days: DailySales[], total: number}> {
  const key = `${year}-${month}`;
  if (!this.monthlyObservableCache.has(key)) {
    const live$ = this.storeService.getMonthlySalesReport(year, month).pipe(
      shareReplay({ bufferSize: 1, refCount: true })
    );
    this.monthlyObservableCache.set(key, live$);
  }
  return this.monthlyObservableCache.get(key)!;
}
```

This way, all subscribers share the same live Firestore listener. New subscribers get the last emitted value immediately (via `shareReplay`) AND receive future updates. The `forceRefresh` parameter and `clearCache()` can be removed entirely.

**Critical: use `{ bufferSize: 1, refCount: true }` — not bare `shareReplay(1)`.** Without `refCount`, browsing historical months on the Monthly Sales Report page accumulates orphaned Firestore listeners that never detach. Each orphaned listener bills reads on every `daily_sales` change across all watched months. With `refCount: true`, listeners detach when all subscribers leave, and only the current month's listener (held by the always-alive widget) stays active. Zero ongoing billing increase.

**Required downstream changes in Monthly Sales Report page (`monthly-sales-report.ts`):**

The Monthly Sales Report page currently calls `clearCache()` + `forceReload()` after recalculating daily sales. With the `shareReplay` approach:

- `clearCache()` calls must be replaced with `invalidateMonthlyReport(year, month)` — a new method that deletes the cached observable for that key, forcing the next subscriber to create a fresh `collectionData()` listener:

```ts
invalidateMonthlyReport(year: number, month: number): void {
  const key = `${year}-${month}`;
  this.monthlyObservableCache.delete(key);
}
```

- The `forceReload()` hack (toggling `currentDate` by +1ms then back) is no longer needed for normal operations because the live listener auto-updates. It IS still needed after `invalidateMonthlyReport()` to force the `switchMap` to re-subscribe. But the current implementation is fragile. A cleaner approach: add a `refreshTrigger` subject:

```ts
private refreshTrigger = new Subject<void>();

report$ = combineLatest([toObservable(this.currentDate), this.refreshTrigger.pipe(startWith(undefined))]).pipe(
  switchMap(([date]) => this.reportStateService.getMonthlyReport(date.getFullYear(), date.getMonth()))
);

// After recalculation:
this.reportStateService.invalidateMonthlyReport(year, month);
this.refreshTrigger.next();
```

**Also fix `getUserSalesReport()` — same bug, same pattern.**

The `getUserSalesReport()` method in `ReportStateService` has the identical `of(cachedData)` stale-cache problem. It should be refactored to the same `shareReplay({ bufferSize: 1, refCount: true })` pattern for consistency. The Sales By User page (`sales-by-user.ts`) is the only consumer.

---

## Summary

| # | Bug | QA Severity | Dev Verdict | Confirmed? | Adjusted Severity |
|---|-----|-------------|-------------|------------|-------------------|
| 1 | Stale cache after void | CRITICAL | Navigation-order dependent | YES (nuanced) | MEDIUM |
| 2 | Timezone date mismatch | HIGH | Affects ALL non-UTC timezones, not just late-night | YES (worse than reported) | CRITICAL |
| 3 | Missing status: COMPLETED | MEDIUM | No current functional impact | YES (hygiene) | LOW |
| 4 | Absurd last-day target | MEDIUM | Mathematically correct | NO | N/A |
| 5 | Negative daily_sales | MEDIUM | Requires race condition or DB tampering | YES (narrow) | LOW |
| 6 | Widget hidden when quota=0 | LOW | Intentional design | NO | N/A |
| 7 | False red flash on load | LOW | Real UX issue | YES | LOW |
| 8 | Stale date after midnight | LOW | Real for overnight sessions | YES | LOW |
| 9 | Green on zero-sales day | COSMETIC | Correct behavior | NO | N/A |
| 10 | Cache kills reactivity | HIGH | Architecture flaw, navigation-dependent | YES | HIGH |

### Recommended Fix Priority

All fixes below have been reviewed by a Firestore specialist (billing-safe) and audited for side effects. Total ongoing cost increase across all fixes: ~30 reads/day ($0.0005/month). See `docs/daily_quota_firestore_billing_review.md` for the full billing analysis.

1. **BUG 2 (CRITICAL):** Timezone fix — standardize all date keys to local time. Requires patching all 8 touch points listed above. Migration must delete all existing `daily_sales` docs before rebuilding, otherwise old UTC-keyed and new local-keyed docs will coexist and double-count revenue.
2. **BUG 10 (HIGH):** Replace snapshot cache with `shareReplay({ bufferSize: 1, refCount: true })` observable cache in `ReportStateService`. Must also: (a) replace `clearCache()` with `invalidateMonthlyReport()`, (b) remove the `forceReload()` hack from Monthly Sales Report page and use a `refreshTrigger` subject instead, (c) apply the same fix to `getUserSalesReport()`.
3. **BUG 1 (MEDIUM):** Resolved automatically if BUG 10 is fixed (the stale cache problem goes away when the cache strategy is fixed).
4. **BUG 7 (LOW):** Add `isReportLoaded` signal guard to template. Do NOT remove `initialValue` from `toSignal()` — that would change the signal type to `T | undefined` and cause compile errors in all downstream computed signals.
5. **BUG 8 (LOW):** Replace static `currentDate` with `BehaviorSubject<Date>` + `switchMap` + `interval(60_000)` date-change check. Use `takeUntilDestroyed()` for cleanup.
6. **BUG 3 (LOW):** Add `status: 'COMPLETED'` to checkout + backfill migration via Cloud Function.
7. **BUG 5 (LOW):** Convert void to `runTransaction()` for atomicity. Must replace all `increment()`/`arrayUnion()` calls with explicit read-compute-write since `FieldValue` sentinels are not supported inside `runTransaction()`. Must inline the shift lookup into the transaction callback.

---

## Audit Trail

**Audit Date:** April 11, 2026

The suggested fixes in this document were audited for breakage, goal achievement, and unintended side effects. The following corrections were applied:

| Fix | Issue Found | Correction Applied |
|-----|-------------|-------------------|
| BUG 2 | Scope was incomplete (5 touch points listed, 8 exist). `recalculateSalesForMonth()` and `reports.service.ts → getSalesAnalytics()` were missing. | Expanded to all 8 touch points. |
| BUG 2 | Migration would create duplicate docs (old UTC-keyed + new local-keyed) causing double-counted revenue. | Migration now deletes all `daily_sales` docs before rebuilding. |
| BUG 5 | `runTransaction()` does not support `increment()`, `arrayUnion()`, or `arrayRemove()`. Original snippet was invalid. | Replaced with explicit read-compute-write pattern. |
| BUG 7 | Removing `initialValue` from `toSignal()` changes type to `T \| undefined`, breaking all downstream computed signals. | Changed approach: keep `initialValue`, add separate `isReportLoaded` signal. |
| BUG 8 | Original snippet reassigned `this.report$` which doesn't re-wire `toSignal()`. | Replaced with working `BehaviorSubject<Date>` + `switchMap` + `takeUntilDestroyed()` pattern. |
| BUG 10 | `clearCache()` + `forceReload()` on Monthly Sales Report page would break or cause wasteful listener churn. | Added `invalidateMonthlyReport()` method and `refreshTrigger` subject pattern. |
| BUG 10 | `getUserSalesReport()` has the identical stale-cache bug but was not addressed. | Added note to apply same `shareReplay` fix to `getUserSalesReport()`. |
