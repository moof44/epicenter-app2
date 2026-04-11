# NgRx Signal Store — Implementation Plan (v2)

> Role: Senior Angular Architect & Implementation Expert
> Date: April 12, 2026
> Revision: v2 — incorporates architectural audit and implementation review findings

---

## Goal

Introduce `@ngrx/signals` SignalStore as the state management layer for client-side state in the Epicenter gym-app. Services remain as the Firestore data access layer. Components consume stores for state and services for one-off queries/writes.

---

## Current State Analysis

### State Patterns in Use

| Service | State Mechanism | Consumers | Complexity |
| --- | --- | --- | --- |
| AuthService | `toSignal(user$)` + computed signals | 13 files | Medium |
| CashRegisterService | `BehaviorSubject<ShiftSession>` | 6 files | High |
| StoreService | `BehaviorSubject<CartItem[]>` + `Subject<SaleCompletedEvent>` | 8 files | Very High |
| SettingsService | `shareReplay(1)` Observable cache | 4 files | Low |
| ReportStateService | `Map<string, Observable>` caches | 3 files | Medium |
| MemberService | Stateless (Firestore Observables) | 5 files | Low |
| AttendanceService | Stateless + `BehaviorSubject<void>` event emitter | 4 files | Low |
| UserService | Stateless (Cloud Function calls) | 2 files | Low |
| ProgressService | Stateless (Firestore queries) | 2 files | Low |
| PurchaseService | Stateless (batch write) | 1 file | Low |
| ReportsService | Stateless (aggregation) | 1 file | Low |
| InventoryHistoryService | Stateless (paginated query) | 1 file | Low |

### Migration Candidates

Only services with client-side state benefit from SignalStore:

| Priority | Store | Source Service | Rationale |
| --- | --- | --- | --- |
| 1 (Proof of concept) | CartStore | StoreService | Purely client-side, self-contained, 2 files affected, zero Firestore risk |
| 2 (Foundation) | AuthStore | AuthService | 13 consumers, simple state shape, every other store depends on it |
| 3 (High complexity) | ShiftStore | CashRegisterService | 6 consumers, complex lifecycle, requires read-only wrapper strategy |
| 4 (Low risk) | SettingsStore | SettingsService | 4 consumers, single document, must preserve real-time listener |

### Explicitly NOT Migrating

| Service | Reason |
| --- | --- |
| MemberService | Stateless CRUD. `getMembers()` returns a live Firestore Observable. Components subscribe on mount, unsubscribe on destroy — more memory-efficient than a singleton store holding 200+ member docs permanently. |
| AttendanceService | Stateless queries + a `BehaviorSubject<void>` refresh trigger (event emitter, not state). |
| UserService | Stateless Cloud Function calls. No client state. |
| ProgressService | Stateless Firestore sub-collection queries. |
| PurchaseService | Write-only batch operations. No state. |
| ReportsService | Pure computation/aggregation over fetched data. No state. |
| InventoryHistoryService | Paginated query service. No state. |
| ReportStateService | Uses `shareReplay({ refCount: true })` which tears down Firestore listeners when all subscribers disconnect. A singleton store would keep listeners alive forever — worse for billing on infrequently viewed reports. Current pattern is more efficient. |

`withEntities()` from `@ngrx/signals/entities` was considered for products/members but rejected — those are Firestore-streamed collections, not client-managed entity state.

---

## Architecture Rules

### 1. Layering

```
Components → Stores (state reads + actions) → Services (Firestore access)
```

- Components inject stores for state, services for one-off queries
- Stores inject services for Firestore reads/writes
- Services NEVER inject stores (prevents circular dependencies)
- Services that need auth info continue using `AuthService` (which delegates to `AuthStore` internally)

### 2. Store Location & Naming

- All stores in `src/app/core/store/`
- One file per domain: `auth.store.ts`, `shift.store.ts`, `cart.store.ts`, `settings.store.ts`
- Export names: `AuthStore`, `ShiftStore`, `CartStore`, `SettingsStore`
- Stores are `providedIn: 'root'` singletons (via `signalStore`)

### 3. Observable-to-Signal Bridging

