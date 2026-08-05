# Workflow & Sequence Diagrams (Dexie.js + Firestore Sync)

> **Document Part:** 7 of 7  
> **Topic:** Visual Sequence Diagrams for Data Read, Offline Write, and Sync Workflows  

---

## 1. Cache-First Read Workflow

```mermaid
sequenceDiagram
    autonumber
    actor User as UI Component
    participant Repo as ProductRepository
    participant Dexie as Dexie.js (IndexedDB)
    participant Sync as SyncEngineService
    participant FS as Firebase Firestore

    User->>Repo: subscribe to getProducts()
    Repo->>Dexie: liveQuery(() => table.toArray())
    Dexie-->>User: Emit local cached data (0ms latency)
    
    Note over Sync, FS: Background Delta Sync (Non-blocking)
    Sync->>FS: Fetch updates where updatedAt > lastSyncTime
    FS-->>Sync: Return updated product delta docs
    Sync->>Dexie: Bulk write/update local table
    Dexie-->>User: liveQuery automatically re-emits updated list
```

---

## 2. Offline Mutation & Outbox Sync Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Staff User
    participant Component as POS Component
    participant Repo as StoreRepository
    participant Dexie as Dexie.js Store
    participant Outbox as Dexie Outbox Queue
    participant Sync as SyncEngineService
    participant CF as Firebase Cloud Function (processSale)
    participant FS as Firebase Firestore

    Staff->>Component: Click "Complete Sale" (Offline or Online)
    Component->>Repo: processSale(salePayload)
    Repo->>Dexie: Generate clientTxId (UUID v4)
    Repo->>Dexie: Optimistically add sale to local UI cache
    Repo->>Outbox: Add item { clientTxId, payload, status: 'PENDING' }
    
    alt Network is Online
        Sync->>CF: Call httpsCallable('processSale', { clientTxId, ...payload })
        CF->>FS: Check idempotency collection (/processed_transactions/{clientTxId})
        FS-->>CF: Not processed yet -> Execute transaction
        CF->>FS: Write sale doc & deduct stock
        CF-->>Sync: Return { success: true, saleId }
        Sync->>Outbox: Remove pending item
        Sync->>Dexie: Update local item with server saleId
    else Network is Offline
        Note over Sync, Outbox: Network down. Item remains in Outbox.
        Sync->>Sync: Wait for 'online' event
        Note over Staff, Sync: Connection Restored!
        Sync->>CF: Flush Outbox -> Call processSale with clientTxId
        CF-->>Sync: Success -> Clear Outbox Queue item
    end
```

---

## 3. Multi-Tab Synchronization Workflow

```mermaid
sequenceDiagram
    autonumber
    participant TabA as Browser Tab A (Staff POS)
    participant DexieA as Dexie DB (Tab A)
    participant BC as BroadcastChannel ('epicenter_dexie_sync')
    participant DexieB as Dexie DB (Tab B)
    participant TabB as Browser Tab B (Dashboard)

    TabA->>DexieA: Write new POS Sale or Product update
    DexieA-->>BC: PostMessage ({ type: 'CACHE_INVALIDATED', tables: ['products'] })
    BC-->>TabB: Receive broadcast event
    TabB->>DexieB: Trigger liveQuery refresh
    DexieB-->>TabB: UI updates instantly in Tab B
```
