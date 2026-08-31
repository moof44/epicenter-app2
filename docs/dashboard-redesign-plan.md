# Implementation Plan: Dashboard Page Dark Pro Redesign

> **Target**: Dashboard Page ONLY (`src/app/features/dashboard/` - `dashboard.html`, `dashboard.css`, `dashboard.ts`, and widget stylesheets)  
> **Philosophy**: Modernize the executive and staff dashboard with our high-contrast Midnight Slate Pro theme, eliminating all dark-grey-on-dark text and stark white card fallbacks, with strict WCAG 2.2 Level AAA compliance and the 4-Screen Responsive UI Protocol.

---

## 🎨 Architectural Specifications & Design Details

### 1. 🏛️ Page Layout & Greeting Header
- **Container**: Wrapped in `<app-page-container maxWidth="wide">` with uniform padding (`p-4 sm:p-6 lg:p-8`) and safe-area insets (`pb-safe`).
- **Greeting Typography**:
  - Greeting H1: Pure White (`var(--color-text-pure)` / `#ffffff`, **19.4:1 contrast ratio**), `font-extrabold text-2xl sm:text-3xl font-inter`.
  - Date Subtitle: Slate 300 (`var(--color-text-secondary)` / `#cbd5e1`, **12.5:1 contrast ratio**), `text-sm font-medium font-inter`.

---

### 2. 📱 Mandatory 4-Screen Responsive Grid Protocol

| Screen Parameter | Breakpoint | Grid Columns & Layout |
| :--- | :--- | :--- |
| **📱 Mobile** | `< 640px` | **1-Column vertically stacked** (`grid-template-columns: 1fr; gap: 16px;`). Full-width metric cards, touch-friendly charts. |
| **📱 Tablet Portrait** | `640px – 768px` | **2-Column card grid** (`grid-template-columns: repeat(2, 1fr); gap: 16px;`). |
| **💻 Tablet Landscape** | `769px – 1024px` | **3-Column dashboard** (`grid-template-columns: repeat(3, 1fr); gap: 20px;`). |
| **🖥️ Desktop & Wide** | `> 1024px / 1280px+` | **4-Column expansive executive layout** (`grid-template-columns: repeat(4, 1fr); gap: 24px;`). |

---

### 3. 📊 Unified Dark Pro Widget Styling (All 22 Widgets)
- **Surfaces & Cards**:
  - Background: Deep Slate App Surface (`var(--color-app)` / `#0f172a` or `var(--color-surface)` / `#1e293b`).
  - Borders: Subtle Slate Border (`1px solid var(--color-border)` / `#334155`).
  - Corner Radius: `rounded-2xl` (`16px` / `var(--radius-2xl)`).
  - Shadows: `var(--shadow-card)`.
- **Metrics & Numbers**:
  - Primary Revenue & Totals: Electric Cyan (`var(--color-cyan-light)` / `#22d3ee`, **12.8:1 contrast**) or Pure White (`#ffffff`), `font-black text-3xl sm:text-4xl`.
  - Secondary Context: Slate 300 (`var(--color-text-secondary)` / `#cbd5e1`).
- **Icons**:
  - Hero Card Icons: High-contrast cyan, gold, or emerald badges with soft glowing backgrounds.
- **Skeletons & Defer Placeholders**:
  - Shimmering deep slate cards (`bg-slate-app border border-slate-border rounded-2xl`) with smooth opacity pulse.

---

### 4. 🎛️ Manager vs Staff Performance Views
- **Manager View**:
  - Hero Pulse: Today's Revenue (`app-gym-revenue-today`), Monthly Progress (`app-monthly-progress`), Active Check-Ins (`app-members-in-gym`).
  - Trends & Breakdown: Sales Sparkline, Week Trend, Peak Hours, Payment Splits.
  - Operational Alerts: Low Stock Alerts, Voids, Cash Discrepancies.
- **Staff View**:
  - Clean focus on Today's Personal Sales, Monthly Personal Progress, Member Check-In Count, and Personal Timecard.

---

## 🛠️ Proposed Changes

### [MODIFY] `src/app/features/dashboard/dashboard.html`
- Wrap with `<app-page-container maxWidth="wide">`.
- Modernize greeting header and responsive grid container classes.
- Preserve all existing `@defer`, `@if`, signals, and role logic.

### [MODIFY] `src/app/features/dashboard/dashboard.css`
- Replace all legacy Material sys fallbacks with token custom properties.
- Establish responsive 4-column desktop, 3-column laptop, 2-column tablet, and 1-column mobile grids.
- Style the "My Performance" accordion panel with Dark Pro tokens.

### [MODIFY] Dashboard Widget Stylesheets (`src/app/features/dashboard/widgets/*/*.css`)
- Update scoped stylesheets for all 22 dashboard widgets to replace `background: white`, dark text `#1f2937`, and unmapped colors with our CSS token variables.

---

## 🧪 Verification Plan
1. **Compilation Check**: Run `npm run build` to verify 0 TypeScript and template errors.
2. **Visual & Contrast Verification**:
   - Inspect `http://localhost:4200/dashboard` on the live dev server.
   - Verify every card is deep slate `#0f172a` / `#1e293b` with `#ffffff` / `#22d3ee` / `#fbbf24` text.
   - Verify zero white card backgrounds and zero dark grey text.
3. **4-Screen Responsive Testing**:
   - **Mobile (< 640px)**: 1-column clean vertical stack.
   - **Tablet Portrait (640-768px)**: 2-column balanced grid.
   - **Tablet Landscape (769-1024px)**: 3-column layout.
   - **Desktop (1280px+)**: 4-column executive layout.
