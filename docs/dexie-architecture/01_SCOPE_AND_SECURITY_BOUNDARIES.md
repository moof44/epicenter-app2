# 01. Scope & Security Boundaries

> **Document Part:** 1 of 7  
> **Topic:** Data Scope, Caching Boundaries, and Security Compliance  

---

## 🎯 1. Overview & Core Philosophy

Integrating **Dexie.js (IndexedDB)** provides instant UI response, smooth offline capabilities, and reduced read quota costs on Firebase Firestore. However, storing data in browser storage introduces security and data isolation responsibilities.

This document explicitly defines **what data is allowed in Dexie.js** and **what data MUST remain strictly server-side / direct Cloud Function calls**.

---

## 📋 2. Caching Scope Matrix

### A. Data Allowed in Dexie.js (Cached Locally)

| Collection / Data Entity | App Access | Cache Strategy | Purpose |
| :--- | :--- | :--- | :--- |
| **Products & Categories** | `gym-app` | Read-Heavy Cache-First | Instant POS store searching & offline inventory viewing. |
| **Members List (Public Metadata)** | `gym-app` | Cache-First with Delta Sync | Rapid member lookup during check-in or shift operations. |
| **Daily Attendance & Check-Ins** | `gym-app`, `members-portal` | Cache-First + Mutation Outbox | Fast check-in logging; queued if network drops. |
| **Class Schedules & Trainers** | Both | Cache-First | Instant schedule browsing for staff and members. |
| **Member Workouts & Quotas** | `members-portal` (User Scoped) | Cache-First (User Only) | Offline workout logging and daily streak/quota views. |
| **Pending Sales Outbox** | `gym-app` | Local Outbox Queue | Stores offline cash/credit POS transactions until sync. |

---

### B. Data STRICTLY FORBIDDEN in Dexie.js (Direct Server / Cloud Functions Only)

| Sensitive Operation / Data | Reason for Exclusion | Enforcement Mechanism |
| :--- | :--- | :--- |
| **Authentication Credentials & Tokens** | Firebase Auth handles session tokens in secure storage. Storing raw tokens in Dexie creates XSS vulnerabilities. | Firebase Auth SDK (`IndexedDB` internal isolate). |
| **User Role Modifications & Staff Creation** | Bypassing server validation allows privilege escalation. | Direct Cloud Function (`createStaffAccount`, `updateUserRoles`). |
| **Payment Gateway Secrets & Processing** | Credit card processing requires PCI compliance; keys must never be exposed or logged locally. | Direct backend Cloud Function API call. |
| **Financial Audit Logs** | Audit logs must be append-only and tamper-proof on Firestore. | Direct server-side write via Cloud Function / Firestore Rules. |
| **Cross-Member Sensitive Data in Portal** | Member A must NEVER have Member B's private profile or workout data cached in their browser storage. | Member Portal scope isolation (User UID filter). |

---

## 🔒 3. Security Boundary Rules

1. **Zero-Trust Client Storage:**  
   IndexedDB is accessible via browser Developer Tools. Never store unencrypted passwords, secret keys, or cross-tenant private data in Dexie.js.

2. **Server-Authoritative Enforcement:**  
   Dexie.js serves as an **Optimistic Cache**. Final validation, stock decrement checks, role checks, and financial reconciliation ALWAYS happen on Firebase Firestore / Cloud Functions.

3. **Data Erasure on Logout:**  
   When a user logs out from `gym-app` or `members-portal`, the `SyncEngine` must trigger `dexieDb.clearAllTables()` or `dexieDb.delete()` to clear stale cached user data from the device.
