# StoreService Refactor — Implementation Plan

> Role: Senior Angular Developer
> Date: April 12, 2026
> Goal: Split the 900+ line god service into focused, single-responsibility services

---

## Current Problem

`StoreService` owns 6 unrelated domains in one file: product CRUD, cart state, checkout orchestration, inventory management, transaction queries/analytics, and daily sales utilities. This causes:
- AI context pollution (modifying one domain risks touching another)
- Formula divergence (analytics computed differently in different methods)
- Untestable (mocking requires the entire service)
- Violates Single Responsibility Principle

---

## Consumer Dependency Map

Each consumer and the exact methods it uses from `StoreService`:

| Consumer | Methods Used | New Service |
| --- | --- | --- |
| POS | `getProducts`, `cart$`, `getCartTotal`, `addToCart`, `updateCartItemQuantity`, `updateCartItemPrice`, `removeFromCart`, `clearCart`, `checkout` | ProductService, CartStore, CheckoutService |
| ProductCatalog | `getProducts`, `addToCart` | ProductService, CartStore |
| ProductManagement | `getProducts`, `deleteProduct`, `logConsumption` | ProductService, InventoryService |
| ProductFormDialog | `addProduct`, `updateProduct` | ProductService |
| PurchaseEntry + Dialog | `getProducts`, `addProduct` | ProductService |
| StockTake | `getProducts`, `reconcileInventory` | ProductService, InventoryService |
| TransactionHistory | `getTransactions` | TransactionService |
| SalesAnalytics | `getSalesAnalytics` | TransactionService |
| CashManagement | `voidTransaction` | TransactionService |
| MonthlySalesReport | `recalculateSalesForMonth`, `recalculateSalesForDay`, `recalculateDailySales` | DailySalesService |
| SalesByUser | (unused — only uses ReportStateService) | None |
| ReportStateService | `getMonthlySalesReport`, `getTransactions` | DailySalesService, TransactionService |
| ReportsService | `getTransactions`, `toLocalDateStr` | TransactionService, date.utils |
| CheckInKiosk | `getProducts`, `checkout` | ProductService, CheckoutService |
| CashRegisterService | `storeService` injected but NEVER used | Remove dead import |
| QuotaStatusWidget | `toLocalDateStr` (import only) | date.utils |

---

## New Service Structure

```
src/app/core/services/
├── product.service.ts          # Product CRUD (getProducts, addProduct, updateProduct, deleteProduct)
├── checkout.service.ts         # POS checkout orchestration (checkout method)
├── inventory.service.ts        # Stock management (logConsumption, reconcileInventory)
├── transaction.service.ts      # Transaction queries + void (getTransactions, getSalesTotal, getSalesAnalytics, voidTransaction)
├── daily-sales.service.ts      # Daily sales aggregation + admin utilities (getMonthlySalesReport, recalculate*)
├── store.service.ts            # DEPRECATED facade — thin wrappers delegating to new services
└── ...existing services...
```

```
src/app/core/store/
└── cart.store.ts               # Already exists — cart state via @ngrx/signals
```

```
src/app/core/utils/
└── date.utils.ts               # Move toLocalDateStr here (already has getLocalDateString)
```

---

## Phased Implementation

### Phase 1: Move `toLocalDateStr` to `date.utils.ts`

**Why first:** 3 files import this utility from `store.service.ts`. Moving it to `date.utils.ts` (where `getLocalDateString` already lives) is a zero-risk rename that reduces coupling.

**Changes:**
- `src/app/core/utils/date.utils.ts` — add `toLocalDateStr()` function
- `src/app/core/services/store.service.ts` — re-export from date.utils for backward compat
- `src/app/core/services/reports.service.ts` — update import to `date.utils`
- `src/app/core/components/quota-status-widget/quota-status-widget.ts` — update import to `date.utils`

**Files affected:** 3 modified
**Risk:** Zero — pure import path change

---

### Phase 2: Extract `ProductService`

**Why second:** Product CRUD is the most consumed domain (8 components). It's stateless Firestore operations with no cross-domain dependencies.

