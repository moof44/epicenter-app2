# Phase 2: Today's Sales Card

> Part of: Staff Personal Dashboard Spec
> Focus: The hero metric — today's revenue attributed to the logged-in staff

---

## 1. Goal

**Psychological driver:** Immediate progress visibility.

This is the first number the staff sees when they open the app. It answers the most basic question: "How am I doing today?" A growing number throughout the day creates a sense of momentum. Seeing ₱0 at the start of a shift creates urgency to make the first sale.

This widget must feel alive — not a static report, but a living counter that reflects their effort in real time.

---

## 2. Data Source

### Primary metric: Today's total sales by this staff

**Query:**
```typescript
transactionService.getSalesTotal({
    startDate: startOfToday,   // new Date(y, m, d, 0, 0, 0)
    endDate: endOfToday,       // new Date(y, m, d, 23, 59, 59)
    staffId: authService.userProfile().uid
})
```

This uses `getAggregateFromServer(q, { totalSales: sum('totalAmount') })` — a server-side aggregation that returns a single number without reading individual documents.

**Firestore cost:** 1 read (aggregation query). Not per-document.

**VOID handling:** `getSalesTotal` currently does NOT exclude VOID transactions (known gap documented in business-rules.md section 1.4). For the dashboard, this means voided transactions still count toward the staff's daily total. This is a pre-existing issue — not introduced by the dashboard. If fixed later (adding `where('status', '==', 'COMPLETED')`), the dashboard benefits automatically.

### Secondary metrics (derived from a single query):

**Query:**
```typescript
transactionService.getTransactions({
    startDate: startOfToday,
    endDate: endOfToday,
    staffId: uid,
    limit: 50
})
```

From this single query, derive:
- **Transaction count:** `transactions.filter(tx => tx.status !== 'VOID').length`
- **Average ticket:** `todayTotal / transactionCount`
- **CASH vs GCASH split:** count by `paymentMethod`

**Firestore cost:** 1-50 document reads (real-time listener via `collectionData`).

### Comparison metric: Yesterday's total

**Query:**
```typescript
transactionService.getSalesTotal({
    startDate: startOfYesterday,
    endDate: endOfYesterday,
    staffId: uid
})
```

**Firestore cost:** 1 read (aggregation).

### Total Firestore cost for this widget: 3 reads + up to 50 document reads = ~53 reads worst case.

**Optimization:** The transaction list query (50 docs) is the expensive part. Consider whether the secondary metrics (count, average, split) are worth the cost. If not, drop them and use only the two aggregation queries (2 reads total). The transaction count can be approximated by adding a `count()` aggregation alongside the `sum()`.

**Recommended approach:** Use `getAggregateFromServer` with both `sum('totalAmount')` and `count()` in a single call for today + yesterday = 2 reads. Skip the full transaction list for this widget. The activity feed (Phase 11) will show recent transactions anyway.

---

## 3. Copy & Wording

### Card title
"Your Sales Today"

Not "Today's Sales" (too impersonal) or "Daily Revenue" (too corporate). "Your" makes it personal.

### Primary number
"₱{amount}" — large, bold, the visual anchor of the entire dashboard.

Format: `₱{{ todayTotal | number:'1.2-2' }}` — always show 2 decimal places for currency consistency.

### Transaction count
"{count} transactions" — below the amount, smaller text.

