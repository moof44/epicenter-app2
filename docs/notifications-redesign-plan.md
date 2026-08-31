# Notifications System (Header Dropdown & Full Page) Redesign Plan

## 1. Executive Summary & Design Goals
Redesign both notification surfaces in the application:
1. **Header Notification Bell & Quick Dropdown (`NotificationBellComponent`)**:
   - Master Dark Pro dropdown panel (`var(--color-surface, #1e293b)`).
   - High-contrast typography with zero black/grey text (`#202124` / `#5f6368` completely eradicated).
   - Severity icons with tokenized glow seals (`Alert` Rose, `Warning` Amber, `Summary` Purple, `Info` Cyan).
   - Unread indicator dots in glowing cyan.
   - Quick "Mark All Read" trigger and "View All in Center →" navigation footer.
2. **Vigilance Notifications Center Page (`NotificationsComponent`)**:
   - Modularized into separate `.ts`, `.html`, and `.css` files.
   - Header with Back action, title, and action buttons (`Purge Old Spam` and `Mark All As Read`).
   - 4-Card Executive Notification Metrics Deck (`Total`, `Unread`, `Alerts`, `System Reports`).
   - Real-time Severity Filter Chips (`All`, `Unread`, `Alerts`, `Warnings`, `Summaries`, `Info`).
   - Notification Cards Deck with readable high-contrast typography, interactive action links, and hover elevation.
   - Safe-Area Bottom Buffer (`padding-bottom: 140px !important` on mobile, `100px` on tablet).
   - 4-Screen Responsive UI Protocol compliant.

---

## 2. Complete Inventory of Components

| Component / Submodule | File Paths | Key Planned Changes |
| :--- | :--- | :--- |
| **Notification Bell Dropdown** | `src/app/shared/components/notification-bell/` (`notification-bell.component.ts`, `notification-bell.component.html`, `notification-bell.component.css`) | Modularize files, master Dark Pro dropdown menu panel (`.notification-menu-panel`), high-contrast text, glowing unread dots, color-coded severity icon seals. |
| **Notifications Center Page** | `src/app/features/notifications/` (`notifications.component.ts`, `notifications.component.html`, `notifications.component.css`) | Modularize files, header with actions, 4 summary metric cards, severity filter chips, rich notification card list, 4-screen responsive layout, safe-area buffer. |

---

## 3. Audit & Prevention of Historical Failures

1. **Failure #20 Prevention**: Clean high-contrast buttons with floating labels and standard interactions.
2. **Failure #21 Prevention**: Modal / Dropdown dismissals strictly bound and stop propagation where appropriate.
3. **Failure #22 Prevention**: Global Chip Shield and Tab Shield for severity filters.
4. **Failure #23 Prevention**: Enclosed card containers with full 1.5px solid borders and text-variant buttons with `width: auto`.
5. **Failure #24 Prevention**: Safe-area bottom buffer (`padding-bottom: 140px !important` on mobile, `100px` on tablet).
6. **Failure #25 Prevention**: Mobile-first touch friendly cards for all notification rows.
