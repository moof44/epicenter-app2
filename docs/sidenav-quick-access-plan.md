# Implementation Plan: Sidenav Quick Access Launchpad

> **Target**: Sidenav Navigation ONLY (`src/app/app.html`, `src/app/app.css`)  
> **Philosophy**: Deliver immediate 1-click access to the 3 highest-frequency front-desk actions (*Register Member*, *Member Check-In*, *Sell Items POS*) via full-width high-contrast action pills that eliminate scrolling and menu-hunting.

---

## 🎨 Design Specification & Tokens

### 1. Structure & Layout
- **Placement**: Top of navigation, immediately under the User Profile Header and Home link.
- **Section Header**:
  - `⚡ QUICK ACTIONS`
  - Typography: `text-2xs font-extrabold uppercase tracking-wider text-eagle-gold-light font-inter`.
- **Card Format**:
  - Full-width horizontal action rows (`h-control-md` / `44px`, `rounded-xl`, `px-3.5`, `flex items-center justify-between`).
  - No narrow multi-column wrapping or awkward hyphenation.

### 2. The 3 High-Frequency Operational Actions

| Action | Route | Theme / Accent | Icon | WCAG Contrast |
| :--- | :--- | :--- | :--- | :--- |
| **➕ Register New Member** | `/members/new` | Electric Cyan (`bg-cyan-primary/10`, `border-cyan-primary/30`) | `person_add` (`text-cyan-light`) | **19.4:1 / 12.8:1 (AAA)** |
| **🎟️ Member Check-In** | `/attendance` | Emerald Success (`bg-mint-success/10`, `border-mint-success/30`) | `how_to_reg` (`text-mint-success`) | **19.4:1 / 11.5:1 (AAA)** |
| **💳 Sell Items (POS)** | `/store/pos` | Eagles Gold (`bg-eagle-gold/10`, `border-eagle-gold/30`) | `point_of_sale` (`text-eagle-gold-light`) | **19.4:1 / 11.2:1 (AAA)** |

---

## 🛠️ Proposed Changes

### [MODIFY] `src/app/app.html`
- Insert the `⚡ QUICK ACTIONS` block inside `<mat-sidenav>` right after the `Home` link.
- Gated by `authService.hasAnyRole(['ADMIN', 'MANAGER', 'STAFF', 'TRAINER'])`.
- Each action row includes:
  - Left: Accent icon container with glowing background tint.
  - Middle: Single-line bold title (`text-text-pure`).
  - Right: Subtle trailing chevron (`chevron_right`).

### [MODIFY] `src/app/app.css`
- Add `.quick-action-card` styles using only design system variables.
- Smooth hover animations (`hover:scale-[1.01]`, `hover:border-opacity-60`).

---

## 🧪 Verification Plan
1. **Compilation Check**: Run `npm run build` to verify 0 TypeScript and template errors.
2. **Visual Contrast Audit**: Inspect `http://localhost:4200/` on the live dev server:
   - Quick actions render as clean horizontal rows with legible single-line text.
   - High contrast between dark surface, glowing accent badges, and pure white titles.
3. **Navigation Verification**:
   - Clicking **Register Member** opens Member Registration (`/members/new`).
   - Clicking **Member Check-In** navigates to Attendance Check-In (`/attendance`).
   - Clicking **Sell Items (POS)** navigates to POS (`/store/pos`).
   - Mobile auto-closes drawer on action click.
