# Daily Quota Fixes — Firestore Billing Impact Review

**Date:** April 11, 2026
**Reviewer:** Firestore Specialist
**Source:** `docs/daily_quota_dev_analysis.md`

---

## Firestore Billing Primer (relevant to this review)

| Operation | Cost (Spark/Blaze) |
|---|---|
| Document Read | $0.06 per 100K reads |
| Document Write | $0.18 per 100K writes |
| Document Delete | $0.02 per 100K deletes |
| Snapshot Listener | 1 read per doc on attach + 1 read per doc changed |
| `collectionData()` attach | Reads ALL matching docs on first attach (then only changed docs) |
| `increment()` | 1 write (no read) |
| `runTransaction()` | 1 read + 1 write per doc touched (reads are billed even on retry) |
| `writeBatch()` | 1 write per doc (no read cost for the batch itself) |

Key insight: The most expensive Firestore operation in this app is **snapshot listeners** (`collectionData`), because they bill reads on every attach AND on every document change across all active listeners.

---

## Current Baseline (Before Fixes)

### daily_sales collection
- ~30 docs per month (one per day)
- `getMonthlySalesReport()` uses `collectionData()` — a live snapshot listener
- On attach: reads ~30 docs (the current month)
- On each sale/void: reads 1 doc (the changed daily_sales doc)

### Active listeners per user session
Based on the codebase grep, a typical logged-in session has these `collectionData`/`docData` listeners:
- `settings/general` (1 doc) — SettingsService
- `system/settings` (1 doc) — AuthService emergency logout
- `users/{uid}` (1 doc) — AuthService profile
- `products` (up to 100 docs) — StoreService
- `daily_sales` for current month (~30 docs) — via getMonthlySalesReport
- `shifts` (variable) — CashRegisterService
- `transactions` (up to 50 docs) — if viewing transaction history

Estimated baseline per session start: ~180-210 doc reads on cold start.

### Concurrent users
This is a single-gym management app (Epicenter Gym). Realistic concurrent users: 2-5 staff at any time. Not a high-scale scenario.

---

## Fix-by-Fix Billing Analysis

### BUG 2 Fix — Timezone: Replace `toISOString()` with local date strings

**Write path changes (checkout/void):**
- `checkout()`: Changes `toISOString().split('T')[0]` to `toLocalDateStr()` for the daily_sales doc ID. Same number of writes (1 `set` with merge). **No billing change.**
- `voidTransaction()`: Same — changes the doc ID derivation. Same 1 `update`. **No billing change.**

**Read path changes (getMonthlySalesReport):**
- Changes the map key generation from `toISOString()` to local date. Same `collectionData()` query, same doc ID range filter. The query range `startId`/`endId` would shift slightly but still covers ~30 docs. **No billing change.**

**One-time migration (recalculateDailySales):**
- Reads ALL docs in `transactions` collection: `getDocs(this.transactionsCollection)`.
- Writes up to ~30 docs per month of history to `daily_sales`.

Cost estimate for migration:
- If the gym has 6 months of history with ~50 transactions/day = ~9,000 transaction reads.
- Writes ~180 daily_sales docs.
- **One-time cost: ~9,000 reads + ~180 writes ≈ $0.01.** Negligible.

**IMPORTANT CAVEAT:** The existing `recalculateDailySales()` also uses `toISOString().split('T')[0]` internally. If you fix the widget and checkout but forget to fix the migration utility, the migration will re-generate UTC-based keys, defeating the purpose. All four points (checkout, void, getMonthlySalesReport, recalculateDailySales) must be updated together.

**Billing verdict: SAFE. Zero ongoing cost increase. Negligible one-time migration cost.**

---

### BUG 10 Fix — Replace snapshot cache with `shareReplay(1)` observable cache

**Current behavior:**
- First caller to `getMonthlyReport()` creates a `collectionData()` listener (live). Costs ~30 reads on attach.
- `tap()` caches the data. Subsequent callers get `of(cachedData)` — zero Firestore reads.
- If the first caller's subscription is destroyed (navigation away), the listener detaches. Cache retains stale data. Next caller gets `of(staleData)` — zero reads but stale.

