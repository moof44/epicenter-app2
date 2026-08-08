# Phase 3 Implementation Plan — POS Sales & Check-In Mutation Outbox Queue

> **Status:** 🟢 **COMPLETED**  
> **Phase Target:** Offline POS Checkout & Member Check-In Outbox Integration in `gym-app`  
> **Assigned Personas:** ⚡ Persona B (Database Specialist) & 🛡️ Persona C (Firebase Specialist)  
> **Last Updated:** August 8, 2026  

---

## 📌 Executive Summary & Goals

Phase 3 connects our core `OutboxQueueService` and `SyncEngineService` to `CheckoutService` and `AttendanceService`.
When a cashier completes a POS sale or a staff member performs a check-in while offline, the system:
1. Generates a client-side idempotency key (`clientTxId`).
2. Optimistically updates local IndexedDB state (`ProductRepository` / local cache).
3. Safely enqueues the mutation into `outboxQueue`.
4. Automatically flushes and syncs pending transactions with Firebase when network connection is restored.

---

## 🎯 Task Checklist & Execution Tracker

### Task 3.1: Offline Checkout Outbox Integration (`CheckoutService`)
- [x] Implement `clientTxId` generation for checkout sales.
- [x] Add offline fallback logic in `CheckoutService.checkout()` when `!isOnline`.
- [x] Optimistically deduct stock in `ProductRepository.deductStockLocal()`.
- [x] Enqueue `POS_SALE` payload into `OutboxQueueService`.

### Task 3.2: Offline Member Check-In Outbox Integration (`AttendanceService`)
- [x] Add offline fallback logic in `AttendanceService.checkIn()`.
- [x] Enqueue `CHECKIN` payload into `OutboxQueueService`.

### Task 3.3: Register Outbox Flusher Processors in `SyncEngineService`
- [x] Register sync processor handlers for `POS_SALE` and `CHECKIN` in `SyncEngineService`.
- [x] Ensure automatic execution on network restore (`online` event).

### Task 3.4: Build Verification & Testing
- [x] Run `npm run build` and `npm run build:members`.
- [x] Commit and push progress to repository.
