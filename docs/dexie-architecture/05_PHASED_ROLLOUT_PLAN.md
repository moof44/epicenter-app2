# 05. Phased Rollout Plan

> **Document Part:** 5 of 7  
> **Topic:** Safe, Incremental Implementation & Deployment Strategy  

---

## 🎯 1. Phased Migration Rationale

Because `gym-app` and `members-portal` are live, running applications, applying a full application-wide database rewrite all at once carries high risk.

We adopt a **4-Phase Incremental Rollout Strategy** to validate each layer in production before expanding scope.

---

## 🗓️ 2. Phase Breakdown

```
Phase 0: Architecture & Git Validation (Completed)
   │
   ▼
Phase 1: Core Dexie.js Infrastructure (Database, SyncEngine, Outbox Queue)
   │
   ▼
Phase 2: Pilot Read-Only Migration (Products Catalog in gym-app)
   │
   ▼
Phase 3: POS & Check-In Mutation Outbox (gym-app Offline Writes)
   │
   ▼
Phase 4: Members Portal Offline Integration (User-Scoped Workouts & Attendance)
```

---

### Phase 0: Architecture & GitHub Infrastructure (🟢 COMPLETED)
- **Goal:** Establish Git repository connection, set up master architecture docs, verify token configuration (`GITHUB_TOKEN`, `FIREBASE_TOKEN`).
- **Deliverables:** `docs/DEXIE_OFFLINE_SYNC_MASTER.md` & complete architecture folder committed and pushed to `moof44/epicenter-app2`.

---

### Phase 1: Core Dexie.js Infrastructure & Services (🟡 NEXT STEP)
- **Goal:** Install `dexie` & `dexie-angular` dependencies, implement base `AppIndexedDbService`, `SyncEngineService`, and `OutboxQueueService` in core shared folder.
- **Verification:** Unit test Dexie schema initialization without touching existing feature components.

---

### Phase 2: Pilot Read-Only Page Implementation — Products & Inventory Catalog (🔴 PLANNED)
- **Goal:** Convert the Store/Products catalog in `gym-app` to use the new Dexie Cache-First Repository.
- **Why Products?** Products are read-heavy, low-risk, and used heavily in POS. If any issue occurs, it can be isolated instantly.
- **Feedback Period:** Test in live environment for user feedback before proceeding.

---

### Phase 3: Mutation Outbox & Offline POS Sales (🔴 PLANNED)
- **Goal:** Enable offline POS sales and attendance check-ins using the Dexie Outbox Queue and Cloud Function idempotency wrapper.
- **Verification:** Test cutting network connectivity during a POS sale, verifying that the sale registers in Dexie and syncs cleanly upon reconnect.

---

### Phase 4: Members Portal Adaptation (🔴 PLANNED)
- **Goal:** Adapt Dexie offline cache for `members-portal`, ensuring strict single-user data isolation for workout history, daily quotas, and badges.
