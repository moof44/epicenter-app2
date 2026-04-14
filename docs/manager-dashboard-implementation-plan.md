# Manager & Admin Dashboard — Implementation Plan

> Date: April 15, 2026
> Source: `docs/manager-admin-dashboard-brainstorm.md`
> Approach: Phase-by-phase with mandatory review checkpoints

---

## ⚠️ MANDATORY PRE-IMPLEMENTATION CHECKLIST

Before writing ANY code in each phase, the developer MUST re-read and verify compliance with:

### Steering Files (`.kiro/steering/`)

| File | Key Rules to Watch |
|------|--------------------|
| `coding-standards.md` | `OnPush` on all new components. `inject()` not constructor. Signals for UI state. No `getDocs`/`collectionData` without `limit()` or `where()`. No hardcoded hex colors — use `var(--mat-sys-*)`. Spacing multiples of 8px. |
| `structure.md` | Standalone components only. `app-` selector prefix. Services in `core/services/`. Models in `core/models/`. Feature components in `features/{name}/components/`. Separate `.html` and `.css` files. |
| `tech.md` | Angular 21, Angular Material 21, plain CSS (no SCSS), `@ngrx/signals` for state, RxJS for Firestore streams, `ng-apexcharts` for charts. |
| `ux-guidelines.md` | Skeleton loaders for async. `MatSnackBar` for feedback. Empty states with CTA. Touch targets ≥ 44px. Mobile-first. No `any` in core/. `catchError` in Observables. |
| `business-rules.md` | Daily sales from `daily_sales` collection ONLY. Monthly sales via `ReportStateService.getMonthlyReport()`. Quota from `SettingsService`. Never compute totals client-side from transactions for authoritative numbers. Shift totals via `increment()` only. |
| `product.md` | Role-based access: ADMIN = full, MANAGER = members/attendance/store/inventory, STAFF = members/attendance/POS/transactions/shifts, TRAINER = members(read)/attendance/progress. |

### Agent Hooks (`.kiro/hooks/`)

| Hook | What It Does | When It Fires |
|------|-------------|---------------|
| `code-quality-review.kiro.hook` | Analyzes `.ts`, `.html`, `.css` for code smells, patterns, performance | On every file edit |
| `quality-assurance.kiro.hook` | QA attack mode — happy path, negative testing, side effects, regression | After each task completion |
| `systems-documentation-update.kiro.hook` | Updates `project-analysis.md` if logic/approach changed significantly | After each task completion |

### Common Violations to Avoid (from staff dashboard implementation)

| Violation | Steering Rule | How to Avoid |
|-----------|--------------|--------------|
| Hardcoded hex colors (`#3f51b5`, `#4caf50`) | `coding-standards.md` — use `var(--mat-sys-primary)` | Use Material CSS variables everywhere |
| Custom font sizes (`font-size: 36px`) | `coding-standards.md` — use Material typography | Use `mat-headline-small`, `mat-body-large`, etc. |
| Spacing not multiples of 8px (`padding: 12px`) | `coding-standards.md` — multiples of 8px | Use 8, 16, 24, 32. Exception: 4px for fine adjustments |
| Missing `ChangeDetectionStrategy.OnPush` | `coding-standards.md` — all new components | Add to every `@Component` decorator |
| Missing skeleton loaders | `ux-guidelines.md` — no empty white space | Every async widget needs a skeleton state |
| Missing empty states | `ux-guidelines.md` — empty lists need CTA | Every widget needs an empty/zero-data state |
| Widget navigates to page user can't access | `product.md` — role-based access | Check role before navigation, fall back to accessible page |
| Computing daily/monthly totals from transactions | `business-rules.md` — use `daily_sales` | Always use `ReportStateService` or `DailySalesService` |

---

## Architecture Decision: Role-Adaptive Dashboard

The `/dashboard` route serves different layouts based on role:

```
ADMIN/MANAGER → Manager Dashboard (business overview + "My Performance" section)
STAFF         → Staff Dashboard (personal metrics, already implemented)
TRAINER       → Trainer Dashboard (check-ins + commendation, already implemented)
```

The existing `DashboardComponent` will detect the role and render the appropriate layout. Staff widgets are reused in the manager's "My Performance" collapsible section.

---

## Phase A: Business Pulse (Hero Row)

