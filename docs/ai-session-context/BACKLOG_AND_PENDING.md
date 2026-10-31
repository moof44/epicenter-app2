# Backlog, Pending Tasks & Technical Debt

This file tracks pending items, uncompleted features, known issues, and future technical debt for any AI session or developer to inspect.

---

## 1. High Priority / Active Backlog
*No immediate critical blockers at this moment.*

---

## 2. Low Priority / Nice-to-Have
- [ ] Add a desktop shortcut uninstaller script (`scripts/remove-shortcuts.ps1`) if the user ever wants to clean up the desktop.
- [ ] Add toast notification support or custom tray icon when running in the background.

---

## 3. Discovered Bugs / Quirks to Watch For
- **Firebase Hosting Cache**: Modifying builds occasionally updates `.firebase/hosting.*.cache` files. These can safely be staged or discarded depending on whether a deploy is targeted.
- **Port In-Use**: If an Angular instance is forcefully closed in some versions of Windows, port 4200 might take 2-3 seconds to release TCP binding. The automatic port detector handles this by moving to 4201, or users can re-launch after 5 seconds to get 4200 back.
