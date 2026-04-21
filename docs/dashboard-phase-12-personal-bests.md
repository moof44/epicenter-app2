# Phase 12: Personal Bests / Records

> Part of: Staff Personal Dashboard Spec
> Focus: Tracking and celebrating high-water marks per staff — NEW FIRESTORE DATA

---

## 1. Goal

**Psychological driver:** Achievement and self-competition.

This widget answers: "What's the best I've ever done?" Personal records create an internal competition — the staff competes against their own history, not against colleagues. When a record is broken, the dopamine hit is real: "I just had my best day ever."

Records also create long-term engagement. A staff member who's been working for 6 months has accumulated records that feel like trophies. They don't want to leave — they'd lose their records.

---

## 2. New Firestore Collection

### Document: `staff_records/{uid}`

One document per staff member. Updated atomically only when a record is broken.

```typescript
interface StaffRecords {
    highestDailySales: {
        value: number;      // ₱ amount
        date: Date;         // When it happened
        txCount: number;    // How many transactions that day
    } | null;
    
    mostTransactionsInDay: {
        value: number;      // Transaction count
        date: Date;
    } | null;
    
    highestSingleTransaction: {
        value: number;      // ₱ amount
        date: Date;
        transactionId: string;
    } | null;
    
    mostCheckInsInDay: {
        value: number;      // Check-in count
        date: Date;
    } | null;
    
    lastUpdated: Date;
}
```

### Why a single document instead of a subcollection?

- 4 records × ~50 bytes each = ~200 bytes total. Well within Firestore's 1MB document limit.
- 1 read to get all records vs 4 reads for a subcollection.
- 1 write to update any record vs separate writes per record type.
- Simple to query, simple to cache.

### Write pattern

Records are updated during existing operations — no new write paths:

| Record | Updated during | Service | Write condition |
|--------|---------------|---------|----------------|
| Highest daily sales | `CheckoutService.checkout()` | CheckoutService | After batch commit, check if today's staff total > stored record |
| Most transactions in day | `CheckoutService.checkout()` | CheckoutService | After batch commit, check if today's tx count > stored record |
| Highest single transaction | `CheckoutService.checkout()` | CheckoutService | If `transaction.totalAmount > stored record` |
| Most check-ins in day | `AttendanceService.checkIn()` | AttendanceService | After check-in, check if today's count > stored record |

### Write cost

Records are broken rarely — maybe once a week for an active staff member, less as they accumulate history. The write cost is negligible: 1 write per record-break event.

The check itself requires 1 read of the `staff_records/{uid}` document to compare against. This read happens during checkout/check-in — not on the dashboard.

### Implementation approach

**Option A: Check on every checkout/check-in (eager)**
- After each checkout, read `staff_records/{uid}`, compare, update if broken.
- Pro: Records are always up to date.
- Con: 1 extra read on every checkout (adds up).

**Option B: Check on dashboard load (lazy)**
- When the dashboard loads, compute today's totals from existing queries, compare against stored records, update if broken.
- Pro: Zero extra reads during checkout (the hot path).
- Con: Records only update when the staff visits the dashboard.

**Option C: Check at shift close (batch)**
- When a shift is closed, compute the day's totals for the closing staff, compare against records, update if broken.
- Pro: 1 check per day per staff. Minimal cost.
- Con: Records don't update until shift close. Staff doesn't see the celebration in real-time.

**Recommended: Option B (lazy, on dashboard load).** The dashboard already fetches today's sales total (Phase 2) and check-in count (Phase 6). Comparing these against stored records adds 1 read (the records doc) and potentially 1 write (if broken). This keeps the checkout hot path untouched and gives the staff the celebration moment on the dashboard — the place where they'll actually see it.

---

## 3. Refresh Behavior & Caching Tier

**Tier: 2 — Session-Cached (invalidate when a record is broken)**

| Trigger | Behavior |
|---------|----------|
| First dashboard visit of the day | Read `staff_records/{uid}` (1 read). Compare against today's data (already loaded by Phase 2 + Phase 6). If record broken → write update (1 write) + show celebration. Cache the records in `DashboardCacheService`. |
| Subsequent visits same day, no record broken | Serve from cache. 0 reads. |
| Subsequent visit after a record is broken | Cache was invalidated by the write. Re-read (1 read). |
| Midnight rollover | Date key changes → cache miss → fresh read. |

### Firestore cost

| Scenario | Reads | Writes |
|----------|-------|--------|
| Normal dashboard visit (no record broken) | 1 (first visit) / 0 (cached) | 0 |
| Record broken | 1 | 1 |
| 20 visits in a day, no records broken | 1 (first) + 0 (19 cached) | 0 |

