# Implementation Plan - Shift History & Reports (`/store/reports`) Redesign & Drawer Scroll Fix

## 1. Problem Diagnosis & Root Cause
On the `/store/reports` page (`ShiftHistory`), opening the shift audit detail drawer displays:
- Shift Financial Overview
- Handover Audit & Chain of Custody
- Shift Closing Physical Cash Count
- Mat Tab Group: Sales, Expenses, Float movements

### Why the content below was unreachable:
1. **Nested / Unconstrained Scroll Traps in `<mat-drawer>`**:
   - In `shift-history.css`, `.detail-drawer` lacked explicit `height: 100%; display: flex; flex-direction: column;`.
   - `.drawer-body` had `overflow-y: auto` without `flex: 1; min-height: 0;`, creating nested scroll container conflicts with Angular Material's `.mat-drawer-inner-container`.
   - As a result, the drawer expanded past the viewport boundary, and the browser window fold clipped everything starting from the bottom of the Physical Cash Count card and tab headers.
2. **Missing Bottom Safe-Area Buffer (Failure #24 / #26 Prevention)**:
   - Neither `.drawer-body` nor `.tab-content` had bottom buffer padding (`padding-bottom: 140px`), causing the active tab lists to hit the viewport bottom without scroll clearance.
3. **Legacy Light Theme & Contrast Defects**:
   - `ShiftHistory` was still using legacy `#ffffff` card backgrounds, `#0f172a` text, and `#64748b` muted labels that violate our Dark Pro design tokens and Zero-Black-Text protocol.

---

## 2. Proposed Architectural Changes

### 🎨 Design & Layout Overhaul:
1. **Full Dark Pro Token Architecture**:
   - Bind every background, card, border, text, badge, and button to master CSS variables (`var(--color-canvas)`, `var(--color-surface)`, `var(--color-text-pure)`, `var(--color-cyan-light)`, `var(--color-gold-light)`, `var(--color-mint-success)`, `var(--color-rose-danger)`).
2. **Executive 4-Card Summary Deck**:
   - Card 1: Total Shift Revenue (Cyan `₱...`)
   - Card 2: Total Shift Expenses (Rose `-₱...`)
   - Card 3: Shift Close Variance (Gold/Mint/Rose with status indicator)
   - Card 4: Handover Discrepancy & Chain-of-Custody Mismatch Counter
3. **Adaptive Table-to-Card Grid Architecture (Failure #25 Prevention)**:
   - Desktop (≥ 640px): High-contrast dark table with Date/Time, Opening & Handover pill, Sales breakdown (Cash/GCash), Outflows, Ending Cash, Variance badge, and Action triggers.
   - Mobile (< 640px): Dedicated touch card deck with status chips, metrics, and large tap targets.
4. **Forensic Audit Drawer Redesign & Scroll Architecture**:
   - Fix drawer scrolling: Configure `.detail-drawer` with `height: 100%; display: flex; flex-direction: column; background: var(--color-surface-input);`.
   - Make `.drawer-header` `flex-shrink: 0;` and `.drawer-body` `flex: 1; min-height: 0; overflow-y: auto; padding: 20px 20px 140px 20px;`.
   - Dark Pro themed cards for Financial Overview, Handover Chain-of-Custody with Denomination Matrix, Closing Physical Count, and Mat Tabs (Sales, Expenses, Float Movements) with dedicated empty states and clear typography.

---

## 3. Verification Plan
- CSS audit: 0 undefined variables, 100% class coverage.
- Full build check: `npm run build` (0 errors, 0 warnings).
- Live verification: Test `/store/reports` in desktop and mobile viewport sizes, open shift detail drawer, verify smooth scrolling all the way to the bottom of the Sales/Expenses/Float tabs.