**Goal:** The first thing the manager sees — "How is the gym doing right now?"

### Widgets

| Widget | Data Source | New Service? | Firestore Cost |
|--------|-----------|-------------|----------------|
| Today's Gym Revenue | `daily_sales/{today}` via `ReportStateService` | No | 0 (cached) |
| Monthly Quota Ring (gym-wide) | `ReportStateService.getMonthlyReport()` + `SettingsService` | No | 0 (cached) |
| Members in Gym Now | `AttendanceService.getActiveCheckIns()` | No | Real-time listener (existing) |
| Shift Status (expanded) | `CashRegisterService.currentShift$` | No | 0 (in-memory) |

### Files to Create/Modify

- Modify: `src/app/features/dashboard/dashboard.ts` — add role detection, conditional layout
- Modify: `src/app/features/dashboard/dashboard.html` — add manager layout section
- Modify: `src/app/features/dashboard/dashboard.css` — manager grid layout
- Create: `src/app/features/dashboard/widgets/gym-revenue-today/` — gym-wide today's revenue
- Create: `src/app/features/dashboard/widgets/members-in-gym/` — real-time count of active check-ins

### Reusable from Staff Dashboard

- `MonthlyProgressWidget` — already shows gym-wide quota (just needs to skip the "Your contribution" line for manager view)
- `BadgeRowWidget` — shift status already works for all roles

### Review Checkpoint

Before proceeding to Phase B:
- [ ] `ng build` passes with zero errors
- [ ] All new components use `OnPush`
- [ ] No hardcoded colors
- [ ] Skeleton loaders on all async widgets
- [ ] Empty states on all widgets
- [ ] Role detection works: STAFF still sees their personal dashboard
- [ ] Manager sees gym-wide numbers, not personal numbers
- [ ] Firestore reads verified (should be minimal — mostly cached data)

---

## Phase B: Team Performance

**Goal:** "How is my team doing today?"

### Widgets

