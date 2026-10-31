# Implementation Plan: Customer Care & Call Center Department Module (`/customer-care`)

> **Status**: Ready for Owner Review & Approval (No Code Implemented Yet)  
> **Target Applications**: `gym-app` (Staff/Admin Platform)  
> **Parent Proposal**: [`docs/customer-care-call-center-proposal.md`](customer-care-call-center-proposal.md)  
> **Date**: November 1, 2026  

---

## 1. Executive Summary & Architecture Blueprint

The goal of this implementation is to establish a dedicated, high-performance **Customer Care & Call Center Workspace** (`/customer-care`) in `gym-app` that drives member retention, renewals, PT adherence, nutrition coaching, and relationship building.

### Architecture Highlights
1. **Isolated Module Structure**: All customer care code lives inside `src/app/features/customer-care/` with lazy-loaded routing, preventing bloat in the main bundle.
2. **Zero-Firestore-Cost Filter Generation**: Filters query the existing local **Dexie IndexedDB** (`members` table) in memory (<5ms), incurring **0 Firestore read operations** when scanning 550+ members.
3. **AI-First & Self-Documenting Data Layer**: Two Firestore collections (`call_campaigns` and `call_campaign_items`) structured with plain-English keys, embedded `memberSnapshot` data, and `attemptHistory[]`, making automated AI analysis and follow-up list generation effortless.
4. **Role & Navigation Symmetry**: Users with `CUSTOMER_CARE` role get a focused, simplified interface with direct landing on `/customer-care`. Admins/Managers retain full administrative power (creating lists, editing Taglish scripts, setting member priorities, and viewing executive reports).
5. **Strict 4-Screen Responsive Guarantee**: Adheres strictly to `docs/DESIGN_SYSTEM_TOKENS.md` (`Failures #22–#30` prevention protocols), guaranteeing zero dark-on-dark text, single scroll root, safe-area bottom buffers, and adaptive table-to-card rendering on mobile.

---

## 2. Directory & File Blueprint

```text
src/app/
├── core/
│   ├── models/
│   │   ├── customer-care.model.ts          <-- [NEW] Data contracts, types, enums, scripts
│   │   └── user.model.ts                  <-- [UPDATE] Add 'CUSTOMER_CARE' to UserRole union
│   ├── services/
│   │   └── customer-care.service.ts        <-- [NEW] Firestore campaigns CRUD, batching, Dexie filtering
│   └── guards/
│       └── role.guard.ts                   <-- [VERIFY] Support 'CUSTOMER_CARE'
│
├── features/
│   ├── user-management/
│   │   └── components/user-form-dialog/
│   │       └── user-form-dialog.component.ts <-- [UPDATE] Add 'CUSTOMER_CARE' to rolesList
│   │
│   └── customer-care/                     <-- [NEW FEATURE DIRECTORY]
│       ├── customer-care.routes.ts         <-- Lazy loaded routes
│       ├── pages/
│       │   ├── campaign-hub/               <-- List of active/archived campaigns + progress
│       │   │   ├── campaign-hub.component.ts
│       │   │   ├── campaign-hub.component.html
│       │   │   └── campaign-hub.component.scss
│       │   ├── campaign-creator/           <-- Wizard: filters, templates, priority, preview
│       │   │   ├── campaign-creator.component.ts
│       │   │   ├── campaign-creator.component.html
│       │   │   └── campaign-creator.component.scss
│       │   ├── calling-workspace/          <-- Core caller view: queue, member card, scripts, outcome
│       │   │   ├── calling-workspace.component.ts
│       │   │   ├── calling-workspace.component.html
│       │   │   └── calling-workspace.component.scss
│       │   └── campaign-report/            <-- Outcomes funnel, agent productivity, Attempt #2 generator
│       │       ├── campaign-report.component.ts
│       │       ├── campaign-report.component.html
│       │       └── campaign-report.component.scss
│       └── components/
│           ├── member-caller-card/         <-- High-contrast read-only member data card (Req 13)
│           │   ├── member-caller-card.component.ts
│           │   ├── member-caller-card.component.html
│           │   └── member-caller-card.component.scss
│           ├── outcome-logger-dialog/      <-- Quick modal/drawer for logging call status & story
│           │   ├── outcome-logger-dialog.component.ts
│           │   ├── outcome-logger-dialog.component.html
│           │   └── outcome-logger-dialog.component.scss
│           └── edit-campaign-dialog/       <-- Admin dialog to edit briefing remarks & Taglish scripts
│               ├── edit-campaign-dialog.component.ts
│               ├── edit-campaign-dialog.component.html
│               └── edit-campaign-dialog.component.scss
│
├── app.routes.ts                           <-- Register '/customer-care' route
├── app.html                                <-- Add Customer Care navigation item to sidebar
└── app.ts                                  <-- Role checks & landing redirect logic for CUSTOMER_CARE
```

