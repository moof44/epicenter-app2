# System Design — Technical Design Document

This document describes **how the Epicenter system works end-to-end**, tracing every major operation from UI interaction through service layer to Firestore. It is the canonical reference for understanding data flows, service dependencies, and cross-feature integrations.

## 1. Authentication & Session Management

### 1.1 Login Flow

1. User enters email/password on `LoginComponent`
2. `AuthService.login()` calls `setPersistence()` then `signInWithEmailAndPassword()`
3. On success, `authState(this.auth)` emits the Firebase user
4. `user$` pipeline: `authState` → `switchMap` to `docData(users/{uid})` → `shareReplay(1)`
5. `userProfile` signal (via `toSignal`) updates with the Firestore profile (uid, email, displayName, roles, isActive)
6. `LoginComponent` navigates to `/` (dashboard)

### 1.2 Route Protection

Three guards run in sequence on protected routes:

- `authGuard`: Hybrid check. Step 1: `user(auth)` for fast Firebase Auth verification. Step 2: `authService.user$` with `filter(!!profile)` to check `isActive !== false`. Redirects to `/login` if either fails.
- `roleGuard`: Reads `authService.user$`, checks `isActive === false` first (redirect to `/login`), then checks `route.data['roles']` against `user.roles`. Shows snackbar "Access Denied" if role mismatch.
- `adminGuard`: Synchronous check via `authService.userProfile()` signal. Checks `isActive === false`, then `isAdmin()`.

### 1.3 Active Staff Protection (Real-Time)

A constructor subscription in `AuthService` monitors `user$` for `isActive` changes:

```
user$ → map(profile?.isActive) → distinctUntilChanged() → if (isActive === false && auth.currentUser) → snackbar + logout()
```

This provides zero-latency session termination when an admin deactivates a staff member.

### 1.4 Emergency Logout (System-Wide)

A separate constructor subscription monitors `system/settings.minAuthTimestamp`:

```
docData(system/settings) → map(minAuthTimestamp) → distinctUntilChanged() → compare with cached token authTime → if stale → logout()
```

Triggered by the `emergencyLogoutAll` Cloud Function which revokes all refresh tokens and sets the timestamp.

### 1.5 Logout

`AuthService.logout()` calls `signOut(auth)` → navigates to `/login`. `authState` emits `null` → `user$` emits `null` → `userProfile` becomes `null` → all guards block access.

---

## 2. Checkout / POS Flow

This is the most complex atomic operation in the system. A single `writeBatch` touches 5 collections.

### 2.1 Entry Point

`POS` component → user builds cart via `CartStore` (SignalStore) → clicks "Checkout" → `CheckoutService.checkout()`.

### 2.2 Pre-Validation

1. `CashRegisterService.ensureValidShiftForTransaction()` — verifies an OPEN shift exists and is from today. If stale, opens `StaleShiftDialog`.
2. Cart must not be empty.

### 2.3 Atomic Batch (Single writeBatch)

| Operation | Collection | Action |
| --- | --- | --- |
| Stock deduction | `products` | `increment(-quantity)` per item |
| Inventory audit | `inventory_logs` | Create SALE log per item (previousStock, newStock) |
| Transaction record | `transactions` | Create with items, total, staff, payment method |
| Daily sales aggregate | `daily_sales/{YYYY-MM-DD}` | `increment(total)` with merge |
| Shift update | `shifts/{id}` | `arrayUnion(cashTx)` + increment totals (revenue, cash/gcash, expectedBalance) |

### 2.4 Post-Commit (Non-Blocking)

- `CashRegisterService.refreshShift()` — re-reads the shift from Firestore to sync local state
- `CartStore.clear()` — empties the cart
- Auto-renewal check: if `memberId` is set and cart contains Training products:
  - Product name includes "rental" → `MemberService.renewMembership(memberId)` (30-day extension)
  - Product name includes "personal" or "session" → `MemberService.renewTraining(memberId)` (30-day extension)
  - Renewal failure is logged but does NOT roll back the committed transaction

### 2.5 Service Dependencies

```
CheckoutService
├── CartStore (SignalStore)
├── AuthService (staff identity)
├── CashRegisterService (shift validation + update)
├── MemberService (auto-renewal)
└── Firestore (products, transactions, inventory_logs, daily_sales, shifts)
```

---

## 3. Void Transaction Flow

Reverses a completed transaction atomically.

### 3.1 Entry Point

