# Phase 3: Monthly Progress Ring

> Part of: Staff Personal Dashboard Spec
> Focus: Circular progress indicator showing the staff's contribution to the gym's monthly quota

---

## 1. Goal

**Psychological driver:** Goal proximity + contribution awareness.

The progress ring answers: "How close are we to hitting this month's target, and how much of that is because of me?" Seeing a ring fill up over the month creates a sense of collective momentum. Seeing your personal slice of that ring creates ownership.

This is the second most important widget after Today's Sales. Together they form the "hero row" — today's effort (Sales) feeding into the bigger picture (Monthly Ring).

---

## 2. Data Source

### Gym monthly quota

**Source:** `SettingsService.getSettings().monthlyQuota`

Already cached via `shareReplay(1)` in `SettingsService`. Zero additional Firestore reads.

### Gym monthly total (all staff combined)

**Source:** `ReportStateService.getMonthlyReport(year, month).total`

This reads from the `daily_sales` collection (pre-aggregated). Already cached via `shareReplay({ bufferSize: 1, refCount: true })` in `ReportStateService`. If the `QuotaStatusWidget` in the toolbar already loaded this month's data, the dashboard gets it for free — 0 reads.

If cold (first load of the session): ~30 reads (one per day-of-month document in `daily_sales`).

### Staff personal monthly total

**Source:** `TransactionService.getSalesTotal({ startDate, endDate, staffId: uid })`

This is a `getAggregateFromServer` call — 1 read. This is the only new query this widget needs.

**Important distinction:** The gym total comes from `daily_sales` (authoritative per business rules). The staff personal total comes from `transactions` (filtered by `staffId`). These are different data sources by design — `daily_sales` doesn't track per-staff breakdowns.

### Derived metrics (computed, no queries)

- `gymProgress = (gymTotal / quota) * 100` — capped at 100
- `staffContribution = staffTotal / gymTotal * 100` — "You contributed X%"
- `remainingQuota = Math.max(quota - gymTotal, 0)`
- `remainingDays = lastDayOfMonth - today + 1`
- `dailyTarget = remainingQuota / remainingDays`

These formulas match exactly what `QuotaStatusWidget` already computes (business-rules.md sections 2.2, 2.3). The dashboard ring reuses the same math.

### Total Firestore cost for this widget

| Data | Cost | Cached? |
|------|------|---------|
| Monthly quota | 0 | Yes (SettingsService shareReplay) |
| Gym monthly total | 0 if warm, ~30 if cold | Yes (ReportStateService) |
| Staff monthly total | 1 read | No — new aggregation query |
| **Total** | **1 read** (warm) / **~31 reads** (cold) | |

---

## 3. Refresh Behavior & Caching Tier

**Tier: 3 — Already Cached (via ReportStateService + SettingsService)**

The gym total and quota are already cached by existing infrastructure. The only new query is the staff's personal monthly total (1 aggregation read).

| Trigger | Behavior |
|---------|----------|
| Navigate to dashboard | Read staff monthly total (1 aggregation). Gym total + quota from cache. |
| Navigate away and back | Same — 1 aggregation read. Gym data still cached. |
| After a sale by this staff | Stale until next dashboard visit. The aggregation is one-shot, not live. Acceptable — the ring shows monthly progress, not real-time. One sale changes the ring by <1%. |
| Midnight rollover / month boundary | `ReportStateService` cache key includes `year-month`. New month = new key = fresh query. |

**Why not cache the staff total too?** The staff total changes with every sale they make. Unlike Week Trend or Top Product (which change slowly), the staff monthly total is the accumulation of Today's Sales into the monthly bucket. If we cached it, the ring would show stale data after the staff makes a sale and returns to the dashboard. The 1-read cost per visit is acceptable for accuracy.

---

## 4. Copy & Wording

### Card title

"Monthly Progress"

### Primary display: The ring

A circular progress indicator (SVG or CSS) showing gym-wide progress toward the monthly quota.

### Inside the ring

The percentage number: "64%" — large, centered inside the ring.

Below it: "of ₱{quota} target" — small, muted.

### Below the ring: Staff contribution line

