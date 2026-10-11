# System Error Logs Remediation & Stabilization Plan

This plan provides root-cause diagnosis and actionable fixes for the **12 unique production errors** extracted from the `/error-logs` system over the past 30 days.

## User Review Required

> [!IMPORTANT]
> **Priority 1 (`NG02100` - 127 Occurrences)**: When opening `/store/cash` or closing shifts via `ShiftControlModal`, an unformatted or raw Firestore Timestamp passed to `currentShift?.startTime | date:'shortTime'` triggers Angular's DatePipe parsing exception.
> 
> **Priority 2 (ApexCharts Invalid Date - 11 Occurrences)**: In the reports dashboard, weekly/custom ranges passing weekday string names (e.g. `'Mon'`, `'Tue'`) into `xaxis.type: 'datetime'` crash ApexCharts parsing.
> 
> **Priority 3 (Checkout Auth Race - 14 Occurrences)**: In attendance active sessions, clicking "Check Out" while in guest kiosk mode or with a transiently null session profile throws `"Action requires authentication"`.
> 
> **Priority 4 (IndexedDB Quota/Private Store Error)**: Devices running private browsing mode or filled IndexedDB stores fail when Firestore/Dexie initializes query backing stores.

---

## Root Cause Analysis Summary

| Ref | Unique Signature | Count | Severity | Root Cause |
| :--- | :--- | :--- | :--- | :--- |
| **#1 & #2** | `IndexedDbTransactionError: Internal error opening backing store for indexedDB.open` | 2 | ERROR | Tablet browser in Strict Private Browsing or corrupt IndexedDB quota prevents persistent multi-tab store allocation. |
| **#3 & #6** | `NG02100` | 133 | ERROR | `ShiftControlModal` passes unparsed Firestore Timestamp/object `currentShift?.startTime` directly into Angular's `date:'shortTime'` pipe. |
| **#4** | `Action requires authentication` on checkout | 14 | ERROR | `active-sessions.ts` allows clicking "Check Out" without checking if the current staff session is authenticated before calling `attendanceService.checkOut()`. |
| **#5** | `NG0750` | 9 | ERROR | `dashboard.html` `@defer (on viewport)` blocks without `@error` blocks fail to recover when dynamic chunks fail or network drops during scroll. |
| **#7** | `You have provided invalid Date format. Please provide a valid JavaScript Date` | 11 | ERROR | `SalesPerformanceComponent` configured with `xaxis.type: 'datetime'` receives day string labels (`'Mon'`, `'Tue'`) during weekly view instead of ISO date timestamps. |
| **#8** | `auth/network-request-failed` | 1 | ERROR | Offline or tablet Wi-Fi disconnect during token refresh; uncaught promise rejection in token pipeline. |
| **#9 & #10**| `Failed to fetch dynamically imported module / Importing a module script failed` | 6 | FATAL | User had an older session open across a new production deployment, and requested an old, hashed bundle file (`chunk-*.js`) that no longer exists on the CDN. |
| **#11** | `NG04002: 'logout'` | 1 | ERROR | Router received navigation to `/logout` or unhandled click, but no route exists for `path: 'logout'`. |
| **#12** | `Attempt to iterate a cursor that doesn't exist` | 1 | ERROR | Client-side search `/members?search=venz` during active Firestore pagination cursor reset. |

---

## Proposed Changes

### 1. Shift Modal & DatePipe Fix (`NG02100`)

#### [MODIFY] [shift-control-modal.html](file:///e:/Programming/epicenter-app2/src/app/features/store/components/shift-control-modal/shift-control-modal.html)
- Replace direct `currentShift?.startTime | date:'shortTime'` with a component helper `formatDate(currentShift?.startTime) | date:'shortTime'`.

#### [MODIFY] [shift-control-modal.ts](file:///e:/Programming/epicenter-app2/src/app/features/store/components/shift-control-modal/shift-control-modal.ts)
- Add `formatDate(val: any): Date | null` using `safeToDate(val)`.

