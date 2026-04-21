# Phase 14: Active Days Streak

> Part of: Staff Personal Dashboard Spec
> Focus: Tracking consecutive days of staff activity — NEW FIRESTORE DATA

---

## 1. Goal

**Psychological driver:** Habit formation and consistency.

Streaks are one of the most powerful motivators in app design. Duolingo, GitHub, Snapchat — they all use streaks because they work. The psychology is simple: once you have a streak going, you don't want to break it. The longer the streak, the stronger the pull.

For gym staff, a streak answers: "How many days in a row have I shown up and done something?" It rewards consistency over intensity. A staff member who makes 3 small sales every day for 20 days straight is more valuable than one who has one big day and disappears for a week.

The streak also creates a gentle social pressure: "I can't break my streak" becomes a reason to show up on days when motivation is low.

---

## 2. New Firestore Collection

### Collection: `staff_activity/{uid}_{YYYY-MM-DD}`

One document per staff per active day. Created automatically when the staff performs their first meaningful action of the day.

```typescript
interface StaffActivityDay {
    uid: string;
    date: string;           // YYYY-MM-DD (local timezone)
    firstActionAt: Date;    // Timestamp of first action
    lastActionAt: Date;     // Timestamp of most recent action
    salesCount: number;     // Transactions processed today
    checkInsCount: number;  // Members checked in today
    totalSales: number;     // ₱ amount sold today
}
```

### Document ID format

`{uid}_{YYYY-MM-DD}` — e.g., `abc123_2026-04-14`

This makes it easy to query a range of days for a specific user and guarantees one document per user per day (idempotent writes).

### What counts as "active"

An activity day is created on the staff's first action of the day. "Action" means:

| Action | Counts? | Why |
|--------|---------|-----|
| Processing a sale (checkout) | ✅ | Core work |
| Checking in a member | ✅ | Core work |
| Opening a shift | ✅ | Starting the day |
| Logging in | ❌ | Passive — logging in without doing anything isn't "active" |
| Viewing the dashboard | ❌ | Passive |
| Adding an expense/float | ❌ | Administrative, not customer-facing |

### Write pattern

Activity documents are created/updated during existing operations:

**In `CheckoutService.checkout()` — after batch commit:**
```typescript
// Fire-and-forget — don't block the checkout
this.updateStaffActivity(uid, { salesCount: 1, totalSales: amount });
```

**In `AttendanceService.checkIn()` — after check-in:**
```typescript
this.updateStaffActivity(uid, { checkInsCount: 1 });
```

**In `CashRegisterService.openShift()` — after shift open:**
```typescript
this.updateStaffActivity(uid, {});  // Just mark the day as active
```

### Update method (idempotent)

```typescript
async updateStaffActivity(uid: string, increments: {
    salesCount?: number;
    checkInsCount?: number;
    totalSales?: number;
}): Promise<void> {
    const todayStr = toLocalDateStr(new Date());
    const docId = `${uid}_${todayStr}`;
    const ref = doc(this.firestore, 'staff_activity', docId);

    await setDoc(ref, {
        uid,
        date: todayStr,
        lastActionAt: new Date(),
        ...(increments.salesCount ? { salesCount: increment(increments.salesCount) } : {}),
        ...(increments.checkInsCount ? { checkInsCount: increment(increments.checkInsCount) } : {}),
        ...(increments.totalSales ? { totalSales: increment(increments.totalSales) } : {}),
    }, { merge: true });

    // Set firstActionAt only if this is a new document (first action of the day)
    // merge: true won't overwrite existing fields, but firstActionAt needs special handling
    // Use a sentinel: if firstActionAt doesn't exist, set it
    const snap = await getDoc(ref);
    if (snap.exists() && !snap.data()['firstActionAt']) {
        await updateDoc(ref, { firstActionAt: new Date() });
    }
}
```

