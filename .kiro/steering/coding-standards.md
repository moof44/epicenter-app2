# Coding Standards

## Angular Architecture & Performance

- Components handle view logic only. Business logic (data transformation, API calls) belongs in services.
- New components MUST use `changeDetection: ChangeDetectionStrategy.OnPush`. Refactor existing ones to OnPush when making significant changes.
- Use `inject()` over constructor injection.
- All new components must be `standalone: true`.
- Use Signals for local UI state (loading flags, toggles). Use RxJS for complex data streams (Firestore).
- Use `takeUntilDestroyed` (in injection context) to auto-clean subscriptions.

## Firestore & Data Safety

- NEVER call `getDocs` or `collectionData` without `limit()` or `where()`. Default limit: 20–50 items but there will be exemptions if needed
- ALL related data updates (e.g., Stock + Log) must use `writeBatch` or `runTransaction`.
- High-volume data (Logs, Transactions) must be in root collections, not embedded in documents.
- Store timestamps as Firestore `Timestamp`. Transform to `Date` only in the view layer.

## Material Design Standards

- NEVER hardcode hex colors (e.g., `#3f51b5`). Use Material CSS variables (`var(--mat-sys-primary)`).
- All `margin`, `padding`, and `gap` values must be multiples of 8px. Exception: 4px for small adjustments.
- Use Material typography hierarchy (`mat-headline-small`, `mat-body-large`) over custom font sizes.
