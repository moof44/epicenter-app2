# AI Postmortem & Failure Prevention Master Log

> **Last Updated**: August 30, 2026  
> **Purpose**: Document recurring AI visual, architectural, and structural mistakes with actionable, mandatory prevention protocols.

---

## 🚫 Critical Logged Mistakes & Root Causes

### 1. 💥 Dark-on-Dark / Black-on-Black Text Fallback (The Encapsulation & Mismatch Bug)
* **What Happened**: Modifying outer container layouts (e.g. `.dashboard-grid`) while child widgets remained unstyled or had mismatched CSS class names (e.g., styling `.empty-title` when HTML used `.empty-text` / `.empty-subtext`; styling `.kiosk-title` when HTML used `.banner-title`; omitting `.ring-label`, `.contribution-line`, `.count-label`).
* **Root Cause**: Angular View Encapsulation isolates styles. Any unstyled child HTML node inherits browser default black text (`#000000`) or canvas dark-grey, rendering it completely illegible on dark canvas (`#090d16` / `#0f172a`).
* **Prevention Protocol**:
  1. **Template-First Audit (Mandatory)**: Never write CSS from memory. Always inspect the exact HTML classes in the template first.
  2. **Automated AST/Regex Verification**: Run `scratch/audit-all-widgets-css.js` before completing any UI task to verify 100% of HTML classes exist in the stylesheet.
  3. **Explicit Color Assignment**: Every heading (`var(--color-text-pure)`), body/subtitle (`var(--color-text-secondary)`), and metric (`var(--color-cyan-light)`, `var(--color-gold-light)`, `var(--color-mint-success)`) MUST be explicitly styled.
  4. **Global Fallback Shield in `src/styles.css`**: Root containers must declare `color: var(--color-text-pure);` to protect against unstyled tag leakage.

---

### 2. 💥 Angular Material Light-Mode Defaults Infiltrating Dark Theme
* **What Happened**: Using `<mat-card-subtitle>`, `<mat-card-title>`, and `<a mat-button color="primary">` inside custom widgets. Material MDC injected default light-theme text colors (`#1d1b20` subtitle text and dark indigo `#3f51b5` button text), causing invisible dark blue/black text on dark background.
* **Prevention Protocol**:
  1. Replace unneeded Material card wrappers with clean semantic HTML (`<h3>`, `<p>`, `<a>`) styled with Design System Tokens.
  2. Maintain global Material MDC variable overrides in `src/styles.css` (`--mat-card-subtitle-text-color: var(--color-text-secondary);`, `--mat-button-text-color: var(--color-cyan-light);`).

---

### 3. 💥 Role-Based Widget Asymmetry (Admin vs Staff Discrepancy)
* **What Happened**: Updating only the Admin-facing widget (`<app-gym-revenue-today>`) with new emotional/motivational empty states, while leaving the Staff-facing counterpart (`<app-todays-sales>`) on the legacy empty state.
* **Prevention Protocol**:
  1. **Multi-Role Inspection Protocol**: Whenever altering any dashboard component, inspect all conditional branches (`@if (isManagerView())`, `@if (hasSalesRole())`) to ensure full visual and behavioral parity across user roles.

---

### 4. 💥 Monotonous Cookie-Cutter Layout on Mobile & Tablet
* **What Happened**: Designing 20 identical flat dark rectangular cards with the same layout and tiny icons. On mobile/tablet vertical scroll (90% of front-desk usage), this creates severe visual fatigue and zero emotional impact.
* **Prevention Protocol**:
  1. **Differentiated Archetype Taxonomy**: Give each widget its own distinct color temperature (Cyan Adrenaline $
ightarrow$ Gold Speedometer $
ightarrow$ Mint Floor Radar $
ightarrow$ Rose Hazard $
ightarrow$ Championship Podium).
  2. **Touch-First Sizing**: Maintain minimum 48px touch targets, oversized glanceable numbers (`clamp(2rem, 5.5vw, 2.75rem)`), and interactive bubble chips.

---

### 5. 💥 Clumsy Double-Bordered Square Icon Boxes
* **What Happened**: Wrapping icons in small, hard-bordered square boxes inside already-bordered action cards.
* **Prevention Protocol**: Never place hard square border outlines around icons inside cards. Use clean, direct icon placement with semantic color tokens (`text-cyan-light`, `text-mint-success`, `text-eagle-gold-light`).
### 6. 💥 Angular Material Input Elements Leaking Default Charcoal/Black Text
* **What Happened**: When rendering form fields in dark mode (e.g. `MemberForm` at `/members/edit/:id`), input values ("A.c menoro", "09162530949", "Male", "1/5/1992", "Caloocan") appeared in dark grey/charcoal on dark background (`#0f172a`).
* **Root Cause**: Angular Material MDC components apply default CSS variables (`--mdc-outlined-text-field-input-text-color: rgba(0, 0, 0, 0.87)` and `.mat-mdc-select-value: rgba(0, 0, 0, 0.87)`). Because scoped component CSS does not pierce Angular Material MDC shadow DOM/encapsulation unless specifically targeted or declared globally, input text silently inherited dark charcoal text.
* **Permanent Prevention Protocol**:
  1. **Global Material Dark Input Shield**: In `src/styles.css`, globally enforce `input, textarea, select, .mat-mdc-input-element, .mat-mdc-select-value { color: var(--color-text-pure) !important; }`.
  2. **Prefix & Suffix High-Contrast**: Ensure all prefix/suffix icons (`.mat-mdc-form-field-icon-prefix`, `.mat-datepicker-toggle`) render in `var(--color-cyan-light)`.
  3. **Dropdown Option Contrast**: Globally force `.mat-mdc-select-panel` to `#0f172a` surface with `var(--color-text-pure)` option text and cyan selection highlights.
