# 03. Cloud Functions & Mutation Outbox Architecture

> **Document Part:** 3 of 7  
> **Topic:** Handling Offline Mutations, Idempotency Keys, and Firebase Cloud Functions (`httpsCallable`)  

---

## 🛰️ 1. Overview & Problem Statement

Many core operations in `gym-app` rely on Firebase Cloud Functions (e.g., `processSale`, `registerCheckin`, `createStaffAccount`, `evalGamification`). 

Cloud Functions **cannot be called directly when offline**. To ensure smooth offline functionality without losing transactions, we implement the **Outbox Pattern** using Dexie.js.

---

## 📬 2. The Outbox Pattern Design

When an action requiring a Cloud Function occurs (e.g., POS sale or check-in):

```
1. User clicks Action Button (e.g. "Complete Sale")
2. Generate Client Idempotency Key (UUID v4)
3. Optimistically write record to Dexie Local Store (Instant UI feedback)
4. Push Mutation Task into Dexie Outbox Store (`outboxQueue`)
5. If Online:
     ➜ Execute Cloud Function immediately with Idempotency Key
     ➜ On Success: Remove task from `outboxQueue`, update Dexie store with server result
   If Offline:
     ➜ Task remains persisted in `outboxQueue`
     ➜ SyncEngine listens for 'online' event & background retry
```

---

## 🔑 3. Idempotency & Duplicate Prevention

To prevent duplicate processing (e.g., charging a customer twice or double-deducting stock if a network disconnect occurs during a Cloud Function call):

1. **Client-Side UUID Generation:**  
   Every outbox mutation includes a unique `clientTxId: string` (e.g., `tx_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d`).

2. **Server-Side Idempotency Check:**  
   The Cloud Function checks if `clientTxId` already exists in Firestore (`/processed_transactions/{clientTxId}`).
   - If it exists: Return the existing result without re-executing logic.
   - If it does not exist: Execute transaction, write result to `/processed_transactions/{clientTxId}`, and return success.

---

## 🔄 4. Outbox Queue Schema (Dexie.js)

```typescript
export interface OutboxItem {
  id?: number;               // Dexie auto-increment primary key
  clientTxId: string;        // UUID for idempotency
  type: 'POS_SALE' | 'CHECKIN' | 'MEMBER_UPDATE' | 'WORKOUT_LOG';
  payload: any;              // Function parameters
  status: 'PENDING' | 'PROCESSING' | 'FAILED';
  retryCount: number;
  lastError?: string;
  createdAt: number;         // Epoch timestamp
}
```

---

## 🛠️ 5. Error & Failure Handling

- **Transient Errors (Network disconnect, timeout 503):**  
  Keep item in `outboxQueue`, increment `retryCount`, apply exponential backoff (e.g., retry in 5s, 15s, 60s).
- **Fatal Business Validation Errors (e.g., "Insufficient Stock", "Member Suspended"):**  
  Mark outbox status as `'FAILED'`, notify user via UI Toast / Notification Center, and offer a manual "Resolve / Rollback" option.
