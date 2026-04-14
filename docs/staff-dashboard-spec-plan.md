# Staff Personal Dashboard — Spec Plan

> Date: April 14, 2026
> Goal: Create a personal home page for each logged-in staff that encourages, reminds, and motivates
> Approach: Deep-dive analysis per widget, phased delivery

---

## Guiding Principles

1. Every widget must answer: "Why should the staff care about this number?"
2. Words matter — the tone should be warm, encouraging, never punitive
3. Empty states must motivate action, not feel like failure
4. The dashboard must feel personal — "This is MY page, MY numbers"
5. Mobile-first — the most common use case is a staff member glancing at their phone between tasks

---

## Phase Structure

Each phase below is a self-contained analysis document. I will produce one `.md` file per phase. Each analysis will cover:

- **Goal** — What psychological need does this widget serve?
- **Data source** — Exact Firestore queries, read cost, existing vs new
- **Refresh tier** — Always fresh (Tier 1), session-cached (Tier 2), or already cached (Tier 3)
- **Copy/Wording** — The exact text, labels, empty states, and tone
- **Visual design** — Layout, colors, sizing, iconography for desktop/tablet/mobile
- **Interactions** — What happens on tap/click, animations, transitions
- **Role visibility** — Which roles see this widget (ADMIN/MANAGER/STAFF/TRAINER)
- **Edge cases** — First day on the job, zero sales, midnight rollover, no shift open

---

## Phase 1: Dashboard Shell & Layout Grid

**What this covers:**
- The overall page structure — how widgets are arranged on desktop (3-column), tablet (2-column), mobile (single-column stacked)
- The greeting header ("Good morning, Juan")
- Time-of-day awareness (morning/afternoon/evening greeting)
- The scroll behavior — which widgets are "above the fold" on each screen size
- The route setup (`/dashboard` as default after login)
- The skeleton loading state while data loads
- Role-based widget visibility matrix (which roles see which widgets)

**Why this must come first:** Every subsequent phase places a widget into this grid. Without the shell, we can't reason about sizing, priority, or mobile stacking order.

---

## Phase 2: Today's Sales Card

**Refresh tier: 1 — Always Fresh**

**What this covers:**
- The hero metric — today's revenue attributed to this staff
- Transaction count and average ticket size
- Real-time feel — does it update live or on page load?
- The comparison line: "↑ 15% vs yesterday" or "Your first sale today will show here"
- GCASH vs CASH split (mini donut or simple text?)
- Empty state for zero sales (encouraging, not shaming)
- Firestore query: `getAggregateFromServer` with `staffId` + today's date range

---

## Phase 3: Monthly Progress Ring

**Refresh tier: 3 — Already Cached (via ReportStateService)**

**What this covers:**
- Circular progress indicator showing contribution to gym monthly quota
- The math: `staffMonthlyTotal / gymMonthlyQuota * 100`
- Whether to show absolute (₱32,000) or relative (32% of gym target) or both
- The daily micro-target: "₱2,250 more today to stay on track"
- Color transitions as progress increases (red → orange → yellow → green)
- What happens when quota is met (celebration state)
- Comparison with personal target (Phase 2 of "To Add" — Goal Setting) — how the ring adapts when personal targets exist

---

## Phase 4: You vs Last Month

**Refresh tier: 2 — Session-Cached (invalidate on midnight)**

**What this covers:**
- Side-by-side or overlay comparison of current month vs previous month
- The metric: total sales, transaction count, or both?
- Trend direction indicator (arrow up/down + percentage)
- Wording: "You're ₱5,200 ahead of where you were last month" vs "₱3,100 behind — 8 days left to catch up"
- How to handle the first month (no previous data)
- Mini sparkline chart (7-day rolling average) or just numbers?

---

## Phase 5: Week-over-Week Trend

**Refresh tier: 2 — Session-Cached (invalidate on midnight)**

**What this covers:**
- This week's total vs last week's total
- The trend arrow (↑ green / ↓ red / → neutral)
- Percentage change calculation
- Wording: "This week: ₱8,400 — up 12% from last week"
- How this differs from "You vs Last Month" (weekly cadence = more immediate feedback)
- Whether to show a mini bar chart (Mon-Sun) or just the summary number

---

## Phase 6: Members You Checked In Today

**Refresh tier: 1 — Always Fresh**

**What this covers:**
- Count of members checked in by this staff today
- Optional: list of names (last 5) with timestamps
- The motivational angle: "You've welcomed 12 members today"
- Role relevance: most useful for STAFF and TRAINER, less for ADMIN
- Firestore query: `attendance` where `checkedInBy.uid == uid` and `date == today`
- Composite index requirement check

---

## Phase 7: Your Top Product

**Refresh tier: 2 — Session-Cached (invalidate on midnight)**

**What this covers:**
- The product this staff sells the most (by quantity) this month
- Display: product name, icon/image, quantity sold, revenue generated
- Wording: "Your bestseller this month: Protein Shake (47 sold, ₱7,050)"
- What if they only sell one product? What if they sell nothing?
- Whether to show top 3 or just #1
- The identity angle: "You're the go-to person for Supplements"

---

## Phase 8: Commendation of the Day

**Refresh tier: 2 — Session-Cached (fixed for the day)**

