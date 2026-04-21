# Phase 4: You vs Last Month

> Part of: Staff Personal Dashboard Spec
> Focus: Comparison of current month's personal sales against the previous month

---

## 1. Goal

**Psychological driver:** Growth awareness.

This widget answers: "Am I getting better?" Humans are wired to care about trajectory more than absolute numbers. A staff member earning ₱28,000 this month feels very different depending on whether last month was ₱20,000 (growth) or ₱35,000 (decline).

The widget frames the comparison as a personal growth story, not a judgment. The tone is always forward-looking: "You're ahead" or "You still have time to catch up."

---

## 2. Data Source

### Current month total (personal)

**Source:** `TransactionService.getSalesTotal({ startDate: startOfThisMonth, endDate: now, staffId: uid })`

1 aggregation read via `getAggregateFromServer`.

**Note:** This is the same query as Phase 3 (Monthly Progress Ring) — staff monthly total. If both widgets are on the same dashboard, this query should be shared. The `DashboardCacheService` (Tier 2) stores this value so it's fetched once and reused by both Phase 3 and Phase 4.

### Previous month total (personal)

**Source:** `TransactionService.getSalesTotal({ startDate: startOfLastMonth, endDate: endOfLastMonth, staffId: uid })`

1 aggregation read via `getAggregateFromServer`.

### Current month transaction count

**Source:** Can be derived from the same aggregation if we add `count()` alongside `sum('totalAmount')` in a single `getAggregateFromServer` call. Firestore supports multiple aggregations in one query.

However, `TransactionService.getSalesTotal` currently only returns `sum('totalAmount')`. To avoid modifying the shared service for a dashboard-specific need, the widget can make a separate count query or we can extend `getSalesTotal` to optionally return count.

**Recommended approach:** For Phase 4, use only the totals (no count). The count adds marginal value ("32 transactions vs 28 last month") but doubles the query complexity. Keep it simple — the ₱ comparison is what matters.

### Derived metrics (computed, no queries)

- `difference = currentTotal - lastMonthTotal`
- `percentageChange = lastMonthTotal > 0 ? ((currentTotal - lastMonthTotal) / lastMonthTotal) * 100 : null`
- `direction = currentTotal > lastMonthTotal ? 'ahead' : currentTotal < lastMonthTotal ? 'behind' : 'same'`
- `daysElapsed = today.getDate()` — how many days into the current month
- `lastMonthDays = new Date(lastYear, lastMonth + 1, 0).getDate()` — total days in last month
- `paceProjection = (currentTotal / daysElapsed) * daysInCurrentMonth` — projected month-end total at current pace

### Total Firestore cost

| Data | Cost | Shared with |
|------|------|-------------|
| Current month staff total | 0 (shared with Phase 3 via cache) | Monthly Progress Ring |
| Last month staff total | 1 read | — |
| **Total** | **1 read** | |

---

## 3. Refresh Behavior & Caching Tier

**Tier: 2 — Session-Cached (invalidate on midnight)**

The "vs last month" comparison doesn't meaningfully change from one sale to the next. If the staff made ₱28,000 this month and last month was ₱25,000, one more ₱150 sale changes the comparison from "+12.0%" to "+12.6%" — imperceptible.

| Trigger | Behavior |
|---------|----------|
| First dashboard visit of the day | Fetch last month total (1 read). Current month total shared from Phase 3. Store both in `DashboardCacheService` with today's date key. |
| Subsequent visits same day | Serve from cache. 0 reads. |
| Midnight rollover | Date key changes → cache miss → fresh fetch. |
| Month boundary (e.g., April 30 → May 1) | Both values change: "last month" is now April (was March), "current month" resets to 0. Cache invalidates naturally via date key. |

**Shared data with Phase 3:** The current month staff total is the same aggregation query. `DashboardCacheService` stores it once, both Phase 3 (ring) and Phase 4 (comparison) read from it. This avoids a duplicate Firestore read.