---

## 3. Step-by-Step Phased Execution Plan

### Phase 1: Data Models, Templates & Firestore Contracts
- **File**: `src/app/core/models/customer-care.model.ts`
- **Actions**:
  1. Define `CampaignObjectiveType`:
     - `EXPIRING_SOON`
     - `RECENTLY_EXPIRED`
     - `LOW_ATTENDANCE`
     - `LONG_EXPIRED`
     - `PT_ACTIVE_NUTRITION`
     - `PT_EXPIRING_OR_EXPIRED`
     - `PROMOTION`
     - `FEEDBACK`
     - `CONCERNS`
     - `FOLLOW_UP_ATTEMPT`
  2. Define `CallStatus`:
     - `PENDING`
     - `TEXT_SENT`
     - `ANSWERED_AGREED`
     - `ANSWERED_INTERESTED`
     - `ANSWERED_FEEDBACK_GIVEN`
     - `CALLBACK_REQUESTED`
     - `NO_ANSWER`
     - `CANNOT_BE_REACHED`
     - `REJECTED`
     - `DO_NOT_CONTACT`
  3. Define `PriorityLevel` (`1 = HIGH`, `2 = NORMAL`, `3 = LOW`).
  4. Define master constant `CAMPAIGN_GOAL_PRESETS`:
     - Contains the default Taglish SMS template, Taglish Call script, objective description, and default filter parameters for all 10 campaign types.
  5. Define TypeScript interfaces for `CallCampaign`, `CallCampaignItem`, `MemberSnapshot`, `AttemptLog`, and `CampaignFilterCriteria`.

### Phase 2: Role Management & Navigation Integration
- **Files**:
  - `src/app/core/models/user.model.ts`
  - `src/app/features/user-management/components/user-form-dialog/user-form-dialog.component.ts`
  - `src/app/app.routes.ts`
  - `src/app/app.html`
  - `src/app/app.ts`
- **Actions**:
  1. Add `'CUSTOMER_CARE'` to the User Roles selection list so Admins can assign this role to call center staff.
  2. Update `app.routes.ts` with route `/customer-care` protected by `authGuard` and `roleGuard` (roles: `['ADMIN', 'MANAGER', 'CUSTOMER_CARE']`).
  3. Update `app.html` with a dedicated **Customer Care** navigation section in the collapsible sidebar.
  4. Update `app.ts`: If a user has *only* the `CUSTOMER_CARE` role, redirect their default root landing from `/dashboard` to `/customer-care`.

