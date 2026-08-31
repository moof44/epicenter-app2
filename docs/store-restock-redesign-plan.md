# Store Restock & Purchase Order Entry (`/store/restock`) Redesign Plan

## 1. Executive Summary & Design Goals
Overhaul the **Restock Inventory & Purchase Order Entry (`PurchaseEntryComponent`)** and its **Quick Product Creation Dialog (`ProductCreationDialog`)** to master Dark Pro token architecture, 4-Screen Responsive UI Protocol, and lessons learned:
- **Zero Black Text / Zero Grey Surfaces**: Completely replace legacy light mode backgrounds (`white`, `#fafafa`, `#f5f5f5`) and dark text (`#1a1a1a`, `#333`, `#555`, `#444`) with high-contrast tokenized typography (`var(--color-text-pure)`, `var(--color-text-body)`, `var(--color-text-secondary)`).
- **Currency Standardization**: Replace hardcoded `$` symbols with the official Philippine Peso `₱` token formatting.
- **Header & 4-Card Executive Summary Metrics Deck**:
  - *Distinct Items Count*: Number of unique items added.
  - *Total Units*: Aggregate item quantities being restocked.
  - *Estimated Total Cost*: Live calculated Grand Total in glowing gold (`₱...`).
  - *Supplier Info*: Active supplier name & invoice reference tracker.
- **Purchase Meta Details Deck**:
  - High-contrast inputs for Supplier Name, Purchase Date (with standard Datepicker shield), and Reference/Receipt Number.
- **Adaptive Restock Items Section**:
  - **Desktop / Tablet Table (≥ 640px)**: Clean tokenized item row cards with product selector (with current stock badge), quantity input, unit cost input with `₱` prefix, computed row subtotal, and quick delete icon.
  - **Mobile Cards (< 640px)**: Touch-friendly cards with product picker, stepper quantity controls (`-`/`+`), unit cost, computed row total, and removal action.
  - **Add Row Action**: `[ + Add Item Row ]` button with Cyan glow.
- **Docked Action Footer & Safe-Area Bottom Buffer (Failure #26 & #24 Prevention)**:
  - Fixed docked footer with total cost and solid gold `[ 💾 Record Purchase ]` action.
  - Bottom scroll spacer `<div class="bottom-scroll-spacer"></div>` + `padding-bottom: 220px !important` on Mobile (< 640px) and `140px !important` on Desktop/Tablet to prevent any scroll clipping of the last item.
- **Product Creation Modal Modularization**:
  - Extract and modularize `ProductCreationDialog` into dedicated `product-creation-dialog.ts`, `.html`, `.css` with Dark Pro modal styling, high-contrast inputs, category selector, and peso price fields.

---

## 2. Complete Inventory of Components

| Component / Submodule | File Paths | Key Planned Changes |
| :--- | :--- | :--- |
| **Purchase Entry Workspace** | `src/app/features/store/components/purchase-entry/` (`purchase-entry.component.ts`, `.html`, `.css`) | Overhaul component, reactive FormArray, computed summary metrics, adaptive mobile item cards, tokenized desktop rows, safe-area buffer, and docked footer. |
| **Product Creation Dialog** | `src/app/features/store/components/purchase-entry/product-creation-dialog/` (`product-creation-dialog.ts`, `.html`, `.css`) | Extract dialog, master Dark Pro modal tokens, high-contrast form fields, and peso currency formatting. |

---

## 3. Audit & Prevention of Historical Failures

1. **Failure #20 Prevention**: Clean high-contrast inputs with floating labels, custom datepicker shield, and peso prefixes.
2. **Failure #23 Prevention**: Card containers with full 1.5px solid borders (`var(--color-border, #334155)`).
3. **Failure #24 & #26 Prevention**: Safe-area bottom buffer (`padding-bottom: 220px !important` on mobile, `140px` on desktop) + `<div class="bottom-scroll-spacer"></div>` to ensure the docked footer never covers the last item.
4. **Failure #25 Prevention**: Adaptive mobile card deck for item inputs on `< 640px`.
5. **Failure #27 Prevention**: High-contrast dialog and select overlay tokens (`color: #ffffff !important`).
6. **Failure #28 Prevention**: Keep actions accessible across all 4 screen parameters.