- Use `rxMethod()` from `@ngrx/signals/rxjs-interop` for subscribing to Firestore Observables inside stores
- Never use manual `.subscribe()` inside `withMethods()`

### 4. No UI Side Effects in Stores

- Stores must NOT inject `MatDialog`, `MatSnackBar`, `Router`, or any UI service
- UI side effects (dialogs, navigation, snackbars) remain in components or coordinator services
- Stores expose state signals; components react to them

### 5. Backward Compatibility During Transition

- Services keep deprecated wrapper properties that delegate to the store
- Wrappers are removed in Phase 5 (cleanup) after all phases are complete and tested
- During transition, some components read from stores, others from services — both point to the same underlying state

### 6. No Firestore Billing Change

- Stores wrap existing Firestore listeners, they don't create new ones
- Cart state is purely client-side (zero Firestore reads)
- SettingsStore must subscribe to the real-time `docData()` listener (not one-time `getDoc`) to preserve current behavior

---

## Phased Implementation

### Phase 0: Install & Setup

**Scope:** Install `@ngrx/signals`, create folder structure, update steering.

**Changes:**
- `npm install @ngrx/signals`
- Create `src/app/core/store/` directory
- Update `.kiro/steering/tech.md` to include `@ngrx/signals` in the stack

**Risk:** Zero — no runtime changes.

---

### Phase 1: CartStore (Proof of Concept)

**Why first:** Validates the ngrx/signals setup, build pipeline, and developer familiarity with the lowest possible risk. The cart is purely client-side, self-contained, and only POS consumes it. If this fails, only the POS page is affected.

**State shape:**

```typescript
type CartState = {
  items: CartItem[];
};
```

**Computed signals:** `total`, `itemCount`, `isEmpty`

**Methods:** `addItem()`, `updateQuantity()`, `updatePrice()`, `removeItem()`, `clear()`

**What changes:**
- New: `src/app/core/store/cart.store.ts`
- Modified: `src/app/core/services/store.service.ts` — remove `BehaviorSubject<CartItem[]>`, add deprecated wrappers (`cart$`, `getCartTotal()`) that delegate to CartStore
- Modified: `src/app/features/store/components/pos/pos.ts` + `.html` — read from CartStore

**Files affected:** 3 (1 new, 2 modified)

**Overlap with other phases:** None. POS also uses AuthService and CashRegisterService, but this phase only touches cart-related code.

**System stability:** Full. Checkout in StoreService reads cart items from CartStore instead of its own BehaviorSubject — same data, different container.

---

### Phase 2: AuthStore (Foundation)

**Why second:** Now that the ngrx/signals pattern is validated, we establish the auth foundation. Every other store and most components depend on auth state. Simple state shape (one user object + computed booleans) but high consumer count.

**State shape:**

```typescript
type AuthState = {
  user: AppUser | null;
  isLoading: boolean;
};
```

**Computed signals:** `isLoggedIn`, `isAdmin`, `roles`, `displayName`, `uid`

**Methods:** `loadUser()` (uses `rxMethod` to subscribe to auth pipeline), `login()`, `logout()`, `hasAnyRole()`

**What changes:**
- New: `src/app/core/store/auth.store.ts`
- Modified: `src/app/core/services/auth.service.ts` — `userProfile`, `isLoggedIn`, `isAdmin` become thin wrappers delegating to AuthStore. Services that use `authService.userProfile()` (MemberService, StoreService, SettingsService) continue working unchanged.
- Modified: `src/app/app.ts` — reads from AuthStore
- Modified: Guards (`auth.guard.ts`, `role.guard.ts`, `admin.guard.ts`) — read from AuthStore
- Modified: `login.component.ts` — calls `authStore.login()`
- Modified: `general-settings.ts` — reads from AuthStore
- Modified: `quota-status-widget.ts` — reads from AuthStore

**Files affected:** 8 (1 new, 7 modified)

**Critical detail — emergency logout listener:** The `system/settings` Firestore listener for emergency logout stays on `AuthService` (not the store). The service reads `authStore.user()` to check auth time. This keeps the side effect (force logout + navigation) out of the store.

