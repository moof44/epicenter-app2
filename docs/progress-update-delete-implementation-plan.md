# Progress Entry Update & Soft Delete — Implementation Plan

> Date: April 16, 2026
> Scope: Allow editing and soft-deleting member progress (measurement) entries
> Role: Senior Systems Analyst + Senior Angular Developer

---

## ⚠️ PRE-IMPLEMENTATION: Check Steering & Hooks

| Steering | Key Rules |
|----------|-----------|
| `coding-standards.md` | `OnPush` on new/modified components. `inject()` pattern. `writeBatch` for related multi-doc updates. No hardcoded hex colors. Spacing multiples of 8px. |
| `structure.md` | Services in `core/services/`. Models in `core/models/`. Separate `.html`/`.css` files. Audit trail: `lastModifiedBy` with `{ uid, name, timestamp }`. |
| `ux-guidelines.md` | `MatSnackBar` for async feedback. Prefer "Undo" snackbar over confirmation dialog for reversible actions. Use dialogs only for permanent data destruction. Skeleton loaders. Empty states. Touch targets ≥ 44px. |
| `business-rules.md` | No direct relevance (progress data is not financial). But audit trail pattern applies. |
| `tech.md` | Angular 21, Angular Material 21, plain CSS, Firestore via `@angular/fire`. |

| Hook | Trigger | Action |
|------|---------|--------|
| `code-quality-review` | On file edit | Analyze for code smells, patterns |
| `quality-assurance` | After task completion | QA attack mode, generate test report |
| `systems-documentation-update` | After task completion | Update `project-analysis.md` if logic changed |

---

## Current State Analysis

### Firestore Structure

```
members/{memberId}/measurements/{docId}
├── date: Timestamp
├── weight: number
├── bodyFat: number
├── ... (18 fields total)
└── (NO audit trail fields — createdBy/lastModifiedBy missing)
```

### Existing Service Methods

```typescript
// ProgressService — current state
getTimeSeries(memberId: string): Observable<Measurement[]>  // Read (limit 50, ordered by date desc)
addEntry(memberId: string, data: Measurement): Promise<any>  // Create only
// NO update method
// NO delete method
```

### Existing UI

- **Dashboard** (`/members/:id/progress`): Stats grid + history table. No edit/delete buttons.
- **Form** (`/members/:id/progress/new`): Create-only form. No edit mode.
- **History table**: 18 columns, horizontal scroll. Each row is a measurement entry. No action column.

### What's Missing

1. `updateEntry()` method in `ProgressService`
2. `softDeleteEntry()` method in `ProgressService`
3. Edit button on each history row
4. Delete button on each history row
5. Edit mode in the form (pre-fill from existing entry)
6. `deleted_measurements` collection for soft-deleted entries
7. Audit trail (`createdBy`/`lastModifiedBy`) on measurement documents
8. Confirmation UX for delete (undo snackbar per steering)

---

## Data Model Changes

### Updated `Measurement` Interface

```typescript
export interface Measurement {
    id?: string;
    date: any;
    weight: number;
    bodyFat: number;
    // ... all 18 existing fields ...
    
    // NEW: Audit trail (per structure.md convention)
    createdBy?: { uid: string; name: string; timestamp: any };
    lastModifiedBy?: { uid: string; name: string; timestamp: any };
}
```

### New `DeletedMeasurement` Interface

```typescript
export interface DeletedMeasurement extends Measurement {
    deletedBy: { uid: string; name: string; timestamp: any };
    deletedFrom: string; // Original path: "members/{memberId}/measurements"
    originalMemberId: string;
    originalDocId: string;
}
```

### New Firestore Collection

```
deleted_measurements/{docId}   ← Root collection (not subcollection)
├── ... all original Measurement fields ...
├── deletedBy: { uid, name, timestamp }
├── deletedFrom: "members/{memberId}/measurements"
├── originalMemberId: string
└── originalDocId: string
```

**Why root collection?** Per steering (`coding-standards.md`): "High-volume data (Logs, Transactions) must be in root collections, not embedded in documents." Deleted measurements are audit/log data — they belong in a root collection for easy querying across all members.

---

## Service Changes

### `ProgressService` — New Methods