### 7. 💥 Bottom Content / Card Clipping Due to Insufficient Scroll Padding
* **What Happened**: On long form pages (e.g. `MemberForm` at `/members/edit/:id`), the bottom card ("Members Portal Access") and its action buttons were partially obscured by the bottom viewport edge/taskbar even when max scroll was reached.
* **Root Cause**: Placing interactive management cards below the form submit dock with only 48px bottom padding inside an overflow container without a generous bottom buffer (`padding-bottom: 100px – 120px`).
* **Permanent Prevention Protocol**:
  1. **Generous Page Bottom Buffer**: All scrollable layout pages (`.member-form-page`, `.page-container`) MUST define a minimum `padding-bottom: 120px;` to allow full clearance above taskbars and mobile bottom navigation bars.
  2. **Logical Flow Placement**: Secondary management cards (such as Portal Credentials) must be integrated into the sequential flow before the final sticky or bottom submit dock.
### 8. 💥 Container Touching Viewport Edge on Mobile (< 640px)
* **What Happened**: When viewing `MemberForm` (`/members/add` and `/members/edit/:id`) on mobile screen widths (375px–430px), the outer card boundaries touched the screen's left and right physical edges with zero breathing room.
* **Root Cause**: The page container defined `padding: 8px 0 120px 0;` (zero horizontal padding) instead of maintaining responsive side gutters (`padding: 12px 16px` on mobile, `16px 20px` on tablet, `20px 24px` on desktop).
* **Permanent Prevention Protocol**:
  1. **Mandatory 16px Mobile Gutters**: Every top-level page wrapper MUST have a minimum of `padding-left: 16px; padding-right: 16px;` on mobile screens (`< 640px`). NEVER use `padding: ... 0 ... 0` without responsive media queries.
  2. **4-Screen Tier Declarations**:
     - 📱 Mobile (`< 640px`): `padding: 12px 16px 120px 16px;` + `grid-template-columns: 1fr;`
     - 📱 Tablet Portrait (`640px – 768px`): `padding: 16px 20px 120px 20px;`
     - 💻 Tablet Landscape (`769px – 1024px`): `padding: 20px 24px 120px 24px;`
     - 🖥️ Desktop & Wide (`> 1024px`): `padding: 24px 32px 120px 32px;`
### 9. 💥 White Background / Corner Bleed in Angular Material Modal Dialogs
* **What Happened**: When opening modal dialogs (e.g. `QRDialog`, `MemberDuplicateResolver`, `StaffKioskDialog`), white background corners peeked out from behind the dark dialog content.
* **Root Cause**: Angular Material's `.mdc-dialog__surface` wrapper has an internal default `background-color: #ffffff;` and default border-radius. Styling an inner container (`.qr-dialog-container`) with dark background and border-radius left the outer white Material surface visible at the four corner radii.
* **Permanent Prevention Protocol**:
  1. **Global Reusable Modal Architecture**: In `src/styles.css`, globally enforce:
     ```css
     .mat-mdc-dialog-container,
     .mat-mdc-dialog-surface,
     .mdc-dialog__surface,
     .cdk-dialog-container {
       background-color: var(--color-app) !important;
       border-radius: var(--radius-2xl) !important;
       border: 1.5px solid var(--color-border) !important;
       overflow: hidden !important;
       padding: 0 !important;
     }
     .cdk-overlay-backdrop {
       background-color: rgba(9, 13, 22, 0.82) !important;
       backdrop-filter: blur(8px) !important;
     }
     ```
  2. **Inner Modal Fit**: Dialog templates must fill 100% of the parent surface without redundant border strokes that cause misalignment.
### 10. 💥 Angular Material <mat-icon> Defaulting to Black Color Inside Dark Cells
* **What Happened**: In the Attendance Calendar, icons inside day cells (dumbbells, beds, icons) and day numbers defaulted to black/dark charcoal text on dark surfaces.
* **Root Cause**: Material icons (`<mat-icon>`) inside custom template containers default to browser/MDC font color (`#000000`) unless explicitly overridden with `color: currentColor !important` or a design token.
* **Permanent Prevention Protocol**:
  1. **Explicit Icon Token Styling**: Every `mat-icon` inside components MUST have an explicit color declaration in CSS (e.g. `.status-icon mat-icon { color: inherit !important; }` or `color: var(--color-mint-success) !important;`).
  2. **Zero Unstyled Text/Numbers**: Day numbers, table cell data, and column headers must explicitly declare `color: var(--color-text-pure)` or `var(--color-text-secondary)`.

### 11. 💥 Demotivating "Red Failure" Psychology in Fitness Calendar
* **What Happened**: Non-workout days were rendered with alarming red `✕` marks (`skipped-day`), turning normal rest/recovery days into a wall of red failure marks.
* **Root Cause**: Binary present/absent logic incorrectly labeled every non-attendance day as "skipped", ignoring that a healthy training cadence involves 3-4 workout days and 3-4 rest/recovery days per week.
* **Permanent Prevention Protocol**:
  1. **Positive Reinforcement Cadence**: Classify days into:
     - 🏋️ **Workout Days**: Vibrant Mint Green (`#34d399`) with dumbbell icon and session badge.
     - 🧘 **Rest & Muscle Growth Days**: Calming Lavender/Violet (`#c084fc`) celebrating recovery.
     - 📅 **Open/Off Days**: Clean subtle dark tiles with neutral status (no aggressive red error icons).