| Scenario | Text |
|----------|------|
| Staff has sales this month | "You contributed ₱{staffTotal} ({pct}%)" |
| Staff has zero sales | "Your sales will show here as you go" |
| Quota is 0 (not configured) | "No monthly target set" |
| Quota met (≥100%) | "Target reached! 🎉" |

### Daily micro-target

"₱{dailyTarget} per day to stay on track" — only show if quota > 0 and not yet met.

If quota is met: replace with "Keep the momentum going"

If remaining days = 0 (last day of month): "Last day — ₱{remaining} to go" or "Target reached!" if met.

### Color transitions (ring fill color)

| Progress | Color | Tone |
|----------|-------|------|
| 0–49% | `#f44336` (red) | Behind pace |
| 50–74% | `#ff9800` (orange) | Getting there |
| 75–99% | `#ffeb3b` (yellow) | Almost there |
| 100%+ | `#4caf50` (green) | Target met |
| Quota = 0 | `#e0e0e0` (gray) | Not configured |

These match the existing `QuotaStatusWidget` color logic exactly (business-rules.md section 2.4).

---

## 5. Empty States

| Scenario | Display |
|----------|---------|
| Quota = 0 (admin hasn't set it) | Gray ring at 0%. Text: "No monthly target set". No daily target line. |
| Quota set but gym total = 0 (first day of month, no sales yet) | Red ring at 0%. Text: "₱0 of ₱{quota} target". Daily target shows full quota / days remaining. |
| Staff total = 0 but gym total > 0 (other staff made sales) | Ring shows gym progress. Contribution line: "Your sales will show here as you go" — encouraging, not shaming. |

---

## 6. Visual Design

### Ring structure

```
┌──────────────────────────────────────┐
│  📊  Monthly Progress                │
│                                      │
│         ┌─────────┐                  │
│         │         │                  │
│         │   64%   │  ← Ring with     │
│         │ of ₱150K│    colored fill  │
│         │         │                  │
│         └─────────┘                  │
│                                      │
│  You contributed ₱32,000 (21%)       │
│  ₱2,250 per day to stay on track    │
└──────────────────────────────────────┘
```

### Ring implementation

Use SVG `<circle>` with `stroke-dasharray` and `stroke-dashoffset` for the progress arc. This is lightweight, no external library needed, and animates smoothly with CSS transitions.

```
Ring diameter: 140px (desktop/tablet), 120px (mobile)
Stroke width: 10px
Background track: #e0e0e0 (gray)
Progress arc: color from table above
Percentage text: 32px bold (desktop), 28px (mobile), centered
Subtitle text: 12px, muted, centered
```

### Sizing

| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Card | 1 grid column | 1 grid column | Full width |
| Ring diameter | 140px | 140px | 120px |
| Percentage inside ring | 32px, 700 weight | 28px | 24px |
| Subtitle inside ring | 12px, 400 weight | 12px | 11px |
| Contribution line | 14px, 500 weight | 14px | 13px |
| Daily target line | 13px, 400 weight | 13px | 12px |
| Card padding | 24px | 24px | 16px |
| Card min-height | 200px | 200px | 180px |

### Ring animation

On first render, the ring animates from 0% to the actual percentage over 800ms with `ease-out` easing. This creates a satisfying "fill up" effect that draws the eye.

```css
.progress-ring-circle {
    transition: stroke-dashoffset 0.8s ease-out;
}
```

---

## 7. Interactions

| Action | Behavior |
|--------|----------|
| Tap/click the card | Navigate to `/store/monthly-sales` — staff can see the daily breakdown |
| Hover (desktop) | Subtle elevation increase + cursor pointer |
| Ring animation | Plays on component init (first render). Does not replay on subsequent visits unless the component is destroyed and re-created. |

---

## 8. Role Visibility

| Role | Sees this widget? | Reason |
|------|-------------------|--------|
| ADMIN | ✅ | Sees full gym progress + their own contribution |
| MANAGER | ✅ | Same |
| STAFF | ✅ | Primary audience — their contribution matters |
| TRAINER | ❌ | Trainers don't process POS sales |

---

## 9. Relationship to Existing QuotaStatusWidget

The toolbar already has a `QuotaStatusWidget` that shows monthly + daily progress. The dashboard ring is NOT a replacement — it's a richer, more visual version for the dashboard context.

| Aspect | Toolbar QuotaStatusWidget | Dashboard Monthly Ring |
|--------|--------------------------|----------------------|
| Location | Always visible in toolbar | Only on dashboard page |
| Size | Compact (icon + number) | Large (ring + text) |
| Shows staff contribution? | No (gym-wide only) | Yes — "You contributed X%" |
| Shows daily target? | Yes (compact) | Yes (with more context) |
| Data source | Same (`ReportStateService` + `SettingsService`) | Same + staff aggregation |

They share the same underlying data and formulas. The dashboard ring adds the personal contribution layer.

---

## 10. Edge Cases

| Scenario | Behavior |
|----------|----------|
| First day of the month | Ring at 0% (or near 0%). Daily target = quota / days in month. Normal. |
| Last day of the month | Daily target = remaining quota. Text: "Last day — ₱{remaining} to go" |
| Quota exceeded (>100%) | Ring shows full (100%). Color: green. Text: "Target reached! 🎉 ₱{overage} over target" |
| Very small quota (₱1,000) met on day 1 | Ring at 100% for the rest of the month. Daily target: "Keep the momentum going" |
| Staff contribution > 100% of gym total | Shouldn't happen mathematically (staff total ≤ gym total). But if data is out of sync, cap display at 100%. |
| Month boundary while dashboard is open | `ReportStateService` cache key is `year-month`. If the month changes, the next dashboard visit creates a new cache entry for the new month. Old month data is still cached but no longer displayed. |
| Quota changed mid-month by admin | `SettingsService.getSettings()` is a real-time listener (`docData` + `shareReplay`). The ring updates automatically when the admin changes the quota. No manual refresh needed. |

---

## 11. Component Spec

**File:** `src/app/features/dashboard/widgets/monthly-progress/monthly-progress.ts`

**Inputs:** None.

**Injections:** `ReportStateService`, `SettingsService`, `TransactionService`, `AuthService`

**Signals:**
- `gymTotal = signal(0)` — from ReportStateService
- `staffTotal = signal(0)` — from TransactionService aggregation
- `quota = signal(0)` — from SettingsService
- `isLoading = signal(true)`

**Computed:**
- `gymProgress = computed(() => quota() > 0 ? Math.min((gymTotal() / quota()) * 100, 100) : 0)`
- `staffContributionPct = computed(() => gymTotal() > 0 ? (staffTotal() / gymTotal()) * 100 : 0)`
- `remainingQuota = computed(() => Math.max(quota() - gymTotal(), 0))`
- `remainingDays = computed(() => { ... })` — days left in month including today
- `dailyTarget = computed(() => remainingDays() > 0 ? remainingQuota() / remainingDays() : 0)`
- `ringColor = computed(() => { ... })` — color based on gymProgress thresholds
- `isQuotaMet = computed(() => gymProgress() >= 100)`
- `isQuotaConfigured = computed(() => quota() > 0)`

**Data loading:**
```typescript
// In constructor or effect:
// 1. Gym total — Observable from existing cache
toSignal(reportStateService.getMonthlyReport(year, month).pipe(map(r => r.total)))

// 2. Staff total — one-shot aggregation
const total = await transactionService.getSalesTotal({ startDate, endDate, staffId: uid });
staffTotal.set(total);

// 3. Quota — Observable from existing cache
toSignal(settingsService.getSettings().pipe(map(s => s.monthlyQuota || 0)))
```

---

## 12. Firestore Index Requirements

The `getSalesTotal` query for staff monthly total uses: `where('date', '>=', startOfMonth)`, `where('date', '<=', endOfMonth)`, `where('staffId', '==', uid)`.

Same composite index as Phase 2 (Today's Sales): `staffId` (ASC) + `date` (ASC) on `transactions`. No new index needed.

---

## Next Step

Phase 4: You vs Last Month — side-by-side comparison of current month vs previous month performance.
