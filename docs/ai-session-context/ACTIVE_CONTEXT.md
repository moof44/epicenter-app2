# Active Context & Current State

> **Last Updated**: 2026-11-01 06:30 AM  
> **Status**: Healthy / Operational — Committed, Pushed, and Deployed to Production  
> **Active Milestone**: Customer Care / Call Center Department Module (`/customer-care`) Deployed

---

## 1. Current Application Status

- **Gym App (`gym-app`)**:
  - Running Angular 21 with Tailwind and CSS design tokens.
  - Core features: POS, Kiosk check-in, Attendance, Shifts, Cash management, Reports, and **Customer Care Call Center (`/customer-care`)**.
  - Production Build: Clean.
  - Git: Committed (`ace2fd9`) & Pushed to `origin/master`.
  - Deployment: **Live on Firebase Hosting (`https://epicenter-app.web.app`)**.

- **Members Portal (`projects/members-portal`)**:
  - Independent Angular project sharing backend and types.
  - Build status: Clean.

---

## 2. Recent Major Changes

1. **Customer Care & Call Center Department Module (`/customer-care`)**:
   - **Data Layer (`src/app/core/models/customer-care.model.ts`)**: 10 campaign presets with Call Center Specialist Taglish SMS & Call templates, outcome statuses, priority levels (`1 = HIGH 🔥`, `2 = NORMAL ⚡`, `3 = LOW 💤`), and snapshot interfaces.
   - **Role Management (`UserFormDialogComponent` & `UserListComponent`)**: Added `CUSTOMER_CARE` role to staff management forms and filters.
   - **Navigation & Routing (`src/app/app.routes.ts` & `src/app/app.html`)**: Added `/customer-care` lazy-loaded child routes with `roleGuard` (Admin, Manager, Customer Care) and sidebar 1-click link.
   - **Dexie In-Memory Filter Engine (`CustomerCareService`)**: 0-read Firestore filtering across 550+ members (membership expiration, training expiration, 30-day visit counts, goal keywords), plus atomic Firestore batch writes for campaigns and items.
   - **Campaign Hub (`CampaignHubComponent`)**: Active/archived lists with KPI pulse cards and progress tracking.
   - **Campaign Creator Wizard (`CampaignCreatorComponent`)**: 5-step wizard with preset loader, Taglish script editor, wildcard multi-filters (including Personal Training expiration for nutrition coaching), and member preview with Admin Priority toggles.
   - **Calling Workspace (`CallingWorkspaceComponent`)**: Priority queue (`High -> Normal -> Low`), pinned Manager briefing banner, `.info-data-card` member context, 1-tap `tel:` and `sms:` triggers with auto-filled Taglish templates, and 1-tap outcome logger with staff story handover.
   - **Campaign Reports (`CampaignReportComponent`)**: Conversion funnels, staff productivity leaderboard, and 1-click **Attempt #2 Follow-Up Campaign generator**.
   - **AI Guide (`docs/AI_CALL_CENTER_GUIDE.md`)**: Complete guide for Gemini/Claude to query call stories, assess renewal bottlenecks, or generate follow-up campaigns.

2. **Commit, Push & Deploy**:
   - Resolved pre-commit lint issues (accessibility tags and unused imports).
   - Committed changes to master: commit `ace2fd9`.
   - Pushed cleanly to GitHub: `https://github.com/moof44/epicenter-app2`.
   - Deployed live to Firebase Hosting: `https://epicenter-app.web.app`.

---

## 3. Immediate Next Steps / In Progress

- Production verification of `/customer-care` on desktop and mobile.
- Optional data cleanup: Merge 3 duplicate member profiles discovered in October (`Hannah Grace Laguda`, `Ezra Agustin`, `Adrian L. Mendoza`) and populate missing `membershipExpiration` (`2026-11-26`) on `Angeline Reyes` (`UMZTksizaMx3OeXJ6G8o`).
