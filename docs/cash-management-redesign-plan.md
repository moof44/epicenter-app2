# Cash Management & Cash Register (`/store/cash`) Complete Redesign Plan

## 1. Executive Summary & Design Goals
Redesign the entire Cash Management & Register workspace (`/store/cash`) and the `ShiftControlModal` into our master Dark Pro design system:
- **Zero Black Text / Zero Grey Surfaces**: Completely eliminate legacy white modal dialogs (`#ffffff`), light grey summary cards, and unstyled grey text.
- **Actionable Financial Command Center**:
  - **Active Shift Header**: Pulsing live status indicator, staff performer tag, Shift Control modal trigger, and Recalculate Shift sync action.
  - **Summary Metrics Deck**: 6-card executive summary (Opening Balance, Total Revenue with Cash/GCash splits, Float In, Expenses, Float Out, Current Drawer Balance).
  - **Quick Action Bar**: Dedicated 1-click action triggers (`Add Expense`, `Cash In / Float`, `Cash Out / Remit`) with instant inline form invocation.
  - **Inline Cash Movement Form**: Dark Pro form card with category selector (using Global MDC Select Shield), Payee/Supplier input, amount with prefix, and Save/Cancel controls.
  - **Today's Cash Movements Table**: High-contrast dark table with frozen sticky headers, color-coded transaction badges, category metadata pills, split payment breakdown tooltips, amount indicators (`+` Mint Green / `-` Rose Red), and Void action tags.
  - **Closed Register State**: Actionable Amber Alert card with 1-click **[ Open Register ]** trigger.
- **Shift Control Modal (`ShiftControlModal`)**:
  - **Open Register Flow**: Dark Pro modal with active staff identity, previous shift handover reference banner with 1-click **[ Same as Previous Handover ]** shortcut, liability confirmation card, bill/coin denomination breakdown grid with live sum calculations, and Solid Gold open trigger.
  - **Close Register Wizard Flow**: 2-step closing wizard with live drawer count, expected vs actual variance analysis (Over/Short indicator with automatic color coding), cash drop vs float retention calculations, and handover audit log.
- **Strict 4-Screen Responsive UI Protocol**:
  - 📱 **Mobile (< 640px)**: 1-column vertically stacked metric cards, full-width action buttons, horizontally scrollable table with sticky columns.
  - 📱 **Tablet Portrait (640px – 768px)**: 2-column cards, condensed table padding.
  - 💻 **Tablet Landscape (769px – 1024px)**: 3-column summary cards, expanded table layout.
  - 🖥️ **Desktop (> 1024px)**: Full 6-column executive grid with maximum horizontal matrix.

---

## 2. Complete Inventory of Components

| Component / Submodule | File Paths | Key Planned Changes |
| :--- | :--- | :--- |
| **Cash Management Page** | `src/app/features/store/components/cash-management/` (`cash-management.ts`, `cash-management.html`, `cash-management.css`) | Header with live pulse pill, 6 summary metric cards, quick action buttons, inline Dark Pro form, transactions table with sticky header, closed register empty state. |
| **Shift Control Modal** | `src/app/features/store/components/shift-control-modal/` (`shift-control-modal.ts`, `shift-control-modal.html`, `shift-control-modal.css`) | Dark Pro modal shell (eliminating `#ffffff`), Open Register flow with denomination matrix & handover copy shortcut, Close Register wizard with variance calculations and cash drop splits. |

---

## 3. Audit & Prevention of Previous Failures

1. **Reused Shields & Global Patterns**:
   - Reuses **Global MDC Select & Autocomplete Dropdown Shield** for category selection.
   - Reuses **Global MDC Checkbox & Radio Shield** for liability confirmation.
   - Reuses **Global MDC Table Contrast Shield** for frozen sticky dark headers.
   - Reuses **Global Button & Chip Shields** with zero magic numbers and Level AAA contrast.
2. **Zero Dark-on-Dark Text**:
   - Pure White headings (`#ffffff`), body text (`#e2e8f0`), secondary metadata (`#cbd5e1`), Electric Cyan values (`#22d3ee`), Gold totals (`#fbbf24`), Mint Green positives (`#34d399`), Rose Red negatives (`#f87171`).
3. **Automated Audit**:
   - Automated Node.js script to verify 100% CSS class coverage and 0 undefined variables before build.
   - `npm run build` with 0 errors and 0 warnings.
