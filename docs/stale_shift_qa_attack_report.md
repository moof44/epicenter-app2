# QA Attack Report — Stale Shift Protection
**Mode:** Negative Testing / Adversarial QA
**Date:** 2026-04-11
**Target:** Stale Shift Protection feature across `cash-register.service.ts`, `store.service.ts`, `pos.ts`, `check-in-kiosk.ts`, `cash-management.ts`, `stale-shift-dialog.ts`

---

## Severity Legend
- 🔴 **CRITICAL** — Data integrity risk or unhandled crash
- 🟠 **HIGH** — Significant UX failure or protection bypass
- 🟡 **MEDIUM** — Inconsistent behavior, poor UX under specific conditions
- 🟢 **LOW** — Cosmetic or minor edge case

---

## 🔴 BUG #1 — `startTime.toDate()` will CRASH on a fresh in-memory shift (not yet read from Firestore)

**File:** `cash-register.service.ts`, Line 56
```typescript
const shiftDate = shift.startTime.toDate().toLocaleDateString('en-CA');
```

**Attack scenario:**
1. Open a shift.
2. The in-memory createdShift (set immediately after `addDoc`) has `startTime: new Date()` — a **plain JavaScript `Date` object**, NOT a Firestore `Timestamp`.
3. A plain `Date` object does NOT have a `.toDate()` method.
4. Staff immediately attempts a transaction (e.g., in POS) **before** `refreshShift()` reads the Firestore document back (which would give a real Firestore Timestamp).

**Root cause:**
```typescript
// openShift() line 142 — stored as JavaScript Date
startTime: new Date(),                         // ← plain Date, no .toDate()

// getOpenShift() returns from Firestore — comes back as Firestore Timestamp  
return { id: doc.id, ...doc.data() } as ShiftSession;  // ← has .toDate()
```

After `openShift()`, the BehaviorSubject is set with `createdShift` which has `startTime` as a plain JS `Date`. Only after `refreshShift()` reads from Firestore does it become a Firestore Timestamp.

**Actual result:** `TypeError: shift.startTime.toDate is not a function` — **unhandled crash**.

**Impact:** Any staff member who opens a shift and immediately tries to process a transaction without waiting for the reactive refresh will hit this crash.

**Fix needed:** Make the comparator safe:
```typescript
const rawStart = shift.startTime;
const shiftDate = (rawStart?.toDate ? rawStart.toDate() : new Date(rawStart))
  .toLocaleDateString('en-CA');
```

---

## 🔴 BUG #2 — Double `StaleShiftDialog` can open simultaneously in POS

**File:** `pos.ts` Lines 190 & 214, `store.service.ts` Line 202

**Attack scenario:**
1. Shift is stale.
2. Staff clicks the Checkout button in POS.
3. `pos.ts` line 190 calls `ensureValidShiftForTransaction()` → **Modal #1 opens**, `STALE_SHIFT` is thrown.
4. `pos.ts` line 191: `if (!valid) return` — BUT the validator THROWS, not returns false for stale. So `return` is never reached. The error falls into the `catch` at line 231 which correctly suppresses it.

**Wait — this passes.** However, the real vulnerability:

**Second path:** If for any reason the line 190 validator PASSES (e.g., very fast clock tick at midnight — shift date becomes tomorrow mid-call), execution continues and `storeService.checkout()` is called at line 214, which calls the validator AGAIN (line 202 in store.service.ts). If the shift has become stale by this point:
- Modal opens from `store.service.ts`
- `STALE_SHIFT` is thrown from `store.service.ts`
- It propagates to the `catch` in `pos.ts` line 231 and is suppressed

**True double-modal risk scenario (midnight boundary attack):**

At exactly midnight:
1. `pos.ts` line 190 calls validator → shift date is still "today" (23:59:59.999) → returns `true`
2. Execution proceeds, `StoreService.checkout()` is called
3. Within checkout, validator is called again at a new millisecond (00:00:00.001 next day) → shift is NOW stale → **Modal opens**. One modal appears.

This is fine — only one modal. But note: **there is no protection against calling `ensureValidShiftForTransaction()` while it is already showing a modal.** If two staff members hit checkout simultaneously from different tabs/sessions in the same browser, two instances of `StaleShiftDialog` can stack on the screen (since `MatDialog` does not inherently deduplicate by component type).

**Impact:** Cosmetic stacking of two StaleShift modals in multi-tab edge case.

---

## 🟠 BUG #3 — Validator is called BEFORE `isSubmitting = true` in `check-in-kiosk.ts`, allowing multiple simultaneous calls

**File:** `check-in-kiosk.ts`, Lines 203–213

```typescript
async confirmCheckIn() {
  if (!this.cashRegisterService.isShiftOpen()) { ... return; }

  const valid = await this.cashRegisterService.ensureValidShiftForTransaction(); // async gap here
  if (!valid) return;

  if (!this.selectedMember) return;
  this.isSubmitting = true;  // ← set AFTER the async gap
```

**Attack scenario (rapid double-tap):**
1. Staff double-taps CHECK IN before `isSubmitting` is set to `true`.
2. Both calls pass the `isShiftOpen()` sync check.
3. Both calls invoke `ensureValidShiftForTransaction()` (async).
4. If the shift is stale: **Two modals open simultaneously.**
5. If the shift is valid: **Two check-in operations execute**, potentially creating a duplicate attendance record.

**Impact:** For the stale case — two modals stack (cosmetic but confusing). For the valid case — **duplicate check-in records in Firestore** (data integrity issue).

**Fix needed:** Set `isSubmitting = true` (or equivalent guard) BEFORE the first async call, not after.

---

