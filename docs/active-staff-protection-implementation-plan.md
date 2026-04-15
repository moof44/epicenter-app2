# Implementation Plan: Proactive Staff Status Enforcement (Active Protection)

> Date: April 16, 2026
> Scope: Real-time session termination when a staff member's `isActive` flag is set to `false`
> Role: Senior Systems Analyst + Senior Angular Developer

---

## ⚠️ PRE-IMPLEMENTATION: Check Steering & Hooks

| Steering | Key Rules |
| --- | --- |
| `coding-standards.md` | `OnPush` on new/modified components. `inject()` pattern. No hardcoded hex colors. |
| `structure.md` | Services in `core/services/`. Guards in `core/guards/`. Audit trail: `lastModifiedBy` with `{ uid, name, timestamp }`. |
| `ux-guidelines.md` | `MatSnackBar` for async feedback. No empty white space while loading. |
| `business-rules.md` | No direct financial impact. Audit trail pattern applies to deactivation events. |
| `tech.md` | Angular 21, RxJS 7.8, Firebase Auth + Firestore. |

| Hook | Trigger | Action |
| --- | --- | --- |
| `code-quality-review` | On file edit | Analyze for code smells, patterns |
| `quality-assurance` | After task completion | QA attack mode, generate test report |
| `systems-documentation-update` | After task completion | Update `project-analysis.md` if logic changed |

---

## 1. Problem Statement

The current system relies on Firebase Auth account deactivation to block new logins and an "Emergency Logout" feature for manual session termination. However, there is a **security gap**: a staff member who is currently logged in when their account is deactivated in Firestore can continue to use their existing session for up to **60 minutes** (until the Firebase ID token expires). The client-side application does not proactively monitor the `isActive` flag in the Firestore user profile for real-time session termination.

## 2. Objectives

- **Zero-Latency Enforcement**: Terminate a staff member's session immediately when their `isActive` status is set to `false` in Firestore.
- **Granular Control**: Allow deactivation of specific users without requiring a system-wide "Emergency Logout."
- **Immutable Security**: Ensure route guards respect the `isActive` status as a prerequisite for any system interaction.

## 3. Technical Strategy

We will add a **separate side-effect subscription** in `AuthService` that monitors the `isActive` field from the existing `user$` stream. When the field transitions to `false`, the side-effect triggers `logout()` with a user-facing notification.

### 3.1 Architecture Overview

1. **AuthService Side-Effect**: Add a constructor subscription that watches `user$` for `isActive === false` transitions and triggers forced logout with a snackbar notification.
2. **Guard Strengthening**: Update `authGuard` to use `AuthService.user$` (Firestore-backed) instead of raw Firebase Auth state. Update `roleGuard` and `adminGuard` to add explicit `isActive` checks.
3. **Login Hardening**: Handle `auth/user-disabled` error code in the login component for deactivated accounts.

### 3.2 Critical Design Constraint — Do NOT Null the `user$` Stream

The `user$` observable feeds the `userProfile()` signal, which is consumed by **~20 call sites** across the codebase. Many of these are inside `_currentUserSnapshot` getters that **throw** when `userProfile()` is `null`:

```typescript
// MemberService, ProductService, ProgressService, AttendanceService, etc.
private get _currentUserSnapshot() {
    const user = this.authService.userProfile();
    if (!user) throw new Error('Action requires authentication');
    ...
}
```

If `user$` emits `null` for inactive users while the user is mid-session (e.g., during a checkout batch, shift close, or measurement save), these services will throw unhandled exceptions. The `CheckoutService.checkout()` reads `userProfile()` mid-batch — if the signal flips to `null` between batch build and commit, the transaction fails with a cryptic error, not a clean deactivation message.

**Rule**: The `user$` pipeline MUST continue emitting the full Firestore profile until `signOut()` clears the Firebase Auth state naturally. Session termination is handled by a **separate side-effect** that calls `logout()`, which triggers `signOut()` → `authState` emits `null` → `user$` emits `null` through the normal auth flow.

### 3.3 `isActive` Field Semantics

The `User` model defines `isActive?: boolean` (optional). The three possible states:

| Value | Meaning | Treatment |
| --- | --- | --- |
| `true` | Active account | Allow access |
| `false` | Deactivated account | Trigger logout / block access |
| `undefined` | Legacy user or field not yet set | **Treat as active** (do not lock out) |

