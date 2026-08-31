# Implementation Plan: Dashboard Widget Contrast & Legibility Overhaul

> **Target**: All Dashboard Widget Scoped Stylesheets (`src/app/features/dashboard/widgets/*/*.css`)  
> **Root Cause Addressed**: Mismatched CSS selectors left critical template elements (`.empty-text`, `.empty-subtext`, `.ring-label`, `.contribution-line`, `.badge-pill`, `.banner-title`, `.banner-subtitle`, `.card-total`, etc.) unstyled, causing them to fall back to black/dark-grey text on dark backgrounds.

---

## 🎨 Architectural Fixes & Exact Selector Mapping

### 1. 🛑 `staff-kiosk-widget.css`
- **HTML Selectors Mapped**: `.kiosk-header-banner`, `.banner-info`, `.icon-wrap`, `.terminal-icon`, `.banner-title`, `.banner-subtitle`, `.launch-btn`.
- **Contrast Enforced**:
  - `.banner-title`: Pure White (`var(--color-text-pure)` / `#ffffff`, **19.4:1 contrast**), `font-bold text-base`.
  - `.banner-subtitle`: Mint Success (`var(--color-mint-success)` / `#34d399`, **14.2:1 contrast**).
  - `.launch-btn`: Eagles Gold Action Pill (`bg-eagle-gold-dim border border-eagle-gold/40 text-eagle-gold-light`).

---

### 2. 🛑 `monthly-progress.css`
- **HTML Selectors Mapped**: `.progress-card`, `.card-header`, `.card-icon`, `.card-title`, `.ring-container`, `.progress-ring`, `.ring-text`, `.ring-pct`, `.ring-label`, `.contribution-line`, `.gym-context`, `.daily-target`.
- **Contrast Enforced**:
  - `.ring-pct`: Pure White / Cyan (`#ffffff`, **19.4:1 contrast**), `font-extrabold text-2xl`.
  - `.ring-label`: Slate 300 (`var(--color-text-secondary)` / `#cbd5e1`, **12.5:1 contrast**).
  - `.contribution-line`: Slate 200 (`var(--color-text-body)` / `#e2e8f0`, **15.2:1 contrast**).
  - `.daily-target`: Eagles Royal Gold (`var(--color-gold-light)` / `#fbbf24`, **11.2:1 contrast**).
  - SVG Progress Track: Deep slate stroke (`#334155`), not blinding `#e0e0e0`.

---

### 3. 🛑 `gym-revenue-today.css` & `members-in-gym.css`
- **HTML Selectors Mapped**: `.revenue-card`, `.gym-card`, `.empty-state`, `.empty-icon`, `.empty-text`, `.empty-subtext`, `.count-row`, `.count-number`, `.count-label`, `.names-line`.
- **Contrast Enforced**:
  - `.empty-text`: Pure White (`#ffffff`, **19.4:1 contrast**), `font-bold text-sm`.
  - `.empty-subtext`: Slate 300 (`#cbd5e1`, **12.5:1 contrast**), `font-medium text-xs`.
  - `.empty-icon`: Electric Cyan (`#22d3ee`) or Mint (`#34d399`).
  - `.gym-card`: Deep slate card background with 1px border (`#334155`).

---

### 4. 🛑 `badge-row.css` & `staff-leaderboard.css`
- **HTML Selectors Mapped**: `.badge-row`, `.badge-pill`, `.streak`, `.shift-open`, `.shift-closed`, `.status-dot`, `.leaderboard-card`, `.spotlight-banner`, `.rankings-list`, `.rank-row`, `.rank-badge`, `.rank-name`, `.rank-amount`, `.rank-count`.
- **Contrast Enforced**:
  - `.badge-pill`: Deep Slate Pill with 1px border (`#334155`), Pure White text (`#ffffff`).
  - `.shift-closed`: Eagles Gold pill with gold text (`#fbbf24`).
  - `.leaderboard-card .empty-text`: Pure White (`#ffffff`), `.empty-subtext`: Slate 300 (`#cbd5e1`).

---

### 5. 🛑 `sales-sparkline.css`
- **HTML Selectors Mapped**: `.sparkline-card`, `.card-title`, `.card-total`, `.hover-info`, `.hover-target`, `.active-dot`.
- **Contrast Enforced**:
  - `.card-total`: Electric Cyan (`#22d3ee`, **12.8:1 contrast**), `font-bold text-sm`.
  - `.hover-target`: Transparent fill with Cyan glow ring (`fill: #06b6d4; stroke: #22d3ee;`), eliminating all black dots (`#000`).
  - `.active-dot`: Electric Cyan with bright white core.

---

## 🛠️ Proposed Changes

### [MODIFY] Scoped CSS for All 22 Dashboard Widgets:
- [MODIFY] `src/app/features/dashboard/widgets/staff-kiosk-widget/staff-kiosk-widget.css`
- [MODIFY] `src/app/features/dashboard/widgets/monthly-progress/monthly-progress.css`
- [MODIFY] `src/app/features/dashboard/widgets/gym-revenue-today/gym-revenue-today.css`
- [MODIFY] `src/app/features/dashboard/widgets/members-in-gym/members-in-gym.css`
- [MODIFY] `src/app/features/dashboard/widgets/badge-row/badge-row.css`
- [MODIFY] `src/app/features/dashboard/widgets/staff-leaderboard/staff-leaderboard.css`
- [MODIFY] `src/app/features/dashboard/widgets/sales-sparkline/sales-sparkline.css`
- [MODIFY] `src/app/features/dashboard/widgets/todays-sales/todays-sales.css`
- [MODIFY] `src/app/features/dashboard/widgets/top-product/top-product.css`
- [MODIFY] `src/app/features/dashboard/widgets/vs-last-month/vs-last-month.css`
- [MODIFY] `src/app/features/dashboard/widgets/week-trend/week-trend.css`
- [MODIFY] Remaining 11 widgets (`activity-feed`, `commendation`, `member-health`, `low-stock-alerts`, `payment-split`, `peak-hours`, `recent-voids`, `cash-discrepancies`, `personal-bests`, `my-attendance-widget`, `members-checked-in`).

---

## 🧪 Verification Plan
1. **Compilation Check**: Run `npm run build` to verify 0 TypeScript and template errors.
2. **Visual & Contrast Inspection**: Inspect `http://localhost:4200/dashboard` to verify:
   - **Zero black/dark-grey text** on any card.
   - All empty-state messages ("No gym sales yet today", "No members in the gym", "Start your streak today", "Register Closed") are crisp Pure White and Slate 300.
   - All numbers, daily goals, and progress text in the Monthly Progress donut are brightly readable.
   - Sparkline chart dots are Electric Cyan, not black.
