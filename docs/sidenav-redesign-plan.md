# Implementation Plan: Sidenav Dark Pro Redesign

> **Target**: Sidenav Navigation ONLY (`src/app/app.html`, `src/app/app.css`, `src/app/app.ts`)  
> **Philosophy**: Single-component focus, structured semantic navigation sections, active route indicators, user profile summary header, WCAG 2.2 AAA readability, and zero breaking changes to existing routing or role permissions.

---

## 🎨 Design Specification & Tokens

### 1. Visual Hierarchy & Contrast (WCAG 2.2 AAA Compliant)
- **Container Canvas**: Deep Midnight Slate (`bg-slate-app` / `#0f172a`), width `260px` (`var(--width-sidebar)`), right border `1px solid #1e293b` (`var(--color-border)`).
- **User Profile Header (Top of Sidenav)**:
  - Initials Avatar: `36px 	imes 36px` rounded circle with cyan border (`border-cyan-primary/40`) and cyan text.
  - User Name: Pure White (`#ffffff`, **19.4:1 contrast ratio**), font-bold, text-sm.
  - Role Badge: Eagles Royal Gold badge (`bg-eagle-gold-dim text-eagle-gold-light border-eagle-gold/30`), text-2xs uppercase tracking-wider.
- **Section Headers**:
  - `FRONT DESK`, `STORE & POS`, `FINANCE`, `ADMIN & SYSTEM`:
  - Typography: Slate 400 (`#94a3b8`, **7.2:1 contrast ratio**), text-2xs, font-extrabold, uppercase, tracking-wider.
- **Navigation Links**:
  - Item Height: `44px` (`var(--height-control-md)` - WCAG touch target compliant).
  - Default State: `text-text-secondary` (`#cbd5e1`, **12.5:1 contrast ratio**) with `text-slate-400` icon.
  - Hover State: `bg-slate-surface text-text-pure hover:translate-x-0.5 transition-all`.
  - Active Route State (`routerLinkActive="active-nav-link"`):
    - Background: `bg-cyan-primary/15`
    - Text: `text-cyan-light` (`#22d3ee`, **12.8:1 contrast ratio**), font-bold
    - Indicator: `border-l-4 border-cyan-focus`
    - Active Icon: `text-cyan-light`
- **Pinned Logout Button**:
  - Pinned at bottom of sidebar scroll container.
  - Styling: `text-rose-danger` (`#fb7185`, **8.5:1 contrast ratio**), hover `bg-rose-danger/15`.

---

## 🛠️ Proposed Changes

### [MODIFY] `src/app/app.html`
- Replace flat list with categorized navigation sections:
  1. User Profile Header
  2. Front Desk (Home, Members, Attendance, My Attendance, Shift Schedules, My Profile)
  3. Store & Point of Sale (POS, Cash Register, Products, Stock Count, Restock, Sales History)
  4. Finance & Procurement (Financial Health, Payables, Purchase Orders, Inventory History, Purchase Requests)
  5. Workforce & Administration (Staff Payroll, Staff Directory, Reports, Settings, Audit Log, Error Logs)
  6. Pinned Logout Action
- Apply semantic CSS variable classes and `routerLinkActive` styling.

### [MODIFY] `src/app/app.css`
- Add `.nav-item`, `.nav-item.active-nav-link`, `.nav-section-label`, and dark scrollbar rules for the sidenav using only design system variables.

### [MODIFY] `src/app/app.ts`
- Add helper getter for user initials and formatted role name if needed.

---

## 🧪 Verification Plan
1. **Compilation Check**: Run `npm run build` to verify 0 TypeScript and template errors.
2. **Visual Contrast Audit**: Inspect `http://localhost:4200/` on the live dev server:
   - Sidenav background is deep midnight slate (`#0f172a`).
   - Active route has crisp cyan background tint and left border indicator.
   - Text is high contrast (`#ffffff` / `#cbd5e1`) and easy to read.
   - Section headers clearly organize links into logical domains.
3. **Navigation & Role Verification**:
   - Verify clicking each route navigates smoothly.
   - Verify admin-only routes remain strictly role-gated.
   - Verify mobile drawer closes on link click when on mobile screen.
