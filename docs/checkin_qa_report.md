# Check-In Feature — QA Attack Report

> Role: Senior QA Engineer
> Date: April 12, 2026
> Scope: Full check-in flow — `CheckInKiosk` component, `AttendanceService.checkIn()`, all dialog branches, and side effects

---

## 1. Flow Analysis

The check-in flow is a multi-step, dialog-driven process with branching logic:

```
User searches member → selects member → (optional) selects locker → clicks CHECK IN
  │
  ├─ Guard: isSubmitting? → abort
  ├─ Guard: shift open? → abort + snackbar
  ├─ Guard: shift stale? → abort + StaleShiftDialog
  ├─ Guard: selectedMember null? → abort
  │
  ├─ Step 0: Remarks check
  │   └─ If member.remarks → RemarksDialog (disableClose)
  │       ├─ "Clear" → updateMember(remarks: '') + proceed
  │       └─ "Close" → proceed
  │
  ├─ Step 1: Locker restriction check (only if locker selected AND no active subscription)
  │   └─ LockerRestrictionDialog
  │       ├─ "Cancel" → abort (isSubmitting = false)
  │       ├─ "Check-in (No Locker)" → clear locker, fall through to Step 2
  │       └─ "Update Subscription" → SubscriptionUpdateDialog
  │           ├─ "Cancel" → abort
  │           ├─ "Update & Check-in (No Pay)" → update member expiration → doCheckIn → return
  │           └─ "Update, Pay & Check-in" → update member + checkout() → doCheckIn → return
  │
  ├─ Step 2: Walk-in check (only if no active subscription AND didn't update sub in Step 1)
  │   └─ WalkInDialog
  │       ├─ "Cancel" → abort
  │       ├─ "No (Check-in Only)" → fall through to Step 3
  │       └─ "Yes (Walk-in Transaction)" → checkout() → fall through to Step 3
  │
  └─ Step 3: doCheckIn(member)
      └─ AttendanceService.checkIn()
          ├─ Validate locker not occupied (re-check)
          ├─ Validate member not already checked in
          └─ Write attendance record to Firestore
```

---

## 2. Test Cases & Results

### Legend
- ✅ PASS — Logic is correct
- ⚠️ WARNING — Works but has a risk or design concern
- ❌ FAIL — Bug found, needs fix

---

### TC-01: Happy Path — Active member, no locker, shift open
**Preconditions:** Member has active subscription, no remarks, shift is open.
**Steps:** Search → Select member → Click CHECK IN
**Expected:** Attendance record created, snackbar with commendation, form resets.
**Result:** ✅ PASS
**Notes:** Standard flow works correctly. `doCheckIn` creates record, resets form.

---

### TC-02: Happy Path — Active member with locker
**Preconditions:** Member has active subscription, shift open, locker 5 is free.
**Steps:** Search → Select member → Select locker 5 → CHECK IN
**Expected:** Record created with `lockerNumber: 5`.
**Result:** ✅ PASS
**Notes:** Locker restriction dialog is skipped because `hasActiveSubscription` is true.

---

### TC-03: Shift closed — Check-in blocked
**Preconditions:** No shift is open.
**Steps:** Attempt to search or check in.
**Expected:** Search input disabled, CHECK IN button disabled, warning card shown.
**Result:** ✅ PASS
**Notes:** Multiple layers of protection: template `[disabled]`, `isShiftOpen()` check in `confirmCheckIn()`.

---

### TC-04: Stale shift — Shift from yesterday
**Preconditions:** Shift is open but `startTime` is from a previous day.
**Steps:** Select member → CHECK IN
**Expected:** `StaleShiftDialog` opens, check-in aborted.
**Result:** ✅ PASS
**Notes:** `ensureValidShiftForTransaction()` compares shift date to today using `en-CA` locale for YYYY-MM-DD.

---

### TC-05: Double check-in prevention — Same member already checked in
**Preconditions:** Member "John" is already checked in (status: 'Checked In').
**Steps:** Search "John" → Select → CHECK IN
**Expected:** Error: "Member John is already checked in."
**Result:** ✅ PASS
**Notes:** `AttendanceService.checkIn()` fetches all active check-ins and checks for `memberId` match.

