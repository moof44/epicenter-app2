# 04. Conflict Resolution & Multi-Tab Synchronization

> **Document Part:** 4 of 7  
> **Topic:** Conflict Handling, Server-Authoritative Merging, and Multi-Tab Dexie Sync  

---

## ⚡ 1. Conflict Types & Resolution Strategies

When offline updates or concurrent multi-device updates occur, data collisions must be handled predictably.

| Conflict Scenario | Resolution Strategy | Detailed Mechanism |
| :--- | :--- | :--- |
| **Concurrent Stock Deductions (POS)** | **Server-Authoritative Check** | Local UI optimistically decrements stock. When synced, Cloud Function validates real-time Firestore stock. If stock drops below 0, transaction fails gracefully and notifies staff. |
| **Profile Metadata Edits (Name, Phone)** | **Last-Write-Wins (LWW) with Server Timestamps** | Each update attaches `updatedAt: serverTimestamp()`. The update with the higher server timestamp overwrites the record. |
| **Duplicate Attendance Check-in** | **Idempotent Unique Key Constraint** | Check-in ID is constructed as `checkin_{memberId}_{dateString}`. Concurrent check-in attempts resolve to the same Firestore document ID, preventing duplicates. |
| **Offline Shift Cash Ledger Edits** | **Append-Only Delta Ledger** | Cash logs are stored as immutable entries (`cash_entries` subcollection or array append) rather than mutating a single total sum field. |

---

## 🌐 2. Multi-Tab Synchronization (Dexie + BroadcastChannel)

When a staff member opens multiple browser tabs in `gym-app` or a member opens multiple tabs in `members-portal`:

1. **IndexedDB Cross-Tab Storage Events:**  
   Dexie.js automatically detects IndexedDB writes across browser tabs in the same domain origin.
2. **`BroadcastChannel` Sync Notification:**  
   The `SyncEngineService` initializes a `BroadcastChannel('epicenter_dexie_sync')`.
   When Tab A processes an outbox queue or receives a delta sync from Firestore, it broadcasts a lightweight message:
   ```json
   { "type": "DEXIE_CACHE_INVALIDATED", "tables": ["products", "members"], "timestamp": 1785967000000 }
   ```
3. Tab B receives the broadcast and automatically refreshes its RxJS `liveQuery` or Signal state smoothly.