**Proposed behavior with `shareReplay(1)`:**
- First caller creates the `collectionData()` listener. Costs ~30 reads on attach.
- `shareReplay(1)` keeps the observable hot as long as there's at least one subscriber. New subscribers get the last emitted value (no extra read) AND receive future updates.
- When ALL subscribers unsubscribe, `shareReplay(1)` with default `refCount` behavior: the source observable completes/unsubscribes. The cached observable in the Map still holds the last value. Next subscriber re-triggers the `collectionData()` listener — another ~30 reads.

**Critical detail:** `shareReplay(1)` without `{ refCount: true }` keeps the subscription alive FOREVER even after all subscribers leave. This means the Firestore listener stays open permanently, billing 1 read per changed doc indefinitely.

With `{ refCount: true }`, the listener detaches when all subscribers leave, and re-attaches (re-reading ~30 docs) when a new subscriber arrives.

**For this app's usage pattern:**
- The widget is in `app.html` — it NEVER unsubscribes. It's always alive.
- So `shareReplay(1)` (with or without refCount) keeps exactly 1 Firestore listener open for the current month's daily_sales.
- The Monthly Sales Report page, when opened, shares the same listener — no extra reads.
- When the Monthly Sales Report page is closed, the widget still holds the subscription — listener stays alive.

**Comparison to current behavior:**
- Current: 1 listener (from widget) + stale cache for other components = ~30 reads on start + 1 read per daily_sales change.
- Proposed: 1 shared listener = ~30 reads on start + 1 read per daily_sales change.
- **Identical billing.** The only difference is correctness (other components get live data instead of stale snapshots).

**Edge case — viewing a different month on the Monthly Sales Report page:**
- Current: `switchMap` creates a new `collectionData()` listener for the selected month. If cache exists, returns `of()` instead. When navigating months, each uncached month costs ~30 reads.
- Proposed: Each month gets its own cached observable in the Map. First view of a month costs ~30 reads. The observable stays in the Map. If the user navigates back to that month, `shareReplay(1)` replays the last value (0 reads) and re-attaches the listener if refCount dropped to 0.

**Risk: Observable leak for old months.** If a user browses 12 months of history, the Map accumulates 12 cached observables. Without `refCount: true`, that's 12 active Firestore listeners (~360 docs being watched). With `refCount: true`, listeners detach when the user navigates away, and only the current month's listener (held by the widget) stays alive.

**Billing verdict: SAFE with `{ refCount: true }`. Use `shareReplay({ bufferSize: 1, refCount: true })` to prevent listener leaks. Ongoing cost is identical to current baseline.**

---

### BUG 1 Fix — Resolved by BUG 10 fix

No additional Firestore operations. **No billing impact.**

---

### BUG 7 Fix — Add loading guard to template

Pure client-side change (template `*ngIf`). **No Firestore operations. Zero billing impact.**

---

### BUG 8 Fix — Date-change detection with `interval(60_000)`

**Proposed:** Poll every 60 seconds to check if the date has changed.

The `interval()` itself is client-side and costs nothing. The concern is what happens when a date change IS detected: the fix calls `getMonthlyReport(newYear, newMonth, true)` with `forceRefresh`.

- This creates a new `collectionData()` listener for the new month: ~30 reads.
- The old month's listener would be cleaned up (if using `shareReplay({ refCount: true })` and no other subscribers).
- This happens at most once per day (at midnight).

**Billing verdict: SAFE. Adds ~30 reads per day at midnight. Completely negligible.**

**However — the proposed implementation has a problem.** The dev analysis suggests re-assigning `this.report$` and notes "Re-wire the signal... (this is tricky with toSignal)". `toSignal()` subscribes once at creation and cannot be re-wired. The actual implementation would need a different approach (e.g., a `BehaviorSubject<Date>` driving a `switchMap`). But regardless of implementation approach, the Firestore cost is the same: 1 new listener attach per day.

---

### BUG 3 Fix — Add `status: 'COMPLETED'` to checkout

**Ongoing:** Adds one string field to each transaction write. Firestore bills per document write, not per field. **Zero additional cost.**

