# Bug Report & Implementation Plan: Duplicate ₱20 Denomination in Shift Cash Audit

## 1. Executive Summary & Forensic Findings

In the **Shift Audit & Forensic Details** modal (`/store/reports`), the Handover Chain-of-Custody table displays **two duplicate rows for ₱20** with identical piece counts, unit differences, and value differences. Furthermore, in the **Shift Control Modal** (`/store/pos`), ₱20 was duplicated across both the **Banknotes (Bills)** group and the **Coins** group, causing cash inflation, key collisions in Firestore, and double-counted opening/closing cash calculations.

---

## 2. Root Cause Analysis

### Cause 1: Duplicate Entry in `STANDARD_DENOMINATIONS`
In [`src/app/core/utils/cash-register.utils.ts`](file:///e:/Programming/epicenter-app2/src/app/core/utils/cash-register.utils.ts):
```typescript
export const STANDARD_DENOMINATIONS = [
  { denomination: 1000, label: '₱1,000 Bill', type: 'BILL' as const },
  { denomination: 500, label: '₱500 Bill', type: 'BILL' as const },
  { denomination: 200, label: '₱200 Bill', type: 'BILL' as const },
  { denomination: 100, label: '₱100 Bill', type: 'BILL' as const },
  { denomination: 50, label: '₱50 Bill', type: 'BILL' as const },
  { denomination: 20, label: '₱20 Bill', type: 'BILL' as const },  // <--- Duplicate #1
  { denomination: 20, label: '₱20 Coin', type: 'COIN' as const },  // <--- Duplicate #2
  { denomination: 10, label: '₱10 Coin', type: 'COIN' as const },
  { denomination: 5, label: '₱5 Coin', type: 'COIN' as const },
  { denomination: 1, label: '₱1 Coin', type: 'COIN' as const },
  { denomination: 0.25, label: '25¢ Coin', type: 'COIN' as const }
];
```
In `compareDenominations()`, each item in `STANDARD_DENOMINATIONS` looks up `key = String(item.denomination)`.
Because both entries have `denomination = 20`, both entries look up `key = "20"` against `prevBreakdown` and `openBreakdown`.
Both entries retrieve the exact same piece count (e.g. `2 pcs` and `20 pcs`), pushing two identical `DenominationAuditDiffItem` objects into `diffItems`.

In [`shift-history.html`](file:///e:/Programming/epicenter-app2/src/app/features/store/components/shift-history/shift-history.html):
```html
<span class="denom-pill">₱{{ item.denomination }}</span>
```
The table renders `₱20` for both rows without distinguishing bill vs coin, showing identical numbers on both lines.

---

### Cause 2: Double-Counting During "Copy Previous Handover"
In [`src/app/features/store/components/shift-control-modal/shift-control-modal.ts`](file:///e:/Programming/epicenter-app2/src/app/features/store/components/shift-control-modal/shift-control-modal.ts):
₱20 is included in both `openingBillDenominations` and `openingCoinDenominations`:
```typescript
openingBillDenominations: [ ..., { denomination: 20, label: '₱20', type: 'BILL', count: 0 } ];
openingCoinDenominations: [ { denomination: 20, label: '₱20 Coin', type: 'COIN', count: 0 }, ... ];
```
When staff clicks **"Copy exact handover count from previous shift"** (`copyPreviousHandover()`):
```typescript
for (const b of this.openingBillDenominations) {
  b.count = Number(prevClosingDenoms[String(b.denomination)] || 0); // Sets ₱20 Bill = 2
}
for (const c of this.openingCoinDenominations) {
  c.count = Number(prevClosingDenoms[String(c.denomination)] || 0); // Sets ₱20 Coin = 2
}
this.openingBalance = this.getCalculatedOpeningTotal();
```
`getCalculatedOpeningTotal()` loops through **both** bills and coins:
`2 * ₱20 + 2 * ₱20 = ₱40 + ₱40 = ₱80`!
**The physical ₱40 was duplicated into ₱80**, inflating the calculated opening balance by ₱40!

---

### Cause 3: Map Key Collision / Overwriting in Firestore (`DenominationBreakdown`)
`DenominationBreakdown` is stored as a map (`Record<string, number>`). In a dictionary or Firestore map, keys must be unique (`"20"` can only exist once).
When saving:
```typescript
for (const b of this.openingBillDenominations) {
  if (b.count > 0) denominations[String(b.denomination)] = b.count;
}
for (const c of this.openingCoinDenominations) {
  if (c.count > 0) denominations[String(c.denomination)] = c.count;
}
```
If a staff member entered bills into the ₱20 bill field AND coins into the ₱20 coin field, **the coin loop directly overwrote the bill count in Firestore**!

---

### Cause 4: Historical Shift Data Rendering (`diffItems` saved in Firestore)
In shift `Q8IlvIWU6FRs3zERP6Pc` (Sep 3, 2026, 7:39:50 AM seen in user screenshot):
The `handoverAudit.diffItems` array in Firestore **already contains the two duplicate ₱20 diff items** from when the shift was opened.
When viewing historical shifts, [`shift-history.ts`](file:///e:/Programming/epicenter-app2/src/app/features/store/components/shift-history/shift-history.ts) directly reads `shift.computedHandoverAudit?.diffItems`. Without defensive deduplication in `getHandoverDiffItems()`, historical records would continue to display duplicate rows.

---

## 3. Proposed Fix Implementation Plan

### 1. Unify ₱20 Denomination in `STANDARD_DENOMINATIONS`
In [`src/app/core/utils/cash-register.utils.ts`](file:///e:/Programming/epicenter-app2/src/app/core/utils/cash-register.utils.ts):
- Consolidate the two ₱20 entries into a single standard denomination:
  ```typescript
  export const STANDARD_DENOMINATIONS = [
    { denomination: 1000, label: '₱1,000 Bill', type: 'BILL' as const },
    { denomination: 500, label: '₱500 Bill', type: 'BILL' as const },
    { denomination: 200, label: '₱200 Bill', type: 'BILL' as const },
    { denomination: 100, label: '₱100 Bill', type: 'BILL' as const },
    { denomination: 50, label: '₱50 Bill', type: 'BILL' as const },
    { denomination: 20, label: '₱20 Bill / Coin', type: 'BILL' as const },
    { denomination: 10, label: '₱10 Coin', type: 'COIN' as const },
    { denomination: 5, label: '₱5 Coin', type: 'COIN' as const },
    { denomination: 1, label: '₱1 Coin', type: 'COIN' as const },
    { denomination: 0.25, label: '25¢ Coin', type: 'COIN' as const }
  ];
  ```

### 2. Remove Duplicate ₱20 from Coin Lists in `ShiftControlModal`
In [`src/app/features/store/components/shift-control-modal/shift-control-modal.ts`](file:///e:/Programming/epicenter-app2/src/app/features/store/components/shift-control-modal/shift-control-modal.ts):
- Keep ₱20 in `openingBillDenominations` and `billDenominations` (labeled `'₱20 (Bill / Coin)'`).
- Remove `{ denomination: 20, ... }` from `openingCoinDenominations` and `coinDenominations`.
- Ensure `getPrevCount()`, `copyPreviousHandover()`, `getCalculatedOpeningTotal()`, and `getCalculatedDenominationTotal()` now operate on a unique set of denominations with **zero double-counting** and **zero key collisions**.

### 3. Defensive Deduplication & Aggregation for Historical Records in `shift-history.ts`
In [`src/app/features/store/components/shift-history/shift-history.ts`](file:///e:/Programming/epicenter-app2/src/app/features/store/components/shift-history/shift-history.ts):
- In `getHandoverDiffItems()`:
  Deduplicate any incoming `diffItems` by `denomination`:
  If a legacy shift document (such as `Q8IlvIWU6FRs3zERP6Pc`) has two items for `denomination === 20`, merge or keep only the single unique denomination item so historical drawer audits render cleanly with exactly 1 row per denomination.

### 4. Database Data Correction for Shift `Q8IlvIWU6FRs3zERP6Pc`
- Patch shift `Q8IlvIWU6FRs3zERP6Pc` in Firestore to deduplicate its saved `handoverAudit.diffItems`, ensuring historical audit trails are 100% clean and mathematically sound.

---

## 4. Verification Plan

### Automated Verification
- Run `npm run build` to ensure 0 compiler errors and 0 warnings.
- Run `npx ng build members-portal` to verify monorepo integrity.

### Functional Verification
1. Open `/store/reports`, select shift `Sep 3, 2026, 7:39:50 AM`:
   - Verify the Handover Chain-of-Custody table has **exactly one ₱20 row**.
   - Verify no duplicate rows exist for any other denomination.
2. Open Shift Control Modal (`/store/pos`):
   - Verify ₱20 appears only once.
   - Test "Copy Previous Handover" and confirm cash total matches previous closing cash exactly (no inflation).
   - Enter counts for ₱20 and verify total calculates `count * 20` once.