If count is 1: "1 transaction" (singular).
If count is 0: omit this line entirely (don't show "0 transactions").

### Average ticket
"₱{avg} avg per sale" — only show if count ≥ 2 (average of 1 transaction is meaningless).

### Comparison line (vs yesterday)

| Scenario | Text | Color |
|----------|------|-------|
| Today > Yesterday | "↑ {pct}% from yesterday" | Green |
| Today < Yesterday | "↓ {pct}% from yesterday" | Muted (not red — avoid negative framing) |
| Today = Yesterday | "Same as yesterday" | Neutral |
| Yesterday = 0, Today > 0 | "Great start today" | Green |
| Yesterday = 0, Today = 0 | (omit comparison entirely) | — |
| Today = 0, Yesterday > 0 | "Your first sale will show here" | Neutral, encouraging |

**Key design decision:** Never use red for the comparison. Red implies failure. Use muted gray for "down" and green for "up". The goal is encouragement, not judgment.

### Payment split (optional, compact)
"💵 {cashCount} cash · 📱 {gcashCount} GCash" — single line, small text, only if both types exist.

If all transactions are one type, omit this line.

---

## 4. Empty State

When `todayTotal === 0` and `transactionCount === 0`:

**Do NOT show:**
- "₱0.00" as a big number (demoralizing)
- "No sales yet" (negative framing)
- A sad empty icon

**DO show:**
- Icon: `point_of_sale` (Material icon, muted color)
- Text: "Ready to make your first sale today?"
- Subtext: "Head to the POS to get started"
- Optional: A subtle button/link to `/store/pos`

The empty state should feel like an invitation, not a report card.

---

## 5. Visual Design

### Card structure

```
┌──────────────────────────────────────┐
│  💰  Your Sales Today                │
│                                      │
│       ₱ 8,450.00                     │  ← Primary number (large)
│       12 transactions                │  ← Count (small, secondary)
│       ₱704.17 avg per sale           │  ← Average (small, secondary)
│                                      │
│       ↑ 23% from yesterday           │  ← Comparison (green)
│       💵 8 cash · 📱 4 GCash         │  ← Split (tiny, muted)
└──────────────────────────────────────┘
```

### Sizing

| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Card | 1 grid column | 1 grid column | Full width |
| Primary number | 36px, 700 weight | 32px | 28px |
| Transaction count | 14px, 400 weight | 14px | 13px |
| Average ticket | 14px, 400 weight | 14px | 13px |
| Comparison line | 14px, 500 weight | 14px | 13px |
| Payment split | 12px, 400 weight | 12px | 12px |
| Card padding | 24px | 24px | 16px |
| Card min-height | 160px | 160px | 140px |

### Colors

- Card background: white (`var(--mat-sys-surface-container, #ffffff)`)
- Primary number: `var(--mat-sys-primary)` (indigo)
- Transaction count: `var(--mat-sys-on-surface-variant)` (secondary text)
- Comparison up: `#4caf50` (green) — per existing project pattern in shift-history, sales-analytics
- Comparison down: `var(--mat-sys-on-surface-variant)` (muted gray, NOT red)
- Payment split: `var(--mat-sys-on-surface-variant)` (muted)
- Icon: `var(--mat-sys-primary)` at 0.7 opacity

### Card elevation
`mat-elevation-z1` — subtle shadow. This is the hero card but it shouldn't scream. The number itself is the attention-grabber.

### Icon placement
Small icon (24px) to the left of the title "Your Sales Today", inline. Not a large decorative icon.

---

## 6. Refresh Behavior & Caching Tier

**Tier: 1 — Always Fresh**

Today's Sales is the most time-sensitive widget on the dashboard. The staff expects to see their updated total after every checkout. This widget re-fetches on every dashboard visit.

| Trigger | Behavior |
|---------|----------|
| Navigate to dashboard | Fetch today's total + yesterday's total (2 aggregation reads) |
| Navigate away and back | Re-fetch both (component destroyed and re-created) |
| Stay on dashboard after a sale (no navigation) | Stale until next navigation — acceptable tradeoff vs cost of live listener |
| Midnight rollover | Next visit fetches new day's data (startOfToday recalculated in constructor) |

**Why not a real-time listener?** `getAggregateFromServer` is a one-shot query. To make it "live", we'd need either:
- A `collectionData` listener on all of today's transactions (50+ doc reads, re-fires on every change) — too expensive
- A polling interval (e.g., every 60s) — adds 1 read/minute = 60 reads/hour for one widget

Neither is worth it. The natural POS → Dashboard → POS navigation pattern means the staff sees fresh data every time they return. The 2-read cost per visit is optimal.

**No `DashboardCacheService` involvement** — this widget always fetches fresh. It does not check or write to the session cache.

---

## 7. Interactions

| Action | Behavior |
|--------|----------|
| Tap/click the card | Navigate to `/store/history` with today's date pre-filtered — staff can see their transaction details |
| Hover (desktop) | Subtle elevation increase (`z1` → `z3`) + cursor pointer |
| Data refresh | On component init. No auto-refresh interval — the staff navigates away and back to see updates. The `collectionData` listener (if used for count) would auto-update, but the aggregation query is one-shot. |

**Why no auto-refresh?** `getAggregateFromServer` is a one-shot query, not a listener. To make it "live", we'd need to re-query on an interval, which adds Firestore reads. The tradeoff isn't worth it — the staff will naturally navigate away (to POS) and back (to dashboard), triggering a fresh load each time.

**Alternative considered:** Use `collectionData` (real-time listener) instead of aggregation, then compute the sum client-side. This gives live updates but costs 1 read per document per change. For a busy day with 50 transactions, that's 50 reads on every product change. Not worth it for a dashboard summary. Stick with aggregation.

---

## 8. Role Visibility

| Role | Sees this widget? | Reason |
|------|-------------------|--------|
| ADMIN | ✅ | Admins process sales too |
| MANAGER | ✅ | Managers process sales |
| STAFF | ✅ | Primary audience |
| TRAINER | ❌ | Trainers don't process POS transactions |

---

## 9. Edge Cases

| Scenario | Behavior |
|----------|----------|
| Staff just logged in, no sales today | Empty state: "Ready to make your first sale today?" |
| Staff has 1 sale | Show amount + "1 transaction". Hide average (meaningless for 1). |
| Staff has sales but all are VOID | `getSalesTotal` still counts them (known gap). Shows inflated number. Acceptable until the VOID exclusion fix is applied globally. |
| Midnight rollover while dashboard is open | Stale data until next navigation. The greeting updates (Phase 1 interval), but the sales card shows yesterday's final number. Acceptable — staff typically don't leave the dashboard open overnight. |
| Staff has no `uid` (shouldn't happen) | Guard: if `!authService.userProfile()?.uid`, show empty state. Don't query Firestore with null staffId. |
| Very large number (₱999,999.99) | The `number:'1.2-2'` pipe handles formatting. Test that the card doesn't overflow on mobile at 28px font. At 7 digits + currency symbol + decimals, the string is ~14 characters. At 28px, that's ~200px — fits within a 320px mobile screen with 16px padding on each side. |

---

## 10. Component Spec

**File:** `src/app/features/dashboard/widgets/todays-sales/todays-sales.ts`

**Inputs:** None — injects `TransactionService` and `AuthService` directly.

**Signals:**
- `todayTotal = signal(0)`
- `yesterdayTotal = signal(0)`
- `transactionCount = signal(0)`
- `isLoading = signal(true)`

**Computed:**
- `averageTicket = computed(() => count > 1 ? total / count : 0)`
- `comparisonPct = computed(() => yesterday > 0 ? ((today - yesterday) / yesterday) * 100 : null)`
- `comparisonDirection = computed(() => today > yesterday ? 'up' : today < yesterday ? 'down' : 'same')`
- `isEmpty = computed(() => todayTotal() === 0 && transactionCount() === 0)`

**Lifecycle:** Data fetched in constructor (or `effect`) using `async/await` on the aggregation queries. No subscriptions to manage — these are one-shot Promise-based calls.

---

## 11. Firestore Index Requirements

The `getSalesTotal` query uses: `where('date', '>=', start)`, `where('date', '<=', end)`, `where('staffId', '==', uid)`.

This requires a composite index on `transactions`:
- Fields: `staffId` (ASC), `date` (ASC)

Check if this index already exists (it should — `ReportStateService.getUserSalesReport` uses the same filter pattern). If not, Firestore will throw an error with a link to create it.

---

## Next Step

Phase 3: Monthly Progress Ring — the circular progress indicator showing contribution to the gym's monthly quota.
