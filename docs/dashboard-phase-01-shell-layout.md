# Phase 1: Dashboard Shell & Layout Grid

> Part of: Staff Personal Dashboard Spec
> Focus: Page structure, greeting, routing, skeleton loading, responsive grid, role visibility

---

## 1. Goal

The dashboard shell is the container that holds every widget. Its job is to:
- Make the staff feel welcomed and recognized the moment they log in
- Establish visual hierarchy — the most motivating data appears first
- Adapt gracefully across desktop (1200px+), tablet (600-1200px), and mobile (<600px)
- Load fast — show skeleton placeholders while data arrives, never a blank white page

---

## 2. Routing & Default Page

**Current state:** `{ path: '', redirectTo: '/members', pathMatch: 'full' }` — everyone lands on the member list.

**New behavior:**
- Default route changes to `/dashboard`
- `/dashboard` is the landing page after login for ALL roles
- Route config:
```
{
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent),
    canActivate: [authGuard],
    data: { animation: 'DashboardPage', roles: ['ADMIN', 'MANAGER', 'STAFF', 'TRAINER'] }
}
```
- `{ path: '', redirectTo: '/dashboard', pathMatch: 'full' }`
- Add "Home" as the first sidenav item with `home` icon

**File location:** `src/app/features/dashboard/dashboard.ts` (standalone component, lazy-loaded)

---

## 3. Greeting Header

**What it shows:**
- Time-aware greeting + staff first name
- Current date in readable format

**Copy:**

| Time Range | Greeting |
|------------|----------|
| 5:00 AM – 11:59 AM | "Good morning, {firstName}" |
| 12:00 PM – 4:59 PM | "Good afternoon, {firstName}" |
| 5:00 PM – 4:59 AM | "Good evening, {firstName}" |

- `{firstName}` = first word of `authService.userProfile().displayName`
- Date line below: "Tuesday, April 14, 2026" — using `Intl.DateTimeFormat('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })`

**Empty state:** If `displayName` is null/empty, fall back to "Welcome back"

**Visual:**
- Greeting: `mat-headline-medium` (24px, 500 weight)
- Date: `mat-body-medium` (14px, 400 weight, secondary text color)
- No icon, no avatar (keep it clean)
- Left-aligned, full width
- Padding: 0 0 16px 0 (no top padding — the content area already has `var(--container-padding)`)

---

## 4. Layout Grid

The dashboard uses CSS Grid. Widgets are placed into named areas that rearrange per breakpoint.

**Desktop (≥1200px) — 3 columns:**
```
┌─────────────────────────────────────────────────┐
│ Greeting                                        │
├───────────────┬───────────────┬─────────────────┤
│ Today's Sales │ Monthly Ring  │ Badges/Shift    │
│ (hero card)   │ (progress)    │ (status row)    │
├───────────────┴───────────────┴─────────────────┤
│ Week Trend    │ vs Last Month │ Top Product     │
├───────────────┴───────────────┴─────────────────┤
│ Members Checked In    │ Commendation            │
├───────────────────────┴─────────────────────────┤
│ Low Stock Alerts (ADMIN/MANAGER only)           │
├─────────────────────────────────────────────────┤
│ Recent Activity Feed                            │
└─────────────────────────────────────────────────┘
```

Grid definition:
```css
.dashboard-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
}
```

Widgets that span full width use `grid-column: 1 / -1`.

**Tablet (600px – 1199px) — 2 columns:**
```
┌─────────────────────────────────┐
│ Greeting                        │
├────────────────┬────────────────┤
│ Today's Sales  │ Monthly Ring   │
├────────────────┴────────────────┤
│ Badges / Shift Status           │
├────────────────┬────────────────┤
│ Week Trend     │ vs Last Month  │
├────────────────┴────────────────┤
│ Top Product    │ Members In     │
├────────────────┴────────────────┤
│ Commendation                    │
├─────────────────────────────────┤
│ Low Stock (if applicable)       │
├─────────────────────────────────┤
│ Activity Feed                   │
└─────────────────────────────────┘
```

