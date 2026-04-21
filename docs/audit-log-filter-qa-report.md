# Audit Log Filter — QA Bug Report

> Date: April 15, 2026
> Scope: Filter chip behavior in `/audit-log`
> Method: Code trace + test scenario generation

---

## Bug Trace: Why Filters Return Similar Results

### How the filter logic works (current code)

```
User clicks chip → toggleType(key) → selectedTypes Set updated → search() called
search() reads selectedTypes and decides which Firestore queries to fire
```

### Bug 1: "Expenses" chip does nothing (CRITICAL)

**Trace:**

The `expense` key is in `selectedTypes`, but the `search()` method has NO code block for expenses.

```typescript
// These exist:
if (types.has('sale') || types.has('void')) { ... }  // Transactions
if (types.has('checkin')) { ... }                      // Attendance
if (types.has('shift')) { ... }                        // Shifts

// This does NOT exist:
// if (types.has('expense')) { ... }  ← MISSING
```

Expenses are embedded inside shift `transactions[]` arrays as `CashTransaction` objects with `type: 'Expense'`. They're not in a separate collection. The current code shows shift open/close events but never extracts individual expense/float transactions from the shift's embedded array.

**Impact:** Toggling "Expenses" on/off has zero effect on results. The user sees the same data regardless.

**Fix:** When `types.has('expense')`, iterate through shift `transactions[]` and extract entries where `type === 'Expense'` or `type === 'Float_Out'`.

### Bug 2: "Sales" and "Voids" are coupled — can't show one without the other's query (MEDIUM)

**Trace:**

```typescript
if (types.has('sale') || types.has('void')) {
    // Fires ONE query that fetches ALL transactions (both COMPLETED and VOID)
    const transactions = await firstValueFrom(
        this.transactionService.getTransactions(txConstraints)
    );
    
    // Then filters client-side:
    transactions.forEach(tx => {
        if (tx.status === 'VOID' && types.has('void')) { ... }
        else if (tx.status !== 'VOID' && types.has('sale')) { ... }
    });
}
```

The Firestore query fires if EITHER `sale` OR `void` is selected. This means:
- Select only "Voids" → query fires, fetches 50 transactions, filters to show only VOIDs. **Works correctly** but wastes reads on non-VOID transactions.
- Select only "Sales" → query fires, fetches 50 transactions, filters to show only non-VOIDs. **Works correctly** but same waste.
- Deselect both → query doesn't fire. **Correct.**

This isn't a visible bug — the filtering works. But it's inefficient: if only "Voids" is selected, we still read 50 transactions to find the few that are VOID.

**Impact:** Low — correct behavior, slightly wasteful reads.

### Bug 3: "Shifts" chip shows shift open/close but NOT expenses within shifts (MEDIUM)

**Trace:**

When `types.has('shift')`:
```typescript
shifts.forEach(s => {
    allEvents.push({ type: 'shift_open', ... });  // Always added
    if (s.status === 'CLOSED') {
        allEvents.push({ type: 'shift_close', ... });  // Added if closed
    }
    // Individual transactions within the shift (expenses, floats, sales) are NEVER extracted
});
```

The shift chip shows when shifts opened and closed, but doesn't show the individual cash movements (expenses, float-in, float-out) that happened during the shift. These are in `s.transactions[]`.

**Impact:** The "Shifts" filter is incomplete — it shows the container but not the contents.

### Bug 4: Deselecting ALL chips still shows results from the previous search (LOW)

**Trace:**

When all chips are deselected, `selectedTypes` is an empty Set. The `search()` method:
```typescript
if (types.has('sale') || types.has('void')) { ... }  // false — skipped
if (types.has('checkin')) { ... }                      // false — skipped
if (types.has('shift')) { ... }                        // false — skipped
```

No queries fire. `allEvents` stays empty. `this.events.set(allEvents)` sets events to `[]`. **This actually works correctly** — the empty state shows. But the user might expect the previous results to remain visible with a "no filters selected" message instead.

**Impact:** Low — technically correct, but UX could be clearer.

### Bug 5: Staff filter doesn't apply to shifts (MEDIUM)

**Trace:**

```typescript
// Transactions: staff filter applied via Firestore query
if (staffFilter) txConstraints.staffId = staffFilter;

// Attendance: staff filter applied client-side
const filtered = staffFilter
    ? records.filter(r => r.checkedInBy?.uid === staffFilter)
    : records;

// Shifts: NO staff filter at all
const shifts = await firstValueFrom(
    this.cashRegisterService.getShiftHistory(20, start, end)
    // ← No staffFilter applied. Shows ALL shifts regardless of who opened/closed.
);
```

If the user selects a specific staff member AND the "Shifts" chip, they see ALL shifts — not just the ones opened/closed by that staff member.

**Impact:** Medium — misleading results when combining staff filter with shift events.

**Fix:** Filter shifts client-side: `shifts.filter(s => s.openedBy === staffName || s.closedBy === staffName)`.

---

## Test Scenarios

### TC-1: Sales only

**Steps:** Deselect all chips → Select only "Sales" → Search
**Expected:** Only sale events (green `point_of_sale` icon). No voids, no check-ins, no shifts.
**Current result:** ✅ Correct — the `else if (tx.status !== 'VOID' && types.has('sale'))` filter works.

### TC-2: Voids only

