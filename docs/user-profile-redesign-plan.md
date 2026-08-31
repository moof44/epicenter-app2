# User & Employee Profile (`/profile`) Redesign Plan

## 1. Executive Summary & Goals
Overhaul the `/profile` and `/profile/:uid` user profile interface, payslip viewer, and document manager from legacy white-card, low-contrast, hardcoded CSS into our unified Dark Pro design system:
- **Zero Black Text / Zero White Cards**: Replace all legacy `#ffffff` card backgrounds, `#0f172a` black body fonts, and light grey borders with tokenized Dark Pro canvas (`#090d16`), surfaces (`#0f172a`), and Level AAA white typography (`#ffffff`, `#e2e8f0`).
- **Profile Identity Deck**: Prominent avatar seal with cyan glow ring, pure white typography, high-contrast role badges (`ADMIN`, `MANAGER`, `STAFF`, `TRAINER`), and contextual Edit/Save controls.
- **3-Tab Workspace**:
  - 👤 **Personal & Employment Details**: High-contrast form sections with crisp view/edit modes.
  - 💰 **Compensation & Payslips**: Cumulative summary telemetry ribbon + Dark Pro payslips roster + printable paystub modal.
  - 📁 **HR Documents & Credentials**: Sleek drag-and-drop upload zone, category filters, and document preview cards.
- **📱 4-Screen Responsive UI Protocol**: Complete multi-column to single-column stacking across Mobile (< 640px), Tablet (640-1024px), and Desktop (> 1024px).
- **Zero Magic Numbers**: Strict 100% token adherence against `src/styles.css` and `docs/DESIGN_SYSTEM_TOKENS.md`.

---

## 2. Component Inventory & Changes

| Component / Submodule | File Paths | Key Planned Changes |
| :--- | :--- | :--- |
| **User Profile Page** | `src/app/features/profile/pages/user-profile/` (`.ts`, `.html`, `.css`) | Header identity card, 3-tab layout, section cards, view/edit mode rendering, payslip list, HR document manager, 4-screen responsive CSS. |
| **Payslip View Dialog** | `src/app/features/profile/components/payslip-view-dialog/` (`.ts`, `.html`, `.css`) | Dark Pro modal presentation on screen + pristine white official print styling on `@media print`. |

---

## 3. Verification & Compliance
1. **Zero Undefined Variables**: Automated node script audit against `src/styles.css`.
2. **Zero Missing Classes**: 100% class matching between HTML templates and stylesheets.
3. **Build Integrity**: `npm run build` with 0 errors and 0 warnings.