## 🟠 BUG #4 — `StaleShiftDialog` opened from inside `cash-management.ts` can stack if staff mashes "Submit" button

**File:** `cash-management.ts`, Lines 60–93
```typescript
this.isSubmitting = true;
try {
  ...
  await this.cashRegisterService.addExpense(...)
```

**Attack scenario:**
1. Shift is stale.
2. staff clicks "Submit" twice rapidly before `isSubmitting` becomes `true` (before async kicks off).

Wait — `isSubmitting = true` IS set on line 70, before the await. So this IS protected... but only for `cash-management.ts`.

But the issue is that the **form is not disabled in the UI during submission for the stale case**. When `STALE_SHIFT` is thrown and caught, `isSubmitting` is reset to `false` in `finally`. The modal is still open and the form is re-enabled. If staff clicks Submit again while the modal is open, **another call executes** — the shift is still stale, so another modal opens behind the first (which has `disableClose: true`).

**Impact:** Multiple `disableClose: true` modals stacking while the first is undismissed.

---

## 🟡 BUG #5 — `closeForm()` is NOT called after catching `STALE_SHIFT` in `cash-management.ts`

**File:** `cash-management.ts`, Lines 88–93
```typescript
} catch (err: any) {
  if (err.message === 'STALE_SHIFT' || err.message === 'SILENT') return; // ← returns immediately
  this.snackBar.open(err.message || 'Failed to record transaction', 'Close', { duration: 3000 });
} finally {
  this.isSubmitting = false;
}
```

**Attack scenario:**
1. Shift is stale. Staff fills out an Expense form and submits.
2. `STALE_SHIFT` is thrown → modal appears.
3. `catch` block fires and returns immediately.
4. `finally` sets `isSubmitting = false`.
5. The **Expense form is still visible and open** behind the StaleShift modal.

**Expected behavior:** When staff acknowledge the modal, they should be returned to a clean state (form closed). Instead, the expense form is still sitting there, populated with the old amount/reason, ready to be re-submitted (which will just open the modal again).

**Impact:** Confusing UX. Staff may not understand why they can keep submitting and keep getting the modal. Form should be closed when `STALE_SHIFT` is caught.

---

## 🟡 BUG #6 — `SILENT` error suppression in `pos.ts` and `check-in-kiosk.ts` is INCOMPLETE

**File:** `pos.ts` Line 231, `check-in-kiosk.ts` Line 359

`pos.ts` catch:
```typescript
if (error.message === 'STALE_SHIFT') return;
// ← 'SILENT' is NOT handled here
```

`check-in-kiosk.ts` catch:
```typescript
if (error.message === 'STALE_SHIFT') return;
// ← 'SILENT' is NOT handled here
```

**Attack scenario:**
1. Shift is null/closed AND `isShiftOpen()` somehow returns `true` due to a stale BehaviorSubject (e.g., page just loaded, `refreshShift()` hasn't completed).
2. `ensureValidShiftForTransaction()` returns `false`.
3. `pos.ts` line 191: `if (!valid) return` — safe, returns before try.
4. BUT: if the null-shift case somehow reaches the `storeService.checkout()` call (it won't via POS since the guard at line 191 covers it), `addCashTransaction()` would throw `SILENT`.
5. `SILENT` would NOT be caught in `pos.ts` or `check-in-kiosk.ts` — it would surface as a generic snackbar with the text `"SILENT"` on screen.

**True risk path:** In `check-in-kiosk.ts`, the outer validator at line 209 guards the top. But inside the `try` block, `storeService.checkout()` is called at lines 291 and 340. `StoreService.checkout()` internally calls `ensureValidShiftForTransaction()` → if this returns `false` (no shift), it throws `'Transaction blocked: Register is closed...'` — not `SILENT`. So this path actually shows a snackbar with that message.

**Impact:** Medium. In a narrow race condition, "Transaction blocked: Register is closed." would appear as a snackbar in the kiosk. Not catastrophic, but inconsistent with the design intent.

---

## 🟢 BUG #7 — Stale shift gives no visual warning before click in Kiosk or Cash Management

**Files:** `check-in-kiosk.ts` template (lines 80, 89), `cash-management.ts` template

Neither the CHECK IN button nor the Cash Management submit button is visually disabled when the shift is stale. `isShiftOpen$` only checks if a shift is open (status === 'OPEN'), not if it's valid for today.

**Impact:** Staff interaction required to discover the problem (click → modal). No proactive visual hint.

---

## Summary Table

| # | Severity | Description |
|---|---|---|
| 1 | 🔴 CRITICAL | `startTime.toDate()` crashes if shift was just opened (in-memory `Date` not Firestore Timestamp) |
| 2 | 🟠 HIGH | Double modal risk in multi-tab scenario |
| 3 | 🟠 HIGH | Double check-in possible if `isSubmitting` guard set too late in kiosk |
| 4 | 🟠 HIGH | Modal can stack if staff submits repeatedly in Cash Management while modal is open |
| 5 | 🟡 MEDIUM | Cash Management form stays open after `STALE_SHIFT` catch — confusing UX |
| 6 | 🟡 MEDIUM | `SILENT` error not suppressed in `pos.ts` and `check-in-kiosk.ts` — could show raw text snackbar |
| 7 | 🟢 LOW | No visual disabled state for stale shift in Kiosk/Cash Management UI |

---

## Priority Recommendation

Fix **Bug #1 first** — it is the only one that causes an outright JavaScript crash with no recovery. All other bugs are UX/edge-case issues that degrade experience but don't corrupt data.

After that, fix **Bug #3** (duplicate check-in data integrity issue), then **Bug #5** (form stays open after modal), then the rest.
