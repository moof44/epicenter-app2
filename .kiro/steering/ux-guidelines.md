# UX Guidelines

## Naming Conventions

- Observables: append `$` suffix (e.g., `products$`).
- Signals: no `$` suffix (e.g., `isLoading = signal(false)`).
- No `any` in `core/` or business logic. Strict typing required.
- Import order: Angular → 3rd party → Local. Remove unused imports.

## Security & Robustness

- Do not calculate critical financial totals purely on the client if avoidable.
- Use optional chaining `?.` for null safety.
- Use `catchError` in Observables — log errors and return safe defaults.
- Forms must use `Validators` before submission.

## Mobile-First Design

- For mobile views (< 768px), switch `mat-table` to card view or CSS `display: block` stacked layout.
- Touch targets must be ≥ 44px high (44x44px / 7–10mm minimum).
- Avoid multi-window views on mobile. Use full-screen layouts or clean component swaps.
- Show one task per screen to reduce cognitive load and support flow state.
- Use progressive disclosure: show only what's needed for the current step, hide advanced options in submenus or expandable sections.

## Feedback & Loading States

- Use skeleton loaders or spinners for any async action. No empty white space while loading.
- All async actions (Save, Delete) must show a `MatSnackBar` result (Success/Error).
- Prefer "Undo" snackbars over confirmation dialogs for reversible actions. Use dialogs only for permanent data destruction.
- Empty lists must display a call-to-action or helper text (e.g., "No sales yet. Start a shift to see data.").

## Accessibility

- High color contrast required.
- Readable typography (appropriate font size and weight).
- Use semantic HTML to support screen readers.

## Visual Hierarchy

- Use size, color, and placement to highlight the most important action or information.
- Every interaction (tap, click) must trigger a visible response (animation, ripple, color change).

## Validation Protocol

- Run `ng build` and fix ALL errors/warnings before reporting a task as finished.
- Target zero warnings — address Angular template warnings immediately.
- Perform code cleanup before git commits: lint, format, remove `console.log`, remove unused imports.
