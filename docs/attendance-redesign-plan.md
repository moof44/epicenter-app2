# Attendance Feature Complete Redesign & Dark Pro Operations Plan

## 📌 Context & Overview
The `/attendance` page is a critical operational hub used continuously throughout the day for:
1. **Front-Desk Kiosk Check-In**: Member search, subscription validation, locker assignment, and check-in confirmation.
2. **Active Gym Floor Sessions**: Monitoring members currently on the gym floor, elapsed workout times, overdue session alerts (>3h), and check-outs.
3. **Attendance History & Audit Logs**: Date-filtered historical attendance records and session durations.

Currently, the attendance components contain inline templates with hardcoded light theme colors (`#fff3cd`, `#856404`, `#fef2f2`, `#b91c1c`, and `background: white`), black fonts, overlapping mobile elements, and unstyled tabs.

---

## 🎯 Redesign Objectives & Key Improvements

### 1. 🏗️ High-Energy Operational Header & Floor Pulse Ribbon
* **Page Header**: Title `Attendance & Gym Floor Operations`, Subtitle `Real-time kiosk check-in, active gym sessions, locker management, and historical logs`.
* **3-Card Live Floor Pulse Ribbon**:
  * 🏃 **Active On Floor**: Real-time live count of members currently checked in (`#34d399` Mint glow).
  * 🔒 **Available Lockers**: Free locker count e.g. `8 / 12 Free` (`#22d3ee` Cyan glow).
  * 📋 **Today's Check-Ins**: Cumulative check-in count for the day (`#fbbf24` Gold glow).
* **Custom Dark Pro Tab Bar**: Replaces default material tabs with custom glowing capsule tab pills (`Check-In Kiosk`, `Active Floor Sessions`, `Attendance History`).

### 2. ⚡ Check-In Kiosk Overhaul (`CheckInKiosk`)
* **Step 1: Member Search & Registration**:
  * Cyan search bar with auto-focus and autocomplete dropdown styled with Dark Pro tokens.
  * Register closed warning styled with subtle amber glowing alert card (`rgba(245, 158, 11, 0.15)`).
  * Quick `+ Add Member` solid gold power pill button.
* **Step 2: Locker Assignment & Check-In**:
  * Member summary badge with avatar initials, subscription status (`Active`, `Expired`, `Day Pass`), and member remarks.
  * **Interactive Locker Bay**: 12 high-tech locker tiles with distinct states (Available, Selected, Occupied with lock icon).
  * Solid Eagles Gold **`CONFIRM CHECK-IN`** button with sound/haptic feedback feel.

### 3. 🏃 Active Floor Sessions Overhaul (`ActiveSessions`)
* **Dark Pro Table & Responsive Cards**:
  * Member Name + Avatar badge + Gender indicator.
  * Locker pill (`#Locker 4` in cyan badge).
  * Check-in time & elapsed workout duration (with Rose alert badge for sessions > 3 hours).
  * Expiration date status badge.
  * Member remarks warning pill.
  * Quick **`CHECK OUT`** action button with confirmation dialog.

### 4. 📜 Attendance History Overhaul (`AttendanceHistory`)
* Datepicker styled with Dark Pro calendar and pure white typography (eliminating the `background: white` bug).
* Records count badge.
* Chronological attendance table with Time In, Time Out, Total Workout Duration, Locker #, and Status.

---

## 📱 4-Screen Responsive UI Protocol & Design Tokens
* 📱 **Mobile (< 640px)**: `padding: 12px 16px 120px 16px !important;`
* 📱 **Tablet Portrait (640px – 768px)**: `padding: 16px 20px 120px 20px !important;`
* 💻 **Tablet Landscape (769px – 1024px)**: `padding: 20px 24px 120px 24px !important;`
* 🖥️ **Desktop & Wide (> 1024px)**: `padding: 24px 32px 120px 32px !important;`
* **Safe Buffer**: Minimum `120px` bottom padding to prevent fixed navigation docks and taskbars from clipping buttons.
* **Token Governance**: 100% bound to `src/styles.css` tokens documented in `docs/DESIGN_SYSTEM_TOKENS.md`.

---

## 🧪 Verification Plan
1. **Selector Coverage Audit**: Run `scratch/audit-attendance-css.js` to guarantee 100% of HTML class names are explicitly declared in component CSS.
2. **Build Verification**: Run `npm run build` to confirm 0 compilation errors and 0 warnings.
3. **Multi-Tab Functional Verification**: Verify Check-In, Locker Selection, Active Session list, Overdue check, Checkout, and History filtering across mobile, tablet, and desktop viewports.