### 12. 💥 Silent CSS Fallback to Black Font via Undefined CSS Variable (`var(--color-mint-success)`)
* **What Happened**: In the Progress Dashboard and Attendance Calendar, Muscle Mass (`33.6%`), Win Chips (`+0.2% Muscle Delta`), and `7 Sessions Completed` pills rendered in **BLACK / CHARCOAL text** on dark backgrounds.
* **Root Cause**: The stylesheet referenced `var(--color-mint-success)` which did not exist in `src/styles.css` (only `--color-success` was defined). In CSS, referencing an undefined custom property without a fallback causes the property declaration to become invalid at computed-value time, causing the browser to fall back to `inherit` / browser default black (`#000000`).
* **Permanent Prevention Protocol**:
  1. **Strict Variable Verification**: Never write `var(--some-var)` without verifying that `--some-var` is explicitly defined in `:root` in `src/styles.css`.
  2. **Safe Fallbacks on All Color Tokens**: Always write color variables with a safe high-contrast fallback: `var(--color-mint-success, #34d399)`, `var(--color-gold-light, #fbbf24)`, `var(--color-text-pure, #ffffff)`.
  3. **Direct Token Aliases in Root**: Formally declare all semantic aliases (`--color-mint-success`, `--color-violet-recovery`, `--color-rose-danger`) in `src/styles.css`.
### 13. 💥 Angular Material MDC Paginator Navigation Arrows Defaulting to Black SVG Fill
* **What Happened**: In the Member Directory (`/members`) and other paginated tables, the pagination navigation arrows (`<` and `>`) and labels rendered with **BLACK / DARK CHARCOAL SVG FILL** (`rgba(0, 0, 0, 0.54)` and `rgba(0, 0, 0, 0.87)`).
* **Root Cause**: `mat-paginator` uses SVG icons (`.mat-mdc-paginator-icon`) and range labels (`.mat-mdc-paginator-range-label`) styled with MDC's default light theme variables which default to black/dark grey fill unless globally overridden in `src/styles.css`.
* **Permanent Prevention Protocol**:
  1. **Global Material MDC Paginator Shield**: Always maintain global high-contrast overrides in `src/styles.css` targeting `.mat-mdc-paginator-icon { fill: var(--color-cyan-light) !important; }`, `.mat-mdc-paginator-range-label { color: var(--color-text-secondary) !important; }`, and disabled state with `fill: var(--color-text-muted) !important; opacity: 0.35;`.
---

### 14. ❌ Failure #14: Silent Disabled State on Kiosk Lockers Due to Closed Cash Register Shift Without Direct Actionable Feedback
* **Discovery Date**: 2026-08-30
* **Symptom / User Report**:
  > *"why I cannot click the locker? nothing is happening when click... if this is bug, please document in your failure"*
* **Root Cause**:
  * When no store cash register shift was currently open, `(isShiftOpen$ | async) === false` disabled all locker buttons and the check-in button.
  * In the Step 2 Confirmation view, the shift status warning was obscured or not actionable inline, leaving the user with silently disabled buttons with no visible explanation of why clicking was ineffective.
* **Fix & Prevention**:
  * **Persistent High-Contrast Alert Banner**: An unmistakable glowing amber banner (`lock_clock`) is rendered prominently across both Search and Confirmation steps when a register shift is closed.
  * **Inline Locker Bay Status Tag**: An explicit `Shift Closed • Click to Open` tag is displayed in the locker header, and lockers show a `LOCKED` label.
  * **1-Click Direct Action (`ShiftControlModal`)**: Clicking the banner, the locker tag, or the bottom `REGISTER CLOSED • OPEN SHIFT TO PROCEED` button immediately opens the Store `ShiftControlModal` in-place, allowing staff to open their shift in 1 click and automatically unlock check-in in real-time!
---

### 15. ❌ Failure #15: Material MDC Autocomplete Dropdown Option Overflow Clipping and Unstyled Menu Defaults
* **Discovery Date**: 2026-08-30
* **Symptom / User Report**:
  > *"check the design of this select/autocomplete,,, this is not proper... also I expect this to be reusable so everything that may reuse this will have this design bug"*
* **Root Cause**:
  * Angular Material MDC's `.mat-mdc-option` has default single-line fixed heights (`48px`) and `.mdc-list-item__primary-text` has `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`.
  * Placing 2-line custom option markup (Member Avatar + Name + Status Chip) caused the circular avatar badge to get clipped on the left border, and the text was vertically cramped.
  * The overlay panel lacked global Dark Pro card padding, rounded borders, and custom hover states.
* **Fix & Prevention**:
  * **Global MDC Dropdown Shield (`src/styles.css`)**:
    * Styled `.mat-mdc-autocomplete-panel` and `.mat-mdc-select-panel` with `#0f172a` canvas, `border: 1.5px solid var(--color-border)`, `border-radius: var(--radius-2xl)`, `padding: 6px`, and deep ambient cyan glow.
    * Added `min-height: 48px; height: auto; border-radius: var(--radius-xl);` and `.mdc-list-item__primary-text { overflow: visible !important; white-space: normal !important; display: flex !important; }` on `.mat-mdc-option`.
  * **Reusable Option Layout Classes (`.option-member-row`, `.option-avatar`, `.option-meta`, `.option-status-badge`)**:
    * Standardized globally across `src/styles.css` so Kiosk search, POS member search, and all future dropdowns render with 100% pixel-perfect spacing and Level AAA contrast.
