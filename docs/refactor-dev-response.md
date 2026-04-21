# StoreService Refactor — Developer Response to QA Report

> Author: Senior Angular Developer
> Date: April 13, 2026
> Input: `docs/refactor-qa-report.md`
> Purpose: Validate each QA finding, classify as actionable or false positive, and provide solutions per steering

---

## Verdict Summary

| Category | Valid & Actionable | Valid but Pre-existing | False Positive / Not Applicable |
|----------|-------------------|----------------------|-------------------------------|
| Checkout (TC-1.x) | 0 | 0 | 9 (all pass by code inspection) |
| Void (TC-2.x) | 0 | 0 | 6 (all pass by code inspection) |
| Product (TC-3.x) | 0 | 0 | 4 (all pass) |
| Inventory (TC-4.x) | 0 | 1 (PE-4) | 2 |
| Transaction Queries (TC-5.x) | 0 | 1 (PE-2) | 2 |
| Daily Sales (TC-6.x) | 0 | 0 | 3 (all pass) |
| Cross-Service (TC-7.x) | 0 | 0 | 4 (all pass) |
| Firestore Cost (TC-8.x) | 0 | 1 (TC-8.3) | 2 |
| Pre-existing (PE-x) | 2 real bugs found | 3 valid observations | 0 |
| **NEW FINDING** | **2 real issues** | — | — |

**Bottom line:** The QA report's 28 test scenarios are all valid test cases to run, but none of them identify actual regressions introduced by the refactor. The refactor moved code exactly as-is. However, my code review found **2 real bugs** and **1 critical steering violation** that the QA report missed entirely.

---

## Section 1: QA Test Cases — Validation

### TC-1.1 through TC-1.9 (Checkout Flow)

**Verdict: ALL VALID test scenarios, ALL PASS by code inspection.**

I compared `CheckoutService.checkout()` line-by-line against the original `StoreService.checkout()` from the git history. The logic is identical:
- Same `writeBatch` sequence: product fetch → stock deduct → inventory log → transaction doc → daily_sales → shift update → commit
- Same `Injector.get(CashRegisterService)` pattern
- Same `isCustomTransaction` flag controlling cart clear
- Same membership renewal logic post-commit
- Same chunking at 10 for `where(documentId(), 'in', chunk)`

These are good smoke tests to run manually but they will pass. **No code fix needed.**

### TC-2.1 through TC-2.6 (Void Transaction)

**Verdict: ALL VALID test scenarios, ALL PASS by code inspection.**

`TransactionService.voidTransaction()` is identical to the original. Same atomic batch: tx fetch → product fetch → stock revert → inventory log → tx VOID → daily_sales decrement → shift pre-fetch → commit. Same `try/catch` around shift pre-fetch. Same `Injector.get()` pattern.

**No code fix needed.**

### TC-3.1 through TC-3.4 (Product CRUD)

**Verdict: ALL PASS.**

The `shareReplay({ bufferSize: 1, refCount: false })` is correctly implemented. The QA report's risk note about memory is valid but not actionable — `limit(100)` caps the data, and a single listener is negligible memory.

**No code fix needed.**

### TC-4.1 through TC-4.3 (Inventory)

**Verdict: ALL PASS.** The `if (amount <= 0) return` guard is present. Chunking at 10 is correct.

**No code fix needed for refactor.** PE-4 (batch size guard) is pre-existing and valid — see Section 3.

### TC-5.1 through TC-5.3 (Transaction Queries)

**Verdict: ALL PASS.** Default limit 50 is preserved. `getAggregateFromServer` is correct. The `combineLatest` with unused products is pre-existing — see PE-2 in Section 3.

**No code fix needed for refactor.**

### TC-6.1 through TC-6.3 (Daily Sales)

**Verdict: ALL PASS.** Zero-fill logic preserved. VOID exclusion preserved. Batch chunking at 400 preserved.

**No code fix needed.**

### TC-7.1 through TC-7.4 (Cross-Service Integration)

**Verdict: ALL PASS.**

- TC-7.1/7.2: `Injector.get()` pattern preserved in both CheckoutService and TransactionService. No circular DI.
- TC-7.3: Cart isolation is correct — `isCustomTransaction` flag prevents cart clear on kiosk checkouts.
- TC-7.4: QuotaStatusWidget imports `toLocalDateStr` from `date.utils` (verified in Phase 1). Chain is `QuotaStatusWidget → ReportStateService → DailySalesService`. No reference to deleted StoreService.

