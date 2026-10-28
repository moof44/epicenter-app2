# Implementation Plan: Downgrade Dynamic Chunk Errors to WARNING Severity

## Background & Objective
When an application deployment happens or when a mobile browser (especially Safari/WebKit on iOS) loses connection or wakes from background, dynamically loaded route chunks can fail to fetch.
WebKit reports this as `TypeError: Importing a module script failed.` without a stack trace.
Currently, `global-error-handler.ts` classifies all `TypeError` occurrences as `FATAL`. While it successfully triggers an auto-recovery reload, it leaves a `FATAL` error document in the Firestore `system_errors` collection, causing false alarms.

## Proposed Changes
1. **[src/app/core/handlers/global-error-handler.ts](file:///e:/Programming/epicenter-app2/src/app/core/handlers/global-error-handler.ts)**:
   - Update `extractErrorDetails` so that chunk/module fetch failures (`ChunkLoadError`, `Loading chunk`, `Failed to fetch dynamically imported module`, and `Importing a module script failed`) are classified as `WARNING`.
2. **Audit & Safety Protocol**:
   - Ensure existing auto-reload recovery logic remains 100% intact.
   - Run production compilation check (`npm run build`).
3. **Commit, Push, and Deploy**:
   - Stage and commit changes.
   - Push to `origin/master`.
   - Deploy to Firebase Hosting.
