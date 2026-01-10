# Code Quality & Standards

## Tech Stack
- **Framework**: Angular v21+ (Standalone Components, Signals, Zoneless-readiness)
- **Backend / DB**: Firebase v12 (Firestore, Auth)
- **UI Library**: Angular Material v21 (MDC-based components)

## 1. Angular Architecture & Performance
- **Logic Placement**: Components must only handle View Logic. **Business Logic** (math, data transformation, API calls) must reside in Services.
- **Change Detection**:
  - **New Components**: MUST use `changeDetection: ChangeDetectionStrategy.OnPush`.
  - **Existing Components**: Refactor to `OnPush` when touching the file significantly.
- **Dependency Injection**: Always use `inject()` over constructor injection.
- **Standalone**: All new components must be `standalone: true`.
- **Signals**: Use Signals for local UI state (loading snippets, toggles). Use RxJS for complex data streams (Firestore).
- **Subscription Management**: Use `takeUntilDestroyed` (in injection context) to auto-clean subscriptions.

## 2. Firestore & Data Safety (CRITICAL)
- **Bounded Reads**: NEVER call `getDocs` or `collectionData` without `limit()` or `where()`.
  - *Constraint*: Default limit is 20-50 items to prevent billing spikes.
- **Atomic Writes**: ALL related data updates (e.g., Stock + Log) must use `writeBatch` or `runTransaction`.
- **Root Collections**: High-volume data (Logs, Transactions) must be in Root Collections, not embedded in documents.
- **Timestamps**: Store as Firestore `Timestamp`. Transform to Date only in the view layer.

## 3. Mobile-First & UI/UX
- **Responsive Tables**: `mat-table` is hostile to mobile.
  - *Rule*: For mobile views (< 768px), switch to a "Card View" or use CSS `display: block` to stack cells.
- **Touch Targets**: Buttons/Inputs must be ≥ 44px high.
- **Loading States**: Use **Skeleton Loaders** or Spinners for any async action. Avoid empty white space while loading data.
- **Feedback**: All async actions (Save, Delete) must show a `MatSnackBar` result (Success/Error).
- **Action Reversibility**: Prefer "Undo" SnackBars over Confirmation Dialogs for reversible actions (e.g., removing from cart). Only use Dialogs for permanent data destruction.
- **Empty States**: Empty lists must display a "Call to Action" or helper text explaining how to populate the data (e.g., "No sales yet. Start a shift to see data.").
- **Input Masking**: Use formatting masks for Currency and Phone Numbers to prevent reading errors during data entry.

## 4. Material Design Standards
- **Theming**: NEVER hardcode Hex colors (e.g., `#3f51b5`). Use Material Theme mixins or CSS variables (e.g., `var(--mat-sys-primary)`).
  - *Why*: Ensures Dark Mode compatibility and brand consistency.
- **Spacing System**: All `margin`, `padding`, and `gap` values must be multiples of **8px** (e.g., 8px, 16px, 24px).
  - *Exception*: Small visual adjustments may use 4px.
- **Typography**: Use standard Material hierarchy (`mat-headline-small`, `mat-body-large`) rather than custom font sizes.

## 5. Naming & Style
- **Observables**: Append `$` (e.g., `products$`).
- **Signals**: Do not append `$` (e.g., `isLoading = signal(false)`).
- **Imports**: Remove unused. order: Angular -> 3rd Party -> Local.
- **Strict Typing**: No `any` allowed in `core/` or business logic.

## 6. Security & Robustness
- **Sensitive Logic**: Do not calculate critical financial totals (e.g., Salary, Master Profit) purely on the client if avoidable.
- **Null Safety**: Use optional chaining `?.`.
- **Error Handling**: `catchError` in Observables. Log errors to console and return safe defaults.
- **Validation**: Forms must use `Validators` before submission.

## 7. Validation Protocol
- **Verify Before Finish**: You must ALWAYS run `npm run build` and fix ALL errors/warnings before reporting a task as finished.
- **Zero Warnings**: The goal is a clean build. Address Angular template warnings immediately (e.g., `NG8107`).