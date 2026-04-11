# Tech Stack

## Frontend
- Angular 21 (standalone components, signals, `inject()` pattern)
- Angular Material 21 + Angular CDK (UI components, layout, dialogs, snackbars)
- @ngrx/signals (SignalStore for client-side state management)
- TypeScript 5.9
- RxJS 7.8 (services and guards use Observables; components increasingly use signals)
- ApexCharts via ng-apexcharts (charting in reports/analytics)
- CSS (no preprocessor — plain `.css` files)

## Backend
- Firebase (project: `epicenter-app`)
  - Firestore (persistent local cache with multi-tab support)
  - Firebase Auth (email/password, custom claims for roles)
  - Firebase Cloud Functions v1 (Node 20, TypeScript, `firebase-admin`)
  - Firebase Hosting (two targets: `main` for gym-app, `portal` for members-portal)

## Testing
- Vitest 4 (unit tests via `@angular/build:unit-test`)
- jsdom for DOM environment
- Coverage: v8 provider, enforced at 90% (lines, functions, branches, statements)

## Linting & Formatting
- ESLint 9 with angular-eslint and typescript-eslint
- Prettier (100 char width, single quotes, Angular HTML parser)
- Husky pre-commit hook runs `lint-staged` (auto-fixes `.ts`, `.html`, `.js` in `src/`)

## Common Commands

| Task                        | Command                    |
|-----------------------------|----------------------------|
| Serve gym-app               | `ng serve`                 |
| Serve members-portal        | `ng serve members-portal`  |
| Build gym-app (prod)        | `ng build`                 |
| Build members-portal (prod) | `ng build members-portal`  |
| Run tests                   | `ng test`                  |
| Run tests with coverage     | `ng test --coverage --watch=false` |
| Lint                        | `ng lint`                  |
| Build functions             | `npm run build` (in `functions/`) |
| Deploy functions            | `firebase deploy --only functions` |
