# Backlog, Pending Tasks & Technical Debt

This file tracks pending items, uncompleted features, known issues, and future technical debt for any AI session or developer to inspect.

---

## 1. High Priority / Active Backlog (Discovered during Oct 2026 Audit)
- [ ] **Database Hygiene — Merge 3 Duplicate October Member Profiles**:
  1. `Hannah Grace Laguda`: Merge `BnvruGOc3NLzSmqg3yHA` (created 2026-10-06, Walk-in ₱150, Inactive) into `1nZiAOapXL14LMwWyodU` (created 2026-10-09, Monthly Membership ₱1,000, Active).
  2. `Ezra Agustin`: Merge duplicate profile `qxNtskGv17h09rg95D43` (created 2026-10-12, 0 txs) into `j6s0DOk9WQEahjAqk4Fm` (created 2026-10-12, Walk-in ₱150).
  3. `Adrian L. Mendoza`: Merge `yBKQDwbhURX4t6oqoLq8` (created 2026-10-02, 2 walk-ins ₱300) into `hTMrgPLCCfTTox87Hy2D` (created 2026-10-21, Monthly Membership ₱1,000).
- [ ] **Database Hygiene — Fix Missing Membership Expiration**:
  - `ANGELINE REYES` (`UMZTksizaMx3OeXJ6G8o`): Purchased `Monthly Membership (w/ guidance)` (₱2,200) on `2026-10-26` (tx `uryX7rAfsrb3DDaCDWSB`), but `membershipExpiration` is blank (`""`). Should be set to `2026-11-26`.

---

## 2. Low Priority / Nice-to-Have
- [ ] Add a desktop shortcut uninstaller script (`scripts/remove-shortcuts.ps1`) if the user ever wants to clean up the desktop.
- [ ] Add toast notification support or custom tray icon when running in the background.

---

## 3. Discovered Bugs / Quirks to Watch For
- **POS Checkout Payment Method Voids**: In October 2026, 4 out of 5 voided transactions (₱4,760 of ₱4,780) were caused by staff selecting Cash instead of GCash or wrong membership price tier during checkout.
- **Firebase Hosting Cache**: Modifying builds occasionally updates `.firebase/hosting.*.cache` files. These can safely be staged or discarded depending on whether a deploy is targeted.
- **Port In-Use**: If an Angular instance is forcefully closed in some versions of Windows, port 4200 might take 2-3 seconds to release TCP binding. The automatic port detector handles this by moving to 4201, or users can re-launch after 5 seconds to get 4200 back.

- [ ] **Customer Care / Call Center Department Module (`/customer-care`)**: Proposal written in `docs/customer-care-call-center-proposal.md`; awaiting user approval to begin implementation.
