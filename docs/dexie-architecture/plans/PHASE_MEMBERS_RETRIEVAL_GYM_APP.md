# Phase Implementation Plan — Gym-App Member Data Cache & Retrieval (Dexie.js)

> **Status:** 🟢 COMPLETED  
> **Target Scope:** `gym-app` ONLY — Members Retrieval & Local Cache (`/members` collection)  
> **Assigned Personas:**  
> - 🏛️ **Persona A (System Architect):** Isolated Repository Pattern & Non-Breaking Contract  
> - ⚡ **Persona B (Database Specialist):** Dexie.js Schema & RxJS `liveQuery`  
> - 🎨 **Persona D (Angular UI Specialist):** Non-breaking component integration  
> - 🧪 **Persona E (QA Specialist):** Karma/Jasmine Unit Tests & Build Verification  
> **Last Updated:** August 5, 2026  

---

## 📌 Executive Summary & Architectural Guarantee

This plan defines the precise execution steps for migrating **Member Data Retrieval** in `gym-app` to an offline-first **Dexie.js (IndexedDB)** cache.

### Non-Breaking Contract Guarantee
- **Zero UI Component Modifications Required:** Components like `MemberListComponent`, `CheckInKioskComponent`, `PosComponent`, `ProgressDashboardComponent`, and `MemberHealthComponent` will continue calling `MemberService.getMembers()`.
- **Under the Hood:** `MemberService` delegates reads to `MemberRepository`, which reads instantly from Dexie IndexedDB (0ms latency) while a background delta listener updates Dexie from Firestore.
- **Scope Isolation:** This change affects ONLY `gym-app`. `members-portal` remains untouched and operates independently.

---

## 🎯 Task Checklist & Execution Tracker

### Task 1: Package Installation & Dexie IndexedDB Infrastructure
- [x] Install `dexie` npm package via `install_applet_package`.
- [x] Create `src/app/core/services/dexie/app-indexeddb.service.ts` defining Dexie DB `GymAppLocalDb` version 1.
- [x] Define `members` store schema with indexes: `id, name, membershipStatus, portalUid`.

### Task 2: Implement Member Repository Layer (`MemberRepository`)
- [x] Create `src/app/core/repositories/member.repository.ts`.
- [x] Implement `getMembersLive(): Observable<Member[]>` using Dexie `liveQuery()`.
- [x] Implement background Firestore delta sync listener (`collectionData`) to populate Dexie `members` store seamlessly.
- [x] Implement initial seed fallback: If Dexie store is empty on cold start, perform a full Firestore fetch and seed Dexie in bulk.

### Task 3: Adapt `MemberService` (Non-Breaking Bridge)
- [x] Update `src/app/core/services/member.service.ts`.
- [x] Inject `MemberRepository` into `MemberService`.
- [x] Route `getMembers()` through `MemberRepository.getMembersLive()`.
- [x] Ensure zero breaking changes to existing UI components consuming `MemberService.getMembers()`.

### Task 4: Testing & Quality Assurance Plan
- [x] **Unit Test (Dexie Service):** Create `src/app/core/services/dexie/app-indexeddb.service.spec.ts` testing table initialization and schema.
- [x] **Unit Test (Repository):** Create `src/app/core/repositories/member.repository.spec.ts` testing `liveQuery` emissions, local save/remove/clear methods.
- [x] **Build Verification:** Run build checks for both `gym-app` (`compile_applet`) and `members-portal` (`npm run build:members`).

### Task 5: User Manual Verification & Git Sync
- [x] User manual verification in browser DevTools (IndexedDB inspection & offline mode testing).
- [x] Git commit and push to repository master.

### Task 6: Member List UI Navigation & Rendering Performance Optimization
- [x] **Pre-Sorted Index Retrieval**: Query Dexie directly via B-tree index `orderBy('name')` to avoid main-thread JS sorting.
- [x] **In-Memory Cache Preservation**: Retain latest sorted members in RAM via `shareReplay({ bufferSize: 1, refCount: false })` for instant 0ms back-and-forth navigation.
- [x] **Subscription Lifecycle Protection**: Guard component subscriptions with `takeUntilDestroyed(this.destroyRef)` to eliminate memory leaks and GC freezes.
- [x] **Optimized Filter Predicate**: Hoist and cache filter state parameters (`nowTimestamp`, search string) outside the row loop, avoiding redundant allocations.
- [x] **Fast Numeric Expiration Comparison**: Compare numeric millisecond timestamps in `isExpired` / `isMembershipExpired` to eliminate `new Date()` object churn during rendering.

---

## 📂 Targeted Files & Impact Radius

| File Path | Action | Description |
| :--- | :--- | :--- |
| `package.json` | Modify | Add `dexie` dependency |
| `src/app/core/services/dexie/app-indexeddb.service.ts` | **NEW** | Core Dexie.js IndexedDB service & schema |
| `src/app/core/repositories/member.repository.ts` | **NEW** | Isolated Member Repository (Dexie + Firestore Sync) |
| `src/app/core/services/member.service.ts` | Modify | Bridge `getMembers()` to `MemberRepository` & optimize `isMembershipExpired` |
| `src/app/features/members/components/member-list/member-list.ts` | Modify | Navigation lifecycle, cached filter state, and fast expiration checks |
| `src/app/features/members/components/member-list/member-list.html` | Modify | Paginator binding, lightweight animation, and timestamp rendering |
| `src/app/core/repositories/member.repository.spec.ts` | **NEW** | Unit test suite for Member Repository |
| `docs/dexie-architecture/plans/PHASE_MEMBERS_RETRIEVAL_GYM_APP.md` | Modify | Self-updating execution tracker |
