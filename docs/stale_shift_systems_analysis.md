# Stale Shift Protection — Systems Analysis Report

**Role:** Senior Angular Developer / Senior Systems Analyst
**Date:** 2026-04-11
**Scope:** Full trace of all modified files, their trigger conditions, error paths, goal achievement, and breaking change risk.

---

## 1. Architecture Overview

The protection is built as a **layered defense**:

```
[UI Layer] → pre-flight isShiftOpen() check (synchronous)
[UI Layer] → ensureValidShiftForTransaction() call (async, before action)
[Service Layer] → ensureValidShiftForTransaction() called internally (nested, inside addCashTransaction / checkout)
[Service Layer] → throws STALE_SHIFT error
[UI Layer] → catch block silences snackbar, lets Modal take priority
```

This dual-layer design means the protection is enforced at **both the UI and service levels**, making it nearly impossible to bypass accidentally.

---

## 2. File-by-File Trace

---

### FILE 1: `cash-register.service.ts` — `ensureValidShiftForTransaction()`

```
Triggered by: addCashTransaction(), checkout() in StoreService, pos.ts checkout(), check-in-kiosk.ts confirmCheckIn()
```

#### Flow A — Shift is null or CLOSED

```
shift === null || shift.status !== 'OPEN'
  → returns false (does NOT throw, does NOT open modal)
```

**Effect downstream:**
- In `addCashTransaction()`: `!valid` → throws `new Error('SILENT')`
- In `StoreService.checkout()`: `!valid` → throws `new Error('Transaction blocked: Register is closed...')`
- In `pos.ts checkout()`: `!valid` → silently returns (no throw, no snackbar)
- In `check-in-kiosk.ts`: `!valid` → silently returns

> ⚠️ **Inconsistency Found (Non-Breaking):** When the shift is null/closed, the validator returns `false` instead of throwing. Each caller handles `false` differently:
> - `pos.ts`: returns silently — fine, because the UI already has `isShiftOpen$` banners
> - `check-in-kiosk.ts`: returns silently — fine, same reason
> - `StoreService.checkout()`: throws its own generic error — this can produce a snackbar in the kiosk if a payment path is reached
> - `addCashTransaction()`: throws `SILENT` — which the Cash Management UI now correctly silences
>
> **Verdict:** Not a breaking change. Behavior is intentional per the existing "Register closed" banner logic.

---

#### Flow B — Shift is OPEN but date is yesterday (THE STALE CASE)

```
shiftDate ('en-CA') !== today ('en-CA')
  → opens StaleShiftDialog (disableClose: true, width: 450px)
  → throws new Error('STALE_SHIFT')
```

**Effect downstream:** All callers receive `STALE_SHIFT`. See Section 3 for each caller's handling.

---

#### Flow C — Shift is OPEN and date matches today (NORMAL OPERATION)

```
shiftDate === today
  → returns true
```

All callers proceed normally. No interference.

---

### FILE 2: `cash-register.service.ts` — `addCashTransaction()`

**Called by:** `addExpense()`, `addFloatIn()`, `addFloatOut()`
**All three are called exclusively from:** `cash-management.ts submitTransaction()`

```
Step 1: ensureValidShiftForTransaction()
  → Stale?   throws STALE_SHIFT → propagates up to addExpense/FloatIn/FloatOut → propagates to submitTransaction()
  → Closed?  returns false → addCashTransaction throws SILENT → propagates to submitTransaction()
  → Valid?   continues

Step 2: re-check shift is open (line 170-173)
  → This is a defensive double-check AFTER the validator
  → Only triggers if somehow state changed between the validator call and execution (race condition guard)
  → Throws: 'No open shift. Please open a shift first.'
  → This error is NOT suppressed in cash-management.ts catch block
```

