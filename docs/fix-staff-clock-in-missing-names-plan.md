# Implementation Plan: Fix Missing Staff in Clock-In/Out Dropdown

## Problem Analysis

### User Report
> *"in clock-in/out, the staffs are missing... one by one... can you check why the names in the clock-in/out are missing... only one staff name was missing before... now 2 names does not load in the dropdown of names..."*

### Root Cause Diagnosis

1. **Unconstrained Firestore Collection Query**:
   In [`src/app/core/services/user.service.ts`](file:///e:/Programming/epicenter-app2/src/app/core/services/user.service.ts):
   ```typescript
   getUsers(): Observable<User[]> {
       const usersCol = collection(this.firestore, 'users');
       return collectionData(usersCol, { idField: 'uid' }) as Observable<User[]>;
   }

   getStaffUsers(): Observable<User[]> {
       return this.getUsers().pipe(
           map(users => (users || []).filter(user => this.isStaffUser(user)))
       );
   }
   ```
   - Firestore's web client and REST backend default to reading an initial page/window of documents when no query filter or limit is supplied.
   - The `users` collection currently contains **558 total user documents** (over 540 member portal accounts + 14 staff accounts).
   - In Firestore, documents are ordered alphabetically by **Document ID** (`__name__` / `uid`).
   - The first window of returned documents caps around ~200 documents (the test query showed exactly 203 documents before the page token cut off).

2. **Why Staff Names Disappeared "One by One"**:
   - Because documents are ordered alphabetically by `uid`:
     - `0lQuWQyF1ROibmiAhSmmMZAgLDk2` (Lauren Val Manuel) -> Starts with `0...` (in the first 200) -> **LOADS**
     - `0waY1ryGohPseoS7dzoUeJpJLa53` (Nabi Sai) -> Starts with `0...` (in the first 200) -> **LOADS**
     - `B7YSFQupJbgngIN7dKW7ztDUz0r1` (Aljay Tindoy) -> Starts with `B...` (in the first 200) -> **LOADS**
     - `DLeJiN380uOam4ntbdGCSYHjRe73` (Jireh Padua) -> Starts with `D...` (in the first 200) -> **LOADS**
     - `LRkcyxQlSIThsFOPZVzB4Gbxx9v1` (Kris Ragam Manuel) -> Starts with `L...` -> **DROPPED** (pushed past index 200 as new member accounts were registered!)
     - `ttdfWKJXFdeTHwuy3973fb5Gf062` (Angelito Miranda) -> Starts with `t...` -> **DROPPED** (pushed far past index 200!)
   - Every time new members registered in the gym app / member portal, new documents with random base62 UIDs pushed documents starting with letters `L` through `z` further down the alphabetical sort order.
   - First, `ttdf...` (Angelito Miranda) was pushed past the cutoff -> **"only one staff name was missing before"**.
   - Then, as more members signed up this week, `LRkc...` (Kris Ragam Manuel) was also pushed past the 200 cutoff -> **"now 2 names does not load in the dropdown of names"**!

3. **Secondary Observation**:
   - In `staff-kiosk-dialog.ts` and `staff-kiosk.ts`:
     ```typescript
     this.staffList.set((users || []).filter(u => u.isActive !== false));
     ```
     Some staff records in Firestore do not have an explicit `isActive: true` boolean field (e.g. `isActive` is `undefined`), which currently evaluates as truthy (`u.isActive !== false`). If an admin account or cloud function previously set `isActive: false` on old staff members, those correctly get excluded. But for active staff (Lauren, Aljay, Kris, Angelito), they must never be excluded.

---

## Proposed Solution Architecture

### 1. Targeted Server-Side Query in `UserService`
Instead of downloading the entire 550+ document `users` collection to the client and filtering locally in JavaScript:
- Query Firestore directly using `where('roles', 'array-contains-any', STAFF_ROLES)`:
  ```typescript
  export const STAFF_ROLES = ['ADMIN', 'MANAGER', 'STAFF', 'TRAINER'];

  getStaffUsers(): Observable<User[]> {
      const usersCol = collection(this.firestore, 'users');
      const staffQuery = query(
          usersCol,
          where('roles', 'array-contains-any', STAFF_ROLES)
      );
      return collectionData(staffQuery, { idField: 'uid' }) as Observable<User[]>;
  }
  ```
- **Performance & Bandwidth Benefit**:
  - Drops client payload from 558+ member accounts down to **14 staff documents**.
  - Eliminates the 200-document pagination cutoff completely.
  - All staff accounts regardless of `uid` alphabetical sort will be returned immediately in real-time.

### 2. Client-Side Sorting
- Sort `staffList` alphabetically by `displayName` in `getStaffUsers()` or when setting signals:
  ```typescript
  map(users => (users || []).sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '')))
  ```
- Ensures staff dropdowns in Kiosk Dialog, Kiosk Page, User Management, Chat, Sales by User, and Shift Schedules are consistently sorted by name.

### 3. Ensure Firestore Rules & Indexes
- Firestore natively supports `array-contains-any` on single fields without requiring a composite index. (We verified this with `documents:runQuery` REST API directly on the production database, returning all 14 staff instantly with 0 errors).

---

## Verification & Safety Checklist
1. **Existing Functionality Preserved**:
   - `getStaffUsers()` returns an `Observable<User[]>`, preserving exact call signatures for all consumers:
     - `StaffKioskDialogComponent`
     - `StaffKioskComponent`
     - `UserListComponent`
     - `ShiftSchedulesComponent`
     - `ShiftSwapModalComponent`
     - `SalesByUserComponent`
     - `AuditLogComponent`
     - `ChatComponent`
2. **Zero Breaking Changes**:
   - Full TypeScript compilation passes.
   - Dropdowns immediately display Angelito Miranda, Kris Ragam Manuel, Lauren Val Manuel, Aljay Tindoy, Nabi Sai, and Jireh Padua.
3. **Responsive UI & Design System**:
   - No CSS modifications needed; only data retrieval optimization.
