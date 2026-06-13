# Members Portal — UI/UX Design & Architecture Rules

This document defines the strict styling, layout, and architectural standards for the `members-portal` application. Every code change, component creation, or style modification must comply with these guidelines.

---

## 1. Technical Constraints & Stack

* **CSS Framework**: **Vanilla CSS only**. Do NOT install or use Tailwind CSS in this project.
* **Component Library**: **No Angular Material**. Do NOT import MatButton, MatCard, MatDialog, or other styled Material design components in the members-portal.
* **Behaviors & Utilities**: Use the **Angular CDK** (`@angular/cdk`) for layout queries (`BreakpointObserver`), accessibility, overlays, and keyboard focus states. Avoid cdk-specific CSS styles; write custom Vanilla CSS instead.
* **Change Detection**: All new components must use `changeDetection: ChangeDetectionStrategy.OnPush`.
* **State & Imports**: Use standalone components, the `inject()` dependency injection syntax, and Angular Signals for local component/UI states.

---

## 2. Design System & Style Guide

### Color Palette (Premium Black & Gold)
Always use the following HSL-tailored CSS variables defined in the global stylesheet. Do not hardcode hex/rgb values:

```css
:root {
    --bg-primary: #000000;          /* Main background, full-viewport darks */
    --bg-surface: #121212;          /* Elevated cards, standard container background */
    --bg-surface-alt: #1a1a1a;      /* Secondary cards, hover states, text inputs */
    --bg-footer: #0a0a0a;           /* Footers and subtle edge dividers */

    --gold-primary: #D4AF37;        /* Core accent, visual focal points, gold headings */
    --gold-light: #FFD700;          /* Active items, interactive hover states */
    --gold-dark: #B8860B;           /* Gradients, pressed or disabled actions */
    --gold-dim: rgba(212, 175, 55, 0.3); /* Underline focus, borders, active outlines */

    --text-primary: #FFFFFF;        /* Standard white body text */
    --text-secondary: #B0B0B0;      /* Muted summaries, secondary descriptions */
    --text-muted: #666666;          /* Timestamps, disabled state captions */

    --color-success: #22c55e;       /* Active statuses (e.g. valid subscription) */
    --color-warning: #eab308;       /* Warning statuses (e.g. subscription expiring soon) */
    --color-danger: #ef4444;        /* Expired, errors, blockages */
}
```

### Spacing & Grid Hierarchy
* All layout margins, paddings, gaps, and sizes must be multiples of **8px** (e.g., 8px, 16px, 24px, 32px).
* Interactive targets (buttons, links, tab items) must be at least **48px** high on mobile and **44px** on desktop to accommodate touch and mouse operations.

### Typography
* **Headings** (h1, h2, h3, h4): Font family `'Oswald', sans-serif`, uppercase, tracking (letter-spacing) 1px to 2px.
* **Body & UI Controls**: Font family `'Inter', sans-serif`.

---

## 3. Responsive Breakpoints & Shell Layouts

The application must dynamically adapt to screen widths via a CDK-driven shell layout structure.

### 3.1 Mobile View (Below 600px)
* **Shell Components**:
  * **Top Header**: Minimalist bar showing the gold brand logo on the left/center and a simple settings/logout trigger on the right.
  * **Bottom Navigation Tab Bar**: Pinned to the viewport bottom (`56px` height) with exactly five touch-friendly tabs: Home, Progress, Attendance, Appointments, Profile. Active tabs are styled in `var(--gold-primary)`.
* **Layout Constraints**:
  * Single-column container layout.
  * Cards use `16px` padding instead of `24px`.
  * Modals, dialogs, and popup overlays are prohibited; use full-screen page redirects or slide-in bottom sheets.
  * Native hover state effects must be disabled or ignored on mobile viewports.

### 3.2 Tablet View (600px to 1199px)
* **Shell Components**:
  * **Header**: Top-pinned sticky header with the logo on the left and a hamburger menu trigger on the right.
  * **Navigation Drawer**: Hamburger trigger opens a slide-out navigation side panel listing the five main destinations.
* **Layout Constraints**:
  * Content cards are displayed in a centered single column with a maximum width of `600px`.
  * Analytics charts span the full width of their containers.
  * Detail views are rendered in bottom sheet drawers.

### 3.3 Desktop View (1200px and above)
* **Shell Components**:
  * **Left Navigation Sidebar Rail**: A fixed vertical sidebar (`260px` width) with the brand signature at the top, navigation links in the center, and a sign-out button at the bottom.
  * **Main Content View**: Offset to the right by `margin-left: 260px`.
* **Layout Constraints**:
  * Multi-column grid structures (e.g., dashboard summaries side-by-side with appointments).
  * Interactive elements feature subtle upward hover transitions and gold border/shadow glows.

---

## 4. Architectural Rules

### Data Loading & Cost-Control
* **No Real-Time Listeners**: Never use real-time Firestore listeners (`onSnapshot`) in the member portal. All data queries must be one-shot reads (`getDocs` or `getDoc`) to limit read operations.
* **Security Context**: Authenticated operations are restricted to documents linked directly to the member's `memberId` (found on their user profile record). Do not allow queries targeting root-level collection sets without proper filter bounds.
