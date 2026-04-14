# Manager & Admin Dashboard — Brainstorm & Analysis

> Date: April 15, 2026
> Purpose: Design the best possible dashboard for gym managers and owners
> Perspectives: Psychology, Gym Manager POV, Gym Owner POV

---

## The Fundamental Difference: Staff vs Manager/Admin

The staff dashboard answers: "How am I doing?"
The manager dashboard answers: "How is my business doing, and what should I do about it?"

A staff member cares about their own numbers. A manager/owner cares about the whole picture — the team, the customers, the money, the inventory, the trends. They need to see problems before they become crises, spot opportunities before they pass, and know which people (staff and members) need attention.

---

## Three Perspectives

### 1. Psychology — What Drives a Manager/Owner

| Need | What satisfies it | Dashboard equivalent |
|------|------------------|---------------------|
| Control | "I know what's happening right now" | Real-time KPIs, shift status, who's in the gym |
| Confidence | "We're on track this month" | Quota progress, trend lines, month-over-month growth |
| Trust | "My team is performing well" | Staff leaderboard, activity tracking, shift variance |
| Alertness | "Nothing is falling through the cracks" | Expiring memberships, low stock, cash discrepancies |
| Pride | "Look how far we've come" | Revenue milestones, member growth, year-over-year |
| Connection | "I know my members and my team" | Top members, staff highlights, personal bests |

A manager who opens the dashboard and sees green across the board feels calm and confident. One who sees a red flag (cash discrepancy, expired memberships, low stock) feels urgency — but the dashboard gives them the tool to act immediately.

### 2. Gym Manager POV — Daily Operations

A gym manager thinks in shifts and days. Their mental model:

- "Did we hit our daily target?"
- "Who's working today and how are they doing?"
- "How many members came in? Is it a slow day?"
- "Is the register balanced? Any discrepancies?"
- "Do we need to restock anything?"
- "Are there members whose subscriptions are expiring soon?"
- "Did anything unusual happen? (voids, large expenses)"

They need operational intelligence — things they can act on TODAY.

### 3. Gym Owner POV — Business Health

A gym owner thinks in months and quarters. Their mental model:

- "Are we making more money than last month?"
- "Is membership growing or shrinking?"
- "Which staff members are my top performers?"
- "What products are driving revenue?"
- "Are we losing members? Why?"
- "What's our cash position?"
- "Is the business trending up or down?"

They need strategic intelligence — trends, comparisons, and the big picture.

---

## Should Managers/Admins Also Have Personal Stats?

**Yes, absolutely.** A manager who also processes sales and checks in members should see their own performance too. But it should be secondary — a collapsible "My Performance" section below the business overview.

