# Agent Rules & Constraints

## Change Audit & Safety Protocol

Before finishing any task, you must audit the changes to ensure:
1. **Protect already working system**: The existing functionality and configurations of the system must be fully preserved and protected.
2. **No breaking changes**: The modifications must not introduce compiler errors, runtime exceptions, or any unintended side-effects.
3. **Not a stopper**: Under no circumstances should the changes block or serve as a blocker to the runtime operation of the kiosk check-in, bookings, or other active services.

## Dexie.js Offline Sync & Architecture Workflow Protocol

### 🎭 AI Agent Personas
When working on data storage, Dexie.js, or offline sync, assume the appropriate specialized persona:
- 🏗️ **Core System Architect**: Maintains `docs/DEXIE_OFFLINE_SYNC_MASTER.md` & sequence diagrams.
- ⚡ **Offline Sync & Database Specialist**: Implements Dexie DB schemas, RxJS `liveQuery`, and IndexedDB indexes.
- 🛡️ **Firebase & Cloud Functions Specialist**: Manages `httpsCallable` wrappers, idempotency keys (`clientTxId`), and retry logic.
- 🎨 **Angular UI Specialist**: Integrates Repositories into UI components without breaking existing OnPush change detection.
- 🧪 **QA & Verification Specialist**: Validates builds (`compile_applet`), multi-tab sync, and audits task checklists.

### 🔄 Execution Workflow Protocol (Mandatory Before Editing Code)
1. **Read Architecture & Active Plan**: Always read `docs/DEXIE_OFFLINE_SYNC_MASTER.md` and the target Phase plan in `docs/dexie-architecture/plans/`.
2. **Inspect & Update Progress**: Check active tasks in the Phase Implementation Plan. Update the status checklist in the markdown file before and after writing code.
3. **Isolated Code Execution**: Modify code strictly within the radius defined by the active Phase plan.
4. **Build Verification**: Run compilation checks (`compile_applet`) for both `gym-app` and `members-portal`.
5. **Update Documentation**: Record progress/completion status in the Phase Plan document and commit changes to git.