`TransactionHistory` component → staff clicks "Void" → `TransactionService.voidTransaction(id, reason)`.

### 3.2 Atomic Batch (Single writeBatch)

| Operation | Collection | Action |
| --- | --- | --- |
| Stock revert | `products` | `increment(+quantity)` per item |
| Audit log | `inventory_logs` | Create AUDIT_ADJUSTMENT log per item |
| Transaction status | `transactions` | Set `status: 'VOID'`, `voidedBy`, `voidReason`, `voidedAt` |
| Daily sales revert | `daily_sales/{date}` | `increment(-totalAmount)` |
| Shift revert | `shifts/{id}` | Decrement totals, mark embedded CashTransaction as `voided: true` |

### 3.3 What Does NOT Get Reversed

- Membership/training renewals triggered by the original sale
- Original SALE inventory log entries (preserved for audit trail)
- The transaction document itself (marked VOID, not deleted)

---

## 4. Attendance Flow

### 4.1 Check-In

1. `CheckInKiosk` component → staff searches for member → selects member
2. Validation: locker availability (`getOccupiedLockers`), duplicate check (`isMemberCheckedIn`)
3. Subscription check: if `membershipExpiration` is expired, opens `SubscriptionUpdateDialog` with options: "Check-in only", "Pay and check-in", or "Cancel"
4. If "Pay and check-in": runs a checkout for the membership product first, then updates `membershipExpiration`
5. `AttendanceService.checkIn(member, lockerNumber)` → `addDoc` to `attendance` collection
6. Post check-in: queries `AppointmentService.getTodayAppointmentsForMember()` → if found, shows snackbar "You have a session with Coach X at 10:00 AM!"

### 4.2 Check-Out

`ActiveSessions` component → staff clicks "Check Out" → `AttendanceService.checkOut(recordId)` → `updateDoc` with `checkOutTime` and `status: 'Checked Out'`.

### 4.3 Data Written

```
attendance/{id}: { memberId, memberName, memberGender, checkInTime, checkOutTime, lockerNumber, date (YYYY-MM-DD), status, checkedInBy, checkedOutBy }
```

---

## 5. Member Management Flow

### 5.1 CRUD

- `MemberService.addMember()` → `addDoc` with `createdBy` + `lastModifiedBy` audit trace
- `MemberService.updateMember()` → `updateDoc` with `lastModifiedBy` audit trace
- `MemberService.getMember(id)` → `docData` with converter (real-time)
- `MemberService.getMembers()` → `collectionData` ordered by name (real-time, no limit — exemption documented)

### 5.2 Membership Renewal

`renewMembership(id)` and `renewTraining(id)`:

1. Read current member data
2. Base date = current expiration if in the future (stacking), otherwise now
3. New expiration = base + 30 days
4. `updateMember(id, { membershipExpiration: newExpiration })`

### 5.3 Duplicate Detection & Merge

`findPotentialDuplicates()`:

1. Fetch all members
2. Bucket by `gender + birthday` (YYYY-MM-DD)
3. Within each bucket, pairwise name similarity check (Levenshtein distance ≤ 3 or < 20% difference, plus containment check for nicknames)

`mergeMembers(primaryId, secondaryId)`:

1. `writeBatch`: move all `attendance` records from secondary → primary, move all `transactions` → primary, delete secondary member doc

---

## 6. Progress / Measurements Flow

### 6.1 CRUD

- `ProgressService.addEntry()` → `addDoc` to `members/{id}/measurements` with `createdBy` + `lastModifiedBy`
- `ProgressService.updateEntry()` → `updateDoc` with `lastModifiedBy`
- `ProgressService.getTimeSeries()` → `collectionData` ordered by date desc, limit 50

### 6.2 Soft Delete with Undo

`softDeleteEntry(memberId, docId)`:

1. `writeBatch`: read original doc → write to `deleted_measurements` root collection (with `deletedBy`, `originalMemberId`, `originalDocId`) → delete from original location
2. Returns `deletedDocId` for undo

`restoreEntry(deletedDocId)`:

1. `writeBatch`: read from `deleted_measurements` → write back to original path → delete from `deleted_measurements`

UI shows undo snackbar (5 seconds) after delete.

---

## 7. Appointment Calendar Flow

### 7.1 Day View (Real-Time)

`AppointmentCalendar` → subscribes to `AppointmentService.getAppointmentsByDate(date)` via `collectionData` (real-time listener). Passes data to `TimeSlotGrid` component which renders 30-min slots from gym open to close.

