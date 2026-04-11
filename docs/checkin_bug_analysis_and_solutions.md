# Check-In Bug Analysis & Solutions

> Role: Senior Angular Developer, Firestore Specialist
> Date: April 12, 2026
> Input: QA Attack Report (`docs/checkin_qa_report.md`)

---

## 1. Bug Validation

Each QA-reported bug was traced through the source code to determine if it's a genuine defect, intentional design, or a false positive.

### TC-16: Member with no `id` — unguarded non-null assertion

**QA Claim:** If a member has no `id`, `member.id!` crashes or writes orphaned data.

**Code Trace:**
- `check-in-kiosk.ts` line 240: `await this.memberService.updateMember(member.id!, { remarks: '' })`
- `attendance.service.ts` line 173: `memberId: member.id!`
- Members come from `collectionData(q, { idField: 'id' })` which always injects the Firestore document ID as `id`.

**Verdict: VALID but LOW probability.** The `idField: 'id'` option in `collectionData` guarantees every member from Firestore has an `id`. However, defensive coding is a project standard (steering: "Use optional chaining `?.` for null safety"). A guard costs nothing and prevents any future regression if the data source changes.

**Accepted: YES** — Add a guard. Minimal effort, high safety.

---

### TC-19: Active member with null expiration treated as walk-in

**QA Claim:** A member with `membershipStatus: 'Active'` but `membershipExpiration: null` is incorrectly treated as inactive.

**Code Trace:**
- `check-in-kiosk.ts` line 228: `const hasActiveSubscription = member.membershipStatus === 'Active' && !!member.membershipExpiration && !isExpired;`
- `member-form.ts` line 52: `membershipStatus: ['Active', [Validators.required]]` — default is Active.
- `member-form.ts` line 48: `membershipExpiration: [null]` — default is null.

**Business Context (from product owner):**
- All gym-goers are registered as members, even walk-ins. The form defaults to `Active` status with `null` expiration.
- `membershipExpiration` is only set when a member purchases a monthly subscription.
- A member without a subscription is still a valid member — they pay per visit via the walk-in fee.
- The `WalkInDialog` is the **intended checkpoint** for non-subscribed members. It prompts staff: "Charge walk-in fee?" (Yes → creates transaction) or "Check-in only?" (No → free entry).
- The variable `hasActiveSubscription` means "has an active SUBSCRIPTION", not "is an active MEMBER". The naming is accurate.

**Verdict: NOT A BUG — Intentional design.** The dialog appearing for newly registered members without a subscription IS the correct business flow. The QA report misinterpreted `Active` status as meaning "should skip all dialogs", but in reality the system correctly distinguishes between member registration status and subscription status.

**Accepted: NO** — Current behavior is correct. No code change needed.

---

### TC-22: Subscription update allows past expiration dates

**QA Claim:** The `SubscriptionUpdateDialog` datepicker has no minimum date constraint.

**Code Trace:**
- `subscription-update-dialog.ts` line 60: `dateControl = new FormControl(this.getDefaultDate(), [Validators.required]);`
- Template: `<input matInput [matDatepicker]="picker" [formControl]="dateControl">` — no `[min]` attribute.

**Verdict: VALID and MEDIUM impact.** A staff member could accidentally pick a past date, setting the member's expiration to yesterday. The member would immediately be treated as expired on next check-in. This is a data entry error that's easy to make on mobile (fat-finger on calendar).

**Accepted: YES** — Add `[min]` to the datepicker.

---

### TC-23: WalkInDialog template crashes on non-Timestamp expiration

**QA Claim:** `{{data.member.membershipExpiration?.toDate() | date}}` crashes if `membershipExpiration` is a plain JS Date.

**Code Trace:**
- `walk-in-dialog.ts` template line 34: `{{data.member.membershipExpiration?.toDate() | date}}`
- The WalkInDialog is shown when `!hasActiveSubscription` — meaning the member has no expiration or an expired one.
- Members from Firestore have Timestamps (which have `.toDate()`). But after local mutation (e.g., `member.membershipExpiration = new Date()` elsewhere), it could be a plain Date.
- More importantly: the `MemberForm` saves `membershipExpiration` as a plain JS Date (from the datepicker). If the Firestore real-time listener hasn't re-emitted yet, the member in the autocomplete could have a plain Date.

