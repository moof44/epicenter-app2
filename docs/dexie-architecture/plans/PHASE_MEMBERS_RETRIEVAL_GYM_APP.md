# Phase Implementation Plan — Gym-App Member Data Cache & Retrieval (Dexie.js)

> **Status:** 🟡 Ready for Execution  
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
- [ ] Install `dexie` npm package via `install_applet_package`.
- [ ] Create `src/app/core/services/dexie/app-indexeddb.service.ts` defining Dexie DB `GymAppLocalDb` version 1.
- [ ] Define `members` store schema with indexes: `id, name, phone, qrCode, membershipStatus, updatedAt`.

### Task 2: Implement Member Repository Layer (`MemberRepository`)
- [ ] Create `src/app/core/repositories/member.repository.ts`.
- [ ] Implement `getMembersLive(): Observable<Member[]>` using Dexie `liveQuery()`.
- [ ] Implement background Firestore delta sync listener (`updatedAt > lastSyncTime`) to populate Dexie `members` store seamlessly.
- [ ] Implement initial seed fallback: If Dexie store is empty on cold start, perform a full Firestore fetch and seed Dexie in bulk.

### Task 3: Adapt `MemberService` (Non-Breaking Bridge)
- [ ] Update `src/app/core/services/member.service.ts`.
- [ ] Inject `MemberRepository` into `MemberService`.
- [ ] Route `getMembers()` through `MemberRepository.getMembersLive()`.
- [ ] Ensure `addMember()`, `updateMember()`, and `deleteMember()` write to Firestore and optimistically update Dexie `members` table.

### Task 4: Testing & Quality Assurance Plan
- [ ] **Unit Test (Dexie Service):** Create `src/app/core/services/dexie/app-indexeddb.service.spec.ts` testing table initialization and CRUD operations.
- [ ] **Unit Test (Repository):** Create `src/app/core/repositories/member.repository.spec.ts` testing `liveQuery` emissions and Firestore delta merging.
- [ ] **Offline Simulation Test:** Verify that disconnecting network in DevTools still returns the full member list instantly from IndexedDB.

### Task 5: Build Verification & Git Sync
- [ ] Run `compile_applet` (`npm run build` and `npm run build:members`) to verify zero compilation or budget errors.
- [ ] Update progress status in this document (`PHASE_MEMBERS_RETRIEVAL_GYM_APP.md`).
- [ ] Commit and push changes to GitHub repository (`moof44/epicenter-app2`).

---

## 📂 Targeted Files & Impact Radius

| File Path | Action | Description |
| :--- | :--- | :--- |
| `package.json` | Modify | Add `dexie` dependency |
| `src/app/core/services/dexie/app-indexeddb.service.ts` | **NEW** | Core Dexie.js IndexedDB service & schema |
| `src/app/core/repositories/member.repository.ts` | **NEW** | Isolated Member Repository (Dexie + Firestore Sync) |
| `src/app/core/services/member.service.ts` | Modify | Bridge `getMembers()` to `MemberRepository` |
| `src/app/core/repositories/member.repository.spec.ts` | **NEW** | Unit test suite for Member Repository |
| `docs/dexie-architecture/plans/PHASE_MEMBERS_RETRIEVAL_GYM_APP.md` | Modify | Self-updating execution tracker |