**Critical detail — service layering:** `MemberService`, `StoreService`, and `SettingsService` continue injecting `AuthService` for `_currentUserSnapshot`. They do NOT inject `AuthStore`. `AuthService.userProfile()` delegates to `authStore.user()` internally — transparent to consumers.

**Overlap with later phases:** `pos.ts`, `cash-management.ts`, and `shift-control-modal.ts` are touched here (auth reads) and will be touched again in Phase 3 (shift reads). This is documented and expected. Phase 3 assumes Phase 2 is complete and committed.

**System stability:** Full, provided `authStore.user()` returns the correct value during app initialization. The `loadUser()` method must subscribe to the auth pipeline immediately on store creation (via `withHooks({ onInit })`) to avoid a timing gap where guards see `null` and redirect to login.

---

### Phase 3: ShiftStore (Read-Only Wrapper)

**Why third:** The shift is the second most cross-cutting state. This phase uses a read-only wrapper strategy to minimize risk.

**Strategy: Read-only wrapper, NOT full migration.**

The `BehaviorSubject<ShiftSession>` stays on `CashRegisterService`. The store wraps it via `toSignal(cashRegisterService.currentShift$)`. This eliminates the circular dependency risk (store doesn't write to service, service doesn't read from store). The store adds computed signals on top. Components migrate from `cashRegisterService.currentShift$ | async` to `shiftStore.currentShift()`.

Full BehaviorSubject removal happens in Phase 5 (cleanup) after stability is confirmed.

**State shape:**

```typescript
// No patchState — state is derived from service Observable
type ShiftState = {
  currentShift: ShiftSession | null;
};
```

**Computed signals:** `isShiftOpen`, `shiftId`, `shiftSummary`, `todayTransactions`, `expectedBalance`, `isStale` (computed from shift date vs today)

**Methods:** Thin wrappers that delegate to `CashRegisterService`: `refreshShift()`, `openShift()`, `closeShift()`, `addCashTransaction()`, `addExpense()`, `addFloatIn()`, `addFloatOut()`, `recalculateShiftTotals()`

**What does NOT move to the store:**
- `ensureValidShiftForTransaction()` — stays on `CashRegisterService` because it opens `MatDialog` (UI side effect). Components call `cashRegisterService.ensureValidShiftForTransaction()` directly, or we extract it to a coordinator.
- The `isStaleDialogOpen` guard flag — stays on `CashRegisterService` (UI concern).
- All Firestore write operations — stay on `CashRegisterService`.

**What changes:**
- New: `src/app/core/store/shift.store.ts`
- Modified: `src/app/features/store/components/shift-status-widget/shift-status-widget.ts` — reads from ShiftStore
- Modified: `src/app/features/store/components/cash-management/cash-management.ts` + `.html` — reads from ShiftStore
- Modified: `src/app/features/store/components/shift-control-modal/shift-control-modal.ts` — reads from ShiftStore
- Modified: `src/app/features/store/components/pos/pos.ts` — reads `shiftStore.isShiftOpen()` instead of `cashRegisterService.currentShift$.pipe(map(...))`
- Modified: `src/app/features/attendance/components/check-in-kiosk/check-in-kiosk.ts` — reads `shiftStore.isShiftOpen()`
- Dead import cleanup: remove unused `inject(StoreService)` from `CashRegisterService`

**Files affected:** 8 (1 new, 7 modified)

**Overlap with Phase 2:** `pos.ts`, `cash-management.ts`, `shift-control-modal.ts` were already modified in Phase 2 (auth reads). Phase 3 modifies the shift-related code in the same files. No conflict — different injection lines and template bindings.

**System stability:** Full. The BehaviorSubject remains the single source of truth. The store is a read-only projection. If the store breaks, removing it and reverting to `currentShift$ | async` is a clean rollback.

---

### Phase 4: SettingsStore

**Why last:** Lowest consumer count, simplest state, least risk.

**Critical requirement:** Must subscribe to the real-time `docData()` listener, NOT use one-time `getDoc()`. The `QuotaStatusWidget` is always visible in the sidebar and must reflect quota changes made by admins in real-time.

