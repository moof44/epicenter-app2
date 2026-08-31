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

---

## 🎨 Mandatory Token Variable & Zero-Magic-Numbers Architecture Protocol

Every AI agent and developer must strictly adhere to [`docs/DESIGN_SYSTEM_TOKENS.md`](file:///e:/Programming/epicenter-app2/docs/DESIGN_SYSTEM_TOKENS.md):

1. **All CSS Properties MUST Use Defined Variables**:
   - Every color, font-size, line-height, margin, padding, border, radius, shadow, and dimension MUST be bound to a CSS Custom Property (`var(--color-...)`, `var(--font-size-...)`, `var(--height-...)`) declared in `src/styles.css` and mapped in `tailwind.config.js`.
2. **Zero Magic Numbers (No Arbitrary Values)**:
   - Hardcoding arbitrary pixel values (e.g. `w-[37px]`, `style="height: 43px"`), unmapped padding, or ad-hoc hex colors (`#123abc`) is **strictly prohibited**.
3. **WCAG 2.2 Level AAA/AA Contrast Compliance**:
   - Headings: `var(--color-text-pure)` (`#ffffff`, 19.4:1 contrast ratio).
   - Primary Body & Table Data: `var(--color-text-body)` (`#e2e8f0`, 15.2:1 contrast ratio).
   - Subtitles & Metadata: `var(--color-text-secondary)` (`#cbd5e1`, 12.5:1 contrast ratio).
   - Dim / Floor Text: `var(--color-text-muted)` (`#94a3b8`, 7.2:1 contrast ratio). Never use dark grey text on dark canvas.
4. **Declare First Rule**:
   - If a new dimension, component size, or color variant is needed, it MUST be formally declared in `:root` in `src/styles.css`, mapped in `tailwind.config.js`, and documented in `docs/DESIGN_SYSTEM_TOKENS.md` before being used in any component template or stylesheet.
---

## 🚫 Mandatory Dark Contrast, Zero-Black-Text & Template Audit Protocol

Every AI agent and developer must strictly adhere to the following **Zero Dark-on-Dark Text Rules**:

1. **Explicit High-Contrast Declarations on Every HTML Element**:
   - In dark mode (`#090d16` canvas / `#0f172a` surface), **NO text element may ever be left unstyled to inherit browser defaults**.
   - Headings: `var(--color-text-pure)` (`#ffffff`, 19.4:1 contrast ratio).
   - Body & Table Data: `var(--color-text-body)` (`#e2e8f0`, 15.2:1 contrast ratio).
   - Subtitles & Metadata: `var(--color-text-secondary)` (`#cbd5e1`, 12.5:1 contrast ratio).
   - Accents / Numbers: `var(--color-cyan-light)` (`#22d3ee`), `var(--color-gold-light)` (`#fbbf24`), `var(--color-mint-success)` (`#34d399`).
   - **Strictly Prohibited**: Never use dark grey (`#64748b` or darker), dark indigo, or unmapped black text on dark surfaces.

2. **Template-First Audit (Mandatory Before Editing CSS)**:
   - Before writing or modifying any scoped `.css` file, inspect the target `.html` template to extract all class names.
   - Every class used in HTML MUST be explicitly declared in the stylesheet with token colors.

3. **Multi-Role Symmetry Protocol**:
   - Always check both Admin (`isManagerView()`) and Staff/Trainer (`!isManagerView()`) templates to guarantee identical design quality and emotional feedback across all user permission tiers.