---

### 16. ❌ Failure #16: Material MDC Datepicker Popup Navigation & Month/Year Headers Defaulting to Black/Dark Grey Font, Plus Redundant Prefix Icon
* **Discovery Date**: 2026-08-30
* **Symptom / User Report**:
  > *"redesign this calendar because there are two of almost the same icon... also we have black font again... please document this failure again to learn and fix this... this can be reused so we need to fix this properly"*
* **Root Cause**:
  * In Angular Material MDC's `<mat-datepicker-content>`, header controls (`.mat-calendar-period-button`, `.mdc-button__label`, `.mat-calendar-arrow`, `.mat-calendar-previous-button`, `.mat-calendar-next-button`, and `.mat-calendar-body-label`) default to dark grey/black (`rgba(0, 0, 0, 0.87)` and `rgba(0, 0, 0, 0.54)`).
  * In `attendance-history.html`, both `<mat-icon matPrefix>event</mat-icon>` and `<mat-datepicker-toggle matIconSuffix>` were included in the same `<mat-form-field>`, creating an awkward visual redundancy of two calendar icons side-by-side.
* **Fix & Prevention**:
  * **Global MDC Datepicker Shield (`src/styles.css`)**:
    * Styled `.mat-calendar-period-button` with `#ffffff !important; font-weight: 900;`.
    * Styled `.mat-calendar-arrow` and navigation arrows with `fill: var(--color-cyan-light) !important;`.
    * Styled `.mat-calendar-body-label` ("AUG") with `color: var(--color-cyan-light) !important; font-weight: 900;`.
    * Styled `.mat-calendar-body-selected` with solid Eagles Gold gradient and `#090d16` text.
  * **Removed Duplicate Prefix Icon**: Retained only the interactive `.mat-datepicker-toggle` suffix.
---

### 17. ❌ Failure #17: CSS Cascading Precedence Collision Causing Mobile Card List to Display Concurrently with Desktop Table on Desktop Viewport
* **Discovery Date**: 2026-08-30
* **Symptom / User Report**:
  > *"why do we have 2 designs? please check"* (referencing duplicate Table and Mobile Card list showing stacked together on desktop).
* **Root Cause**:
  * An un-nested CSS rule `.mobile-card-list { display: flex; }` was declared below the `@media (max-width: 768px)` block.
  * In standard CSS cascading, `.mobile-card-list`'s `display: flex` overrode `.mobile-only { display: none; }`, forcing mobile cards to remain visible on wide desktop screens alongside the data table.
* **Fix & Prevention**:
  * **Global Strict Visibility Rules (`src/styles.css`)**:
    * Defined `.desktop-only { display: block !important; }` and `.mobile-only { display: none !important; }`.
    * Defined `@media (max-width: 768px) { .desktop-only { display: none !important; } .mobile-only { display: flex !important; } }`.
  * Scoped all mobile-specific card container layout rules strictly within the `max-width: 768px` media query.
---

### 18. ❌ Failure #18: Material MDC Menu Items, Tabs, and Table Sticky Headers Defaulting to Dark/Black Fonts on Dark Surfaces
* **Discovery Date**: 2026-08-30
* **Symptom / User Report**:
  > *"look at the dark font again. document this failure and learn from it. fix these"* (referencing black text on `mat-menu-item`, dark blue/grey text on `mat-tab-group`, and black font on `th.sticky-left`).
* **Root Cause**:
  * Angular Material MDC's `.mat-mdc-menu-item .mdc-list-item__primary-text` defaults to `rgba(0, 0, 0, 0.87)` (black). While the `.mat-mdc-menu-panel` background was styled to `#0f172a`, the individual item text elements inside it inherited MDC black defaults.
  * Angular Material MDC's `.mat-mdc-tab .mdc-tab__text-label` defaults to `rgba(0, 0, 0, 0.6)` for inactive tabs and dark theme primary blue for active tabs.
  * In `shift-schedules.css`, `th.col-staff.sticky-left` had `#0f172a` background but was missing an explicit `color: var(--color-text-secondary)` declaration.
* **Fix & Prevention**:
  * **Global MDC Menu Item Shield (`src/styles.css`)**:
    * Explicitly set `color: var(--color-text-body, #e2e8f0) !important;` on `.mat-mdc-menu-item` and `.mdc-list-item__primary-text`.
    * Set hover highlight `.mat-mdc-menu-item:hover { background-color: var(--color-cyan-dim) !important; color: #ffffff !important; }`.
  * **Global MDC Tabs Shield (`src/styles.css`)**:
    * Inactive tabs: `color: var(--color-text-secondary, #cbd5e1) !important; font-weight: 700;`.
    * Active tab: `color: var(--color-cyan-light, #22d3ee) !important; font-weight: 900;`.
    * Active underline: `border-color: var(--color-cyan-light, #22d3ee) !important; box-shadow: 0 0 12px rgba(6, 182, 212, 0.6);`.
  * **Sticky Table Headers**:
    * Applied explicit `color: var(--color-text-secondary, #cbd5e1) !important;` on all sticky frozen header cells.
---

### 19. ❌ Failure #19: Material MDC Checkbox, Radio, and Slide-Toggle Labels Defaulting to Unstyled Black Fonts
* **Discovery Date**: 2026-08-30
* **Symptom / User Report**:
  > *"we have another dark font in dark background. document the mistake, learn from it and fix"* (referencing black text on `mat-checkbox` label "Flexible Shift" inside `ShiftDefinitionModal`).
