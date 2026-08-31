# Stock Check & Inventory Audit (`/store/stock-take`) Complete Redesign Plan

## 1. Executive Summary & Design Goals
Redesign the entire Physical Stock Take & Inventory Reconciliation workspace (`/store/stock-take`) into our master Dark Pro design system:
- **Zero Black Text / Zero Grey Surfaces**: Completely eliminate legacy white backgrounds (`#ffffff`, `white`), light table containers, and unstyled grey text.
- **Actionable Inventory Audit Center**:
  - **Header Deck**: Pure white title, subtitle, and instant Quick Reset / Filter indicators.
  - **4-Card Executive Summary Metrics Deck**:
    - *Total Inventory SKUs*: Monospace count in pure white.
    - *Physical Items Counted*: Progress count in Electric Cyan (`X / Total`).
    - *Perfect Matches*: Verified items with 0 variance in Mint Green.
    - *Discrepancies / Deficits*: Identified variances requiring adjustment/restock in Rose Red.
  - **Filter & Search Bar**:
    - Real-time search across product names and categories.
    - Category filter pills (`All`, `Training`, `Supplements`, `Drinks`, `Boxing`).
    - Audit status filter (`All Items`, `Counted`, `Discrepancies`, `Pending Input`).
  - **Master Audit Data Matrix (Desktop ≥ 640px)**:
    - Frozen sticky header in `var(--color-surface-alt)`.
    - Columns: Product Details (Name + Category + Type), System Stock (`Computer Record`), Physical Count Input (compact numeric input with focus glow), Variance Status Pill (Mint Green `Exact`, Cyan `Surplus`, Rose Red `Shortage`, Muted `Pending Input`).
  - **Adaptive Mobile Card Matrix (Mobile < 640px, Failure #25 Prevention)**:
    - Replaces the table on mobile viewports with stacked, touch-friendly audit cards.
    - Card features product title, category badge, system stock pill, physical count input with quick touch incrementers, and live variance badge with 0 horizontal scrolling friction.
  - **Docked Bottom Actions Deck**:
    - Dark Pro elevated surface with progress bar and 2 primary triggers:
      - Solid Gold **`[ 💾 Update Stock Levels ]`**: Reconciles physical counts with Firestore inventory.
      - Cyan **`[ 🛒 Draft Restock PR ]`**: Automatically drafts a Purchase Request for all detected deficit items.
  - **Confirmation Dialogs**:
    - Replaces raw browser `window.confirm()` with Dark Pro confirmation modals.
  - **Mandatory Safe-Area Bottom Buffer (Failure #24 Prevention)**:
    - `padding-bottom: 160px !important` on Mobile (< 640px) and `120px !important` on Tablet.

---

## 2. Complete Inventory of Components

| Component / Submodule | File Paths | Key Planned Changes |
| :--- | :--- | :--- |
| **Stock Take Page** | `src/app/features/store/components/stock-take/` (`stock-take.component.ts`, `stock-take.html`, `stock-take.css`) | Header with metrics, 4 summary cards, Search & Category filter pills, Adaptive Mobile Card Matrix (< 640px), Desktop Tabular Matrix (≥ 640px), Docked Action Deck, Safe-Area buffer. |

---

## 3. Audit & Prevention of Historical Failures

1. **Failure #20 Prevention**: Clean high-contrast inputs with floating labels and numeric inputs.
2. **Failure #21 Prevention**: Modal close buttons strictly bound to `onClose()`.
3. **Failure #23 Prevention**: Enclosed card containers with full 1.5px solid borders and text-variant buttons with `width: auto`.
4. **Failure #24 Prevention**: Safe-area bottom buffer (`padding-bottom: 160px !important` on mobile, `120px` on tablet).
5. **Failure #25 Prevention**: Adaptive Table-to-Card Pattern for Mobile (< 640px) ensuring zero wide sticky column truncation.
