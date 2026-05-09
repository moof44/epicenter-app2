# Members Portal Redesign — Brainstorm & Design Document

> Date: April 27, 2026
> Status: BRAINSTORM — no code yet
> Scope: Full redesign of the members-portal from static landing page to functional member-facing application
> Target: https://epicenter-members-portal.web.app/

---

## 1. Current State

The members-portal is a static marketing landing page with zero functionality. It has:

- A hero section with gym logo, tagline, and a dead "Join Now" button
- A 12-card features grid (Free Wifi, Parking, etc.)
- A 3-card products section with dead "View Details" buttons
- Black and gold theme (Oswald + Inter fonts)
- Firebase Auth and Firestore configured but unused
- No navigation, no login, no member data

The portal shares the same Firebase project (`epicenter-app`) as the main gym-app but is deployed to a separate hosting target (`epicenter-members-portal`).

---

## 2. Vision

Transform the portal into a **dual-purpose application**:

- **Public landing page** (unauthenticated) — Marketing content for prospective members. Gym features, trainer profiles, schedule preview, pricing.
- **Member dashboard** (authenticated) — Personal hub for existing members. Membership status, progress tracking, attendance history, upcoming appointments.

The landing page attracts new members. The dashboard retains existing ones.

---

## 3. Authentication Design

### 3.1 Strategy: Phone Number as Fake Email

Members don't have email addresses in the system. They have `contactNumber` (phone), `name`, `address`, and `birthday`. The authentication approach:

- Firebase Auth email: `{contactNumber}@epicentergym.ph` (e.g., `09171234567@epicentergym.ph`)
- Initial password: the phone number itself (`09171234567`)
- The member logs in with their phone number and password. The portal appends `@epicentergym.ph` behind the scenes.
- The member never sees or types the email suffix.

**Phone number normalization**: Before creating the account or logging in, strip all non-digit characters and ensure the format is `09XXXXXXXXX` (11 digits). If the number starts with `+63`, replace with `0`. If it has dashes, spaces, or parentheses, strip them. This normalization runs both in the Cloud Function (account creation) and in the portal login form (before appending the email suffix).

**Duplicate phone numbers**: If two members share the same `contactNumber`, only the first one can get a portal account. The Cloud Function checks for existing Firebase Auth accounts with that email before creating. If a duplicate is found, it returns an error: "A portal account already exists for this phone number." Staff must resolve the duplicate in the member management system first.

**Phone number changes**: If staff updates a member's `contactNumber` in the gym-app, the portal login breaks (old phone as email, new phone entered by member). The gym-app should show a warning: "This member has a portal account. Changing their phone number will require a portal account update." A Cloud Function `updateMemberPortalEmail` updates the Firebase Auth email to match the new phone number.

### 3.2 Account Creation Flow

Account creation happens in the **main gym-app**, not the portal. Staff creates the portal account for a member:

1. Staff opens a member's profile in the gym-app
2. Clicks "Create Portal Account" button
3. A new Cloud Function `createMemberPortalAccount` executes:
   - Creates Firebase Auth user with email `{contactNumber}@epicentergym.ph` and password `{contactNumber}`
   - Sets custom claims: `{ roles: ['MEMBER'] }`
   - Creates/updates the `users/{uid}` Firestore document with `roles: ['MEMBER']`, `memberId` (link to `members/{id}`), `displayName`, `mustChangePassword: true`
   - Updates the `members/{id}` document with `portalUid: uid` (back-link for queries)
4. Staff tells the member: "Your login is your phone number. Your initial password is also your phone number. You'll be asked to change it on first login."

### 3.3 First Login & Password Change

1. Member opens the portal, enters phone number + password
2. Portal calls `signInWithEmailAndPassword` with `{phone}@epicentergym.ph`
3. On success, reads the user profile from `users/{uid}`
4. If `mustChangePassword === true`, redirects to a password change screen
5. Password change screen: "Welcome! Please set a new password." Two fields: new password, confirm password. Minimum 6 characters.
6. On submit: calls `updatePassword()` from Firebase Auth, then updates `users/{uid}.mustChangePassword = false`
7. Redirects to the member dashboard

### 3.4 Portal Auth Guard

The portal needs its own auth guard that:

- Checks Firebase Auth state (is the user logged in?)
- Checks `roles.includes('MEMBER')` — blocks staff accounts from accessing the portal
- Checks `mustChangePassword` — redirects to password change if true
- Checks `isActive !== false` — blocks deactivated accounts

