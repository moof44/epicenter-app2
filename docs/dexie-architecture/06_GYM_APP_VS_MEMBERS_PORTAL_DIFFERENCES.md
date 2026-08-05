# 06. Gym App vs. Members Portal Differences & Custom Solutions

> **Document Part:** 6 of 7  
> **Topic:** Analysis of Structural, Security, and Architectural Differences Between Apps  

---

## 🔍 1. Key Application Differences Matrix

| Dimension | `gym-app` (Staff/Admin Portal) | `members-portal` (End-User App) |
| :--- | :--- | :--- |
| **User Roles & Target Audience** | Admin, Manager, Staff, Trainer | End-User Gym Member |
| **Data Scope & Density** | **Multi-User / Global Scope:** Staff sees all products, all members, all check-ins, sales history. | **Strictly Single-User Scope:** Member sees ONLY their own profile, attendance, workouts, quests, and personal progress. |
| **Write Volume & Nature** | **High-Density Mutations:** Frequent POS transactions, stock updates, member check-ins, shift cash entries. | **Personal Mutations:** Logging personal workout reps/sets, claim daily quests, updating avatar. |
| **Offline Multi-Device Risk** | Medium: Multiple staff members on shared desk tablet or separate phones. | Low: Single member on personal mobile device or laptop. |
| **Security Risk Profile** | High: Unauthorised writes could corrupt store inventory or financial sales data. | High (Privacy): Storing member data locally must NEVER leak another member's data if devices are shared. |

---

## 🛠️ 2. Custom Technical Solutions for Each App

### Solution for `gym-app` (Staff App)
1. **Global Store Tables:**  
   Dexie.js stores shared datasets: `products`, `categories`, `members_summary`, `class_schedules`, `outbox_sales`.
2. **Shift Data Lifecycle:**  
   Shift cash ledgers and POS outbox queues are indexed by `shiftId` and `staffUid`.
3. **Multi-Staff Device Handling:**  
   When staff switch accounts on a shared tablet, staff-specific sensitive caches are cleared while shared product catalog data remains cached.

---

### Solution for `members-portal` (Members App)
1. **User-Isolated Database Partitioning:**  
   Dexie DB name in `members-portal` is dynamically scoped: `MemberPortalDb_${userUid}`.
2. **Automatic Cleanup on Logout:**  
   When a member logs out of `members-portal`, `dexieDb.delete()` is triggered to wipe all cached local database tables for that UID.
3. **Lightweight Quota & Gamification Sync:**  
   Daily quest & streak progress is cached locally for instant progress bar animations and synced to Firestore in the background.