```css
@media (max-width: 1199px) {
    .dashboard-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}
```

**Mobile (<600px) — 1 column, stacked:**
```
┌─────────────────┐
│ Greeting        │
├─────────────────┤
│ Today's Sales   │  ← Hero card, most important
├─────────────────┤
│ Monthly Ring    │
├─────────────────┤
│ Badges/Shift    │
├─────────────────┤
│ Week Trend      │
├─────────────────┤
│ vs Last Month   │
├─────────────────┤
│ Members In      │
├─────────────────┤
│ Top Product     │
├─────────────────┤
│ Commendation    │
├─────────────────┤
│ Low Stock       │
├─────────────────┤
│ Activity Feed   │
└─────────────────┘
```

```css
@media (max-width: 599px) {
    .dashboard-grid {
        grid-template-columns: 1fr;
    }
}
```

**Mobile stacking order rationale:**
1. Today's Sales — the most immediate motivator, must be first
2. Monthly Ring — progress toward goal, second most important
3. Badges/Shift — actionable status (is the register open?)
4. Week Trend + vs Last Month — growth context
5. Members In — social/purpose metric
6. Top Product — identity/fun
7. Commendation — emotional boost at the bottom (reward for scrolling)
8. Low Stock / Activity Feed — operational, least urgent for motivation

---

## 5. Widget Refresh Strategy (Caching Tiers)

Not all widgets need fresh data on every dashboard visit. A staff member going POS → Dashboard → POS → Dashboard 20 times a day should not fire 20 × 10 queries for data that barely changed. Each widget falls into one of three refresh tiers:

### Tier 1: Always Fresh (re-fetch on every dashboard visit)

These widgets reflect the staff's most recent actions. The staff expects to see updated numbers after making a sale or checking in a member.

| Widget | Why always fresh | Query cost per visit |
|--------|-----------------|---------------------|
| Today's Sales | Changes after every checkout | 2 reads (aggregation today + yesterday) |
| Members Checked In | Changes after every check-in | 1-20 reads (getDocs, limit 20) |
| Activity Feed | Changes after every action | 2-10 reads (limit 5 per collection) |
| Badges / Shift Status | Changes when shift opens/closes | 0 reads (uses existing BehaviorSubject, already live) |

**Implementation:** These widgets fetch data in their constructor/`ngOnInit`. When the component is destroyed (navigate away) and re-created (navigate back), the constructor runs again and fetches fresh data. No caching layer needed — Angular's component lifecycle handles it naturally.

**Total cost per revisit: ~24 reads worst case.**

### Tier 2: Session-Cached (fetch once, reuse until invalidated)

These widgets show comparative/historical metrics that don't meaningfully change from one transaction to the next. A staff member making their 15th sale doesn't need the "vs Last Month" comparison to re-query — the percentage barely moved.

| Widget | Why session-cached | Invalidation trigger |
|--------|-------------------|---------------------|
| Week-over-Week Trend | Weekly comparison changes slowly | Midnight rollover (new day) |
| You vs Last Month | Monthly comparison changes slowly | Midnight rollover (new month) |
| Your Top Product | Product ranking changes over weeks | Midnight rollover |
| Commendation of the Day | Fixed for the day | Midnight rollover |

**Implementation:** A new `DashboardCacheService` (providedIn: root) holds these values in signals. Each widget checks the cache first. If the cache has data for today's date key, use it. If not (first load of the day, or midnight rollover), fetch from Firestore and store in cache.

```typescript
// DashboardCacheService concept
interface CachedWidget<T> {
    data: T;
    dateKey: string; // YYYY-MM-DD — invalidates on day change
}

// Widget checks:
const cached = this.cacheService.getWeekTrend();
if (cached && cached.dateKey === todayStr) {
    // Use cached data — 0 Firestore reads
} else {
    // Fetch, then store: cacheService.setWeekTrend(data, todayStr)
}
```