### 3.5 Forgot Password

Since members don't have real emails, Firebase's built-in "forgot password" email flow won't work. Instead:

- Member visits the gym front desk
- Staff resets their password via the gym-app: clicks "Reset Portal Password" on the member profile
- Cloud Function resets the password back to the phone number and sets `mustChangePassword: true`
- Member logs in with phone number as password again, forced to change it

No self-service password reset in the portal MVP. This is a deliberate simplification.

### 3.6 Data Model Changes

**New fields on `members` collection:**

| Field | Type | Description |
| --- | --- | --- |
| `portalUid` | `string?` | Firebase Auth UID for the portal account. Null if no portal account exists. |

**New fields on `users` collection (for MEMBER role accounts):**

| Field | Type | Description |
| --- | --- | --- |
| `memberId` | `string?` | Reference to `members/{id}`. Only set for MEMBER role users. |
| `mustChangePassword` | `boolean?` | True on first login. Set to false after password change. |

**New Cloud Functions:**

| Function | Caller | Purpose |
| --- | --- | --- |
| `createMemberPortalAccount` | Staff (ADMIN/MANAGER/STAFF) | Creates Firebase Auth + users doc for a member |
| `resetMemberPortalPassword` | Staff (ADMIN/MANAGER/STAFF) | Resets password to phone number, sets mustChangePassword |
| `updateMemberPortalEmail` | Staff (ADMIN/MANAGER/STAFF) | Updates Firebase Auth email when member phone number changes |
| `toggleMemberPortalStatus` | Staff (ADMIN/MANAGER/STAFF) | Activates or deactivates a member's portal account (sets isActive + Auth disabled flag) |

### 3.7 Security Rules

The portal reads from the same Firestore as the gym-app. Security rules must ensure:

- A MEMBER can only read their own `members/{id}` document (where `id` matches their `memberId` in `users`)
- A MEMBER can only read their own `members/{id}/measurements` subcollection
- A MEMBER can only read `attendance` records where `memberId` matches their linked member ID
- A MEMBER can only read `appointments` where `clientMemberIds` array-contains their member ID
- A MEMBER cannot write to any collection (staff-managed)
- A MEMBER cannot read `transactions`, `shifts`, `products`, `inventory_logs`, `daily_sales`, `settings`, or other members' data

---

## 4. Portal Pages & Navigation

### 4.1 Page Map

| Page | Route | Auth Required | Description |
| --- | --- | --- | --- |
| Landing / Home | `/` | No | Marketing page for visitors |
| Login | `/login` | No | Phone number + password |
| Change Password | `/change-password` | Yes (first login) | Forced password change |
| Dashboard | `/dashboard` | Yes | Member's personal hub |
| My Progress | `/progress` | Yes | Measurement history + charts |
| My Attendance | `/attendance` | Yes | Visit history + streak |
| My Appointments | `/appointments` | Yes | Upcoming + past sessions |
| My Profile | `/profile` | Yes | Personal info (read-only) |

### 4.2 Navigation Design

**Desktop (1200px+):**

- Sticky header: Logo (left), nav links center (Home, Trainers, Schedule, Products — for public pages), Login/Avatar button (right)
- When authenticated: nav links change to (Dashboard, Progress, Attendance, Appointments, Profile), Avatar dropdown with Logout
- Header is transparent over the hero section, transitions to solid `#121212` on scroll

**Tablet (600-1199px):**

- Sticky header: Logo (left), hamburger menu (right)
- Hamburger opens a slide-out panel with all nav links
- When authenticated: same panel but with member-specific links

**Mobile (below 600px):**

- Minimal header: Logo centered, hamburger (left), Login icon (right)
- When authenticated: **bottom tab bar** replaces the header nav. 5 tabs: Home, Progress, Attendance, Appointments, Profile. This is the primary navigation — thumb-friendly, always visible.
- The header simplifies to just the logo and a settings/logout icon

The bottom tab bar is critical for mobile. Members will use this on their phones 90% of the time. Every major section must be one tap away.

---

## 5. Landing Page Design (Unauthenticated)

### 5.1 Sections (Top to Bottom)

**Hero Section**

- Full-viewport height on desktop, 70vh on mobile
- Background: gym interior photo with dark gradient overlay (bottom heavier for text readability)
- Content: Logo (120px on mobile, 150px on desktop), "EPICENTER" heading with gold gradient, tagline "Premium Fitness. Science Based. Results Driven.", two CTAs: "Join Now" (gold filled) + "Member Login" (gold outline)
- Mobile: stack CTAs vertically, reduce heading to 2rem
- Subtle scroll indicator (animated chevron) at the bottom

