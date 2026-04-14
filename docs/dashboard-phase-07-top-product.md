# Phase 7: Your Top Product

> Part of: Staff Personal Dashboard Spec
> Focus: The product this staff sells the most this month

---

## 1. Goal

**Psychological driver:** Identity and expertise.

This widget answers: "What am I known for selling?" It gives the staff a sense of specialization — "I'm the Protein Shake person" or "I move more Boxing gloves than anyone." This creates a subtle pride of ownership over a product category.

It's also a lightweight conversation starter between staff: "What's your top product this month?" — building team culture around friendly competition.

---

## 2. Data Source

### Query

```typescript
// This staff's transactions for the current month
transactionService.getTransactions({
    startDate: startOfMonth,
    endDate: now,
    staffId: uid,
    limit: 30
})
```

Then aggregate client-side:

```typescript
const productMap = new Map<string, { name: string, quantity: number, revenue: number }>();

transactions
    .filter(tx => tx.status !== 'VOID')
    .forEach(tx => {
        tx.items.forEach(item => {
            const entry = productMap.get(item.productId) || { name: item.productName, quantity: 0, revenue: 0 };
            entry.quantity += item.quantity;
            entry.revenue += item.subtotal;
            productMap.set(item.productId, entry);
        });
    });

const sorted = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity);
const topProduct = sorted[0] || null;
```

### Why limit 30 instead of 100?

The original Phase 1 cost estimate flagged the Top Product query at 100 docs as the most expensive widget. After analysis:

- A staff member averaging 5 transactions/day × 30 days = 150 transactions/month. Limit 30 captures the most recent ~6 days.
- The top product is usually clear within 30 transactions — if someone sells Protein Shake 3x daily, it dominates within a week.
- Reducing from 100 to 30 saves 70 reads on cold load.
- Tradeoff: if a staff member sold a lot of Product A early in the month but switched to Product B recently, the limit-30 view might show Product B. This is actually desirable — it reflects current behavior, not ancient history.

### Derived metrics

- `topProduct.name` — product name
- `topProduct.quantity` — units sold this month (within the 30-tx window)
- `topProduct.revenue` — revenue from this product
- `runnerUp = sorted[1] || null` — second place (optional, for context)

### Firestore cost

| Data | Cost |
|------|------|
| Transactions query (limit 30) | 1-30 reads (first load) / 0 (cached) |
| **Total** | **1-30 reads** (first load) / **0** (revisit) |

---

## 3. Refresh Behavior & Caching Tier

**Tier: 2 — Session-Cached (invalidate on midnight)**

The top product changes slowly — it takes many transactions to shift the ranking. Caching for the day is safe.

| Trigger | Behavior |
|---------|----------|
| First dashboard visit of the day | Fetch 30 transactions, aggregate, cache result with date key. |
| Subsequent visits same day | Serve from `DashboardCacheService`. 0 reads. |
| Midnight rollover | Date key changes → cache miss → fresh fetch. |
| Month boundary | `startOfMonth` recalculated → new month's transactions fetched. |

---

## 4. Copy & Wording

### Card title

"Your Bestseller"

Not "Top Product" (too analytical) or "Most Sold Item" (too clinical). "Bestseller" has a positive, commercial ring to it — it implies success.

### Primary line: Product name

"{productName}" — bold, prominent.

### Secondary line: Quantity context

"{quantity} sold this month" — gives scale.

If quantity is 1: "1 sold this month" (still show it — even 1 sale has a top product).

### Tertiary line: Revenue

"₱{revenue} earned" — small, muted. Connects the product to money.

### Runner-up (optional, desktop only)

"Runner-up: {name} ({quantity})" — very small, muted. Adds depth without clutter. Hidden on mobile.

---

## 5. Empty State

When the staff has zero non-VOID transactions this month:

- Icon: `emoji_events` (trophy, muted)
- Text: "Your bestseller will appear after your first sale"
- Subtext: "Which product will take the #1 spot?"

Tone: Anticipation, like waiting for a race to start.

---

## 6. Visual Design

### Card structure

```
┌──────────────────────────────────────┐
│  🏆  Your Bestseller                 │
│                                      │
│  Protein Shake                       │  ← Product name (bold)
│  47 sold this month                  │  ← Quantity (secondary)
│  ₱7,050 earned                       │  ← Revenue (muted)
│                                      │
│  Runner-up: Energy Drink (23)        │  ← Desktop only (tiny)
└──────────────────────────────────────┘
```

### Product icon

Use the existing `getCategoryIcon()` pattern from POS component to show a category-appropriate Material icon next to the product name:

| Category | Icon |
|----------|------|
| Supplements | `medication` |
| Drinks | `local_drink` |
| Boxing | `sports_mma` |
| Training | `sports_martial_arts` |

