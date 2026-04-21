# Phase 5: Week-over-Week Trend

> Part of: Staff Personal Dashboard Spec
> Focus: This week's personal sales total vs last week's, with a trend arrow

---

## 1. Goal

**Psychological driver:** Short-term momentum feedback.

Phase 4 (vs Last Month) shows the big picture. This widget zooms in to the weekly cadence — a timeframe the staff can actually influence right now. "Last month" feels distant. "Last week" feels immediate and actionable.

A staff member who sees "↑ 18% from last week" thinks: "I'm on a roll, keep going." One who sees "₱1,200 behind — 3 days left this week" thinks: "I can close that gap today."

Weekly feedback is the sweet spot between daily (too noisy) and monthly (too slow).

---

## 2. Data Source

### Week definition

Use Monday–Sunday weeks (ISO standard). This matches how most businesses think about work weeks.

```typescript
// This week: Monday 00:00:00 → today 23:59:59
function getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun, 1=Mon, ...
    const diff = day === 0 ? 6 : day - 1; // Shift so Monday = 0
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Last week: previous Monday 00:00:00 → previous Sunday 23:59:59
const startOfLastWeek = getStartOfWeek(new Date(startOfThisWeek.getTime() - 1));
const endOfLastWeek = new Date(startOfThisWeek.getTime() - 1);
endOfLastWeek.setHours(23, 59, 59, 999);
```

### This week total (personal)

**Source:** `TransactionService.getSalesTotal({ startDate: startOfThisWeek, endDate: now, staffId: uid })`

1 aggregation read.

### Last week total (personal)

**Source:** `TransactionService.getSalesTotal({ startDate: startOfLastWeek, endDate: endOfLastWeek, staffId: uid })`

1 aggregation read.

### Derived metrics (computed, no queries)

- `difference = thisWeekTotal - lastWeekTotal`
- `percentageChange = lastWeekTotal > 0 ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 : null`
- `direction = thisWeekTotal > lastWeekTotal ? 'up' : thisWeekTotal < lastWeekTotal ? 'down' : 'flat'`
- `dayOfWeek = new Date().getDay()` — 1 (Mon) through 7 (Sun), used for context ("It's only Tuesday")
- `daysLeftInWeek = 7 - dayIndex` — where dayIndex is 0-based from Monday

### Total Firestore cost

| Data | Cost |
|------|------|
| This week staff total | 1 read (aggregation) |
| Last week staff total | 1 read (aggregation) |
| **Total** | **2 reads** (first load) / **0 reads** (cached revisit) |

---

## 3. Refresh Behavior & Caching Tier

**Tier: 2 — Session-Cached (invalidate on midnight)**

The weekly comparison changes by at most one transaction between dashboard visits. Caching for the day is safe.

| Trigger | Behavior |
|---------|----------|
| First dashboard visit of the day | Fetch both totals (2 reads). Store in `DashboardCacheService` with today's date key. |
| Subsequent visits same day | Serve from cache. 0 reads. |
| Midnight rollover | Date key changes → cache miss → fresh fetch. |
| Week boundary (Sunday → Monday) | "Last week" shifts to what was "this week." Cache invalidates naturally via date key. Both values re-fetched. |

---

## 4. Copy & Wording

### Card title

"This Week"

Short, punchy. Not "Week-over-Week Trend" (too analytical) or "Weekly Performance" (too formal).

### Primary line: Trend arrow + amount

| Scenario | Text | Icon | Color |
|----------|------|------|-------|
| Up | "↑ ₱{thisWeek}" | `trending_up` | Green (`#4caf50`) |
| Down | "↓ ₱{thisWeek}" | `trending_down` | Muted gray |
| Flat (equal) | "→ ₱{thisWeek}" | `trending_flat` | Neutral |
| Last week = 0, this week > 0 | "↑ ₱{thisWeek}" | `trending_up` | Green |
| Both = 0 | (empty state) | — | — |

The primary number is always this week's total. The arrow indicates direction relative to last week.

### Secondary line: Comparison context

| Scenario | Text |
|----------|------|
| Up by X% | "{pct}% more than last week" |
| Down by X% | "{pct}% less — {daysLeft} days left this week" |
| Flat | "Same pace as last week" |
| Monday (day 1) | "Week just started" (skip percentage — 1 day vs 7 days is misleading) |
| Tuesday (day 2) | Show percentage only if this week > 0 |

