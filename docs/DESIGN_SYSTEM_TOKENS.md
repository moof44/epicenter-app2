# Epicenter Gym Management Design System & Master Component Specification
## 📐 Single Source of Truth CSS Custom Properties, Global Shields & Reusable UI Blueprint

> **Strict Governance Protocol**: 
> 1. Every color, font-size, font-weight, line-height, spacing, dimension, corner radius, and shadow in the application MUST strictly consume the CSS Custom Properties declared in `src/styles.css` and mapped in `tailwind.config.js`.
> 2. Zero magic numbers, arbitrary pixel values, or unmapped hex codes are permitted.
> 3. Zero unstyled elements: No text, icon, or SVG may ever inherit browser defaults in dark mode.

---

## 1. 🎨 Master Color Tokens (WCAG 2.2 AAA / AA Compliant)

| CSS Variable | Fallback / Hex | Semantic Purpose | Contrast Ratio |
| :--- | :--- | :--- | :--- |
| `--color-canvas` | `#090d16` | Deepest page canvas background | N/A |
| `--color-app` | `#0f172a` | Main app shell, top toolbar, sidebar, dialog surface | N/A |
| `--color-surface` | `#1e293b` | Cards, modals, floating panels, button backgrounds | N/A |
| `--color-surface-alt` | `#243247` | Hover surface, dropdown items, table row hovers | N/A |
| `--color-surface-input`| `#0b0f19` | Form input and text area background | N/A |
| `--color-border` | `#334155` | Card dividers, container borders, dialog outlines | N/A |
| `--color-border-light`| `#475569` | Form input borders, hover rings | 3.2 : 1 |
| `--color-border-focus`| `#22d3ee` | Focus rings, active inputs glow | N/A |
| `--color-cyan-primary`| `#06b6d4` | Primary brand accent, progress bars | N/A |
| `--color-cyan-light` | `#22d3ee` | High-contrast cyan text, icons, glowing borders | 12.8 : 1 (AAA) |
| `--color-cyan-dim` | `rgba(6, 182, 212, 0.15)` | Cyan background badges, button hover overlays | N/A |
| `--color-gold-primary`| `#f59e0b` | Brand Gold solid power buttons, emblems | N/A |
| `--color-gold-light` | `#fbbf24` | High-contrast gold text, VIP badges, fire accents | 11.2 : 1 (AAA) |
| `--color-gold-dim` | `rgba(245, 158, 11, 0.15)` | Gold pill backgrounds, highlight badges | N/A |
| `--color-mint-success`| `#34d399` | Active members, positive deltas, muscle gains | 11.5 : 1 (AAA) |
| `--color-mint-dim` | `rgba(52, 211, 153, 0.15)` | Mint pill backgrounds, success badge glow | N/A |
| `--color-rose-danger` | `#fb7185` / `#f87171` | Expired status, delete actions, regression deltas | 8.5 : 1 (AAA) |
| `--color-danger-dim` | `rgba(251, 113, 133, 0.15)`| Danger badge backgrounds | N/A |
| `--color-violet-recovery`| `#c084fc` | Rest & muscle recovery days, wellness indicators | 9.8 : 1 (AAA) |
| `--color-violet-dim` | `rgba(192, 132, 252, 0.15)`| Violet recovery badge backgrounds | N/A |
| `--color-text-pure` | `#ffffff` | Page H1 titles, major KPI values, table numbers | 19.4 : 1 (AAA) |
| `--color-text-primary`| `#f8fafc` | Section headings, primary labels | 18.2 : 1 (AAA) |
| `--color-text-body` | `#e2e8f0` | Table cells, form labels, body text | 15.2 : 1 (AAA) |
| `--color-text-secondary`| `#cbd5e1` | Subtitles, metadata, helper text, column headers | 12.5 : 1 (AAA) |
| `--color-text-muted` | `#94a3b8` | Floor text, timestamps, disabled indicators | 7.2 : 1 (AAA) |
| `--color-text-inverse`| `#020617` | Text on solid gold & cyan power pill buttons | 14.8 : 1 (AAA) |

---

## 2. 🔤 Typography & Font Weight Tokens

