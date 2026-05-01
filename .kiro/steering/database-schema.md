# Database Schema & Data Model (Firestore NoSQL)

This document serves as the **CANONICAL REFERENCE** for the Epicenter database architecture. It is designed for both human developers and AI agents to understand the structural relationships, denormalization patterns, and data integrity constraints of the system.

## 1. Architectural Philosophy (NoSQL)

- **Firestore (v12)**: Document-oriented database.
- **Denormalization for Performance**: Data is often duplicated (snapshots) to avoid expensive joins. For example, `memberName` is stored directly in `attendance` and `transactions` records.
- **Atomic Writes**: Related updates across collections (e.g., Stock Update + Inventory Log + Transaction) are wrapped in `writeBatch` or `runTransaction`.
- **Root Collections**: High-volume or globally accessed data resides in root collections.
- **Sub-collections**: Used sparingly for data strictly owned by a parent (e.g., member measurements).
- **Timezone Handling**: All document IDs used as date keys (e.g., `daily_sales`) use LOCAL `YYYY-MM-DD` strings via `toLocalDateStr()`.

---

## 2. Root Collections

### 2.1 `members`
*The core entity representing gym members.*

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Firestore Auto-ID |
| `name` | `string` | Full name (indexed for search) |
| `address` | `string` | Residential address |
| `contactNumber` | `string` | Phone number |
| `gender` | `'Male'\|'Female'\|'Other'` | Used for locker logic |
| `birthday` | `Timestamp` | Member's date of birth |
| `membershipExpiration` | `Timestamp?` | Expiry of the 30-day membership cycle |
| `trainingExpiration` | `Timestamp?` | Expiry of personal training sessions |
| `goal` | `string` | Fitness goals (free text) |
| `membershipStatus` | `'Active'\|'Inactive'\|'Pending'` | Master status |
| `remarks` | `string?` | Staff notes (shown during check-in) |
| `createdBy` | `AuditTrace` | `{ uid, name, timestamp }` |
| `lastModifiedBy` | `AuditTrace` | `{ uid, name, timestamp }` |

**Sub-collections:**
- `members/{id}/measurements`: Historical body metrics.

---

### 2.2 `attendance`
*Real-time and historical check-in records.*

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Firestore Auto-ID |
| `memberId` | `string` | Reference to `members.id` |
| `memberName` | `string` | **Snapshot** (denormalized) |
| `memberGender` | `string` | **Snapshot** (for locker filtering) |
| `checkInTime` | `Timestamp` | Entry time |
| `checkOutTime` | `Timestamp?` | Exit time |
| `lockerNumber` | `number?` | 1-12 or null |
| `date` | `string` | `YYYY-MM-DD` (Local) for daily queries |
| `status` | `'Checked In'\|'Checked Out'` | Session state |
| `checkedInBy` | `{ uid, name }` | Staff record |
| `checkedOutBy` | `{ uid, name }` | Staff record |

---

### 2.3 `products`
*Inventory items (Retail and Consumable).*

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Firestore Auto-ID |
| `name` | `string` | Product name |
| `category` | `enum` | `'Training'\|'Supplements'\|'Drinks'\|'Boxing'` |
| `type` | `'RETAIL'\|'CONSUMABLE'` | Logic toggle for stock behavior |
| `price` | `number` | Selling price |
| `stock` | `number` | Current inventory level |
| `minStockLevel` | `number` | Threshold for low-stock alerts |
| `unit` | `string` | e.g., "pcs", "bottle" |
| `lastCostPrice` | `number?` | Price from last purchase order |
| `averageCost` | `number?` | Calculated weighted average |

---

### 2.4 `transactions`
*POS Sales records.*

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Firestore Auto-ID |
| `date` | `Timestamp` | Transaction time |
| `totalAmount` | `number` | Computed sum of items |
| `items` | `CartItem[]` | **Embedded Array** (denormalized items) |
| `paymentMethod` | `'CASH'\|'GCASH'` | Payment channel |
| `staffId` | `string` | Reference to `users.uid` |
| `memberId` | `string?` | Reference to `members.id` (null for walk-ins) |
| `status` | `'COMPLETED'\|'VOID'` | Record state |