**Methods moved:**
- `getProducts(limitCount)`
- `getProductsPage(limitCount, lastDoc)`
- `getProduct(id)`
- `addProduct(product)`
- `updateProduct(id, data)`
- `deleteProduct(id)`

**New file:** `src/app/core/services/product.service.ts`

**Dependencies:** Firestore, AuthService (for `_currentUserSnapshot` audit trail)

**StoreService changes:** Keep deprecated wrappers that delegate to `ProductService`.

**Consumer updates:**
- `POS` — inject `ProductService` for `getProducts()`
- `ProductCatalog` — inject `ProductService`
- `ProductManagement` — inject `ProductService`
- `ProductFormDialog` — inject `ProductService`
- `PurchaseEntry` + `ProductCreationDialog` — inject `ProductService`
- `StockTake` — inject `ProductService` for `getProducts()`
- `CheckInKiosk` — inject `ProductService` for `getProducts()`

**Files affected:** 1 new, 1 modified (StoreService), 7 consumer updates
**Risk:** Low — pure CRUD extraction, no business logic changes

---

### Phase 3: Extract `InventoryService`

**Why third:** Small, self-contained. Only 2 consumers.

**Methods moved:**
- `logConsumption(productId, amount, notes)`
- `reconcileInventory(auditData)`
- `calculateStockVariance(currentStock, physicalCount)`

**New file:** `src/app/core/services/inventory.service.ts`

**Dependencies:** Firestore, AuthService

**Consumer updates:**
- `ProductManagement` — inject `InventoryService` for `logConsumption()`
- `StockTake` — inject `InventoryService` for `reconcileInventory()`

**Files affected:** 1 new, 1 modified (StoreService), 2 consumer updates
**Risk:** Low

---

### Phase 4: Extract `TransactionService`

**Why fourth:** Transaction queries and void are used by 4 consumers. The `voidTransaction` method is complex (200+ lines) but self-contained.

**Methods moved:**
- `getTransactions(constraints)`
- `getSalesTotal(constraints)`
- `getSalesAnalytics()`
- `voidTransaction(transactionId, reason)`

**New file:** `src/app/core/services/transaction.service.ts`

**Dependencies:** Firestore, AuthService, ProductService (for `getSalesAnalytics` which calls `getProducts`), CashRegisterService (for void shift updates — via Injector to avoid circular DI)

**Note:** `voidTransaction` currently uses `this.injector.get(CashRegisterService)` for shift updates. This pattern carries over to the new service.

**Consumer updates:**
- `TransactionHistory` — inject `TransactionService`
- `SalesAnalytics` — inject `TransactionService`
- `CashManagement` — inject `TransactionService` for `voidTransaction()`
- `ReportStateService` — inject `TransactionService` for `getTransactions()`
- `ReportsService` — inject `TransactionService` for `getTransactions()`

**Files affected:** 1 new, 1 modified (StoreService), 5 consumer updates
**Risk:** Medium — `voidTransaction` has complex atomic batch logic. Must be moved exactly as-is.

---

### Phase 5: Extract `DailySalesService`

**Why fifth:** Admin utilities and monthly report aggregation. Only 2 consumers.

**Methods moved:**
- `getMonthlySalesReport(year, month)`
- `recalculateDailySales()`
- `recalculateSalesForDay(date)`
- `recalculateSalesForMonth(year, month)`
- `migrateDailySalesToLocalDateKeys()`

**New file:** `src/app/core/services/daily-sales.service.ts`

**Dependencies:** Firestore (reads `daily_sales` and `transactions` collections)

**Consumer updates:**
- `ReportStateService` — inject `DailySalesService` for `getMonthlySalesReport()`
- `MonthlySalesReport` — inject `DailySalesService` for recalculate methods

**Files affected:** 1 new, 1 modified (StoreService), 2 consumer updates
**Risk:** Low — pure query/aggregation methods

---

### Phase 6: Extract `CheckoutService`

**Why last:** The `checkout()` method is the most complex (200 lines) and has the most cross-domain dependencies. By this phase, ProductService, InventoryService, and TransactionService already exist, so CheckoutService can import them cleanly.