**Verdict: VALID but NARROW window.** The crash is real but only occurs in a specific timing scenario. However, the fix is trivial and aligns with the project pattern used in `doCheckIn()` which already handles both types safely.

**Accepted: YES** — Add safe date conversion.

---

### TC-33: Subscription updated but payment fails — no rollback

**QA Claim:** In the "Update, Pay & Check-in" flow, `updateMember()` succeeds first, then if `checkout()` fails, the member has a free subscription extension.

**Code Trace:**
- `check-in-kiosk.ts` lines 278-310:
  ```
  await this.memberService.updateMember(member.id!, { membershipExpiration: newExpiration, membershipStatus: 'Active' });
  // ... then later ...
  await this.storeService.checkout([...]);
  ```
- These are two separate Firestore operations. If `checkout()` fails (product not found, shift closed, network error), the member update is already committed.

**Verdict: VALID and HIGH impact.** This is a real financial integrity issue. A member could get a free 30-day extension if the payment step fails. The fix needs to ensure atomicity or at minimum reverse the member update on failure.

**Accepted: YES** — Reverse operation order (checkout first, then update member).

---

### TC-36: `getActiveCheckIns()` unbounded read (WARNING)

**QA Claim:** The duplicate check-in validation reads ALL active check-in records when it only needs to check one specific member.

**Code Trace:**
- `attendance.service.ts` line 172: `const activeCheckIns = await firstValueFrom(this.getActiveCheckIns());`
- `getActiveCheckIns()` queries `where('status', '==', 'Checked In')` with no limit.
- This same method is also used by `ActiveSessions` component which needs all records for the UI table.

**Verdict: VALID and MEDIUM impact.** For the duplicate check, we only need to know if THIS member is checked in. Reading all active records is wasteful. In a gym with 50 concurrent check-ins, that's 50 document reads per check-in attempt. A targeted query would be 1 read.

**Accepted: YES** — Add a targeted query for the duplicate check.

---

## 2. Final Accepted Bug List

| # | TC | Bug | Severity | Category |
|---|-----|-----|----------|----------|
| 1 | TC-16 | No guard on `member.id` before Firestore operations | Low | Defensive coding |
| 2 | TC-22 | Subscription update dialog allows past dates | Medium | Validation gap |
| 3 | TC-23 | WalkInDialog crashes on non-Timestamp expiration | Medium | Type safety |
| 4 | TC-33 | Subscription update + payment not atomic — free extension on failure | High | Data integrity |
| 5 | TC-36 | Duplicate check reads all active records instead of targeted query | Medium | Performance / Billing |

### Rejected from QA Report

| TC | Bug | Reason |
|----|-----|--------|
| TC-19 | Active member with null expiration treated as walk-in | Intentional design. `hasActiveSubscription` correctly distinguishes subscription status from member registration status. The WalkInDialog is the intended checkpoint for non-subscribed members. |

---

## 3. Solutions

### Bug #1 (TC-16): Add `member.id` guard

**File:** `src/app/features/attendance/components/check-in-kiosk/check-in-kiosk.ts`

**Change:** Add an early guard after the `selectedMember` null check.

```typescript
// Current (line ~226):
if (!this.selectedMember) { this.isSubmitting = false; return; }

// Fixed:
if (!this.selectedMember?.id) {
  this.snackBar.open('Invalid member data. Please re-select.', 'Close', { duration: 3000 });
  this.isSubmitting = false;
  return;
}
```

**Side effects:** None. This is a pure guard that only triggers on corrupted data.

---

### Bug #2 (TC-22): Add minimum date to subscription update datepicker

**File:** `src/app/features/attendance/components/subscription-update-dialog/subscription-update-dialog.ts`

**Change:** Add a `minDate` property and bind it to the datepicker.

```typescript
// Add property:
minDate = new Date(); // Today

// Template change — add [min] to the datepicker input:
// Current:
<input matInput [matDatepicker]="picker" [formControl]="dateControl">

// Fixed:
<input matInput [matDatepicker]="picker" [formControl]="dateControl" [min]="minDate">
```

**Side effects:** Staff can no longer select past dates. The default date is already `today + 1 month` (from `getDefaultDate()`), so this only blocks accidental past-date selection. No legitimate use case is blocked.

