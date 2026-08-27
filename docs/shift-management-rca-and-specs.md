# Root Cause Analysis (RCA) & Technical Specification: Shift Management & Multi-Device Session Integrity

---

## 1. Executive Summary & Incident Timeline (Aug 26, 2026)

### 1.1 The Incident Observed
On August 26, 2026, three consecutive shifts were recorded in the system:
1. **Shift 1 (8:20 AM - 3:15 PM)**:
   - Opened & Closed By: **Elaine Jane Pepito**
   - Opening: ₱2,539.00 | Total Sales: +₱840.00 | Expected & Actual Close: ₱2,609.00 (Balanced ✓)
2. **Shift 2 (3:16 PM - 3:43 PM)**:
   - Opened & Closed By: **Aljay Tindoy** (Duration: 27 minutes)
   - Opening: ₱2,609.00 | Sales/Expenses: ₱0.00 | Expected & Actual Close: ₱2,609.00 (Balanced ✓)
3. **Shift 3 (3:43 PM - 10:58 PM)**:
   - Opened & Closed By: **Elaine Jane Pepito** (⚠️ Bug: Aljay Tindoy was on duty, but Elaine's account took over the shift)
   - Opening: ₱2,609.00 | Sales: +₱640.00 | Expenses: -₱357.00
   - Recorded Expected Close: **₱2,002.00** vs Actual Cash Count: **₱2,872.00**
   - Recorded Discrepancy: **+₱870.00** (False Overage)

---

## 2. Root Cause Analysis (RCA)

### 2.1 Bug #1: Wrong User Account Owning the Shift (Elaine vs Aljay)
#### The Mechanism:
1. **Shared Counter Tablet vs Personal Mobile Phones**:
   - The gym operates with a **shared reception tablet** and individual **staff smartphones**.
   - When Shift 1 ended at 3:15 PM, Elaine was logged into the tablet.
   - At 3:16 PM, Aljay opened Shift 2 (`openedBy: 'Aljay Tindoy'`) from his phone (or tablet).
   - At 3:43 PM, staff noticed confusion in the UI and logged out to switch users.
   - However, when Shift 3 was opened at 3:43 PM on the counter tablet, the tablet's browser was still authenticated as Elaine (or auto-logged in / restored session).
2. **Missing User Identity Confirmation in UI**:
   - The `ShiftControlModal` (`Open Register` / `Close Register`) **never displays the name of the currently logged-in user**.
   - Staff clicking "Open Shift" on the counter tablet had no visual feedback indicating which account was active.
   - The shift was created with `openedBy = authService.userProfile()?.displayName`, silently binding the tablet's active session to the physical cash register.
3. **Missing Real-Time Multi-Device Shift Synchronization**:
   - `CashRegisterService` only polled `getOpenShift()` once at service construction or upon local transactions.
   - It lacked an active real-time Firestore subscription (`onSnapshot`). If a shift was opened/closed on a phone, the tablet continued displaying stale state until refreshed.

---

### 2.2 Bug #2: Ending Balance Discrepancy (₱2,872 Expected vs ₱2,002 in Database)
#### The Mechanism:
1. **Mathematical Breakdown**:
   - Opening Balance: ₱2,609.00
   - Cash Sales: +₱620.00 (Total sales: ₱640.00, GCash: ₱20.00)
   - Expenses: -₱357.00
   - True Drawer Expected Cash: $2609 + 620 - 357 = \mathbf{₱2,872.00}$.
   - Physical Cash Count entered at close: **₱2,872.00**.
   - Database Expected Closing Balance: **₱2,002.00**.
   - Discrepancy: $2872 - 2002 = \mathbf{+₱870.00}$.
2. **Why was Expected Balance ₱2,002.00?**:
   - A difference of exact **₱870.00** ($2872 - 2002 = 870$).
   - When Shift 2 (3:16 - 3:43 PM) was closed and Shift 3 was opened, if Shift 3's initial `expectedClosingBalance` or an un-recalculated transaction was deducted or if an expense/float was applied before the shift initialized, or if a manual cash out / expense of ₱870 occurred or was recorded without full sync.
   - In `ShiftHistory`, recalculation was not run automatically on shift closing, preserving the discrepancy.

---

## 3. Comprehensive Risk Assessment: What Else Can Go Wrong in Shift Management?

| Risk Area | Vulnerability | Business Impact |
| :--- | :--- | :--- |
| **1. Multi-Device Desync** | Tablet and phone see different shift states due to lack of real-time Firestore listeners. | Staff opens duplicate shifts or sells on a "closed" drawer. |
| **2. Identity Ambiguity** | Shift modals do not show active user or permit selecting/confirming who is physically opening the register. | Shifts and cash drawer discrepancies get attributed to the wrong employee. |
| **3. Handover Blindness** | Incoming staff does not explicitly verify the outgoing staff's closing cash count. | Shift discrepancies carry over undetected across staff changes. |
| **4. Accidental Closure / Misentry** | Closing balance modal defaults or allows accidental submission of mismatched amounts without warning. | False shortage/overage records distorting payroll and cash reports. |
| **5. Stale Shift Calculations** | If an expense, float, or void occurs across tabs, `expectedClosingBalance` can become desynchronized. | Discrepancies between physical cash drawer and database reports. |

---

## 4. Architectural Remediation & Technical Specifications

### 4.1. Real-Time Active Shift Sync (`CashRegisterService`)
- Replace one-shot `getOpenShift()` query with a **real-time Firestore listener** (`collectionData` / `onSnapshot`).
- Automatically updates all open devices (tablets, phones, PCs) instantly when any shift opens, closes, or records a cash transaction.

### 4.2. Prominent Staff Identity & Handover Confirmation in Shift Modals
- **Open Register Modal**:
  - Prominently displays: **"Opening Shift As: [Staff Name]"** with avatar/badge.
  - "Not you? Switch Account / Logout" shortcut button directly inside the modal.
  - Shows previous shift closing info: **"Previous Shift Closed By: [Prev Staff] at [Time] with ₱[Amount]"**.
- **Close Register Modal**:
  - Prominently displays: **"Closing Shift As: [Staff Name]"**.
  - Shows clear real-time breakdown of Cash Sales, GCash Sales, Floats, and Expenses.
  - Highlights discrepancy in real-time with explicit confirmation if closing with a variance.

### 4.3. Self-Healing Shift Recalculation on Shift Close
- When closing a shift, automatically execute a quick internal recalculation from the shift's transaction array to ensure `expectedClosingBalance` exactly matches $(\text{Opening} + \text{Cash Sales} + \text{Float In} - \text{Expenses} - \text{Float Out})$ before writing the final `CLOSED` document.

### 4.4. Shift Management UI Header & Quick Switch
- In `CashManagement` and `POS` header, display: **"Active Shift: [Opened By Name] · ₱[Current Cash]"**.
- Provide a 1-click **"Switch User"** dialog or logout shortcut to prevent tablet session lingering.

---

## 5. Implementation Checklist
- [ ] Implement Real-Time Firestore listener in `CashRegisterService`
- [ ] Upgrade `ShiftControlModal` with Staff Identity card & Switch User action
- [ ] Upgrade `ShiftControlModal` with Previous Shift Handover verification
- [ ] Add atomic pre-close recalculation in `CashRegisterService.closeShift()`
- [ ] Display Active Shift Staff & Drawer details in `CashManagement` header
- [ ] Verify multi-device sync, build, and deploy