```typescript
// Update an existing measurement entry
async updateEntry(memberId: string, docId: string, data: Partial<Measurement>): Promise<void> {
    const docRef = doc(this.firestore, `members/${memberId}/measurements`, docId);
    const trace = this._currentUserSnapshot;
    await updateDoc(docRef, { ...data, lastModifiedBy: trace });
}

// Soft delete: move to deleted_measurements, remove from original location
async softDeleteEntry(memberId: string, docId: string): Promise<void> {
    const batch = writeBatch(this.firestore);
    
    // 1. Read the original document
    const originalRef = doc(this.firestore, `members/${memberId}/measurements`, docId);
    const snap = await getDoc(originalRef);
    if (!snap.exists()) throw new Error('Measurement not found');
    
    const originalData = snap.data() as Measurement;
    const trace = this._currentUserSnapshot;
    
    // 2. Write to deleted_measurements (root collection)
    const deletedRef = doc(collection(this.firestore, 'deleted_measurements'));
    batch.set(deletedRef, {
        ...originalData,
        deletedBy: trace,
        deletedFrom: `members/${memberId}/measurements`,
        originalMemberId: memberId,
        originalDocId: docId,
    });
    
    // 3. Delete from original location
    batch.delete(originalRef);
    
    // 4. Commit atomically
    await batch.commit();
}

// Undo a soft delete: move back from deleted_measurements to original location
async restoreEntry(deletedDocId: string): Promise<void> {
    const batch = writeBatch(this.firestore);
    
    // 1. Read from deleted_measurements
    const deletedRef = doc(this.firestore, 'deleted_measurements', deletedDocId);
    const snap = await getDoc(deletedRef);
    if (!snap.exists()) throw new Error('Deleted measurement not found');
    
    const data = snap.data();
    const memberId = data['originalMemberId'];
    const originalDocId = data['originalDocId'];
    
    // 2. Restore to original location
    const { deletedBy, deletedFrom, originalMemberId, originalDocId: _, ...measurementData } = data;
    const originalRef = doc(this.firestore, `members/${memberId}/measurements`, originalDocId);
    batch.set(originalRef, measurementData);
    
    // 3. Remove from deleted_measurements
    batch.delete(deletedRef);
    
    await batch.commit();
}
```

**Key design decisions:**
- `softDeleteEntry` uses `writeBatch` for atomicity (per steering: "ALL related data updates must use `writeBatch`")
- The deleted doc preserves the original `docId` so it can be restored to the exact same path
- `restoreEntry` enables the "Undo" snackbar pattern (per UX guidelines: "Prefer undo snackbar over confirmation dialog for reversible actions")

### `ProgressService` — Add Audit Trail to `addEntry`

```typescript
async addEntry(memberId: string, data: Measurement): Promise<any> {
    const colRef = collection(this.firestore, `members/${memberId}/measurements`);
    const trace = this._currentUserSnapshot;
    return addDoc(colRef, { ...data, createdBy: trace, lastModifiedBy: trace });
}
```

### `ProgressService` — Add `_currentUserSnapshot` Getter

The service currently doesn't have this. Add it following the same pattern as `MemberService`, `ProductService`, etc.:

```typescript
private authService = inject(AuthService);

private get _currentUserSnapshot() {
    const user = this.authService.userProfile();
    if (!user) throw new Error('Action requires authentication');
    return { uid: user.uid, name: user.displayName, timestamp: new Date() };
}
```

---

## UI Changes

### Phase 1: Add Actions Column to History Table

**File:** `progress-dashboard.html` + `progress-dashboard.ts`

Add an `actions` column to the history table with Edit and Delete icon buttons:

```html
<ng-container matColumnDef="actions">
    <th mat-header-cell *matHeaderCellDef> </th>
    <td mat-cell *matCellDef="let m">
        <button mat-icon-button matTooltip="Edit" (click)="editEntry(m); $event.stopPropagation()">
            <mat-icon>edit</mat-icon>
        </button>
        <button mat-icon-button matTooltip="Delete" color="warn" (click)="deleteEntry(m); $event.stopPropagation()">
            <mat-icon>delete</mat-icon>
        </button>
    </td>
</ng-container>
```

Add `'actions'` to `historyColumns` array.

