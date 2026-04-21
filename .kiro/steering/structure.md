# Project Structure

Multi-project Angular workspace with a Firebase backend.

```
├── src/                          # gym-app (main staff dashboard)
│   └── app/
│       ├── core/                 # Singletons: services, guards, models, utils, constants, animations
│       │   ├── services/         # Injectable root-level services (Firestore-backed)
│       │   ├── guards/           # Route guards (auth, role, admin)
│       │   ├── models/           # TypeScript interfaces for Firestore documents
│       │   ├── components/       # App-wide widgets (quota status, staff reminders)
│       │   ├── utils/            # Pure helper functions
│       │   ├── constants/        # Static data
│       │   └── animations/       # Route transition animations
│       ├── features/             # Feature modules, each with components/ subfolder
│       │   ├── attendance/
│       │   ├── auth/
│       │   ├── members/
│       │   ├── progress/
│       │   ├── reports/
│       │   ├── settings/
│       │   ├── store/            # Has its own routes (store.routes.ts) and services/
│       │   └── user-management/
│       └── shared/               # Reusable components and directives
│           ├── components/       # Dialogs (confirmation, remarks, stale-shift)
│           └── directives/       # e.g., prevent-double-click
├── projects/members-portal/      # Members-facing public portal (separate Angular app)
│   └── src/app/
│       ├── core/
│       └── features/home/
├── functions/                    # Firebase Cloud Functions (Node 20, TypeScript)
│   └── src/index.ts              # All callable functions (staff CRUD, emergency logout)
├── public/                       # Static assets for gym-app
└── docs/                         # Analysis and investigation documents
```

## Conventions

- **Standalone components only** — no NgModules
- **Component selector prefix**: `app-` (kebab-case elements, camelCase attributes for directives)
- **File naming**: kebab-case. Component files use either `name.ts` or `name.component.ts` (mixed — both patterns exist)
- **Services**: `providedIn: 'root'`, use `inject()` for DI
- **Routing**: Top-level routes in `app.routes.ts`; feature sub-routes use `loadComponent`/`loadChildren` for lazy loading
- **Route guards**: Functional guards (`CanActivateFn`), roles passed via `route.data['roles']`
- **Templates**: Separate `.html` files for larger components; inline templates for small ones (dialogs)
- **Styles**: Separate `.css` files per component
- **Models**: Interfaces in `core/models/`, named `*.model.ts`
- **Firestore**: Direct SDK usage via `@angular/fire` (no REST layer)
- **Audit trail**: Mutations track `createdBy` / `lastModifiedBy` with `{ uid, name, timestamp }`