---

### TC-06: Locker already occupied — Race condition
**Preconditions:** Locker 3 is free when member is selected, but another staff checks someone into locker 3 before this user clicks CHECK IN.
**Steps:** Select member → Select locker 3 → (another user takes locker 3) → CHECK IN
**Expected:** Error: "Locker 3 (Male) is already occupied."
**Result:** ✅ PASS
**Notes:** `AttendanceService.checkIn()` re-queries occupied lockers at write time, not just at selection time. Good defensive design.

---

### TC-07: Rapid double-tap on CHECK IN button
**Preconditions:** Member selected, shift open.
**Steps:** Rapidly tap CHECK IN twice.
**Expected:** Only one attendance record created.
**Result:** ✅ PASS
**Notes:** `isSubmitting` flag is set synchronously before any async work. Second tap hits `if (this.isSubmitting) return;`.

---

### TC-08: Member with remarks — Clear remark flow
**Preconditions:** Member has `remarks: "Owes ₱500"`.
**Steps:** Select member → CHECK IN → RemarksDialog opens → Click "Clear Remark"
**Expected:** `updateMember(id, { remarks: '' })` called, remark cleared, check-in proceeds.
**Result:** ⚠️ WARNING — Functional but has a data integrity concern.
**Details:**
- The local `member.remarks` is set to `''` after clearing, but the `member` object is a reference from the autocomplete selection. This mutates the in-memory object from the `members$` Observable stream.
- If the Firestore listener hasn't emitted yet, the local member list still shows the old remarks until the next emission.
- More critically: the attendance record will be written with `memberRemarks: null` (because `member.remarks` is now `''` which is falsy, so `member.remarks || null` → `null`). This is correct behavior — the remark was cleared before check-in.

---

### TC-09: Member with remarks — Keep remark flow
**Preconditions:** Member has `remarks: "VIP - Free locker"`.
**Steps:** Select member → CHECK IN → RemarksDialog opens → Click "Close (Keep Remark)"
**Expected:** Remark preserved, check-in proceeds, attendance record has `memberRemarks: "VIP - Free locker"`.
**Result:** ✅ PASS

---

### TC-10: Expired member + locker selected → Locker restriction → Cancel
**Preconditions:** Member has expired subscription, locker 7 selected.
**Steps:** CHECK IN → LockerRestrictionDialog → Cancel
**Expected:** Check-in aborted, `isSubmitting` reset to false.
**Result:** ✅ PASS

---

### TC-11: Expired member + locker → "Check-in (No Locker)" → Walk-in dialog
**Preconditions:** Member expired, locker 7 selected.
**Steps:** CHECK IN → LockerRestrictionDialog → "Check-in (No Locker)" → WalkInDialog opens
**Expected:** Locker cleared, walk-in dialog shown, member can check in with or without walk-in transaction.
**Result:** ✅ PASS
**Notes:** `selectedLocker` is set to `null`, then flow falls through to Step 2 (walk-in check) because `hasActiveSubscription` is still false.

---

### TC-12: Expired member + locker → "Update Subscription" → "Update, Pay & Check-in"
**Preconditions:** Member expired, locker selected, "Monthly Membership" product exists in store.
**Steps:** CHECK IN → LockerRestrictionDialog → "Update Subscription" → SubscriptionUpdateDialog → Set date → "Update, Pay & Check-in"
**Expected:** Member expiration updated, checkout transaction created, attendance record created with locker.
**Result:** ⚠️ WARNING — Works but has a product lookup fragility.
**Details:**
- The code searches for a product with name containing "monthly" or "membership": `products.find(p => p.name.toLowerCase().includes('monthly') || p.name.toLowerCase().includes('membership'))`
- If no product matches, it throws: `"Membership product not found (search "Monthly" or "Membership"). Cannot process payment."`
- This is a runtime dependency on product naming convention. If the product is renamed (e.g., "Gym Pass" or "30-Day Plan"), the payment silently fails with an error.
- **Recommendation:** Use a product flag/tag (e.g., `isMembershipProduct: true`) or a settings reference instead of name-based search.

