# Implementation Plan: Shared Layout Containers & Reusable UI Primitives

> **Target Directory**: `src/app/shared/ui/`  
> **Philosophy**: Build the unified foundational building blocks ("Fix One to Fix All") with 100% CSS Custom Property token adherence, WCAG 2.2 AAA contrast, and 4-screen responsive adaptability.

---

## 🎨 Architectural Specifications & Components

### 1. 🏛️ Layout Containers (`src/app/shared/ui/layout/`)
1. **`<app-page-container>`**:
   - **Inputs**: `maxWidth: 'standard' | 'wide' | 'narrow' | 'full'` (default `'standard'`), `noPadding: boolean` (default `false`).
   - **Behavior**: Standardizes page padding (`p-4 sm:p-6 lg:p-8`), bottom safe-area insets (`pb-safe`), and responsive width clamping (`max-w-standard` / `1280px` or `max-w-wide` / `1600px`).
2. **`<app-page-header>`**:
   - **Inputs**: `title: string`, `subtitle?: string`, `icon?: string`.
   - **Slots**: Action button slot (`<ng-content select="[actions]">`).
   - **Typography**: Pure White H1 (`#ffffff`, **19.4:1 contrast**), Slate 300 subtitle (`#cbd5e1`, **12.5:1 contrast**).
3. **`<app-card>`**:
   - **Inputs**: `variant: 'default' | 'elevated' | 'glass' | 'interactive'` (default `'default'`), `noPadding?: boolean`.
   - **Behavior**: Standardizes card surface (`bg-slate-app`), 1px border (`border-slate-border`), `rounded-2xl`, and depth shadows.

---

### 2. 🔘 Buttons & Icon Controls (`src/app/shared/ui/button/`)
1. **`<app-button>`**:
   - **Inputs**: `variant: 'primary' | 'secondary' | 'danger' | 'ghost'` (default `'primary'`), `size: 'sm' | 'md' | 'lg'` (default `'md'`), `disabled: boolean`, `loading: boolean`, `icon?: string`.
   - **Touch Target**: Strict `44px` minimum height (`h-control-md`) meeting WCAG 2.5.8.
2. **`<app-icon-button>`**:
   - **Inputs**: `icon: string`, `ariaLabel: string`, `variant: 'default' | 'primary' | 'danger'`, `size: 'sm' | 'md'`.
   - **Behavior**: Accessible square icon button with focus ring and aria attributes.

---

### 3. 🔍 Form Fields & Status Badges (`src/app/shared/ui/form-field/` & `badge/`)
1. **`<app-search-input>`**:
   - **Inputs**: `placeholder: string`, `value: string`.
   - **Outputs**: `searchChange: EventEmitter<string>`, `clear: EventEmitter<void>`.
   - **Behavior**: Dark input with leading magnifying glass, clear button (`✕`), and Electric Cyan focus ring.
2. **`<app-badge>`**:
   - **Inputs**: `variant: 'success' | 'warning' | 'danger' | 'cyan' | 'gold' | 'muted'`, `size: 'sm' | 'md'`.
   - **Behavior**: High-contrast pill badge for Member Status (Active/Expired), Payment Status (Paid/Pending), and Attendance.

---

### 4. 📭 Feedback & Mobile Drawers (`src/app/shared/ui/feedback/` & `bottom-sheet/`)
1. **`<app-empty-state>`**:
   - **Inputs**: `icon: string`, `title: string`, `description: string`, `actionLabel?: string`.
   - **Outputs**: `actionClick: EventEmitter<void>`.
2. **`<app-spinner>`**:
   - **Inputs**: `size: 'sm' | 'md' | 'lg'`, `color: 'cyan' | 'white'`.
3. **`<app-bottom-sheet>`**:
   - **Inputs**: `isOpen: boolean`, `title?: string`.
   - **Outputs**: `closed: EventEmitter<void>`.
   - **Behavior**: Native mobile slide-up drawer with backdrop blur and drag handle.

---

## 🛠️ Proposed File Tree

```text
src/app/shared/ui/
├── index.ts                     (Public API exports)
├── layout/
│   ├── page-container.component.ts
│   ├── page-container.component.html
│   ├── page-header.component.ts
│   ├── page-header.component.html
│   ├── card.component.ts
│   └── card.component.html
├── button/
│   ├── button.component.ts
│   └── icon-button.component.ts
├── form-field/
│   ├── search-input.component.ts
│   └── form-field.component.ts
├── badge/
│   └── badge.component.ts
├── feedback/
│   ├── empty-state.component.ts
│   └── spinner.component.ts
└── bottom-sheet/
    ├── bottom-sheet.component.ts
    └── bottom-sheet.component.html
```

---

## 🧪 Verification Plan
1. **Compilation Check**: Run `npm run build` to verify all standalone components compile with 0 errors.
2. **Lint Audit**: Run `npx eslint` across `src/app/shared/ui/**/*` to ensure clean TypeScript formatting.
3. **Design System Adherence**: Verify that all components use only CSS Custom Properties (`var(--color-...)`, `var(--font-size-...)`) with 0 magic numbers.
