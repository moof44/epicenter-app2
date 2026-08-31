# Implementation Plan: Members Feature Complete Redesign

> **Target**: Members Feature (`src/app/features/members/`)  
> **Pages Covered**:
> 1. Member Directory & Table (`/members` — `MemberList`)
> 2. Member Registration & Editing Form (`/members/add`, `/members/edit/:id` — `MemberForm`)
> 3. Duplicate Resolver Modal (`MemberDuplicateResolver`)
>
> **Core Objective**: Elevate the member management experience into a modern, high-contrast, responsive **Member Operations Center** with Level AAA contrast, live KPI summary chips, mobile-optimized card rows, and streamlined member onboarding.

---

## 🎨 Page-by-Page Redesign Blueprint

### 1. 👥 Member Directory (`/members`)
- **Top Metric Pulse Ribbon**:
  - 4 quick KPI summary chips above the table: **Total Members**, **Active Members** (`#34d399`), **Expiring This Week** (`#fbbf24`), and **Pending Body Scans** (`#22d3ee`).
- **Streamlined Control Deck**:
  - High-contrast Search Field with Cyan focus glow + wrapped filter chips (Status, Subscription, Progress Scan Status).
  - High-impact Action Buttons: **Add Member** (Eagles Gold Pill) and **Resolve Duplicates** (Subtle Alert Pill).
- **Responsive 4-Screen Data Architecture**:
  - **Desktop (≥ 1024px)**: Full multi-column data table with avatar initials, status chips, expiration date badges, scan preview buttons, and 1-click action triggers.
  - **Mobile & Tablet (< 1024px)**: Tactile Member Cards with avatar chips, phone quick-call, status badges, and expandable action bars.

---

### 2. 📝 Member Registration & Edit Form (`/members/add`, `/members/edit/:id`)
- **Structured Semantic Form Cards**:
  - Wrapped with `<app-page-container maxWidth="narrow">` and `<app-page-header>`.
  - Grouped into 4 visual sections:
    1. **Personal Information**: Full Name, Contact Number, Address, Gender, Birthday.
    2. **Membership & Training Schedule**: Membership Expiration Date, Training Expiration Date, Status.
    3. **Goals & Staff Remarks**: Goal textarea, Staff Notes/Remarks.
    4. **Exclusive Tags & Badges**: Multi-select badge chips.
  - **Members Portal Access Deck (Edit Mode)**:
    - Status badge (`Active` / `No Account`), Username display, Temporary PIN format, and Reset/Activate trigger buttons with high-contrast styling.

---

### 3. 🔀 Duplicate Resolver Modal
- High-contrast Dark Pro modal styling with clear side-by-side member comparison and merge controls.

---

## 📱 Mandatory 4-Screen Responsive UI Protocol

| Screen Tier | Width | Layout & Adaptations |
| :--- | :--- | :--- |
| **📱 Mobile** | `< 640px` | Full-width vertical cards (`grid-template-columns: 1fr`), touch-friendly action buttons (`min-height: 44px`), stacked filter bars. |
| **📱 Tablet Portrait** | `640px – 768px` | 2-column member grid or condensed table with sticky left column. |
| **💻 Tablet Landscape** | `769px – 1024px` | Semi-expanded table layout with horizontal scrolling and wrapped filter toolbar. |
| **🖥️ Desktop & Wide** | `> 1024px / 1280px+` | Full expansive executive data table with sticky headers and side action buttons. |

---

## 🛠️ Proposed Changes

### Member List Component
- [MODIFY] `src/app/features/members/components/member-list/member-list.html`
- [MODIFY] `src/app/features/members/components/member-list/member-list.css`
- [MODIFY] `src/app/features/members/components/member-list/member-list.ts`

### Member Form Component
- [MODIFY] `src/app/features/members/components/member-form/member-form.html`
- [MODIFY] `src/app/features/members/components/member-form/member-form.css`
- [MODIFY] `src/app/features/members/components/member-form/member-form.ts`

---

## 🧪 Verification Plan
1. **Compilation Check**: Run `npm run build` to verify 0 errors.
2. **Automated Selector Audit**: Verify 100% of HTML classes exist in the respective `.css` files.
3. **Contrast & Visual Inspection**:
   - Inspect `http://localhost:4200/members` (List page) and `http://localhost:4200/members/add` (Form page).
   - Confirm **zero black text on dark background**.
   - Confirm Level AAA contrast on all tables, forms, pills, and portal access cards.
4. **4-Screen Responsive Testing**: Test at 375px (Mobile), 768px (Tablet), and 1280px+ (Desktop).