---

### TC-13: Expired member + no locker → Walk-in dialog → "Yes (Walk-in Transaction)" with CASH
**Preconditions:** Member expired, no locker, "Walk-in" product exists.
**Steps:** CHECK IN → WalkInDialog → Select CASH → "Yes (Walk-in Transaction)"
**Expected:** Walk-in checkout created, attendance record created.
**Result:** ⚠️ WARNING — Same product lookup fragility as TC-12.
**Details:**
- Searches for product with name containing "walk-in": `products.find(p => p.name.toLowerCase().includes('walk-in'))`
- If no matching product exists, throws: `"Walk-in product not found. Please contact admin."`
- **Recommendation:** Same as TC-12 — use a product flag or settings reference.

---

### TC-14: Walk-in with GCash — Empty reference number
**Preconditions:** Member expired, no locker.
**Steps:** CHECK IN → WalkInDialog → Select GCASH → Leave reference empty → Click "Yes"
**Expected:** Button disabled, cannot proceed.
**Result:** ✅ PASS
**Notes:** Template has `[disabled]="paymentMethod === 'GCASH' && !referenceNumber"`. Also validated in `onAction()`.

---

### TC-15: Subscription update with GCash — Empty reference number
**Preconditions:** Member expired, locker selected.
**Steps:** CHECK IN → LockerRestrictionDialog → "Update Subscription" → SubscriptionUpdateDialog → GCASH → Empty ref → "Update, Pay & Check-in"
**Expected:** Button disabled.
**Result:** ✅ PASS

---

### TC-16: Member with no `id` field
**Preconditions:** Somehow a member object without `id` is selected (edge case from data corruption).
**Steps:** Select member → CHECK IN
**Expected:** Should fail gracefully.
**Result:** ❌ FAIL — Unhandled crash.
**Details:**
- `AttendanceService.checkIn()` uses `member.id!` (non-null assertion) for `memberId` field.
- If `member.id` is `undefined`, the attendance record is written with `memberId: undefined`.
- Firestore will accept this but it creates an orphaned record that can't be queried by member.
- `memberService.updateMember(member.id!, ...)` in the remarks clear flow would crash with a Firestore error (invalid document path).
- **File:** `src/app/features/attendance/components/check-in-kiosk/check-in-kiosk.ts` line ~170 and `src/app/core/services/attendance.service.ts` line ~130
- **Fix:** Add a guard at the start of `confirmCheckIn()`: `if (!this.selectedMember?.id) { snackBar.open('Invalid member data'); return; }`

---

### TC-17: Member with gender `'Other'` — Locker segregation
**Preconditions:** Member gender is 'Other', locker selected.
**Steps:** Select member → Select locker → CHECK IN
**Expected:** Occupied lockers queried for gender 'Other'.
**Result:** ⚠️ WARNING — Functional but design concern.
**Details:**
- `getOccupiedLockers('Other')` queries lockers occupied by 'Other' gender members only.
- This means an 'Other' gender member could be assigned a locker that's physically in the Male or Female area (lockers 1-12 are shared across all genders in the data model).
- There's no physical locker segregation enforcement — the system only prevents same-gender double-booking.
- A Male member on locker 5 and an Other member on locker 5 would both be allowed.
- **File:** `src/app/core/services/attendance.service.ts` line ~120-130
- **Fix:** Either query ALL occupied lockers regardless of gender, or document that lockers are gender-segregated physically and the system only tracks within-gender conflicts.

---

### TC-18: Unauthenticated user attempts check-in
**Preconditions:** User is not logged in (somehow on the attendance page).
**Steps:** Select member → CHECK IN
**Expected:** Error thrown from `_currentUserSnapshot`.
**Result:** ⚠️ WARNING — Error is thrown but not user-friendly.
**Details:**
- `AttendanceService._currentUserSnapshot` throws `"Action requires authentication"`.
- This is caught by the generic catch block and shown as a snackbar.
- The error message is technical. A user-friendly message would be better.
- However, the `authGuard` should prevent unauthenticated access to `/attendance` entirely, so this is a defense-in-depth scenario.

