# AI Context Hub & Master Index (`AI_INDEX.md`)

> **MANDATORY INSTRUCTION FOR ALL AI ASSISTANTS (Gemini, Claude, Cursor, Copilot, ChatGPT, DeepSeek, etc.)**:
> Before taking any action or planning changes, **read this file first**. It acts as your map to the codebase, active work, historical context, and rules.

---

## 1. Quick Orientation

This workspace is a multi-project Angular / Firebase platform containing two primary applications:
1. **Gym App (`gym-app`)**: Staff, Admin, Kiosk Check-In, Cash Management, Shift Protection, and POS.
2. **Members Portal (`members-portal`)**: Member-facing portal residing under `projects/members-portal`.

---

## 2. Reading Priority Checklist for Any AI Session

When you start a session or receive a prompt, follow this reading order:

1. **Active State & Work Log**:
   - 📌 [`docs/ai-session-context/ACTIVE_CONTEXT.md`](docs/ai-session-context/ACTIVE_CONTEXT.md)  
     *What is currently happening, current milestone, uncommitted/in-flight tasks, and active goals.*
   - 📜 [`docs/ai-session-context/SESSION_LOG.md`](docs/ai-session-context/SESSION_LOG.md)  
     *Chronological log of past sessions: summaries, decisions, actions taken, blockers, failures, and resolutions.*
   - 📝 [`docs/ai-session-context/BACKLOG_AND_PENDING.md`](docs/ai-session-context/BACKLOG_AND_PENDING.md)  
     *Pending items, backlog, deferred ideas, and open bugs.*

2. **Core System Governance & Architectural Rules**:
   - 🛡️ [`.agents/AGENTS.md`](.agents/AGENTS.md) — Mandatory Change Audit, Dexie offline sync protocol, 4-Screen Responsive UI rules, zero-black-text contrast rules.
   - 🎨 [`docs/DESIGN_SYSTEM_TOKENS.md`](docs/DESIGN_SYSTEM_TOKENS.md) — CSS Custom Properties, token variables, and zero-magic-numbers constraint.
   - ⚡ [`docs/DEXIE_OFFLINE_SYNC_MASTER.md`](docs/DEXIE_OFFLINE_SYNC_MASTER.md) — Master architecture for IndexedDB + Firebase Cloud Functions sync.

3. **Feature Specifications & Active Plans**:
   - Check `docs/` for relevant feature specs before implementing anything (e.g., `docs/desktop-shortcuts-specs.md`, `docs/dexie-architecture/plans/`, etc.).

---

## 3. Mandatory Protocol: What You (The AI) Must Do Every Session

To ensure seamless continuity between different AI models and sessions, **every AI must adhere to the 3-Step Protocol**:

### Step 1: Session Start (Context Ingestion)
- Read [`docs/ai-session-context/ACTIVE_CONTEXT.md`](docs/ai-session-context/ACTIVE_CONTEXT.md).
- Understand the state of the repo, recent changes, and any unresolved blockers.

### Step 2: During Execution
- When implementing a feature or fix, follow existing patterns in `.agents/AGENTS.md`.
- Never introduce breaking changes to working check-in, bookings, or kiosk systems.
- If an implementation plan is required, create a physical markdown document in `docs/<feature>-specs.md`.

### Step 3: Session End / Task Completion (Physical File Documentation)
Before ending your response, **you MUST update the physical context files**:
1. **Update [`docs/ai-session-context/ACTIVE_CONTEXT.md`](docs/ai-session-context/ACTIVE_CONTEXT.md)**:
   - Current status of the application.
   - Next immediate priority.
2. **Append an entry to [`docs/ai-session-context/SESSION_LOG.md`](docs/ai-session-context/SESSION_LOG.md)**:
   - Date & Time.
   - AI Model / Tool used.
   - Goal requested by user.
   - Actions taken & files modified.
   - Failures / Obstacles encountered and how they were solved.
   - Decisions made.
3. **Update [`docs/ai-session-context/BACKLOG_AND_PENDING.md`](docs/ai-session-context/BACKLOG_AND_PENDING.md)**:
   - Remove completed items.
   - Add any newly discovered bugs, tech debt, or deferred tasks.

---

## 4. Key CLI Commands & Shortcuts

- **Desktop Shortcuts Launcher**: Double-click the shortcuts on the Windows Desktop or run `scripts\deploy-shortcuts.ps1`.
- **Gym App Local Dev**: `scripts\start-gym-app.bat` or `npx ng serve --open` (Port 4200 default).
- **Members Portal Local Dev**: `scripts\start-members-portal.bat` or `npx ng serve members-portal --open` (Port 4300 default).
- **Compilation Check**: `npm run build` or `npx ng build` / `npx ng build members-portal`.