* **Root Cause**:
  * Angular Material MDC's `.mdc-checkbox .mdc-label` has internal shadow DOM specificity that does not inherit color from parent CSS wrappers (like `.flex-check { color: #e2e8f0; }`) without a global root declaration.
  * MDC checkboxes defaulted to browser dark text (`rgba(0, 0, 0, 0.87)`), rendering them invisible on dark modal dialogs.
* **Fix & Prevention**:
  * **Global MDC Checkbox, Radio & Slide Toggle Shield (`src/styles.css`)**:
    * Styled `.mat-mdc-checkbox label, .mat-mdc-checkbox .mdc-label` with `color: var(--color-text-body, #e2e8f0) !important;`.
    * Styled hover state `.mat-mdc-checkbox:hover .mdc-label { color: #ffffff !important; }`.
    * Styled checkbox frames and checked backgrounds with Electric Cyan (`#22d3ee`).
    * Styled Radio Buttons and Slide Toggles globally so all boolean inputs across the app are 100% immune to dark text bugs.
---

### 20. ❌ Failure #20: Disabled Form Fields Rendered in View Mode & Raw Native HTML Date Inputs
* **Discovery Date**: 2026-08-30
* **Symptom / User Report**:
  > *"this is ugly... i don't know what you did but these boxes is when not editable is ugly... redesign again"*
  > *"I'm expecting this to be with calendar option... also document the design we have for uneditable to editable transition... so we are consistent"*
* **Root Cause**:
  * Instead of rendering clean key-value info cards in View Mode, disabled `<mat-form-field>` controls were rendered, cluttering the UI with grey boxes.
  * Date fields used raw HTML `<input type="date">` which rendered unstyled browser `mm/dd/yyyy` placeholders instead of the sleek popup `<mat-datepicker>`.
* **Fix & Prevention**:
  * **View Mode**: Replaced all form fields with `.info-data-card` elements displaying `10px` cyan uppercase labels and pure white values (or italic `Not Set`).
  * **Edit Mode**: Enabled `<mat-datepicker>` with single calendar toggle icon (`matIconSuffix`) on all date fields (`birthDate`, `hireDate`).
  * **Design System Standard**: Documented the View Mode vs Edit Mode pattern in `docs/DESIGN_SYSTEM_TOKENS.md`.
---

### 21. ❌ Failure #21: Modal Close/Cancel Buttons Bound to Action Method Instead of Dialog Close Method
* **Discovery Date**: 2026-08-30
* **Symptom / User Report**:
  > *"unable to close this when I click x nor close button..."* (referencing `ClaimVoucherDialog`).
* **Root Cause**:
  * In `claim-voucher-dialog.html`, both the top header `(click)="onCancelAndRefund()"` and the footer Close button `(click)="onCancelAndRefund()"` were mistakenly bound to the business action method `onCancelAndRefund()` (which calls a cloud function to refund voucher coins and requires a non-empty voucher code) instead of `(click)="onClose()"`.
  * As a result, clicking "Close" or "x" executed the refund validation check, displayed an error alert, and refused to close the dialog.
* **Fix & Prevention**:
  * Bound the dialog header `x` button and the footer "Close" button strictly to `(click)="onClose()"`.
  * Added dedicated `Cancel & Refund` button only visible when a voucher code is typed.
  * Audit Rule: Always double-check modal template click bindings (`close()` / `onClose()`) against component TypeScript method signatures.
---

### 22. ❌ Failure #22: Angular Material Stepper White Background & Missing 4-Screen Responsive Shield
* **Discovery Date**: 2026-08-30
* **Symptom / User Report**:
  > *"you failed to include the other screen sizes. please document this failure so you won't repeat it again. also recheck the whole redesign for other screen sizes we are maintaining. you cannot make mistake again because I am just repeating my other guidance as before"* (with screenshot of Tablet 768px view showing bright white `#ffffff` stepper canvas).
* **Root Cause**:
  * Angular Material MDC Stepper (`.mat-stepper-horizontal`, `.mat-horizontal-stepper-header-container`, `.mat-horizontal-content-container`) defaults to white `#ffffff` background with unstyled dark text.
  * No Global Stepper Shield existed in `src/styles.css`, causing the mobile/tablet fallback stepper to illuminate in bright white on screens `<= 768px`.
  * The responsive breakpoint was hardcoded to `960px` rather than adhering strictly to the **4 Screen Parameters** (`< 640px` mobile, `640px-768px` tablet portrait, `769px-1024px` tablet landscape, `> 1024px` desktop).
* **Fix & Prevention**:
  1. Created the **Global MDC Stepper Contrast & Dark Theme Shield** in `src/styles.css`, locking container, header, icons, labels, and connector lines into the Dark Pro token canvas (`var(--color-app)` / `var(--color-surface)` / Electric Cyan active states).
  2. Restructured `pos.css` to strictly respect all 4 screen parameters:
     - 📱 **Mobile (< 640px)**: Stepper flow, 2-column product grid (`repeat(2, 1fr)`), compact member card, stacked buttons, sticky bottom review bar.
     - 📱 **Tablet Portrait (640px – 768px)**: Stepper flow with centered header, 3-column product grid (`repeat(auto-fill, minmax(160px, 1fr))`), 520px member card.
     - 💻 **Tablet Landscape (769px – 1024px)**: 2-Column POS layout with compact 310px cart deck.
     - 🖥️ **Desktop (> 1024px)**: Full 2-Column Matrix with 380px cart deck and expanded product matrix.
  3. Registered Stepper Token Architecture in `docs/DESIGN_SYSTEM_TOKENS.md`.