**State shape:**

```typescript
type SettingsState = {
  settings: GeneralSettings;
  isLoaded: boolean;
};
```

**Computed signals:** `monthlyQuota`

**Methods:** `loadSettings()` (uses `rxMethod` to subscribe to `docData` pipeline), `saveSettings()`

**What changes:**
- New: `src/app/core/store/settings.store.ts`
- Modified: `src/app/core/services/settings.service.ts` — `getSettings()` Observable cache removed, replaced by store. `getSettingsOnce()` and `saveSettings()` stay as Firestore access methods.
- Modified: `src/app/core/components/quota-status-widget/quota-status-widget.ts` — reads from SettingsStore
- Modified: `src/app/features/settings/components/general-settings/general-settings.ts` — reads/writes via SettingsStore
- Modified: `src/app/features/store/components/sales-analytics/sales-analytics.ts` — reads from SettingsStore
- Modified: `src/app/features/store/components/monthly-sales-report/monthly-sales-report.ts` — reads from SettingsStore

**Files affected:** 6 (1 new, 5 modified)

**Overlap with other phases:** None. No file touched in Phases 1-3 is touched here.

**System stability:** Full.

---

### Phase 5: Cleanup & Deprecation Removal

**Scope:** Remove all backward-compatible wrappers, dead imports, and unused BehaviorSubjects.

**What changes:**
- `AuthService` — remove `userProfile`, `isLoggedIn`, `isAdmin` wrapper signals. Keep `user$` Observable for the emergency logout listener only.
- `StoreService` — remove `cart$`, `cartItems` BehaviorSubject, `getCartTotal()`. Checkout reads from `CartStore` directly.
- `CashRegisterService` — evaluate if `BehaviorSubject<ShiftSession>` can be fully removed (if all consumers are on ShiftStore). If yes, remove it and have the store own the state via `patchState`. If any service still reads it, keep it.
- `SettingsService` — remove `settings$` Observable cache.
- Remove unused `async` pipes from templates that were replaced by signal reads.
- Remove unused RxJS imports (`BehaviorSubject`, `shareReplay`, etc.) from cleaned services.

**Prerequisite:** All 4 phases complete, manually tested, and stable in production for at least one operational cycle (1 week recommended).

**Risk:** Medium — removing wrappers is a breaking change for any code still using the old API. Must verify zero remaining consumers before removal.

---

## Phase Dependency Map

```
Phase 0 (Install) → no dependencies
Phase 1 (CartStore) → depends on Phase 0
Phase 2 (AuthStore) → depends on Phase 0
Phase 3 (ShiftStore) → depends on Phase 0 + Phase 2 (3 overlapping files)
Phase 4 (SettingsStore) → depends on Phase 0
Phase 5 (Cleanup) → depends on ALL phases complete
```

Phases 1, 2, and 4 are independent of each other and can be executed in any order. Phase 3 must follow Phase 2 due to file overlap. Phase 5 must be last.

---

## Rollback Strategy

| Phase | Rollback method | Blast radius |
| --- | --- | --- |
| Phase 0 | `npm uninstall @ngrx/signals`, delete folder | Zero |
| Phase 1 | Revert commit, restore BehaviorSubject in StoreService | POS page only |
| Phase 2 | Revert commit, restore signals on AuthService | All authenticated routes (high) |
| Phase 3 | Remove store file, revert to `currentShift$ \| async` | Store/attendance features |
| Phase 4 | Revert commit, restore shareReplay cache | Settings/quota widget |
| Phase 5 | Revert commit (re-add wrappers) | All features |

---

## Execution Rules

1. Each phase is a separate commit
2. After each phase: `ng build` must pass with zero errors
3. Developer manually tests the affected feature before proceeding to the next phase
4. Each phase produces an Audit + QA `.md` file
5. If a phase introduces a crashing change, revert the commit immediately
6. Services keep backward-compatible wrappers until Phase 5
7. Services NEVER inject stores — only stores inject services
8. No `MatDialog`, `MatSnackBar`, or `Router` in any store
9. Use `rxMethod()` for Observable-to-store bridging, never manual `.subscribe()`