### 7.2 Create Appointment

1. User taps FAB or empty slot → opens `AppointmentForm` dialog
2. Form: trainer dropdown, client autocomplete (member search + guest inline form), date, time, duration, session type, remarks
3. Pre-save: `checkOverlap()` queries same trainer + date + CONFIRMED status, checks time intersection client-side. If overlap found → `ConfirmationDialog` warning.
4. Status auto-assignment: TRAINER creating for self → CONFIRMED. MANAGER/ADMIN → CONFIRMED. STAFF → PENDING.
5. `createAppointment()` → `addDoc` with auto-computed `clientMemberIds[]` for array-contains queries

### 7.3 Status Lifecycle

```
PENDING → CONFIRMED (trainer/manager/admin accepts)
PENDING → CANCELLED (rejected or cancelled)
CONFIRMED → COMPLETED (session done, actualStartTime + sessionNotes recorded)
CONFIRMED → NO_SHOW (client didn't show)
CONFIRMED → CANCELLED (with 24hr policy: Staff/Trainer blocked within 24hrs, Manager/Admin can override)
```

### 7.4 Cancellation Policy

`canCancel(appointment)` returns `{ allowed, requiresOverride }`:

- More than 24 hours before: allowed for all roles
- Within 24 hours: only MANAGER/ADMIN can override (shows confirmation dialog)
- STAFF/TRAINER: cancel button disabled with explanation

### 7.5 Check-In Integration

After `AttendanceService.checkIn()` succeeds, the kiosk queries `AppointmentService.getTodayAppointmentsForMember(memberId, today)` and shows a snackbar if a CONFIRMED appointment exists.

---

## 8. Shift / Cash Register Flow

### 8.1 Open Shift

`CashRegisterService.openShift(openingBalance, openedBy)`:

1. Check local state (no open shift)
2. Check Firestore directly (prevent race condition double-open)
3. `addDoc` to `shifts` with initial balances (all zeros except openingBalance = expectedClosingBalance)

### 8.2 Cash Movements

`addCashTransaction(transaction)` → atomic `updateDoc` on the shift:

- `arrayUnion(newTransaction)` to embed the transaction
- `increment()` on the appropriate totals based on type (Sale/Expense/Float_In/Float_Out)
- CASH sales increment `expectedClosingBalance`, GCASH sales do not

### 8.3 Close Shift

`closeShift(actualClosingBalance, closedBy)`:

1. `discrepancy = actualClosingBalance - expectedClosingBalance`
2. `updateDoc` with status CLOSED, actualClosingBalance, discrepancy, endTime

### 8.4 Recalculate (Repair)

`recalculateShiftTotals(shiftId)`: reads all embedded transactions, cross-references with `transactions` collection to detect voided sales, recomputes all totals from scratch. Self-healing operation.

---

## 9. Store / Inventory Flow

### 9.1 Product CRUD

`ProductService`: uses `createConverter<Product>()` with `withConverter()`. Shared real-time listener via `shareReplay({ bufferSize: 1, refCount: false })` — all subscribers share one Firestore listener.

### 9.2 Stock Take (Reconciliation)

`InventoryService.reconcileInventory(auditData)`:

1. For each product where physical count differs from system stock:
2. `writeBatch`: update `products` stock via `increment(difference)` + create `AUDIT_ADJUSTMENT` inventory log
3. Batches commit every 400 operations (Firestore limit is 500)

### 9.3 Restock / Purchase

Purchase entry creates a `purchase_orders` document and updates product stock + cost via `writeBatch`.

### 9.4 Internal Use

`InventoryService.logConsumption()`: `writeBatch` with stock decrement + `INTERNAL_USE` inventory log.

---

## 10. Reports & Analytics

### 10.1 Monthly Sales (Authoritative)

`DailySalesService.getMonthlySalesReport(year, month)` → queries `daily_sales` collection by document ID range. Returns pre-aggregated daily totals. Cached via `ReportStateService` with `shareReplay`.

### 10.2 Sales Analytics (Detailed)

`ReportsService.getSalesAnalytics(startDate, endDate)` → queries `transactions` (limit 2000). Computes: daily sales, top spenders, top products, staff performance. Excludes VOID transactions.

### 10.3 Volume Analytics

`ReportsService.getVolumeAnalytics(startDate, endDate)` → queries `attendance` by date range. Computes: daily unique visitors, hourly traffic peaks.

### 10.4 User Sales Report