**About / Stats Bar**

- Horizontal strip with key numbers: "500+ Members", "5 Certified Trainers", "Open 8AM-10PM Daily", "Est. 2020"
- Dark background with gold text/numbers
- Mobile: 2×2 grid instead of horizontal row

**Features Section**

- Grouped into 3 categories instead of a flat 12-card grid:
  - "Facilities" — Spacious, Parking, Locker Rooms, 24/7 CCTV
  - "Training" — Certified Coaches, Boxing Area, Cardio Zone, Science Based
  - "Perks" — Free Wifi, Low Fees, Monthly Assessment, Duplicate Equipment
- Desktop: 3 columns, each category is a card with icon list
- Tablet: 3 columns, same layout
- Mobile: vertical stack, each category is a collapsible accordion or a horizontal scroll row

**Trainers Section**

- Heading: "Meet Our Coaches"
- Trainer cards: photo (square, 1:1 aspect ratio), name, specialization tagline
- Desktop: 3-4 column grid
- Tablet: 2 column grid
- Mobile: horizontal scroll carousel (one card visible at a time, swipe to see more)
- Data source: reads from `users` collection where `roles` includes `TRAINER` and `isActive !== false`. Only `displayName` and `photoURL` are shown publicly. No sensitive data.

**Schedule Preview**

- Heading: "Training Schedule"
- Simplified weekly grid showing available session slots
- "View Full Schedule" button links to `/login` (or `/appointments` if authenticated)
- Data source: reads from `appointments` collection, CONFIRMED status only, future dates only
- This section is Phase 2 — placeholder with "Coming Soon" for MVP

**Products Section**

- Keep the 3 product cards (Personal Training, Boxing, Consumables) but redesign:
- Desktop: 3 columns with larger images (16:9 aspect ratio)
- Mobile: full-width stacked cards with horizontal image
- "View Details" expands the card to show more info (no separate page needed)

**Footer**

- 3 columns on desktop, stacked on mobile:
  - Column 1: Logo + tagline + social media icons
  - Column 2: Quick links (Home, Trainers, Products, Member Login)
  - Column 3: Contact info (address, phone, operating hours)
- Bottom bar: "© 2026 Epicenter Gym. All rights reserved."
- Background: `#0a0a0a` (slightly lighter than pure black for visual separation)

### 5.2 Color Palette

Keep the black and gold theme but formalize it:

```text
--bg-primary: #000000          (hero, main background)
--bg-surface: #121212          (cards, elevated surfaces)
--bg-surface-alt: #1a1a1a     (secondary cards, inputs)
--bg-footer: #0a0a0a          (footer)

--gold-primary: #D4AF37        (primary accent, CTAs, headings)
--gold-light: #FFD700          (hover states, highlights)
--gold-dark: #B8860B           (gradient end, pressed states)
--gold-dim: rgba(212,175,55,0.3)  (borders, subtle accents)

--text-primary: #FFFFFF        (headings, primary text)
--text-secondary: #B0B0B0     (body text, descriptions)
--text-muted: #666666          (captions, timestamps)

--success: #4CAF50             (active status, positive changes)
--warning: #FF9800             (expiring soon)
--error: #F44336               (expired, errors)
```

### 5.3 Typography

```text
Headings: 'Oswald', sans-serif (uppercase, letter-spacing: 1-2px)
Body: 'Inter', sans-serif (regular weight, 1.6 line-height)

Scale (mobile / tablet / desktop):
  Hero h1:     2rem / 2.5rem / 3.5rem
  Section h2:  1.5rem / 2rem / 2.5rem
  Card h3:     1.1rem / 1.2rem / 1.4rem
  Body:        0.9rem / 1rem / 1rem
  Caption:     0.75rem / 0.8rem / 0.85rem
```

---

## 6. Member Dashboard Design (Authenticated)

### 6.1 Dashboard Home (`/dashboard`)

The first thing a member sees after login. A personalized summary of their gym life.

**Desktop layout:** Two-column grid. Left column (wider): status cards + progress chart. Right column (narrower): upcoming appointments + attendance streak.

**Tablet layout:** Single column, cards stacked vertically.

**Mobile layout:** Single column, cards stacked. Bottom tab bar visible.

**Cards on the dashboard:**

1. **Welcome Card** — "Good morning, Juan!" with member name and a motivational quote that rotates daily.