---

## 4. Copy & Wording

### Card title

"Personal Bests"

Not "Records" (ambiguous — could mean audio recordings) or "Achievements" (too gamified for a work tool). "Personal Bests" is clear, athletic, and positive.

### Record display

Each record is a row:

```
🏆 Best Day: ₱12,450 (Oct 15, 2025)
⚡ Most Sales: 23 transactions (Nov 3, 2025)
💰 Biggest Sale: ₱3,200 (Sep 22, 2025)
👋 Most Check-ins: 31 members (Dec 1, 2025)
```

### Record not yet set

If a record field is null (staff is new, no history):

"🏆 Best Day: Make your first sale to set this record"

Tone: Challenge, not emptiness. The record is waiting to be claimed.

### Record broken celebration

When the dashboard detects a new record:

**Inline:** The broken record row gets a special treatment:
- Gold background highlight
- "🎉 NEW RECORD!" badge next to the value
- The old value shown in strikethrough: "~~₱11,200~~ → ₱12,450"

**Toast (optional):** A `MatSnackBar` with: "🏆 New personal best! ₱12,450 in one day!"

The celebration should feel earned but not over-the-top. One gold highlight + one snackbar. No confetti, no modal.

---

## 5. Empty State

When the staff has no records at all (document doesn't exist):

- Icon: `emoji_events` (trophy, muted)
- Text: "Your personal records will appear here"
- Subtext: "Every sale and check-in counts toward your bests"

Four placeholder rows with "—" values:
```
🏆 Best Day: —
⚡ Most Sales: —
💰 Biggest Sale: —
👋 Most Check-ins: —
```

This shows the staff what records exist to be broken, even before they have any.

---

## 6. Visual Design

### Card structure

```
┌──────────────────────────────────────┐
│  🏆  Personal Bests                  │
│                                      │
│  🏆 Best Day         ₱12,450        │
│     Oct 15, 2025                     │
│  ─────────────────────────────────── │
│  ⚡ Most Sales        23 transactions│
│     Nov 3, 2025                      │
│  ─────────────────────────────────── │
│  💰 Biggest Sale      ₱3,200        │
│     Sep 22, 2025                     │
│  ─────────────────────────────────── │
│  👋 Most Check-ins    31 members     │
│     Dec 1, 2025                      │
└──────────────────────────────────────┘
```

Record broken state:

```
│  🏆 Best Day         ₱12,450  🎉 NEW│
│     Today! (was ₱11,200)             │
```

### Record row layout

Each row is a two-line item:
- Line 1: Icon + label (left) + value (right, bold)
- Line 2: Date (muted, small)

### Sizing

| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Card | 1 grid column | Full width | Full width |
| Record label | 14px, 400 weight | 13px | 13px |
| Record value | 16px, 700 weight | 15px | 14px |
| Record date | 12px, 400 weight | 12px | 11px |
| "NEW RECORD" badge | 11px, 600 weight, uppercase | 11px | 10px |
| Row padding | 12px 0 | 12px 0 | 10px 0 |
| Card padding | 24px | 24px | 16px |

### Colors

- Record value: `var(--mat-sys-on-surface)` (dark, prominent)
- Record date: `var(--mat-sys-on-surface-variant)` (muted)
- "NEW RECORD" badge: white text on `#f57f17` (amber) background, pill-shaped
- New record row background: `#fff8e1` (light amber) — subtle gold highlight
- Placeholder "—": `var(--mat-sys-on-surface-variant)` at 0.4 opacity

### Card elevation

`mat-elevation-z1`

---

## 7. Interactions

| Action | Behavior |
|--------|----------|
| Tap/click the card | Nothing — records are not navigable. They're a trophy case. |
| Hover (desktop) | No elevation change. Non-interactive. |

Like the Commendation widget, this is intentionally non-interactive. It's a display, not a link.

---

## 8. Role Visibility

| Role | Records shown |
|------|--------------|
| ADMIN | All 4 records |
| MANAGER | All 4 records |
| STAFF | All 4 records |
| TRAINER | Only "Most Check-ins" (the other 3 are sales-related) |

For TRAINER, the card shows 1 record instead of 4. The title stays "Personal Bests" (singular "best" would be grammatically wrong for a card that might grow).

---

## 9. Record-Breaking Detection Logic

On dashboard load, after Phase 2 (Today's Sales) and Phase 6 (Members Checked In) data is available:

```typescript
async checkAndUpdateRecords(
    todayTotal: number,
    todayTxCount: number,
    todayCheckIns: number,
    highestSingleTx: number  // max(tx.totalAmount) from today's transactions
): Promise<{ broken: string[] }> {
    const uid = this.authService.userProfile()?.uid;
    if (!uid) return { broken: [] };

    // 1. Read current records
    const docRef = doc(this.firestore, 'staff_records', uid);
    const snap = await getDoc(docRef);
    const current = snap.exists() ? snap.data() as StaffRecords : null;

    const updates: Partial<StaffRecords> = {};
    const broken: string[] = [];
    const today = new Date();

    // 2. Compare each record
    if (todayTotal > (current?.highestDailySales?.value || 0)) {
        updates.highestDailySales = { value: todayTotal, date: today, txCount: todayTxCount };
        broken.push('highestDailySales');
    }

    if (todayTxCount > (current?.mostTransactionsInDay?.value || 0)) {
        updates.mostTransactionsInDay = { value: todayTxCount, date: today };
        broken.push('mostTransactionsInDay');
    }

    if (highestSingleTx > (current?.highestSingleTransaction?.value || 0)) {
        updates.highestSingleTransaction = { value: highestSingleTx, date: today, transactionId: '' };
        broken.push('highestSingleTransaction');
    }

    if (todayCheckIns > (current?.mostCheckInsInDay?.value || 0)) {
        updates.mostCheckInsInDay = { value: todayCheckIns, date: today };
        broken.push('mostCheckInsInDay');
    }

    // 3. Write only if something broke
    if (broken.length > 0) {
        updates.lastUpdated = today;
        await setDoc(docRef, updates, { merge: true });
    }

    return { broken };
}
```

**Important:** The `todayTotal` and `todayTxCount` come from Phase 2's data (already fetched). The `todayCheckIns` comes from Phase 6's data (already fetched). No additional Firestore queries needed for the comparison values — only 1 read for the records document itself.

---

## 10. Edge Cases

| Scenario | Behavior |
|----------|----------|
| Brand new staff (no records doc) | `snap.exists()` returns false. All comparisons use 0 as baseline. First sale/check-in sets all applicable records. |
| Staff breaks 2 records in one day | Both updated in a single `setDoc` with `merge: true`. Both shown with gold highlight. |
| Record broken, staff revisits dashboard | Cache invalidated by the write. Re-read shows the new record (no longer highlighted as "NEW" — the highlight is a one-time signal on the visit where it was detected). |
| Record broken on a day with VOID transactions | `todayTotal` from Phase 2 includes VOIDs (known gap). The record might be inflated. Acceptable — when the VOID exclusion fix is applied globally, records will self-correct on the next record-breaking day. |
| Staff has records from months ago | Records persist forever. "Best Day: ₱12,450 (Oct 15, 2025)" — the date gives context. |
| Two staff members break records simultaneously | Each has their own `staff_records/{uid}` document. No contention. |
| Firestore write fails (network issue) | Record not saved. Next dashboard visit re-checks and re-attempts. No data loss — the record is re-derived from live data. |

---

## 11. Component Spec

**File:** `src/app/features/dashboard/widgets/personal-bests/personal-bests.ts`

**New model file:** `src/app/core/models/staff-records.model.ts`

**New service method:** Add `checkAndUpdateRecords()` to `DashboardCacheService` or a new `StaffRecordsService`.

**Recommended:** New `StaffRecordsService` in `src/app/core/services/staff-records.service.ts` — keeps the records logic separate from the cache service.

**Injections:** `StaffRecordsService`, `AuthService`

**Signals:**
- `records = signal<StaffRecords | null>(null)`
- `brokenRecords = signal<string[]>([])`
- `isLoading = signal(true)`

**Computed:**
- `hasAnyRecord = computed(() => { const r = records(); return r && (r.highestDailySales || r.mostTransactionsInDay || r.highestSingleTransaction || r.mostCheckInsInDay); })`
- `isRecordBroken = (key: string) => brokenRecords().includes(key)`

---

## 12. Firestore Security Rules

```
match /staff_records/{uid} {
    allow read: if request.auth != null && request.auth.uid == uid;
    allow write: if request.auth != null && request.auth.uid == uid;
}
```

Each staff can only read/write their own records. No cross-staff access.

---

## 13. Firestore Index Requirements

None. `staff_records/{uid}` is a single document read by ID. No queries, no indexes.

---

## Next Step

Phase 13: Per-Staff Goal Setting — admin-set or self-set monthly targets.