**All checks MUST use `=== false`**, never `!isActive`, to avoid locking out legacy users where the field doesn't exist.

---

## 4. Current State Analysis

### AuthService (`src/app/core/services/auth.service.ts`)

```typescript
// Current user$ pipeline — no isActive awareness
user$ = authState(this.auth).pipe(
    switchMap(user => {
        if (!user) return of(null);
        return docData(doc(this.firestore, 'users', user.uid));
    }),
    shareReplay(1)
);

// Signal derived from user$
userProfile = toSignal(this.user$ as Observable<AppUser | null>, { initialValue: null });

// Existing Emergency Logout listener in constructor
// Watches system/settings.minAuthTimestamp for system-wide force logout
```

### AuthGuard (`src/app/core/guards/auth.guard.ts`)

```typescript
// Current — uses raw Firebase Auth, no Firestore awareness
return user(auth).pipe(
    take(1),
    map(currentUser => {
        if (currentUser) return true;
        return router.createUrlTree(['/login']);
    })
);
```

**Problem**: Checks Firebase Auth state only. A deactivated user whose Auth account is disabled will still pass this guard until their cached token expires (~60 min). And if only the Firestore `isActive` flag is set to `false` (without disabling Auth), this guard has zero awareness.

### RoleGuard (`src/app/core/guards/role.guard.ts`)

```typescript
// Current — checks roles from user$ but no isActive check
return authService.user$.pipe(
    take(1),
    map(user => {
        if (user && user['roles'] && requiredRoles.some(role => user['roles'].includes(role))) {
            return true;
        }
        // ... redirect
    })
);
```

### AdminGuard (`src/app/core/guards/admin.guard.ts`)

```typescript
// Current — uses synchronous signal, no isActive check
if (authService.isAdmin()) return true;
// ... redirect
```

**Problem**: Not mentioned in the original plan. Uses `isAdmin()` which reads `userProfile()`. If the user is deactivated but still has ADMIN role, this guard passes. Needs `isActive` check.

### LoginComponent (`src/app/features/auth/components/login/login.component.ts`)

```typescript
// Current error handling — no auth/user-disabled case
error: (err: any) => {
    let message = 'Login failed. Please try again.';
    if (err.code === 'auth/invalid-credential') {
        message = 'Invalid email or password.';
    } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        message = 'Invalid email or password.';
    }
}
```

**Problem**: The Cloud Function `toggleStaffStatus` sets `disabled: !isActive` on the Firebase Auth account. When a deactivated user tries to log in, `signInWithEmailAndPassword` throws `auth/user-disabled`. This error code is not handled — the user sees a generic "Login failed" message.

---

## 5. Implementation Steps

### Phase 1: AuthService — Add Active Status Side-Effect

**File**: `src/app/core/services/auth.service.ts`

**What changes**: Add a new subscription in the constructor that monitors `user$` for `isActive === false` and triggers forced logout with a snackbar notification.

**What does NOT change**: The `user$` pipeline itself. It continues to emit the full Firestore profile. No `map` or `filter` operator is added to null out inactive users.

**New dependency**: Inject `MatSnackBar` into `AuthService`.

```typescript
import { MatSnackBar } from '@angular/material/snack-bar';

// ... inside the class:
private snackBar = inject(MatSnackBar);

// In constructor, AFTER the existing Emergency Logout listener:

// Active Status Protection — force logout when isActive flips to false
this.user$.pipe(
    map((profile: any) => profile?.isActive),
    distinctUntilChanged()
).subscribe((isActive: boolean | undefined) => {
    // Only react to explicit false (not undefined/null from logout or legacy users)
    if (isActive === false && this.auth.currentUser) {
        this.snackBar.open(
            'Your account has been deactivated. Contact an administrator.',
            'Close',
            { duration: 8000, panelClass: ['error-snackbar'] }
        );
        this.logout().subscribe();
    }
});
```

**Key safeguards**:

- `distinctUntilChanged()` — prevents re-triggering on every Firestore snapshot re-emit. Only fires when `isActive` actually changes value.
- `this.auth.currentUser` null check — prevents triggering during normal logout flow (when `user$` emits `null` → `isActive` becomes `undefined`). Without this, the subscription would try to logout an already-logged-out user.
- `=== false` — does NOT trigger for `undefined` (legacy users) or `null` (logged-out state).
- Snackbar shown BEFORE logout — gives the user a visible explanation.