| CSS Variable | Value | Purpose |
| :--- | :--- | :--- |
| `--font-family-sans` | `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` | Global sans-serif typeface |
| `--font-family-mono` | `'JetBrains Mono', 'Fira Code', 'Courier New', monospace` | Numeric tables, receipt codes |
| `--font-size-2xs` | `10px / 0.625rem` | Micro badges, status pills |
| `--font-size-xs` | `12px / 0.75rem` | Secondary text, button text, helper copy |
| `--font-size-sm` | `14px / 0.875rem` | Form inputs, table data, body text |
| `--font-size-base`| `16px / 1.0rem` | Section headers, modal titles |
| `--font-size-lg` | `18px / 1.125rem` | Card titles, metric titles |
| `--font-size-xl` | `20px / 1.25rem` | Hero card titles, sub-page titles |
| `--font-size-2xl`| `24px / 1.5rem` | Page H1 titles, major KPI numbers |
| `--font-size-3xl`| `30px / 1.875rem` | Prominent dashboard headers |
| `--font-size-4xl`| `36px / 2.25rem` | Kiosk hero titles |
| `--font-weight-light` | `300` | Thin subtitles |
| `--font-weight-regular`| `400` | Standard body text |
| `--font-weight-medium` | `500` | Subtitles, helper text |
| `--font-weight-semibold`| `600` | Sub-section labels |
| `--font-weight-bold` | `700` | Table headers, card headers |
| `--font-weight-extrabold`|`800` | Badge labels, pill buttons |
| `--font-weight-black`| `900` | Page titles, large KPI numbers, power buttons |

---

## 3. 📱 4-Screen Responsive Side Gutters & Padding Standards

| Screen Tier | Viewport Width | Page Container Padding | Layout Arrangement |
| :--- | :--- | :--- | :--- |
| 📱 **Mobile** | `< 640px` | `12px 16px 120px 16px !important` | 1-column vertically stacked, 100% width buttons |
| 📱 **Tablet Portrait** | `640px – 768px` | `16px 20px 120px 20px !important` | 2-column grid cards, compact table padding |
| 💻 **Tablet Landscape** | `769px – 1024px` | `20px 24px 120px 24px !important` | 2-to-3 column dashboard matrix |
| 🖥️ **Desktop & Wide** | `> 1024px / 1280px`| `24px 32px 120px 32px !important` | Full multi-column views (up to 1400px container) |

> **Bottom Buffer Rule**: All pages and forms MUST have a minimum `120px` bottom padding (`padding-bottom: 120px;`) to prevent fixed bottom navigation docks and OS taskbars from clipping buttons or content.

---

## 4. 🛡️ Global Architectural Contrast Shields (`src/styles.css`)

These global shields guarantee that no Angular Material component ever reverts to default light theme or black fonts:

1. **Global Form & Input Contrast Shield**:
   - Forces all `input`, `textarea`, `select`, `.mat-mdc-input-element`, and `.mat-mdc-select-value` to `#ffffff` text, `#0b0f19` surface, and cyan focus halo (`--color-border-focus`).
   - Forces `.mat-mdc-select-panel`, autocomplete menus, and `.mat-datepicker-content` to `#0f172a` canvas.
2. **Global Modal Dialog Shield**:
   - Overrides `.mat-mdc-dialog-container`, `.mat-mdc-dialog-surface`, `.mdc-dialog__surface`, and `.cdk-dialog-container` with `background-color: var(--color-app) !important; border-radius: var(--radius-2xl) !important; border: 1.5px solid var(--color-border) !important;`.
3. **Global Material MDC Paginator Contrast Shield**:
   - Overrides `.mat-mdc-paginator-icon` to `fill: var(--color-cyan-light) !important;`.
   - Overrides `.mat-mdc-paginator-range-label` to `color: var(--color-text-secondary) !important;`.
   - Sets disabled pagination arrows to `fill: var(--color-text-muted) !important; opacity: 0.35 !important;`.
4. **Global Tooltip & SnackBar Shields**:
   - High-contrast dark slate pill with cyan border and pure white typography.

---

## 5. 🧩 Reusable Component & Pattern Catalog

The following design patterns have been established and MUST be reused across all future feature redesigns (Store/POS, Staff Shifts, Bookings, Reports, Settings, Inventory):

