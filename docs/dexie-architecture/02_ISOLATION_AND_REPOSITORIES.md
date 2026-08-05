# 02. Isolation & Repository Architecture

> **Document Part:** 2 of 7  
> **Topic:** Single Responsibility, Non-Breaking Design, and Repository Abstractions  

---

## 🏗️ 1. Architectural Strategy: Isolated Data Access Layer

To prevent breaking existing feature components or confusing existing Angular services/listeners, Dexie.js integration follows the **Repository Pattern**.

### Key Requirement Addressed:
> *"I want this to be isolated, single responsibility and will not introduce breaking changes. Since dexie.js implementation can be a separate execution, I expect that the previous listener which listens directly from Firestore won't be confused as it is not their responsibility..."*

---

## 🧩 2. Component Stack & Separation of Concerns

```
[ Angular UI Component ] (e.g. SalesByUser, ProductList, MemberCheckin)
         │
         ▼ (Subscribes to Signals or RxJS Observables)
[ Feature Service / Repository ] (e.g. ProductRepository, MemberRepository)
         │
    ┌────┴──────────────────────────┐
    ▼                               ▼
[ Dexie.js Local Cache ]     [ SyncEngine Service ]
(IndexedDB Instant Reads)           │
                                    ▼ (Background Delta Sync / Outbox)
                            [ Firebase Firestore / Cloud Functions ]
```

---

## 🧱 3. Layer Responsibilities

### 1. Dexie Database Layer (`AppIndexedDbService`)
- Responsible **ONLY** for IndexedDB schema definitions, object stores, indexes, and low-level CRUD operations.
- Completely unaware of Firebase, HTTP, or Angular UI state.

### 2. SyncEngine Service (`SyncEngineService`)
- Responsible for background delta synchronization between Firestore and Dexie.js.
- Manages Firestore collection snapshot listeners, delta timestamps (`updatedAt > lastSyncTime`), and populating Dexie.js stores.
- Manages the **Outbox Queue** execution when network connection is restored (`window.addEventListener('online')`).

### 3. Repository Layer (`ProductRepository`, `MemberRepository`)
- Abstracts data access away from UI components.
- Exposes RxJS Observables/Signals created using Dexie's `liveQuery(() => dexieTable.toArray())`.
- When UI components call `getProducts()`, they read instantly from Dexie.js.
- UI components **never directly import Firestore SDK or Dexie SDK**—they interact strictly through the Angular Repository service.

---

## ⚡ 4. Preventing Listener Conflicts & Confused State

- **Independent Execution Loop:**  
  Existing direct Firestore listeners (if any) and the new Dexie Sync Engine operate in separate RxJS streams.
- **Single Source of Truth for UI:**  
  Components switch their subscription target from `Firestore collectionData()` to `Repository.getLive()`.
- **No Duplicate Event Flooding:**  
  Because Dexie's `liveQuery` only emits when local IndexedDB changes, local UI updates are deterministic and do not trigger duplicate HTTP or Firestore queries.
