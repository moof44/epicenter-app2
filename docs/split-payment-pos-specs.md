# POS Split / Combined Payment (Cash + GCash) Specifications

## 1. Overview & Business Requirements
In retail point of sale, customers occasionally settle a single order using a combination of **Cash** and **GCash** (e.g. paying ₱500 in Cash and the remaining ₱1,000 via GCash on a ₱1,500 cart total).
This specification details the end-to-end architecture, UI workflows, shift drawer impact, reporting, and void reversal protocols for handling divided/split payments.

---

## 2. Core Architecture & Data Models

### 2.1. Transaction Model (`src/app/core/models/store.model.ts`)
```typescript
export type PaymentMethod = 'CASH' | 'GCASH' | 'SPLIT';

export interface SplitPaymentDetails {
    cashAmount: number;
    gcashAmount: number;
    referenceNumber?: string | null;
    cashTendered?: number | null;
    changeDue?: number | null;
}

export interface Transaction {
    id?: string;
    date: Date;
    totalAmount: number;
    items: CartItem[];
    staffId?: string | null;
    staffName?: string | null;
    paymentMethod: PaymentMethod;
    referenceNumber?: string | null;
    amountTendered?: number | null;
    changeDue?: number | null;
    cashAmount?: number;
    gcashAmount?: number;
    splitDetails?: SplitPaymentDetails | null;
    memberId?: string | null;
    memberName?: string;
    status?: 'COMPLETED' | 'VOID';
    voidedBy?: string;
    voidReason?: string;
    voidedAt?: Date;
}
```

### 2.2. Cash Register Model (`src/app/core/models/cash-register.model.ts`)
```typescript
export interface CashTransaction {
    id?: string;
    type: CashTransactionType;
    amount: number;
    reason: string;
    timestamp: Date;
    performedBy: string;
    relatedTransactionId?: string;
    paymentMethod?: 'CASH' | 'GCASH' | 'SPLIT';
    cashAmount?: number;
    gcashAmount?: number;
    productsSummary?: string;
    voided?: boolean;
    memberName?: string;
}
```

---

## 3. Shift Drawer & Financial Accounting Rules

When a `SPLIT` transaction of Total = ₱1,500 (`cashAmount: 500`, `gcashAmount: 1000`) is committed:
1. **Total Sales & Revenue**: Increments by **₱1,500** (`+total`).
2. **Total Cash Sales**: Increments by **₱500** (`+cashAmount`).
3. **Total GCash Sales**: Increments by **₱1,000** (`+gcashAmount`).
4. **Expected Closing Balance (Drawer)**: Increments ONLY by **₱500** (`+cashAmount`) because only physical cash was placed into the drawer.
5. **Void Handling**:
   - Reverses `totalSales` and `totalRevenue` by `-1500`.
   - Reverses `totalCashSales` and `expectedClosingBalance` by `-500`.
   - Reverses `totalGcashSales` by `-1000`.

---

## 4. UI/UX Workflow

### 4.1. Checkout Dialog
- Selector with 3 choices: `Cash`, `GCash`, `Split (Cash + GCash)`.
- When **Split** is chosen:
  - Input field for **Cash Amount** (₱).
  - Input field for **GCash Amount** (₱) (auto-balances when Cash is changed: `gcash = total - cash`).
  - Validation banner: Shows breakdown and green confirmation when `cash + gcash === total`.
  - **GCash Reference Number** input.
  - **Cash Tendered Calculator**: Accepts cash given by customer (e.g. ₱1,000 bill for ₱500 cash portion) and displays `Change: ₱500.00`.
  - Disable "Confirm Payment" button until all allocations match the exact total and GCash reference number is filled.

### 4.2. Transaction History & Cash Reports
- Displays dual badge for split sales: `[💵 ₱500.00 + 📱 ₱1,000.00]`.
- Dashboard Payment Split widget correctly attributes cash vs GCash portions.

---

## 5. Implementation Status
- [ ] Update Models (`store.model.ts`, `cash-register.model.ts`)
- [ ] Enhance Checkout Dialog (`checkout-dialog.ts`, `checkout-dialog.html`, `checkout-dialog.css`)
- [ ] Connect POS component to split results (`pos.ts`)
- [ ] Update `CheckoutService` for split allocation & drawer increment (`checkout.service.ts`)
- [ ] Update `CashRegisterService` shift calculation & void reversals (`cash-register.service.ts`)
- [ ] Update Transaction History & Cash Management tables (`transaction-history.html`, `cash-management.html`, `shift-history.html`)
- [ ] Update Dashboard Payment Split Widget (`payment-split.ts`)
- [ ] Build, verify, and deploy