The hierarchy should be:
1. Business health (the gym's numbers)
2. Team performance (staff overview)
3. Customer health (member insights)
4. Operational alerts (things that need attention)
5. My own performance (personal stats, same as staff dashboard)

---

## What Data We Can Already Provide (Existing System)

### A. Financial Overview

| Metric | Source | Query |
|--------|--------|-------|
| Today's total revenue (all staff) | `daily_sales/{today}` | 1 doc read |
| Monthly revenue | `ReportStateService.getMonthlyReport()` | Cached |
| Monthly quota progress | `SettingsService.getSettings()` + monthly report | Cached |
| Revenue by payment method (CASH vs GCASH) | `transactions` filtered by date + payment method | Aggregation |
| Today's transaction count | `transactions` filtered by today | Aggregation |
| Average transaction value | Derived: total / count | Computed |
| Revenue vs last month | `TransactionService.getSalesTotal()` × 2 | 2 aggregations |
| Revenue vs last week | Same pattern | 2 aggregations |
| Daily sales trend (chart) | `daily_sales` collection for the month | ~30 doc reads |

### B. Staff Performance

| Metric | Source | Query |
|--------|--------|-------|
| Sales per staff (today) | `transactions` grouped by `staffId` | 1 query, client-side group |
| Sales per staff (this month) | `ReportStateService.getUserSalesReport()` per staff | N queries (1 per staff) |
| Staff leaderboard (ranked by sales) | `ReportsService.getSalesAnalytics().staffPerformance` | Already computed |
| Check-ins per staff (today) | `attendance` grouped by `checkedInBy.uid` | 1 query, client-side group |
| Staff activity streaks | `StaffActivityService.getStreak()` per staff | N queries |
| Staff personal bests | `staff_records/{uid}` per staff | N doc reads |
| Who opened today's shift | `CashRegisterService.currentShift$.openedBy` | In memory |
| Shift variance history | `shifts` collection | Already available |

### C. Member/Customer Insights

| Metric | Source | Query |
|--------|--------|-------|
| Total active members | `members` filtered by status='Active' | Client-side filter on cached list |
| Members currently in the gym | `AttendanceService.getActiveCheckIns()` | Real-time listener |
| Today's check-in count | `attendance` filtered by today's date | 1 query |
| Memberships expiring this week | `members` filtered by `membershipExpiration` in next 7 days | Client-side filter |
| Memberships expired (need renewal) | `members` where expiration < today | Client-side filter |
| Top attendees this month | `ReportsService.getTopAttendees()` | Already computed |
| New members this month | `members` filtered by `createdBy.timestamp` in current month | Client-side filter |
| Walk-in vs subscriber ratio | `transactions` where `memberName = 'Walk-in'` vs named | Client-side filter |

### D. Inventory & Operations

| Metric | Source | Query |
|--------|--------|-------|
| Low stock products | `ProductService.getProducts()` filtered by stock < minStockLevel | Client-side, cached |
| Out of stock products | Same, stock = 0 | Client-side |
| Top selling products (this month) | `TransactionService.getSalesAnalytics()` | Already computed |
| Current shift status | `CashRegisterService.currentShift$` | In memory |
| Today's expenses | Current shift's `totalExpenses` | In memory |
| Cash in drawer | Current shift's `expectedClosingBalance` | In memory |
| Recent voids | `transactions` where status='VOID', limit 5 | 1 query |
| Shift discrepancy history | `shifts` where discrepancy != 0 | 1 query |

### E. Attendance Patterns

| Metric | Source | Query |
|--------|--------|-------|
| Daily volume trend (chart) | `ReportsService.getVolumeAnalytics()` | Already computed |
| Peak hours | Same service | Already computed |
| Hourly traffic today | `attendance` filtered by today, grouped by hour | Client-side |
| Gender breakdown | `attendance` grouped by `memberGender` | Client-side |

---

## What New Data We Should Add

### F1. Member Retention Metrics (NEW)

Currently we track when members expire but not when they leave. Adding:

| Metric | New data needed | Why it matters |
|--------|----------------|---------------|
| Churn rate | Track `membershipStatus` changes over time | "Are we losing members faster than gaining them?" |
| Retention rate | `(active members at end of month / active at start) × 100` | The #1 health metric for any gym |
| Days since last visit per member | Derived from `attendance` | "Which members haven't come in 2+ weeks?" — they're at risk of canceling |
| Renewal rate | Track renewals vs expirations | "What % of expiring members actually renew?" |

**Implementation:** A `member_snapshots/{YYYY-MM}` collection that stores monthly member counts (total, active, new, churned). Written by a Cloud Function on the 1st of each month. 1 doc per month. Minimal cost.

### F2. Revenue Benchmarks (NEW)

| Metric | New data needed | Why it matters |
|--------|----------------|---------------|
| Month-over-month growth % | Derived from `daily_sales` (2 months) | "Are we growing?" |
| Best day ever (gym-wide) | `gym_records` doc (like staff_records but for the gym) | Celebration + benchmark |
| Revenue per member | `monthly revenue / active members` | "Is each member worth more or less over time?" |
| Revenue by category | `transactions.items` grouped by product category | "Are supplements or training driving revenue?" |

**Implementation:** `gym_records` single document, updated lazily on dashboard load (same pattern as `staff_records`). Revenue by category derived from existing transaction data.

### F3. Staff Accountability (NEW)

| Metric | New data needed | Why it matters |
|--------|----------------|---------------|
| Void frequency per staff | `transactions` where `voidedBy` grouped by staff | "Is someone voiding too many transactions?" |
| Cash discrepancy per staff | `shifts` where `closedBy` + `discrepancy` | "Who consistently has cash shortages?" |
| Average shift duration | `shifts` grouped by `openedBy` | "Who's working the longest shifts?" |

**Implementation:** All derivable from existing data. No new collections needed.

### F4. Peek at Staff Dashboards (NEW)

| Feature | Why it matters |
|---------|---------------|
| View any staff member's personal dashboard | "I want to see Juan's numbers so I can praise him" |
| Staff spotlight: auto-highlight the top performer today | "Who should I recognize today?" |

**Implementation:** The staff dashboard widgets already exist. Add a staff selector dropdown that loads another user's data. The queries already support `staffId` filtering.

---

## Proposed Dashboard Layout for Manager/Admin

### Section 1: Business Pulse (Hero Row)

The first thing the manager sees. Answers: "How are we doing right now?"

| Widget | Data | Existing? |
|--------|------|-----------|
| Today's Gym Revenue | `daily_sales/{today}` total (all staff) | ✅ Yes |
| Monthly Quota Progress Ring | Same as staff dashboard but gym-wide (already is) | ✅ Yes |
| Members in Gym Right Now | `AttendanceService.getActiveCheckIns().length` | ✅ Yes |
| Shift Status | Current shift info (who opened, how long, cash in drawer) | ✅ Yes |

### Section 2: Trends & Comparisons

Answers: "Are we trending up or down?"

| Widget | Data | Existing? |
|--------|------|-----------|
| Daily Sales Chart (this month) | `daily_sales` collection, 30 docs | ✅ Yes |
| Month-over-Month Revenue | 2 aggregations | ✅ Yes |
| Week-over-Week Revenue | 2 aggregations | ✅ Yes |
| Revenue by Payment Method | Pie/donut: CASH vs GCASH | ✅ Derivable |

### Section 3: Team Performance

Answers: "How is my team doing?"

| Widget | Data | Existing? |
|--------|------|-----------|
| Staff Leaderboard (today) | `transactions` grouped by `staffId` | ✅ Yes |
| Staff Spotlight ("Star of the Day") | Highest sales today, auto-selected | ✅ Derivable |
| View Staff Dashboard (dropdown) | Reuse staff dashboard widgets with different uid | ✅ Widgets exist |
| Staff Targets vs Actual | `users.monthlyTarget` vs `getSalesTotal(staffId)` | ✅ Yes |

### Section 4: Customer Health

Answers: "How are our members doing?"

| Widget | Data | Existing? |
|--------|------|-----------|
| Active Members Count | `members` filtered by status | ✅ Yes |
| Expiring This Week | `members` where expiration in next 7 days | ✅ Derivable |
| At-Risk Members (no visit in 14+ days) | `attendance` + `members` cross-reference | ⚠️ New query |
| New Members This Month | `members` filtered by `createdBy.timestamp` | ✅ Derivable |
| Today's Check-in Count | `attendance` filtered by today | ✅ Yes |

### Section 5: Operational Alerts

Answers: "What needs my attention right now?"

| Widget | Data | Existing? |
|--------|------|-----------|
| Low Stock Alerts | Same as staff dashboard | ✅ Yes |
| Recent Voids | `transactions` where status='VOID', limit 5 | ✅ Yes |
| Cash Discrepancies (last 7 shifts) | `shifts` where discrepancy != 0 | ✅ Yes |
| Expiring Memberships (urgent) | Members expiring in next 3 days | ✅ Derivable |

### Section 6: My Performance (Collapsible)

Same as the staff dashboard — the manager's own sales, check-ins, streak, personal bests. Collapsed by default. Expandable.

### Section 7: Commendation + Motivation

Same commendation widget as staff dashboard, but with manager-specific messages:
- "Your team sold ₱45,000 today. That's leadership in action."
- "3 staff members hit their targets this month. You built that team."
- "The gym had 120 check-ins today. Your members love this place."

---

## Psychological Design Principles for Manager Dashboard

### 1. Control without micromanagement

Show team performance as a leaderboard, not a surveillance tool. The tone is "celebrate the top" not "punish the bottom." Never show a staff member's name in red. The lowest performer is simply not highlighted — they're not shamed.

### 2. Problems as opportunities

"3 memberships expiring this week" is not a warning — it's an opportunity: "3 members to call and retain." The wording should always frame alerts as actions the manager can take, not problems they failed to prevent.

### 3. The owner's pride moment

Include a "Gym Records" section: "Best day ever: ₱28,000 (March 15, 2026)." Owners love seeing their business hit milestones. It validates their investment.

### 4. Staff recognition built in

The "Staff Spotlight" widget automatically highlights the top performer. The manager doesn't have to look for it — the dashboard surfaces it. This makes it easy to walk over and say "Great job today, Juan." Recognition costs nothing but means everything.

### 5. Progressive disclosure

Don't show everything at once. The hero row (4 KPIs) is always visible. Trends, team, customers, and alerts are in expandable sections. The manager can drill down when they want depth, but the surface is clean.

---

## Investigation & Audit Trail

### The Problem

Right now, if a manager needs to investigate "what happened last Tuesday evening" — maybe a cash discrepancy, a suspicious void, or a member complaint — they have to check 4+ separate pages:
- Transaction History (for sales/voids)
- Shift History (for cash discrepancies)
- Stock Movement (for inventory changes)
- Attendance (for check-in/check-out records)

There's no single place to see "everything that happened" in chronological order. This is a real operational gap.

### What the System Already Tracks (Audit Data)

| Collection | What it records | Who did it | When |
|-----------|----------------|-----------|------|
| `transactions` | Sales, voids | `staffId`, `staffName`, `voidedBy` | `date`, `voidedAt` |
| `shifts` | Open/close, cash movements, expenses | `openedBy`, `closedBy`, `CashTransaction.performedBy` | `startTime`, `endTime`, `CashTransaction.timestamp` |
| `inventory_logs` | Stock changes (sale, restock, consumption, audit) | `staffId`, `staffName`, `performedBy` | `timestamp` |
| `attendance` | Check-in, check-out | `checkedInBy.uid`, `checkedOutBy.uid` | `checkInTime`, `checkOutTime` |
| `members` | Profile changes | `createdBy`, `lastModifiedBy` | `createdBy.timestamp`, `lastModifiedBy.timestamp` |
| `products` | Product changes | `lastModifiedBy` | `lastModifiedBy.timestamp` |

### What the Dashboard Should Provide

**A. Quick Investigation Panel (on dashboard)**

A compact "Recent Events" widget showing the last 10 notable events across ALL collections, merged into one timeline:

```
⚠️ VOID — Protein Shake sale voided by Juan (reason: "wrong item") — 3:42 PM
💰 SALE — ₱450 by Maria (2x Energy Drink, Gloves) — 3:15 PM
📦 RESTOCK — 50x Protein Shake added by Carlos — 2:30 PM
🔴 DISCREPANCY — Shift closed by Juan, ₱-150 shortage — 1:00 PM
👋 CHECK-IN — Pedro checked in by Maria (Locker 5) — 12:45 PM
```

This gives the manager a "what just happened" view without leaving the dashboard. Tapping any event navigates to the relevant detail page.

**Filter by:** Date range, staff member, event type (sales, voids, inventory, attendance, shifts)

**B. Deep Investigation Page (separate route, linked from dashboard)**

A full `/audit-log` page with:
- Date range picker
- Staff filter dropdown
- Event type filter (checkboxes: Sales, Voids, Inventory, Attendance, Shifts)
- Searchable timeline
- Export to CSV (future)

This is NOT on the dashboard — it's a dedicated page for when the manager needs to dig deep. The dashboard widget is the entry point.

### What's New vs Existing

| Feature | Existing? | Notes |
|---------|-----------|-------|
| Transaction history | ✅ `/store/history` | Sales + voids, filterable |
| Shift history | ✅ `/store/reports` | Shift list with drill-down |
| Stock movement | ✅ `/store/inventory-history` | Inventory logs |
| Attendance history | ✅ `/attendance` (date-based) | Check-in/out records |
| **Unified timeline** | ❌ NEW | Merges all of the above into one chronological view |
| **Dashboard "Recent Events" widget** | ❌ NEW | Compact version for the dashboard |

### Implementation

The unified timeline doesn't need a new Firestore collection. It queries the existing collections in parallel (same pattern as the Activity Feed widget), merges the results by timestamp, and displays them in a single list. The Firestore cost is ~20-30 reads (5 per collection × 4-6 collections).

---

## Relationship to Existing Reports

### The Existing Reports Page (`/reports`)

The system already has a full reports dashboard at `/reports` (ADMIN only) with:

| Component | What it shows | Data source |
|-----------|--------------|-------------|
| `VolumeChartComponent` | Daily gym visitor volume + peak hours chart | `ReportsService.getVolumeAnalytics()` |
| `SalesPerformanceComponent` | Daily sales trend chart | `ReportsService.getSalesAnalytics().dailySales` |
| `StaffSalesComponent` | Staff performance breakdown (bar chart) | `ReportsService.getSalesAnalytics().staffPerformance` |
| `ProductBreakdownComponent` | Product sales by quantity/revenue | `ReportsService.getSalesAnalytics().topProducts` |
| `MemberAttendanceComponent` | Top 10 attendees | `ReportsService.getTopAttendees()` |

It also has a date range picker (start/end) for custom analysis.

### Other Existing Report Pages

| Page | Route | What it shows |
|------|-------|--------------|
| Monthly Sales | `/store/monthly-sales` | Day-by-day sales table for a month, with recalculate |
| Sales by User | `/store/sales-by-user` | Individual staff transaction list for a month |
| Cash Reports | `/store/reports` | Shift history with drill-down details |
| Transaction History | `/store/history` | Filterable transaction list |
| Stock Movement | `/store/inventory-history` | Inventory log timeline |
| Sales Analytics | `/store/stats` | Top/low products, revenue summary |

### The Dashboard vs Reports Relationship

The manager dashboard should NOT duplicate the reports page. Instead:

| Dashboard widget | What it shows | Links to |
|-----------------|--------------|---------|
| Today's Gym Revenue | Single number: ₱X today | → `/store/monthly-sales` |
| Monthly Quota Ring | Progress % | → `/store/monthly-sales` |
| Daily Sales Sparkline | Mini chart (no axis labels, just shape) | → `/reports` (full chart) |
| Staff Leaderboard | Top 5 staff by sales today | → `/store/sales-by-user` |
| Revenue by Payment | Mini donut: CASH vs GCASH | → `/reports` (full breakdown) |
| Peak Hours | "Busiest: 5-6 PM" (text only) | → `/reports` (full volume chart) |
| Top Products | Top 3 names + quantities | → `/store/stats` (full analytics) |
| Recent Voids | Last 3 voids (compact) | → `/store/history` (filtered) |
| Cash Discrepancies | Last 3 shifts with variance | → `/store/reports` (shift history) |
| Expiring Memberships | Count + "View list" link | → `/members` (filtered) |

**The principle:** The dashboard shows the headline. The existing pages show the detail. Every dashboard widget is a doorway to a deeper page that already exists.

**What's genuinely new (not in any existing page):**
- Unified audit timeline (merges 4+ collections)
- Staff Spotlight (auto-highlight top performer)
- At-risk members (no visit in 14+ days)
- Members in gym right now (real-time count)
- Manager-specific commendations
- "My Performance" collapsible section (reuses staff widgets)

Everything else is a compact summary of data that already has a dedicated page.

---

## Data We Can Provide Now vs Need to Add

### Available Now (zero new collections)

- Today's gym revenue, monthly quota, quota progress
- Daily sales chart, month/week comparisons
- Staff leaderboard, staff sales by user
- Members in gym, today's check-ins, active member count
- Low stock alerts, shift status, cash in drawer
- Recent voids, shift discrepancy history
- Top products, top attendees, peak hours
- Staff personal bests, activity streaks
- All staff dashboard widgets (reusable with different uid)

### Need to Add (new data)

| New Data | Collection/Field | Effort | Priority |
|----------|-----------------|--------|----------|
| Unified audit timeline widget | Parallel queries to 4+ existing collections, merged | Medium (no new data, new UI) | High |
| At-risk members (no visit 14+ days) | Derived from `attendance` + `members` | Client-side cross-ref | High |
| Member retention snapshots | `member_snapshots/{YYYY-MM}` | Cloud Function (monthly) | Medium |
| Gym-wide records (best day, etc.) | `gym_records` (single doc) | 1 doc, lazy update | Medium |
| Revenue by product category | Derived from `transactions.items` | Client-side aggregation | Medium |
| Deep audit log page (`/audit-log`) | Queries existing collections with filters | Medium (new page, no new data) | Medium |
| Void frequency per staff | Derived from `transactions` | Client-side aggregation | Low |
| Cash discrepancy per staff | Derived from `shifts` | Client-side aggregation | Low |

Most of the manager dashboard can be built with existing data. The "At-Risk Members" widget is the highest-priority new feature because it directly drives retention — the #1 metric for gym profitability.

---

## Recommended Implementation Order

### Phase A: Business Pulse (existing data)
- Today's Gym Revenue (all staff combined)
- Monthly Quota Ring (gym-wide, already exists in toolbar)
- Members in Gym Right Now
- Shift Status (expanded version of toolbar widget)

### Phase B: Team Performance (existing data)
- Staff Leaderboard (today + this month)
- Staff Spotlight (auto-highlight top performer)
- Staff Targets vs Actual table

### Phase C: Customer Health (mostly existing data)
- Active/Inactive member counts
- Expiring memberships (this week)
- At-risk members (no visit 14+ days) — NEW QUERY
- New members this month

### Phase D: Trends & Charts (existing data)
- Daily sales chart (this month)
- Month-over-month comparison
- Revenue by payment method
- Peak hours today

### Phase E: Operational Alerts & Investigation (existing data + new UI)
- Low stock (reuse staff widget)
- Recent voids
- Cash discrepancies
- Shift duration alerts
- Recent Events timeline widget (unified audit trail — compact, on dashboard)

### Phase F: Advanced (new data + new pages)
- Deep audit log page (`/audit-log`) with filters and search
- Member retention rate (monthly snapshots)
- Gym-wide records (best day ever)
- Revenue by product category
- View any staff member's dashboard

---

## Key Question: Same Page or Separate Page?

**Recommendation: Same `/dashboard` route, role-adaptive layout.**

When ADMIN/MANAGER logs in, the dashboard shows the business-focused layout. When STAFF logs in, it shows the personal layout. The route is the same — the content adapts based on `authService.userProfile().roles`.

This avoids:
- Two separate dashboard components to maintain
- Confusion about which page to visit
- The manager having to navigate to a different URL

The staff widgets (Today's Sales, Streak, etc.) are reusable components. The manager dashboard imports them into a "My Performance" collapsible section at the bottom.

---

## Next Steps

1. Review this brainstorm
2. Decide which sections to prioritize
3. Create phased spec documents (same approach as staff dashboard)
4. Implement phase by phase
