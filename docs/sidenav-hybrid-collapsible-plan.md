# Implementation Plan: Hybrid Practical Collapsible Sidenav

> **Target**: Sidenav Navigation Architecture (`src/app/app.html`, `src/app/app.css`, `src/app/app.ts`)  
> **Philosophy**: Combine the speed of 1-click front-desk actions with smart collapsible organization for deep back-office tools, dynamically adapting to screen height and user roles.

---

## 🎨 Design Specification & Architecture

### 1. Hybrid Section Hierarchy

| Section Type | Section Name | Links Included | Default Behavior | Target Roles |
| :--- | :--- | :--- | :--- | :--- |
| **⚡ Quick Launchpad** | `Quick Actions` | *Register Member*, *Check-In*, *POS* | **Always Visible** (1-Click) | Staff, Manager, Admin |
| **🏢 Core Operations** | `Front Desk` | *Home*, *Members*, *Attendance*, *Shift Schedules*, *My Attendance*, *Profile* | **Always Visible** (1-Click) | Staff, Manager, Admin |
| **🛒 Operational Store** | `Store & POS` | *Sell Items (POS)*, *Cash Register*, *Products*, *Sales History* | **Always Visible** (1-Click) | Staff, Manager, Admin |
| **📦 Deep Inventory** | `Inventory Management` | *Stock Count (Audit)*, *Restock Inventory*, *Inventory History* | **Collapsible** (Auto-opens on active route) | Manager, Admin |
| **💰 Deep Finance** | `Finance & Purchasing` | *Financial Health*, *Bills & Payables*, *Purchase Orders*, *Purchase Requests* | **Collapsible** (Auto-opens on active route) | Manager, Admin |
| **👥 Workforce & HR** | `Workforce` | *Staff Payroll*, *Staff Directory*, *Business Reports* | **Always Visible** (1-Click) | Manager, Admin |
| **⚙️ Deep System** | `System & Logs` | *Settings*, *Audit Logs*, *Error Logs* | **Collapsible** (Auto-opens on active route) | Admin Only |

---

### 2. Screen Size & Viewport Adaptability
- **🖥️ Tall Displays ($ge 900\text{px}$ viewport height)**:
  - Collapsible back-office sections default to **open**, giving executives instant multi-domain visibility without extra clicks.
- **💻 Compact / Laptop Displays (< 900px viewport height) & Mobile Drawers**:
  - Deep back-office sections default to **closed**, ensuring the core daily front-desk operations fit on screen without vertical scrolling.
- **🎯 Auto-Expansion**:
  - If a user navigates to an item inside a collapsed section (e.g. `/store/payables`), that section automatically expands and highlights the active cyan route indicator.

---

### 3. Collapsible Toggle Header Design (WCAG 2.2 AAA Compliant)
- **Header Button**: `w-full h-9 flex items-center justify-between px-3 rounded-lg text-2xs font-extrabold uppercase tracking-wider text-text-muted hover:text-text-pure hover:bg-slate-surface transition-all`.
- **Rotating Indicator**: `keyboard_arrow_right` smoothly rotates 90 degrees (`rotate-90`) when expanded.
- **Badge Count**: Subtle chip displaying the number of nested tools (e.g. `3 tools`).

---

## 🛠️ Proposed Changes

### [MODIFY] `src/app/app.ts`
- Add reactive signals for collapsible sections:
  - `inventoryExpanded = signal(false)`
  - `financeExpanded = signal(false)`
  - `systemExpanded = signal(false)`
- Add viewport height detection to default sections to open on tall screens ($ge 900\text{px}$).
- Add auto-expansion logic on router navigation events.

### [MODIFY] `src/app/app.html`
- Update template structure:
  1. Profile Header
  2. Quick Actions (Always open)
  3. Front Desk (Always open)
  4. Store & POS (Always open for operational tools)
  5. Collapsible: Inventory Management
  6. Collapsible: Finance & Purchasing
  7. Workforce & HR (Always open for managers/admins)
  8. Collapsible: System & Logs
  9. Pinned Logout
- Refine role-gating so `STAFF` has full access to POS, Cash Register, and Sales History.

### [MODIFY] `src/app/app.css`
- Add smooth accordion expand/collapse transition classes.
- Style section toggle headers with rotating chevron indicators and token variables.

---

## 🧪 Verification Plan
1. **Compilation Check**: Run `npm run build` to verify 0 TypeScript and template errors.
2. **Visual & Interaction Testing**:
   - Verify Front Desk and Store operational items are directly accessible in 1 click.
   - Click collapsible section headers (*Inventory*, *Finance*, *System*) to verify smooth toggle.
   - Navigate to `/store/payables` and verify the Finance section automatically opens and highlights the route.
3. **Role Testing**:
   - Log in as Staff: Verify clean view with Quick Actions, Front Desk, and basic POS tools (zero admin clutter).
   - Log in as Admin: Verify full access with clean collapsible sub-groups.
4. **Responsive Testing**:
   - Test on Desktop ($ge 1280\text{px}$), Laptop, Tablet, and Mobile.