**What this covers:**
- Daily rotating motivational message
- Whether it's random or performance-tied (different messages for high/low days)
- The existing `getRandomCommendation()` system — extend or replace?
- Visual treatment: quote card, subtle background, icon
- Whether it changes on each page load or stays fixed for the day
- Tone calibration: encouraging without being cheesy

---

## Phase 9: Contextual Badges ("First to Open", Shift Status)

**Refresh tier: 1 — Always Fresh (shift status is live via BehaviorSubject)**

**What this covers:**
- "First to Open" — shown if the current shift's `openedBy` matches the logged-in user
- Shift status reminder — is the register open? How long? Who opened it?
- "Reminder: Shift open for 8 hours" nudge
- Badge visual design — small pill/chip near the greeting or in a dedicated row
- Future-proofing: how this evolves into a full badge system (Phase 2 of "To Add")

---

## Phase 10: Low Stock Alerts (Role-Dependent)

**Refresh tier: 3 — Already Cached (via ProductService shared stream)**

**What this covers:**
- Products where `stock < minStockLevel`
- Only visible to ADMIN and MANAGER roles
- Count badge: "3 products need restocking"
- Tap to navigate to Product Management
- Whether this belongs on the dashboard or just in the sidenav badge
- Firestore query: `products` where `stock < minStockLevel` (needs client-side filter since Firestore can't compare two fields)

---

## Phase 11: Recent Activity Feed

**Refresh tier: 1 — Always Fresh**

**What this covers:**
- Last 5 actions by this staff (sales, check-ins, shift operations)
- Unified feed from multiple collections or per-collection sections?
- Timestamp formatting: "2 min ago", "1 hour ago"
- Wording: "You sold Protein Shake to Juan — ₱150"
- Tap to navigate to the relevant detail page
- Firestore cost: multiple queries (transactions + attendance) limited to 5 each

---

## Phase 12: Personal Bests / Records (NEW DATA)

**Refresh tier: 2 — Session-Cached (invalidate when a record is broken during the session)**

**What this covers:**
- New `staff_records/{uid}` Firestore document
- Fields: `highestDailySales`, `mostTransactionsInDay`, `highestSingleTransaction`, `mostCheckInsInDay`, each with `value` + `date`
- When to update: atomically during checkout/check-in if new value > stored value
- Dashboard display: "🏆 Personal Best: ₱12,450 in one day (Oct 15)"
- Celebration moment: toast/animation when a record is broken during the session
- How to handle first-time users (no records yet)

---

## Phase 13: Per-Staff Goal Setting (NEW DATA)

**Refresh tier: 3 — Already Cached (single doc read, cached in service)**

**What this covers:**
- New `staff_targets` collection or field on `users/{uid}`
- Who sets the target: self-set vs admin-set vs both?
- Target types: monthly sales target, daily check-in target
- How the Monthly Progress Ring (Phase 3) adapts when a personal target exists
- Admin UI for setting team targets
- The motivational difference: gym quota = team obligation, personal target = self-improvement

---

## Phase 14: Active Days Streak (NEW DATA)

**Refresh tier: 2 — Session-Cached (invalidate on midnight)**

**What this covers:**
- New `staff_activity/{uid}_{date}` collection
- What counts as "active": login? first transaction? first check-in?
- Streak calculation: consecutive days with activity
- Display: "🔥 7-day streak" with flame icon
- What breaks the streak: weekends? holidays? only working days?
- The habit-formation angle: streaks are one of the most powerful motivators in app design

---

## Delivery Order

| Order | Phase | Refresh Tier | New Data? | Depends On |
|-------|-------|-------------|-----------|------------|
| 1 | Phase 1: Shell & Layout + DashboardCacheService | — | No | Nothing |
| 2 | Phase 2: Today's Sales | Tier 1 (always) | No | Phase 1 |
| 3 | Phase 3: Monthly Progress Ring | Tier 3 (existing) | No | Phase 1 |
| 4 | Phase 6: Members Checked In | Tier 1 (always) | No | Phase 1 |
| 5 | Phase 8: Commendation | Tier 2 (session) | No | Phase 1 |
| 6 | Phase 9: Badges & Shift Status | Tier 1 (live) | No | Phase 1 |
| 7 | Phase 4: You vs Last Month | Tier 2 (session) | No | Phase 2 |
| 8 | Phase 5: Week-over-Week | Tier 2 (session) | No | Phase 2 |
| 9 | Phase 7: Your Top Product | Tier 2 (session) | No | Phase 2 |
| 10 | Phase 10: Low Stock Alerts | Tier 3 (existing) | No | Phase 1 |
| 11 | Phase 11: Activity Feed | Tier 1 (always) | No | Phase 1 |
| 12 | Phase 12: Personal Bests | Tier 2 (session) | Yes | Phase 2 |
| 13 | Phase 13: Goal Setting | Tier 3 (existing) | Yes | Phase 3 |
| 14 | Phase 14: Active Streak | Tier 2 (session) | Yes | Phase 9 |

Phases 1-11 use existing data only. Phases 12-14 require new Firestore collections.

---

## Next Step

I will produce the Phase 1 analysis document when you're ready. Each subsequent phase will be a focused deep-dive following the template above (Goal, Data, Copy, Design, Interactions, Roles, Edge Cases).
