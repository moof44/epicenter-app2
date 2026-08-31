# Implementation Plan: Workforce & HR Suite Redesign (3 Pages & 5 Sub-components)

## Overview & Scope
Redesign and modernize all 3 core features within the **WORKFORCE & HR** section from the sidebar navigation:
1. 👥 **Staff Payroll & Attendance** (`/staff-attendance` -> `StaffAttendanceAdminComponent`)
2. 📇 **Staff Directory** (`/users` -> `UserListComponent`)
3. 📊 **Business Reports & Executive Analytics** (`/reports` -> `ReportsDashboardComponent` + 5 sub-components)

All pages will strictly follow the **Master Dark Pro Token Architecture**, **4-Screen Responsive UI Protocol**, **Adaptive Table-to-Card Grid Architecture** (Failure #25 Prevention), **Safe-Area Bottom Buffer Protocol** (Failures #24, #26, #29 Prevention), and **Zero-Black-Text Contrast Rules**.

---

## 🛡️ Learning from Mistakes & Historical Failure Prevention Matrix

| Failure ID | Historical Issue | Root Cause | Prevention & Standard for Workforce & HR |
| :--- | :--- | :--- | :--- |
| **Failure #29** | Header sliced off on mobile | Nested `overflow-y: auto` in page container + large title line-height | Single scroll root in `<mat-sidenav-content>`; mobile header clamps `font-size: 16px !important; line-height: 1.25 !important;`. |
| **Failure #25** | Tables overflowing or breaking layout on mobile | Unresponsive desktop `<table>` without card transformation | Adaptive Table-to-Card protocol: `<div class="desktop-table-wrapper">` for `≥ 640px` and `<div class="mobile-cards-deck">` for `< 640px`. |
| **Failure #24 / #26** | Floating bottom bars or elements clipped | Missing safe bottom padding & scroll spacer | `padding-bottom: 140px !important;` + `<div class="bottom-scroll-spacer"></div>`. |
| **Failure #30** | Misaligned inputs in mobile cards | Using 56px Material form fields inside tight cards | Custom 38px enclosed wrappers (`.custom-cost-input-wrap`) with embedded prefixes and discrete steppers. |
| **Zero Black Text** | Invisible / low-contrast text | Missing CSS color tokens, inheriting dark browser defaults | Explicit token text styling: `#ffffff` for headings, `#e2e8f0` for body, `#cbd5e1` for secondary, `#22d3ee` cyan, `#fbbf24` gold, `#34d399` mint. |

---

## 📐 Detailed Design & Architecture Per Module

### 1. Staff Payroll & Attendance Admin (`/staff-attendance`)
- **Header Deck**: Back button with hover glow, title `Staff Time, Attendance & Weekly Payroll`, subtitle, `[ 🖥️ Open Kiosk ]`, `[ 📋 Disburse Saturday Payroll ]`.
- **4-Card Executive KPI Summary Deck**:
  - *Active Staff on Shift*: Live count of currently checked-in staff (Cyan).
  - *Weekly Deficits / Undertime*: Total missed hours across employees (Rose).
  - *Approved Overtime*: Extra approved duty hours (Mint).
  - *Estimated Net Weekly Payroll*: Total calculated payout in Peso (`₱...`) (Gold).
- **Week Navigator & Filter Deck**: 1-click previous/next week navigation, quick datepicker jump, and active/inactive employee status chips.
- **Weekly Saturday Payroll Banner**: Dark Pro card with auto-calculation of daily wages, deductions, bonuses, and 1-click Payables injection.
- **Adaptive Weekly Matrix**:
  - **Desktop Matrix Table (≥ 640px)**: Sticky employee column, 7-day grid (Sun–Sat) with check-in/out timestamps and deficit/overtime badges, total hours, and action menu.
  - **Mobile Cards Deck (< 640px)**: Touch-friendly cards per employee with avatar, role, total week hours, wage calculation, and daily expandable breakdown.

### 2. Staff Directory (`/users`)
- **SCSS to CSS Conversion**: Convert `user-list.component.scss` to `user-list.component.css` and update component decorator.
- **Header Deck**: Back button, title `Staff & Trainer Directory`, subtitle, and `[ + Add Staff Member ]` gold button.
- **4-Card Executive Summary Deck**: Total Staff Count, Active Trainers, Front Desk Staff, Management/Admins.
- **Filter & Search Deck**: Status tab chips (`All`, `Active`, `Inactive`), Role chips (`All`, `Admin`, `Manager`, `Trainer`, `Staff`), and search bar.
- **Adaptive Staff Deck**:
  - **Desktop Table (≥ 640px)**: Avatar with role ring, Name & Email, Role Chips (Admin in Rose, Manager in Cyan, Trainer in Mint, Staff in Purple), Daily Salary Rate in Peso (`₱...`), Active Status Pill, and Actions (`[ View Profile ]`, `[ Edit ]`, `[ Deactivate/Activate ]`).
  - **Mobile Cards Deck (< 640px)**: Touch cards with avatar, name, email, phone, role pills, daily wage rate, and quick action buttons.

### 3. Business Reports & Executive Analytics (`/reports`) + 5 Sub-components
- **Header Deck**: Back button, title `Business Intelligence & Executive Analytics`, subtitle, date range picker with standard picker toggle, and `[ 🔄 Generate Report ]` button.
- **4-Card Executive Summary Deck**: Total Gym Visits, Total Store Revenue, Top Product Volume, Leading Staff Sales.
- **5 Dark Pro Visual Analytics Components**:
  1. `VolumeChartComponent`: Daily Gym Check-In Volume area chart (Cyan gradient fill, dark tooltip, dark axes) & Peak Hours heatmap/list.
  2. `SalesPerformanceComponent`: Daily Sales vs Monthly Target combined column & line chart (Cyan bars + Gold quota line, dark theme).
  3. `ProductBreakdownComponent`: Top Products by Sales & Quantity dark donut chart with interactive metric toggle.
  4. `StaffSalesComponent`: Top Performing Staff horizontal bar chart (Mint & Cyan bars, dark theme).
  5. `MemberAttendanceComponent`: Top Gym Goers Leaderboard horizontal bar chart with Gold/Silver/Bronze crown badges.

---

## 🧪 Verification Plan
1. **Automated CSS Audit**: Verify 0 undefined CSS variables and 100% class coverage between HTML and CSS.
2. **Compilation Build**: Run `npm run build` to verify **0 errors and 0 warnings**.
3. **4-Screen Responsive Check**: Validate UI across mobile (< 640px), tablet portrait (640–768px), tablet landscape (769–1024px), and desktop (> 1024px).
