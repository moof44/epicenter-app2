# Transaction History (`/store/history`) Complete Redesign Plan

## 1. Executive Summary & Design Goals
Redesign the entire Store Transaction History workspace (`/store/history`) and introduce a dedicated Dark Pro **`TransactionDetailDialog`** receipt modal:
- **Zero Black Text / Zero Grey Surfaces**: Completely eliminate legacy white backgrounds (`#ffffff`, `white`), light filter cards, and unstyled grey text.
- **Actionable Financial History Deck**:
  - **Header Deck**: Pure white title, descriptive subtitle, active filters indicator, and Refresh/Export action.
  - **Executive Summary Metrics Deck (4 Cards)**:
    - *Total Sales Revenue*: Sum of completed transactions in Gold `₱...`.
    - *Total Orders Count*: Number of processed transactions in Cyan.
    - *Cash Volume*: Cash revenue breakdown in Mint Green.
    - *GCash / Digital Volume*: Digital revenue breakdown in Blue/Cyan.
  - **Dark Pro Filter Deck**:
    - Date Range picker (using MatDateRangePicker with Global Datepicker Shield).
    - Payment Method dropdown selector (All / Cash / GCash / Split).
    - Search by Reference No. or Receipt ID.
    - Search by Staff Name or Member Name.
    - 1-click Reset Filters trigger.
  - **Master Transactions Data Matrix (Desktop ≥ 640px)**:
    - Frozen sticky header in `var(--color-surface-alt)`.
    - Columns: Date & Time, Order / Receipt ID, Customer / Member, Cashier / Staff, Payment Method Badge, Itemized Summary (collapsible accordion with high contrast pills), Total Amount in Gold `₱...`, Status (COMPLETED / VOID), and View Receipt Action.
  - **Adaptive Mobile Card Matrix (Mobile < 640px, Failure #25 Prevention)**:
    - Replaces the table on mobile with stacked transaction receipt cards.
    - Each card displays timestamp, status badge, customer/staff arrow, payment method breakdown, expandable item breakdown, and gold total amount with 0 horizontal friction.
  - **Receipt Detail Modal (`TransactionDetailDialog`)**:
    - Reusable Dark Pro modal displaying full itemized receipt, unit prices, discounts, cash tendered/change due, GCash reference number, cashier identity, and void logs.
  - **Mandatory Safe-Area Bottom Buffer (Failure #24 Prevention)**:
    - `padding-bottom: 140px !important` on Mobile (< 640px) and `100px !important` on Tablet.

---

## 2. Complete Inventory of Components

| Component / Submodule | File Paths | Key Planned Changes |
| :--- | :--- | :--- |
| **Transaction History Page** | `src/app/features/store/components/transaction-history/` (`transaction-history.ts`, `transaction-history.html`, `transaction-history.css`) | Header with metrics, Dark Pro filter card, 4 summary metric cards, adaptive mobile cards deck, desktop tabular matrix, Dark Pro paginator, safe-area bottom buffer. |
| **Transaction Detail Dialog** | `src/app/features/store/components/transaction-history/transaction-detail-dialog/` (`transaction-detail-dialog.ts`, `transaction-detail-dialog.html`, `transaction-detail-dialog.css`) | New dedicated receipt inspection modal with itemized lines, discounts, payment breakdown, cashier trace, and print/close actions. |

---

## 3. Audit & Prevention of Historical Failures

1. **Failure #20 Prevention**: High-contrast form fields with floating labels and standard date range picker.
2. **Failure #21 Prevention**: Modal close buttons strictly bound to `onClose()`.
3. **Failure #22 Prevention**: Global Tab & Chip Shields for payment method chips.
4. **Failure #23 Prevention**: Enclosed card containers with full 1.5px solid borders and text-variant buttons with `width: auto`.
5. **Failure #24 Prevention**: Safe-area bottom buffer (`padding-bottom: 140px !important` on mobile, `100px` on tablet).
6. **Failure #25 Prevention**: Adaptive Table-to-Card Pattern for Mobile (< 640px) ensuring zero wide sticky column truncation.