### Phase 3: Core Service Layer & Dexie Filtering Engine
- **File**: `src/app/core/services/customer-care.service.ts`
- **Actions**:
  1. **Dexie Fast-Filter Engine**:
     - Queries local `AppIndexedDbService.members` in memory.
     - Supports multi-filtering: membership status, `membershipExpiration` window, `trainingExpiration` window (active PT, expiring PT, lapsed PT, or gym member without PT), visit count in the last 30 days, days since last check-in, goal keyword, gender, tags, and exclusion of `DO_NOT_CONTACT` members.
  2. **Campaign Management (Firestore)**:
     - `createCampaignWithItems(campaignData, selectedMembers)`: Uses Firestore batched writes to commit the `call_campaigns` document and all `call_campaign_items` documents atomically.
     - `getCampaignsLive()`: Streams active and archived campaigns with lightweight reads.
     - `getCampaignItemsLive(campaignId)`: Streams campaign items with priority sorting.
  3. **Call Outcome Logging**:
     - `logCallOutcome(itemId, campaignId, outcomeData)`: Updates item status, logs attempt history, updates campaign header aggregate counters (`stats.statusBreakdown`).
     - If outcome is `DO_NOT_CONTACT`, optionally flag the member profile tag.
  4. **Template Interpolator**:
     - Replaces `{firstName}`, `{fullName}`, `{goal}`, `{expirationDate}`, `{trainingExpirationDate}`, `{lastCheckInDate}`, and `{staffName}` dynamically.
  5. **1-Click Follow-Up Generator**:
     - `createFollowUpCampaign(parentCampaignId, targetStatuses, attemptNumber)`: Extracts unreached members from a finished campaign and generates an `Attempt #2` campaign carrying over prior notes.

### Phase 4: Campaign Hub Page (`/customer-care`)
- **Folder**: `src/app/features/customer-care/pages/campaign-hub/`
- **Actions**:
  1. Displays KPI Pulse cards: *Total Campaigns*, *Calls Logged Today*, *Pending High Priority*, *Total Contacted*.
  2. Renders Active Campaign Cards with visual progress bars (`X / Y Contacted`), goal badge, manager remark snippet, and primary action: **`Open Calling Queue`**.
  3. Includes an **`Archived / Completed`** tab for past campaigns.
  4. Provides a prominent Gold Power Button: **`+ Generate New Call List`** (Admin & Manager only).

### Phase 5: Campaign Creator Wizard (`/customer-care/create`)
- **Folder**: `src/app/features/customer-care/pages/campaign-creator/`
- **Actions**:
  1. **Step 1: Goal & Template Selection**:
     - 1-click selection from the 10 presets (auto-loads Taglish SMS and Call scripts).
  2. **Step 2: Script & Manager Briefing Customization**:
     - Textareas to edit the Taglish SMS and Call script.
     - Dedicated field for **Manager's Campaign Remarks / Briefing** (`managerRemarks`).
  3. **Step 3: Multi-Filter Wildcard Settings**:
     - Expiration date pickers (Gym Membership & Personal Training).
     - Attendance sliders (visits in last 30 days).
     - PT status selector (Active PT, Expiring PT, No PT).
  4. **Step 4: Member Preview & Priority Tagging**:
     - Runs local Dexie query instantly.
     - Displays preview table with member name, goal, expiration, last visit, and an **Admin Priority Toggle** (`🔥 High`, `⚡ Normal`, `💤 Low`).
     - Checkbox to include/exclude individual members before generation.
  5. **Step 5: Confirmation & Generation**:
     - Shows total count and saves campaign + items to Firestore.