---

## 4. Copy & Wording

### Card title

"You vs Last Month"

Personal, direct. Not "Monthly Comparison" (too clinical) or "Performance Trend" (too corporate).

### Primary comparison

| Scenario | Text | Icon | Color |
|----------|------|------|-------|
| Ahead by ₱X | "You're ₱{diff} ahead of last month" | `trending_up` | Green (`#4caf50`) |
| Behind by ₱X | "₱{diff} behind — {daysLeft} days to catch up" | `trending_down` | Muted gray (NOT red) |
| Exactly equal | "Right on pace with last month" | `trending_flat` | Neutral |
| Last month = 0, current > 0 | "Great start to the month" | `trending_up` | Green |
| Both months = 0 | (show empty state) | — | — |
| Current = 0, last month > 0 | "Your first sale this month will show here" | — | Neutral, encouraging |

**Key design rule (carried from Phase 2):** Never use red for "behind." Red implies failure. The staff is behind pace, not failing. Use muted gray with encouraging language ("days to catch up" implies it's still possible).

### Secondary line: Amounts

"This month: ₱{current} · Last month: ₱{lastMonth}"

Small text, muted. Gives the raw numbers for context without competing with the primary comparison message.

### Tertiary line: Pace projection (optional, desktop only)

"At this pace, you'll finish the month at ~₱{projection}"

Only show if `daysElapsed >= 5` (projection is meaningless in the first few days). Only show on desktop/tablet — too much detail for mobile.

Formula: `(currentTotal / daysElapsed) * daysInCurrentMonth`

---

## 5. Empty State

When both current and last month are 0:

- Icon: `compare_arrows` (Material icon, muted)
- Text: "Your monthly comparison will appear after your first sale"
- No numbers, no percentages, no arrows

When it's the 1st of the month and current = 0 but last month > 0:

- Text: "Last month you earned ₱{lastMonth}. Let's beat that!"
- Tone: Challenge, not pressure

---

## 6. Visual Design

### Card structure

```
┌──────────────────────────────────────┐
│  📈  You vs Last Month               │
│                                      │
│  ↑ You're ₱5,200 ahead of last month│  ← Primary (green, bold)
│                                      │
│  This month: ₱28,200                 │  ← Secondary (muted)
│  Last month: ₱23,000                 │
│                                      │
│  At this pace: ~₱42,300              │  ← Tertiary (desktop only)
└──────────────────────────────────────┘
```

### Sizing

| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Card | 1 grid column | 1 grid column | Full width |
| Primary comparison text | 16px, 600 weight | 15px | 14px |
| Trend icon | 20px, inline with text | 20px | 18px |
| Secondary amounts | 13px, 400 weight | 13px | 12px |
| Pace projection | 12px, 400 weight, italic | 12px | Hidden |
| Card padding | 24px | 24px | 16px |
| Card min-height | 120px | 120px | 100px |

### Colors

- Card background: white
- "Ahead" text + icon: `#4caf50` (green)
- "Behind" text + icon: `var(--mat-sys-on-surface-variant)` (muted gray)
- "Same" text + icon: `var(--mat-sys-on-surface-variant)` (neutral)
- Secondary amounts: `var(--mat-sys-on-surface-variant)`
- Pace projection: `var(--mat-sys-on-surface-variant)`, italic

### Card elevation

`mat-elevation-z1` — consistent with other dashboard cards.

---

## 7. Interactions

| Action | Behavior |
|--------|----------|
| Tap/click the card | Navigate to `/store/monthly-sales` — same as Monthly Progress Ring. Staff can see the daily breakdown. |
| Hover (desktop) | Subtle elevation increase + cursor pointer |

---

## 8. Role Visibility

| Role | Sees this widget? | Reason |
|------|-------------------|--------|
| ADMIN | ✅ | Tracks their own sales growth |
| MANAGER | ✅ | Same |
| STAFF | ✅ | Primary audience |
| TRAINER | ❌ | No POS transactions |

---

## 9. Edge Cases

| Scenario | Behavior |
|----------|----------|
| First month on the job (no last month data) | Last month total = 0. Show: "Great start to the month" if current > 0, or empty state if current = 0. |
| Staff joined mid-month last month | Last month total reflects partial month. The comparison is slightly unfair but acceptable — no way to normalize without tracking start dates. |
| Day 1 of the month | Current total likely 0. Show: "Last month you earned ₱{X}. Let's beat that!" |
| Day 1, last month also 0 | Full empty state. |
| Pace projection on day 1 | Hidden (daysElapsed < 5). Projection from 1 day of data is meaningless. |
| Very large difference (₱50,000 ahead) | Number formatting handles it. Text wraps naturally on mobile. |
| VOID transactions | `getSalesTotal` doesn't exclude VOIDs (known gap). Both months are affected equally, so the comparison is still valid relatively. |
| Month with fewer days (Feb vs Jan) | Raw comparison is slightly unfair (28 vs 31 days). The pace projection normalizes this somewhat. Acceptable — staff don't think in per-day terms. |

---

## 10. Component Spec

**File:** `src/app/features/dashboard/widgets/vs-last-month/vs-last-month.ts`

**Inputs:** None.

**Injections:** `TransactionService`, `AuthService`, `DashboardCacheService`

**Signals:**
- `currentMonthTotal = signal(0)`
- `lastMonthTotal = signal(0)`
- `isLoading = signal(true)`

**Computed:**
- `difference = computed(() => currentMonthTotal() - lastMonthTotal())`
- `percentageChange = computed(() => lastMonthTotal() > 0 ? (difference() / lastMonthTotal()) * 100 : null)`
- `direction = computed(() => currentMonthTotal() > lastMonthTotal() ? 'ahead' : currentMonthTotal() < lastMonthTotal() ? 'behind' : 'same')`
- `daysElapsed = computed(() => new Date().getDate())`
- `daysInMonth = computed(() => new Date(year, month + 1, 0).getDate())`
- `daysLeft = computed(() => daysInMonth() - daysElapsed())`
- `paceProjection = computed(() => daysElapsed() >= 5 ? (currentMonthTotal() / daysElapsed()) * daysInMonth() : null)`
- `isEmpty = computed(() => currentMonthTotal() === 0 && lastMonthTotal() === 0)`
- `showProjection = computed(() => paceProjection() !== null && daysElapsed() >= 5)`

**Data loading:**
```typescript
// Check DashboardCacheService first
const cached = this.cacheService.getVsLastMonth();
if (cached && cached.dateKey === todayStr) {
    this.currentMonthTotal.set(cached.data.current);
    this.lastMonthTotal.set(cached.data.last);
    this.isLoading.set(false);
    return;
}

// Fetch fresh
const [current, last] = await Promise.all([
    this.transactionService.getSalesTotal({ startDate: startOfThisMonth, endDate: now, staffId: uid }),
    this.transactionService.getSalesTotal({ startDate: startOfLastMonth, endDate: endOfLastMonth, staffId: uid })
]);

this.currentMonthTotal.set(current);
this.lastMonthTotal.set(last);
this.cacheService.setVsLastMonth({ current, last }, todayStr);
this.isLoading.set(false);
```

**Note:** The `current` value is the same as Phase 3's `staffTotal`. `DashboardCacheService` should store it once and both widgets read from it. Implementation detail: either Phase 3 writes it and Phase 4 reads it, or both check/write independently with the same cache key.

---

## 11. Firestore Index Requirements

Same composite index as Phase 2 and 3: `staffId` (ASC) + `date` (ASC) on `transactions`. No new index needed.

---

## Next Step

Phase 5: Week-over-Week Trend — this week's total vs last week's total with a trend arrow.