**Touch targets:** Both buttons are `mat-icon-button` which is 40px by default. Per steering, minimum is 44px. Add CSS: `button[mat-icon-button] { min-width: 44px; min-height: 44px; }`.

**Mobile:** On mobile, the actions column should be sticky (fixed to the right) so it's always visible even when the table scrolls horizontally.

### Phase 2: Edit Mode in Progress Form

**File:** `progress-form.ts` + `progress-form.html`

The existing form at `/members/:id/progress/new` becomes dual-purpose:
- **Create mode:** URL is `/members/:id/progress/new` (no `entryId` param). Form is empty.
- **Edit mode:** URL is `/members/:id/progress/edit/:entryId`. Form pre-fills from existing data.

**Route addition:**
```typescript
{
    path: 'members/:id/progress/edit/:entryId',
    component: ProgressForm,
    canActivate: [authGuard, roleGuard],
    data: { animation: 'FormPage', roles: ['ADMIN', 'MANAGER', 'STAFF', 'TRAINER'] }
}
```

**Form changes:**
- On init, check for `entryId` route param
- If present: fetch the measurement doc, pre-fill the form, change title to "Edit Measurement Entry"
- On submit: call `updateEntry()` instead of `addEntry()`
- Show `MatSnackBar` on success: "Entry updated" / "Entry saved"

### Phase 3: Delete with Undo Snackbar

**File:** `progress-dashboard.ts`

When the user clicks Delete:
1. Call `progressService.softDeleteEntry(memberId, docId)`
2. Show `MatSnackBar` with "Entry deleted" + "Undo" action button
3. If user clicks "Undo" within 5 seconds: call `progressService.restoreEntry(deletedDocId)`
4. The `measurements$` Observable auto-updates (real-time listener) — the deleted entry disappears immediately

**Per UX guidelines:** "Prefer undo snackbar over confirmation dialog for reversible actions." Since soft delete is reversible (we can restore), use the undo pattern instead of a "Are you sure?" dialog.

**Snackbar code:**
```typescript
async deleteEntry(measurement: Measurement): Promise<void> {
    if (!this.memberId || !measurement.id) return;
    
    try {
        const deletedDocId = await this.progressService.softDeleteEntry(this.memberId, measurement.id);
        
        const snackRef = this.snackBar.open('Entry deleted', 'Undo', { duration: 5000 });
        snackRef.onAction().subscribe(async () => {
            await this.progressService.restoreEntry(deletedDocId);
            this.snackBar.open('Entry restored', 'Close', { duration: 2000 });
        });
    } catch (err: any) {
        this.snackBar.open('Delete failed: ' + err.message, 'Close', { duration: 3000 });
    }
}
```

### Phase 4: Edit Navigation from Dashboard

**File:** `progress-dashboard.ts`

```typescript
editEntry(measurement: Measurement): void {
    if (!this.memberId || !measurement.id) return;
    this.router.navigate(['/members', this.memberId, 'progress', 'edit', measurement.id]);
}
```

---

## Responsive Design

### Desktop (≥1200px)

Actions column visible at the end of the table. Edit and Delete buttons side by side.

### Tablet (600-1199px)

Same as desktop — table scrolls horizontally, actions column at the end.

### Mobile (<600px)

Actions column sticky to the right edge of the table so it's always visible during horizontal scroll:

```css
.mat-column-actions {
    position: sticky;
    right: 0;
    background: white;
    z-index: 1;
    box-shadow: -4px 0 8px rgba(0, 0, 0, 0.05);
}
```

Both buttons stack vertically on very small screens if needed, but `mat-icon-button` at 44px is compact enough to fit side by side.

---

## Firestore Cost Analysis

| Operation | Reads | Writes |
|-----------|-------|--------|
| Edit entry | 0 (form pre-fills from route, data fetched via existing `getTimeSeries` listener) | 1 (updateDoc) |
| Soft delete | 1 (getDoc to read original) | 2 (set deleted + delete original, in batch) |
| Undo restore | 1 (getDoc from deleted_measurements) | 2 (set original + delete deleted, in batch) |

**Total per edit:** 1 write.
**Total per delete:** 1 read + 2 writes.
**Total per undo:** 1 read + 2 writes.

Minimal cost. No new listeners or queries.

---

## Implementation Phases

