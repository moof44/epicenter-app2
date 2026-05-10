# Sales By User — Bug Analysis & QA Attack Report

> Date: April 27, 2026
> Scope: Investigate inconsistent sales totals between mobile and desktop in "View Sales By User"
> Severity: HIGH — financial data integrity
> Role: Senior Angular Developer + QA Specialist

---

## 1. Logic & Formula Analysis

### 1.1 How "Sales By User" Total is Computed

The data flows through this chain:

```
SalesByUserComponent
  → ReportStateService.getUserSalesReport(userId, date)
    → TransactionService.getTransactions({ staffId, startDate, endDate, limit: 100 })
      → Firestore query: transactions WHERE staffId == userId AND date >= startDate AND date <= endDate ORDER BY date DESC LIMIT 100
    → Client-side filter: exclude status === 'VOID'
    → Client-side reduce: sum of totalAmount
    → Cache via shareReplay({ bufferSize: 1, refCount: true })
  → Display: totalSales() signal shows the reduced total
```

### 1.2 The Formula

```typescript
// ReportStateService.getUserSalesReport() — lines 63-75
const transactions = txs
    .filter(tx => tx.status !== 'VOID')    // Step 1: Exclude voided
    .map(tx => ({                           // Step 2: Convert dates
        ...tx,
        date: tx.date instanceof Date ? tx.date : (tx.date as any).toDate()
    }));
const total = transactions.reduce((sum, tx) => sum + tx.totalAmount, 0);  // Step 3: Sum
```

### 1.3 Date Range Construction

```typescript
// ReportStateService.getUserSalesReport() — lines 55-56
const startDate = new Date(year, month, 1);                    // First day of month, 00:00:00 LOCAL
const endDate = new Date(year, month + 1, 0, 23, 59, 59);     // Last day of month, 23:59:59 LOCAL
```

### 1.4 The Firestore Query

```typescript
// TransactionService.getTransactions() — lines 53-57
queryConstraints.push(where('date', '>=', constraints.startDate));
queryConstraints.push(where('date', '<=', constraints.endDate));
queryConstraints.push(where('staffId', '==', constraints.staffId));
queryConstraints.push(limit(100));  // HARD LIMIT
```

### 1.5 Comparison: TodaysSalesWidget Uses a Different Path

The dashboard "Today's Sales" widget uses `TransactionService.getSalesTotal()` which calls `getAggregateFromServer(sum('totalAmount'))`. This is a **server-side aggregation** with NO limit. It produces a different number than the client-side `reduce()` in `getUserSalesReport()` if:

- There are more than 100 transactions (limit truncation)
- VOID transactions are included in the aggregate (no status filter on `getSalesTotal`)

---

## 2. Bugs Found — QA Attack Results

### BUG #1: LIMIT 100 Truncates High-Volume Staff Sales [CRITICAL]

**Location**: `ReportStateService.getUserSalesReport()` line 62

**The problem**: The query fetches at most 100 transactions per staff member per month. If a staff member processes more than 100 sales in a month (very possible for a busy front-desk staff doing 5-10 sales per day × 30 days = 150-300 transactions), the total shown is **incomplete**.

**Attack scenario**:
- Staff member "Juan" has 150 transactions in April
- The query returns only the 100 most recent (ordered by date DESC)
- The displayed total is the sum of those 100, missing the first 50 transactions of the month
- On mobile, if the user navigated to this page earlier (cached), they might see a different subset than desktop loading fresh

**Impact**: The total shown is WRONG. It's lower than the actual total. The discrepancy grows as the staff member processes more sales.

**Business rules violation**: Section 1.4 states "The server-side aggregation (`getAggregateFromServer`) is the authoritative total." But `getUserSalesReport()` doesn't use `getAggregateFromServer` — it uses client-side `reduce()` on a limited query.

---

### BUG #2: getSalesTotal() Does NOT Exclude VOID Transactions [CRITICAL]

**Location**: `TransactionService.getSalesTotal()` lines 87-97

**The problem**: The `getSalesTotal()` method (used by the TodaysSalesWidget) queries with `getAggregateFromServer(sum('totalAmount'))` but does NOT add `where('status', '==', 'COMPLETED')`. This means VOID transactions are included in the server-side aggregate.