2. **Membership Status Card** — The most important card. Shows:
   - Status badge: "Active" (green) or "Expiring Soon" (amber, within 7 days) or "Expired" (red)
   - Expiration date: "Expires April 30, 2026" or "Expired 3 days ago"
   - Days remaining: "12 days left" as a countdown
   - Training package status (same format, separate line)
   - CTA if expired: "Visit the front desk to renew"

3. **Progress Snapshot Card** — Latest measurement vs previous:
   - Weight: "72.5 kg" with diff "+0.5 kg" (red for weight gain) or "-1.2 kg" (green for loss)
   - Body Fat: "18.2%" with diff
   - Muscle Mass: "42.1%" with diff
   - "View Full Progress" link to `/progress`
   - If no measurements: "No measurements yet. Ask your trainer for a body composition assessment."

4. **Attendance Streak Card** — Gamification element:
   - Current streak: "5-day streak!" with a fire emoji
   - This month's visits: "18 visits in April"
   - Calendar heatmap (small, last 30 days) — darker cells = visited
   - "View History" link to `/attendance`

5. **Upcoming Appointments Card** — Next training session:
   - "Tomorrow at 10:00 AM with Coach Mike"
   - Or "No upcoming sessions" with "Book a Session" link (Phase 2)
   - Shows max 2 upcoming appointments

### 6.2 My Progress (`/progress`)

- **Chart**: Line chart showing weight and body fat percentage over time (last 10 measurements). Use a lightweight chart library or CSS-only sparklines for MVP.
- **History table**: All measurements in reverse chronological order. Each row shows date, weight, body fat, muscle mass, BMI. Tap a row to expand and see all 18 fields.
- **Mobile**: Chart on top, scrollable table below. Table switches to card view on mobile (same pattern as gym-app attendance history).
- **Data source**: `members/{memberId}/measurements` ordered by date desc, limit 50.
- **Empty state**: "No measurements recorded yet. Visit the gym for your first body composition assessment!"

### 6.3 My Attendance (`/attendance`)

- **Calendar heatmap**: Full month view. Each day cell is colored by visit count (0 = empty, 1+ = gold shade). Tap a day to see check-in/check-out times.
- **Stats bar**: "Total visits this month: 18", "Average per week: 4.5", "Longest streak: 12 days"
- **History list**: Scrollable list of recent visits with date, check-in time, check-out time, duration.
- **Data source**: `attendance` where `memberId == currentMemberId`, ordered by `checkInTime` desc.
- **Empty state**: "No visits recorded yet. Come work out!"

### 6.4 My Appointments (`/appointments`)

- **Upcoming section**: List of future CONFIRMED appointments. Each card shows: date, time, trainer name, session type, duration.
- **Past section**: Collapsible list of completed/no-show appointments. Shows session notes if the trainer added them.
- **Book a Session** button (Phase 2 — disabled or hidden for MVP): Opens a booking form that creates a PENDING appointment.
- **Data source**: `appointments` where `clientMemberIds` array-contains `currentMemberId`.
- **Empty state**: "No appointments scheduled. Ask the front desk to book a training session!"

### 6.5 My Profile (`/profile`)

- **Read-only** display of member information:
  - Name, phone number, address, gender, birthday
  - Membership status + expiration
  - Training status + expiration
  - Goal
- **No edit capability** — "To update your information, please visit the front desk."
- **Change Password** button at the bottom
- **Logout** button
- **Data source**: `members/{memberId}` (linked via `users/{uid}.memberId`)

---

## 7. Responsive Breakpoints

| Breakpoint | Target | Layout Strategy |
| --- | --- | --- |
| Below 600px | Mobile phones | Single column, bottom tab bar, full-screen pages, large touch targets (48px min), no hover effects |
| 600-1199px | Tablets | Single column with wider cards, hamburger nav, bottom sheets for details |
| 1200px+ | Desktop | Multi-column layouts, sticky sidebar on dashboard, hover effects, side panels |

### 7.1 Mobile-Specific Patterns

- Bottom tab bar: 5 icons (Home, Progress, Attendance, Appointments, Profile) with labels. Active tab highlighted in gold. 56px height.
- Pull-to-refresh on dashboard and list pages
- Swipe gestures: swipe between tabs (optional, Phase 2)
- No modals or dialogs — use full-screen pages or bottom sheets
- Font sizes reduced by ~10% from desktop
- Card padding: 16px (vs 24px on desktop)
- Touch targets: minimum 48px height on all interactive elements