---

### TC-19: Member with `membershipStatus: 'Active'` but `membershipExpiration` is null
**Preconditions:** Member has `membershipStatus: 'Active'`, `membershipExpiration: null`.
**Steps:** Select member → CHECK IN
**Expected:** Should be treated as active? Or inactive?
**Result:** ❌ FAIL — Incorrectly treated as inactive, triggering walk-in dialog.
**Details:**
- The `hasActiveSubscription` check is: `member.membershipStatus === 'Active' && !!member.membershipExpiration && !isExpired`
- If `membershipExpiration` is null/undefined, `!!member.membershipExpiration` is `false`, so `hasActiveSubscription` is `false`.
- This means a member marked as "Active" but without an expiration date is treated as a walk-in.
- `isMembershipExpired()` returns `false` when `membershipExpiration` is falsy, which is correct.
- But the combined logic creates a contradiction: the member is "Active" in status but the system treats them as not having an active subscription.
- **File:** `src/app/features/attendance/components/check-in-kiosk/check-in-kiosk.ts` line ~148
- **Fix:** Change the logic to: `const hasActiveSubscription = member.membershipStatus === 'Active' && (!member.membershipExpiration || !isExpired);` — i.e., if status is Active and either there's no expiration (lifetime/legacy) or the expiration hasn't passed.

---

### TC-20: Member with `membershipStatus: 'Pending'`
**Preconditions:** Member has `membershipStatus: 'Pending'`.
**Steps:** Select member → CHECK IN
**Expected:** Walk-in dialog shown (no active subscription).
**Result:** ✅ PASS — Correctly treated as not having active subscription.
**Notes:** `hasActiveSubscription` requires `membershipStatus === 'Active'`.

---

### TC-21: Locker selection toggle — Select then deselect
**Preconditions:** Member selected, shift open.
**Steps:** Click locker 3 → Click locker 3 again → CHECK IN
**Expected:** No locker assigned (toggled off).
**Result:** ✅ PASS
**Notes:** `selectLocker()` toggles: if same locker clicked, sets to `null`.

---

### TC-22: Subscription update dialog — Past date selected
**Preconditions:** Member expired, locker selected, update subscription flow.
**Steps:** SubscriptionUpdateDialog → Set expiration date to yesterday → "Update & Check-in"
**Expected:** Should warn or prevent past dates.
**Result:** ❌ FAIL — No validation on past dates.
**Details:**
- The `dateControl` only has `Validators.required`. There's no `min` date validator.
- A staff member could accidentally set the expiration to a past date, immediately making the member "expired" again.
- The member would be updated with a past expiration, then checked in. On next check-in, they'd be treated as expired again.
- **File:** `src/app/features/attendance/components/subscription-update-dialog/subscription-update-dialog.ts` line ~60
- **Fix:** Add a min date validator: `new FormControl(this.getDefaultDate(), [Validators.required])` and add `[min]="minDate"` to the datepicker where `minDate = new Date()`.

---

### TC-23: Walk-in dialog — `toDate()` crash on non-Timestamp expiration
**Preconditions:** Member has `membershipExpiration` as a plain Date object (not Firestore Timestamp).
**Steps:** CHECK IN → WalkInDialog opens
**Expected:** Dialog shows expiration date.
**Result:** ❌ FAIL — Template crash.
**Details:**
- The WalkInDialog template uses: `{{data.member.membershipExpiration?.toDate() | date}}`
- If `membershipExpiration` is a plain JS Date (which can happen after local mutation in the subscription update flow), `.toDate()` doesn't exist on Date objects.
- This would throw: `TypeError: data.member.membershipExpiration.toDate is not a function`
- **File:** `src/app/features/attendance/components/walk-in-dialog/walk-in-dialog.ts` template line ~8
- **Fix:** Use a safe conversion: `{{toDate(data.member.membershipExpiration) | date}}` with a helper method, or use optional chaining with fallback: `{{(data.member.membershipExpiration?.toDate ? data.member.membershipExpiration.toDate() : data.member.membershipExpiration) | date}}`