```typescript
async getSalesTotal(constraints: { startDate?: Date; endDate?: Date; staffId?: string; }): Promise<number> {
    const queryConstraints: any[] = [];
    if (constraints.startDate) queryConstraints.push(where('date', '>=', constraints.startDate));
    if (constraints.endDate) queryConstraints.push(where('date', '<=', constraints.endDate));
    if (constraints.staffId) queryConstraints.push(where('staffId', '==', constraints.staffId));
    // ❌ NO where('status', '==', 'COMPLETED') — VOID transactions are INCLUDED
    const q = query(this.transactionsCollection, ...queryConstraints);
    const snapshot = await getAggregateFromServer(q, { totalSales: sum('totalAmount') });
    return snapshot.data().totalSales;
}
```

**Attack scenario**:
- Staff "Juan" has ₱10,000 in sales today
- One ₱500 transaction is voided
- `getSalesTotal()` returns ₱10,000 (includes the voided ₱500)
- `getUserSalesReport()` returns ₱9,500 (correctly excludes VOID via client-side filter)
- The dashboard widget shows ₱10,000, the Sales By User page shows ₱9,500
- **Two different numbers for the same staff member on the same day**

**Business rules violation**: Section 1.4 explicitly states this is a "known gap" and recommends adding `where('status', '==', 'COMPLETED')`.

---

### BUG #3: Cache Staleness Between Devices [HIGH]

**Location**: `ReportStateService.userSalesObservableCache` (Map)

**The problem**: The cache uses `shareReplay({ bufferSize: 1, refCount: true })`. Once a value is cached for a key like `2026-3-userId123`, it's served to all subscribers without re-querying Firestore. The cache is NEVER invalidated except:
- On logout (`clearCache()`)
- Manually via `invalidateUserSalesReport()` — but nothing calls this automatically

**Attack scenario**:
1. Staff opens "Sales By User" on desktop at 10:00 AM → sees ₱5,000 (cached)
2. Staff processes 3 more sales between 10:00-11:00 AM
3. Staff opens "Sales By User" on mobile at 11:00 AM → sees ₱5,000 (same cache? NO — different device, different app instance, fresh query → sees ₱6,500)
4. Staff goes back to desktop → still sees ₱5,000 (stale cache from step 1)
5. **Desktop shows ₱5,000, mobile shows ₱6,500 for the same user/month**

**Why this happens**: The cache is in-memory per browser tab. Different devices have different cache states. The cache is never invalidated after new transactions are created.

**Note**: `refCount: true` means the cache is cleared when all subscribers unsubscribe. If the user navigates away from the page and back, the Observable completes and the cache entry is removed. But if they stay on the page (or the component stays alive in the DOM), the stale value persists.

---

### BUG #4: Real-Time Listener Returns Inconsistent Snapshots [MEDIUM]

**Location**: `TransactionService.getTransactions()` — uses `collectionData()` (real-time listener)

**The problem**: `getTransactions()` returns a real-time Observable via `collectionData()`. In `getUserSalesReport()`, this is consumed with `firstValueFrom(transactions$.pipe(take(1)))` — it takes the FIRST emission and completes. But `collectionData()` can emit multiple times:

1. First emission: from local cache (Firestore offline persistence)
2. Second emission: from server (fresh data)

If the local cache is stale (e.g., a transaction was voided on another device), the first emission includes the voided transaction. `take(1)` grabs this stale emission. The correct server data arrives in the second emission but is ignored.

**Attack scenario**:
1. Desktop voids a transaction at 10:00 AM
2. Mobile opens "Sales By User" at 10:01 AM
3. Mobile's Firestore local cache still has the old data (not yet synced)
4. `firstValueFrom(take(1))` grabs the stale cache emission
5. Mobile shows the voided transaction as still active
6. **Mobile shows a higher total than desktop**

**This is likely the exact bug you observed.** Firestore's offline persistence means the first emission from `collectionData()` comes from the local cache, which may be stale on one device but fresh on another.

---

### BUG #5: Date Range Boundary — Transactions at Exactly Midnight [LOW]

**Location**: `ReportStateService.getUserSalesReport()` lines 55-56

**The problem**: The end date is `new Date(year, month + 1, 0, 23, 59, 59)`. This is 23:59:59 on the last day of the month. A transaction created at exactly 23:59:59.500 (with milliseconds) would be EXCLUDED because `<=` comparison on Timestamps is millisecond-precise.