**Why not modify `user$`?** See Section 3.2. Emitting `null` from `user$` for inactive users would crash `_currentUserSnapshot` in ~6 services mid-operation.

**Interaction with Emergency Logout listener**: Both subscriptions call `this.logout().subscribe()`. If both fire simultaneously (unlikely but possible if admin deactivates a user AND triggers emergency logout at the same time), the second `signOut()` call is a no-op (Firebase Auth handles it gracefully). The `distinctUntilChanged()` on both subscriptions prevents re-triggering loops.

### Phase 2: Guard Enforcement

#### 2a. AuthGuard — Hybrid Auth + Firestore Check

**File**: `src/app/core/guards/auth.guard.ts`

**Current problem**: Uses `user(auth)` from `@angular/fire/auth` which only checks Firebase Auth state. Has no awareness of Firestore `isActive` field.

**Change**: Use a **hybrid two-step approach**:
1. **Step 1** — Fast Firebase Auth check via `user(auth)`. This resolves immediately after login (no network hop). If the user is not authenticated, redirect to `/login` right away.
2. **Step 2** — If authenticated, check `AuthService.user$` for the Firestore profile. Use `filter(!!profile)` to skip stale `null` values from `shareReplay(1)` that may still be cached from before login. Then check `isActive === false`.

**Why not use `user$` alone?** On a fresh login, `authState` emits the new Firebase user, but the `switchMap` to Firestore `docData` hasn't resolved yet. `shareReplay(1)` still holds the previous `null`. Using `take(1)` on `user$` would grab that stale `null` and bounce the user back to `/login` — which is exactly the bug we hit.

```typescript
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth, user } from '@angular/fire/auth';
import { AuthService } from '../services/auth.service';
import { map, take, switchMap, filter } from 'rxjs/operators';

export const authGuard: CanActivateFn = (_route, _state) => {
    const auth = inject(Auth);
    const authService = inject(AuthService);
    const router = inject(Router);

    // Step 1: Fast Firebase Auth check (resolves immediately after login)
    return user(auth).pipe(
        take(1),
        switchMap(currentUser => {
            if (!currentUser) {
                return [router.createUrlTree(['/login'])];
            }

            // Step 2: Wait for Firestore profile, then check isActive
            return authService.user$.pipe(
                filter((profile): profile is Record<string, any> => !!profile),
                take(1),
                map(profile => {
                    if (profile['isActive'] === false) {
                        return router.createUrlTree(['/login']);
                    }
                    return true;
                })
            );
        })
    );
};
```

#### 2b. RoleGuard — Add `isActive` Check

**File**: `src/app/core/guards/role.guard.ts`

**Change**: Add `isActive === false` check before the role check. Also remove `console.warn` per steering ("remove `console.log`").

```typescript
return authService.user$.pipe(
    take(1),
    map(user => {
        // Block deactivated users
        if (user && user['isActive'] === false) {
            return router.createUrlTree(['/login']);
        }

        // Check if user has permission
        if (user && user['roles'] && requiredRoles.some(role => user['roles'].includes(role))) {
            return true;
        }

        // Permission denied handling
        if (user) {
            snackBar.open('Access Denied: You do not have permission to view this page.', 'Close', {
                duration: 5000,
                panelClass: ['error-snackbar']
            });
        }

        return router.createUrlTree(['/']);
    })
);
```

#### 2c. AdminGuard — Add `isActive` Check

**File**: `src/app/core/guards/admin.guard.ts`

**Current problem**: Not mentioned in the original plan. Uses `authService.isAdmin()` synchronously. If a user is deactivated but still has ADMIN role, this guard passes.

**Change**: Add `isActive` check before the admin check.

```typescript
export const adminGuard: CanActivateFn = (_route, _state) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const snackBar = inject(MatSnackBar);

    const user = authService.userProfile();

    // Block deactivated users
    if (user && user.isActive === false) {
        return router.createUrlTree(['/login']);
    }

    if (authService.isAdmin()) {
        return true;
    }

    snackBar.open('Permission Denied: Admins only.', 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
    });

    return router.createUrlTree(['/']);
};
```