Icon size: 20px, inline with product name, colored `var(--mat-sys-primary)` at 0.7 opacity.

### Sizing

| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Card | 1 grid column | 1 grid column | Full width |
| Product name | 18px, 600 weight | 16px | 16px |
| Category icon | 20px, inline | 20px | 18px |
| Quantity line | 14px, 400 weight | 13px | 13px |
| Revenue line | 13px, 400 weight | 12px | 12px |
| Runner-up | 12px, 400 weight | 12px | Hidden |
| Card padding | 24px | 24px | 16px |
| Card min-height | 120px | 120px | 100px |

### Colors

- Product name: `var(--mat-sys-on-surface)` (dark, prominent)
- Quantity: `var(--mat-sys-primary)` (indigo — the key metric)
- Revenue: `var(--mat-sys-on-surface-variant)` (muted)
- Runner-up: `var(--mat-sys-on-surface-variant)` (very muted)

### Card elevation

`mat-elevation-z1`

---

## 7. Interactions

| Action | Behavior |
|--------|----------|
| Tap/click the card | Navigate to `/store/stats` — staff can see the full sales analytics |
| Hover (desktop) | Subtle elevation increase + cursor pointer |

---

## 8. Role Visibility

| Role | Sees this widget? | Why |
|------|-------------------|-----|
| ADMIN | ✅ | Tracks their own selling patterns |
| MANAGER | ✅ | Same |
| STAFF | ✅ | Primary audience — creates product identity |
| TRAINER | ❌ | No POS transactions |

---

## 9. Edge Cases

| Scenario | Behavior |
|----------|----------|
| Staff has 0 sales this month | Empty state |
| Staff has 1 sale with 1 product | That product is the bestseller. "1 sold this month." No runner-up. |
| Staff sells only 1 product type all month | That product is the bestseller. No runner-up (or runner-up is null). |
| Tie between two products (same quantity) | First one in the sorted array wins. Deterministic but arbitrary. Acceptable — ties are rare and the difference is meaningless. |
| Product was deleted after being sold | `CartItem.productName` is snapshotted at sale time. The name still displays correctly from the transaction record. |
| All transactions are VOID | Filtered out. Empty state shown. |
| Staff has 30+ transactions but top product is from transaction #31+ | Possible but unlikely. The top product is usually dominant within recent transactions. Acceptable tradeoff for 70 fewer reads. |

---

## 10. Component Spec

**File:** `src/app/features/dashboard/widgets/top-product/top-product.ts`

**Inputs:** None.

**Injections:** `TransactionService`, `AuthService`, `DashboardCacheService`

**Signals:**
- `topProduct = signal<{ name: string; quantity: number; revenue: number; category?: string } | null>(null)`
- `runnerUp = signal<{ name: string; quantity: number } | null>(null)`
- `isLoading = signal(true)`

**Computed:**
- `isEmpty = computed(() => topProduct() === null)`
- `showRunnerUp = computed(() => runnerUp() !== null)`

**Data loading:**
```typescript
const cached = this.cacheService.getTopProduct();
if (cached && cached.dateKey === todayStr) {
    this.topProduct.set(cached.data.top);
    this.runnerUp.set(cached.data.runnerUp);
    this.isLoading.set(false);
    return;
}

const uid = this.authService.userProfile()?.uid;
if (!uid) { this.isLoading.set(false); return; }

const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

const transactions = await firstValueFrom(
    this.transactionService.getTransactions({
        startDate: startOfMonth,
        endDate: now,
        staffId: uid,
        limit: 30
    })
);

// Aggregate by product
const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
transactions
    .filter(tx => tx.status !== 'VOID')
    .forEach(tx => {
        tx.items.forEach(item => {
            const entry = productMap.get(item.productId) ||
                { name: item.productName, quantity: 0, revenue: 0 };
            entry.quantity += item.quantity;
            entry.revenue += item.subtotal;
            productMap.set(item.productId, entry);
        });
    });

const sorted = Array.from(productMap.values())
    .sort((a, b) => b.quantity - a.quantity);

const top = sorted[0] || null;
const runner = sorted[1] || null;

this.topProduct.set(top);
this.runnerUp.set(runner);
this.cacheService.setTopProduct({ top, runnerUp: runner }, todayStr);
this.isLoading.set(false);
```

---

## 11. Firestore Index Requirements

Same composite index as Phases 2-5: `staffId` (ASC) + `date` (DESC) on `transactions`. The `getTransactions` method already uses `orderBy('date', 'desc')` with `staffId` filter. No new index needed.

---

## Next Step

Phase 8: Commendation of the Day — daily rotating motivational message.