**Attack scenario**: A checkout happens at 11:59:59 PM on April 30. The transaction timestamp is `2026-04-30T23:59:59.123Z`. The end date boundary is `2026-04-30T23:59:59.000Z`. The transaction is excluded from April's report.

**Impact**: Extremely rare (requires a transaction at the exact last second of the month) but technically possible. The fix is to use `new Date(year, month + 1, 0, 23, 59, 59, 999)` or better, use the start of the next month as an exclusive upper bound.

---

### BUG #6: getTransactions() Uses collectionData (Real-Time) for a One-Time Report [MEDIUM]

**Location**: `TransactionService.getTransactions()` line 80

**The problem**: `getTransactions()` returns `collectionData(q)` which is a real-time listener. But `getUserSalesReport()` only needs a one-time snapshot. Using a real-time listener for a one-time read:
- Keeps the listener alive until the Observable is unsubscribed
- Returns from local cache first (potentially stale — see Bug #4)
- Costs more in Firestore billing (snapshot listeners are charged per document per emission)

**Impact**: Not a correctness bug per se, but it contributes to Bug #4 (stale cache emissions) and wastes Firestore reads.

---

## 3. Root Cause of Mobile vs Desktop Inconsistency

Based on the analysis, the most likely cause of your specific bug (different amounts on mobile vs desktop) is a combination of:

**Primary cause: BUG #3 + BUG #4 (Cache staleness + stale local cache emission)**

1. Desktop loaded the report earlier → cached value in memory
2. New transactions were processed after the desktop load
3. Mobile loaded the report fresh → got the updated data
4. Desktop still shows the old cached value

OR:

1. A transaction was voided on one device
2. The other device's Firestore local cache hasn't synced yet
3. `firstValueFrom(take(1))` grabs the stale local cache emission on the un-synced device
4. Different totals displayed

**Secondary cause: BUG #1 (Limit truncation)**

If the staff member has more than 100 transactions in the month, different devices may receive different subsets depending on when they query (new transactions shift which 100 are returned).

---

## 4. Recommended Solutions

### Fix #1: Use `getDocs` Instead of `collectionData` for Reports [CRITICAL]

**Problem solved**: Bug #4 (stale local cache), Bug #6 (unnecessary real-time listener)

**Change**: In `TransactionService`, add a new method `getTransactionsOnce()` that uses `getDocs()` instead of `collectionData()`. Use this for all report queries.

```typescript
async getTransactionsOnce(constraints: { ... }): Promise<Transaction[]> {
    // Same query construction as getTransactions()
    // But uses getDocs() instead of collectionData()
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
}
```

**Why**: `getDocs()` always fetches from the server (or returns a consistent local cache snapshot). It doesn't have the "first emission is stale cache, second is fresh" problem that `collectionData()` has.

**Steering compliance**: `business-rules.md` Section 1.4 says the server-side aggregation is authoritative. Using `getDocs` ensures we get server-fresh data.

---

### Fix #2: Use Server-Side Aggregation for the Total [CRITICAL]

**Problem solved**: Bug #1 (limit truncation), Bug #2 (VOID inclusion in aggregate)

**Change**: The total displayed in "Sales By User" should come from `getSalesTotal()` (server-side `getAggregateFromServer`), NOT from client-side `reduce()`. Fix `getSalesTotal()` to exclude VOID transactions.

```typescript
async getSalesTotal(constraints: { ... }): Promise<number> {
    const queryConstraints: any[] = [];
    // ... existing date/staffId filters ...
    queryConstraints.push(where('status', '==', 'COMPLETED'));  // ← ADD THIS
    const q = query(this.transactionsCollection, ...queryConstraints);
    const snapshot = await getAggregateFromServer(q, { totalSales: sum('totalAmount') });
    return snapshot.data().totalSales;
}
```

Then in `getUserSalesReport()`, use `getSalesTotal()` for the total instead of `reduce()`:

```typescript
const [txs, total] = await Promise.all([
    getTransactionsOnce({ staffId, startDate, endDate, limit: 200 }),  // For display list
    getSalesTotal({ staffId, startDate, endDate })                      // For authoritative total
]);
const transactions = txs.filter(tx => tx.status !== 'VOID');
// total comes from server aggregate — NOT from reduce()
```

**Why**: The server-side aggregate has NO limit. It sums ALL matching transactions regardless of how many there are. It's the single source of truth for the total.

**Steering compliance**: `business-rules.md` Section 1.4 explicitly states "The server-side aggregation is the authoritative total."

---

### Fix #3: Remove or Increase the Limit [HIGH]

**Problem solved**: Bug #1 (limit truncation)

**Change**: For the transaction LIST display (not the total), either:
- Remove the limit entirely for staff sales queries (acceptable for monthly reports — max ~300 transactions per staff per month)
- Increase to 500 (covers even the busiest staff)
- Implement pagination (load more on scroll)

**Recommendation**: Increase to 500 for now. A staff member doing 500+ transactions in a month is unrealistic for a gym. If it ever happens, the total is still correct (from server aggregate) — only the list display would be truncated.

---

### Fix #4: Invalidate Cache After Mutations [HIGH]

**Problem solved**: Bug #3 (cache staleness)

**Change**: After `CheckoutService.checkout()` and `TransactionService.voidTransaction()` complete, call `ReportStateService.invalidateUserSalesReport()` for the affected staff member and date.

```typescript
// In CheckoutService.checkout(), after batch.commit():
this.reportStateService.invalidateUserSalesReport(staff.uid, new Date());

// In TransactionService.voidTransaction(), after batch.commit():
this.reportStateService.invalidateUserSalesReport(txData.staffId, txData.date);
```

**Why**: This ensures that the next time anyone views the sales report, they get fresh data instead of a stale cached value.

**Alternative**: Remove the cache entirely. The query is fast (one Firestore read of ~50-200 docs). Caching saves one read per page revisit but introduces staleness. For financial data, freshness is more important than saving one read.

---

### Fix #5: Fix End-of-Month Boundary [LOW]

**Problem solved**: Bug #5 (midnight boundary)

**Change**: Use the start of the next month as an exclusive upper bound instead of 23:59:59 on the last day:

```typescript
const startDate = new Date(year, month, 1);           // First day, 00:00:00.000
const endDate = new Date(year, month + 1, 1);         // First day of NEXT month, 00:00:00.000
// Query: date >= startDate AND date < endDate (use '<' not '<=')
```

Or keep `<=` but set milliseconds to 999:
```typescript
const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
```

---

## 5. Priority & Implementation Order

| Priority | Fix | Impact | Effort | Risk |
| --- | --- | --- | --- | --- |
| 1 | Fix #2: Add `status == COMPLETED` to `getSalesTotal()` | Fixes VOID inclusion in aggregates across the entire app | 1 line change | Zero risk — additive filter |
| 2 | Fix #1: Add `getTransactionsOnce()` using `getDocs` | Fixes stale cache emissions for all report queries | New method + update callers | Low risk — new method, existing callers opt-in |
| 3 | Fix #2b: Use server aggregate for total in `getUserSalesReport()` | Fixes limit truncation for the displayed total | Refactor getUserSalesReport | Medium risk — changes the data flow |
| 4 | Fix #4: Invalidate cache after mutations | Fixes cross-device staleness | 2 lines in checkout + void | Low risk — additive |
| 5 | Fix #3: Increase limit to 500 | Fixes list truncation for high-volume staff | 1 line change | Zero risk |
| 6 | Fix #5: Fix end-of-month boundary | Fixes edge case at midnight | 1 line change | Zero risk |

---

## 6. Verification Plan

After implementing fixes, verify with these test cases:

| # | Test Case | Expected Result |
| --- | --- | --- |
| 1 | Staff with 150+ transactions in a month | Total matches server aggregate (not truncated at 100) |
| 2 | Void a transaction, then view Sales By User | Voided transaction excluded from total on both devices |
| 3 | Open Sales By User on desktop, process a sale, open on mobile | Both show the same updated total |
| 4 | Open Sales By User on mobile, void a transaction on desktop, refresh mobile | Mobile shows updated (lower) total |
| 5 | Transaction at 11:59 PM on last day of month | Included in that month's report |
| 6 | Compare TodaysSalesWidget total with Sales By User filtered to today | Numbers match exactly |
| 7 | Staff with zero sales in a month | Shows ₱0.00, not an error |
| 8 | Staff with only VOID transactions in a month | Shows ₱0.00 (all excluded) |
