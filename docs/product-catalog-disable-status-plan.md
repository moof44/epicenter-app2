# Implementation Plan: Product Catalog Disable / Active Status

## 1. Overview
Allow administrators and managers to disable (deactivate / archive) products in the **Product & Inventory Management** catalog (`/store/manage`). Disabled products will be immediately hidden from the **POS Terminal** (`/store/pos`) and the POS Product Catalog browser, preventing accidental sales of discontinued, seasonal, or temporarily unavailable items, while fully preserving inventory history, stock-take records, and sales reports.

---

## 2. User Review Required
> [!NOTE]
> Backward Compatibility: Existing products without an explicit `isActive` or `disabled` field will continue to default to **Active** (`isActive !== false` and `!disabled`).

---

## 3. Proposed Changes

### Model & Repository Layer
#### [MODIFY] [`store.model.ts`](file:///e:/Programming/epicenter-app2/src/app/core/models/store.model.ts)
- Add `isActive?: boolean` (and `disabled?: boolean`) to the `Product` interface.

---

### Product Management UI Layer (`/store/manage`)
#### [MODIFY] [`product-management.ts`](file:///e:/Programming/epicenter-app2/src/app/features/store/components/product-management/product-management.ts)
- Add status filtering: support filtering by `Active` / `Disabled` in addition to categories.
- Add `toggleProductActive(product: Product)` method to flip `isActive` with instant optimistic feedback via `ProductService.updateProduct()`.
- Include `status` in `displayedColumns`.

#### [MODIFY] [`product-management.html`](file:///e:/Programming/epicenter-app2/src/app/features/store/components/product-management/product-management.html)
- Add Status Column in desktop table:
  - **Active**: Mint green badge (`Active`).
  - **Disabled**: Dimmed/rose badge (`Disabled / Hidden`).
- Add Quick Action Toggle Button:
  - `visibility` / `visibility_off` action icon in table and mobile card actions for instant 1-click toggle.
- In Mobile Card View:
  - Render status badge alongside category badge.
  - Add disable/enable action button.
- Add Active/Disabled filter chip in the filter deck.

#### [MODIFY] [`product-management.css`](file:///e:/Programming/epicenter-app2/src/app/features/store/components/product-management/product-management.css)
- Add token styles for `.status-pill.active`, `.status-pill.disabled`, `.btn-action-toggle`, `.disabled-row`.

#### [MODIFY] [`product-form-dialog.ts`](file:///e:/Programming/epicenter-app2/src/app/features/store/components/product-management/product-form-dialog/product-form-dialog.ts)
- Add `isActive` FormControl (defaulting to `product?.isActive !== false`).

#### [MODIFY] [`product-form-dialog.html`](file:///e:/Programming/epicenter-app2/src/app/features/store/components/product-management/product-form-dialog/product-form-dialog.html)
- Add a toggle/checkbox: `Active in POS & Store Catalog` with a helpful hint: *"Uncheck to hide this product from the POS terminal."*

---

### POS & Catalog Layer
#### [MODIFY] [`pos.ts`](file:///e:/Programming/epicenter-app2/src/app/features/store/components/pos/pos.ts)
- Filter out disabled products:
  ```typescript
  products$: Observable<Product[]> = this.productService.getProducts().pipe(
    map(products => products.filter(p => p.type !== 'CONSUMABLE' && p.isActive !== false && !p.disabled))
  );
  ```

#### [MODIFY] [`product-catalog.ts`](file:///e:/Programming/epicenter-app2/src/app/features/store/components/product-catalog/product-catalog.ts)
- Filter `filteredProducts` to only include active retail items:
  ```typescript
  filteredProducts = computed(() => {
    let list = this.products().filter(p => p.type !== 'CONSUMABLE' && p.isActive !== false && !p.disabled);
    ...
  });
  ```

---

## 4. Verification Plan

### Automated Build Verification
- Run `npm run build` to guarantee 0 compiler errors and 0 warnings.
- Run CSS audit script to guarantee 0 unmapped styles.

### Functional Verification
1. Open `/store/manage`, disable a product (e.g. "Circuit Training" or test item).
2. Verify status badge immediately updates to `Disabled` with a dimmed row state.
3. Navigate to `/store/pos`: verify disabled product is completely hidden from the POS grid and category filters.
4. Open the POS Product Catalog browser modal: verify disabled product is not listed.
5. Re-enable product in `/store/manage`: verify product reappears immediately in `/store/pos`.
