# Phase 11: Recent Activity Feed

> Part of: Staff Personal Dashboard Spec
> Focus: Last 5 actions by this staff — sales and check-ins in a unified timeline

---

## 1. Goal

**Psychological driver:** Momentum and narrative.

Every other widget shows a summary — a number, a percentage, a trend. This widget shows the story. It's a chronological list of what the staff actually did: "You sold Protein Shake to Juan," "You checked in Maria." Reading your own activity feed creates a sense of momentum — "I've been busy, I'm making things happen."

It also serves as a quick reference: "What was my last sale?" without navigating to Transaction History.

This is the last widget on the dashboard (bottom of the scroll). It rewards the staff for scrolling all the way down with a personal narrative of their shift.

---

## 2. Data Source

### Two parallel queries, merged into one timeline

**Sales query:**
```typescript
transactionService.getTransactions({
    staffId: uid,
    limit: 5
})
```

Returns the 5 most recent transactions by this staff (any date, not just today). Uses `collectionData` — a real-time listener that returns documents ordered by `date` descending.

**Firestore cost:** 1-5 document reads per visit.

**Check-in query:**
```typescript
// AttendanceService — new method needed (same as Phase 6)
attendanceService.getCheckInsByStaff(uid, todayStr, 5)
```

Returns the 5 most recent check-ins by this staff today. Uses `getDocs` — one-shot read.

**Firestore cost:** 1-5 document reads per visit.

### Merge and sort

```typescript
interface ActivityItem {
    type: 'sale' | 'checkin';
    timestamp: Date;
    description: string;
    amount?: number;        // Only for sales
    memberName?: string;    // For both
    icon: string;           // Material icon name
}

// Merge both lists, sort by timestamp descending, take top 5
const merged = [...salesItems, ...checkinItems]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 5);
```

### Total Firestore cost

| Data | Cost |
|------|------|
| Recent transactions (limit 5) | 1-5 reads |
| Recent check-ins (limit 5) | 1-5 reads |
| **Total** | **2-10 reads per visit** |

---

## 3. Refresh Behavior & Caching Tier

**Tier: 1 — Always Fresh**

The activity feed is the staff's most recent actions. They expect to see their latest sale or check-in immediately after returning to the dashboard.

| Trigger | Behavior |
|---------|----------|
| Navigate to dashboard | Fetch both queries (2-10 reads). Merge and display. |
| Navigate away and back | Re-fetch. Component destroyed and re-created. |
| After a sale or check-in | Next dashboard visit shows the new action at the top. |

