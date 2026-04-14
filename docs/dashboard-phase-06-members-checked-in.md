# Phase 6: Members You Checked In Today

> Part of: Staff Personal Dashboard Spec
> Focus: Count and names of members this staff personally welcomed today

---

## 1. Goal

**Psychological driver:** Purpose and human connection.

Sales widgets measure money. This widget measures people. It answers: "How many members did I personally welcome today?" This reframes the staff's role from "cashier" to "host" — someone who makes members feel seen.

For TRAINER role specifically, this is the primary dashboard metric (they don't see sales widgets). It validates their presence: "You helped 8 people train today."

Seeing real names ("You checked in Maria, Juan, Carlos...") is more powerful than a bare number. Names create emotional connection to the work.

---

## 2. Data Source

### Query

```typescript
// Attendance records where this staff checked the member in, today
const q = query(
    collection(firestore, 'attendance'),
    where('checkedInBy.uid', '==', currentUserUid),
    where('date', '==', todayStr),  // YYYY-MM-DD format
    orderBy('checkInTime', 'desc'),
    limit(20)
);
const snapshot = await getDocs(q);
```

**Why `getDocs` (one-shot) instead of `collectionData` (listener)?** The dashboard doesn't need real-time updates for this widget. The staff checks someone in at the kiosk, then navigates back to the dashboard and sees the updated count. A one-shot read on each visit is sufficient and cheaper than maintaining a listener.

### Fields used from `AttendanceRecord`

- `memberName` — display name
- `checkInTime` — timestamp for "most recent" ordering
- `checkedInBy.uid` — filter to current staff

### Derived metrics

- `count = records.length` — total checked in today by this staff
- `names = records.map(r => r.memberName)` — for the name list
- `latestTime = records[0]?.checkInTime` — most recent check-in time

### Firestore cost

| Data | Cost |
|------|------|
| Attendance query (limit 20) | 1-20 reads |
| **Total** | **1-20 reads per visit** |

### Composite index requirement

The query uses `where('checkedInBy.uid', '==', ...)` + `where('date', '==', ...)` + `orderBy('checkInTime', 'desc')`.

This requires a composite index on `attendance`:
- Fields: `checkedInBy.uid` (ASC), `date` (ASC), `checkInTime` (DESC)

This index likely does NOT exist yet — the existing attendance queries filter by `memberId` or `status`, not by `checkedInBy.uid`. Firestore will throw an error with a creation link on first use.

---

## 3. Refresh Behavior & Caching Tier

**Tier: 1 — Always Fresh**

This widget changes every time the staff checks in a member. The staff expects to see the updated count immediately after returning from the kiosk.

| Trigger | Behavior |
|---------|----------|
| Navigate to dashboard | Fetch attendance records (1-20 reads) |
| Navigate away and back | Re-fetch (component destroyed and re-created) |
| After checking in a member at kiosk | Next dashboard visit shows updated count |
| Midnight rollover | `todayStr` recalculated in constructor → new day's records |

No caching. The cost (1-20 reads) is acceptable for always-fresh data.

---

## 4. Copy & Wording

### Card title

"Members You Welcomed"

Not "Members Checked In" (too transactional) or "Check-In Count" (too clinical). "Welcomed" frames the action as hospitality, not data entry.

### Primary number

"{count}" — large, bold.

Singular/plural handling:
- 0: (show empty state instead)
- 1: "1 member"
- 2+: "{count} members"

### Name list (below the count)

Show the last 5 names, most recent first:

"Maria, Juan, Carlos, Ana, Pedro"

If more than 5: "Maria, Juan, Carlos, Ana, Pedro +7 more"

Names are comma-separated, single line, truncated with ellipsis if too long for the card width.

### Time context

"Latest: {time}" — e.g., "Latest: 2:34 PM"

Shows when the most recent check-in happened. Gives a sense of recency.

### Comparison (optional, lightweight)

No comparison to yesterday or last week. This widget is about today's human impact, not competitive metrics. Adding "↑ 3 more than yesterday" would make it feel like a KPI instead of a people metric.

---

## 5. Empty State

When count = 0:

- Icon: `how_to_reg` (Material icon, muted)
- Text: "No check-ins yet today"
- Subtext: "Head to Attendance to welcome your first member"

Tone: Inviting, not empty. The word "welcome" reinforces the hospitality framing.

---

## 6. Visual Design

### Card structure

```
┌──────────────────────────────────────┐
│  👋  Members You Welcomed            │
│                                      │
│       12 members                     │  ← Count (large)
│                                      │
│  Maria, Juan, Carlos, Ana +8 more   │  ← Names (small, muted)
│  Latest: 2:34 PM                     │  ← Recency (tiny, muted)
└──────────────────────────────────────┘
```

### Sizing

| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Card | 1 grid column | 1 grid column | Full width |
| Count number | 28px, 700 weight | 24px | 22px |
| "members" label | 16px, 400 weight | 14px | 14px |
| Name list | 13px, 400 weight | 13px | 12px |
| Latest time | 12px, 400 weight | 12px | 11px |
| Card padding | 24px | 24px | 16px |
| Card min-height | 120px | 120px | 100px |

### Colors

- Count number: `var(--mat-sys-primary)` (indigo — same as Today's Sales primary number, creates visual consistency)
- "members" label: `var(--mat-sys-on-surface-variant)`
- Name list: `var(--mat-sys-on-surface-variant)`
- Latest time: `var(--mat-sys-on-surface-variant)` at lower opacity
- Icon: `var(--mat-sys-primary)` at 0.7 opacity

### Card elevation

`mat-elevation-z1`

---

## 7. Interactions

| Action | Behavior |
|--------|----------|
| Tap/click the card | Navigate to `/attendance` — staff can see the full attendance view |
| Hover (desktop) | Subtle elevation increase + cursor pointer |

---

## 8. Role Visibility

| Role | Sees this widget? | Why |
|------|-------------------|-----|
| ADMIN | ✅ | May check in members |
| MANAGER | ✅ | May check in members |
| STAFF | ✅ | Primary check-in operators |
| TRAINER | ✅ | This is their primary dashboard metric — they welcome members for training |

This is the only sales-unrelated metric widget visible to TRAINER. On the TRAINER dashboard, this widget takes the hero position (where Today's Sales would be for STAFF).

---

## 9. Edge Cases

| Scenario | Behavior |
|----------|----------|
| Staff hasn't checked in anyone today | Empty state: "No check-ins yet today" |
| Staff checked in 1 member | "1 member" (singular). Name list shows just the one name. |
| Staff checked in 20+ members | Count shows actual number. Name list shows first 5 + "+{remaining} more". Query is limited to 20 docs — if more than 20, the count shows "20+" and the actual count is approximate. |
| Member checked in by a different staff | Not shown — query filters by `checkedInBy.uid`. Each staff sees only their own check-ins. |
| Member checked in and then checked out | Still shown — the query doesn't filter by `status`. The staff welcomed them regardless of whether they've left. |
| Midnight rollover | `todayStr` recalculated on next visit. Previous day's check-ins disappear. |
| `checkedInBy` field is null (legacy data) | Query returns no results for those records. Only records with `checkedInBy.uid` matching the current user are shown. |

### Count accuracy note

The query uses `limit(20)`. If a staff member checks in more than 20 members in a day (unlikely but possible at a busy gym), the count shows "20+" and the name list shows the 20 most recent. For exact count, we'd need a `count()` aggregation query (1 additional read). Worth adding if the gym regularly exceeds 20 check-ins per staff per day.

---

## 10. Component Spec

**File:** `src/app/features/dashboard/widgets/members-checked-in/members-checked-in.ts`

**Inputs:** None.

**Injections:** `Firestore` (direct query — no existing service method for this specific filter), `AuthService`

**Why direct Firestore query?** `AttendanceService` doesn't have a method to query by `checkedInBy.uid`. Adding one would be clean, but it's a single-use query for the dashboard. Two options:
1. Add `getCheckInsByStaff(uid, date)` to `AttendanceService` — cleaner, follows project patterns
2. Query directly in the widget — faster to implement, self-contained

**Recommended:** Option 1 — add the method to `AttendanceService`. It follows the project convention of keeping Firestore queries in services, not components.

```typescript
// AttendanceService addition:
async getCheckInsByStaff(staffUid: string, dateStr: string, limitCount = 20): Promise<AttendanceRecord[]> {
    const q = query(
        this.attendanceCollection,
        where('checkedInBy.uid', '==', staffUid),
        where('date', '==', dateStr),
        orderBy('checkInTime', 'desc'),
        limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
}
```

**Widget signals:**
- `records = signal<AttendanceRecord[]>([])`
- `isLoading = signal(true)`

**Computed:**
- `count = computed(() => records().length)`
- `isApproximate = computed(() => count() >= 20)` — shows "20+" if limit reached
- `displayNames = computed(() => { const names = records().slice(0, 5).map(r => r.memberName); ... })`
- `extraCount = computed(() => Math.max(count() - 5, 0))`
- `latestTime = computed(() => records()[0]?.checkInTime)`
- `isEmpty = computed(() => count() === 0)`

---

## 11. Firestore Index Requirements

**New composite index needed on `attendance` collection:**

| Field | Direction |
|-------|-----------|
| `checkedInBy.uid` | ASC |
| `date` | ASC |
| `checkInTime` | DESC |

This index does not exist yet. Firestore will provide a creation link in the console error on first query attempt. Create it before deploying.

---

## Next Step

Phase 7: Your Top Product — the product this staff sells the most this month.
