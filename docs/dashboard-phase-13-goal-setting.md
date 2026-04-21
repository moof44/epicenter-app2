# Phase 13: Per-Staff Goal Setting

> Part of: Staff Personal Dashboard Spec
> Focus: Admin-set or self-set monthly sales targets per staff — NEW FIRESTORE DATA

---

## 1. Goal

**Psychological driver:** Autonomy and personal accountability.

The gym-wide `monthlyQuota` (from `settings/general`) is a team target. It answers "Are we on track as a gym?" But it doesn't answer "Am I pulling my weight?" or "What should I personally aim for?"

Per-staff targets create personal accountability. A staff member with a ₱50,000 personal target thinks differently than one who only sees the gym's ₱150,000 target. The personal target is theirs — they own it, they track it, they feel the satisfaction of hitting it.

This also gives ADMIN/MANAGER a management tool: set realistic targets per staff based on their role, experience, and schedule (full-time vs part-time).

---

## 2. New Firestore Data

### Where to store targets

**Option A: Field on `users/{uid}` document**
- Add `monthlyTarget: number` to the existing user profile.
- Pro: 0 extra reads — the user profile is already loaded by `AuthService`.
- Con: Mixes operational data (target) with identity data (name, email, roles). Target changes trigger a re-emission of the entire `user$` Observable, which could cause unnecessary re-renders in components that subscribe to the user profile.

**Option B: Separate `staff_targets/{uid}` document**
- One document per staff with target + metadata.
- Pro: Clean separation. Target changes don't affect auth/profile streams.
- Con: 1 extra read per dashboard load.

**Option C: Field on `users/{uid}` with a nested object**
- `users/{uid}.targets.monthlySales: number`
- Pro: 0 extra reads. Nested object keeps it organized.
- Con: Same re-emission concern as Option A.

**Recommended: Option A — field on `users/{uid}`.**

The re-emission concern is theoretical. `AuthService.user$` already uses `shareReplay(1)` and the `userProfile` signal only triggers change detection when the value actually changes. Adding one number field to the user doc is the simplest approach with zero extra reads. The target is read on every dashboard load anyway — having it pre-loaded in the auth profile is ideal.

### Schema addition to `User` interface

```typescript
export interface User {
    uid: string;
    email: string;
    displayName: string;
    roles: string[];
    // ... existing fields ...
    
    // NEW: Per-staff monthly sales target
    monthlyTarget?: number;  // ₱ amount. null/undefined = no personal target set.
}
```

### Who sets the target

| Actor | Can set target for | How |
|-------|-------------------|-----|
| ADMIN | Any staff member | User Management page → edit user → "Monthly Target" field |
| MANAGER | Themselves only (optional) | Dashboard → tap the progress ring → "Set my target" |
| STAFF | Themselves only (optional) | Dashboard → tap the progress ring → "Set my target" |
| TRAINER | Not applicable | No sales target |

**Admin sets targets for the team.** This is the primary use case. The admin opens User Management, selects a staff member, and sets their monthly target alongside their other profile data.

**Self-set targets** are optional and secondary. A staff member can set their own target if the admin hasn't set one. If the admin later sets a target, it overrides the self-set one.

---

## 3. How the Monthly Progress Ring (Phase 3) Adapts

The Phase 3 ring currently shows gym-wide progress: `gymTotal / gymQuota * 100`.

With personal targets, the ring gains a second mode:

### Ring mode selection

| Condition | Ring shows | Label |
|-----------|-----------|-------|
| Staff has a personal `monthlyTarget` | `staffTotal / monthlyTarget * 100` | "Your Target" |
| Staff has no personal target | `gymTotal / gymQuota * 100` | "Gym Target" |
| Neither exists (quota = 0, no personal target) | Gray ring at 0% | "No target set" |

When a personal target exists, the ring becomes fully personal — "64% of YOUR ₱50,000 target" instead of "64% of the gym's ₱150,000 target."

### Both targets visible

When a personal target exists, show the gym target as a secondary line below the ring:

```
Ring: 64% of ₱50,000 (your target)
Below: Gym target: ₱98,000 / ₱150,000 (65%)
```

This gives the staff both perspectives — personal progress and team progress.

### Daily micro-target adaptation

