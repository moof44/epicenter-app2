# Point of Sale & Store (`/store/pos`) Complete Redesign Plan

## 1. Executive Summary & Goals
Overhaul the entire Point of Sale (POS) workspace (`/store/pos`) and its sub-modals (`CheckoutDialog`, `ClaimVoucherDialog`, `PriceOverrideDialog`, and `ProductCatalogComponent`) into our unified Dark Pro design system:
- **Zero Black Text / Zero Grey Surfaces**: Eliminate legacy `#f0f2f5` light background, `#ffffff` white member bars, and dark grey fonts (`#666`, `rgba(0,0,0,0.6)`).
- **Actionable Cash Register UX**: Prominent Amber Alert banner when register is closed with 1-click **[ Open Shift Now ]** button.
- **Desktop Two-Column Command Matrix (≥ 960px / > 1024px)**:
  - **Left Product Deck**: Sleek member search bar with autocomplete shield, Claim Voucher trigger, category filter pill bar, and radiant product cards with stock status pills.
  - **Right Real-Time Cart Deck**: Dark Pro cart panel with live line-item price overrides, quantity incrementers, glowing subtotal summaries, and Solid Gold checkout trigger.
- **Mobile/Tablet Stepper Flow (< 960px)**:
  - 3-step streamlined flow: Member Identification $ightarrow$ Product Grid $ightarrow$ Order Review & Pay.
- **Sub-Modals & Dialogs**:
  - **`CheckoutDialog`**: Dark Pro dialog shell, segmented payment method pill toggle (`Cash`, `GCash`, `Split`), interactive Cash Calculator with Quick Cash pills (`Exact`, `₱100`, `₱500`, `₱1,000`), and real-time Change Due pill.
  - **`ClaimVoucherDialog`**: Dark Pro voucher fulfillment dialog with code input and success reward summary banner.
  - **`PriceOverrideDialog`**: Dark Pro dialog replacing inline legacy styles with Level AAA tokens.
  - **`ProductCatalogComponent`**: Visual Dark Pro digital showcase for gym merchandise and supplements.

---

## 2. Complete Inventory of Components & Dialogs

| Component / Dialog | File Paths | Key Planned Changes |
| :--- | :--- | :--- |
| **POS Main Interface** | `src/app/features/store/components/pos/` (`pos.ts`, `pos.html`, `pos.css`) | Two-column desktop deck + mobile stepper, member bar, category pills, product grid cards, cart items list, cart footer. |
| **Checkout Dialog** | `src/app/features/store/components/pos/checkout-dialog/` (`checkout-dialog.ts`, `checkout-dialog.html`, `checkout-dialog.css`) | Payment methods toggle (`Cash`, `GCash`, `Split`), cash keypad/calculator, change due display, split payment sliders/inputs. |
| **Claim Voucher Dialog** | `src/app/features/store/components/pos/claim-voucher-dialog/` (`claim-voucher-dialog.ts`, `claim-voucher-dialog.html`, `claim-voucher-dialog.css`) | Dark Pro dialog shell, code verification input, reward fulfillment banner. |
| **Price Override Dialog** | `src/app/features/store/components/pos/price-override-dialog/` (`price-override-dialog.ts`) | Replace legacy inline styles with Dark Pro token classes and high-contrast inputs. |
| **Product Catalog Dialog** | `src/app/features/store/components/product-catalog/` (`product-catalog.ts`, `product-catalog.html`, `product-catalog.css`) | Merchandise category showcase, product grid, detail view with Add to Cart button. |

---

## 3. Audit & Prevention of Previous Failures

1. **Reused Shields & Components**:
   - Reuses **Global MDC Autocomplete & Select Dropdown Shield** (for member search).
   - Reuses **Global MDC Datepicker Contrast Shield** (if date inputs are used).
   - Reuses **Global MDC Tabs & Button Toggles Contrast Shield**.
   - Reuses **Global Strict Responsive Visibility Shield**.
2. **Zero-Dark-Text & Zero-Magic-Numbers**:
   - 100% token adherence against `src/styles.css` and `docs/DESIGN_SYSTEM_TOKENS.md`.
   - Pure White titles (`#ffffff`), Electric Cyan prices (`#22d3ee`), Gold totals (`#fbbf24`), Mint success indicators (`#34d399`).
3. **Automated Audit**:
   - Automated Node.js script to verify 100% CSS class coverage and 0 undefined variables before build.
   - `npm run build` with 0 errors and 0 warnings.