**Simpler alternative using `serverTimestamp` and merge:**
```typescript
async updateStaffActivity(uid: string, increments: Partial<{
    salesCount: number;
    checkInsCount: number;
    totalSales: number;
}>): Promise<void> {
    const todayStr = toLocalDateStr(new Date());
    const docId = `${uid}_${todayStr}`;
    const ref = doc(this.firestore, 'staff_activity', docId);

    const data: any = {
        uid,
        date: todayStr,
        lastActionAt: new Date(),
    };

    // Use increment for counters
    if (increments.salesCount) data.salesCount = increment(increments.salesCount);
    if (increments.checkInsCount) data.checkInsCount = increment(increments.checkInsCount);
    if (increments.totalSales) data.totalSales = increment(increments.totalSales);

    await setDoc(ref, data, { merge: true });
}
```

The `firstActionAt` can be derived from the document's creation time or simply set on the first `setDoc` call (merge creates the doc if it doesn't exist, and the first write sets all fields including `lastActionAt` which doubles as `firstActionAt` for the first action).

**Simplification:** Drop `firstActionAt`. Use `lastActionAt` for display. The streak only cares about whether a document exists for a given day, not when the first action happened.

### Write cost

1 write per action (checkout, check-in, shift open). With `merge: true`, subsequent actions on the same day update the same document — no new documents created.

For a typical day: ~10-30 writes per staff (10 sales + 15 check-ins + 1 shift open = 26 writes to the same document). This is acceptable.

---

## 3. Streak Calculation

### Query: Last N days of activity

```typescript
// Fetch the last 30 days of activity for this staff
const today = new Date();
const thirtyDaysAgo = new Date(today);
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const startId = `${uid}_${toLocalDateStr(thirtyDaysAgo)}`;
const endId = `${uid}_${toLocalDateStr(today)}`;

const q = query(
    collection(firestore, 'staff_activity'),
    where(documentId(), '>=', startId),
    where(documentId(), '<=', endId)
);

const snapshot = await getDocs(q);
const activeDates = new Set(snapshot.docs.map(d => d.data()['date'] as string));
```

### Streak algorithm

```typescript
function calculateStreak(activeDates: Set<string>, today: Date): number {
    let streak = 0;
    const current = new Date(today);

    // Check if today is active — if not, start from yesterday
    const todayStr = toLocalDateStr(current);
    if (!activeDates.has(todayStr)) {
        // Today isn't active yet — check if yesterday continues the streak
        current.setDate(current.getDate() - 1);
    }

    // Count consecutive days backward
    while (true) {
        const dateStr = toLocalDateStr(current);
        if (activeDates.has(dateStr)) {
            streak++;
            current.setDate(current.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
}
```

**Key behavior:** If the staff hasn't done anything today yet, the streak counts from yesterday backward. This prevents the streak from showing 0 at the start of every day before the first action. Once the staff does something today, today is included in the count.

### Weekend/holiday handling

**Decision: Weekends DO break the streak.**

Rationale: This is a gym — gyms operate 7 days a week. Staff are scheduled on different days. If a staff member works Mon-Sat and is off Sunday, their streak breaks on Sunday. This is intentional — it creates urgency to maintain the streak.

**Alternative considered:** Skip non-working days. This would require knowing each staff member's schedule, which we don't track. Too complex for v1.

**Future enhancement:** If the gym adds staff scheduling, the streak could skip scheduled off-days.

### Firestore cost for streak calculation

| Data | Cost |
|------|------|
| Last 30 days of activity docs | 1-30 reads (one per active day) |
| **Total** | **1-30 reads** (first load) / **0** (cached) |

---

## 4. Refresh Behavior & Caching Tier

**Tier: 2 — Session-Cached (invalidate on midnight)**

The streak changes at most once per day (when the staff's first action creates today's activity doc). Caching for the day is safe.

| Trigger | Behavior |
|---------|----------|
| First dashboard visit of the day | Fetch last 30 days of activity (1-30 reads). Calculate streak. Cache in `DashboardCacheService`. |
| Subsequent visits same day | Serve from cache. 0 reads. |
| After first action of the day (if streak was 0) | Cache still shows yesterday's streak. Next dashboard visit recalculates. Acceptable — the streak increments by 1, not a dramatic change. |
| Midnight rollover | Date key changes → cache miss → fresh fetch. |