**`CartItem` (Embedded Object):**
`{ productId, productName, price, originalPrice, isPriceOverridden, quantity, subtotal }`

---

### 2.5 `shifts`
*Cash register sessions tracking physical cash flow.*

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Firestore Auto-ID |
| `status` | `'OPEN'\|'CLOSED'` | Only one 'OPEN' shift allowed globally |
| `openingBalance` | `number` | Start-of-day cash |
| `expectedClosingBalance`| `number` | Computed: `opening + cashSales + float - expenses` |
| `actualClosingBalance` | `number?` | Physical count at close |
| `discrepancy` | `number?` | `actual - expected` |
| `transactions` | `CashTx[]` | **Embedded Array** of all movements |
| `totalRevenue` | `number` | Aggregated from `transactions` |

**`CashTransaction` (Embedded Object):**
`{ type, amount, reason, timestamp, relatedTransactionId, voided }`

---

### 2.6 `inventory_logs`
*Audit trail for every stock movement.*

| Field | Type | Description |
| :--- | :--- | :--- |
| `productId` | `string` | Reference to `products.id` |
| `productName` | `string` | **Snapshot** (at time of log) |
| `type` | `enum` | `'SALE'\|'INTERNAL_USE'\|'RESTOCK'\|'AUDIT_ADJUSTMENT'` |
| `changeAmount` | `number` | Positive (add) or Negative (deduct) |
| `previousStock` | `number` | State before change |
| `newStock` | `number` | State after change |
| `timestamp` | `Timestamp` | When it happened |

---

### 2.7 `daily_sales`
*Pre-aggregated totals for performance reports.*

| Doc ID | Fields |
| :--- | :--- |
| `YYYY-MM-DD` | `{ totalSales: number, date: Timestamp }` |

- **Role**: Serves as the source of truth for "Today's Sales" and "Monthly Progress" without scanning the `transactions` collection.

---

### 2.8 `users`
*Staff profile records (Mirrors Firebase Auth).*

| Field | Type | Description |
| :--- | :--- | :--- |
| `uid` | `string` | Matches Firebase Auth UID |
| `email` | `string` | Login email |
| `roles` | `string[]` | `['ADMIN']`, `['MANAGER']`, `['STAFF']` |
| `isActive` | `boolean` | Critical for Zero-Latency deactivation |

---

## 3. Relationships & Data Integrity Maps

### 3.1 Logical vs. Physical Relationships
- **Hard Links (ID Only)**: `memberId` in `attendance`. If a member is deleted (not allowed in UX), these records become orphaned.
- **Soft Links (Snapshot)**: `productName` in `transactions`. If a product is renamed, historical transactions preserve the name at the time of sale.

### 3.2 Atomicity Requirements
The following operations **MUST** use `writeBatch`:
1. **Checkout**: `transactions` (Create) + `products` (Decrement Stock) + `inventory_logs` (Create) + `daily_sales` (Increment) + `shifts` (Update Totals).
2. **Void**: `transactions` (Update Status) + `products` (Increment Stock) + `inventory_logs` (Create Audit) + `daily_sales` (Decrement) + `shifts` (Decrement Totals).
3. **Restock**: `purchase_orders` (Create) + `products` (Increment Stock + Update Cost) + `inventory_logs` (Create).

### 3.3 Date Formats
- **Document IDs**: `daily_sales/{YYYY-MM-DD}`
- **Query Keys**: `attendance.date` (`YYYY-MM-DD`)
- **Timestamps**: All other date fields are native Firestore `Timestamp` objects.

---

## 4. Query Performance (Indexes)
See `firestore.indexes.json` for details. Key composite indexes include:
- `transactions`: `staffId` (ASC) + `date` (DESC) — for Sales by User reports.
- `attendance`: `date` (DESC) + `status` (ASC) — for active session management.