### 1. 🌟 Page Header with Identity & Actions (`.page-header`):
```html
<header class="page-header">
  <div class="header-left">
    <a routerLink="..." class="back-btn" title="Back">
      <mat-icon>arrow_back</mat-icon>
    </a>
    <div class="member-avatar">{{ initials }}</div>
    <div class="member-meta">
      <div class="name-badge-row">
        <h1 class="page-title">{{ Title }}</h1>
        <span class="goal-pill">...</span>
      </div>
      <p class="page-subtitle">{{ Subtitle }}</p>
    </div>
  </div>
  <div class="action-buttons">
    <button class="btn-primary-action">+ Primary Action</button>
  </div>
</header>
```

### 2. 🌟 Solid Eagles Gold Power Pill Button (`.btn-primary-action` / `.btn-submit-gold`):
- Background: `linear-gradient(135deg, #f59e0b 0%, #d97706 100%)`
- Color: `#090d16 !important` (Black on Gold, WCAG AAA 14.8:1)
- Hover: `linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)`, `scale(1.02)` and `box-shadow: 0 0 35px rgba(245, 158, 11, 0.65)`
- Border-radius: `var(--radius-full)`

### 3. 🌟 KPI Pulse Metric Card (`.kpi-card`):
- Gradient surface background with colored top accent border.
- `.kpi-top`: Label + `.kpi-icon-pill` (cyan, gold, mint, or rose).
- `.kpi-body`: Large value (`var(--font-size-2xl)`, `#ffffff`) + unit.
- `.kpi-footer`: `.diff-badge` or `.category-chip`.

### 4. 🌟 Dark Pro Data Table (`.table-card` & `.progress-table` / `.member-table`):
- Container: `.table-card` with `.card-section-header` and `.table-scroll-wrap`.
- Header: Sticky dark `#0f172a` th, uppercase `11px`, `var(--color-text-secondary)`.
- Rows: Hover background `rgba(6, 182, 212, 0.06)`, high-contrast `#ffffff` numbers.
- Sticky Action Dock: `.col-actions` with `position: sticky; right: 0; background-color: #0f172a;` and `.icon-action-btn`.

### 5. 🌟 Multi-Card Form Layout (`.form-card` & `.field-grid`):
- Section Header: Icon + Title + Subtitle.
- Field Wrappers: `.field-wrap` with `.field-label` (11px uppercase) and `mat-form-field.custom-mat-field`.
- Bottom Action Dock: `.form-actions-dock` with `.btn-cancel` and `.btn-submit-gold`.

### 6. 🌟 Dialogs & Modal Architecture:
- `ConfirmationDialogComponent` (`src/app/shared/components/confirmation-dialog/`)
- `QRDialog` (`src/app/shared/components/qr-dialog/`)
- `RemarksDialogComponent` (`src/app/shared/components/remarks-dialog/`)
- `Image Lightbox Modal` (`.image-lightbox-overlay`)
### 7. 🌟 Reusable MDC Autocomplete & Select Dropdown Blueprint:
* **Container**: `.mat-mdc-autocomplete-panel`, `.mat-mdc-select-panel` with `#0f172a` canvas, `border: 1.5px solid var(--color-border)`, `border-radius: var(--radius-2xl)`, `padding: 6px`.
* **Option Row**:
```html
<mat-option *ngFor="let member of members$ | async" [value]="member">
  <div class="option-member-row">
    <div class="option-avatar">{{ getInitials(member.name) }}</div>
    <div class="option-meta">
      <span class="option-name">{{ member.name }}</span>
      <span class="option-status-badge badge-active">{{ member.status }}</span>
    </div>
  </div>
</mat-option>
```
### 8. 🌟 Reusable MDC Datepicker Blueprint:
* **Container**: `<mat-datepicker-content>` with `#0f172a` canvas, `border: 1.5px solid var(--color-border)`, `border-radius: var(--radius-2xl)`.
* **Field Markup**: Always use ONLY `matIconSuffix` with `<mat-datepicker-toggle>` (do not add a duplicate `matPrefix` icon).
```html
<mat-form-field appearance="outline" class="custom-mat-field date-field">
  <mat-label>Select Date</mat-label>
  <input matInput [matDatepicker]="picker" [formControl]="dateControl" placeholder="Choose a date">
  <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
  <mat-datepicker #picker></mat-datepicker>
</mat-form-field>
```
### 9. 🌟 Reusable MDC Menu Items & Tabs Blueprint:
* **Menu Items**: `.mat-mdc-menu-item` with `color: var(--color-text-body)` and cyan hover `.mat-mdc-menu-item:hover { background: var(--color-cyan-dim); color: #ffffff; }`.
* **Tabs**: `.mat-mdc-tab` with inactive `var(--color-text-secondary)` and active `var(--color-cyan-light)`.
### 10. 🌟 Reusable MDC Form Controls (Checkboxes, Radios, Slide Toggles) Blueprint:
* **Checkbox / Radio / Toggle Labels**: Automatically styled globally to `var(--color-text-body)` with hover `#ffffff`.
* **Frames**: `var(--color-border)` and active `var(--color-cyan-light)`.
## 🔄 Mandatory Architectural Pattern: Read-Only (View Mode) vs Interactive Form (Edit Mode)

