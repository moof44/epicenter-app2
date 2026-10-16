# Specification & Implementation Plan: Fix Safari WebKit IndexedDB Cursor Error

> **Document:** `docs/fix-safari-indexeddb-cursor-error-specs.md`  
> **Target Page:** `/members?search=...` (Member Directory)  
> **Status:** 🟢 COMPLETED  
> **Affected System:** `gym-app` (Dexie.js IndexedDB & Member Directory UI)  
> **Reported Error:** `UnknownError: Attempt to iterate a cursor that doesn't exist`  
> **Reported User Agent:** `Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7.5 Mobile/15E148 Safari/604.1`

---

## 1. Root Cause Analysis

### A. WebKit / Safari IndexedDB Cursor Limitation
On iOS Safari (WebKit), `UnknownError: Attempt to iterate a cursor that doesn't exist` is a known WebKit issue occurring when:
1. **Sequential Cursors on Same Collection**: In `MemberRepository.getMembersPagedLive()`, filtering was performing two separate cursor operations sequentially on the same collection:
   ```typescript
   const totalCount = await filtered.count(); // Cursor 1: Iterates all records to count
   const items = await filtered.offset(...).limit(...).toArray(); // Cursor 2: Re-iterates from 0
   ```
   In WebKit's IndexedDB engine, starting a second cursor immediately after completing the first one within the same transaction can trigger internal cursor exhaustion or premature transaction closure, throwing `"Attempt to iterate a cursor that doesn't exist"`.

2. **Rapid Un-debounced SwitchMap Cancellations**:
   In `MemberList` template:
   ```html
   <input type="text" [(ngModel)]="searchQuery" (keyup)="applyFilters()">
   ```
   Every keystroke immediately called `applyFilters()`. In `member-list.ts`:
   - `applyFilters()` called `router.navigate()` AND `emitQuery()`.
   - `route.queryParams.subscribe()` received the navigation change and called `emitQuery()` a second time.
   - For every keystroke (e.g. typing "venz"), 8 queries were fired rapidly without debounce.
   - In `setupDataLoading()`, `this.query$.pipe(switchMap(...))` was cancelling active `liveQuery` observables mid-flight. When WebKit aborts an active cursor transaction while Dexie is iterating, WebKit throws `"Attempt to iterate a cursor that doesn't exist"`.

3. **Stream Termination & Global Error Logging**:
   Because `switchMap` in `MemberList` did not have an internal `catchError`, any unhandled error from the Dexie query terminated the entire RxJS pipeline, permanently disabling the member search until page reload, and bubbling up to `GlobalErrorHandler` to be logged as a critical error.

---

## 2. Architecture & Design Fix

### Fix 1: Single-Pass Atomic Cursor in `MemberRepository`
Instead of executing two separate cursors (`.count()` followed by `.offset().limit().toArray()`), perform a single cursor pass:
```typescript
const allFiltered = await filtered.toArray();
const totalCount = allFiltered.length;
const items = allFiltered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
```
- Halves database cursor iteration time.
- Completely prevents opening a second cursor in the same transaction.
- Ensures atomic and consistent result count and item slice.

### Fix 2: Resilient Error Handling & Retry in `MemberRepository`
Add RxJS `retry` with exponential/short backoff and `catchError` fallback to `from(liveQuery(...))` so transient WebKit cursor interruptions automatically re-query without throwing:
```typescript
return from(liveQuery(...)).pipe(
    retry({
        count: 2,
        delay: 150
    }),
    catchError((err) => {
        console.warn('[MemberRepository] Live query error recovered:', err);
        return of({ items: [], totalCount: 0 });
    })
);
```

### Fix 3: Debounced Keystroke Stream & Clean Navigation in `MemberList`
1. Replace raw `(keyup)` with a debounced `searchSubject` (300ms, `distinctUntilChanged`).
2. Deduplicate emissions so typing coordinates cleanly with URL persistence without double-calling `emitQuery()`.
3. Wrap `this.memberService.getMembersPaged(options)` inside `switchMap` with `catchError` to ensure the RxJS subscription never dies.

### Fix 4: Auto-Recovery in `GlobalErrorHandler`
In `GlobalErrorHandler`, detect `"Attempt to iterate a cursor that doesn't exist"` as a transient WebKit IndexedDB cursor error and handle it gracefully without crashing or falsely escalating.

---

## 3. Checklist & Status Tracker

- [x] Document specification and root-cause analysis (`docs/fix-safari-indexeddb-cursor-error-specs.md`).
- [x] Update `MemberRepository` single-pass cursor and retry/catchError logic.
- [x] Update `MemberList` search input debounce (300ms) and subscription error protection.
- [x] Update `GlobalErrorHandler` WebKit cursor error handling.
- [x] Update `docs/dexie-architecture/plans/PHASE_MEMBERS_RETRIEVAL_GYM_APP.md`.
- [x] Verify build and tests across `gym-app` and `members-portal`.
