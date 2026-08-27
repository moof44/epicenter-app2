# Shift Closing Multi-Step Wizard & Responsive Cash Count Specification

## 1. Problem Statement & User Feedback
In the initial implementation, all shift information (staff identity, financial summary, 11 denomination input fields, subtotals, summary bar, override toggle, and discrepancy card) were crammed into a single view inside the dialog. This caused vertical and horizontal scrolling, cramped input boxes, and visual clutter.

## 2. Multi-Step Wizard Architecture

### Step 1: Shift Financial Summary (`closingStep === 'SUMMARY'`)
- **Focus**: Reviewing shift revenue, expenses, and expected drawer balance.
- **Components**:
  - Staff Identity Card (`Closing Shift As: [Staff]`) with **Switch User** action.
  - Shift Financial Breakdown (Opening Balance, Cash/GCash Sales, Float In, Expenses, Cash Out/Remittances).
  - Prominent **Expected Cash in Drawer** display.
- **Action**: `Proceed to Cash Count →` button.

### Step 2: Dedicated Physical Cash Count (`closingStep === 'COUNT'`)
- **Focus**: Distraction-free, clean cash counting with denomination breakdown or manual override.
- **Components**:
  - Header with `← Back to Summary` navigation.
  - Reference chip: `Expected Cash: ₱[Amount]`.
  - Override Toggle: `[ ] Override manual cash count (Enter total directly)`.
  - **Itemized Denominations Grid**:
    - Left column: Paper Bills (₱1,000, ₱500, ₱200, ₱100, ₱50, ₱20).
    - Right column: Coins (₱20, ₱10, ₱5, ₱1, 25¢).
    - Fixed subtotal alignment, comfortable numeric inputs without scrollbars.
    - Summary footer: Total Pieces count & Counted Cash Total.
  - Live Discrepancy Meter (Balanced / Short / Over).
- **Action**: `Close Shift` (or Cancel).

---

## 3. Responsive Dialog & CSS Layout Specifications
- **Dialog Width**: Set to `580px - 620px` on desktop/tablet to provide generous breathing room for the 2-column denomination grid.
- **No Overflow / No Horizontal Scroll**: All denomination rows flex with explicit min-widths and percentage-based subtotal alignment.
- **Mobile (< 600px)**: Seamlessly collapses into a single-column card list with full-width buttons.
