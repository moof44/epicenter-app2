# Finance & Purchasing Modules Redesign Plan

Comprehensive overhaul of the entire **Finance & Purchasing Suite (4 Modules + 2 Modals)** adhering to our master Dark Pro design tokens, Zero-Black-Text protocol, 4-Screen Responsive UI Protocol, and historical failure protections.

---

## 🔍 Modules in Scope

### 1. Financial Health & AI Advisor (`/store/financial-health`)
* **Files**: `src/app/features/store/components/financial-health/` (`financial-health.component.ts`, `.html`, `.css`)
* **Key Enhancements**:
  * **Header Deck**: Back button with hover ring, pure white title `Financial Health & AI Strategic Advisor`, subtitle, period selector pills (`This Month`, `Last Month`, `Last 90 Days`), and `[ 🖨️ Print P&L Report ]` button.
  * **Executive KPI Cards**: Net Operating Profit (with margin badge), Total Ingoing Revenue, Total Outgoing Expenses, Cash Runway Days, and Gym Health Score (0–100) with letter grade (`A`, `B`, `C`, `D`).
  * **Visual Analytics Grid**:
    * ApexCharts Donut Chart with dark mode options and outflow category distribution.
    * Industry Benchmark Ratios comparison table.
    * AI Strategic Recommendations deck with severity badges (`CRITICAL`, `WARNING`, `OPPORTUNITY`, `POSITIVE`) and navigation links.
  * **Safe-Area Bottom Buffer & Responsive Queries** (`padding-bottom: 140px !important` on mobile + spacer).

---

### 2. Bills, Recurring Outflows & Payables (`/store/payables`)
* **Files**: `src/app/features/store/components/bills-payables/` (`bills-payables.component.ts`, `.html`, `.css`)
* **Key Enhancements**:
  * **Header Deck**: Back button, title `Bills, Recurring Outflows & Payables`, subtitle, quick action `[ + Record New Bill ]`.
  * **4-Card Executive Summary Deck**: Pending / Due Bills (in Amber), Paid This Period (in Mint), Overdue Alerts (in Rose), and Active Till Cash Balance (in Cyan).
  * **Filter Controls Deck**: Outflow category chips (Utilities, Rent, Payroll, Stock, Equipment, Maintenance), Status tabs (`All`, `Pending`, `Paid`, `Overdue`), and search input.
  * **Adaptive Payables Deck**:
    * **Desktop Table (≥ 640px)**: Due Date, Category Seal, Title, Payment Source, Amount in Peso (`₱...`), Status Badge, and One-Tap Actions (`[ Pay from Till Cash ]`, `[ Pay Online/GCash ]`, `[ Delete ]`).
    * **Mobile Cards Deck (< 640px - Failure #25 Prevention)**: Touch-friendly cards with category seal, urgency badge, amount, status pill, and one-tap disbursement triggers.
  * **Safe-Area Bottom Buffer** (`padding-bottom: 140px !important` on mobile + spacer).

---

### 3. Purchase Orders & Invoice History (`/store/purchases`)
* **Files**: `src/app/features/store/components/purchase-history/` (`purchase-history.component.ts`, `.html`, `.css`)
* **Key Enhancements**:
  * **Header Deck**: Back button, title `Purchase Orders & Supplier Invoices`, subtitle, and `[ + Restock Entry ]` action linking directly to `/store/restock`.
  * **4-Card Executive Summary Deck**: Total Invoiced Spend, Orders This Month, Active Suppliers, Average PO Value.
  * **Filter Controls**: Supplier search and date range picker with standard Datepicker shield.
  * **Adaptive Orders Deck**:
    * **Desktop Expandable Table (≥ 640px)**: Order Date, Supplier Name, Reference #, Item Count, Grand Total in Peso (`₱...`), and expandable itemized breakdown row with unit costs and line totals.
    * **Mobile Cards Deck (< 640px - Failure #25 Prevention)**: Expandable mobile cards with supplier seal, date, item summary, total, and tap-to-expand line item drawer.
  * **Safe-Area Bottom Buffer** (`padding-bottom: 140px !important` on mobile + spacer).

---

### 4. Purchase Requests & Procurement (`/store/purchase-requests`) & Modals
* **Files**:
  * `src/app/features/store/components/purchase-requests/` (`purchase-request-list.component.ts`, `.html`, `.scss` $ightarrow$ `.css`)
  * `src/app/features/store/components/purchase-requests/modals/purchase-request-modal.component.ts`
  * `src/app/features/store/components/purchase-requests/modals/fulfill-request-modal.component.ts`
* **Key Enhancements**:
  * **Header Deck**: Back button, title `Purchase Requests & Procurement`, subtitle, and `[ + Create Purchase Request ]` button.
  * **4-Card Executive Summary Deck**: Pending Approvals (Amber), In-Transit / Ordered (Cyan), Fulfilled (Mint), Estimated Pending Budget (Gold).
  * **Filter Controls**: Status chips (`ALL`, `PENDING`, `APPROVED`, `ORDERED`, `RECEIVED`, `REJECTED`), Priority filter chips (`ALL`, `URGENT`, `HIGH`, `NORMAL`, `LOW`), Search input.
  * **Adaptive Requests Deck**:
    * **Desktop Table (≥ 640px)**: Request Date, Item Name, Category, Priority Badge, Estimated Cost, Requester, Status Badge, and Approval / Fulfillment actions.
    * **Mobile Cards Deck (< 640px - Failure #25 Prevention)**: Priority-bordered cards with requester avatar, estimated price, status tag, and touch action buttons.
  * **Dark Pro Modals**:
    * `PurchaseRequestModalComponent`: Dark Pro dialog for submitting requests with priority selector, item details, estimated cost, and justification.
    * `FulfillRequestModalComponent`: Dark Pro dialog for approving, ordering, and marking received with actual cost and payment source fields.
  * **Safe-Area Bottom Buffer** (`padding-bottom: 140px !important` on mobile + spacer).

---

## 🛡️ Applied Failure Shields & Prevention

1. **Failure #20 Prevention**: High-contrast inputs with floating labels, custom datepicker shield, and peso prefixes.
2. **Failure #23 Prevention**: Card containers with full 1.5px solid borders (`var(--color-border, #334155)`).
3. **Failure #24 & #26 Prevention**: Safe-area bottom buffer (`padding-bottom: 140px !important` on mobile) + `<div class="bottom-scroll-spacer"></div>`.
4. **Failure #25 Prevention**: Adaptive mobile card deck (`.mobile-cards-deck` for `< 640px` and `.desktop-table-wrapper` for `≥ 640px`) on all tables.
5. **Failure #27 Prevention**: Explicit high-contrast declarations on all modal dialog and select overlay elements (`color: #ffffff !important`).
6. **Failure #28 Prevention**: Keep action buttons accessible across all 4 screen parameters.
7. **Failure #29 Prevention**: Single scroll root (no nested `overflow-y: auto`) and responsive mobile title font clamp (`font-size: 16px !important; line-height: 1.25;`).
8. **Failure #30 Prevention**: Compact mobile input wrappers with embedded `₱` prefix and 38px height centering.
