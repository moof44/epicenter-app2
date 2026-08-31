# Global Vigilance Chat & Chat Search Redesign Plan

## 1. Executive Summary & Design Goals
Redesign both the real-time **Global Vigilance Chat drawer (`ChatComponent`)** and the historical **Chat History & Search page (`ChatSearchComponent`)** into our master Dark Pro token architecture:
- **Zero Black Text / Zero Grey Surfaces**: Completely eliminate legacy white backgrounds (`#ffffff`, `white`, `#f8f9fa`, `#f1f3f4`) and unstyled dark text (`#202124`, `#616161`, `#4a148c`).
- **Real-Time Vigilance Chat Drawer (`ChatComponent`)**:
  - **Header Deck**: Elevated dark surface with live pulse seal, pure white title, subtitle, Search shortcut, and close button.
  - **Message Bubbles**:
    - *System Security Alerts*: Dark Pro security seal with Purple/Cyan glow, monospace timestamp, and readable alert body.
    - *Team Member Messages*: Dark surface (`#1e293b`) card with sender avatar, Cyan sender name, and body text (`var(--color-text-body, #e2e8f0)`).
    - *Own Messages*: Cyan-tinted bubble (`rgba(6, 182, 212, 0.15)`) with pure white text and cyan border.
    - *@Mention Direct Alerts*: Radiant Gold border with soft gold surface glow.
  - **@Mention Autocomplete Popover**: Dark Pro elevated popover with user avatar, name, and role.
  - **Message Input Footer**: High-contrast dark input field with solid gold/cyan send button.
- **Chat History & Search Page (`ChatSearchComponent`)**:
  - **Header Deck**: Back button, title, subtitle.
  - **4-Card Summary Metrics Deck**: Total Results, User Messages, System Alerts, Date Range.
  - **Filter Control Deck**: Keyword search, sender filter, message type dropdown, date range picker, Reset and Query Database buttons.
  - **Search Results Cards**: Rich message cards with sender details, timestamps, and highlight badges.
  - **Safe-Area Bottom Buffer & 4-Screen Responsiveness (Failure #24, #25, #26 Prevention)**:
    - Mobile (< 640px): `padding-bottom: 140px !important` + `<div class="bottom-scroll-spacer"></div>`.

---

## 2. Complete Inventory of Components

| Component / Submodule | File Paths | Key Planned Changes |
| :--- | :--- | :--- |
| **Vigilance Chat Drawer** | `src/app/features/chat/` (`chat.component.ts`, `chat.component.html`, `chat.component.css`) | Modularize files, master Dark Pro styles, tokenized chat bubbles, glowing mention highlights, dark mention popover, and input bar. |
| **Chat Search Page** | `src/app/features/chat/chat-search/` (`chat-search.component.ts`, `chat-search.component.html`, `chat-search.component.css`) | Modularize files, 4 summary metric cards, Dark Pro filter grid, query database action, rich results cards, and safe-area buffer. |

---

## 3. Audit & Prevention of Historical Failures

1. **Failure #20 Prevention**: Clean high-contrast inputs with floating labels and standard datepicker shield.
2. **Failure #21 Prevention**: Close buttons strictly bound to `closeChat()` / navigation.
3. **Failure #23 Prevention**: Enclosed card containers with full 1.5px solid borders and text-variant buttons with `width: auto`.
4. **Failure #24 & #26 Prevention**: Safe-area bottom buffer (`padding-bottom: 140px !important` on mobile) + `<div class="bottom-scroll-spacer"></div>`.
5. **Failure #25 Prevention**: Mobile-first touch friendly cards for all search results.
6. **Failure #27 Prevention**: Explicit high-contrast declarations on all overlay and autocomplete popovers (`color: #ffffff !important`).
