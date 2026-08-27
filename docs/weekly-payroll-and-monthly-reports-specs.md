# Weekly Saturday Payroll, Procurement Bridge & Monthly Reporting Specification

## 1. Executive Summary
This document defines the operational bridges between:
1. **Weekly Saturday Staff Payroll** (Sunday-to-Saturday attendance cycle with Saturday disbursement).
2. **Purchase Requests & Stock Take Reorders** (Low-stock auto-drafting and supplier payable generation).
3. **Monthly Financial Cutoff & Executive Reporting** (Consolidating 4–5 Saturday payrolls, monthly utilities, and POS revenues into an official P&L summary).

---

## 2. Weekly Saturday Payroll Bridge Architecture

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Gym Manager / Admin
    participant Att as Staff Attendance Admin (/staff-attendance)
    participant Pay as Bills & Payables (/store/payables)
    participant Till as Active Shift Drawer (/store/cash)

    Note over Admin,Att: Weekly Cycle: Sunday to Saturday
    Admin->>Att: Review Weekly Timesheets & Overtime/Deductions
    Att->>Att: Calculate totalCompensation per staff
    Admin->>Att: Click "Post Weekly Payroll (₱Total)"
    Att->>Pay: Create BillPayable (Category: SALARY_STAFF, DueDate: Saturday)
    
    opt Disbursed in Cash from Counter Till on Saturday
        Admin->>Pay: Record Payment via DRAWER_CASH
        Pay->>Till: Auto-log Expense in Saturday Active Shift
        Till->>Till: Deduct expectedClosingBalance
    end
```

---

## 3. Stock Take to Purchase Request Bridge

1. **Stock Take Deficit Detection**:
   * In `/store/stock-take`, products with `systemStock <= minStockLevel` or audited deficits are flagged.
   * Action: **"Draft Restock PR from Deficits"** auto-fills a `PurchaseRequest` with deficit quantities.
2. **Approved PR to Accounts Payable**:
   * When a PR is approved with supplier credit terms (e.g. WheyKing 30-day term), it creates a payable bill in `/store/payables` under `PURCHASE_INVENTORY`.

---

## 4. Monthly Cutoff & Executive Reporting

### 4.1. Monthly Period Aggregation Formula
* **Calendar Month Inflow**: All validated transactions between Day 1 00:00 and End of Month 23:59.
* **Calendar Month Outflows**:
  * **Weekly Payroll**: Sum of all Saturday payroll bills paid within the month (typically 4 or 5 Saturdays).
  * **Monthly Utilities**: Electricity (Meralco), Water, and Telco bills for that billing period.
  * **Store Restock / COGS**: Purchases received in that month.
  * **Operational OPEX**: Daily supplies, gym repairs, and drinking water refills.
* **Net Operating Profit**:
  $$\text{Net Profit} = \text{Monthly Inflow} - (\text{Weekly Payrolls} + \text{Utilities} + \text{COGS} + \text{OPEX})$$

### 4.2. Printable / PDF Executive Summary Format
* Executive dashboard includes a **"Print / Export Monthly Summary"** view with clean tabular formatting for owner review.
