# Automated Member Portal Account Creation Specification

## 📌 Overview
This document specifies the automated provisioning of Member Portal accounts whenever a new member is registered in Epicenter Gym. It eliminates the manual "Create Portal Account" step, ensuring that every member can instantly access the Members Portal upon registration.

---

## 🔐 Credentials & Authentication Standard

Each member portal account adheres to the following system-wide conventions:

1. **Authentication Email / Username**:
   - Normalized 11-digit mobile phone number: `<clean-11-digit-phone>@epicentergym.ph`
   - Example: `09171234567@epicentergym.ph`
   - Sanitization rules:
     - Strips all non-digit characters (`(`, `)`, `-`, spaces).
     - Replaces leading country code `63` or `+63` with `0`.
     - Ensures an 11-digit standard format (`09XXXXXXXXX`).

2. **Default Password / PIN**:
   - 8-digit birthdate PIN (`MMDDYYYY`) evaluated in Philippine Standard Time (GMT+8 / `Asia/Manila`):
     - Example: Dec 25, 1995 -> `12251995`.
   - Protects against UTC date shift by applying a +8 hour offset before extracting month, day, and year.

3. **Roles & Permissions**:
   - Custom claims: `{ roles: ['MEMBER'] }`
   - Firestore User Document: `users/{portalUid}` with `{ roles: ['MEMBER'], memberId, email, displayName, isActive: true }`.

4. **Member Document Backlink**:
   - `members/{memberId}` updated with:
     - `portalUid: string`
     - `portalStatus: 'Active'`

---

## ⚡ Cloud Functions Architecture

### 1. `provisionMemberPortalAccount(memberId, memberData)` (Core Shared Helper)
- Validates contact number and birthdate.
- Checks if Firebase Auth user already exists:
  - If existing: links `portalUid` and ensures `users/{portalUid}` document is up to date.
  - If new: creates Auth user with `MMDDYYYY` password, sets `MEMBER` custom claims, creates `users/{portalUid}` profile, and updates `members/{memberId}`.

### 2. `onMemberCreatedAutoPortal` (Firestore `onCreate` Trigger)
- Listens to: `/members/{memberId}`
- Triggered whenever a member record is created via Gym App, Kiosk, or batch scripts.
- Automatically calls `provisionMemberPortalAccount(memberId, memberData)`.

### 3. `onMemberUpdatedAutoPortal` (Firestore `onUpdate` Trigger)
- Listens to: `/members/{memberId}`
- Detects if a member previously lacked phone/birthdate (or had `portalStatus !== 'Active'`) and now has both fields populated.
- Automatically provisions the portal account.

### 4. `createMemberPortalAccount` (Callable Function - Preserved)
- Preserved for manual trigger from staff UI if needed for retries or instant synchronization.

---

## 🧪 Verification Plan

### Automated Build
- `npm --prefix functions run build` (Cloud Functions TypeScript compilation).
- `npm run build && npm run build:members` (Angular workspaces compilation).

### Deployment
- Deploy via `firebase deploy --only functions`.