### Phase 3: Login Component — Handle Deactivated Account Error

**File**: `src/app/features/auth/components/login/login.component.ts`

**What happens today**: The Cloud Function `toggleStaffStatus` calls `admin.auth().updateUser(uid, { disabled: !isActive })`. When a deactivated user tries to log in, `signInWithEmailAndPassword` throws error code `auth/user-disabled`. The current login component doesn't handle this code — the user sees a generic "Login failed" message.

**Change**: Add `auth/user-disabled` to the error handling. Also remove `console.error` per steering.

```typescript
this.authService.login(email, password, rememberMe).subscribe({
    next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/']);
    },
    error: (err: any) => {
        let message = 'Login failed. Please try again.';
        if (err.code === 'auth/user-disabled') {
            message = 'Your account has been deactivated. Contact an administrator.';
        } else if (err.code === 'auth/invalid-credential') {
            message = 'Invalid email or password.';
        } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
            message = 'Invalid email or password.';
        }

        this.snackBar.open(message, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
        });
        this.isLoading.set(false);
    }
});
```

**Edge case — Firestore-only deactivation**: If someone manually sets `isActive: false` in Firestore without calling the Cloud Function (bypassing Auth disable), the login will succeed at the Auth level. The user will briefly see the dashboard, then the AuthService side-effect (Phase 1) will detect `isActive === false` and force logout with the snackbar. This is acceptable — the window is <1 second and no data mutation can happen because the guards also check `isActive`.

---

## 6. Security & Business Rule Alignment

- **Rule 6.2 (Firestore Timestamps)**: Status changes continue to use server timestamps for audit logs (handled by the `toggleStaffStatus` Cloud Function).
- **Audit Trail**: Deactivation events are logged by the existing `toggleStaffStatus` Cloud Function. No additional audit logging needed on the client.
- **Redundancy**: This client-side enforcement is a **secondary layer**. The primary layer remains the Cloud Function disabling the Firebase Auth account. The client-side layer closes the gap for already-authenticated sessions.
- **No `user$` contract change**: The `user$` stream continues to emit full profiles. All 20+ consumers (`_currentUserSnapshot`, dashboard widgets, POS, etc.) are unaffected.

---

## 7. Verification Plan (QA Attack)

### 7.1 Happy Path

1. Log in as a Staff member.
2. Open the system in a second window as an Admin.
3. Admin deactivates the Staff member via User Management.
4. **Expectation**: The Staff member's window should immediately redirect to the Login page with a "Your account has been deactivated" snackbar notification.

### 7.2 Negative Testing

1. **Direct URL Access**: After deactivation, attempt to navigate to `/members` or `/store/pos` manually via the address bar.
   - *Expectation*: `authGuard` checks `isActive !== false` and redirects to `/login`.
2. **Cached State / Remember Me**: Close the browser, reopen, navigate to the app.
   - *Expectation*: Firebase Auth restores the session, `user$` fetches the Firestore profile, finds `isActive === false`, side-effect triggers logout.
3. **Login attempt after deactivation**: Try to log in with the deactivated account's credentials.
   - *Expectation*: `signInWithEmailAndPassword` throws `auth/user-disabled`. Snackbar shows "Your account has been deactivated."
4. **Admin route access**: Deactivated admin tries to access `/settings` or `/users`.
   - *Expectation*: `adminGuard` checks `isActive === false` and redirects to `/login`.

### 7.3 Edge Cases

1. **Network Offline**: Status changes while the staff member is offline.
   - *Expectation*: Firestore's offline persistence shows the last known "Active" state. Upon reconnecting, the real-time listener (`user$` via `docData`) receives the updated profile with `isActive: false`, triggering the side-effect logout.