---

### 23. ❌ Failure #23: "Clear All" Text Squished in Fixed-Size Icon Button & Broken Checkout Footer Borders
* **Discovery Date**: 2026-08-30
* **Symptom / User Report**:
  > *"analyze the image... check why this looks like this... the clear all and the total amount due seems off... document this mistake so you will learn and fix this"* (referencing Step 3 Mobile Review & Pay screen).
* **Root Cause**:
  1. In `pos.html`, the text button `<button class="btn-clear-cart">... Clear All</button>` reused the desktop class `.btn-clear-cart` which had hardcoded dimensions `width: 32px; height: 32px;`. This caused the text "Clear All" to vertically break across lines and overlap into a squished square.
  2. In `pos.css`, `.checkout-footer` combined `border-top: 1.5px solid` with `border-radius: var(--radius-xl)` without side/bottom borders, rendering a broken curved line above the total amount instead of an enclosed, professional card.
* **Fix & Prevention**:
  1. Created `.btn-clear-cart-text` with `width: auto`, horizontal padding `6px 14px`, `white-space: nowrap`, and inline flex layout.
  2. Replaced partial border `.checkout-footer` with `.checkout-footer-card`, featuring an enclosed 1.5px solid border, 16px radius, and an internal divider between the total amount and checkout actions.
  3. Responsive Template Audit Rule: Never apply fixed square icon dimensions (`32x32px`) to buttons that contain label text. Always create separate text-variant button classes (`.btn-*-text`).
---

### 24. ❌ Failure #24: Mobile Content Truncated at Bottom & Missing Safe-Area Scroll Buffer
* **Discovery Date**: 2026-08-31
* **Symptom / User Report**:
  > *"in mobile, not the whole interface is displayed... check for all screen sizes and fix. add this to failure so you can learn from mistakes"* (with screenshot of Mobile 425px view showing bottom table content clipped at the viewport edge).
* **Root Cause**:
  * `.cash-management-container` used `min-height: calc(100vh - 70px)` with a tight bottom padding (`12px`), causing the bottom of data tables, empty states, and cards to be clipped off by the viewport edge on mobile devices.
  * The table lacked explicit `min-width` and frozen sticky column styling, making mobile panning feel truncated and awkward.
* **Fix & Prevention**:
  1. Applied the **Mandatory Safe-Area Bottom Buffer (100px - 140px)** on mobile viewports (`< 640px` and `640px - 768px`) across all pages.
  2. Added sticky frozen first column (`.sticky-col`) with `min-width: 720px` to `.table-responsive-wrapper`, ensuring smooth horizontal touch panning without layout breakage.
  3. Formally added the **Mandatory Safe-Area Bottom Buffer Protocol** to `docs/DESIGN_SYSTEM_TOKENS.md`.
---

### 25. ❌ Failure #25: Overly-Wide Sticky Frozen Column on Mobile Masking Non-Frozen Data
* **Discovery Date**: 2026-08-31
* **Symptom / User Report**:
  > *"the design for mobile is bad. notice how the sticky design occupied the whole scren with little to show for non-freeze columns... since this is a table and this should be one of the reusable component that we have for redesign, check if we will encounter the same for those. also report to me if this is reusable table component of you created a new table design. fix this"* (with screenshot of Mobile 425px view showing 75% of viewport occupied by sticky Product column).
* **Root Cause**:
  * On mobile screens (< 640px), applying `position: sticky; left: 0;` to a wide composite table column (such as `Product` with thumbnail, name, and description) caused the sticky cell to span 300px on a 375px–425px viewport, severely suffocating the remaining table columns (`Price`, `Stock`, `Category`, `Actions`).
* **Fix & Prevention (Adaptive Table-to-Card Protocol)**:
  1. **Adaptive Table-to-Card Pattern for Rich Data**:
     * For rich entity matrices (Products, Members, Catalog items), render an **Adaptive Mobile Card Matrix** (`.mobile-cards-deck` on `< 640px` and `.table-responsive-wrapper` on `≥ 640px`).
     * On mobile, cards display thumbnail, title, category badge, retail price (Gold), stock pill (Mint/Amber/Rose), and action buttons cleanly in a single stacked card without horizontal panning friction.
  2. **Sticky Column Restriction Rule**:
     * Sticky column freezing (`.sticky-col`) is strictly reserved for narrow identifier columns (`< 100px`, e.g. short timestamp or ID). For any composite cell, sticky freezing must be disabled on `< 640px` or converted to mobile cards.
---

### 26. ❌ Failure #26: Fixed Docked Action Bar Overlapping Bottom Content Due to Underestimated Scroll Buffer
* **Discovery Date**: 2026-08-31
* **Symptom / User Report**:
  > *"this is the full scroll down... notice that the bottom component is covering the little space of the last item... please add space for this as it can hide minor details and maybe apply proper spacing... document this mistake and fix"* (with screenshots of Mobile 425px and Desktop views showing fixed docked action bar covering the bottom row/card details).
* **Root Cause**:
  * When using a fixed docked bottom bar (`position: fixed; bottom: 0;`), the bar's height on mobile is ~170px (summary text + 2 stacked buttons with margins) and on desktop is ~75px.
  * Setting a bottom padding of only `160px` on mobile provided 0px breathing margin, meaning that even when scrolled to the extreme bottom, the variance pill on the last item card was hidden behind the docked bar.