### 7.2 Tablet-Specific Patterns

- Hamburger menu instead of full nav bar
- Cards can be wider (max-width: 600px, centered)
- Charts render at full width
- Bottom sheets for appointment details

### 7.3 Desktop-Specific Patterns

- Full horizontal nav bar with all links visible
- Dashboard uses 2-column grid
- Progress page: chart and table side by side
- Hover effects on cards (subtle lift + gold border glow)
- Sticky header with scroll-triggered background transition

---

## 8. Firestore Read Patterns & Billing

All portal reads are **one-time** (`getDocs`) unless specified. No real-time listeners for the portal — members don't need live updates.

| Page | Query | Docs Read | Frequency |
| --- | --- | --- | --- |
| Landing (trainers) | `users` where `roles` contains TRAINER, `isActive !== false` | 3-5 | Per page load |
| Dashboard (member) | `members/{id}` | 1 | Per login |
| Dashboard (latest measurements) | `measurements` order by date desc, limit 2 | 2 | Per dashboard load |
| Dashboard (appointments) | `appointments` where `clientMemberIds` contains memberId, future dates, limit 5 | 0-5 | Per dashboard load |
| Progress | `measurements` order by date desc, limit 50 | 0-50 | Per page visit |
| Attendance | `attendance` where `memberId`, limit 100 | 0-100 | Per page visit |
| Appointments | `appointments` where `clientMemberIds`, limit 20 | 0-20 | Per page visit |
| Profile | `members/{id}` | 1 (cached from dashboard) | Per page visit |

**Estimated reads per member session**: ~80-180 reads. At Firestore pricing ($0.06 per 100K reads), 100 members visiting daily = 18K reads/day = negligible cost.

**Key cost control**: No real-time listeners. Every query is a one-time `getDocs`. The portal is read-only — zero writes (except password change which goes through Firebase Auth, not Firestore).

**Required composite indexes** (add to `firestore.indexes.json`):

- `attendance`: `memberId` (ASC) + `checkInTime` (DESC) — for member attendance history
- `appointments`: `clientMemberIds` (array-contains) + `startTime` (DESC) — for member appointment history

**Session persistence**: The portal uses `browserLocalPersistence` — members stay logged in across browser sessions. They don't want to re-enter their password every time they open the portal on their phone.

---

## 9. Phased Rollout

| Phase | Scope | Effort |
| --- | --- | --- |
| **Phase 1 — Foundation** | Landing page redesign (hero, features, footer, responsive nav), login screen, password change, portal auth guard, Cloud Functions for account creation/reset | Large |
| **Phase 2 — Dashboard** | Member dashboard (status card, progress snapshot, attendance streak, upcoming appointments), profile page | Medium |
| **Phase 3 — Detail Pages** | Full progress page with charts, attendance history with calendar heatmap, appointments list | Medium |
| **Phase 4 — Booking** | Appointment booking from portal (creates PENDING), trainer profiles page, schedule preview on landing page | Medium |
| **Phase 5 — Polish** | Animations, pull-to-refresh, offline support, PWA manifest, push notifications | Medium |

---

## 10. Technical Considerations

### 10.1 No Angular Material

The portal does NOT use Angular Material. It has its own custom design system (black/gold theme). This is intentional — the portal should look and feel completely different from the staff app. Using Material would make it look like an admin tool, not a member-facing product.

For UI components, use:
- Custom CSS components (buttons, cards, inputs)
- CDK (Angular CDK) for accessibility, overlays, and layout utilities — no visual styling, just behavior
- A lightweight chart library for progress charts (e.g., lightweight-charts, Chart.js, or CSS-only sparklines)

### 10.2 Shared Firebase, Separate Auth Context

Both apps use the same Firebase project. A member logging into the portal and a staff member logging into the gym-app use the same `users` collection. The `roles` field distinguishes them:

- Staff: `roles: ['ADMIN']` or `['MANAGER']` or `['STAFF']` or `['TRAINER']`
- Member: `roles: ['MEMBER']`

