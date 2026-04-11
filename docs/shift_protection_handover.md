# Handover: Stale Shift Protection — Remaining Work

> **Status as of 2026-04-11**
> This document was generated after a full audit of all relevant files. Items marked ✅ are confirmed complete in the codebase. Items marked ❌ are genuinely missing and must still be implemented.

---

## Overview
The goal is to prevent staff from recording financial transactions (POS sales, Expenses, Float In/Out, Attendance payments) against a "stale" shift — i.e., a shift left open from a previous calendar day.

---

## Confirmed Complete ✅

### 1. `StaleShiftDialog` Component
**Files:**
- `src/app/shared/components/stale-shift-dialog/stale-shift-dialog.ts`
- `src/app/shared/components/stale-shift-dialog/stale-shift-dialog.html`
- `src/app/shared/components/stale-shift-dialog/stale-shift-dialog.css`

**Confirmed:** All three files exist and are fully implemented. The dialog:
- Accepts `{ shiftDate: string }` as `MAT_DIALOG_DATA`
- Displays the stale shift date to the user with a warning icon
- Shows an instruction to go close the shift and open a new one
- Has an "Acknowledge & Close" button that dismisses the dialog
- Uses `disableClose: true` when opened (can't close by clicking outside)

---

### 2. Core Validator Method
**File:** `src/app/core/services/cash-register.service.ts`

**Method:** `ensureValidShiftForTransaction()` — Lines 48–70

**Confirmed:** Fully implemented. It:
- Gets the current shift from `BehaviorSubject`
- Compares `shift.startTime.toDate().toLocaleDateString('en-CA')` vs `new Date().toLocaleDateString('en-CA')`
- If dates don't match, opens the `StaleShiftDialog` with `{ shiftDate }` and throws `new Error('STALE_SHIFT')`
- Returns `true` if the shift is valid

---

### 3. Validator Called in `addCashTransaction()`
**File:** `src/app/core/services/cash-register.service.ts` — Lines 164–168

**Confirmed:** `addCashTransaction()` calls `ensureValidShiftForTransaction()` at the top and throws `'SILENT'` if the shift is not open (null). This guards all Expense, Float In, and Float Out operations since they all route through `addCashTransaction()`.

> ⚠️ **Note:** When shift is null (not open), it throws `'SILENT'`. When shift is stale, the validator throws `'STALE_SHIFT'`. The Cash Management UI must handle **both** error strings correctly (see ❌ section below).

---

### 4. Validator Called in `StoreService.checkout()`
**File:** `src/app/core/services/store.service.ts` — Lines 200–205

**Confirmed:** `checkout()` calls `cashRegisterService.ensureValidShiftForTransaction()` at the very top. This blocks all POS sales and Attendance-triggered payments (walk-in, subscription update) since they all go through `StoreService.checkout()`.

---

### 5. STALE_SHIFT Suppression in `POS`
**File:** `src/app/features/store/components/pos/pos.ts` — Line 231

**Confirmed:**
```typescript
} catch (error: any) {
  if (error.message === 'STALE_SHIFT') return; // ✅ Already handled
  this.snackBar.open(error.message || 'Checkout failed', 'Close', { duration: 3000 });
}
```

---

### 6. STALE_SHIFT Suppression in Check-In Kiosk
**File:** `src/app/features/attendance/components/check-in-kiosk/check-in-kiosk.ts` — Line 359

**Confirmed:**
```typescript
} catch (error: any) {
  if (error.message === 'STALE_SHIFT') return; // ✅ Already handled
  this.snackBar.open(error.message, 'Close', { duration: 3000 });
}
```

---

## Remaining Work ❌

### 1. STALE_SHIFT Suppression in Cash Management
**File:** `src/app/features/store/components/cash-management/cash-management.ts`

**Problem:** The `submitTransaction()` method (which handles Expense, Float In, Float Out) has a generic catch block at **line 88–90**:

```typescript
} catch (err: any) {
  // ❌ NO STALE_SHIFT check — will show a generic snackbar
  // on top of the modal that the service already displayed!
  this.snackBar.open(err.message || 'Failed to record transaction', 'Close', { duration: 3000 });
}
```

**Fix Required:** Add a guard for `STALE_SHIFT` (and `SILENT`) before the generic snackbar:

```typescript
} catch (err: any) {
  // Suppress errors already handled by the StaleShiftDialog
  if (err.message === 'STALE_SHIFT' || err.message === 'SILENT') return;
  this.snackBar.open(err.message || 'Failed to record transaction', 'Close', { duration: 3000 });
}
```

**Exact location to edit:**
- File: `src/app/features/store/components/cash-management/cash-management.ts`
- Method: `submitTransaction()` — starting at line 60
- The catch block is at **lines 88–90**. Replace those 3 lines with the fix above.

---

## Verification Plan (After Fix)

To test without waiting for midnight:

1. **Open a Shift** via Cash Management.
2. **Date Hack:** In `CashRegisterService.ensureValidShiftForTransaction()` (line 57), temporarily change:
   ```typescript
   const today = new Date().toLocaleDateString('en-CA');
   ```
   to:
   ```typescript
   const today = '2099-01-01';
   ```
3. **Test POS:** Add a product to cart and checkout → `StaleShiftDialog` should appear. No snackbar should appear behind it.
4. **Test Check-In Kiosk:** Select a member and click CHECK IN → `StaleShiftDialog` should appear. No snackbar should appear.
5. **Test Cash Management:** Click "Add Expense" and submit → `StaleShiftDialog` should appear. **No** generic error snackbar should appear. *(This is the fix being implemented.)*
6. **Revert the date hack** after testing.

---

## Quick Reference

| File | Status | Note |
|---|---|---|
| `stale-shift-dialog.ts/html/css` | ✅ Done | Dialog fully implemented |
| `cash-register.service.ts` | ✅ Done | Validator + guard in `addCashTransaction()` |
| `store.service.ts` | ✅ Done | `checkout()` calls validator |
| `pos.ts` | ✅ Done | Catches & suppresses `STALE_SHIFT` |
| `check-in-kiosk.ts` | ✅ Done | Catches & suppresses `STALE_SHIFT` |
| `cash-management.ts` | ❌ **TODO** | Must add `STALE_SHIFT` / `SILENT` guard to `submitTransaction()` |
