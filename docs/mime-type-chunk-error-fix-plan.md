# Implementation Plan: Stale Script MIME Type Error Handling & Auto-Reload Recovery

## 1. Problem Diagnosis
- **Error Message**: `'text/html' is not a valid JavaScript MIME type.`
- **Error Name**: `TypeError`
- **Page URL**: `/login`
- **User**: Angelito Miranda (`ttdfWKJXFdeTHwuy3973fb5Gf062`), Roles: `[ADMIN, MANAGER, STAFF, TRAINER]`
- **Client**: WebKit / Mobile Safari on iPhone (`Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 ... Mobile/15E148 Safari/604.1`)
- **Occurrences**: 5
- **Root Cause**:
  1. The user had an existing mobile Safari tab open across a new production deployment.
  2. While attempting to route to `/login` (or loading dynamic component chunks), the browser requested an older hash-named JS chunk (e.g. `chunk-OLD.js`).
  3. Because the chunk no longer existed in Firebase Hosting, Firebase Hosting's SPA rewrite rule (`"source": "**", "destination": "/index.html"`) returned the 200 HTML of `index.html` with Content-Type `text/html`.
  4. WebKit/Safari enforces strict module MIME type checking and rejected the execution of HTML as JavaScript, throwing:
     `TypeError: 'text/html' is not a valid JavaScript MIME type.`
  5. In `global-error-handler.ts`, dynamic chunk mismatch errors were only matching:
     - `ChunkLoadError`
     - `Failed to fetch dynamically imported module`
     - `Importing a module script failed`
     - `Loading chunk`
  6. Because `'text/html' is not a valid JavaScript MIME type.` was not in this list, the handler:
     - Classified the error as `FATAL` (due to `name === 'TypeError'`).
     - Did **not** invoke the auto-recovery `window.location.reload()`, leaving the mobile user on a broken page and generating 5 repeated fatal error alerts.

## 2. Proposed Changes
1. **[src/app/core/handlers/global-error-handler.ts](file:///e:/Programming/epicenter-app2/src/app/core/handlers/global-error-handler.ts)**:
   - Expand the dynamic chunk/script error detector in both:
     - Auto-recovery reload block (`window.location.reload()`)
     - Severity determination block (`severity = 'WARNING'`)
   - Add checks for:
     - `message.includes('valid JavaScript MIME type')`
     - `message.includes('MIME type')`
     - `message.includes('text/html')`
   - Also update `scripts/mark-errors-resolved.ts` so error reconciliation scripts mark this error as resolved.

## 3. Verification & Safety Audit
- Protect working functionality: Non-chunk TypeErrors remain FATAL.
- Compile check: `npm run build` and `npm run build:members`.
- Update AI session continuity logs.
- Commit and deploy to Firebase Hosting.
