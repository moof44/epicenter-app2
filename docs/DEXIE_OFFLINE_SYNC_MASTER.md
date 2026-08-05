# Dexie.js Offline-First & Sync Architecture — Master Index & Workflow Guide

> **Status:** Architecture Proposal & Specification Phase  
> **Repository:** `moof44/epicenter-app2`  
> **Target Applications:** `gym-app` (Staff/POS System) & `members-portal` (Member Web App)  
> **Last Updated:** August 5, 2026  

---

## 📌 Executive Summary

This master document defines the architectural standard for implementing **Dexie.js (IndexedDB)** as a local cache and offline storage engine in front of **Firebase Firestore** and **Cloud Functions**.

The primary objective is to make both `gym-app` and `members-portal` blazingly fast, offline-resilient, and reliable under poor network conditions—without compromising security or introducing breaking changes to existing business logic.

---

## 📊 Phase Status Tracker

| Phase | Description | Scope / Focus | Status | Target Date |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 0** | **Architecture & Documentation** | Complete specification, sequence diagrams, security boundaries, git push | 🟢 **COMPLETED** | Aug 5, 2026 |
| **Phase 1** | **Core Dexie Infrastructure** | Dexie Database instance, SyncEngine Service, Outbox Queue, RxJS Adapters | 🟡 **ONGOING DISCUSSION** | Pending Approval |
| **Phase 2** | **Pilot Read-Only Migration (gym-app)** | Products & Categories catalog cache in `gym-app` (low-risk verification) | 🔴 **PLANNED** | TBD |
| **Phase 3** | **Mutation Outbox & POS (gym-app)** | Offline POS Sales, Member Check-ins & Cloud Functions Outbox Queue | 🔴 **PLANNED** | TBD |
| **Phase 4** | **Members Portal Integration** | User-scoped Dexie cache for workouts, attendance, and member profile | 🔴 **PLANNED** | TBD |
| **Phase 5** | **Full System Audit & Optimization** | Full app synchronization review, stress testing & multi-tab conflict validation | 🔴 **PLANNED** | TBD |

---

## 🤖 AI Agent Operational Rule (Mandatory for Future Turns)

> ⚠️ **CRITICAL DIRECTIVE FOR AI CODING AGENT:**  
> Before analyzing or writing ANY code for Dexie.js or data sync features:
> 1. Read this master document (`docs/DEXIE_OFFLINE_SYNC_MASTER.md`) and the sequence specs in `docs/dexie-architecture/WORKFLOW_AND_SEQUENCE.md`.
> 2. Verify the current active **Phase** from the Status Tracker table above.
> 3. Update the Status Tracker table if entering a new phase.
> 4. Ensure all changes adhere strictly to the isolated Repository Pattern specified in `02_ISOLATION_AND_REPOSITORIES.md`.

---

## 📂 Architecture Documents Index

1. [**01. Scope & Security Boundaries**](dexie-architecture/01_SCOPE_AND_SECURITY_BOUNDARIES.md)  
   *What is cached locally vs what must remain server-side / direct.*
2. [**02. Isolation & Repository Architecture**](dexie-architecture/02_ISOLATION_AND_REPOSITORIES.md)  
   *Single-responsibility abstraction layers, RxJS/Signal integration, non-breaking design.*
3. [**03. Cloud Functions & Mutation Outbox**](dexie-architecture/03_CLOUD_FUNCTIONS_AND_MUTATION_OUTBOX.md)  
   *Offline mutations, idempotency keys, and queue-based execution for `httpsCallable`.*
4. [**04. Conflict Resolution & Multi-Tab Sync**](dexie-architecture/04_CONFLICT_RESOLUTION_AND_MULTI_TAB.md)  
   *Handling offline write collisions, server timestamp reconciliation, and Dexie BroadcastChannel sync.*
5. [**05. Phased Rollout Plan**](dexie-architecture/05_PHASED_ROLLOUT_PLAN.md)  
   *Safe, incremental deployment plan for live production environments.*
6. [**06. Gym App vs. Members Portal Differences**](dexie-architecture/06_GYM_APP_VS_MEMBERS_PORTAL_DIFFERENCES.md)  
   *Security constraints, data density, multi-user staff vs single-user member data handling.*
7. [**Workflow & Sequence Diagrams**](dexie-architecture/WORKFLOW_AND_SEQUENCE.md)  
   *Visual diagrams detailing Read-through, Write-through, and Outbox Sync workflows.*

---

## 🔗 Repository Quick Status
- **GitHub Repository:** `https://github.com/moof44/epicenter-app2.git`
- **Firebase Projects:** `epicenter-app` (Staff App) & `epicenter-members-portal` (Members App)