---

### Bug #3 (TC-23): Safe date conversion in WalkInDialog template

**File:** `src/app/features/attendance/components/walk-in-dialog/walk-in-dialog.ts`

**Change:** Add a helper method and use it in the template.

```typescript
// Add method to WalkInDialog class:
formatExpiration(value: any): Date | null {
  if (!value) return null;
  return value.toDate ? value.toDate() : new Date(value);
}

// Template change:
// Current:
<span *ngIf="data.isExpired">has an expired subscription (Enc: {{data.member.membershipExpiration?.toDate() | date}}).</span>

// Fixed:
<span *ngIf="data.isExpired">has an expired subscription (Exp: {{formatExpiration(data.member.membershipExpiration) | date}}).</span>
```

**Side effects:** None. This is a display-only change. Also fixes the typo "Enc:" → "Exp:".

---

### Bug #4 (TC-33): Reverse operation order — checkout before member update

**File:** `src/app/features/attendance/components/check-in-kiosk/check-in-kiosk.ts`

**Change:** In the "Update, Pay & Check-in" branch, attempt checkout FIRST. Only update the member's subscription if checkout succeeds.

```typescript
// Current order:
// 1. updateMember (subscription)  ← commits to Firestore
// 2. checkout (payment)           ← if this fails, subscription is already updated

// Fixed order:
// 1. checkout (payment)           ← if this fails, nothing was changed
// 2. updateMember (subscription)  ← only runs if payment succeeded
```

Concrete code change in the `update-subscription` branch:

```typescript
if (updateResult.action === 'pay-and-check-in') {
  const products = await firstValueFrom(this.storeService.getProducts());
  const membershipProduct = products.find(p =>
    p.name.toLowerCase().includes('monthly') ||
    p.name.toLowerCase().includes('membership')
  );

  if (!membershipProduct) {
    throw new Error('Membership product not found (search "Monthly" or "Membership"). Cannot process payment.');
  }

  // PAYMENT FIRST — if this fails, member is not updated
  await this.storeService.checkout([{
    productId: membershipProduct.id!,
    productName: membershipProduct.name,
    price: membershipProduct.price,
    originalPrice: membershipProduct.price,
    isPriceOverridden: false,
    quantity: 1,
    subtotal: membershipProduct.price
  }], 'ATTENDANCE_SUBSCRIPTION_UPDATE', updateResult.paymentMethod, updateResult.referenceNumber, undefined, undefined, member.id, member.name);

  // THEN update subscription — payment already succeeded
  const newExpiration = Timestamp.fromDate(updateResult.subscriptionDate);
  await this.memberService.updateMember(member.id!, {
    membershipExpiration: newExpiration,
    membershipStatus: 'Active'
  });
  member.membershipExpiration = newExpiration;

  this.snackBar.open('Subscription updated & Payment processed.', undefined, { duration: 2000 });
} else {
  // "check-in-only" — no payment, just update subscription
  const newExpiration = Timestamp.fromDate(updateResult.subscriptionDate);
  await this.memberService.updateMember(member.id!, {
    membershipExpiration: newExpiration,
    membershipStatus: 'Active'
  });
  member.membershipExpiration = newExpiration;

  this.snackBar.open('Subscription updated.', undefined, { duration: 2000 });
}
```

**Side effects audit:**
- If checkout succeeds but `updateMember` fails (very rare — network drop between two calls), the payment is recorded but the member's expiration isn't updated. This is the reverse problem but much less severe: the gym has the money, and staff can manually update the member's expiration. The audit trail in the transaction proves payment was made.
- The `checkout()` method in `StoreService` already handles membership auto-renewal for products with "rental" in the name. However, the subscription update dialog uses a product with "monthly" or "membership" in the name, which may or may not trigger auto-renewal. This is not a new issue — it exists in the current code too.
- The `check-in-only` branch (no payment) is unchanged in behavior — it still updates the member first, which is correct since there's no payment to fail.

**Conclusion:** The reverse order is strictly safer. Payment-first means the worst case is "paid but not updated" (recoverable by staff) vs. the current "updated but not paid" (free subscription, financial loss).

---