---

## 5. Copy & Wording

### Display format

| Streak | Display | Icon |
|--------|---------|------|
| 0 days | "Start your streak today" | 🔥 (gray/muted) |
| 1 day | "1 day streak" | 🔥 |
| 2-6 days | "{n} day streak" | 🔥 |
| 7+ days | "{n} day streak" | 🔥🔥 (double flame) |
| 14+ days | "{n} day streak" | 🔥🔥🔥 (triple flame) |
| 30+ days | "{n} day streak — Legendary!" | 🔥🔥🔥 + ⭐ |

### Streak broken message

If the streak was >3 days and is now 0 (staff missed yesterday):

"Your {previous} day streak ended yesterday. Start a new one today!"

This acknowledges the loss without dwelling on it. The call to action is immediate: "Start a new one today."

**How to know the previous streak:** The `DashboardCacheService` can store the last known streak value. If today's calculated streak is 0 but the cached value from yesterday was >3, show the "streak ended" message. This is a best-effort heuristic — if the cache was cleared (logout, app reinstall), the message won't show. Acceptable.

### Subtext: What counts

"Sales, check-ins, and shift opens count toward your streak"

Small, muted, shown below the streak number. Helps new staff understand what they need to do.

---

## 6. Visual Design

### Placement

The streak is NOT a full card. It's a compact element that lives inside the Badge Row (Phase 9) as an additional pill, next to "First to Open" and shift status.

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔥 12 day streak  │  🏅 First to Open  │  🟢 Shift Open · 4h  │
└─────────────────────────────────────────────────────────────────┘
```

On mobile (stacked):
```
┌─────────────────────┐
│ 🔥 12 day streak    │
├─────────────────────┤
│ 🏅 First to Open    │
├─────────────────────┤
│ 🟢 Shift Open · 4h  │
└─────────────────────┘
```

### Streak pill design

```css
.badge-streak {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 24px;
    font-size: 13px;
    font-weight: 600;
    background: linear-gradient(135deg, #ff6f00, #ff8f00);
    color: white;
    border: none;
}

.badge-streak.inactive {
    background: #f5f5f5;
    color: var(--mat-sys-on-surface-variant);
}
```

The active streak pill uses a warm orange gradient — it stands out from the other pills (which use light pastel backgrounds). The gradient creates a "glowing" effect that feels energetic.

The inactive state (0 streak) uses a muted gray — present but not attention-grabbing.

### Flame icon scaling

| Streak | Flames | Visual |
|--------|--------|--------|
| 0 | 1 gray flame | Muted, waiting |
| 1-6 | 1 orange flame | Active |
| 7-13 | 2 flames | Growing |
| 14-29 | 3 flames | Strong |
| 30+ | 3 flames + star | Legendary |

Use emoji (🔥) for simplicity. Material Icons don't have a good flame icon. Emoji renders natively on all platforms.

### Sizing

| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Pill height | 36px | 36px | 40px (touch target) |
| Font size | 13px, 600 weight | 13px | 14px |
| Flame emoji | 16px | 16px | 18px |

---

## 7. Interactions

| Action | Behavior |
|--------|----------|
| Tap the streak pill | Nothing — it's a status indicator, not a link. |
| Long press (mobile) | Nothing. |
| Hover (desktop) | Tooltip: "You've been active for {n} consecutive days. Sales, check-ins, and shift opens count." |

Non-interactive. Like the "First to Open" badge, the streak is a recognition element, not a navigation target.

---

## 8. Role Visibility

| Role | Sees streak? | Why |
|------|-------------|-----|
| ADMIN | ✅ | All roles benefit from consistency tracking |
| MANAGER | ✅ | Same |
| STAFF | ✅ | Primary audience |
| TRAINER | ✅ | Check-ins count — trainers can build streaks too |

Universal visibility. The streak is role-agnostic because it tracks any meaningful action, not just sales.

---

## 9. Edge Cases

| Scenario | Behavior |
|----------|----------|
| Brand new staff (no activity docs) | Streak = 0. "Start your streak today." |
| Staff active today only | Streak = 1. "1 day streak." |
| Staff active every day for 30+ days | Streak = 30+. "Legendary!" treatment. |
| Staff missed yesterday but active today | Streak = 1 (restarted today). |
| Staff active yesterday but not yet today (morning) | Streak counts from yesterday backward. Shows yesterday's streak. Once they do something today, it increments by 1. |
| Staff works Mon-Fri, off Sat-Sun | Streak breaks every weekend. Max streak = 5 (Mon-Fri). This is by design — see section 3. |
| Two actions on the same day | Same document updated via `merge: true`. Streak count unchanged (still 1 day). |
| Activity doc exists but with 0 sales and 0 check-ins (only shift open) | Still counts as active. The document exists = the day counts. |
| Firestore write fails during checkout | Activity doc not created. Streak may not count this day. Acceptable — the checkout itself succeeded (the activity tracking is fire-and-forget). |
| Staff has activity from 60 days ago but nothing in last 30 | Query only fetches last 30 days. Streak = 0. Old activity is irrelevant to the current streak. |

### Streak vs calendar days

The streak counts calendar days, not working days. If a staff member is active on Monday and Wednesday but not Tuesday, the streak is 1 (Wednesday only), not 2. Tuesday broke it.

---

## 10. Component Changes

### Modified: `src/app/features/dashboard/widgets/badge-row/badge-row.ts`

Add the streak pill to the existing badge row component.

**New injections:** `DashboardCacheService` (for cached streak), `Firestore` (for activity query)

**New signals:**
- `streak = signal(0)`
- `streakLoaded = signal(false)`

**New computed:**
- `streakLevel = computed(() => { const s = streak(); if (s >= 30) return 'legendary'; if (s >= 14) return 'strong'; if (s >= 7) return 'growing'; if (s > 0) return 'active'; return 'inactive'; })`
- `flameCount = computed(() => { const s = streak(); if (s >= 14) return 3; if (s >= 7) return 2; if (s > 0) return 1; return 1; })`
- `streakText = computed(() => { const s = streak(); if (s === 0) return 'Start your streak today'; return `${s} day streak`; })`

### New service: `StaffActivityService`

**File:** `src/app/core/services/staff-activity.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class StaffActivityService {
    private firestore = inject(Firestore);

    async updateActivity(uid: string, increments: Partial<{
        salesCount: number;
        checkInsCount: number;
        totalSales: number;
    }>): Promise<void> { ... }

    async getStreak(uid: string): Promise<number> { ... }

    async getActivityDays(uid: string, days: number): Promise<Set<string>> { ... }
}
```

### Modified services (fire-and-forget activity tracking)

**`CheckoutService.checkout()`** — after `batch.commit()`:
```typescript
// Fire-and-forget — don't await, don't block checkout
this.staffActivityService.updateActivity(uid, {
    salesCount: 1,
    totalSales: total
}).catch(err => console.error('Activity tracking failed:', err));
```

**`AttendanceService.checkIn()`** — after `addDoc`:
```typescript
this.staffActivityService.updateActivity(checkedInBy.uid, {
    checkInsCount: 1
}).catch(err => console.error('Activity tracking failed:', err));
```

**`CashRegisterService.openShift()`** — after `addDoc`:
```typescript
this.staffActivityService.updateActivity(uid, {}).catch(err =>
    console.error('Activity tracking failed:', err)
);
```

All three are fire-and-forget. If the activity write fails, the primary operation (checkout, check-in, shift open) is not affected.

---

## 11. Firestore Security Rules

```
match /staff_activity/{docId} {
    // docId format: {uid}_{YYYY-MM-DD}
    allow read: if request.auth != null && docId.matches(request.auth.uid + '_.*');
    allow write: if request.auth != null && docId.matches(request.auth.uid + '_.*');
}
```

Each staff can only read/write their own activity documents. The document ID contains the uid, making the rule simple.

**Note:** Firestore security rules don't support regex on document IDs in all cases. A simpler alternative:

```
match /staff_activity/{docId} {
    allow read, write: if request.auth != null
        && resource == null  // Allow create
        || resource.data.uid == request.auth.uid;  // Allow read/update own docs
}
```

Or use the `uid` field inside the document for validation:

```
match /staff_activity/{docId} {
    allow read: if request.auth != null && resource.data.uid == request.auth.uid;
    allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
    allow update: if request.auth != null && resource.data.uid == request.auth.uid;
}
```

---

## 12. Firestore Index Requirements

The streak query uses `where(documentId(), '>=', startId)` and `where(documentId(), '<=', endId)`. Document ID range queries don't require a composite index — they use the default `__name__` index.

No new indexes needed.

---

## 13. Data Cleanup / Retention

Activity documents accumulate over time. A staff member active for 1 year generates ~250 documents.

**Retention policy:** Keep the last 90 days. Older documents can be deleted by a scheduled Cloud Function or manual cleanup.

**Why 90 days?** The streak only looks back 30 days. 90 days gives a 3x buffer for any future analytics that might want longer history (e.g., "active days this quarter").

**Implementation:** A Cloud Function running weekly that deletes `staff_activity` documents older than 90 days. Not in scope for this phase — document it as a future task.

---

## 14. Firestore Cost Summary

### Write cost (ongoing, per action)

| Action | Writes per occurrence |
|--------|----------------------|
| Checkout | 1 (merge to activity doc) |
| Check-in | 1 (merge to activity doc) |
| Shift open | 1 (merge to activity doc) |
| **Typical day per staff** | **~15-30 writes** (all to the same doc) |

### Read cost (dashboard)

| Scenario | Reads |
|----------|-------|
| First dashboard visit of the day | 1-30 (activity docs for last 30 days) |
| Subsequent visits same day | 0 (cached) |

### Total daily cost per staff

~15-30 writes + 1-30 reads = ~45-60 operations per staff per day. For a gym with 5 staff: ~225-300 operations/day. Negligible.

---

## Summary: All 14 Phases Complete

This concludes the Staff Personal Dashboard spec. Here's the full picture:

| Phase | Widget | Tier | New Data? | Reads (first) | Reads (revisit) |
|-------|--------|------|-----------|---------------|-----------------|
| 1 | Shell & Layout | — | No | 0 | 0 |
| 2 | Today's Sales | 1 | No | 2 | 2 |
| 3 | Monthly Progress Ring | 3 | No | 1 (+30 cold) | 1 |
| 4 | You vs Last Month | 2 | No | 1 | 0 |
| 5 | Week-over-Week Trend | 2 | No | 2 | 0 |
| 6 | Members Checked In | 1 | No | 1-20 | 1-20 |
| 7 | Your Top Product | 2 | No | 1-30 | 0 |
| 8 | Commendation | — | No | 0 | 0 |
| 9 | Badges & Shift Status | 1 | No | 0 | 0 |
| 10 | Low Stock Alerts | 3 | No | 0 | 0 |
| 11 | Activity Feed | 1 | No | 2-10 | 2-10 |
| 12 | Personal Bests | 2 | Yes | 1 | 0 |
| 13 | Goal Setting | 3 | Yes | 0 | 0 |
| 14 | Active Streak | 2 | Yes | 1-30 | 0 |
| **Total** | | | | **~12-156** | **~6-33** |

First load of the day: ~58 reads typical, ~156 worst case (cold caches).
Subsequent revisits: ~24 reads typical, ~33 worst case.
New Firestore collections: 2 (`staff_records`, `staff_activity`).
New fields on existing docs: 1 (`users/{uid}.monthlyTarget`).