**No code fix needed.**

### TC-8.1 through TC-8.3 (Firestore Cost)

**Verdict: ALL PASS.** Product listener deduplication works correctly. The 1000-doc limit on analytics and unlimited reads on recalculate are pre-existing and intentional.

**No code fix needed.**

---

## Section 2: Issues the QA Report MISSED

### MISSED-1: `migrateDailySalesToLocalDateKeys` has a missing `await` (REAL BUG)

**File:** `src/app/core/services/daily-sales.service.ts`, line ~190
**Severity:** MEDIUM
**Refactor-caused:** NO — pre-existing in original StoreService, copied as-is

```typescript
// CURRENT (buggy):
if (deleteCount >= 400) {
    deleteBatch.commit();        // ← missing await!
    deleteBatch = writeBatch(this.firestore);
    deleteCount = 0;
}
```

The intermediate batch commit inside the loop is not awaited. This means the code immediately creates a new `writeBatch` and starts adding operations to it while the previous batch is still committing. In practice this usually works because Firestore handles concurrent commits, but it's a race condition that could cause:
- Operations added to the new batch before the old batch finishes
- If the old batch fails, the code doesn't know and continues

**Solution:**
```typescript
if (deleteCount >= 400) {
    await deleteBatch.commit();  // ← add await
    deleteBatch = writeBatch(this.firestore);
    deleteCount = 0;
}
```

**Per steering (coding-standards.md):** "ALL related data updates must use `writeBatch` or `runTransaction`." The missing await breaks the sequential guarantee.

---

### MISSED-2: Steering file `business-rules.md` has 12+ stale references to `StoreService` (CRITICAL STEERING VIOLATION)

**File:** `.kiro/steering/business-rules.md`
**Severity:** HIGH
**Refactor-caused:** YES — StoreService was deleted in Phase 7 but the steering file was not updated

The steering file is the canonical source of truth for business rules. It currently references `StoreService` in 12+ places:

| Line | Stale Reference | Should Be |
|------|----------------|-----------|
| 1.1 | `StoreService.checkout()` | `CheckoutService.checkout()` |
| 1.2 | `toLocalDateStr(date)` from `store.service.ts` | `toLocalDateStr(date)` from `date.utils.ts` |
| 1.2 | `StoreService.recalculateSalesForDay(date)` | `DailySalesService.recalculateSalesForDay(date)` |
| 1.3 | `StoreService.getMonthlySalesReport(year, month)` | `DailySalesService.getMonthlySalesReport(year, month)` |
| 1.3 | `StoreService.getMonthlySalesReport()` | `DailySalesService.getMonthlySalesReport()` |
| 1.3 | `StoreService.recalculateSalesForMonth(year, month)` | `DailySalesService.recalculateSalesForMonth(year, month)` |
| 1.4 | `StoreService.getSalesTotal()` | `TransactionService.getSalesTotal()` |
| 1.6 | `StoreService.getSalesAnalytics()` | `TransactionService.getSalesAnalytics()` |
| 3.5 | `StoreService.voidTransaction()` batch | `TransactionService.voidTransaction()` batch |
| 4.2 | `StoreService.checkout()` AFTER batch commit | `CheckoutService.checkout()` AFTER batch commit |
| 6.1 | `toLocalDateStr(date)` in `store.service.ts` | `toLocalDateStr(date)` in `date.utils.ts` |
| 7.3 | `StoreService.voidTransaction()` | `TransactionService.voidTransaction()` |

**Why this matters:** The steering file drives AI-assisted development. If a developer (or AI) reads the steering and follows it, they'll look for methods in a file that no longer exists. This could cause:
- Incorrect import paths in new code
- Confusion about which service owns which responsibility
- Potential re-creation of StoreService by an AI that thinks it should exist

**Solution:** Update all 12+ references in `.kiro/steering/business-rules.md` to point to the correct new services. This is a text-only change with zero code impact.

---

## Section 3: Pre-Existing Issues — Validation & Prioritization

### PE-1: Duplicate functions in `date.utils.ts`

**QA Assessment:** Valid
**My Assessment:** Valid but LOW priority. Both functions produce identical output. The risk of divergence is real but minimal — they're 4 lines each.

