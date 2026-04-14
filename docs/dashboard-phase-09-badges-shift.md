# Phase 9: Contextual Badges & Shift Status

> Part of: Staff Personal Dashboard Spec
> Focus: "First to Open" badge, shift status reminder, and future badge system foundation

---

## 1. Goal

**Psychological driver:** Recognition and task awareness.

This widget serves two purposes:

1. **Recognition** — "First to Open" badge rewards the staff who opened the register today. It's a small, daily achievement that says "you were here first, you got things started."

2. **Task awareness** — Shift status tells the staff whether the register is open, who opened it, and how long it's been running. This is a gentle nudge: "The shift has been open for 9 hours — time to close and reconcile?"

These two concerns share a visual row because they're both status-oriented and compact. They don't need full cards — they're pill-shaped badges that sit in a horizontal strip.

---

## 2. Data Source

### Shift status

**Source:** `CashRegisterService.currentShift$` — a `BehaviorSubject<ShiftSession | null>` that's already loaded at app startup.

**Fields used:**
- `status` — 'OPEN' or 'CLOSED' (or null if no shift)
- `openedBy` — string (staff name who opened)
- `startTime` — Timestamp/Date (when the shift started)
- `expectedClosingBalance` — number (current cash in drawer)

**Firestore cost: 0.** The `BehaviorSubject` is populated by `CashRegisterService.refreshShift()` which runs on app init. The dashboard reads the in-memory value — no additional query.

### "First to Open" badge

**Logic:** Compare `currentShift.openedBy` against `authService.userProfile().displayName`.

```typescript
const shift = cashRegisterService.currentShift$.getValue();
const currentUser = authService.userProfile()?.displayName;
const isFirstToOpen = shift?.status === 'OPEN' && shift.openedBy === currentUser;
```

**Firestore cost: 0.** Pure in-memory comparison.

### Shift duration

**Logic:** `Date.now() - shift.startTime` converted to hours and minutes.

```typescript
const rawStart = shift.startTime;
const startDate: Date = rawStart?.toDate ? rawStart.toDate() : new Date(rawStart);
const durationMs = Date.now() - startDate.getTime();
const hours = Math.floor(durationMs / 3600000);
const minutes = Math.floor((durationMs % 3600000) / 60000);
```

**Firestore cost: 0.** Pure computation.

### Total Firestore cost: 0 reads. Always.

---

## 3. Refresh Behavior & Caching Tier

**Tier: 1 — Always Fresh (live via BehaviorSubject)**

The shift status is already reactive. `CashRegisterService.currentShift$` emits whenever:
- A shift is opened (`openShift()` calls `this.currentShift.next(createdShift)`)
- A shift is closed (`closeShift()` calls `this.currentShift.next(null)`)
- A transaction is processed (`refreshShift()` re-reads from Firestore)

The dashboard subscribes to this Observable. No polling, no re-fetching. The widget updates in real-time at zero cost.

| Trigger | Behavior |
|---------|----------|
| Navigate to dashboard | Subscribe to `currentShift$`. Immediate value from BehaviorSubject. |
| Shift opened/closed while on dashboard | Widget updates automatically (Observable emission). |
| Navigate away and back | Re-subscribe. BehaviorSubject replays last value instantly. |