---

### TC-24: `doCheckIn` — `membershipExpiration.toDate()` crash
**Preconditions:** Member's `membershipExpiration` was just set via `Timestamp.fromDate()` in the subscription update flow.
**Steps:** After subscription update → `doCheckIn()` is called
**Expected:** Snackbar shows expiration date.
**Result:** ✅ PASS
**Notes:** `doCheckIn` safely handles both: `member.membershipExpiration.toDate ? member.membershipExpiration.toDate() : new Date(member.membershipExpiration)`. Good defensive coding.

---

### TC-25: Occupied lockers not refreshed after member gender change
**Preconditions:** Staff selects Male member → sees occupied lockers for Male → cancels → selects Female member.
**Steps:** Select Male member → Cancel → Select Female member → Select locker
**Expected:** Occupied lockers refreshed for Female gender.
**Result:** ✅ PASS
**Notes:** `onMemberSelected()` calls `getOccupiedLockers(member.gender)` every time a member is selected.

---

### TC-26: Search filter — Empty string shows all members
**Preconditions:** Members exist in database.
**Steps:** Click search field → Type nothing → View autocomplete
**Expected:** All members shown (or none until typing starts).
**Result:** ⚠️ WARNING — All members are shown on empty string.
**Details:**
- `_filter()` with empty string: `members.filter(member => member.name.toLowerCase().includes(''))` — `includes('')` always returns `true`.
- Combined with `startWith('')`, the autocomplete shows ALL members immediately.
- For a gym with hundreds of members, this creates a very long dropdown on focus.
- **File:** `src/app/features/attendance/components/check-in-kiosk/check-in-kiosk.ts` line ~100
- **Recommendation:** Add a minimum character threshold (e.g., 2 chars) before filtering, or limit results to 20.

---

### TC-27: Concurrent check-in from two devices — Same member
**Preconditions:** Two staff members on different devices, same member selected.
**Steps:** Both click CHECK IN at the same time.
**Expected:** Only one succeeds, the other gets "already checked in" error.
**Result:** ⚠️ WARNING — Race condition window exists.
**Details:**
- `AttendanceService.checkIn()` checks for existing active check-in via `firstValueFrom(this.getActiveCheckIns())`.
- `getActiveCheckIns()` uses `collectionData()` which is a real-time listener. `firstValueFrom` takes the first emission.
- Between the check and the `addDoc`, there's a window where both devices could pass the validation.
- Firestore doesn't have a native "unique constraint" on `memberId + status`.
- **Mitigation:** The window is very small (milliseconds). In practice, this is unlikely for a gym with a single front desk. But for multi-terminal setups, it's a real risk.
- **Fix:** Use a Firestore transaction or a dedicated "lock" document pattern.

---

### TC-28: `isSubmitting` not reset on RemarksDialog close via escape/backdrop
**Preconditions:** Member has remarks, RemarksDialog opens with `disableClose: true`.
**Steps:** RemarksDialog opens → (cannot close via escape due to disableClose) → Click "Close"
**Expected:** `isSubmitting` remains true during dialog, flow continues after.
**Result:** ✅ PASS
**Notes:** `disableClose: true` prevents escape/backdrop close. Both buttons return a result, so `firstValueFrom` always resolves.

---

### TC-29: LockerRestrictionDialog closed via escape/backdrop (no `disableClose`)
**Preconditions:** Member expired, locker selected.
**Steps:** CHECK IN → LockerRestrictionDialog opens → Press Escape
**Expected:** Dialog closes, check-in aborted, `isSubmitting` reset.
**Result:** ✅ PASS
**Notes:** When closed via escape, `result` is `undefined`. The code checks `if (!result || result.action === 'cancel')` which catches this.

---

