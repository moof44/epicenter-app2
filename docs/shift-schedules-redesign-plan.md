# Employee Shift Schedules (`/shift-schedules`) Redesign Plan

## 1. Executive Summary & Goals
Overhaul the `/shift-schedules` page and its dialog modals from legacy white-card, low-contrast, hardcoded CSS into our unified Dark Pro design system:
- **Zero Black Text / Zero White Cards**: Replace all legacy `#ffffff` card backgrounds, `#0f172a` black body fonts, and light grey borders with tokenized Dark Pro canvas (`#090d16`), surfaces (`#0f172a`), and Level AAA white typography (`#ffffff`, `#e2e8f0`).
- **Command Deck & Live Week Navigation**: Streamlined header with action buttons (Shift Swaps with pending count, Manage Shifts, Copy Previous Week, Print Roster) and week range switcher.
- **My Schedule This Week Spotlight**: 7-card personal roster showcase for the authenticated user with glowing `TODAY` badge.
- **Master 7-Day Matrix Table**: Sticky left employee frozen column, dynamic shift badge pills, 7-day labor compliance warning, and past-day lock states.
- **📱 4-Screen Responsive UI Protocol**: Dedicated mobile day-selector ribbon and staff roster card (< 768px) and horizontal matrix grid (> 768px).
- **Modals Overhaul**: `ShiftDefinitionModal` and `ShiftSwapModal` redesigned into Dark Pro modals with Level AAA contrast.

---

## 2. Component Inventory & Changes

| Component / Submodule | File Paths | Key Planned Changes |
| :--- | :--- | :--- |
| **Shift Schedules Page** | `src/app/features/shift-schedules/pages/shift-schedules/` (`.ts`, `.html`, `.css`) | Header deck, week switcher, My Schedule hero, master matrix table, mobile day selector, 4-screen responsive CSS. |
| **Shift Definition Modal** | `src/app/features/shift-schedules/components/shift-definition-modal/` (`.ts`, `.html`, `.css`) | Dark Pro dialog shell, custom time inputs, color picker pills, shift definitions table. |
| **Shift Swap Modal** | `src/app/features/shift-schedules/components/shift-swap-modal/` (`.ts`, `.html`, `.css`) | Dark Pro dialog shell, 2-tab switch (Request / Manage), high-contrast selects, approve/deny cards. |

---

## 3. Verification & Compliance
1. **Zero Undefined Variables**: Automated node script audit against `src/styles.css`.
2. **Zero Missing Classes**: 100% class matching between HTML templates and stylesheets.
3. **Build Integrity**: `npm run build` with 0 errors and 0 warnings.
