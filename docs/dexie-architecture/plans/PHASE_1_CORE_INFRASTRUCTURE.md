# Phase 1 Implementation Plan — Core Dexie.js Infrastructure

> **Status:** 🟢 **COMPLETED**  
> **Phase Target:** Core Dexie.js Database, Sync Engine Service, Outbox Queue Service  
> **Assigned Personas:** ⚡ Persona B (Database Specialist) & 🛡️ Persona C (Firebase Specialist)  
> **Last Updated:** August 8, 2026  

---

## 📌 Executive Summary & Goals

Phase 1 establishes the fundamental Dexie.js offline-first infrastructure without modifying existing feature UI components yet. Once Phase 1 is executed and verified, feature components can easily consume the local cache through Repositories.

---

## 🎯 Task Checklist & Execution Tracker

### Task 1.1: Install Dependencies & Verify Build Settings
- [x] Install `dexie` package.
- [x] Verify TypeScript and Angular compilation flags.

### Task 1.2: Implement Low-Level IndexedDB Service (`AppIndexedDbService`)
- [x] Create `src/app/core/services/dexie/app-indexeddb.service.ts`.
- [x] Define Dexie Database schema version 3 (`members`, `products`, `outboxQueue`).
- [x] Define indexes (`++id, clientTxId, type, status, createdAt`).

### Task 1.3: Implement Outbox Queue Service (`OutboxQueueService`)
- [x] Create `src/app/core/services/dexie/outbox-queue.service.ts`.
- [x] Implement `addToOutbox(item: OutboxItem): Promise<number>`.
- [x] Implement `getPendingItems(): Promise<OutboxItem[]>`.
- [x] Implement `markProcessing(id: number)`, `markSuccess(id: number)`, and `markFailed(id: number, error: string)`.
- [x] Create unit tests in `outbox-queue.service.spec.ts`.

### Task 1.4: Implement Background Sync Engine (`SyncEngineService`)
- [x] Create `src/app/core/services/dexie/sync-engine.service.ts`.
- [x] Implement network status listener (`online`/`offline` events + RxJS `isOnline$` + Signal).
- [x] Implement `flushOutboxQueue()` loop with error handling.
- [x] Implement `BroadcastChannel('epicenter_dexie_sync')` for multi-tab invalidation signals.
- [x] Create unit tests in `sync-engine.service.spec.ts`.

### Task 1.5: Verification & Verification Build
- [x] Verify `npm run build` and `npm run build:members`.
- [x] Verify zero regressions in existing services.
- [x] Commit and push progress to repository.

---

## 📂 Targeted Files & Impact Radius
- `package.json` (add `dexie`)
- `src/app/core/services/dexie/app-indexeddb.service.ts` (NEW)
- `src/app/core/services/dexie/outbox-queue.service.ts` (NEW)
- `src/app/core/services/dexie/sync-engine.service.ts` (NEW)
- `src/app/core/models/outbox.model.ts` (NEW)
