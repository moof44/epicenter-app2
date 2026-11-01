# Implementation Plan: Fix NG02100 in /profile (DatePipe Firestore Timestamp Exception)

## 1. Problem Diagnosis
- **Error**: `NG02100: InvalidPipeArgument: '[object Object]' for pipe 'DatePipe'`
- **Page URL**: `/profile`
- **User**: Kris Ragam Manuel (`LRkcyxQlSIThsFOPZVzB4Gbxx9v1`), Staff
- **Trace Analysis**:
  - The stack trace points directly to `chunk-W72ARPXH.js` (`UserProfileComponent`) at line 479 of `user-profile.html`:
    ```html
    <span>{{ doc.fileType }} · {{ doc.uploadedAt | date:'mediumDate' }}</span>
    ```
  - When employee documents are uploaded or saved into Firestore, `uploadedAt` is stored as a Firestore `Timestamp` object (`{ seconds: ..., nanoseconds: ... }`).
  - When Angular's `DatePipe` receives a raw Firestore Timestamp object (instead of a JavaScript `Date`, timestamp number, or ISO string), it throws `NG02100` and crashes change detection in the template.
  - Additionally, other date fields in the template (`currentUser()?.birthDate`, `currentUser()?.employmentDetails?.hireDate`, `p.billingPeriodStart`, `p.billingPeriodEnd`, `p.paidDate`, and `cp.paidDate`) can also be passed as Firestore Timestamps or strings from Firestore.
  - In `payslip-view-dialog.html`, payslip dates (`payslip.paidDate`, `payslip.billingPeriodStart`, `payslip.billingPeriodEnd`) are also bound directly to `| date`.

## 2. Proposed Changes
1. **[src/app/features/profile/pages/user-profile/user-profile.ts](file:///e:/Programming/epicenter-app2/src/app/features/profile/pages/user-profile/user-profile.ts)**:
   - Import `safeToDate` from `../../../../core/utils/date.utils`.
   - Add a template helper `formatDate(val: any): Date | null`:
     ```typescript
     formatDate(val: any): Date | null {
       if (!val) return null;
       return safeToDate(val);
     }
     ```
2. **[src/app/features/profile/pages/user-profile/user-profile.html](file:///e:/Programming/epicenter-app2/src/app/features/profile/pages/user-profile/user-profile.html)**:
   - Update line 104:
     `{{ (formatDate(currentUser()?.birthDate) | date:'mediumDate') || 'Not Set' }}`
   - Update line 208:
     `{{ (formatDate(currentUser()?.employmentDetails?.hireDate) | date:'mediumDate') || 'Not Set' }}`
   - Update line 479:
     `<span>{{ doc.fileType }} · {{ formatDate(doc.uploadedAt) | date:'mediumDate' }}</span>`
   - Update line 537 & 538:
     `Period: <strong>{{ formatDate(p.billingPeriodStart) | date:'mediumDate' }}</strong> – <strong>{{ formatDate(p.billingPeriodEnd) | date:'mediumDate' }}</strong>`
     `Paid on {{ formatDate(p.paidDate) | date:'mediumDate' }} via ...`
   - Update line 600:
     `Disbursed on {{ formatDate(cp.paidDate) | date:'mediumDate' }} via ...`

3. **[src/app/features/profile/components/payslip-view-dialog/payslip-view-dialog.ts](file:///e:/Programming/epicenter-app2/src/app/features/profile/components/payslip-view-dialog/payslip-view-dialog.ts)** & **[.html](file:///e:/Programming/epicenter-app2/src/app/features/profile/components/payslip-view-dialog/payslip-view-dialog.html)**:
   - Add `formatDate` helper using `safeToDate`.
   - Wrap `payslip.paidDate`, `payslip.billingPeriodStart`, and `payslip.billingPeriodEnd` in `formatDate(...)` before pipe.

## 3. Verification & Safety Audit
- Protect working functionality: Existing logic for forms, documents, payslips remains 100% intact.
- Compilation checks: `npm run build` (`gym-app`) and `npm run build:members` (`members-portal`).
- Verify no errors in change detection or date rendering.
- Update `docs/ai-session-context/ACTIVE_CONTEXT.md` and `docs/ai-session-context/SESSION_LOG.md`.
- Commit with conventional commit message.