### Phase 6: The Calling Workspace (`/customer-care/campaigns/:id`)
- **Folder**: `src/app/features/customer-care/pages/calling-workspace/`
- **Actions**:
  1. **Pinned Manager's Briefing Banner**:
     - High-contrast banner at top showing `managerRemarks` and an `[ Edit Briefing / Scripts ]` action (for Admin/Manager).
  2. **Priority Queue Navigation**:
     - Tabs: `To Contact (X)` | `Follow-Up / Unreachable (Y)` | `Completed (Z)` | `All`.
     - Automatically sorted by: `Priority (High -> Normal -> Low)` $\rightarrow$ `Urgency`.
     - Member items show name, goal pill, priority badge, and contact status.
  3. **Active Member Caller Panel (Req 13 - `.info-data-card` architecture)**:
     - Prominently displays: Full Name, Contact Number, Fitness Goal, Membership Expiration & Days Remaining/Expired, **Training Expiration & PT Status**, Last Check-in date, 30-Day attendance count, and Past Call History Timeline.
  4. **Taglish Action Suite**:
     - Live interpolated Taglish SMS and Call scripts with copy buttons.
     - **`📞 Call Now`**: Native `tel:` trigger with 44px+ touch-friendly target.
     - **`💬 Send SMS`**: Native `sms:` trigger with pre-filled Taglish message.
     - **`📋 Copy Text / Phone`**: 1-click clipboard triggers.
  5. **Outcome Logging Dock**:
     - 1-tap outcome buttons (`Agreed`, `Interested`, `Text Sent`, `No Answer`, `Cannot Reach`, `Callback`, `Rejected`, `Do Not Contact`).
     - Required/encouraged `Story / Remarks` textarea for handover continuity.
     - **`Save & Next Member`** button.

### Phase 7: Campaign Report & Follow-Up Generator (`/customer-care/campaigns/:id/report`)
- **Folder**: `src/app/features/customer-care/pages/campaign-report/`
- **Actions**:
  1. **Executive Outcome Metrics**: Visual breakdown of conversion (Agreed, Interested, Texted, Unreached, Rejected).
  2. **Staff Productivity Matrix**: Table of calls/texts logged by each Customer Care agent.
  3. **1-Click "Create Attempt #2 List" Button**:
     - Pre-selects all members from this campaign with `NO_ANSWER`, `CANNOT_BE_REACHED`, or `CALLBACK_REQUESTED` and opens the Campaign Creator wizard to launch Attempt #2 with 1 click.

### Phase 8: Verification, 4-Screen Responsive Testing & Build Check
- **Actions**:
  1. Verify zero dark-on-dark text and strict WCAG AAA compliance across all new templates.
  2. Verify Mobile (`< 640px`), Tablet Portrait (`640px – 768px`), Tablet Landscape (`769px – 1024px`), and Desktop (`> 1024px`) layouts.
  3. Check bottom safe-area padding (`padding-bottom: 140px` to `220px`) to prevent navigation dock clipping.
  4. Verify production compilation (`npx ng build`).
  5. Document AI prompt guide in `docs/AI_CALL_CENTER_GUIDE.md` so Gemini, Claude, or any LLM can analyze results or generate campaigns directly via prompt.

---

## 4. UI/UX 4-Screen Responsive Blueprint & Safeguards

| Screen Tier | Width | Layout Strategy | Key Safeguard Enforced |
| :--- | :--- | :--- | :--- |
| 📱 **Mobile** | `< 640px` | 1-Column Mobile Caller Card Deck | **Failure #25 Safeguard**: No wide sticky columns or squished tables. Large 44px+ full-width touch buttons. Clamped `16px` page titles (`Failure #29`). `220px` bottom safe-area buffer (`Failure #26`). |
| 📱 **Tablet Portrait** | `640px – 768px` | 2-Column Split (Compact Priority Queue + Active Caller View) | `100px` bottom safe-area buffer (`Failure #24`). Compact chips, responsive header with overflow protection. |
| 💻 **Tablet Landscape** | `769px – 1024px` | Split Master-Detail Workspace | Side-by-side priority queue and calling card with script preview. |
| 🖥️ **Desktop** | `> 1024px` | 3-Zone Command Center (up to 1400px container) | Left: Priority Queue. Center: Active Member Data & Scripts. Right: Call Outcome Logger & Past Call Timeline. |

---

## 5. Next Step

As instructed, **no code has been modified or implemented yet**.

Please review this implementation plan. Once you give the go-ahead, we will begin execution step-by-step starting with **Phase 1 (Models & Contracts)** and **Phase 2 (Roles & Routing)**.