When personal target exists:
- `dailyTarget = (monthlyTarget - staffTotal) / remainingDays`
- Text: "₱2,250 per day to hit your target"

When no personal target:
- Falls back to gym quota logic (existing Phase 3 behavior)

---

## 4. Refresh Behavior & Caching Tier

**Tier: 3 — Already Cached (via AuthService user profile)**

The `monthlyTarget` field lives on the `users/{uid}` document, which is already loaded by `AuthService.user$` (a real-time `docData` listener with `shareReplay(1)`).

| Trigger | Behavior |
|---------|----------|
| Dashboard load | Read `authService.userProfile()?.monthlyTarget`. Already in memory. 0 reads. |
| Admin changes the target | `AuthService.user$` listener fires (real-time). Dashboard ring updates automatically. |
| Staff sets their own target | Write to `users/{uid}`, listener fires, ring updates. |

**Firestore cost: 0 additional reads.** The user profile is already loaded.

---

## 5. Admin UI: Setting Targets for Staff

### Location: User Management page (`/users`)

Add a "Monthly Target" field to the existing user edit form/dialog.

**Field spec:**
- Label: "Monthly Sales Target"
- Type: Number input with ₱ prefix
- Placeholder: "Leave empty for no personal target"
- Validation: `min: 0`, optional (empty = no target)
- Position: After "Roles" field, before any action buttons

**Save mechanism:** The existing `UserService.updateUser()` calls a Cloud Function (`updateStaffAccount`). The Cloud Function would need to accept and write the `monthlyTarget` field to the user's Firestore document.

**Alternative (simpler):** Write `monthlyTarget` directly to Firestore from the client using `updateDoc(doc(firestore, 'users', uid), { monthlyTarget: value })`. This avoids modifying the Cloud Function. Security rules already allow admin writes to user documents.

### Bulk target setting (future enhancement)

For gyms with 10+ staff, setting targets one by one is tedious. A future enhancement could add a "Set Team Targets" page where the admin sees all staff in a table and sets targets inline. Not in scope for this phase.

---

## 6. Self-Set Target UI

### Location: Dashboard → Monthly Progress Ring → tap → bottom sheet or dialog

When the staff taps the progress ring (Phase 3 interaction), instead of just navigating to Monthly Sales, show a small dialog:

```
┌──────────────────────────────────────┐
│  Set Your Monthly Target             │
│                                      │
│  ₱ [________50,000_________]         │
│                                      │
│  This is your personal goal for      │
│  this month. Only you can see it.    │
│                                      │
│  [Cancel]              [Save Target] │
└──────────────────────────────────────┘
```

**Rules:**
- If admin already set a target, show it as read-only: "Your target: ₱50,000 (set by admin)"
- If no admin target, the staff can set their own
- Self-set targets are stored in the same `monthlyTarget` field
- No distinction between admin-set and self-set in the data model (simplicity over complexity)

**Write mechanism:**
```typescript
await updateDoc(doc(firestore, 'users', uid), { monthlyTarget: value });
```

Direct Firestore write. The `AuthService.user$` listener picks up the change automatically.

---

## 7. Copy & Wording

### Ring with personal target

| Element | Text |
|---------|------|
| Inside ring | "64%" |
| Below percentage | "of ₱50,000" |
| Contribution line | Replaced by: "₱32,000 earned this month" |
| Daily target | "₱2,250 per day to hit your target" |
| Gym context (secondary) | "Gym: ₱98,000 / ₱150,000" |

### Target met

| Element | Text |
|---------|------|
| Inside ring | "100%" |
| Below percentage | "Target reached! 🎉" |
| Below ring | "₱52,000 earned — ₱2,000 over target" |
| Daily target | Replaced by: "Keep the momentum going" |

### No target set (prompt)

When neither admin nor self has set a target:

Below the gym-progress ring, add a subtle link:
"Want to set a personal target? [Set target →]"

Tapping opens the self-set dialog.

---

## 8. Visual Design

No new widget — this phase modifies the existing Phase 3 Monthly Progress Ring.

### Changes to the ring card

When personal target exists:
- Ring color logic uses personal progress (not gym progress)
- "Your Target" label appears above the ring (small, muted)
- Gym progress shown as a single-line secondary metric below the ring
- "Set target" link hidden (target already exists)