`ReportStateService.getUserSalesReport(userId, date)` → queries `transactions` filtered by staffId + date range. Uses `getAggregateFromServer(sum('totalAmount'))` for authoritative total.

---

## 11. Settings & Configuration

`SettingsService` reads/writes `settings/general` document:

- `monthlyQuota: number` — monthly sales target
- `gymOpenTime: string` — 'HH:mm' format (default '08:00')
- `gymCloseTime: string` — 'HH:mm' format (default '22:00')

Read via `docData` with `shareReplay(1)`. Write via `setDoc` with merge.

---

## 12. Cloud Functions (Backend)

All functions require ADMIN role via custom claims check.

| Function | Purpose | Operations |
| --- | --- | --- |
| `createStaffAccount` | Create new staff user | Auth.createUser → setCustomUserClaims(roles) → Firestore users/{uid} |
| `updateStaffAccount` | Update staff profile/roles | Auth.updateUser → setCustomUserClaims → Firestore update |
| `toggleStaffStatus` | Activate/deactivate staff | Auth.updateUser(disabled) → Firestore isActive update |
| `emergencyLogoutAll` | Force logout all users | Revoke all refresh tokens → set system/settings.minAuthTimestamp |

---

## 13. Firestore Data Converter

`createConverter<T>()` in `core/utils/firestore-converter.utils.ts`:

- **Read (fromFirestore)**: recursively converts all Firestore `Timestamp` fields to JS `Date` objects, injects `id` from `snapshot.id`
- **Write (toFirestore)**: strips the `id` field (Firestore manages it), passes all other fields through

Applied to: `MemberService`, `AttendanceService`, `ProductService`, `TransactionService`. Other services still use manual conversion patterns.

Shared `AuditTrace` interface: `{ uid: string; name: string | null; timestamp: Date }` — used by `createdBy`, `lastModifiedBy`, `confirmedBy`, `cancelledBy` across all models.

---

## 14. Cross-Feature Integration Map

| Source | Target | Integration Point |
| --- | --- | --- |
| Checkout | Member renewal | After batch commit, checks cart for Training products → calls `renewMembership` / `renewTraining` |
| Checkout | Shift | Batch includes shift update (arrayUnion + increment totals) |
| Checkout | Daily sales | Batch includes `daily_sales` increment |
| Checkout | Inventory | Batch includes stock decrement + inventory log |
| Void | Shift | Batch includes shift total decrements + voided flag on embedded transaction |
| Void | Daily sales | Batch includes `daily_sales` decrement |
| Void | Inventory | Batch includes stock revert + AUDIT_ADJUSTMENT log |
| Check-in | Appointments | Post check-in queries today's appointments for the member |
| Check-in | Subscription | Pre check-in validates membership expiration, optionally triggers checkout for renewal |
| Auth | All guards | `user$` pipeline feeds `userProfile` signal consumed by all route guards |
| Auth | All services | `_currentUserSnapshot` getter reads `userProfile()` for audit trails |
| Settings | Calendar | Gym hours read by appointment calendar for slot grid boundaries |
| Settings | Dashboard | Monthly quota read by quota widget and monthly progress widget |

---

## 15. Dashboard Widget Pattern

All widgets follow the same structure:

```typescript
@Component({
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SomeWidget {
    private service = inject(SomeService);
    private authService = inject(AuthService);

    data = signal<T>(initialValue);
    isLoading = signal(true);
    isEmpty = computed(() => !this.data() && !this.isLoading());

    constructor() { this.loadData(); }

    private async loadData(): Promise<void> {
        const uid = this.authService.userProfile()?.uid;
        if (!uid) { this.isLoading.set(false); return; }
        // ... fetch data, set signals
        this.isLoading.set(false);
    }
}
```

Role-based visibility is controlled in `dashboard.html` via `@if (isManagerView())` / `@if (hasSalesRole())` blocks.

---

## 16. App Shell & Navigation

`App` component (`app.ts`):

- `MatSidenav` with responsive behavior: side mode on desktop (≥1200px), overlay on mobile
- Nav items grouped by role: Members/Attendance/Appointments (all roles) → Admin section (ADMIN only) → Store section (ADMIN/MANAGER/STAFF) → Settings (ADMIN only)
- `ShiftStatusWidget` and `QuotaStatusWidget` in the toolbar (visible when logged in)
- `StaffRemindersComponent` below the toolbar
- Route animations via `[@slideInOut]` on the `<router-outlet>`
