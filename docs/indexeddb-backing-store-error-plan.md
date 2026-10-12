# Implementation Plan: IndexedDB Backing Store & Query Initialization Resilience

## 1. Executive Summary & Root Cause Analysis

### 1.1 Error Report Details
- **Error**: `Initialization of query 'Query(target=Target(users/DLeJiN380uOam4ntbdGCSYHjRe73/notifications, limit: 50, orderBy: [timestamp (desc), __name__ (desc)]); limitType=F)' failed: IndexedDbTransactionError: [code=unavailable]: IndexedDB transaction 'Allocate target' failed: UnknownError: Internal error opening backing store for indexedDB.open.`
- **Error Name**: `FirebaseError`
- **Location / Route**: `/staff-attendance`
- **User**: `Jireh Padua (DLeJiN380uOam4ntbdGCSYHjRe73) - Roles: [ADMIN]`

### 1.2 Root Cause Analysis
1. **Firestore Cache Architecture**:
   In [`src/app/app.config.ts`](file:///e:/Programming/epicenter-app2/src/app/app.config.ts#L21-L23), Firestore is configured with `persistentLocalCache({ tabManager: persistentMultipleTabManager() })`:
   ```typescript
   provideFirestore(() => initializeFirestore(getApp(), {
     localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
   }))
   ```
2. **Underlying Browser Cause**:
   The error `Internal error opening backing store for indexedDB.open` is a low-level Chromium/WebKit IndexedDB engine failure (`UnknownError`). This typically happens when:
   - Multiple browser tabs are open and one holds an exclusive lock or enters an unexpected recovery state.
   - The user's browser profile experiences temporary disk exhaustion, OS-level file lock, or corrupted IndexedDB leveldb files for the origin.
   - The browser is closing or waking from sleep while an IndexedDB transaction is being requested.
3. **Query Target**:
   The target query is in [`NotificationService.setupNotificationsListener`](file:///e:/Programming/epicenter-app2/src/app/core/services/notification.service.ts#L57-L64):
   ```typescript
   const notifCol = collection(this.firestore, `users/${userId}/notifications`);
   const q = query(notifCol, orderBy('timestamp', 'desc'), limit(50));
   this.notificationsSub = (collectionData(q, { idField: 'id' }) as Observable<NotificationItem[]>).subscribe(notifs => ...);
   ```
   Notice that the notification listener starts automatically in `NotificationService` whenever any authenticated user navigates any page (the error was recorded on `/staff-attendance` because that was the page the admin was currently viewing when the listener initiated/reconnected).
4. **Resilience Gap**:
   - `NotificationService.setupNotificationsListener` attaches an `.subscribe(notifs => ...)` without an `error: (err) => ...` callback. Any error emitted by the Firestore Observable bubbles straight to Angular's `GlobalErrorHandler`.
   - `GlobalErrorHandler` currently only suppresses benign messaging push unsupported errors and chunk load reload errors, but does not provide auto-recovery or mitigation for corrupted/unavailable IndexedDB caches.
   - If IndexedDB becomes corrupted or unavailable, the application keeps throwing `IndexedDbTransactionError` on queries.

---

## 2. Proposed Architecture & Remediation Strategy

### Step 1: Defensive Subscription Handling in `NotificationService`
- In [`src/app/core/services/notification.service.ts`](file:///e:/Programming/epicenter-app2/src/app/core/services/notification.service.ts), update the `collectionData(q, ...)` subscription to include an error handler.
- If an IndexedDB or Firestore error occurs:
  - Log a diagnostic warning without letting an unhandled rejection escape.
  - Set fallback state (`notifications.set([])`, `unreadCount.set(0)`).
  - Attempt an exponential backoff retry or notify the system.

### Step 2: Global Recovery & Detection in `GlobalErrorHandler`
- In [`src/app/core/handlers/global-error-handler.ts`](file:///e:/Programming/epicenter-app2/src/app/core/handlers/global-error-handler.ts):
  - Detect `IndexedDbTransactionError` or `Internal error opening backing store for indexedDB.open`.
  - Log the occurrence to Firestore so administrators have visibility.
  - Implement self-healing: if an unrecoverable IndexedDB backing store error occurs repeatedly or locks the session, prompt the user or offer automatic cache remediation (such as offering a quick cache flush / reload).

### Step 3: Verification & Compilation
- Run `npm run build` (`gym-app`)
- Run `npm run build:members` (`members-portal`)
- Audit test runs and confirm no side effects on kiosk check-in, bookings, or offline storage.