---

### 2. ApexCharts Date Parsing Fix (`Reports Dashboard`)

#### [MODIFY] [sales-performance.ts](file:///e:/Programming/epicenter-app2/src/app/features/reports/components/sales-performance/sales-performance.ts)
- In `updateChart()`, dynamically switch `xaxis.type`:
  - If labels are date strings (`YYYY-MM-DD` or parseable dates), use `xaxis.type = 'datetime'`.
  - If labels are cadence names (`'Mon'`, `'Tue'`, or cadence strings), use `xaxis.type = 'category'`.
- Ensure date strings passed into `chartOptions.labels` are valid ISO date strings (`YYYY-MM-DD`).

#### [MODIFY] [reports-dashboard.ts](file:///e:/Programming/epicenter-app2/src/app/features/reports/pages/reports-dashboard/reports-dashboard.ts)
- In `loadWeeklyPerformance()`, ensure `salesData` maps each day's actual date (`d.dateStr` or ISO date) rather than plain weekday text when feeding chart axes.

---

### 3. Attendance Checkout Auth Guard

#### [MODIFY] [active-sessions.ts](file:///e:/Programming/epicenter-app2/src/app/features/attendance/components/active-sessions/active-sessions.ts)
- Check authentication before triggering `attendanceService.checkOut(record.id)`.
- If `authService.userProfile()` is null, display a snackbar warning: `"Please log in as staff to check out members."`

#### [MODIFY] [attendance.service.ts](file:///e:/Programming/epicenter-app2/src/app/core/services/attendance.service.ts)
- Fallback `_currentUserSnapshot` to anonymous/kiosk trace if initiated from authorized kiosk mode, or throw a clean user-facing error caught with a descriptive snackbar.

---

### 4. Route Handling (`NG04002: 'logout'`)

#### [MODIFY] [app.routes.ts](file:///e:/Programming/epicenter-app2/src/app/app.routes.ts)
- Add route redirect for `logout`:
  ```typescript
  { path: 'logout', redirectTo: 'login', pathMatch: 'full' }
  ```
- Ensure wildcard `**` route exists to redirect unhandled URLs safely to `/dashboard` or `/login`.

---

### 5. Deployment Cache Stale-Chunk Recovery (`Dynamic Import Failed`)

#### [MODIFY] [global-error-handler.ts](file:///e:/Programming/epicenter-app2/src/app/core/handlers/global-error-handler.ts)
- Add auto-reload recovery for chunk load errors:
  - If error is `ChunkLoadError` or `Failed to fetch dynamically imported module`:
  - Check if page was reloaded in the last 15 seconds (using `sessionStorage`).
  - If not, automatically perform `window.location.reload()` to fetch the newly deployed HTML and bundle manifests seamlessly.

---

### 6. Dashboard `@defer` Fallback Blocks (`NG0750`)

#### [MODIFY] [dashboard.html](file:///e:/Programming/epicenter-app2/src/app/features/dashboard/dashboard.html)
- Add `@error` fallback blocks to `@defer (on viewport)` so that if a widget fails to load or dynamically import, the UI gracefully renders a reload button rather than throwing `NG0750`.

---

## Verification Plan

### Automated Verification
```bash
npm run build
npm run build:members
```

### Manual Verification
1. **Cash Management**: Open `/store/cash` and launch `ShiftControlModal`. Verify no `NG02100` errors in console.
2. **Reports ApexCharts**: Navigate to `/reports`, switch between Daily, Weekly, and Monthly. Verify sales and attendance volume charts render without `invalid Date format` warnings.
3. **Attendance Checkout**: Perform member checkouts in `/attendance` and verify clear notification toasts.
4. **URL Navigation**: Navigate to `/logout` and verify clean redirection to `/login` with no `NG04002` router errors.