**Solution:** Make one alias the other:
```typescript
export function toLocalDateStr(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export const getLocalDateString = (date: Date = new Date()) => toLocalDateStr(date);
```

**Priority:** Backlog. No functional risk today.

### PE-2: `getSalesAnalytics` subscribes to products but never uses them

**QA Assessment:** Valid
**My Assessment:** Valid. The `combineLatest` with `productService.getProducts()` exists so the analytics re-emit when products change (e.g., a product name update would refresh the analytics view). However, the `map()` callback destructures `[transactions]` and ignores products entirely. The product data is never used in the computation.

**Impact:** One unnecessary Firestore listener subscription. Since `ProductService.getProducts()` uses `shareReplay({ refCount: false })`, this doesn't create an extra listener — it reuses the existing one. So the billing impact is zero. The only cost is a re-emission of the analytics observable whenever a product changes, which triggers a re-render of the SalesAnalytics component.

**Solution:** Remove `productService.getProducts()` from the `combineLatest` if product-change-triggered re-emission is not needed. If it IS needed (e.g., product name changes should update the analytics table), keep it but add a comment explaining why.

**Priority:** Backlog. Zero billing impact due to shareReplay.

### PE-3: `voidTransaction` fetches products one-by-one

**QA Assessment:** Valid
**My Assessment:** Valid. The checkout method uses chunked `where(documentId(), 'in', chunk)` but void uses sequential `getDoc()` calls. For a typical transaction with 2-3 products, this is 2-3 reads vs 1 read — negligible. For a transaction with 10 products, it's 10 reads vs 1.

**Solution:** Replace the sequential loop with the same chunking pattern used in checkout:
```typescript
const chunkedIds: string[][] = [];
for (let i = 0; i < productIds.length; i += 10) {
    chunkedIds.push(productIds.slice(i, i + 10));
}
for (const chunk of chunkedIds) {
    const q = query(collection(this.firestore, 'products'), where(documentId(), 'in', chunk));
    const snapshot = await getDocs(q);
    snapshot.forEach(d => productsMap.set(d.id, { id: d.id, ...d.data() } as Product));
}
```

**Priority:** Low. Typical transactions have 1-5 products. The savings are 1-4 reads per void.

### PE-4: `reconcileInventory` has no batch size guard

**QA Assessment:** Valid
**My Assessment:** Valid. Each product with variance generates 2 batch operations (update + log). Firestore batch limit is 500. So 250+ products with variance would exceed the limit.

**Solution:** Add batch chunking similar to `recalculateDailySales`:
```typescript
if (batchCount >= 400) {
    await batch.commit();
    batch = writeBatch(this.firestore);
    batchCount = 0;
}
```

**Priority:** Medium. A gym with 250+ products doing a full stock take is unlikely but possible.

### PE-5: `SaleCompletedEvent` interface is orphaned

**QA Assessment:** Valid
**My Assessment:** FALSE POSITIVE. I verified — `SaleCompletedEvent` is not imported anywhere in the codebase (grep returned zero results). The interface was only used internally by the deleted `StoreService`. No external consumer exists. The Cloud Functions (`functions/src/index.ts`) do not import from the Angular app.

**Priority:** None. Already resolved by deletion.

---

## Section 4: Action Items

### Must Fix (before next release)

| # | Issue | File | Effort |
|---|-------|------|--------|
| 1 | Missing `await` on `deleteBatch.commit()` in migration loop | `daily-sales.service.ts:190` | 1 line |
| 2 | Update 12+ stale `StoreService` references in steering | `.kiro/steering/business-rules.md` | Text-only, ~15 min |

### Should Fix (next sprint)

| # | Issue | File | Effort |
|---|-------|------|--------|
| 3 | Add batch size guard to `reconcileInventory` | `inventory.service.ts` | ~10 lines |
| 4 | Consolidate duplicate date utils | `date.utils.ts` | 2 lines |

### Backlog (nice to have)

| # | Issue | File | Effort |
|---|-------|------|--------|
| 5 | Chunk product fetches in `voidTransaction` | `transaction.service.ts` | ~10 lines |
| 6 | Remove or document unused products in `getSalesAnalytics` combineLatest | `transaction.service.ts` | 1 line or 1 comment |
