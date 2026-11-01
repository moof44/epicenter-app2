# Active Context & Current State

> **Last Updated**: 2026-11-01 02:05 PM  
> **Status**: Healthy / Operational — Running Locally on Port 4200 (HTTP 200 OK)  
> **Active Milestone**: Customer Care & Call Center Department Module (`/customer-care`) Active Local & Live

---

## 1. Current Application Status

- **Gym App (`gym-app`)**:
  - Running locally in watch mode on **`http://localhost:4200`** (Process background daemon).
  - Also deployed live in production: **`https://epicenter-app.web.app`**.
  - Local HTTP check: `200 OK`.
  - Core features: POS, Kiosk check-in, Attendance, Shifts, Cash management, Reports, and **Customer Care Call Center (`/customer-care`)**.

- **Members Portal (`projects/members-portal`)**:
  - Independent Angular project sharing backend and types.
  - Build status: Clean.

---

## 2. Recent Major Changes

1. **User Profile DatePipe NG02100 Remediation**:
   - Fixed NG02100 error on /profile for employee documents and payslips.
   - Wrapped date fields in safeToDate helper in user-profile and dialogs.


1. **Customer Care & Call Center Department Module (`/customer-care`)**:
   - 10 campaign presets with Taglish SMS & Call script templates, priority levels (`1 = HIGH 🔥`, `2 = NORMAL ⚡`, `3 = LOW 💤`), and snapshot interfaces.
   - `CUSTOMER_CARE` role in User Management.
   - 0-read Firestore filtering across 550+ members using Dexie IndexedDB cache.
   - Calling Workspace with priority queue, Manager briefing banner, auto-interpolated Taglish SMS & Call triggers, and 1-tap outcome logger with staff stories.
   - Campaign Reports with conversion funnels and 1-click Attempt #2 creator.
   - AI Guide in `docs/AI_CALL_CENTER_GUIDE.md`.

2. **Local Dev Server Started**:
   - `npx ng serve --port 4200 --open` running as a background task.
   - Verified HTTP `200 OK` on `http://localhost:4200`.

---

## 3. Immediate Next Steps / In Progress

- User testing of `/customer-care` on local dev server (`http://localhost:4200/customer-care`).
- Optional data cleanup: Merge 3 duplicate member profiles discovered in October (`Hannah Grace Laguda`, `Ezra Agustin`, `Adrian L. Mendoza`) and populate missing `membershipExpiration` (`2026-11-26`) on `Angeline Reyes` (`UMZTksizaMx3OeXJ6G8o`).