**Methods moved:**
- `checkout(customItems, performedBy, paymentMethod, ...)`

**New file:** `src/app/core/services/checkout.service.ts`

**Dependencies:** Firestore, AuthService, MemberService, CashRegisterService (via Injector), CartStore

**Note:** The `checkout` method currently reads cart items from `this.cartStore.items()`. It also calls `this.clearCart()` after checkout. In the new service, it will inject `CartStore` directly.

**Consumer updates:**
- `POS` — inject `CheckoutService` for `checkout()`
- `CheckInKiosk` — inject `CheckoutService` for `checkout()`

**Migration note for POS:** POS currently uses `await firstValueFrom(this.cartTotal$)` to get the cart total for the checkout dialog. `cartTotal$` is an Observable wrapper around `CartStore.total` signal. When POS is fully migrated away from the wrapper (Phase 7), this line must change to `const total = this.cartStore.total()` (synchronous signal read). During the wrapper phase this is not an issue.

**Files affected:** 1 new, 1 modified (StoreService), 2 consumer updates
**Risk:** Medium — checkout is the most critical business operation. Must be moved exactly as-is with all atomic batch logic preserved.

---

### Phase 7: Cleanup — Remove `StoreService` deprecated wrappers

**Prerequisite:** All phases 1-6 complete and tested.

**Changes:**
- Remove all deprecated wrapper methods from `StoreService`
- Remove `StoreService` entirely if no consumers remain
- Remove dead `inject(StoreService)` from `CashRegisterService`
- Clean up unused imports across all files

**Risk:** Medium — must verify zero remaining consumers before deletion.

---

## Phase Dependency Map

```
Phase 1 (toLocalDateStr) → no dependencies
Phase 2 (ProductService) → depends on Phase 1 (imports date.utils)
Phase 3 (InventoryService) → no dependencies
Phase 4 (TransactionService) → depends on Phase 1 + Phase 2 (getSalesAnalytics needs ProductService.getProducts)
Phase 5 (DailySalesService) → depends on Phase 1 (imports date.utils)
Phase 6 (CheckoutService) → depends on Phase 2 + Phase 4 (uses ProductService concepts, TransactionService for void awareness)
Phase 7 (Cleanup) → depends on ALL phases
```

Phases 2, 3, 5 can be executed in any order. Phase 4 must follow Phase 2. Phase 6 should follow Phase 2 and 4. Phase 7 must be last.

---

## Execution Rules

1. Each phase is a separate commit
2. After each phase: `ng build` must pass with zero errors
3. StoreService keeps deprecated wrappers until Phase 7
4. No logic changes — methods are moved exactly as-is
5. No formula changes — business rules steering must be followed
6. Each new service uses `providedIn: 'root'` and `inject()` pattern per steering
7. `_currentUserSnapshot` getter is duplicated in each service that needs it (ProductService, InventoryService, TransactionService, CheckoutService) — this is intentional to avoid cross-service coupling for a simple auth snapshot

---

## Rollback Strategy

| Phase | Rollback | Blast radius |
| --- | --- | --- |
| Phase 1 | Revert import paths | Zero |
| Phase 2 | Revert commit, restore methods in StoreService | Product pages |
| Phase 3 | Revert commit | Stock take, product management |
| Phase 4 | Revert commit | Transaction history, analytics, cash management |
| Phase 5 | Revert commit | Monthly sales report |
| Phase 6 | Revert commit | POS, check-in kiosk |
| Phase 7 | Re-add wrappers | All store features |


---

## Audit Findings

### Finding 1: `saleCompleted$` Subject is dead code

`StoreService` has a `Subject<SaleCompletedEvent>` called `saleCompleted` that emits after checkout. No external file subscribes to `saleCompleted$`. It can be removed during Phase 6 (CheckoutService extraction) or Phase 7 (cleanup).

**Impact:** None. Dead code removal.

---

### Finding 2: `checkout()` depends on 5 private fields

The `checkout()` method references: `this.firestore`, `this.productsCollection`, `this.transactionsCollection`, `this.inventoryLogsCollection`, `this.authService`, `this.memberService`, `this.injector`, `this.cartStore`, `this.saleCompleted`. When extracted to `CheckoutService`, all of these must be re-declared as private fields in the new service.

