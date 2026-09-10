# 📊 Unified Executive Performance Hub & Operational Incident Tracking System
## Implementation Plan & Technical Architecture Specifications

**Document Path**: `docs/performance-hub-and-incidents-implementation-plan.md`  
**Target Feature**: Unified Executive Performance Hub (`/reports`) with 3 Cadences (Daily, Weekly, Monthly), Automated Operational Integrity Audits, and Incident Reporting.  
**Author**: Antigravity AI Pair Programmer & System Architect  
**Status**: 📝 Pending User Approval  

---

## 1. Executive Summary & Problem Statement

Epicenter operations currently suffer from two analytical gaps:
1. **Fragmented Analytics**: Performance reporting is scattered across 6 disconnected pages (`/reports`, `/store/monthly-sales`, `/store/stats`, `/store/sales-by-user`, `/store/financial-health`, and Dashboard widgets), requiring managers to jump between routes without a unified macro view.
2. **Operational Blindspots & Absence of Incident Tracking**: While financial numbers are tracked, operational incidents—such as cash drawer shortages, tardy staff arrivals, unclosed member gym sessions (>3h overdue), voided receipts, and facility/equipment breakdowns—are either buried in individual logs or not tracked at all.

This implementation consolidates all reporting into a **single, responsive Executive Performance Hub** at [`/reports`](file:///e:/Programming/epicenter-app2/src/app/features/reports/pages/reports-dashboard/reports-dashboard.ts) with **Daily**, **Weekly**, and **Monthly** views, featuring **Hourly Peak Traffic Distributions** and an **Operational Incident Reporting & Resolution Engine**.

---

## 2. Core Architecture & Data Models

### A. Manual Incident Report Model (`src/app/core/models/incident.model.ts`)
```typescript
export type IncidentCategory = 
  | 'EQUIPMENT'          // Broken cable, damaged dumbbell, treadmill error
  | 'FACILITY'           // Water leak, power outage, AC failure, shower issue
  | 'MEMBER_BEHAVIOR'    // Rules violation, altercation, unauthorized guest
  | 'SAFETY_INJURY'      // Slip & fall, dropped weight, medical incident
  | 'CASH_FINANCIAL'     // Register variance, suspicious transaction
  | 'STAFF_OPERATIONAL'  // Shift abandonment, tardiness, dispute
  | 'OTHER';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';

export interface IncidentReport {
  id?: string;
  incidentNumber: string;       // e.g. "INC-202609-001"
  title: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  incidentDate: string;         // YYYY-MM-DD
  incidentTime?: string;        // "14:30"
  location?: string;            // "Free Weights", "Cardio Zone", "Front Desk"
  description: string;
  reportedByUid: string;
  reportedByName: string;
  reportedAt: Date | any;
  involvedPersons?: string[];   // Member or staff names
  resolutionNotes?: string;
  resolvedByUid?: string;
  resolvedByName?: string;
  resolvedAt?: Date | any | null;
  createdAt: Date | any;
  updatedAt: Date | any;
}
```

### B. Automated System Incidents Model
Represents operational anomalies automatically aggregated from existing Firestore collections:
```typescript
export type SystemAnomalyType = 
  | 'CASH_DISCREPANCY'   // From 'shifts' where difference !== 0
  | 'STAFF_TARDINESS'    // From 'staff_attendance' where lateMinutes > 0
  | 'OVERDUE_SESSION'    // From 'attendance' where check-in > 3h or unclosed
  | 'VOIDED_TRANSACTION' // From 'transactions' where status === 'VOID'
  | 'PENDING_CLAIM';     // From 'commissions' where claim status === 'PENDING'

export interface SystemAnomaly {
  id: string;
  type: SystemAnomalyType;
  title: string;
  timestamp: Date;
  dateStr: string;
  severity: IncidentSeverity;
  details: string;
  amount?: number;
  personName?: string;
  referenceId?: string;
  isResolved: boolean;
  resolutionText?: string;
}
```

---

## 3. The 3 Cadence Modes in the Performance Hub

### ☀️ Mode 1: Daily Performance (Today or Pick Date)
* **Date Navigator**: `‹ Previous Day` | `[Today's Date Picker]` | `Next Day ›`
* **Scorecard**:
  * Period Gross Sales (with Cash Drawer vs. GCash/Bank split)
  * Cash Register Status (`Balanced`, `Short ₱X`, or `Over ₱X`)
  * Total Gym Check-Ins & Peak Hour of the Day (e.g. `Peak: 6:00 PM (18 visitors)`)
  * Active Staff on Duty
* **Incidents & Issues Today**:
  * List of any system anomalies detected today (cash shortages, late clock-ins, overdue member sessions, voided receipts).
  * Manual Incident Reports filed today.
  * Action button: `[+ File Incident Report]` modal.
* **Today's Product & Sales Breakdown**: Top retail items sold today.

### 🏃 Mode 2: Weekly Performance (Current Week / Pick Week)
* **Week Navigator**: `‹ Previous Week` | `Week of Sep 07 – Sep 13, 2026` | `Next Week ›`
* **Scorecard**:
  * Total Weekly Revenue & % Growth vs. Last Week
  * Net Cash Drawer Discrepancy for the week
  * Weekly Active Members (Unique visitors this week)
  * Incident Resolution Rate (e.g., `7 Incidents: 5 Resolved, 2 Open`)
* **Visual Trends**:
  * **Day-by-Day Revenue Pace** (Mon–Sun vs. Prior Week comparison curve)
  * **Weekly Hourly Traffic Distribution / Peak Hours** (Heatmap / curve showing busiest hours aggregated over 7 days + identifying the "Busiest Day of the Week")
* **Weekly Incident Audit Table**:
  * Tracks resolution status of all weekly incidents before Saturday payroll / shift cutoff.
* **Staff Leaderboard**: Sales closed & commissions accrued for the week.

### 📈 Mode 3: Monthly Performance (Month-to-Date / Pick Month)
* **Month Navigator**: `‹ Previous Month` | `September 2026` | `Next Month ›`
* **Scorecard**:
  * Total Monthly Sales vs. Monthly Quota (Visual Target Progress Bar)
  * Net Operating Profit & Profit Margin % (Gross Revenue minus Outflows/Bills via `FinancialAnalyticsService`)
  * Total Monthly Check-Ins & Member Growth (New Signups vs. Expiring Members)
  * Total Monthly Incidents & Resolution Summary
* **Visual Trends**:
  * **30-Day Sales Velocity & Quota Run-Rate**
  * **Monthly Peak Windows Summary** (Top 3 Busiest Hours + Weekday vs. Weekend foot traffic comparison)
  * **Revenue by Stream Breakdown** (Memberships vs. PT vs. Walk-ins vs. Supplements)
* **Incident Category Audit**:
  * Breakdown by category (Facility, Equipment, Safety, Financial, Staff) to spot recurring operational bottlenecks.

---

## 4. Step-by-Step Implementation Roadmap

### Phase 1: Models & Incident Service
1. Create `src/app/core/models/incident.model.ts` with TypeScript interfaces for manual and system incidents.
2. Create `src/app/core/services/incident.service.ts`:
   * Firestore operations on `incident_reports` collection (`getIncidentsByRange$`, `createIncident`, `updateIncident`, `deleteIncident`).
   * Auto-generate human-readable incident numbers (`INC-YYYYMM-XXX`).

### Phase 2: Analytics Engine Expansion in `ReportsService`
1. In `src/app/core/services/reports.service.ts`:
   * Add `getDailyPerformance(date: Date)`
   * Add `getWeeklyPerformance(startDate: Date, endDate: Date)`
   * Add `getMonthlyPerformance(year: number, month: number)`
   * Add `getSystemIncidents(startDate: Date, endDate: Date)`

### Phase 3: Incident Report Dialog Component
1. Create `src/app/features/reports/components/incident-dialog/`:
   * Form to log new incident: Title, Category, Severity, Date, Time, Location, Description, Involved Persons.
   * Form to update resolution: Status (`OPEN`, `INVESTIGATING`, `RESOLVED`, `CLOSED`), Resolution Notes.

### Phase 4: Hub Redesign in `ReportsDashboardComponent`
1. Update `reports-dashboard.html`, `.ts`, and `.css`:
   * Add 3-Way Cadence Switcher (`DAILY`, `WEEKLY`, `MONTHLY`).
   * Dynamic Date/Week/Month navigation controls.
   * Integrate the Incident & Operational Integrity Section (with badge indicators and `+ File Incident` button).
   * Integrate Weekly & Monthly Peak Hours distribution charts.
   * 4-Screen responsive styling (Mobile < 640px compact layout, Tablet 2-col, Desktop full grid).
   * Safe-area bottom scroll clearance (`padding-bottom: 120px` prevention of cutoff).

### Phase 5: Verification, Audit & Deployment
1. Build verification: Run `npm run build` to guarantee 0 compile/template errors.
2. Code review and change audit against `AGENTS.md` (no breaking changes to existing transactions, kiosk, or POS).
3. Commit, push, and deploy to Firebase Hosting.