**One-time backfill migration:**
- Read all transactions where `status` is undefined: requires reading ALL transaction docs (Firestore can't query for "field does not exist" efficiently — you'd need to read all and filter client-side, or use a `where('status', '==', null)` which may not match `undefined`/missing fields depending on how Firestore handles it).
- Write `status: 'COMPLETED'` to each matching doc.

Cost estimate:
- 6 months × ~50 transactions/day × 180 days = ~9,000 reads + ~9,000 writes.
- **One-time cost: ~$0.02.** Negligible.

**Billing verdict: SAFE. Zero ongoing increase. Negligible migration cost.**

---

### BUG 5 Fix — Convert void from `writeBatch()` to `runTransaction()`

**Current void cost:**
- 1 `getDoc` (transaction doc) — 1 read
- N `getDoc` (product docs for stock) — N reads
- 1 `writeBatch` with: 1 transaction update + N product updates + N inventory logs + 1 daily_sales update + 1 shift update = ~(2N + 3) writes

**Proposed with `runTransaction()`:**
- Same reads inside the transaction (Firestore transactions bill reads the same as regular reads).
- Same writes.
- **Additional cost:** If the transaction retries due to contention, ALL reads inside it are re-billed. Firestore transactions retry up to 5 times by default.

For a void operation (rare — maybe 1-2 per week at a gym), even with retries:
- Worst case: 5 retries × (1 + N) reads where N = number of unique products in the voided transaction (typically 1-3).
- Extra cost per contended void: ~15 reads = $0.000009. Literally nothing.

**But there's a structural concern.** The current void also calls `cashRegisterService.getVoidTransactionShiftUpdates()` which does its own async reads BEFORE the batch. Moving everything into `runTransaction()` means those reads must happen INSIDE the transaction callback. Firestore transactions require all reads to happen before any writes. The shift lookup reads would need to be restructured.

This is an implementation complexity concern, not a billing concern.

**Billing verdict: SAFE. Marginally more reads on contention retries, but voids are rare. Cost difference is effectively zero.**

---

## Summary

| Fix | Ongoing Cost Change | One-Time Migration Cost | Verdict |
|-----|---------------------|------------------------|---------|
| BUG 2 — Timezone | None | ~$0.01 (9K reads + 180 writes) | SAFE |
| BUG 10 — shareReplay cache | None (same listener count) | None | SAFE (use refCount: true) |
| BUG 1 — Stale cache | None (resolved by BUG 10) | None | SAFE |
| BUG 7 — Loading guard | None (client-side only) | None | SAFE |
| BUG 8 — Midnight refresh | +30 reads/day at midnight | None | SAFE |
| BUG 3 — Status field | None | ~$0.02 (9K reads + 9K writes) | SAFE |
| BUG 5 — runTransaction | Negligible (retry reads on rare voids) | None | SAFE |

**Total ongoing cost increase across ALL fixes: ~30 Firestore reads per day (from BUG 8 midnight refresh).**

At Firestore pricing ($0.06/100K reads), that's $0.00002/day or $0.0005/month. Essentially free.

---

## Recommendations

1. All proposed fixes are billing-safe. None introduce listener multiplication, polling-based reads, or write amplification.

2. For BUG 10, use `shareReplay({ bufferSize: 1, refCount: true })` — not bare `shareReplay(1)`. Without `refCount`, browsing historical months accumulates orphaned listeners that bill reads on every daily_sales change across all watched months.

3. For BUG 2 migration, run `recalculateDailySales()` once after deploying the timezone fix. Make sure the migration utility itself is also updated to use local date strings before running it. The existing utility uses `toISOString()` which would regenerate the same broken UTC keys.

4. For BUG 3 backfill, use a Cloud Function or admin script rather than client-side code. Firestore's `where('status', '==', null)` may not match documents where the field is entirely missing (it depends on whether the field was explicitly set to `null` vs never written). A full collection scan with client-side filtering is safer but reads all docs. For ~9K docs this is fine.

5. For BUG 5, be aware that `runTransaction()` requires all reads before writes. The current code's async shift lookup (`getVoidTransactionShiftUpdates`) would need to be inlined into the transaction callback. This is a code structure change, not a billing concern.
