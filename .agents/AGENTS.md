# Agent Rules & Constraints

## Change Audit & Safety Protocol

Before finishing any task, you must audit the changes to ensure:
1. **Protect already working system**: The existing functionality and configurations of the system must be fully preserved and protected.
2. **No breaking changes**: The modifications must not introduce compiler errors, runtime exceptions, or any unintended side-effects.
3. **Not a stopper**: Under no circumstances should the changes block or serve as a blocker to the runtime operation of the kiosk check-in, bookings, or other active services.

## Mandatory Implementation Plan & Documentation Protocol

For any feature implementation, architectural change, or significant bug fix:
1. **Real-File Implementation Plans in `docs/`**: Every implementation plan must be written as a permanent, real Markdown file in the project's `docs/` directory (e.g. `docs/<feature-name>-implementation-plan.md` or `docs/<feature-name>-specs.md`), in addition to chat planning artifacts.
2. **Persistence Across AI Sessions**: This ensures that if a discussion halts, any future AI agent or developer can immediately pick up where it left off, inspect the active plan, review design decisions, and resume execution seamlessly.
3. **Commit with Code**: Always commit the plan/specification document into Git alongside the code changes.

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

## 📱 Mandatory 4-Screen Responsive UI Protocol

Every UI component, dashboard, matrix, and modal in the application must strictly support and maintain the following **4 Screen Parameters**:

1. 📱 **Mobile (< 640px)**:
   - Single-column vertically stacked layouts (`grid-template-columns: 1fr`).
   - Full-width touch-friendly buttons (`min-height: 44px`).
   - Horizontally scrollable tables with `position: sticky; left: 0` for key identifying columns (e.g. employee names).
   - Wrapped filter bars and compact badge typography.

2. 📱 **Tablet Portrait (640px – 768px)**:
   - 2-column card/grid layouts (`grid-template-columns: repeat(2, 1fr)`).
   - Compact table padding and condensed action icons.
   - Flexible navigation and date picker controls without overflowing viewport width.

3. 💻 **Tablet Landscape / Small Laptop (769px – 1024px)**:
   - 2-to-3 column dashboard arrangements.
   - Semi-expanded matrix grids with smooth horizontal scrolling.
   - Side-by-side action button groups and filter bars.

4. 🖥️ **Desktop & Wide Displays (> 1024px / ≥ 1280px)**:
   - Full multi-column (3-to-4 columns) executive views.
   - Expanded data matrices utilizing maximum horizontal space (up to `1400px` container).
   - Side-by-side master-detail panels and tabbed workspaces.