**Why not use the transactions `collectionData` listener for live updates?** The `getTransactions` method returns a `collectionData` Observable (real-time listener). If we subscribe to it, the feed would update live when a sale happens — even if the staff is on the dashboard. This sounds nice but:
- The staff is rarely on the dashboard when a sale happens (they're on the POS page)
- The listener costs 1 read per document per change — if another staff member makes a sale, the listener re-fires for all 5 docs
- The check-in query is one-shot (`getDocs`), so the feed would be half-live, half-stale — inconsistent

**Decision:** Use `firstValueFrom` to snapshot the transactions query (one-shot, not a listener). Both data sources are then consistent one-shot reads. Fresh on every visit, no live updates.

---

## 4. Copy & Wording

### Card title

"Recent Activity"

Not "Activity Feed" (too social-media) or "Your Actions" (too formal). "Recent Activity" is neutral and clear.

### Activity item format

**Sale:**
```
💰 Sold {productSummary} to {memberName} — ₱{amount}
   {relativeTime}
```

Examples:
- "💰 Sold Protein Shake to Juan — ₱150.00" / "5 min ago"
- "💰 Sold 2x Energy Drink, Boxing Gloves to Maria — ₱450.00" / "1 hour ago"
- "💰 Sold Walk-in Pass to Walk-in — ₱100.00" / "3 hours ago"

**Check-in:**
```
👋 Checked in {memberName}
   {relativeTime}
```

Examples:
- "👋 Checked in Maria" / "2 min ago"
- "👋 Checked in Carlos" / "45 min ago"

### Product summary for sales

Use the same pattern as the shift transaction `productsSummary`:
- 1 item: "Protein Shake"
- 2+ items: "Protein Shake, Energy Drink" (comma-separated)
- Same item ×2: "2x Protein Shake"

Derive from `transaction.items`:
```typescript
const summary = tx.items
    .map(i => i.quantity > 1 ? `${i.quantity}x ${i.productName}` : i.productName)
    .join(', ');
```

### Relative time formatting

| Duration | Display |
|----------|---------|
| < 1 minute | "Just now" |
| 1-59 minutes | "{m} min ago" |
| 1-23 hours | "{h} hour(s) ago" |
| 1-6 days | "{d} day(s) ago" |
| 7+ days | Date string: "Apr 8" |

Use a simple utility function — no external library needed:

```typescript
function getRelativeTime(date: Date): string {
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
```

---

## 5. Empty State

When the staff has zero transactions AND zero check-ins:

- Icon: `history` (Material icon, muted)
- Text: "Your activity will appear here as you work"
- Subtext: "Sales and check-ins show up in real time"

Tone: Anticipatory. The feed is waiting to be filled.

---

## 6. Visual Design

### Card structure

```
┌──────────────────────────────────────┐
│  🕐  Recent Activity                 │
│                                      │
│  💰 Sold Protein Shake to Juan       │
│     ₱150.00 · 5 min ago             │
│  ─────────────────────────────────── │
│  👋 Checked in Maria                 │
│     2 min ago                        │
│  ─────────────────────────────────── │
│  💰 Sold 2x Energy Drink to Carlos  │
│     ₱300.00 · 1 hour ago            │
│  ─────────────────────────────────── │
│  👋 Checked in Ana                   │
│     3 hours ago                      │
│  ─────────────────────────────────── │
│  💰 Sold Boxing Gloves to Walk-in   │
│     ₱850.00 · Yesterday             │
└──────────────────────────────────────┘
```

### Item layout

Each activity item is a two-line row:
- Line 1: Icon + description (bold product/member name)
- Line 2: Amount (sales only) + relative time (muted, right-aligned or after a dot separator)

Rows separated by a thin divider (`1px solid var(--mat-sys-outline-variant)`).

### Sizing

| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Card | Full width (grid-column: 1 / -1) | Full width | Full width |
| Description text | 14px, 400 weight | 14px | 13px |
| Product/member name within description | 14px, 500 weight (semi-bold) | 14px | 13px |
| Amount | 14px, 600 weight | 13px | 13px |
| Relative time | 12px, 400 weight | 12px | 11px |
| Icon (emoji or Material) | 16px | 16px | 14px |
| Row padding | 12px 0 | 12px 0 | 10px 0 |
| Card padding | 24px | 24px | 16px |
| Card min-height | 200px | 180px | 160px |

### Colors

- Description text: `var(--mat-sys-on-surface)`
- Product/member name: `var(--mat-sys-on-surface)` (semi-bold makes it stand out)
- Amount: `var(--mat-sys-primary)` (indigo — consistent with Today's Sales)
- Relative time: `var(--mat-sys-on-surface-variant)` (muted)
- Divider: `var(--mat-sys-outline-variant)` at 0.5 opacity
- Sale icon: `point_of_sale` in `#4caf50` (green — money came in)
- Check-in icon: `how_to_reg` in `var(--mat-sys-primary)` (indigo)

### Card elevation

`mat-elevation-z1`

---

## 7. Interactions

| Action | Behavior |
|--------|----------|
| Tap a sale item | Navigate to `/store/history` — transaction history |
| Tap a check-in item | Navigate to `/attendance` — attendance view |
| Tap the card title "Recent Activity" | No action — title is not a link |
| Hover on an item (desktop) | Subtle background highlight on the row |

Each row is independently tappable. The navigation target depends on the item type.

---

## 8. Role Visibility

| Role | Sale items? | Check-in items? | Widget visible? |
|------|------------|----------------|----------------|
| ADMIN | ✅ | ✅ | ✅ |
| MANAGER | ✅ | ✅ | ✅ |
| STAFF | ✅ | ✅ | ✅ |
| TRAINER | ❌ | ✅ | ✅ (check-ins only) |

For TRAINER, the feed only shows check-in items (no sales query fired). This saves 1-5 reads.

---

## 9. Edge Cases

| Scenario | Behavior |
|----------|----------|
| Staff has sales but no check-ins | Feed shows only sale items. |
| Staff has check-ins but no sales (TRAINER) | Feed shows only check-in items. |
| Staff has 0 of both | Empty state. |
| All 5 recent transactions are VOID | Show them with a "Voided" badge/strikethrough. Don't filter them out — the staff should see that voids happened. |
| Transaction from 3 months ago (no recent activity) | Shows with date string "Jan 15" instead of relative time. |
| Member name is "Walk-in" | Display as-is: "Sold Protein Shake to Walk-in". |
| Very long product summary (5+ items) | Truncate with ellipsis after ~60 characters. Full summary visible on tap (navigates to transaction detail). |
| Check-in query returns 0 (no `checkedInBy.uid` index yet) | Firestore throws index error. Catch it gracefully — show only sales items. Log warning. The index from Phase 6 must be created first. |

### VOID transaction display

Voided transactions appear in the feed with visual treatment:
- Strikethrough on the description text
- Muted opacity (0.5)
- Small "Voided" chip/badge after the amount
- Not filtered out — the staff should know their void history

```
💰 ~~Sold Protein Shake to Juan~~ [Voided]
   ~~₱150.00~~ · 2 hours ago
```

---

## 10. Component Spec

**File:** `src/app/features/dashboard/widgets/activity-feed/activity-feed.ts`

**Inputs:** None.

**Injections:** `TransactionService`, `AttendanceService`, `AuthService`

**Interface:**
```typescript
interface ActivityItem {
    type: 'sale' | 'checkin';
    timestamp: Date;
    description: string;
    amount: number | null;
    memberName: string;
    isVoided: boolean;
    icon: string;
    routerLink: string;
}
```

**Signals:**
- `activities = signal<ActivityItem[]>([])`
- `isLoading = signal(true)`

**Computed:**
- `isEmpty = computed(() => activities().length === 0 && !isLoading())`

**Data loading:**
```typescript
const uid = this.authService.userProfile()?.uid;
if (!uid) { this.isLoading.set(false); return; }

const isTrainer = this.authService.hasAnyRole(['TRAINER'])
    && !this.authService.hasAnyRole(['ADMIN', 'MANAGER', 'STAFF']);

const todayStr = toLocalDateStr(new Date());

// Parallel fetch
const [salesItems, checkinItems] = await Promise.all([
    // Skip sales query for pure TRAINER role
    isTrainer ? [] : this.loadSales(uid),
    this.loadCheckins(uid, todayStr)
]);

const merged = [...salesItems, ...checkinItems]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 5);

this.activities.set(merged);
this.isLoading.set(false);
```

**Helper — loadSales:**
```typescript
private async loadSales(uid: string): Promise<ActivityItem[]> {
    const txs = await firstValueFrom(
        this.transactionService.getTransactions({ staffId: uid, limit: 5 })
    );
    return txs.map(tx => {
        const date = tx.date instanceof Date ? tx.date : tx.date.toDate();
        const summary = tx.items
            .map(i => i.quantity > 1 ? `${i.quantity}x ${i.productName}` : i.productName)
            .join(', ');
        return {
            type: 'sale' as const,
            timestamp: date,
            description: `Sold ${summary} to ${tx.memberName || 'Walk-in'}`,
            amount: tx.totalAmount,
            memberName: tx.memberName || 'Walk-in',
            isVoided: tx.status === 'VOID',
            icon: 'point_of_sale',
            routerLink: '/store/history'
        };
    });
}
```

**Helper — loadCheckins:**
```typescript
private async loadCheckins(uid: string, todayStr: string): Promise<ActivityItem[]> {
    try {
        const records = await this.attendanceService.getCheckInsByStaff(uid, todayStr, 5);
        return records.map(r => {
            const date = r.checkInTime?.toDate ? r.checkInTime.toDate() : new Date(r.checkInTime);
            return {
                type: 'checkin' as const,
                timestamp: date,
                description: `Checked in ${r.memberName}`,
                amount: null,
                memberName: r.memberName,
                isVoided: false,
                icon: 'how_to_reg',
                routerLink: '/attendance'
            };
        });
    } catch {
        // Index might not exist yet — graceful degradation
        return [];
    }
}
```

---

## 11. Firestore Index Requirements

**For sales:** Same composite index as Phases 2-7: `staffId` (ASC) + `date` (DESC) on `transactions`. Already exists.

**For check-ins:** Same composite index as Phase 6: `checkedInBy.uid` (ASC) + `date` (ASC) + `checkInTime` (DESC) on `attendance`. Must be created (Phase 6 requirement).

---

## 12. Relationship to Other Widgets

The activity feed is the narrative counterpart to the numerical widgets:

| Widget | Shows | Format |
|--------|-------|--------|
| Today's Sales | ₱8,450 | Number |
| Members Checked In | 12 members | Number + names |
| Activity Feed | "Sold Protein Shake to Juan — ₱150" | Story |

The feed adds texture to the numbers. A staff member who sees "₱8,450 today" and then scrolls down to see the individual sales that built that number gets a richer understanding of their day.

---

## Next Step

Phase 12: Personal Bests / Records — new Firestore collection for tracking high-water marks.
