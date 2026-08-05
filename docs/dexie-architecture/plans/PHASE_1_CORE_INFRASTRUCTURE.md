# Phase 1 Implementation Plan — Core Dexie.js Infrastructure

> **Status:** 🟡 Ready for Execution  
> **Phase Target:** Core Dexie.js Database, Sync Engine Service, Outbox Queue Service  
> **Assigned Personas:** ⚡ Persona B (Database Specialist) & 🛡️ Persona C (Firebase Specialist)  
> **Last Updated:** August 5, 2026  

---

## 📌 Executive Summary & Goals

Phase 1 establishes the fundamental Dexie.js offline-first infrastructure without modifying existing feature UI components yet. Once Phase 1 is executed and verified, feature components can easily consume the local cache through Repositories.

---

## 🎯 Task Checklist & Execution Tracker

### Task 1.1: Install Dependencies & Verify Build Settings
- [ ] Install `dexie` and `dexie-angular` npm packages if not already present.
- [ ] Verify TypeScript and Angular compilation flags.

### Task 1.2: Implement Low-Level IndexedDB Service (`AppIndexedDbService`)
- [ ] Create `src/app/core/services/dexie/app-indexeddb.service.ts`.
- [ ] Define Dexie Database schema version 1 (`products`, `categories`, `members`, `attendance`, `outboxQueue`).
- [ ] Define composite indexes for rapid filtering (`updatedAt`, `status`, `clientTxId`).

### Task 1.3: Implement Outbox Queue Service (`OutboxQueueService`)
- [ ] Create `src/app/core/services/dexie/outbox-queue.service.ts`.
- [ ] Implement `addToOutbox(item: OutboxItem): Promise<number>`.
- [ ] Implement `getPendingItems(): Promise<OutboxItem[]>`.
- [ ] Implement `markProcessing(id: number)`, `markSuccess(id: number)`, and `markFailed(id: number, error: string)`.

### Task 1.4: Implement Background Sync Engine (`SyncEngineService`)
- [ ] Create `src/app/core/services/dexie/sync-engine.service.ts`.
- [ ] Implement network status listener (`window.addEventListener('online')`).
- [ ] Implement `flushOutboxQueue()` loop with exponential backoff and idempotency handling.
- [ ] Implement `BroadcastChannel('epicenter_dexie_sync')` for multi-tab invalidation signals.

### Task 1.5: Verification & Verification Build
- [ ] Run `compile_applet` (`npm run build` and `npm run build:members`).
- [ ] Verify zero regressions in existing services.
- [ ] Commit and push progress to repository.

---

## 📂 Targeted Files & Impact Radius
- `package.json` (add `dexie`)
- `src/app/core/services/dexie/app-indexeddb.service.ts` (NEW)
- `src/app/core/services/dexie/outbox-queue.service.ts` (NEW)
- `src/app/core/services/dexie/sync-engine.service.ts` (NEW)
- `src/app/core/models/outbox.model.ts` (NEW)