### Bug #5 (TC-36): Add targeted duplicate check query

**File:** `src/app/core/services/attendance.service.ts`

**Change:** Add a new method specifically for checking if a single member is already checked in, and use it in `checkIn()` instead of `getActiveCheckIns()`.

```typescript
// New method:
async isMemberCheckedIn(memberId: string): Promise<boolean> {
  const q = query(
    this.attendanceCollection,
    where('memberId', '==', memberId),
    where('status', '==', 'Checked In'),
    limit(1)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

// In checkIn() method, replace:
const activeCheckIns = await firstValueFrom(this.getActiveCheckIns());
const alreadyCheckedIn = activeCheckIns.some((record: AttendanceRecord) => record.memberId === member.id);
if (alreadyCheckedIn) {
  throw new Error(`Member ${member.name} is already checked in.`);
}

// With:
const alreadyCheckedIn = await this.isMemberCheckedIn(member.id!);
if (alreadyCheckedIn) {
  throw new Error(`Member ${member.name} is already checked in.`);
}
```

**`getActiveCheckIns()` remains unchanged** — it's still used by `ActiveSessions` component which needs all records.

**Side effects audit:** None on existing functionality. `ActiveSessions` still uses `getActiveCheckIns()`. The new method is only used internally by `checkIn()`.

---

## 4. Firestore Billing Audit

> Role: Firestore Specialist

### Current Cost (Before Fix)

For each check-in attempt, the duplicate validation calls `firstValueFrom(this.getActiveCheckIns())`:
- `getActiveCheckIns()` uses `collectionData()` (real-time listener) with `firstValueFrom` (takes first emission then unsubscribes).
- This reads ALL documents where `status == 'Checked In'`.
- If 30 members are currently checked in → 30 document reads per check-in attempt.
- If 100 check-ins happen per day → 100 × 30 = 3,000 reads just for duplicate validation.

### New Cost (After Fix #6)

The new `isMemberCheckedIn()` method:
- Uses `getDocs()` (one-time read) with `where('memberId', '==', memberId)` + `where('status', '==', 'Checked In')` + `limit(1)`.
- This reads at most 1 document (or 0 if not checked in).
- 100 check-ins per day → 100 × 1 = 100 reads for duplicate validation.

### Savings

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| Reads per check-in | ~30 (avg active) | 1 (max) | 97% reduction |
| Daily reads (100 check-ins) | ~3,000 | ~100 | 2,900 fewer reads |
| Monthly reads (3,000 check-ins) | ~90,000 | ~3,000 | 87,000 fewer reads |

### Index Requirement

The new query uses a composite index: `memberId` + `status`. Firestore may auto-create this, or it may need to be added to `firestore.indexes.json`:

```json
{
  "collectionGroup": "attendance",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "memberId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}
```

This is a lightweight index. Cost: negligible storage overhead.

### Other Fixes — Billing Impact

| Fix | Billing Impact |
|-----|---------------|
| Bug #1 (id guard) | Zero — pure client-side guard |
| Bug #2 (hasActiveSubscription) | Zero — pure client-side logic change |
| Bug #3 (min date) | Zero — pure client-side validation |
| Bug #4 (safe date) | Zero — pure template display change |
| Bug #5 (reverse order) | Zero — same number of Firestore operations, just reordered |

### Verdict: All fixes are Firestore billing-neutral or billing-positive. Fix #6 provides a meaningful cost reduction.

---

## 5. Solution Audit Summary

| Fix | Goal Achieved | Side Effects | Billing Impact | Approved |
|-----|--------------|--------------|----------------|----------|
| #1 — `member.id` guard | ✅ Prevents crash on corrupted data | None | Neutral | ✅ |
| #2 — Min date on datepicker | ✅ Prevents past-date subscription | None — default is already future date | Neutral | ✅ |
| #3 — Safe date in WalkInDialog | ✅ Prevents template crash | None — display only | Neutral | ✅ |
| #4 — Payment before subscription update | ✅ Prevents free subscription on payment failure | Worst case: paid but not updated (staff-recoverable) | Neutral | ✅ |
| #5 — Targeted duplicate check query | ✅ Reduces reads from ~30 to 1 per check-in | None — existing UI unaffected | Positive (97% reduction) | ✅ |