### TC-30: WalkInDialog closed via escape/backdrop
**Preconditions:** Member expired, no locker.
**Steps:** CHECK IN → WalkInDialog opens → Press Escape
**Expected:** Dialog closes, check-in aborted.
**Result:** ✅ PASS
**Notes:** Same pattern — `if (!result || result.action === 'cancel')` handles undefined result.

---

### TC-31: SubscriptionUpdateDialog closed via escape
**Preconditions:** Member expired, locker selected, "Update Subscription" chosen.
**Steps:** LockerRestrictionDialog → "Update Subscription" → SubscriptionUpdateDialog → Press Escape
**Expected:** Check-in aborted.
**Result:** ✅ PASS

---

### TC-32: Checkout fails during walk-in transaction — Check-in still proceeds?
**Preconditions:** Member expired, walk-in selected, but checkout throws an error (e.g., product out of stock).
**Steps:** CHECK IN → WalkInDialog → "Yes (Walk-in)" → checkout() throws error
**Expected:** Error shown, check-in NOT created.
**Result:** ✅ PASS
**Notes:** The error propagates to the catch block in `confirmCheckIn()`, which shows the snackbar. `doCheckIn()` is never reached because the error is thrown before Step 3.

---

### TC-33: Checkout fails during subscription update payment — Member already updated
**Preconditions:** Member expired, locker selected, "Update, Pay & Check-in" chosen.
**Steps:** SubscriptionUpdateDialog → "Update, Pay & Check-in" → `updateMember()` succeeds → `checkout()` fails
**Expected:** Member expiration is updated but payment fails. Check-in NOT created.
**Result:** ❌ FAIL — Partial state corruption.
**Details:**
- The code first updates the member's subscription: `await this.memberService.updateMember(member.id!, { membershipExpiration: newExpiration, membershipStatus: 'Active' })`
- Then attempts checkout: `await this.storeService.checkout([...])`
- If checkout fails (product not found, shift closed between steps, etc.), the member's subscription is already updated in Firestore but no payment was recorded and no check-in was created.
- The member now has a free subscription extension with no payment trail.
- **File:** `src/app/features/attendance/components/check-in-kiosk/check-in-kiosk.ts` lines ~180-210
- **Fix:** Either:
  1. Wrap both operations in a Firestore batch/transaction, OR
  2. Reverse the order: attempt checkout first, then update member on success, OR
  3. Add a compensating action in the catch block to revert the member update.

---

### TC-34: Member with `gender` undefined or null
**Preconditions:** Member document has no `gender` field (data corruption or legacy data).
**Steps:** Select member → Select locker → CHECK IN
**Expected:** Should handle gracefully.
**Result:** ⚠️ WARNING — Partial handling.
**Details:**
- `onMemberSelected()` has a guard: `if (this.selectedMember && this.selectedMember.gender)` — so occupied lockers won't be fetched, meaning all lockers appear free.
- But `AttendanceService.checkIn()` writes `memberGender: member.gender` which would be `undefined`.
- The `getOccupiedLockers()` query filters by `memberGender`, so this record would never match any gender filter, effectively making the locker invisible to the occupied-locker check for all genders.
- **File:** `src/app/core/services/attendance.service.ts` line ~135
- **Fix:** Validate gender before allowing check-in, or default to a safe value.

---

### TC-35: `hasActiveSubscription` logic — Member with future `trainingExpiration` but expired `membershipExpiration`
**Preconditions:** Member has `membershipStatus: 'Active'`, `membershipExpiration` expired, `trainingExpiration` still valid.
**Steps:** Select member → CHECK IN
**Expected:** Depends on business rule — is training expiration sufficient for "active"?
**Result:** ⚠️ WARNING — `trainingExpiration` is completely ignored in the check-in flow.
**Details:**
- `hasActiveSubscription` only checks `membershipExpiration`. `trainingExpiration` is never evaluated.
- A member with valid training but expired membership is treated as a walk-in.
- This may be intentional (membership and training are separate products), but it's not documented.
- **File:** `src/app/features/attendance/components/check-in-kiosk/check-in-kiosk.ts` line ~148
- **Recommendation:** Clarify business rule. If training-only members should be treated as active for check-in purposes, update the logic.