### Phase 1: Service Layer (no UI changes)

**Files modified:**
- `src/app/core/models/measurement.model.ts` — add audit trail fields
- `src/app/core/services/progress.service.ts` — add `updateEntry`, `softDeleteEntry`, `restoreEntry`, `_currentUserSnapshot`, update `addEntry` with audit trail

**Files created:**
- None (model changes are in existing file)

**Risk:** LOW — adding methods to a service doesn't affect existing functionality. The `addEntry` change adds `createdBy`/`lastModifiedBy` fields to new entries but doesn't break reading old entries (the fields are optional).

**Review checkpoint:**
- [ ] `ng build` passes
- [ ] `writeBatch` used for soft delete (atomicity)
- [ ] Audit trail follows `{ uid, name, timestamp }` pattern per `structure.md`
- [ ] `softDeleteEntry` returns the deleted doc ID (needed for undo)

### Phase 2: History Table Actions Column

**Files modified:**
- `src/app/features/progress/components/progress-dashboard/progress-dashboard.html` — add actions column
- `src/app/features/progress/components/progress-dashboard/progress-dashboard.ts` — add `editEntry`, `deleteEntry` methods, inject `Router`, `MatSnackBar`, `ProgressService`
- `src/app/features/progress/components/progress-dashboard/progress-dashboard.css` — sticky actions column on mobile

**Risk:** LOW — adding a column to an existing table. No data changes.

**Review checkpoint:**
- [ ] `ng build` passes
- [ ] Actions column visible on desktop, sticky on mobile
- [ ] Touch targets ≥ 44px
- [ ] Delete uses undo snackbar (not confirmation dialog)
- [ ] Edit navigates to `/members/:id/progress/edit/:entryId`

### Phase 3: Edit Mode in Form

**Files modified:**
- `src/app/app.routes.ts` — add edit route
- `src/app/features/progress/components/progress-form/progress-form.ts` — add edit mode detection, data pre-fill, conditional submit
- `src/app/features/progress/components/progress-form/progress-form.html` — dynamic title ("New" vs "Edit")

**Risk:** MEDIUM — modifying the form component. Must ensure create mode still works after adding edit mode.

**Review checkpoint:**
- [ ] `ng build` passes
- [ ] Create mode (`/new`) still works exactly as before
- [ ] Edit mode (`/edit/:entryId`) pre-fills all 18 fields
- [ ] Edit submit calls `updateEntry` (not `addEntry`)
- [ ] Success snackbar shown on both create and edit
- [ ] Back navigation returns to progress dashboard

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Delete the latest entry | Stats grid updates to show the new latest (real-time listener). Diffs recalculate. |
| Delete all entries | Empty state shown. Stats grid hidden. |
| Edit a date to be newer than the current latest | The entry moves to the top of the list. Stats grid updates. |
| Undo after navigating away | Undo snackbar disappears on route change. The delete is permanent (no undo). Acceptable — the data is in `deleted_measurements` and can be restored manually by admin. |
| Two users editing the same entry | Last write wins (Firestore default). No conflict resolution needed for measurement data. |
| Entry has no `id` (shouldn't happen) | Guard: `if (!measurement.id) return`. Buttons disabled if id is missing. |
| Legacy entries without `createdBy` | The field is optional. Old entries display without audit info. New/edited entries get the trail. |

---

## Files Summary

| File | Action | Phase |
|------|--------|-------|
| `src/app/core/models/measurement.model.ts` | Modify (add audit fields) | 1 |
| `src/app/core/services/progress.service.ts` | Modify (add update, softDelete, restore, audit) | 1 |
| `src/app/features/progress/components/progress-dashboard/progress-dashboard.html` | Modify (add actions column) | 2 |
| `src/app/features/progress/components/progress-dashboard/progress-dashboard.ts` | Modify (add edit/delete methods) | 2 |
| `src/app/features/progress/components/progress-dashboard/progress-dashboard.css` | Modify (sticky actions) | 2 |
| `src/app/app.routes.ts` | Modify (add edit route) | 3 |
| `src/app/features/progress/components/progress-form/progress-form.ts` | Modify (add edit mode) | 3 |
| `src/app/features/progress/components/progress-form/progress-form.html` | Modify (dynamic title) | 3 |