> ✅ **Goal Achieved:** Stale and closed shifts are blocked before any Firestore write.
>
> ⚠️ **Edge Case on Line 170-173 (Non-Breaking):** If the shift closes between the validator and the second check (extreme race condition), error message `'No open shift. Please open a shift first.'` will surface as a snackbar. This is acceptable behavior (it's correct and informative).

---

### FILE 3: `store.service.ts` — `checkout()`

**Called by:**
1. `pos.ts` — standard POS sale
2. `check-in-kiosk.ts` line 291 — subscription payment ("pay-and-check-in" flow)
3. `check-in-kiosk.ts` line 340 — walk-in fee payment

```
Step 1: ensureValidShiftForTransaction() 
  → Stale?  throws STALE_SHIFT → propagates to caller
  → Closed? returns false → throws 'Transaction blocked: Register is closed...'
  → Valid?  continues

Step 2: rest of checkout (batch write, stock deduct, shift update) — zero Firestore writes happen if Step 1 throws.
```

> ✅ **Goal Achieved:** All three callers of `checkout()` are protected atomically at the service level.
>
> ✅ **Data Integrity Confirmed:** Because the throw happens BEFORE `batch.commit()`, no partial writes occur. The database remains clean.

---

### FILE 4: `pos.ts` — `checkout()`

```
Step 1 (Line 185): isShiftOpen() synchronous check → early exit with snackbar if register is closed
Step 2 (Line 190): ensureValidShiftForTransaction() — async stale check
  → returns false → returns silently (line 191: if (!valid) return)
  → throws STALE_SHIFT → caught at line 231

Step 3 (Line 230-233): catch block
  if (error.message === 'STALE_SHIFT') return;   ← correct suppression
  else → shows generic snackbar
```

> ✅ **No double-modal or double-snackbar.** When stale: Modal appears, catch block silences, no snackbar.
>
> ⚠️ **Potential Redundant Validator Call:** `pos.ts` calls `ensureValidShiftForTransaction()` TWICE: once directly at line 190, and once indirectly via `StoreService.checkout()` at line 214. If the first call passes (shift is valid) but somehow the shift becomes stale between line 190 and line 214 (extremely unlikely in practice), the second check in the service would catch it and throw. Since `pos.ts` has the `STALE_SHIFT` catch, the second throw would still be handled correctly with no user-visible issue.
>
> **Verdict:** Redundant but harmless. Does not cause any broken behavior.

---

### FILE 5: `check-in-kiosk.ts` — `confirmCheckIn()`

```
Step 1 (Line 204): isShiftOpen() synchronous check → early exit with snackbar if closed
Step 2 (Line 209): ensureValidShiftForTransaction()
  → false (closed) → returns silently
  → throws STALE_SHIFT → modal opens, falls into try block's catch

Step 3 (Line 358-363): catch block
  if (error.message === 'STALE_SHIFT') return;   ← correct suppression
  else → shows generic snackbar

```

**Critical path inside the try block that also calls `checkout()`:**
- Line 291 (subscription pay): `storeService.checkout()` is called AFTER the validator already passed at line 209
- Line 340 (walk-in pay): same pattern

> ✅ **Double-protection confirmed for payment paths:** The outer validator on line 209 catches stale state before ANY dialog is opened. If state were somehow stale mid-flow after line 209 (virtually impossible in the same synchronous tick), `StoreService.checkout()` has its own validator that would throw `STALE_SHIFT`, which again is caught and suppressed at line 359.
>
> ✅ **Non-payment check-in (active subscriber) is also blocked:** If staff checks in a member with an active subscription (no payment required), the validator on line 209 still runs first, stops the flow if stale. Good.

---

### FILE 6: `cash-management.ts` — `submitTransaction()`

```
Step 1 (Lines 61-68): UI validation (amount > 0, reason not empty) — no change here
Step 2 (Lines 75-85): calls addExpense / addFloatIn / addFloatOut
  → those call addCashTransaction()
    → addCashTransaction calls ensureValidShiftForTransaction()
      → Stale?  opens modal, throws STALE_SHIFT → propagates back up to submitTransaction catch
      → Closed? returns false → SILENT thrown → propagates back up to submitTransaction catch

Step 3 (Lines 88-91): catch block (MODIFIED)
  if (err.message === 'STALE_SHIFT' || err.message === 'SILENT') return;   ← NEW LINE
  else → shows generic snackbar
```

> ✅ **Goal Achieved:** The STALE_SHIFT modal fires cleanly. No duplicate snackbar on top.
> ✅ **SILENT case also correctly handled:** If the register is already closed (no shift), `addCashTransaction()` throws `SILENT`. Without this fix, it would have shown a confusing "undefined" or internal error snackbar. Now it silently returns — which is acceptable since the cash management page itself should already show a "register is closed" state via `currentShift$` observable binding.

---

## 3. Holistic Goal Achievement Check

| Entry Point | Stale Shift Blocked? | Firestore Write Prevented? | Modal Shown? | Snackbar Suppressed? |
|---|---|---|---|---|
| POS Sale | ✅ | ✅ | ✅ | ✅ |
| Check-In (Active Subscriber, no payment) | ✅ | ✅ | ✅ | ✅ |
| Check-In (Walk-in fee) | ✅ | ✅ | ✅ | ✅ |
| Check-In (Subscription pay-and-check-in) | ✅ | ✅ | ✅ | ✅ |
| Cash Management — Expense | ✅ | ✅ | ✅ | ✅ |
| Cash Management — Float In | ✅ | ✅ | ✅ | ✅ |
| Cash Management — Float Out | ✅ | ✅ | ✅ | ✅ |

**Overall Goal: ACHIEVED.**

---

## 4. Breaking Change Risk Assessment

| Risk | Severity | Assessment |
|---|---|---|
| Normal operation disrupted | ❌ None | Validator only activates when dates differ. Returns `true` for all normal same-day shifts. |
| Opening a new shift blocked | ❌ None | `openShift()` does NOT call `ensureValidShiftForTransaction()`. It is unaffected. |
| Closing a shift blocked | ❌ None | `closeShift()` does NOT call `ensureValidShiftForTransaction()`. Unaffected. |
| Recalculate totals blocked | ❌ None | `recalculateShiftTotals()` does NOT call the validator. Unaffected. |
| Void transaction blocked | ❌ None | `voidTransaction()` in `store.service.ts` does NOT call the validator. Voiding past transactions still works. |
| Double modal on stale state | ❌ None | `disableClose: true` ensures only one modal is shown. `MatDialog` handles stacking. |
| Race condition double-write | ❌ None | Throw exits before `batch.commit()`. No partial writes possible. |
| `SILENT` error leaking to user | ❌ None (fixed) | `cash-management.ts` now suppresses it. |
| `isShiftOpen()` vs `ensureValidShiftForTransaction()` mismatch | ⚠️ Low | `isShiftOpen()` uses in-memory BehaviorSubject. It will return `true` for a stale shift. This is fine — it is a synchronous "is a shift loaded?" check, not a date validator. The async validator is the true guard. |

---

## 5. One Identified Issue (Non-Critical, Cosmetic)

**Issue:** In `check-in-kiosk.ts`, the UI binds `[disabled]` to `(isShiftOpen$ | async) === false`. This means on a **stale shift**, the buttons are **NOT visually disabled** — they appear active because a shift IS open (just stale). The validator catches it on click, but the UI gives no upfront visual hint that something is wrong.

**Impact:** Low. Staff will click CHECK IN → modal appears → they are informed. No data is written. Purely a UX improvement opportunity, not a functional failure.

**Suggested future improvement:** Extend `isShiftOpen$` (or add a new `isShiftValid$` observable) that also checks the date, and bind the disabled state to that instead.

---

## 6. Conclusion

The implementation is **sound, functionally complete, and safe to ship.** There are no breaking changes. All financial entry points are protected. Data integrity is maintained because no Firestore writes can occur when the validator throws. The only open items are cosmetic UX improvements (stale shift UI indicator) that can be addressed in a future iteration.