The portal's auth guard checks for `MEMBER` role. The gym-app's auth guard checks for staff roles. A member cannot access the gym-app. A staff member cannot access the portal dashboard (they'd fail the MEMBER role check).

### 10.3 Member-to-User Linking

The critical link between the `members` collection (gym data) and the `users` collection (auth data):

```text
members/{memberId}
├── portalUid: string    → links to users/{uid}

users/{uid}
├── memberId: string     → links to members/{memberId}
├── roles: ['MEMBER']
```

When the portal loads the dashboard, it:
1. Gets the Firebase Auth UID from `authState`
2. Reads `users/{uid}` to get `memberId`
3. Reads `members/{memberId}` to get the member's gym data
4. Uses `memberId` for all subsequent queries (measurements, attendance, appointments)

### 10.4 Image Assets

Placeholder images needed (to be replaced with real photos):

| Asset | Dimensions | Purpose |
| --- | --- | --- |
| `hero.png` | 1920×1080 | Landing page hero background |
| `logo.png` | 512×512 (transparent) | Logo (already exists) |
| `trainer-{n}.jpg` | 400×400 (square) | Trainer profile photos |
| `feature-facilities.jpg` | 800×400 | Features section background |
| `feature-training.jpg` | 800×400 | Features section background |
| `og-image.jpg` | 1200×630 | Social media share preview |

### 10.5 SEO & Meta Tags

The landing page should have proper meta tags for social sharing:

```html
<meta name="description" content="Epicenter Gym — Premium Fitness. Science Based. Results Driven.">
<meta property="og:title" content="Epicenter Gym">
<meta property="og:description" content="Premium Fitness. Science Based. Results Driven.">
<meta property="og:image" content="https://epicenter-members-portal.web.app/assets/og-image.jpg">
<meta property="og:url" content="https://epicenter-members-portal.web.app/">
```

### 10.6 Gym-App Side Changes (Main App)

The portal requires changes in the main gym-app to support account management:

**Member edit form** (`/members/edit/:id`) — Add a "Portal Access" card at the bottom of the form:

Portal Access card displays:

- **Account status badge**:
  - "No Account" (gray) — `portalUid` is null. Show "Create Portal Account" button.
  - "Password Not Changed" (amber) — `portalUid` exists AND `mustChangePassword === true`. Member hasn't logged in yet or password was just reset.
  - "Active" (green) — `portalUid` exists AND `mustChangePassword === false`. Member has set their own password and is using the portal.
  - "Deactivated" (red) — portal user's `isActive === false`.
- **Login phone number**: Shows the member's `contactNumber` with a label "Portal Login: 09171234567". Makes it explicit what the member types to log in.
- **Password status**: "Default password (not yet changed)" or "Custom password (set by member)". Derived from `mustChangePassword` flag. Staff CANNOT see the actual password — Firebase Auth hashes passwords. When reset, staff knows it's the phone number because the Cloud Function sets it to that.
- **Action buttons**:
  - "Create Portal Account" — visible when no account exists. Calls `createMemberPortalAccount`.
  - "Reset Password" — visible when account exists. Resets password to phone number, sets `mustChangePassword: true`. Shows confirmation dialog: "This will reset the member's portal password to their phone number. They'll be asked to change it on next login."
  - "Deactivate Portal" / "Reactivate Portal" — toggle the portal account's `isActive` flag without deleting it. Uses the same pattern as `toggleStaffStatus`.

**Phone number auto-sync**: When staff saves the member form with a changed `contactNumber` and `portalUid` exists, the save handler automatically calls `updateMemberPortalEmail` to update the Firebase Auth email. No manual step needed. A snackbar confirms: "Portal login updated to new phone number."

**Member list** — Add a small portal icon (e.g., a globe or phone icon) next to members who have `portalUid` set. Low priority — Phase 2 of the portal work.

These gym-app changes are part of Portal Phase 1 since they're required for the portal to function.

---

## 11. Decisions Made

| Question | Decision | Rationale |
| --- | --- | --- |
| Authentication method | Phone number as fake email (`{phone}@epicentergym.ph`) | Members don't have emails. Phone is the only unique identifier. Firebase Auth requires email format. |
| Initial password | Phone number itself | Simple for staff to communicate. Forced change on first login. |
| Password reset | Staff-managed (no self-service) | No real email for reset flow. Members visit front desk. |
| Self-service editing | Read-only profile | Staff manages all data. Prevents data integrity issues. |
| UI framework | Custom CSS (no Angular Material) | Portal must look different from staff app. Material looks like an admin tool. |
| Real-time listeners | None — all one-time reads | Members don't need live updates. Saves Firestore costs. |
| Appointment booking | Phase 4 (view-only for MVP) | Booking requires the calendar Phase 4 integration. |
| Dark/light mode | Dark only for MVP | Matches gym branding. Light mode is Phase 5. |

---

## 12. Open Questions

None — all questions from the initial discussion have been resolved. The document is ready for execution planning.
