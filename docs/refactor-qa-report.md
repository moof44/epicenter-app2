# StoreService Refactor — QA Test Scenarios & Vulnerability Report

> Author: QA Audit
> Date: April 13, 2026
> Scope: Phases 1–7 of `store-service-refactor-plan.md`
> Target audience: Developer fixing identified issues

---

## Legend

| Severity | Meaning |
|----------|---------|
| CRITICAL | Data loss, financial miscalculation, or crash in production |
| HIGH | Functional regression visible to end users |
| MEDIUM | Edge case that could surface under specific conditions |
| LOW | Code quality, maintainability, or minor inconsistency |
| INFO | Not a bug — observation or pre-existing issue surfaced by refactor |

| Refactor-Caused | Meaning |
|-----------------|---------|
| YES | Directly introduced or exposed by the refactor |
| NO | Pre-existing issue, not caused by refactor but worth noting |

---

## 1. Checkout Flow (CheckoutService)

### TC-1.1 — POS standard checkout (CASH)

**Steps:** Open shift → Add 3 products to cart → Checkout with CASH → Verify
**Verify:**
- [ ] Transaction doc created in `transactions` with status `COMPLETED`
- [ ] Each product stock decremented by correct quantity
- [ ] `inventory_logs` has one SALE entry per product with correct `previousStock`/`newStock`
- [ ] `daily_sales/{YYYY-MM-DD}` incremented by transaction total
- [ ] Shift `totalCashSales`, `totalRevenue`, `totalSales`, `expectedClosingBalance` all incremented
- [ ] Shift `transactions` array has new entry with `productsSummary`
- [ ] Cart is cleared after checkout
- [ ] Shift widget updates in toolbar

**Severity:** CRITICAL
**Refactor-Caused:** YES — `checkout()` moved from StoreService to CheckoutService. All atomic batch logic must be identical.

### TC-1.2 — POS standard checkout (GCASH)