**Total cost per revisit: 0 reads (served from cache). First load of the day: ~4 reads (2 aggregations for week trend + 2 for month comparison).**

### Tier 3: Already Cached (existing infrastructure)

These widgets piggyback on caching that already exists in the project. No new caching needed.

| Widget | Existing cache mechanism | Cost |
|--------|------------------------|------|
| Monthly Progress Ring | `ReportStateService.getMonthlyReport()` with `shareReplay({ refCount: true })` | 0 if cached, ~30 if cold (once per session) |
| Low Stock Alerts | `ProductService.getProducts()` with `shareReplay({ refCount: false })` | 0 (listener stays alive forever) |

### Refresh summary per dashboard visit

| Visit type | Tier 1 (always) | Tier 2 (cached) | Tier 3 (existing) | Total reads |
|-----------|-----------------|-----------------|-------------------|-------------|
| First load of the day | ~24 | ~4 | ~30 (cold) | ~58 |
| Subsequent revisit (same day) | ~24 | 0 | 0 | ~24 |
| 20th revisit in a day | ~24 | 0 | 0 | ~24 |

Compare to the original plan without tiers: ~165 reads on every visit. The caching tiers reduce revisit cost by 85%.

### Midnight rollover handling

The `DashboardCacheService` uses a `dateKey` (YYYY-MM-DD) on each cached entry. When the dashboard loads and today's date doesn't match the cached `dateKey`, all Tier 2 caches are automatically invalidated. This handles:
- Staff who leave the app open overnight (next morning load gets fresh data)
- Month boundaries (Jan 31 → Feb 1 invalidates "vs Last Month")
- Week boundaries (Sunday → Monday invalidates "Week Trend")

No interval timer needed — the check happens on each dashboard component init.

---

## 6. Skeleton Loading

**Approach:** Each widget slot shows a skeleton placeholder while its data loads. The shell renders immediately with skeletons; widgets replace them as data arrives.

