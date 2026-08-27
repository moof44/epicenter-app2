# Cash Denomination Breakdown & Manual Override Audit Specifications

## 1. Overview & Business Requirements
To enforce strict financial accountability during register closing and shift handovers, physical cash counting supports two methods:
1. **Denomination Breakdown Calculator (DEFAULT)**:
   - Staff counts and enters the quantity of each physical bill and coin.
   - The system automatically computes subtotals and the grand total cash count.
2. **Manual Direct Total Override (OPTIONAL)**:
   - Allowed only when staff explicitly checks the "Override & Enter Total Manually" checkbox.
   - Using this override triggers an audit flag:
     - Stored permanently in the shift record (`isManualClosingCountOverride: true`).
     - Highlighted in Cash Reports & Shift History with an audit warning badge.
     - Pushes a real-time notification to Admins/Managers.

---

## 2. Currency Denominations (PHP)

| Denomination | Type | Label | Example Qty | Subtotal |
| :--- | :--- | :--- | :--- | :--- |
| **₱1,000** | Bill | ₱1,000 | 2 pcs | ₱2,000.00 |
| **₱500** | Bill | ₱500 | 1 pc | ₱500.00 |
| **₱200** | Bill | ₱200 | 0 pcs | ₱0.00 |
| **₱100** | Bill | ₱100 | 1 pc | ₱100.00 |
| **₱50** | Bill | ₱50 | 0 pcs | ₱0.00 |
| **₱20** | Bill | ₱20 | 0 pcs | ₱0.00 |
| **₱10** | Coin | ₱10 | 0 pcs | ₱0.00 |
| **₱5** | Coin | ₱5 | 1 pc | ₱5.00 |
| **₱1** | Coin | ₱1 | 4 pcs | ₱4.00 |
| **25¢** | Coin | 25¢ | 0 pcs | ₱0.00 |
| **GRAND TOTAL** | | | **5 pcs** | **₱2,609.00** |

---

## 3. Data Model Enhancements (`src/app/core/models/cash-register.model.ts`)

```typescript
export interface DenominationBreakdown {
  [denomination: string]: number; // e.g. { "1000": 2, "500": 1, "100": 1, "5": 1, "1": 4 }
}

export interface ShiftSession {
  // Existing fields...
  isManualClosingCountOverride?: boolean;
  closingDenominations?: DenominationBreakdown | null;
  isManualOpeningCountOverride?: boolean;
  openingDenominations?: DenominationBreakdown | null;
}
```

---

## 4. UI/UX Workflow & Components

### 4.1. Shift Control Modal (`shift-control-modal.html`)
- **Default State**:
  - Itemized denomination grid (Bills: ₱1000, ₱500, ₱200, ₱100, ₱50, ₱20; Coins: ₱10, ₱5, ₱1, 25¢).
  - Each item has a quantity input and real-time subtotal.
  - Calculated Grand Total updates in real time and links directly to the Actual Cash Count & Discrepancy meter.
- **Manual Override Toggle**:
  - Checkbox: `[ ] Override manual cash count (Enter total directly)`.
  - When checked:
    - Displays amber notice: `⚠️ Manual total override will be flagged in Cash Reports and notified to administrators.`
    - Unlocks manual total input field.
    - Dimmed/collapsed denomination breakdown.

### 4.2. Cash Reports & Shift History (`shift-history.html`, `shift-history.ts`)
- Displays an audit chip on shift records:
  - `⚠️ Manual Override` (if override used)
  - `📋 Itemized (10 bills, 5 coins)` (if denomination breakdown used)
- In the Shift Details Drawer, renders the full **Itemized Denomination Breakdown Table** or the **Manual Override Audit Warning**.

### 4.3. Admin / Manager Notification (`notification.service.ts`)
- When a shift is closed via Manual Override, triggers an admin alert:
  - Title: `⚠️ Shift Closed with Manual Cash Override`
  - Body: `${closedBy} closed shift with a manual total (₱${actualClosingBalance}) without denomination breakdown.`

---

## 5. Responsive Design Specs
- **Tablet / Desktop (>= 600px)**: 2-column grid side-by-side (Paper Bills on Left, Coins on Right) with prominent total counter at bottom.
- **Mobile Handset (< 600px)**: 1-column clean card list with easy-touch stepper / number inputs.
