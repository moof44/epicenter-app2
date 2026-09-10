# Monthly Performance Report: Unrenewed Subscriptions & Training Tracker Specs

## 1. Problem & Context
The gym management requires visibility into member retention on the **Monthly Performance Report**:
- Identify members whose **monthly gym subscription** and/or **personal training** expired during the selected month and **did not renew**.
- Ensure that fetching and rendering this data incurs **near-zero Firestore/Firebase cost** and does not inflate database billing.
- Verify whether existing database records since **May 2026 to present** contain valid data or if artificial data generation is needed.

## 2. Research & Key Findings
1. **Data Source of Truth**:
   - `Member` model stores:
     - `membershipExpiration`: Date when gym access ends (30-day / 1-month cycle).
     - `trainingExpiration`: Date when personal training ends.
     - `expiration`: Legacy expiration date fallback.
     - `contactNumber`: Direct mobile phone number for retention calls.
     - `membershipStatus`: 'Active' | 'Inactive' | 'Pending'.
2. **Database Verification (May 2026 – September 2026)**:
   - **Total Members in Database**: 518.
   - Real, verified expiration records already exist in Firestore:
     - **May 2026**: 10 membership expirations, 7 personal training expirations.
     - **June 2026**: 5 membership expirations.
     - **July 2026**: 9 membership expirations, 2 personal training expirations.
     - **August 2026**: 19 membership expirations, 1 personal training expiration (e.g., Kevin Arcadio, Jerry Bagasala).
     - **September 2026**: 23 membership expirations, 3 personal training expirations (e.g., Bert Banico, Louie Borlagdan).
   - **Conclusion**: **No synthetic data generation is necessary**. The production database already has authentic records from May 2026 to present.
3. **Zero-Cost Firestore Architecture via Dexie.js**:
   - `MemberRepository` (`src/app/core/repositories/member.repository.ts`) **already caches all 518 members in Dexie IndexedDB**.
   - Querying members locally from Dexie costs **0 Firestore read operations** ($0.00).
   - In `ReportsDashboardComponent`, monthly results are cached by month key in reactive signals, preventing re-fetching when switching between daily/weekly/monthly tabs.

## 3. Proposed Architecture & Changes

### A. Data Contract & Service (`ReportsService`)
- Define `UnrenewedMember` interface:
  ```typescript
  export interface UnrenewedMember {
    memberId: string;
    memberName: string;
    contactNumber: string;
    type: 'MEMBERSHIP' | 'TRAINING' | 'BOTH';
    membershipExpiration?: Date | null;
    trainingExpiration?: Date | null;
    status: string;
    daysAgo: number;
  }
  ```
- Add `unrenewedSummary` to `MonthlyPerformanceResult`:
  ```typescript
  unrenewedSummary: {
    totalUnrenewed: number;
    membershipLapsedCount: number;
    trainingLapsedCount: number;
    members: UnrenewedMember[];
  };
  ```
- In `getMonthlyPerformance(year, month)`:
  - Inject `MemberRepository` and query local Dexie cache via `firstValueFrom(this.memberRepository.getMembersLive())`.
  - Filter members whose `membershipExpiration` or `trainingExpiration` falls within `[startDate, endDate]`.
  - Check if the member renewed beyond that date. If not, include in `unrenewedSummary.members` sorted by expiration date descending.

### B. UI Component & Design System Compliance (`reports-dashboard.html`, `.css`, `.ts`)
- **Card Placement**: In Monthly Tab, add a dedicated executive card:
  **"Retention & Lapsed Subscriptions (Did Not Renew)"**.
- **Metrics Bar**:
  - `Total Unrenewed`: Danger / Amber highlight badge.
  - `Membership Lapsed`: Cyan badge count.
  - `Training Lapsed`: Gold badge count.
- **Interactive Data Table / List**:
  - Columns: Member Name, Contact Number (clickable `tel:` or copy), Lapsed Type (`Subscription`, `Training`, or `Both`), Expiration Date, Days Lapsed, Action.
  - Filter controls: "All", "Membership Only", "Training Only".
  - Search box to find specific members by name/phone.
- **Token Compliance**: Strictly adhere to `DESIGN_SYSTEM_TOKENS.md` (`var(--color-...)`, WCAG 2.2 AAA contrast, zero arbitrary numbers).

## 4. Verification Plan
1. **Compilation**: Run `npm run build` to verify clean build without type errors.
2. **Monthly Cadence Inspection**:
   - Switch to **May 2026**: verify 17 unrenewed members.
   - Switch to **August 2026**: verify 20 unrenewed members (Kevin Arcadio, Khryztal Shane, etc.).
   - Switch to **September 2026**: verify 23 unrenewed members (Bert Banico, Louie Borlagdan, etc.).
3. **Firestore Cost Audit**: Confirm in browser network / Firestore console that opening monthly reports reads from local Dexie cache with 0 extra document read spikes.