| Widget | Data Source | New Service? | Firestore Cost |
|--------|-----------|-------------|----------------|
| Staff Leaderboard (today) | `TransactionService.getTransactions()` grouped by `staffId` | No (new aggregation logic in widget) | 1 query (limit 100, today's transactions) |
| Staff Spotlight ("Star of the Day") | Derived from leaderboard — highest sales | No | 0 (computed from leaderboard data) |
| Staff Targets vs Actual | `UserService.getUsers()` + `TransactionService.getSalesTotal()` per staff | No | N+1 reads (1 user list + N aggregations) |

### Files to Create

- Create: `src/app/features/dashboard/widgets/staff-leaderboard/` — ranked list of staff by today's sales
- Create: `src/app/features/dashboard/widgets/staff-spotlight/` — auto-highlighted top performer

### Steering Concerns

- Staff leaderboard must NOT shame low performers. Show top 5 only. Don't show ₱0 staff.
- `getTransactions()` MUST have `limit()` — use limit 100 for today's transactions.
- Staff sales totals should use `getAggregateFromServer` (server-side) per business rules 1.4.
- The leaderboard is for display breakdown only — not authoritative totals.

### Review Checkpoint

Before proceeding to Phase C:
- [ ] `ng build` passes
- [ ] Leaderboard doesn't show staff with ₱0 sales
- [ ] Leaderboard uses `limit()` on all queries
- [ ] Staff names come from `staffName` on transactions (not a separate user query)
- [ ] Spotlight auto-selects the top performer without manual input
- [ ] STAFF role does NOT see the leaderboard (only ADMIN/MANAGER)

---

## Phase C: Customer Health

**Goal:** "How are our members doing?"

### Widgets

| Widget | Data Source | New Service? | Firestore Cost |
|--------|-----------|-------------|----------------|
| Active Members Count | `MemberService.getMembers()` (cached) | No | 0 (shared listener) |
| Expiring This Week | Same list, client-side filter | No | 0 |
| At-Risk Members (no visit 14+ days) | `members` + `attendance` cross-reference | Yes — new method | Medium (member list + attendance query) |
| New Members This Month | Same list, filter by `createdBy.timestamp` | No | 0 |
| Today's Check-in Count | `attendance` filtered by today | No | 1 query |

### Files to Create

- Create: `src/app/features/dashboard/widgets/member-health/` — combined member stats card
- Create: `src/app/features/dashboard/widgets/at-risk-members/` — members who haven't visited in 14+ days
- Modify: `src/app/core/services/member.service.ts` or `attendance.service.ts` — add at-risk member query

### Steering Concerns

- Member list uses `getMembers()` which has NO limit (exemption noted in code). This is acceptable for the dashboard since it's a shared cached listener.
- At-risk member query: need to cross-reference `members` (active status) with `attendance` (last visit date). This is the most expensive new query — consider caching it in `DashboardCacheService` (Tier 2).
- Expiring memberships: filter `membershipExpiration` in the next 7 days. Use `toDate()` safe conversion pattern per business rules 6.2.

### Review Checkpoint

Before proceeding to Phase D:
- [ ] `ng build` passes
- [ ] At-risk member query has reasonable limits
- [ ] Expiration date comparison uses safe `toDate()` pattern
- [ ] Member counts match what the Members page shows
- [ ] STAFF role does NOT see at-risk members (ADMIN/MANAGER only)

---

## Phase D: Trends & Charts

**Goal:** "Are we trending up or down?"

### Widgets

| Widget | Data Source | New Service? | Firestore Cost |
|--------|-----------|-------------|----------------|
| Daily Sales Sparkline (this month) | `ReportStateService.getMonthlyReport()` | No | 0 (cached) |
| Month-over-Month Revenue | `TransactionService.getSalesTotal()` × 2 | No | 2 aggregations |
| Revenue by Payment Method | `transactions` filtered by today, grouped by `paymentMethod` | No | 1 query |
| Peak Hours Today | `attendance` filtered by today, grouped by hour | No | 1 query |

### Files to Create

- Create: `src/app/features/dashboard/widgets/sales-sparkline/` — mini chart using ng-apexcharts
- Create: `src/app/features/dashboard/widgets/payment-split/` — CASH vs GCASH donut
- Create: `src/app/features/dashboard/widgets/peak-hours/` — busiest hours today

### Steering Concerns

- Charts MUST use `ng-apexcharts` (per tech.md). Don't introduce a new charting library.
- The sparkline should be a mini version — no axis labels, no legend. Just the shape. Tapping navigates to `/reports`.
- Month-over-month uses `getSalesTotal()` which is `getAggregateFromServer` — correct per business rules.
- Revenue by payment method: query today's transactions with `limit()`. Group client-side.

### Review Checkpoint

Before proceeding to Phase E:
- [ ] `ng build` passes
- [ ] Charts use `ng-apexcharts`, not a new library
- [ ] Sparkline is compact (no axis labels on mobile)
- [ ] Payment split donut uses Material CSS variables for colors
- [ ] All chart widgets have skeleton loaders
- [ ] Tapping charts navigates to the existing `/reports` page

---

## Phase E: Operational Alerts & Investigation

**Goal:** "What needs my attention right now?"

### Widgets

| Widget | Data Source | New Service? | Firestore Cost |
|--------|-----------|-------------|----------------|
| Low Stock Alerts | Reuse `LowStockAlertsWidget` | No | 0 (cached) |
| Recent Voids | `TransactionService.getTransactions()` where status='VOID' | No | 1 query (limit 5) |
| Cash Discrepancies | `CashRegisterService.getShiftHistory()` where discrepancy != 0 | No | 1 query (limit 5) |
| Recent Events Timeline | Parallel queries to transactions + attendance + shifts + inventory_logs | Yes — new aggregation widget | ~20 reads |

### Files to Create

- Create: `src/app/features/dashboard/widgets/recent-voids/` — last 5 voided transactions
- Create: `src/app/features/dashboard/widgets/cash-discrepancies/` — shifts with non-zero variance
- Create: `src/app/features/dashboard/widgets/recent-events/` — unified audit timeline (compact)

### Steering Concerns

- Recent voids query MUST use `limit(5)` and `where('status', '==', 'VOID')`.
- Cash discrepancies: Firestore can't filter `where('discrepancy', '!=', 0)` efficiently. Query recent shifts (limit 10) and filter client-side.
- Recent events timeline: 4 parallel queries, each with `limit(5)`. Merge by timestamp. Total ~20 reads. Cache in `DashboardCacheService` (Tier 2).
- All alert widgets must have empty/positive states ("No voids today", "All shifts balanced").

### Review Checkpoint

Before proceeding to Phase F:
- [ ] `ng build` passes
- [ ] All queries have `limit()`
- [ ] Void list shows `voidedBy` and `voidReason`
- [ ] Discrepancy list shows amount + who closed the shift
- [ ] Recent events timeline merges correctly by timestamp
- [ ] Positive states shown when no alerts exist
- [ ] STAFF role does NOT see voids or discrepancies

---

## Phase F: My Performance (Collapsible) + Manager Commendation

**Goal:** Manager's own personal stats + motivational message

### Widgets

- Reuse ALL staff dashboard widgets inside a collapsible `<mat-expansion-panel>`
- Manager-specific commendation messages (new constant list)

### Files to Create/Modify

- Modify: `src/app/features/dashboard/dashboard.html` — add collapsible "My Performance" section
- Create: `src/app/core/constants/manager-commendations.ts` — manager-specific messages

### Steering Concerns

- The collapsible section should be collapsed by default (progressive disclosure per UX guidelines).
- Staff widgets inside the collapsible use the manager's own `uid` — same data, same queries.
- Manager commendations should reference team performance, not just personal: "Your team sold ₱45,000 today."

### Review Checkpoint

Before declaring Phase F complete:
- [ ] `ng build` passes
- [ ] Collapsible section works on all screen sizes
- [ ] Staff widgets inside the section show the manager's own data
- [ ] Manager commendation is different from staff commendation
- [ ] Expanding/collapsing doesn't trigger unnecessary Firestore reads

---

## Phase G: Deep Audit Log Page (Separate Route)

**Goal:** Full investigation page for tracing incidents

### Route: `/audit-log`

### Features

- Date range picker
- Staff filter dropdown
- Event type checkboxes (Sales, Voids, Inventory, Attendance, Shifts)
- Chronological timeline with pagination
- Links to detail pages for each event

### Files to Create

- Create: `src/app/features/audit-log/audit-log.ts` — standalone component
- Create: `src/app/features/audit-log/audit-log.html`
- Create: `src/app/features/audit-log/audit-log.css`
- Modify: `src/app/app.routes.ts` — add `/audit-log` route (ADMIN only)
- Modify: `src/app/app.html` — add sidenav link

### Steering Concerns

- All queries MUST have `limit()`. Default: 50 events per page.
- Use `getDocs` (one-shot), not `collectionData` (listener) — this is a search page, not a live feed.
- Route guard: `roleGuard` with `roles: ['ADMIN']`.
- Pagination: use `startAfter` pattern (existing in the project).

### Review Checkpoint

- [ ] `ng build` passes
- [ ] Route protected by `roleGuard` with ADMIN only
- [ ] All queries have `limit()`
- [ ] Pagination works
- [ ] Filters work independently and in combination
- [ ] Each event links to the correct detail page
- [ ] Empty state: "No events found for this date range"

---

## Execution Rules

1. Each phase is a separate commit
2. After each phase: `ng build` must pass with zero errors
3. Review checkpoint must be verified before proceeding
4. No logic changes to existing services — only new widgets and new read-only queries
5. Every new component: `standalone: true`, `OnPush`, `inject()`, signals for UI state
6. Every Firestore query: `limit()` or `where()` required
7. Every widget: skeleton loader + empty state + role check
8. Colors: Material CSS variables only
9. Spacing: multiples of 8px only
10. Navigation: role-aware (check access before routing)

---

## Relationship to Existing Pages

| Dashboard Widget | Links To (existing page) | New Page? |
|-----------------|------------------------|-----------|
| Today's Gym Revenue | `/store/monthly-sales` | No |
| Monthly Quota Ring | `/store/monthly-sales` | No |
| Staff Leaderboard | `/store/sales-by-user` | No |
| Daily Sales Sparkline | `/reports` | No |
| Payment Split | `/reports` | No |
| Peak Hours | `/reports` | No |
| Top Products | `/store/stats` | No |
| Recent Voids | `/store/history` (filtered) | No |
| Cash Discrepancies | `/store/reports` | No |
| Low Stock | `/store/manage` | No |
| Expiring Members | `/members` (filtered) | No |
| Recent Events | `/audit-log` | **Yes** (Phase G) |
| At-Risk Members | `/members` (filtered) | No |

Only 1 genuinely new page: `/audit-log`. Everything else links to existing pages.