**Shift duration** is the one value that changes continuously (every minute). Rather than a live timer, compute it once on component init and optionally update via a 60-second interval (same pattern as `QuotaStatusWidget`'s midnight check). The interval is local — no Firestore reads.

---

## 4. Copy & Wording

### Badge: "First to Open"

| Scenario | Display |
|----------|---------|
| This staff opened today's shift | 🏅 "First to Open" — gold pill badge |
| Someone else opened the shift | Badge not shown for this staff |
| No shift open | Badge not shown |

Text: "First to Open" — short, fits in a pill. No explanation needed — the staff knows what it means.

### Shift status: Open

| Element | Text |
|---------|------|
| Status indicator | Green dot + "Shift Open" |
| Opened by | "Opened by {name}" |
| Duration | "Running for {hours}h {minutes}m" |
| Cash in drawer | "₱{expectedClosingBalance}" |

### Shift status: Closed / No shift

| Element | Text |
|---------|------|
| Status indicator | Red dot + "Register Closed" |
| Call to action | "Open a shift to start" |

### Duration nudge (long shift)

If the shift has been open for more than 10 hours:

"⏰ Shift open for {hours}h — consider closing and reconciling"

This is a gentle reminder, not an alarm. The orange color and clock icon signal "attention" without "emergency."

---

## 5. Empty State

When no shift exists (null):

- Red dot + "Register Closed"
- "Open a shift to start selling"
- Tappable — opens the `ShiftControlModal`

This is actionable, not just informational. The staff can fix the situation directly from the dashboard.

---

## 6. Visual Design

### Layout: Horizontal badge row

This widget is NOT a card. It's a horizontal strip of pill-shaped badges that sits between the hero row (Sales + Ring) and the comparison row (Week + Month).

```
┌─────────────────────────────────────────────────┐
│ 🏅 First to Open  │  🟢 Shift Open · 4h 23m · Opened by Juan · ₱12,450  │
└─────────────────────────────────────────────────┘
```

On mobile, the pills stack vertically:

```
┌─────────────────────┐
│ 🏅 First to Open    │
├─────────────────────┤
│ 🟢 Shift Open       │
│ 4h 23m · Juan       │
│ ₱12,450             │
└─────────────────────┘
```

### Badge pill design

```css
.badge-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 24px;
    font-size: 13px;
    font-weight: 500;
}

.badge-first-to-open {
    background: #fff8e1; /* Light amber */
    color: #f57f17;      /* Dark amber */
    border: 1px solid #ffe082;
}

.badge-shift-open {
    background: #e8f5e9; /* Light green */
    color: #2e7d32;      /* Dark green */
    border: 1px solid #a5d6a7;
}

.badge-shift-closed {
    background: #ffebee; /* Light red */
    color: #c62828;      /* Dark red */
    border: 1px solid #ef9a9a;
}

.badge-shift-long {
    background: #fff3e0; /* Light orange */
    color: #e65100;      /* Dark orange */
    border: 1px solid #ffcc80;
}
```

### Status dot

A small 8px circle before the shift status text:
- Green (`#4caf50`) for open
- Red (`#f44336`) for closed
- Orange (`#ff9800`) for long shift (>10h)

### Sizing

| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Row layout | Horizontal (flex-row) | Horizontal | Vertical (flex-column) |
| Badge pill height | 36px | 36px | 40px (touch target) |
| Font size | 13px | 13px | 14px |
| Gap between pills | 12px | 12px | 8px |
| Row spans | Full width (grid-column: 1 / -1) | Full width | Full width |

### Grid placement

The badge row spans the full width of the grid on all breakpoints:

```css
.badge-row {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
}

@media (max-width: 599px) {
    .badge-row {
        flex-direction: column;
        align-items: stretch;
    }
}
```

---

## 7. Interactions

| Action | Behavior |
|--------|----------|
| Tap "First to Open" badge | Nothing — it's a recognition badge, not a link |
| Tap shift status pill (open) | Open `ShiftControlModal` — staff can view shift details or close |
| Tap shift status pill (closed) | Open `ShiftControlModal` — staff can open a new shift |
| Hover on shift pill (desktop) | Cursor pointer + slight background darken |

The shift pill is interactive (opens the modal). The "First to Open" badge is not — it's purely decorative recognition.

---

## 8. Role Visibility

| Role | Sees badges? | Sees shift status? | Why |
|------|-------------|-------------------|-----|
| ADMIN | ✅ | ✅ | Full access |
| MANAGER | ✅ | ✅ | Manages shifts |
| STAFF | ✅ | ✅ | Primary shift operators |
| TRAINER | ❌ | ❌ | Trainers don't manage the register |

The entire badge row is hidden for TRAINER role.

---

## 9. Relationship to Existing ShiftStatusWidget

The toolbar already has a `ShiftStatusWidget` that shows shift status. The dashboard badge row is NOT a replacement.

| Aspect | Toolbar ShiftStatusWidget | Dashboard Badge Row |
|--------|--------------------------|-------------------|
| Location | Always visible in toolbar | Only on dashboard page |
| Shows "First to Open"? | No | Yes |
| Shows duration? | No | Yes |
| Shows long-shift nudge? | No | Yes (>10h) |
| Opens ShiftControlModal? | Yes | Yes (same modal) |
| Data source | Same (`currentShift$`) | Same |

The dashboard version adds duration, the "First to Open" badge, and the long-shift nudge — context that's too verbose for the toolbar but perfect for a dashboard.

---

## 10. Edge Cases

| Scenario | Behavior |
|----------|----------|
| No shift open | Red pill: "Register Closed — Open a shift to start". No "First to Open" badge. |
| Shift opened by this staff | Gold "First to Open" badge + green shift status pill. |
| Shift opened by someone else | No "First to Open" badge. Green shift status pill shows "Opened by {name}". |
| Shift open for >10 hours | Orange pill replaces green: "⏰ Shift open for 11h — consider closing". |
| Shift open for >24 hours | Same orange nudge. No escalation — the stale shift dialog handles the hard block on transactions. |
| `openedBy` is null or empty (legacy data) | Skip "First to Open" check. Show shift status without "Opened by" line. |
| Multiple shifts open (shouldn't happen) | `CashRegisterService.getOpenShift()` returns the first one (`limit(1)`). Dashboard shows that one. |
| Staff opens shift, navigates to dashboard | `currentShift$` already updated by `openShift()`. Badge appears immediately. |
| Staff closes shift from dashboard modal | `currentShift$` emits null. Badge row switches to "Register Closed" instantly. |

### Duration display formatting

| Duration | Display |
|----------|---------|
| < 1 minute | "Just opened" |
| 1-59 minutes | "{m}m" |
| 1-23 hours | "{h}h {m}m" |
| 24+ hours | "{h}h" (drop minutes — precision doesn't matter at this scale) |

---

## 11. Future: Full Badge System (Phase 2 of "To Add")

This phase implements contextual badges — computed on the fly, not persisted. A future full badge system would:

- Store earned badges in `staff_badges/{uid}` Firestore collection
- Track: badge type, date earned, count
- Display a badge gallery on the dashboard or profile page
- Examples: "10-Sale Day", "Zero Variance Shift", "100 Members Checked In"

The current "First to Open" badge is the seed for this system. The pill design and visual language established here will carry forward.

---

## 12. Component Spec

**File:** `src/app/features/dashboard/widgets/badge-row/badge-row.ts`

**Inputs:** None.

**Injections:** `CashRegisterService`, `AuthService`

**Signals:**
- `shift = toSignal(cashRegisterService.currentShift$, { initialValue: null })`
- `durationText = signal('')`

**Computed:**
- `isShiftOpen = computed(() => shift()?.status === 'OPEN')`
- `isFirstToOpen = computed(() => { const s = shift(); return s?.status === 'OPEN' && s.openedBy === authService.userProfile()?.displayName; })`
- `openedBy = computed(() => shift()?.openedBy || '')`
- `expectedBalance = computed(() => shift()?.expectedClosingBalance ?? 0)`
- `isLongShift = computed(() => { ... duration > 10 hours ... })`

**Duration update:** Compute once on init. Optionally update every 60s via `interval(60_000)` with `takeUntilDestroyed`. The interval is local (no Firestore reads).

```typescript
private updateDuration(): void {
    const s = this.shift();
    if (!s?.startTime) { this.durationText.set(''); return; }
    
    const rawStart = s.startTime;
    const start: Date = rawStart?.toDate ? rawStart.toDate() : new Date(rawStart);
    const ms = Date.now() - start.getTime();
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    
    if (ms < 60000) this.durationText.set('Just opened');
    else if (hours === 0) this.durationText.set(`${minutes}m`);
    else if (hours < 24) this.durationText.set(`${hours}h ${minutes}m`);
    else this.durationText.set(`${hours}h`);
}
```

---

## Next Step

Phase 10: Low Stock Alerts — role-dependent product restock reminders.
