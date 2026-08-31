# Inventory Audit Trail & History (`/store/inventory-history`) Redesign Plan

## 1. Executive Summary & Design Goals
Redesign the **Inventory Audit Trail & Movement History (`InventoryHistoryComponent`)** into our master Dark Pro token architecture, 4-Screen Responsive UI Protocol, and lessons learned:
- **Zero Black Text / Zero Grey Surfaces**: Eliminate legacy white cards (`background: white`) and dark text (`color: rgba(0, 0, 0, 0.6)`) with high-contrast typography tokens (`var(--color-text-pure)`, `var(--color-text-body)`, `var(--color-text-secondary)`).
- **Header & Action Bar**:
  - Back button with hover ring, pure white title `Inventory Audit Trail & Stock Logs`, descriptive subtitle, and refresh button with live spinning state.
- **4-Card Executive Summary Metrics Deck**:
  - *Total Movements*: Total count of audit logs retrieved.
  - *Restock Inflow*: Count of restock additions in Mint Green.
  - *Sales Outflow*: Count of sales deductions in Cyan.
  - *Audit Adjustments*: Count of variance reconciliations in Purple/Amber.
- **Filter Controls Deck**:
  - Quick 1-click movement type filter chips: `All Movements`, `Restock (+)`, `Sales (-)`, `Audit Adjustments`, `Internal Use`.
  - Date range picker with standard Datepicker shield.
  - Product & Staff keyword search input.
- **Adaptive Audit Trail Deck**:
  - **Desktop Table (≥ 640px)**: Tokenized table with Date, Movement Type Badge, Product Name, User/Performed By, Stock Change Delta (`+10` in Mint, `-3` in Rose), and Resulting Balance.
  - **Mobile Cards Deck (< 640px - Failure #25 Prevention)**: Touch-friendly cards displaying movement type seal, product name, change delta pill, user, timestamp, and new stock balance.
- **Pagination & Load More**:
  - Tokenized `[ Load More Logs ]` action button with live spinner.
- **Safe-Area Bottom Buffer & Single Root Scroll (Failure #24, #26, #29 Prevention)**:
  - `padding-bottom: 140px !important` on Mobile (< 640px) + `<div class="bottom-scroll-spacer"></div>`.
  - Mobile title clamp (`font-size: 16px !important; line-height: 1.25;`).

---

## 2. Complete Inventory of Components

| Component / Submodule | File Paths | Key Planned Changes |
| :--- | :--- | :--- |
| **Inventory History Workspace** | `src/app/features/store/components/inventory-history/` (`inventory-history.ts`, `.html`, `.css`) | Overhaul component, computed metrics, movement type filter chips, adaptive mobile card deck, tokenized desktop table, load more action, and safe-area buffer. |

---

## 3. Audit & Prevention of Historical Failures

1. **Failure #20 Prevention**: High-contrast inputs with floating labels, custom datepicker shield, and search button.
2. **Failure #23 Prevention**: Card containers with full 1.5px solid borders (`var(--color-border, #334155)`).
3. **Failure #24 & #26 Prevention**: Safe-area bottom buffer (`padding-bottom: 140px !important` on mobile) + `<div class="bottom-scroll-spacer"></div>`.
4. **Failure #25 Prevention**: Adaptive mobile card deck (`.mobile-cards-deck` for `< 640px` and `.desktop-table-wrapper` for `≥ 640px`).
5. **Failure #27 Prevention**: Explicit high-contrast declarations on all chips, badges, and select overlays.
6. **Failure #29 Prevention**: Single scroll root (no nested `overflow-y: auto`) and responsive mobile title font clamp.