* **Fix & Prevention (Mandatory Docked Action Bar Safe-Area Protocol)**:
  1. **Generous Buffer Calculation Formula (`DockedBarHeight + 60px`)**:
     * Mobile (< 640px): `padding-bottom: 220px !important;` (160px docked bar + 60px clearance).
     * Tablet (640px - 1024px): `padding-bottom: 140px !important;` (75px docked bar + 65px clearance).
     * Desktop (> 1024px): `padding-bottom: 140px !important;` (75px docked bar + 65px clearance).
  2. **Physical DOM Scroll Spacer**:
     * Always add a physical DOM element `<div class="bottom-scroll-spacer"></div>` (`height: 24px;`) before the fixed docked footer to guarantee physical scroll clearance regardless of container box-sizing.
---

### 27. ❌ Failure #27: CDK Overlay / Mat-Menu Text Invisibility Due to Unbound CDK Dark Colors & Native MDC Item Clash
* **Discovery Date**: 2026-08-31
* **Symptom / User Report**:
  > *"check and find out why we can see nothing from this notification in header... document failure.. fix this"* (with screenshot of Header Notification dropdown where icons and seals rendered, but all text next to it was completely invisible).
* **Root Cause**:
  * `mat-menu` renders in the root `cdk-overlay-container` outside standard component scopes.
  * Using `<button mat-menu-item>` inside custom dropdown containers caused Angular Material's native MDC styles (`color: rgba(0,0,0,0.87)`, `white-space: nowrap`, `height: 48px`) to take precedence, rendering dark black text against a `#1e293b` dark surface and truncating custom layouts.
* **Fix & Prevention (Overlay High-Contrast Declaration Protocol)**:
  1. **Direct High-Contrast Tokens in Overlay Styles**:
     * In all CDK Overlay panels (menus, popovers, dialogs), explicitly bind `.notif-title` to `color: #ffffff !important;` and `.notif-body` to `color: var(--color-text-body, #e2e8f0) !important;`.
  2. **Custom Interactive Row Pattern (`<button type="button" class="notif-dropdown-row">`)**:
     * Avoid mixing `<button mat-menu-item>` with custom multi-line flex containers inside scrollable panels. Instead, use clean custom button elements (`.notif-dropdown-row`) with full-width flex, explicit padding, and tokenized typography.
---

### 28. ❌ Failure #28: Header Status Widgets Overcrowding Mobile Viewport & Pushing Bell / Chat Off-Screen
* **Discovery Date**: 2026-08-31
* **Symptom / User Report**:
  > *"where is the notification and chat when in mobile? what's the redesign intended for that? document this failure"* (with screenshot of Mobile 425px view where Quota & Shift status pills occupied all header space, clipping the Notification Bell and Chat button off-screen).
* **Root Cause**:
  * On viewports `< 640px`, displaying the Logo (140px) + Quota status badge (120px) + Shift status badge (120px) exceeded 400px width.
  * This overflowed the 375px–425px mobile screen, pushing the primary action buttons (Notification Bell and Chat trigger) completely out of the viewport.
* **Fix & Prevention (Mobile Header Action Priority Protocol)**:
  1. **Essential Action Priority**:
     * Critical communication & alert triggers (**Notification Bell** and **Chat**) MUST ALWAYS remain visible in the mobile header.
     * Non-essential informative badges (Quota & Shift pills) MUST be hidden on mobile (`hidden lg:flex` / `hidden sm:flex`) since their information is already prominently displayed in the main dashboard view cards.
  2. **Adaptive Dropdown & Drawer Widths**:
     * Notification dropdown menu dynamically clamps to `calc(100vw - 20px)` on mobile.
     * Chat sidebar expands to `w-full max-w-[100vw] sm:w-80` on mobile for optimal full-width touch interaction.
---

### 29. ❌ Failure #29: Nested Scroll Container & Unclamped Title Slicing Page Header Under Sticky Ticker on Mobile
* **Discovery Date**: 2026-08-31
* **Symptom / User Report**:
  > *"some parts of the header for this page is hidden? please fix, document mistake, learn from it"* (with screenshot of Mobile 425px view showing the top line of the page title card `Restock Inventory &` and top of back button circle sliced off under the sticky staff reminder ticker bar).
* **Root Cause**:
  1. Setting `overflow-y: auto` on `.purchase-page-container` alongside `mat-sidenav-content` created a nested scrolling context where the container scrolled partially under the sticky ticker bar.
  2. Long titles (`Restock Inventory & Purchase Entry`) without responsive font clamps on mobile wrapped across 2 lines at large font sizes (20px), causing the top half of the header card to get pushed or cut off.
* **Fix & Prevention (Single Root Scroll & Mobile Title Clamp Protocol)**:
  1. **Single Scroll Root Rule**:
     * Page-level containers (`.purchase-page-container`, `.page-container`) must NOT declare `overflow-y: auto;`. Let `mat-sidenav-content` manage the unified scrolling root.
  2. **Responsive Mobile Title Clamp**:
     * On `@media (max-width: 639px)`, always clamp `.page-title` to `font-size: var(--font-size-base, 16px) !important; line-height: 1.25 !important;`.
  3. **Top Safe Padding Buffer**:
     * Maintain at least `padding-top: 14px !important;` on mobile so header cards sit completely below the sticky ticker bar.
---