**Steps:** Same as TC-1.1 but select GCASH payment
**Verify:**
- [ ] Shift `totalGcashSales` incremented (not `totalCashSales`)
- [ ] `expectedClosingBalance` NOT incremented (GCash doesn't affect cash drawer)
- [ ] `referenceNumber` stored on transaction doc

**Severity:** CRITICAL
**Refactor-Caused:** YES

### TC-1.3 — Kiosk walk-in checkout

**Steps:** Check-in kiosk → Select member without subscription → Choose "Walk-in" → Pay
**Verify:**
- [ ] `CheckoutService.checkout()` called with `customItems` (not cart)
- [ ] Cart is NOT cleared (custom transaction)
- [ ] Transaction has `memberId` and `memberName` set
- [ ] `performedBy` is `ATTENDANCE_WALK_IN`

**Severity:** HIGH
**Refactor-Caused:** YES — CheckInKiosk now injects CheckoutService directly instead of StoreService.

### TC-1.4 — Kiosk subscription payment + checkout

**Steps:** Check-in kiosk → Select expired member → Choose "Pay & Check In" → Complete
**Verify:**
- [ ] `CheckoutService.checkout()` called with membership product as `customItems`
- [ ] `performedBy` is `ATTENDANCE_SUBSCRIPTION_UPDATE`
- [ ] Membership renewal triggered after payment
- [ ] Member `membershipExpiration` updated

**Severity:** HIGH
**Refactor-Caused:** YES

### TC-1.5 — Checkout with closed register

**Steps:** Close shift → Attempt checkout from POS
**Verify:**
- [ ] Error thrown: "Transaction blocked: Register is closed"
- [ ] No partial writes to Firestore
- [ ] Cart NOT cleared

**Severity:** HIGH
**Refactor-Caused:** YES — `ensureValidShiftForTransaction` is now called via `Injector.get()` in CheckoutService.

### TC-1.6 — Checkout with stale shift (yesterday's shift still open)

**Steps:** Open shift → Wait until next day (or mock date) → Attempt checkout
**Verify:**
- [ ] `StaleShiftDialog` appears
- [ ] Error `STALE_SHIFT` thrown and silenced in POS/Kiosk UI
- [ ] No transaction created

**Severity:** HIGH
**Refactor-Caused:** YES

### TC-1.7 — Auto membership renewal on checkout

**Steps:** Open shift → Add "Monthly Rental" product → Checkout with a member selected
**Verify:**
- [ ] `memberService.renewMembership()` called after batch commit
- [ ] If renewal fails, transaction is NOT rolled back (already committed)
- [ ] Error logged to console but not shown to user

**Severity:** MEDIUM
**Refactor-Caused:** YES — Renewal logic moved to CheckoutService. Verify product category matching (`'Training'` + `'rental'`) still works.

### TC-1.8 — Checkout with 11+ unique products (chunking)

**Steps:** Add 11+ different products to cart → Checkout
**Verify:**
- [ ] Product fetch uses chunked `where(documentId(), 'in', chunk)` with max 10 per chunk
- [ ] All products have stock decremented
- [ ] All inventory logs created

**Severity:** MEDIUM
**Refactor-Caused:** YES — Chunking logic was copied to CheckoutService. Verify it's identical.

### TC-1.9 — Double-click checkout prevention

**Steps:** Rapidly double-click the Checkout button in POS
**Verify:**
- [ ] Only one transaction created
- [ ] `isCheckoutPending` flag prevents re-entry

**Severity:** HIGH
**Refactor-Caused:** NO — This is a POS component concern, not service-level. But verify the flag still works with the new service injection.

---

## 2. Void Transaction (TransactionService)

### TC-2.1 — Void a CASH transaction

**Steps:** Complete a CASH sale → Void it from Cash Management
**Verify:**
- [ ] Transaction status set to `VOID` with `voidedBy`, `voidReason`, `voidedAt`
- [ ] Product stock incremented back
- [ ] `inventory_logs` has `AUDIT_ADJUSTMENT` entry with `notes` containing void reason
- [ ] `daily_sales` decremented by transaction total
- [ ] Shift `totalCashSales`, `totalRevenue`, `totalSales`, `expectedClosingBalance` all decremented
- [ ] Shift transaction entry marked `voided: true`

**Severity:** CRITICAL
**Refactor-Caused:** YES — `voidTransaction()` moved from StoreService to TransactionService. All atomic batch logic must be identical.

### TC-2.2 — Void a GCASH transaction

**Steps:** Complete a GCASH sale → Void it
**Verify:**
- [ ] Shift `totalGcashSales` decremented (not `totalCashSales`)
- [ ] `expectedClosingBalance` NOT decremented (GCash doesn't affect cash drawer)

**Severity:** CRITICAL
**Refactor-Caused:** YES

### TC-2.3 — Void a transaction from a CLOSED shift

**Steps:** Complete sale → Close shift → Void the transaction
**Verify:**
- [ ] Shift totals still decremented even though shift is CLOSED
- [ ] `getVoidTransactionShiftUpdates` finds the correct shift by `startTime <= txDate`
- [ ] Shift UI refreshes only if it's the current shift

**Severity:** HIGH
**Refactor-Caused:** YES

### TC-2.4 — Void a transaction where product was deleted

**Steps:** Complete sale → Delete the product → Void the transaction
**Verify:**
- [ ] Void does NOT crash (product fetch returns empty, `if (!product) continue` skips it)
- [ ] Transaction is still marked VOID
- [ ] Daily sales still decremented
- [ ] No inventory log created for the deleted product (expected)

**Severity:** MEDIUM
**Refactor-Caused:** YES — Verify the `continue` guard is present in TransactionService.

### TC-2.5 — Double void attempt

**Steps:** Void a transaction → Attempt to void it again
**Verify:**
- [ ] Error thrown: "Transaction is already voided"
- [ ] No duplicate stock increment

**Severity:** HIGH
**Refactor-Caused:** YES

### TC-2.6 — Void with shift pre-fetch failure

**Steps:** Void a transaction where the shift document is corrupted or missing
**Verify:**
- [ ] `try/catch` around `getVoidTransactionShiftUpdates` catches the error
- [ ] Transaction is still voided (stock + tx status + daily_sales committed)
- [ ] Shift is NOT updated (acceptable degradation)
- [ ] Error logged to console

**Severity:** MEDIUM
**Refactor-Caused:** YES — Verify the try/catch is preserved in TransactionService.

---

## 3. Product CRUD (ProductService)

### TC-3.1 — Shared product stream (shareReplay)

**Steps:** Navigate POS → Navigate to Product Management → Navigate back to POS
**Verify:**
- [ ] Only ONE Firestore `onSnapshot` listener active (check Firebase console or network tab)
- [ ] Products load instantly on return (cached via `shareReplay`)
- [ ] `refCount: false` means the listener survives route changes

**Severity:** MEDIUM
**Refactor-Caused:** YES — `shareReplay` was added in ProductService. Previously each `getProducts()` call created a new listener.

**Risk note:** `refCount: false` means the listener NEVER unsubscribes. If the app runs for hours, this is fine (it's a single listener). But if the products collection grows very large, this could accumulate memory. Currently capped at `limit(100)` so this is safe.

### TC-3.2 — Custom limit bypasses cache

**Steps:** Call `getProducts(50)` from a component
**Verify:**
- [ ] Returns a NEW (non-cached) Observable
- [ ] Does NOT interfere with the shared `products$` stream

**Severity:** LOW
**Refactor-Caused:** YES

### TC-3.3 — Add product audit trail

**Steps:** Add a new product via Product Management
**Verify:**
- [ ] `lastModifiedBy` field set with `{ uid, name, timestamp }`
- [ ] `_currentUserSnapshot` getter works correctly in ProductService

**Severity:** MEDIUM
**Refactor-Caused:** YES — `_currentUserSnapshot` was duplicated into ProductService.

### TC-3.4 — Delete product

**Steps:** Delete a product from Product Management
**Verify:**
- [ ] Product removed from Firestore
- [ ] No `lastModifiedBy` audit on delete (deleteDoc doesn't support it — pre-existing)
- [ ] Product disappears from POS grid in real-time (shared stream)

**Severity:** LOW
**Refactor-Caused:** NO — Behavior unchanged.

---

## 4. Inventory (InventoryService)

### TC-4.1 — Log consumption with zero amount

**Steps:** Call `logConsumption(productId, 0)`
**Verify:**
- [ ] Early return, no Firestore writes
- [ ] No inventory log created

**Severity:** LOW
**Refactor-Caused:** YES — Verify the `if (amount <= 0) return` guard is present.

### TC-4.2 — Stock take reconciliation with 11+ products

**Steps:** Perform stock take with 11+ products
**Verify:**
- [ ] Product IDs chunked into groups of 10 for `where(documentId(), 'in', chunk)`
- [ ] All products reconciled
- [ ] Single `writeBatch.commit()` for all updates

**Severity:** MEDIUM
**Refactor-Caused:** YES — Chunking logic was copied to InventoryService.

**Risk note:** `writeBatch` has a 500 operation limit. If reconciling 250+ products (each needing 2 ops: update + log), the batch could exceed 500. Currently no guard for this. Pre-existing issue.

### TC-4.3 — Reconciliation with no variance

**Steps:** Stock take where physical count matches system stock for all products
**Verify:**
- [ ] No Firestore writes (batch is empty)
- [ ] `batch.commit()` on empty batch is a no-op (Firestore handles this)

**Severity:** LOW
**Refactor-Caused:** NO

---

## 5. Transaction Queries (TransactionService)

### TC-5.1 — getSalesAnalytics combines transactions + products

**Steps:** Navigate to Sales Analytics page
**Verify:**
- [ ] `combineLatest([getTransactions(1000), productService.getProducts()])` fires
- [ ] Products stream uses the shared `shareReplay` cache (no extra Firestore reads)
- [ ] VOID transactions excluded from all totals

**Severity:** MEDIUM
**Refactor-Caused:** YES — `getSalesAnalytics` now lives in TransactionService and injects ProductService.

**Risk note:** The `products` array from `combineLatest` is destructured but NEVER USED in the `map()` callback: `map(([transactions]) => ...)`. This means the products stream is subscribed to but its data is discarded. This is a pre-existing inefficiency — the `combineLatest` was originally added so analytics would re-emit when products change, but the actual computation only uses transactions. Consider removing the products dependency if re-emission on product changes is not needed.

### TC-5.2 — getTransactions default limit

**Steps:** Open Transaction History with no filters
**Verify:**
- [ ] Default limit is 50 (not unlimited)
- [ ] Firestore query includes `limit(50)`

**Severity:** MEDIUM
**Refactor-Caused:** YES — Verify default `constraints.limit ?? 50` is preserved.

### TC-5.3 — getSalesTotal server-side aggregation

**Steps:** View Sales by User report
**Verify:**
- [ ] Uses `getAggregateFromServer(q, { totalSales: sum('totalAmount') })`
- [ ] Does NOT read individual documents (server-side aggregation)
- [ ] Returns correct total

**Severity:** MEDIUM
**Refactor-Caused:** YES

---

## 6. Daily Sales (DailySalesService)

### TC-6.1 — Monthly report pre-fills zero days

**Steps:** View Monthly Sales Report for a month with only 3 days of sales
**Verify:**
- [ ] All 28/30/31 days shown in the table
- [ ] Days without sales show ₱0.00
- [ ] Total only sums actual sales (not zeros)

**Severity:** MEDIUM
**Refactor-Caused:** YES — `getMonthlySalesReport` moved to DailySalesService.

### TC-6.2 — Recalculate day excludes VOID transactions

**Steps:** Void a transaction → Recalculate that day
**Verify:**
- [ ] `recalculateSalesForDay` queries transactions with `where('date', '>=', start)` and `where('date', '<=', end)`
- [ ] VOID transactions excluded via `if (data.status === 'VOID') return`
- [ ] `daily_sales` doc updated with correct total

**Severity:** HIGH
**Refactor-Caused:** YES

### TC-6.3 — Recalculate full database (400+ batch limit)

**Steps:** Run `recalculateDailySales()` on a database with 500+ unique days
**Verify:**
- [ ] Batch commits every 400 operations
- [ ] New batch created after each commit
- [ ] All days written correctly

**Severity:** MEDIUM
**Refactor-Caused:** YES — Verify batch chunking logic is preserved.

---

## 7. Cross-Service Integration

### TC-7.1 — Circular DI: CheckoutService → CashRegisterService

**Steps:** App bootstrap → Navigate to POS → Checkout
**Verify:**
- [ ] No circular dependency error at runtime
- [ ] `Injector.get(CashRegisterService)` resolves lazily inside `checkout()`
- [ ] `ensureValidShiftForTransaction()` works correctly

**Severity:** CRITICAL
**Refactor-Caused:** YES — CheckoutService uses `Injector.get()` pattern. If someone refactors this to `inject()`, it will create a circular DI crash.

### TC-7.2 — Circular DI: TransactionService → CashRegisterService

**Steps:** Void a transaction
**Verify:**
- [ ] No circular dependency error
- [ ] `Injector.get(CashRegisterService)` resolves lazily inside `voidTransaction()`

**Severity:** CRITICAL
**Refactor-Caused:** YES

### TC-7.3 — Cart state isolation between POS and Kiosk

**Steps:** Add items to POS cart → Navigate to Kiosk → Do a walk-in checkout → Return to POS
**Verify:**
- [ ] POS cart is NOT cleared by kiosk checkout (kiosk uses `customItems`)
- [ ] POS cart items still present after returning
- [ ] CartStore is a singleton — both components share the same instance

**Severity:** HIGH
**Refactor-Caused:** YES — CheckoutService now injects CartStore directly. The `isCustomTransaction` flag determines whether cart is cleared.

### TC-7.4 — Quota widget still works after StoreService deletion

**Steps:** Login as ADMIN → Check quota widget in toolbar
**Verify:**
- [ ] Monthly revenue displays correctly
- [ ] Today's revenue displays correctly
- [ ] Widget uses `ReportStateService.getMonthlyReport()` → `DailySalesService.getMonthlySalesReport()`
- [ ] `toLocalDateStr` imported from `date.utils` (not from deleted store.service)

**Severity:** HIGH
**Refactor-Caused:** YES — QuotaStatusWidget's import chain changed.

---

## 8. Firestore Cost & Performance

### TC-8.1 — Product listener deduplication

**Steps:** Open POS + Product Management + Stock Take simultaneously (3 tabs or route changes)
**Verify:**
- [ ] Only 1 Firestore `onSnapshot` listener on `products` collection
- [ ] Firebase console shows 1 listener, not 3

**Severity:** MEDIUM (billing impact)
**Refactor-Caused:** YES — `shareReplay({ refCount: false })` is new. Previously each component created its own listener.

### TC-8.2 — getSalesAnalytics 1000-doc limit

**Steps:** Have 1500+ transactions in the database → View Sales Analytics
**Verify:**
- [ ] Only 1000 most recent transactions loaded (limit enforced)
- [ ] Analytics may be incomplete for older data (known limitation, documented in business rules)

**Severity:** INFO
**Refactor-Caused:** NO — Pre-existing limit.

### TC-8.3 — recalculateDailySales reads ALL transactions

**Steps:** Run full recalculation on a database with 10,000 transactions
**Verify:**
- [ ] `getDocs(this.transactionsCollection)` reads ALL docs (no limit)
- [ ] This is intentional for admin repair operations
- [ ] Firestore billing: 10,000 reads in one call

**Severity:** INFO (admin-only, intentional)
**Refactor-Caused:** NO — Pre-existing behavior.

---

## 9. Pre-Existing Issues Surfaced by Refactor

### PE-1 — `date.utils.ts` has two identical functions

`getLocalDateString()` and `toLocalDateStr()` produce identical output. One should alias the other to prevent future divergence.

**Severity:** LOW
**Refactor-Caused:** NO — Pre-existing, but Phase 1 added `toLocalDateStr` alongside the existing function.

### PE-2 — `getSalesAnalytics` subscribes to products but never uses them

`combineLatest([getTransactions(1000), productService.getProducts()])` — the products array is destructured away. The subscription exists only to trigger re-emission when products change, but the computation doesn't use product data.

**Severity:** LOW (unnecessary Firestore listener coupling)
**Refactor-Caused:** NO — Pre-existing in original StoreService.

### PE-3 — `voidTransaction` fetches products one-by-one

```ts
for (const pid of productIds) {
    const pSnap = await getDoc(doc(this.firestore, 'products', pid));
}
```

This is N sequential reads instead of a batched `where(documentId(), 'in', chunk)` query. For a transaction with 5 products, this is 5 reads instead of 1.

**Severity:** LOW (billing inefficiency)
**Refactor-Caused:** NO — Pre-existing in original StoreService. The checkout method uses chunked reads, but void does not.

### PE-4 — `reconcileInventory` has no batch size guard

If reconciling 250+ products, the batch could exceed Firestore's 500 operation limit (2 ops per product: update + log = 500 ops for 250 products).

**Severity:** MEDIUM
**Refactor-Caused:** NO — Pre-existing.

### PE-5 — `SaleCompletedEvent` interface is now orphaned

The `SaleCompletedEvent` interface was exported from `store.service.ts` which is now deleted. If any external code (e.g., Cloud Functions, tests) imported this type, it will break.

**Severity:** LOW
**Refactor-Caused:** YES — Verify no external consumers imported this type. If needed, move it to `store.model.ts`.

---

## Recommended Fix Priority

| Priority | Items |
|----------|-------|
| Verify immediately (smoke test) | TC-1.1, TC-1.2, TC-1.3, TC-2.1, TC-2.2, TC-7.1, TC-7.2 |
| Verify before release | TC-1.5, TC-1.6, TC-1.7, TC-2.3, TC-2.5, TC-7.3, TC-7.4 |
| Verify when convenient | TC-3.1, TC-4.2, TC-5.1, TC-6.1, TC-6.2, TC-8.1 |
| Backlog (pre-existing) | PE-1, PE-2, PE-3, PE-4, PE-5 |
