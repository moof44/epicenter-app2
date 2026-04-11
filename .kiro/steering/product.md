# Product Overview

Epicenter is a gym management system with two Angular applications:

1. **gym-app** (main) — Staff-facing management dashboard for running day-to-day gym operations
2. **members-portal** — Public-facing portal for gym members

## Core Domains

- **Members**: Registration, profiles, membership/training renewal (30-day cycles), duplicate detection and merging
- **Attendance**: Check-in tracking linked to members
- **Store/POS**: Point-of-sale, inventory management (stock take, restock, purchase history, movement tracking), shift/cash management
- **Progress**: Member body measurements and fitness tracking with dashboard
- **Reports**: Admin analytics, sales reports, monthly sales, cash reports
- **User Management**: Staff accounts with role-based access (ADMIN, MANAGER, STAFF, TRAINER)
- **Settings**: System-wide configuration (e.g., emergency logout, daily quotas)

## Role-Based Access

| Role    | Access                                                    |
|---------|-----------------------------------------------------------|
| ADMIN   | Full access — reports, analytics, user management, settings |
| MANAGER | Members, attendance, store management, inventory           |
| STAFF   | Members, attendance, POS, transactions, shift management   |
| TRAINER | Members (read), attendance, progress tracking              |

## Backend

Firebase Cloud Functions handle privileged operations: staff account CRUD, role assignment via custom claims, and emergency logout (token revocation).