2. **Race Condition — Deactivation during `checkout()`**: Admin deactivates a user exactly during a checkout batch.
   - *Expectation*: The `writeBatch` in `CheckoutService.checkout()` is atomic. If the batch has already been built and `commit()` is in flight, it completes (Firestore doesn't check client auth state during a batch commit). The side-effect logout fires after the batch resolves. This is acceptable — the transaction is valid because the user was active when they initiated it.
   - If the batch has NOT yet been built, `_currentUserSnapshot` still returns the profile (because `user$` has not been nulled — only `signOut()` does that). The batch builds and commits normally. The logout fires immediately after.
   - **No data corruption risk**: The `user$` stream is NOT modified. `userProfile()` remains non-null until `signOut()` completes.
3. **Legacy users without `isActive` field**: Users created before this field existed.
   - *Expectation*: `isActive` is `undefined`. All checks use `=== false`, so `undefined` is treated as active. No lockout.
4. **Double-trigger with Emergency Logout**: Admin deactivates a user AND triggers emergency logout simultaneously.
   - *Expectation*: Both subscriptions call `this.logout().subscribe()`. The second `signOut()` is a no-op. `distinctUntilChanged()` on both prevents re-triggering. No loop.

---

## 8. Firestore Cost Analysis

| Operation | Reads | Writes | Notes |
| --- | --- | --- | --- |
| Active status monitoring | 0 additional | 0 | Piggybacks on existing `user$` real-time listener |
| Guard checks | 0 additional | 0 | Uses cached `shareReplay(1)` value from `user$` |
| Login deactivation check | 0 | 0 | Error comes from Firebase Auth, not Firestore |

**Total additional Firestore cost: Zero.** The `user$` stream already listens to the user's Firestore profile in real-time. The `isActive` field is part of that document. No new listeners or queries are created.

---

## 9. Implementation Phases & Review Checkpoints

### Review: Phase 1 — AuthService Side-Effect

**Files modified:**

- `src/app/core/services/auth.service.ts` — add `MatSnackBar` injection, add `isActive` monitoring subscription

**Risk**: LOW — adds a new subscription alongside the existing Emergency Logout listener. Does not modify the `user$` pipeline or any existing behavior.

**Review checkpoint:**

- [ ] `ng build` passes
- [ ] `user$` pipeline is UNCHANGED (no `map`/`filter` added)
- [ ] `distinctUntilChanged()` used on `isActive` value
- [ ] `this.auth.currentUser` null check prevents triggering during normal logout
- [ ] `=== false` used (not `!isActive`)
- [ ] Snackbar shown before logout

### Review: Phase 2 — Guard Enforcement

**Files modified:**

- `src/app/core/guards/auth.guard.ts` — hybrid: keep `user(auth)` for fast auth check, add `user$` for `isActive` check
- `src/app/core/guards/role.guard.ts` — add `isActive === false` check, remove `console.warn`, rename `state` → `_state`
- `src/app/core/guards/admin.guard.ts` — add `isActive === false` check

**Risk**: MEDIUM — changing `authGuard` from Firebase Auth to Firestore-backed check. Must verify timing on cold start.

**Review checkpoint:**

- [ ] `ng build` passes
- [ ] `authGuard` uses hybrid approach: `user(auth)` for fast auth + `user$` with `filter` for `isActive`
- [ ] All three guards check `isActive === false` (not `!isActive`)
- [ ] `roleGuard` no longer has `console.warn`
- [ ] Cold start navigation works (guard waits for `user$` to emit)
- [ ] Logged-out user is redirected to `/login` (not stuck in a loop)

### Review: Phase 3 — Login Error Handling

**Files modified:**

- `src/app/features/auth/components/login/login.component.ts` — add `auth/user-disabled` error case, remove `console.error`

**Risk**: LOW — adding an error code branch to existing error handling.

**Review checkpoint:**

- [ ] `ng build` passes
- [ ] `auth/user-disabled` shows "Your account has been deactivated" message
- [ ] `console.error` removed
- [ ] Other error codes still handled correctly

---

## 10. Files Summary

| File | Action | Phase |
| --- | --- | --- |
| `src/app/core/services/auth.service.ts` | Modify (add isActive side-effect, inject MatSnackBar, remove console.warn from Emergency Logout) | 1 |
| `src/app/core/guards/auth.guard.ts` | Modify (hybrid auth + isActive check) | 2 |
| `src/app/core/guards/role.guard.ts` | Modify (add isActive check, remove console.warn, rename state → _state) | 2 |
| `src/app/core/guards/admin.guard.ts` | Modify (add isActive check) | 2 |
| `src/app/features/auth/components/login/login.component.ts` | Modify (add auth/user-disabled handling, remove console.error) | 3 |