**Skeleton design:**
- Use CSS `background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)` with `animation: shimmer 1.5s infinite`
- Each skeleton matches the approximate height of its widget:
  - Hero card (Today's Sales): 160px
  - Progress ring: 200px
  - Small cards (trend, comparison): 120px
  - Activity feed: 300px

**Implementation:** Each widget component handles its own loading state internally using signals (`isLoading = signal(true)`). The dashboard shell doesn't manage loading — it just renders the widget components, and each one shows its own skeleton until data arrives.

This follows the existing project pattern (e.g., `ReportsDashboardComponent` loads data in constructor and components render when ready).

---

## 7. Role Visibility Matrix

Not all widgets are relevant to all roles. The dashboard adapts based on `authService.userProfile().roles`:

| Widget | ADMIN | MANAGER | STAFF | TRAINER |
|--------|-------|---------|-------|---------|
| Greeting | ✅ | ✅ | ✅ | ✅ |
| Today's Sales | ✅ | ✅ | ✅ | ❌ |
| Monthly Progress Ring | ✅ | ✅ | ✅ | ❌ |
| Badges / Shift Status | ✅ | ✅ | ✅ | ❌ |
| Week-over-Week Trend | ✅ | ✅ | ✅ | ❌ |
| You vs Last Month | ✅ | ✅ | ✅ | ❌ |
| Members Checked In | ✅ | ✅ | ✅ | ✅ |
| Your Top Product | ✅ | ✅ | ✅ | ❌ |
| Commendation | ✅ | ✅ | ✅ | ✅ |
| Low Stock Alerts | ✅ | ✅ | ❌ | ❌ |
| Recent Activity Feed | ✅ | ✅ | ✅ | ✅ |

**TRAINER dashboard** is simpler: Greeting → Members Checked In → Commendation → Activity Feed. Sales-related widgets are hidden because trainers don't process POS transactions.

**Implementation:** Use `@if (authService.hasAnyRole(['ADMIN', 'MANAGER', 'STAFF']))` in the template to conditionally render each widget section.

---

## 8. Sidenav Integration

Add "Home" as the first navigation item, visible to all roles:

```html
<a mat-list-item routerLink="/dashboard" routerLinkActive="active">
    <mat-icon matListItemIcon>home</mat-icon>
    <span matListItemTitle>Home</span>
</a>
```

Position: First item in the sidenav, before "Members". No section divider above it.

---

## 9. Component Architecture

```
src/app/features/dashboard/
├── dashboard.ts              # Shell component — greeting + grid + role checks
├── dashboard.html            # Template with grid layout
├── dashboard.css             # Grid CSS + responsive breakpoints
├── services/
│   └── dashboard-cache.service.ts  # Tier 2 session cache (date-keyed)
└── widgets/                  # Each widget is a standalone component
    ├── todays-sales/
    ├── monthly-progress/
    ├── week-trend/
    ├── vs-last-month/
    ├── members-checked-in/
    ├── top-product/
    ├── commendation/
    ├── badge-row/
    ├── low-stock-alerts/
    └── activity-feed/
```

Each widget:
- Is a standalone component with `ChangeDetectionStrategy.OnPush`
- Manages its own data fetching and loading state
- Has its own `.css` file for widget-specific styles
- Receives no `@Input()` — each widget injects the services it needs directly
- Uses signals for local state

The shell component (`dashboard.ts`) is thin — it only handles:
- Greeting computation (time of day + user name)
- Role checks for conditional rendering
- The CSS grid layout

---

## 10. Edge Cases

| Scenario | Behavior |
|----------|----------|
| First login ever (new staff) | All widgets show encouraging empty states. Greeting works. No sales data = "Your first sale will show here" |
| No shift open | Badge row shows "Register closed" with a prompt to open. Sales widgets still show historical data. |
| Midnight rollover while page is open | Greeting updates on next interval check (60s). Sales widgets show stale data until refresh. Acceptable — staff typically don't leave the dashboard open overnight. |
| User has multiple roles (e.g., ADMIN + STAFF) | Show the union of all widgets for their roles. ADMIN sees everything. |
| Slow network | Skeleton loaders visible until data arrives. No blank white space. |
| Offline (Firestore cache) | Firestore persistent cache serves last-known data. Widgets render with cached data. No error state unless cache is empty. |

---

## 11. Firestore Cost on Dashboard Load (Updated with Caching Tiers)

| Widget | Tier | First Load | Revisit (same day) |
|--------|------|-----------|-------------------|
| Today's Sales | 1 (always) | 2 reads | 2 reads |
| Monthly Progress | 3 (existing) | ~30 reads | 0 |
| Week Trend | 2 (session) | 2 reads | 0 |
| vs Last Month | 2 (session) | 2 reads | 0 |
| Members Checked In | 1 (always) | 1-20 reads | 1-20 reads |
| Top Product | 2 (session) | 1-100 reads | 0 |
| Commendation | — (local) | 0 | 0 |
| Badges / Shift | 3 (existing) | 0 | 0 |
| Low Stock | 3 (existing) | 0 | 0 |
| Activity Feed | 1 (always) | 2-10 reads | 2-10 reads |
| **Total** | | **~58-166** | **~5-32** |

First load of the day is the most expensive (~58 best case, ~166 if Monthly Progress cache is cold and Top Product hits 100 docs). Every subsequent revisit costs only ~24 reads — the Tier 2 widgets serve from cache.

**Top Product optimization:** The 100-transaction query is the single most expensive widget. Consider reducing the limit to 30 (a staff member's top product is usually clear within 30 transactions) or deriving it from the Activity Feed data (Phase 11) which already fetches recent transactions.

---

## Next Step

Phase 2: Today's Sales Card — the hero widget that anchors the entire dashboard.