When building or redesigning profile pages, member details, or any resource with view and edit states, strictly adhere to the following architecture:

### 1. 🚫 Prohibited: Rendering Disabled Form Input Boxes as Static Data
- Never display disabled `<input>` or `<mat-form-field>` elements to represent static, read-only data.
- Disabled input boxes clutter the interface with empty grey rectangles, awkward native placeholders (e.g. `mm/dd/yyyy`), and give the user the false impression of broken or unresponsive inputs.

### 2. 👁️ View Mode (`!isEditMode()`): Clean High-Density Info Data Cards
- Present attributes in structured section cards (`.section-block`) containing responsive grids (`.data-grid-3`, `.data-grid-4`).
- Use `.info-data-card`:
  - **Label** (`.info-lbl`): `10px` uppercase Electric Cyan (`var(--color-cyan-light, #22d3ee)`), `font-weight: 800`, tracking `0.06em`.
  - **Value** (`.info-val`): Pure White (`#ffffff`, `14px`, `font-weight: 700`), or monospace (`.info-mono`) for IDs and account numbers.
  - **Empty State** (`.info-empty`): Italic muted slate (`Not Set`, `var(--color-text-muted, #94a3b8)`).
- **Zero Input Outlines**: Completely clean data presentation.

### 3. ✍️ Edit Mode (`isEditMode()`): Interactive Outline Form Fields
- Seamlessly transition to the interactive `<form [formGroup]="form">`.
- Use `<mat-form-field appearance="outline">` with standard solid cyan focus glow (`var(--color-cyan-light)`).
- **Date Inputs**: ALWAYS use `<mat-datepicker>` with `<mat-datepicker-toggle matIconSuffix [for]="picker">`. Never use raw browser `<input type="date">`.
- **Role-Locked Fields**: Display an explicit locked hint:
  ```html
  <mat-hint *ngIf="!isManagementOrAdmin">
    <mat-icon>lock</mat-icon> Managed by Admin / Management
  </mat-hint>
  ```

### 4. 🎛️ Header Control Symmetry
- **View Mode**: Outline `[ Edit Profile ]` button with cyan hover state.
- **Edit Mode**: Solid Gold gradient `[ Save Changes ]` button (`#f59e0b` $
ightarrow$ `#d97706`) + Surface `[ Cancel ]` button.
## 🪜 Global MDC Stepper Token Blueprint (Failure #22 Prevention)

To guarantee zero bright white surfaces or dark text on multi-step workflows (such as POS mobile/tablet checkout, onboarding, or member registration):

| Stepper Element | Token Property | Value | Description |
| :--- | :--- | :--- | :--- |
| **Container Canvas** | `background-color` | `var(--color-app, #090d16)` | Complete dark background across entire stepper |
| **Header Container** | `background-color` | `var(--color-surface, #0f172a)` | Top step bar surface with bottom border |
| **Inactive Step Label** | `color` | `var(--color-text-secondary, #cbd5e1)` | High-contrast secondary font (`font-weight: 700`) |
| **Active Step Label** | `color` | `#ffffff` | Pure white text with cyan glow |
| **Inactive Step Icon** | `background-color` / `color` | `var(--color-surface-elevated, #1e293b)` / `#cbd5e1` | Slate circle with border |
| **Active Step Icon** | `background` / `box-shadow` | `linear-gradient(135deg, #06b6d4, #0284c7)` / Cyan glow | Electric Cyan gradient circle |
| **Done Step Icon** | `background` / `border-color` | `linear-gradient(135deg, #10b981, #059669)` / Mint green | Mint Success gradient circle |
| **Connector Line** | `border-top-color` | `var(--color-border, #334155)` | 2px slate divider line |
## 📱 Mandatory Safe-Area Bottom Buffer Protocol (Failure #24 Prevention)