**Steps:** Deselect all chips → Select only "Voids" → Search
**Expected:** Only void events (orange `remove_circle` icon).
**Current result:** ✅ Correct — but the query fetches all 50 transactions to find the few VOIDs.

### TC-3: Check-ins only

**Steps:** Deselect all chips → Select only "Check-ins" → Search
**Expected:** Only check-in events (blue `how_to_reg` icon).
**Current result:** ✅ Correct — separate query path.

### TC-4: Shifts only

**Steps:** Deselect all chips → Select only "Shifts" → Search
**Expected:** Only shift open/close events.
**Current result:** ⚠️ Partial — shows shift open/close but NOT individual expenses/floats within shifts.

### TC-5: Expenses only

**Steps:** Deselect all chips → Select only "Expenses" → Search
**Expected:** Only expense events.
**Current result:** ❌ BUG — shows NOTHING. No code handles the `expense` type.

### TC-6: All chips selected (default)

**Steps:** All chips active → Search
**Expected:** All event types merged and sorted by time.
**Current result:** ⚠️ Partial — shows sales, voids, check-ins, shift open/close. Missing expenses.

### TC-7: Staff filter + Shifts

**Steps:** Select a specific staff → Select only "Shifts" → Search
**Expected:** Only shifts opened/closed by that staff member.
**Current result:** ❌ BUG — shows ALL shifts regardless of staff filter.

### TC-8: Staff filter + Check-ins

**Steps:** Select a specific staff → Select only "Check-ins" → Search
**Expected:** Only check-ins performed by that staff.
**Current result:** ✅ Correct — client-side filter on `checkedInBy.uid`.

### TC-9: Staff filter + Sales

**Steps:** Select a specific staff → Select only "Sales" → Search
**Expected:** Only sales by that staff.
**Current result:** ✅ Correct — Firestore query includes `staffId`.

### TC-10: No chips selected

**Steps:** Deselect all chips → Search
**Expected:** Empty state or "Select at least one event type" message.
**Current result:** ✅ Shows empty state — acceptable.

### TC-11: Date range spanning multiple days

**Steps:** Set start = 3 days ago, end = today → All chips → Search
**Expected:** Events from all 3 days, sorted newest first.
**Current result:** ✅ Correct — date range applied to all queries.

### TC-12: Toggle chip rapidly

**Steps:** Click "Sales" chip 5 times rapidly
**Expected:** Each click toggles and triggers search. Final state should be consistent.
**Current result:** ⚠️ Potential race condition — 5 concurrent `search()` calls. The last one wins but intermediate results may flash briefly.

---

## Summary of Bugs

| # | Bug | Severity | Fix Effort |
|---|-----|----------|-----------|
| 1 | "Expenses" chip does nothing — no code handles it | CRITICAL | Medium — extract from shift `transactions[]` |
| 2 | Staff filter not applied to shifts | MEDIUM | Low — add client-side filter |
| 3 | Shifts don't show individual cash movements (expenses, floats) | MEDIUM | Medium — iterate `s.transactions[]` |
| 4 | Rapid chip toggling causes race conditions | LOW | Low — add debounce or cancel previous search |
| 5 | Sales/Voids query is coupled (minor inefficiency) | LOW | Won't fix — correct behavior, minor waste |

---

## Recommended Fix Plan

### Fix 1+3 combined: Extract expenses and cash movements from shifts

When `types.has('expense')` OR `types.has('shift')`, fetch shifts and iterate their `transactions[]` array:

```typescript
if (types.has('shift') || types.has('expense')) {
    const shifts = await firstValueFrom(
        this.cashRegisterService.getShiftHistory(20, start, end)
    );

    // Apply staff filter to shifts
    const filteredShifts = staffFilter
        ? shifts.filter(s => s.openedBy === staffName || s.closedBy === staffName)
        : shifts;

    filteredShifts.forEach(s => {
        // Shift open/close events (only if 'shift' type selected)
        if (types.has('shift')) {
            allEvents.push({ type: 'shift_open', ... });
            if (s.status === 'CLOSED') allEvents.push({ type: 'shift_close', ... });
        }

        // Individual cash movements (only if 'expense' type selected)
        if (types.has('expense') && s.transactions) {
            s.transactions
                .filter(t => t.type === 'Expense' || t.type === 'Float_Out' || t.type === 'Float_In')
                .filter(t => !(t as any).voided)
                .forEach(t => {
                    allEvents.push({
                        type: 'expense',
                        icon: t.type === 'Expense' ? 'money_off' : t.type === 'Float_In' ? 'add_circle' : 'remove_circle',
                        color: 'warn',
                        title: `${t.type.replace('_', ' ')} — ₱${t.amount.toFixed(2)}`,
                        detail: t.reason || 'No reason',
                        performer: t.performedBy || 'Unknown',
                        timestamp: safeToDate(t.timestamp),
                        amount: t.amount,
                    });
                });
        }
    });
}
```

### Fix 2: Staff filter on shifts

Add staff name resolution and client-side filter (shown above in Fix 1+3).

### Fix 4: Debounce rapid toggling

Add a simple guard:
```typescript
private searchInProgress = false;

async search(): Promise<void> {
    if (this.searchInProgress) return;
    this.searchInProgress = true;
    // ... existing logic ...
    this.searchInProgress = false;
}
```