**Important nuance:** On Monday, comparing 1 day of sales to a full 7-day week is misleading ("↓ 85% from last week" — of course, it's only Monday). The widget should be smart about this:

- **Days 1-2 (Mon-Tue):** Show this week's total but suppress the percentage comparison. Instead show: "Week just started — ₱{amount} so far"
- **Days 3-7 (Wed-Sun):** Show full comparison with percentage.

This prevents the demoralizing "you're way behind" message every Monday morning.

### Tertiary line: Last week reference

"Last week: ₱{lastWeek}" — small, muted. Always visible (except in empty state) so the staff has the reference point.

---

## 5. Empty State

When both weeks are 0:

- Icon: `show_chart` (Material icon, muted)
- Text: "Your weekly trend will appear after your first sale"

When it's Monday and this week = 0 but last week > 0:

- Text: "Last week you earned ₱{lastWeek}. New week, fresh start!"
- Tone: Energizing, not pressuring

---

## 6. Visual Design

### Card structure

```
┌──────────────────────────────────────┐
│  📊  This Week                       │
│                                      │
│  ↑ ₱ 8,400                          │  ← Primary (amount, large)
│  18% more than last week             │  ← Comparison (green or muted)
│  Last week: ₱7,120                   │  ← Reference (small, muted)
└──────────────────────────────────────┘
```

### Sizing

| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Card | 1 grid column | 1 grid column | Full width |
| Primary amount | 24px, 700 weight | 22px | 20px |
| Trend icon | 20px, inline | 20px | 18px |
| Comparison text | 14px, 500 weight | 13px | 13px |
| Last week reference | 12px, 400 weight | 12px | 12px |
| Card padding | 24px | 24px | 16px |
| Card min-height | 120px | 120px | 100px |

### Colors

- Primary amount: `var(--mat-sys-on-surface)` (dark text — the number itself is neutral)
- Trend icon + comparison text (up): `#4caf50` (green)
- Trend icon + comparison text (down): `var(--mat-sys-on-surface-variant)` (muted gray, NOT red)
- Trend icon + comparison text (flat): `var(--mat-sys-on-surface-variant)`
- Last week reference: `var(--mat-sys-on-surface-variant)`

### Card elevation

`mat-elevation-z1`

---

## 7. Interactions

| Action | Behavior |
|--------|----------|
| Tap/click the card | Navigate to `/store/history` with this week's date range pre-filtered |
| Hover (desktop) | Subtle elevation increase + cursor pointer |

---

## 8. Role Visibility

| Role | Sees this widget? | Reason |
|------|-------------------|--------|
| ADMIN | ✅ | Tracks weekly rhythm |
| MANAGER | ✅ | Same |
| STAFF | ✅ | Primary audience — weekly cadence is most actionable |
| TRAINER | ❌ | No POS transactions |

---

## 9. Edge Cases

| Scenario | Behavior |
|----------|----------|
| Monday morning, 0 sales | "Last week you earned ₱{X}. New week, fresh start!" |
| Monday morning, last week also 0 | Full empty state |
| Sunday evening (end of week) | Full comparison shown. "This week: ₱X" reflects the complete week. |
| Staff started mid-week last week | Partial week comparison. Slightly unfair but acceptable — normalizing by days worked requires tracking work schedules, which we don't have. |
| VOID transactions | Both weeks affected equally. Relative comparison still valid. |
| Week spanning month boundary (e.g., week starts March 29, ends April 4) | Works correctly — the query uses date range, not month boundaries. |

---

## 10. Component Spec

**File:** `src/app/features/dashboard/widgets/week-trend/week-trend.ts`

**Inputs:** None.

**Injections:** `TransactionService`, `AuthService`, `DashboardCacheService`

**Signals:**
- `thisWeekTotal = signal(0)`
- `lastWeekTotal = signal(0)`
- `isLoading = signal(true)`

**Computed:**
- `difference = computed(() => thisWeekTotal() - lastWeekTotal())`
- `percentageChange = computed(() => lastWeekTotal() > 0 ? (difference() / lastWeekTotal()) * 100 : null)`
- `direction = computed(() => thisWeekTotal() > lastWeekTotal() ? 'up' : thisWeekTotal() < lastWeekTotal() ? 'down' : 'flat')`
- `dayOfWeek = computed(() => { const d = new Date().getDay(); return d === 0 ? 7 : d; })` — 1=Mon through 7=Sun
- `daysLeftInWeek = computed(() => 7 - dayOfWeek())`
- `isEarlyWeek = computed(() => dayOfWeek() <= 2)` — Mon or Tue
- `showPercentage = computed(() => !isEarlyWeek() && lastWeekTotal() > 0)`
- `isEmpty = computed(() => thisWeekTotal() === 0 && lastWeekTotal() === 0)`

**Helper (pure function, in component or utils):**
```typescript
function getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
}
```

**Data loading:**
```typescript
const cached = this.cacheService.getWeekTrend();
if (cached && cached.dateKey === todayStr) {
    this.thisWeekTotal.set(cached.data.thisWeek);
    this.lastWeekTotal.set(cached.data.lastWeek);
    this.isLoading.set(false);
    return;
}

const startOfThisWeek = getStartOfWeek(new Date());
const now = new Date();
const startOfLastWeek = getStartOfWeek(new Date(startOfThisWeek.getTime() - 1));
const endOfLastWeek = new Date(startOfThisWeek.getTime() - 1);
endOfLastWeek.setHours(23, 59, 59, 999);

const [thisWeek, lastWeek] = await Promise.all([
    this.transactionService.getSalesTotal({
        startDate: startOfThisWeek, endDate: now, staffId: uid
    }),
    this.transactionService.getSalesTotal({
        startDate: startOfLastWeek, endDate: endOfLastWeek, staffId: uid
    })
]);

this.thisWeekTotal.set(thisWeek);
this.lastWeekTotal.set(lastWeek);
this.cacheService.setWeekTrend({ thisWeek, lastWeek }, todayStr);
this.isLoading.set(false);
```

---

## 11. Firestore Index Requirements

Same composite index as Phases 2-4: `staffId` (ASC) + `date` (ASC) on `transactions`. No new index needed.

---

## 12. Relationship to Phase 4 (vs Last Month)

These two widgets sit side by side in the grid (row 2 on desktop). They serve different timeframes:

| Aspect | Phase 4: vs Last Month | Phase 5: This Week |
|--------|----------------------|-------------------|
| Timeframe | Monthly (30 days) | Weekly (7 days) |
| Psychological purpose | "Am I growing over time?" | "Am I on a roll right now?" |
| Actionability | Low (month is long) | High (can influence this week) |
| Comparison fairness | Partial month vs full month | Partial week vs full week (early-week suppression helps) |
| Cache tier | Tier 2 (daily) | Tier 2 (daily) |

Together they give the staff both the long view and the short view. The weekly widget is more motivating day-to-day; the monthly widget provides the bigger narrative.

---

## Next Step

Phase 6: Members You Checked In Today — count and names of members this staff welcomed today.