To guarantee that mobile views (`< 640px` and `640px – 768px`) never truncate tables, footers, or action buttons at the bottom of the viewport:

1. **Mobile Bottom Padding Buffer**:
   - Every page container (e.g. `.cash-management-container`, `.profile-container`, `.shift-container`, `.pos-container`) MUST declare:
     ```css
     @media (max-width: 639px) {
       .page-container {
         padding-bottom: 140px !important;
       }
     }
     @media (min-width: 640px) and (max-width: 768px) {
       .page-container {
         padding-bottom: 100px !important;
       }
     }
     ```
2. **Scrollable Data Tables on Touch Devices**:
   - All data tables MUST wrap inside an overflow container (`.table-responsive-wrapper`) with `-webkit-overflow-scrolling: touch;`.
   - The table MUST declare an explicit minimum width (`min-width: 720px` or `min-width: 760px`) and frozen sticky key columns (`.sticky-col` with `position: sticky; left: 0;`).
## 📱 Mandatory Adaptive Table-to-Card Protocol (Failure #25 Prevention)

When designing data tables that display rich composite rows (e.g. Products with thumbnails and descriptions, Members with avatars and membership tiers):

1. **Mobile (< 640px)**:
   - Do **NOT** freeze a wide 250px+ column with `position: sticky; left: 0;` on mobile, as it covers 70-80% of the viewport width.
   - Instead, render an **Adaptive Mobile Card Matrix** (`.mobile-cards-deck` visible on `< 640px` and `.table-responsive-wrapper` visible on `≥ 640px`).
   - Cards neatly stack thumbnail, title, badges, price, stock status, and action buttons in a 100% touch-friendly card.
2. **Tablet & Desktop (≥ 640px)**:
   - Render the complete tabular data matrix (`mat-table`) with full headers and column sorting.
## ⚓ Mandatory Docked Action Bar Safe-Area Protocol (Failure #26 Prevention)

When any page includes a fixed bottom docked action bar (`position: fixed; bottom: 0;`):

1. **Scroll Container Bottom Padding**:
   - **Mobile (< 640px)**: `padding-bottom: 220px !important;` (Docked bar ~160px-180px + 40-60px margin).
   - **Tablet Portrait & Landscape (640px – 1024px)**: `padding-bottom: 140px !important;` (Docked bar ~75px + 65px margin).
   - **Desktop (> 1024px)**: `padding-bottom: 140px !important;` (Docked bar ~75px + 65px margin).
2. **Physical DOM Scroll Spacer**:
   - Always place `<div class="bottom-scroll-spacer"></div>` (`height: 24px;`) directly before the fixed docked bar in HTML.
## 📱 Mandatory Mobile Header Action Priority Protocol (Failure #28 Prevention)

In the application main toolbar:
1. **Mobile (< 640px)**:
   - The brand title, **Notification Bell**, and **Chat Toggle Button** MUST always be visible.
   - Secondary status widgets (Quota badge, Shift badge) MUST be hidden on mobile (`hidden lg:flex` / `hidden sm:flex`) to eliminate header overflow.
2. **Tablet & Desktop (≥ 640px)**:
   - Display full informative status badges alongside action buttons.
## 📜 Single Scroll Root & Mobile Title Clamp Protocol (Failure #29 Prevention)

1. **Never Nest `overflow-y: auto` on Page Containers**:
   - Page containers (`.purchase-page-container`, etc.) must not define `overflow-y: auto`. Let `<mat-sidenav-content>` be the sole scrolling parent.
2. **Mobile Page Title Clamp (< 640px)**:
   - Always declare `.page-title { font-size: var(--font-size-base, 16px) !important; line-height: 1.25 !important; }` in `@media (max-width: 639px)`.
## 🎛️ Compact Mobile Card Input Architecture Protocol (Failure #30 Prevention)

In compact mobile cards and stepper controls (< 640px):
1. **Never use standard 56px Material form fields inside tight mobile grid columns**; instead use `.custom-cost-input-wrap` with embedded `₱` prefix and `height: 38px`.
2. **Steppers MUST use discrete 36px buttons (`.btn-step`) and dedicated centered input (`.mobile-qty-field`)** with `height: 38px; box-sizing: border-box;`.
3. In desktop table rows, always add `subscriptSizing="dynamic"` to `<mat-form-field>`.