---

### TC-36: `getActiveCheckIns()` has no limit — Unbounded read
**Preconditions:** Many members are checked in (e.g., 500+ if check-outs were missed over weeks).
**Steps:** Any check-in attempt triggers `firstValueFrom(this.getActiveCheckIns())`.
**Expected:** All active check-in records are fetched.
**Result:** ⚠️ WARNING — Potential performance and billing concern.
**Details:**
- `getActiveCheckIns()` queries `where('status', '==', 'Checked In')` with NO limit.
- If check-outs are missed (which the "overdue" indicator in ActiveSessions suggests happens), this collection grows unbounded.
- Every check-in attempt reads ALL active records to check for duplicates.
- **File:** `src/app/core/services/attendance.service.ts` line ~35
- **Fix:** Add a `limit()` or use a more targeted query: `where('memberId', '==', member.id)` + `where('status', '==', 'Checked In')` instead of fetching all active check-ins.

---

### TC-37: Attendance record stores stale member data
**Preconditions:** Member's name was recently changed from "John Doe" to "John Smith".
**Steps:** Check in "John Smith"
**Expected:** Attendance record has `memberName: "John Smith"`.
**Result:** ✅ PASS — Uses current member data at check-in time.
**Notes:** But historical records still show "John Doe". This is by design (denormalized snapshots), but worth noting for reporting accuracy.

---

### TC-38: `reset()` called during active dialog
**Preconditions:** Member selected, dialog is open.
**Steps:** While a dialog is open, somehow `reset()` is called (e.g., via "Cancel" button which is still visible behind the dialog on desktop).
**Expected:** Form resets, but dialog is still open.
**Result:** ⚠️ WARNING — The Cancel button is visible and clickable while dialogs are open.
**Details:**
- The Cancel button in the template is not disabled during dialog flows.
- If clicked while a dialog is open, `reset()` clears `selectedMember` and `selectedLocker`.
- When the dialog closes and the code tries to access `this.selectedMember`, it's null.
- The `if (!this.selectedMember)` guard at the top of `confirmCheckIn()` would catch this, but the dialog flow code doesn't re-check `selectedMember` after each dialog.
- **File:** `src/app/features/attendance/components/check-in-kiosk/check-in-kiosk.ts` template
- **Fix:** Disable the Cancel button while `isSubmitting` is true (it already is: `[disabled]="isSubmitting"`). ✅ Already handled.

---

## 3. Summary

| Category | Count |
|----------|-------|
| ✅ PASS | 22 |
| ⚠️ WARNING | 9 |
| ❌ FAIL | 4 |
| **Total** | **35** |

### Critical Bugs (❌ FAIL)

| ID | Title | Severity | File | Line |
|----|-------|----------|------|------|
| TC-16 | Member with no `id` — unguarded non-null assertion | High | `check-in-kiosk.ts` | ~170 |
| TC-19 | Active member with null expiration treated as walk-in | High | `check-in-kiosk.ts` | ~148 |
| TC-22 | Subscription update allows past expiration dates | Medium | `subscription-update-dialog.ts` | ~60 |
| TC-23 | WalkInDialog template crashes on non-Timestamp expiration | High | `walk-in-dialog.ts` | template ~8 |
| TC-33 | Subscription updated but payment fails — no rollback | High | `check-in-kiosk.ts` | ~180-210 |

### Warnings Requiring Attention

| ID | Title | Risk | Recommendation |
|----|-------|------|----------------|
| TC-12/13 | Product lookup by name is fragile | Medium | Use product flag or settings reference |
| TC-17 | Gender 'Other' locker segregation gap | Low | Query all occupied lockers or document behavior |
| TC-26 | Empty search shows all members | Low | Add minimum character threshold |
| TC-27 | Concurrent check-in race condition | Medium | Use Firestore transaction for atomicity |
| TC-35 | `trainingExpiration` ignored in active check | Medium | Clarify business rule and update logic |
| TC-36 | `getActiveCheckIns()` unbounded read | Medium | Add limit or use targeted member query |