When no personal target:
- Ring shows gym progress (existing Phase 3 behavior)
- "Set a personal target →" link appears below the daily target line
- Link style: 13px, `var(--mat-sys-primary)`, underline on hover

### Self-set dialog

- Width: 400px (desktop), 90vw (mobile)
- Single number input with ₱ prefix
- Helper text explaining it's personal and private
- Two buttons: Cancel (text) + Save (raised, primary)
- Follows existing dialog patterns in the project (`ShiftControlModal`, `CheckoutDialog`)

---

## 9. Role Visibility

| Role | Has personal target? | Can self-set? | Admin can set for them? |
|------|---------------------|--------------|------------------------|
| ADMIN | ✅ | ✅ | ✅ (by another admin) |
| MANAGER | ✅ | ✅ | ✅ |
| STAFF | ✅ | ✅ | ✅ |
| TRAINER | ❌ | ❌ | ❌ (no sales) |

---

## 10. Edge Cases

| Scenario | Behavior |
|----------|----------|
| Admin sets target to 0 | Treated as "no target." Ring falls back to gym quota mode. |
| Admin sets target, staff tries to change it | Dialog shows: "Your target: ₱50,000 (set by admin)" — read-only. Staff cannot override admin-set targets. |
| Staff sets own target, admin later sets a different one | Admin's value overwrites. Next `user$` emission updates the ring. |
| Target set mid-month | Ring immediately recalculates with the new target. No proration — if the target is ₱50,000 and it's day 20, the ring shows progress against the full ₱50,000. |
| Target higher than gym quota | Valid. A top performer might have a personal target of ₱80,000 against a gym quota of ₱150,000. |
| Target lower than current sales (already exceeded) | Ring shows 100%+. Celebration state: "Target reached!" |
| `monthlyTarget` field missing on user doc (legacy users) | `undefined` — treated as no personal target. Gym quota mode. |
| Multiple roles (ADMIN + STAFF) | Has personal target capability. Admin can also set targets for others. |

### Admin-set vs self-set distinction

The current design doesn't distinguish who set the target in the data model. If this becomes important later (e.g., "admin targets are mandatory, self-set are optional"), add a `targetSetBy: 'admin' | 'self'` field. Not needed for v1.

---

## 11. Component Changes

### Modified: `src/app/features/dashboard/widgets/monthly-progress/monthly-progress.ts`

Add:
- `personalTarget = computed(() => authService.userProfile()?.monthlyTarget || 0)`
- `hasPersonalTarget = computed(() => personalTarget() > 0)`
- `effectiveTarget = computed(() => hasPersonalTarget() ? personalTarget() : quota())`
- `effectiveProgress = computed(() => hasPersonalTarget() ? staffTotal() / personalTarget() * 100 : gymProgress())`
- `ringMode = computed(() => hasPersonalTarget() ? 'personal' : 'gym')`

### New: Target setting dialog

**File:** `src/app/features/dashboard/widgets/monthly-progress/set-target-dialog.ts`

Simple inline dialog component:
- `FormControl<number>` for the target input
- `Validators.min(0)`
- Save writes directly to Firestore: `updateDoc(doc(firestore, 'users', uid), { monthlyTarget })`

### Modified: User Management edit form

Add `monthlyTarget` number field to the existing user edit form. This is a minor addition to an existing component — not a new page.

---

## 12. Firestore Security Rules

The `users/{uid}` document already has security rules. The `monthlyTarget` field is just another field on the same document. No new rules needed unless we want to restrict who can write it:

```
match /users/{uid} {
    // Existing rules for admin write access
    allow read: if request.auth != null;
    allow write: if request.auth != null && (
        request.auth.uid == uid ||  // Self-update (for self-set target)
        request.auth.token.roles.hasAny(['ADMIN'])  // Admin can set for anyone
    );
}
```

**Note:** The existing Cloud Function (`updateStaffAccount`) handles admin writes. Self-set targets bypass the Cloud Function and write directly. The security rule above allows both paths.

---

## 13. Firestore Index Requirements

None. The `monthlyTarget` is read from the user's own document (already loaded by `AuthService`). No queries on this field.

---

## Next Step

Phase 14: Active Days Streak — tracking consecutive days of staff activity.
