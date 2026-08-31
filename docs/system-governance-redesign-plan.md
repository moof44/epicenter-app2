# Implementation Plan: System & Governance Suite Redesign (3 Pages)

## 📋 Overview
Redesign the complete **SYSTEM & GOVERNANCE** section from the sidebar navigation:
1. ⚙️ **General Settings** ([`GeneralSettingsComponent`](file:///e:/Programming/epicenter-app2/src/app/features/settings/components/general-settings/general-settings.ts) - `/settings`)
2. 🔍 **Audit Logs** ([`AuditLogComponent`](file:///e:/Programming/epicenter-app2/src/app/features/audit-log/audit-log.ts) - `/audit-log`)
3. 🐛 **Error Logs** ([`ErrorLogsComponent`](file:///e:/Programming/epicenter-app2/src/app/features/error-logs/error-logs.component.ts) - `/error-logs`)

All 3 pages will be transformed into the **Master Dark Pro Design System**, adhering strictly to:
- **4-Screen Responsive UI Protocol** (Mobile < 640px, Tablet Portrait 640–768px, Tablet Landscape 769–1024px, Desktop ≥ 1025px).
- **Adaptive Table-to-Card Grid Architecture** (Failure #25 Prevention).
- **Single Scroll Root & Safe-Area Bottom Buffer** (Failures #24, #26, #29 Prevention).
- **Zero-Black-Text & Explicit High-Contrast Token Architecture**.

---

## 🏗️ Detailed Architecture & Component Specifications

### 1. General Settings (`/settings`)
* **Files**: `src/app/features/settings/components/general-settings/` (`general-settings.ts`, `general-settings.html`, `general-settings.css`)
* **Header Deck**: Back button to dashboard, title `System Governance & Application Rules`, subtitle.
* **4-Card Executive KPI Summary Deck**:
  1. *Monthly Revenue Target*: Active sales quota in ₱ (Cyan).
  2. *Default Staff Pay Rate*: Base daily wage rate in ₱ (Gold).
  3. *Active Member Badges*: Total defined achievement badges (Mint).
  4. *Promo Discount Rules*: Total active store promotional rules (Purple).
* **3 Dark Pro Settings Workspaces**:
  - **Tab 1: System Goals & Security Zone**:
    - Application goals form (Monthly Quota ₱, Default Daily Salary Rate ₱) with `[ Save Settings ]` button.
    - Security Zone with emergency `[ ⚠️ Force Logout All Users ]` action.
    - System Maintenance with `[ 🎖️ Initialize Historical Badges ]` retroactive batch processing.
  - **Tab 2: Gamification & Member Badges**:
    - Badge creation form in Dark Pro card.
    - Master badges table (Desktop ≥ 640px) and touch cards (< 640px) with icon badges, category pills, target milestones, and Edit/Delete actions.
  - **Tab 3: Discounts & Store Promotions**:
    - Promotional discount rule creation form.
    - Master discount rules table (Desktop ≥ 640px) and touch cards (< 640px) with code badges, value pills in ₱/%, type pills, product scope, and Edit/Delete actions.

---

### 2. Audit Logs (`/audit-log`)
* **Files**: `src/app/features/audit-log/` (`audit-log.ts`, `audit-log.html`, `audit-log.css`)
* **Header Deck**: Back button, title `System Activity & Governance Audit Log`, subtitle.
* **4-Card Executive KPI Summary Deck**:
  1. *Total Audit Events*: Total logged operations (Cyan).
  2. *Financial Transactions*: Sales, voids, and payments (Gold).
  3. *Shift & Till Operations*: Register open/close, floats, payouts (Mint).
  4. *Facility Access*: Member check-ins and check-outs (Purple).
* **Filters & Event Filter Deck**:
  - Date Range pickers, Staff dropdown, and `[ Search Events ]` button.
  - Interactive multi-select category chips (`All`, `Sales`, `Voids`, `Check-Ins`, `Check-Outs`, `Shift Open`, `Shift Close`, `Expenses`, `Float`).
* **Timeline Event Stream**:
  - Glowing category indicator, icon seals, performer tags, timestamp pills, and amount tags in ₱.
  - High-contrast pagination bar.

---

### 3. System Error Logs (`/error-logs`)
* **Files**: `src/app/features/error-logs/` (`error-logs.component.ts`, `error-logs.component.html`, convert `error-logs.component.scss` $\rightarrow$ `error-logs.component.css`)
* **Header Deck**: Back button, title `System Error Logs & Diagnostics`, subtitle, and `[ 🧹 Clear All Logs ]` button.
* **4-Card Executive KPI Summary Deck**:
  1. *Total Recorded Errors*: Total error logs (Cyan).
  2. *Unresolved Errors*: Active pending issues (Gold).
  3. *Fatal Exceptions*: High-severity crashes (Rose).
  4. *System Health*: Operational status indicator (Mint).
* **Filter & Search Deck**:
  - Search input for error message, URL, or user.
  - Severity filter chips (`ALL`, `FATAL`, `ERROR`, `WARNING`).
  - Status filter chips (`ALL`, `UNRESOLVED`, `RESOLVED`).
* **Logs Accordion & AI Quick Export**:
  - Dark Pro expansion panels with severity pills, occurrence badges (`x...`), route URLs, user tags, and timestamp.
  - `[ 📋 Copy for AI ]` 1-click clipboard prompt generator.
  - High-contrast monospaced stack trace viewer.

---

## 🧪 Verification Plan
1. **CSS Audit**: Run audit script to guarantee 0 undefined CSS variables and 100% class coverage across all 3 modules.
2. **Build Verification**: Run `npm run build` to ensure 0 compilation errors and 0 warnings.
3. **Walkthrough Document**: Update `walkthrough.md` with complete implementation details.
