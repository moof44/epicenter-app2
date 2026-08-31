# Product & Inventory Management (`/store/manage`) Complete Redesign Plan

## 1. Executive Summary & Design Goals
Redesign the entire Product & Inventory Management workspace (`/store/manage`) and associated dialogs into our master Dark Pro design system:
- **Zero Black Text / Zero Grey Surfaces**: Completely eliminate legacy white backgrounds (`#ffffff`, `white`), light grey table containers, and unstyled grey text.
- **Actionable Inventory Command Center**:
  - **Header Deck**: Pure white title, subtitle, and Solid Gold **`[ + Add Product ]`** action button.
  - **Summary Metrics Deck (4 Cards)**: Active SKUs, Total Inventory Value (Retail), Low Stock Alert Count, Out of Stock Alert Count.
  - **Inventory Filter & Tab Bar**: High-contrast Tabs (`Retail Items` vs `Internal Consumables`) + real-time Search input and Category/Stock level filters.
  - **Master Inventory Data Table**: Frozen sticky dark header, product thumbnail with placeholder fallback, color-coded category pills, price in gold monospace currency, stock level status badges (Mint Green in-stock, Amber low-stock, Rose out-of-stock), and quick action buttons.
  - **Quick Consume Action (for Consumables)**: 1-click consumption button with instant snackbar and ledger update.
  - **Pagination Deck**: Dark Pro paginator styling matching the design system.
- **Sub-Modals**:
  - **`ProductFormDialog`**: Clean Dark Pro dialog with dynamic title (`Add Product` / `Edit Product`), glowing Cyan icon seal, categorized form fields, Global MDC Select Shield integration, and Solid Gold save button.
  - **`ConfirmDeleteDialog`**: Replaces raw browser `window.confirm()` with a sleek Dark Pro confirmation modal for safe deletion.
- **Strict 4-Screen Responsive UI Protocol & Mobile Safe-Area Buffer**:
  - 📱 **Mobile (< 640px)**: Single-column metric cards, full-width action buttons, horizontally scrollable table with sticky first column (`Product`), and `padding-bottom: 140px !important`.
  - 📱 **Tablet Portrait (640px – 768px)**: 2-column cards, `padding-bottom: 100px !important`.
  - 💻 **Tablet Landscape (769px – 1024px)**: 4-column metric cards, side-by-side search and filters.
  - 🖥️ **Desktop (> 1024px)**: Full executive multi-column layout.

---

## 2. Complete Inventory of Components

| Component / Submodule | File Paths | Key Planned Changes |
| :--- | :--- | :--- |
| **Product Management Page** | `src/app/features/store/components/product-management/` (`product-management.ts`, `product-management.html`, `product-management.css`) | Header with Solid Gold Add button, 4 summary metric cards, Search & Filter bar, Dark Pro tabs, master data table with sticky column, Dark Pro pagination, mobile safe-area buffer. |
| **Product Form Dialog** | `src/app/features/store/components/product-management/product-form-dialog/` (`product-form-dialog.ts`, `product-form-dialog.html`, `product-form-dialog.css`) | Separate template and styles from inline strings to dedicated files, Dark Pro dialog shell, image preview fallback, category select dropdown with Global Select Shield. |

---

## 3. Audit & Prevention of Historical Failures

1. **Failure #20 Prevention**: Clean high-contrast inputs with floating labels and zero unstyled native inputs.
2. **Failure #21 Prevention**: Dialog close buttons strictly bound to `onClose()` / `cancel()`.
3. **Failure #22 Prevention**: Dark Pro tabs with `Tabs Shield` (`.mat-mdc-tab-group`, `.mdc-tab__text-label`).
4. **Failure #23 Prevention**: Enclosed card containers with full 1.5px solid borders and text-variant buttons with `width: auto`.
5. **Failure #24 Prevention**: Mandatory Safe-Area Bottom Buffer (`padding-bottom: 140px !important` on mobile, `100px` on tablet) and sticky frozen column on data table.