**Risk:** If any field is missed, the build will fail immediately (TypeScript compile error). No silent runtime risk.

**Action:** Phase 6 must declare all Firestore collection references and service injections in `CheckoutService`.

---

### Finding 3: `_currentUserSnapshot` is duplicated across 4 new services

The plan says to duplicate this getter in ProductService, InventoryService, TransactionService, and CheckoutService. This is 4 copies of the same 7-line getter.

**Alternative considered:** Extract to a shared utility function `getCurrentUserSnapshot(authService: AuthService)`. However, this would require passing `AuthService` as a parameter, which is more verbose than a getter.

**Decision:** Keep duplication. It's a simple getter, and each service needs it independently. If the pattern changes (e.g., adding more audit fields), it changes in 4 places — acceptable for a 7-line getter.

---

### Finding 4: `voidTransaction()` uses `this.injector.get(CashRegisterService)` — circular DI risk

`TransactionService` will need `CashRegisterService` for void shift updates. `CashRegisterService` currently injects `StoreService` (dead import). After Phase 4, if `CashRegisterService` is updated to inject `TransactionService` instead, there's no circular dependency because `TransactionService` uses `Injector.get()` (lazy resolution), not direct `inject()`.

**Action:** In Phase 4, `TransactionService` must use `Injector.get(CashRegisterService)` — same pattern as current code. The dead `StoreService` import in `CashRegisterService` should be removed in Phase 7.

---

### Finding 5: `checkout()` calls `this.clearCart()` which delegates to `this.cartStore.clear()`

When `checkout()` moves to `CheckoutService`, it needs to inject `CartStore` directly and call `cartStore.clear()`. This is already noted in the plan.

**Risk:** None — `CartStore` is `providedIn: 'root'`, injectable anywhere.

---

### Finding 6: `getSalesAnalytics()` in TransactionService will reference `this.productsCollection`

`StoreService.getSalesAnalytics()` calls `this.getProducts()` via `combineLatest([this.getTransactions(...), this.getProducts()])`. When extracted to `TransactionService`, it would need to either:
1. Inject `ProductService` and call `productService.getProducts()`, or
2. Duplicate the products collection reference

**Decision:** Option 1 — inject `ProductService`. This creates a dependency: `TransactionService → ProductService`. This is acceptable (transactions need product data for analytics). Phase 4 should depend on Phase 2 being complete.

**Plan update needed:** Phase 4 dependency should include Phase 2.

---

### Finding 7: No behavior changes detected

All methods are moved exactly as-is. No formula changes, no Firestore query changes, no new reads/writes. The refactor is purely structural.

**Firestore billing impact:** Zero. Same queries, same collections, same limits.

---

### Finding 8: `inventory-history.service.ts` already exists in `features/store/services/`

There's already an `InventoryHistoryService` at `src/app/features/store/services/inventory-history.service.ts`. The new `InventoryService` (for `logConsumption`, `reconcileInventory`) is a different service — it handles stock mutations, not history queries. The naming is close but the responsibilities are distinct.

**Action:** No conflict. `InventoryService` goes in `core/services/`, `InventoryHistoryService` stays in `features/store/services/`.

---

### Audit Summary

| Finding | Severity | Action Required |
| --- | --- | --- |
| Dead `saleCompleted$` Subject | Low | Remove in Phase 6 or 7 |
| `checkout()` private field dependencies | None | Build will catch missing fields |
| `_currentUserSnapshot` duplication | Low | Acceptable — 7-line getter |
| Circular DI in TransactionService | None | Use `Injector.get()` pattern |
| CartStore injection in CheckoutService | None | Already planned |
| `getSalesAnalytics()` needs ProductService | Medium | Phase 4 must depend on Phase 2 |
| No behavior changes | None | Confirmed safe |
| InventoryService vs InventoryHistoryService naming | Low | No conflict — different responsibilities |

**Overall verdict:** Plan is safe to execute. One dependency correction needed: Phase 4 depends on Phase 2 (not independent as originally stated).