### 30. ❌ Failure #30: MDC Form Field Height Enclosure & Prefix Shift Inside Mobile Card Rows
* **Discovery Date**: 2026-08-31
* **Symptom / User Report**:
  > *"look at the input text, it is not within it's container... document failure, learn and fix this bug"* (with screenshot of Mobile card where the Unit Cost input text was vertically shifted to the bottom of the tall MDC wrapper, and quantity stepper input was collapsed).
* **Root Cause**:
  1. Standard Material `<mat-form-field appearance="outline">` enforces 56px height with reserved floating-label and subscript space. When placed in tight horizontal mobile grids without `subscriptSizing="dynamic"`, it causes vertical misalignment and text overflow.
  2. The custom quantity stepper was missing explicit `height: 38px`, `border-radius: 6px`, and individual gap spacing, causing the quantity number input to collapse.
* **Fix & Prevention (Compact Mobile Card Input Architecture Protocol)**:
  1. **Custom Stepper Architecture (`.stepper-wrap`)**:
     * Use discrete 36px buttons (`.btn-step`) with 4px gap and a dedicated centered input (`.mobile-qty-field`) with `height: 38px`, `box-sizing: border-box`, `text-align: center`, and `font-family: mono`.
  2. **Custom Currency Input Pattern (`.custom-cost-input-wrap`)**:
     * For compact mobile cards, use a dedicated flex input wrapper (`.custom-cost-input-wrap`) with embedded gold currency prefix (`₱`) and full height centering (`height: 38px`), ensuring 100% vertical alignment and focus glow.
  3. **Table Dynamic Subscripts**:
     * For all desktop table form fields, always specify `subscriptSizing="dynamic"`.

### 31. 💥 Displaced Bottom-of-Page Expanders vs Focused Modal Inspections
* **What Happened**: In `StaffAttendanceAdminComponent` (`/staff-attendance`), clicking "7-Day Matrix" to view an employee's shift details expanded an accordion at the very bottom of the entire multi-row table.
* **Root Cause**: Forcing the user on desktop, tablet, or mobile to scroll down past 10–50 rows of employees just to see that single person's breakdown, and then having to scroll all the way back up to continue reviewing other team members. This caused severe vertical disorientation and degraded UX.
* **Permanent Prevention Protocol**:
  1. **Direct Focus Modal for Deep Item Inspections**: Multi-day attendance logs, detailed timecards, or heavy itemized breakdowns must be rendered inside a dedicated **Dark Pro Focus Modal** (`StaffWeeklyMatrixModalComponent`).
  2. **Preserve Scroll Position**: Opening a modal keeps the user's background list in place so closing the modal immediately returns the user to the exact row they were reviewing with zero scrolling overhead.

---

### 32. ❌ Failure #32: Unconstrained Side Drawer Height & Viewport Fold Traps in `<mat-drawer>`
* **Discovery Date**: 2026-09-01
* **Symptom / User Report**:
  > *"in /store/reports page, see image... this area, I cannot view what's below... in desktop, not full list is viewable...same with tablet... in mobile, it is the same long scrollable space below... please check why? as in this is very long"* (with screenshots showing the bottom physical cash count card and transaction tabs clipped off at the bottom window edge with internal scrolling trapped).
* **Root Cause**:
  1. In Angular Material, `<mat-drawer mode="over">` defaults to `position: absolute; top: 0; bottom: 0;` relative to its `<mat-drawer-container>`. When the background table on the main page was tall (e.g. 1500px), the drawer itself expanded to 1500px tall.
  2. Because the drawer had 1500px of vertical space, its internal scroll container (`.drawer-body`) assumed the content easily fit without triggering a scrollbar.
  3. However, the user's browser window is only ~800px tall, so everything between 800px and 1500px was physically rendered below the viewport fold, and because `<mat-drawer mode="over">` applies a backdrop that disables main window scrolling, the user was permanently trapped from seeing the bottom tabs.
  4. On mobile, compounding `min-height: 100vh;` on `.drawer-container`, `padding-bottom: 140px;` on `.drawer-content-scroll`, and an extra `80px` spacer created 2.5x to 3x viewport heights of empty dark void.
* **Fix & Prevention (Mandatory Viewport-Fixed Side Drawer Protocol)**:
  1. **Direct Viewport Pinning (`position: fixed !important;`)**:
     * Side drawers (`<mat-drawer>` / `.detail-drawer`) MUST be pinned directly to the browser viewport:
       ```css
       .detail-drawer {
         position: fixed !important;
         top: 60px !important;
         bottom: 0 !important;
         right: 0 !important;
         height: calc(100vh - 60px) !important;
         max-height: calc(100vh - 60px) !important;
         display: flex !important;
         flex-direction: column !important;
         z-index: 1000 !important;
       }
       ```
  2. **Flex Column Chain on Angular Material Inner Container**:
     * Always enforce flex structure on Angular Material's internal wrapper:
       ```css
       .detail-drawer ::ng-deep .mat-drawer-inner-container {
         display: flex !important;
         flex-direction: column !important;
         height: 100% !important;
         overflow: hidden !important;
       }
       ```
  3. **Strictly Constrained Scroll Body**:
     * `.drawer-header` must be `flex-shrink: 0;`.
     * `.drawer-body` must be `flex: 1; min-height: 0; overflow-y: auto !important; padding: 16px 16px 36px 16px !important;` to ensure internal scrolling always activates at the exact viewport boundary.
  4. **Eliminate Redundant Artificial Spacers**:
     * Never stack `min-height: 100vh` on nested content wrappers with `padding-bottom: 140px` and large spacer divs. Use compact natural padding (`14px–24px`) with a small `16px` scroll spacer.
