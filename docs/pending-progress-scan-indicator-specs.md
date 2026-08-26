# Specification: Member List Pending Progress Scan Indicator & Filter

## 1. Overview
When gym staff uploads a Starfit / InBody body composition scan sheet without entering numeric biometric data (weight, fat %, muscle %, etc.), the system flags the member as having **Pending Scan Data**. 

This specification defines:
1. Visual indicators on the **Members List** (`/members`) to immediately spot members with untranscribed scan reports.
2. A fast **Progress Filter** dropdown in the Members list to view all members requiring progress entry updates.
3. Automatic database state sync (`hasPendingProgressScan`) maintained in real-time via Dexie.js offline cache and Firebase Cloud Functions.

---

## 2. Data Schema & Models

### `Member` Model (`src/app/core/models/member.model.ts`)
```typescript
export interface Member {
    // ... existing properties
    hasPendingProgressScan?: boolean; // true if any attached scan has missing weight/metrics
    pendingProgressDate?: any;        // Date/Timestamp of the latest pending scan
}
```

### Dexie IndexedDB Schema (`src/app/core/services/dexie/app-indexeddb.service.ts`)
Version bumped to 4:
```typescript
this.version(4).stores({
    members: 'id, name, membershipStatus, portalUid, hasPendingProgressScan',
    products: 'id, name, category, stock',
    outboxQueue: '++id, clientTxId, type, status, createdAt',
});
```

---

## 3. Architecture & Synchronization Flow

### A. Real-Time Cloud Function Trigger (`onMeasurementWrite`)
- Listens to `/members/{memberId}/measurements/{measurementId}` (`onCreate`, `onUpdate`, `onDelete`).
- Scans the subcollection for any measurement with `reportImageUrl && (!weight || weight <= 0)`.
- Updates `members/{memberId}.hasPendingProgressScan = true | false` and `pendingProgressDate`.

### B. Client-side Optimistic Update (`progress.service.ts`)
- When staff saves a measurement in `ProgressForm`:
  - If `reportImageUrl` exists and `!weight`, immediately updates parent member `hasPendingProgressScan: true`.
  - When staff fills in the numbers and saves, checks if all scans are transcribed and sets `hasPendingProgressScan: false`.

---

## 4. UI / UX Design in Member List

### A. Filter Dropdown
In the filters toolbar of `member-list.html`:
- **All Progress** (default)
- **⏳ Pending Scan Data Entry** (shows only members where `hasPendingProgressScan === true`)
- **✓ Progress Up to Date** (shows members with no pending scan entries)

### B. Visual Status Badges
1. **Name / Biometric Column**:
   - Members with pending scans display a stylized badge:
     `[⏳ Scan Data Pending]` with tooltip *"Scan report uploaded — numerical metrics pending transcription"*.
2. **Actions Column (View Progress Button)**:
   - The "View Progress" icon button features a notification indicator when scans are awaiting numeric entry, inviting staff to click and transcribe.
