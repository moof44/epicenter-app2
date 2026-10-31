# Proposal (v2): Customer Care & Call Center Department Module (`/customer-care`)

> **Status**: Proposal v2 (Updated with Taglish Scripts, Priority Queue, Manager Campaign Remarks, PT/Training Expiration Filters & Strict 4-Screen Design Safeguards)  
> **Target Application**: `gym-app` (Staff & Admin Platform)  
> **Date**: November 1, 2026  

---

## 1. Executive Vision & Core Concept

To boost member retention, membership/PT renewals, nutrition/goal adherence, and promo sales, we will build a dedicated **Customer Care & Call Center Workspace** (`/customer-care`) inside `gym-app`.

How the workflow operates:
1. **Managers / Admins (or AI)** generate a targeted **Call Campaign (List)** using 1-click presets or wildcard filters (including **Membership Expiration** and **Personal Training Expiration**).
2. Each campaign includes:
   - **Manager's Campaign Briefing / Remarks**: High-level instructions at the top of the campaign so staff know the exact purpose and strategy of the list.
   - **Taglish SMS & Call Script Templates**: Pre-written by a Call Center Specialist in warm, natural Taglish (with `{firstName}`, `{goal}`, `{expirationDate}` auto-placeholders) and **100% editable by Admin/Manager**.
   - **Admin Priority Marking (`🔥 High Priority` / `⚡ Normal` / `💤 Low`)**: Lists are **sorted by Priority by default** so high-value or urgent members are always contacted first.
3. **Customer Care Staff** open the campaign on Mobile, Tablet, or Desktop, read the Manager's Briefing, tap **Call** or **Text**, and log the outcome status + story in 2 taps.
4. **AI & Management** can analyze the results in plain English and generate follow-up lists (`Attempt 2`, `Attempt 3`) in one click.

---

## 2. Master Campaign Catalog & Call Center Specialist Taglish Scripts (Editable by Admin/Manager)

Below are the **10 Built-in Campaign Types** with ready-to-use **Taglish SMS Templates** and **Taglish Call Scripts**.  
*(Note: When creating or editing any campaign, the Admin/Manager can freely customize both scripts in a simple text box, and placeholders like `{firstName}`, `{goal}`, `{expirationDate}`, and `{trainingExpirationDate}` are automatically filled in for each member!)*

### A. `EXPIRING_SOON` — Expiring Gym Membership (1–7 Days Before Expiry)
- **Target**: Active members whose `membershipExpiration` is within the next 1–7 days.
- **📱 Suggested Taglish SMS**:
  > *"Hi {firstName}! 👋 Friendly reminder lang po from Epicenter Gym na mag-e-expire na ang gym membership mo on {expirationDate}. Sayang naman ang momentum mo para sa iyong {goal} goal! Daang ka lang sa front desk anytime this week para makapag-renew. See you sa gym! 💪"*
- **📞 Suggested Taglish Call Script**:
  > *"Hello {firstName}, good day! Si {staffName} po ito from Epicenter Gym. Kumusta po ang workouts natin? Tumawag lang po ako for a quick heads-up na mag-e-expire na po ang membership niyo this {expirationDate}. Para tuloy-tuloy po ang progress niyo sa {goal}, gusto niyo po bang i-reserve na namin ang renewal niyo pag-visit niyo this week?"*

### B. `RECENTLY_EXPIRED` — Recently Expired Membership (1–30 Days Expired)
- **Target**: Members whose `membershipExpiration` lapsed within the last 1–30 days.
- **📱 Suggested Taglish SMS**:
  > *"Hi {firstName}! Na-miss ka na namin dito sa Epicenter Gym! 😊 Napansin namin na nag-expire na ang membership mo last {expirationDate}. Wag nating sayangin yung nasimulan mong progress para sa {goal} mo! Balik ka na this week—ready kami tulungan ka ulit. Reply ka lang here if may questions ka! 💪"*
- **📞 Suggested Taglish Call Script**:
  > *"Hi {firstName}, good day! Si {staffName} po from Epicenter Gym. Nangangamusta lang po kami kasi napansin namin na nag-expire na po yung membership niyo last {expirationDate}. Kumusta po kayo? Busy po ba sa work/school lately? Sayang po kasi yung nasimulan ninyong momentum para sa {goal}—kailan po kayo ulit makakadaan para ma-assist namin kayo sa pag-continue ng program niyo?"*

### C. `LOW_ATTENDANCE` — Active Member with Low Attendance (Goal & Motivation Check)
- **Target**: Active members who have `≤ 2 check-ins` in the last 14–30 days.
- **📱 Suggested Taglish SMS**:
  > *"Hi {firstName}! 👋 Kumusta ka na? Checking in lang kami from Epicenter Gym! Napansin namin na medyo matagal ka nang hindi nakakapag-check in since {lastCheckInDate}. Active pa ang membership mo at nandito lang ang team para tulungan ka sa {goal} goal mo. See you sa gym this week! 🔥"*
- **📞 Suggested Taglish Call Script**:
  > *"Hello {firstName}! Si {staffName} po ito from Epicenter Gym. Nangangamusta lang po kami! Active pa po kasi ang membership niyo pero napansin namin na last visit niyo pa po ay noong {lastCheckInDate}. Okay lang po ba kayo, or may kailangan po ba kayong adjustment sa workout routine niyo para sa {goal}? Gusto po naming masulit niyo ang membership niyo—kailan po kayo makakapag-workout ulit?"*

### D. `LONG_EXPIRED` — Long Expired Win-Back (> 30 Days Lapsed)
- **Target**: Former members whose membership expired more than 30 days ago.
- **📱 Suggested Taglish SMS**:
  > *"Hi {firstName}! Kumusta? Matagal-tagal ka na naming hindi nakikita dito sa Epicenter Gym! 🏋️‍♂️ Kung ready ka nang mag-restart sa iyong {goal} journey, welcome na welcome ka bumalik anytime. Message mo lang kami kung gusto mong malaman ang latest promos namin for returning members!"*
- **📞 Suggested Taglish Call Script**:
  > *"Hi {firstName}, good day! Si {staffName} po from Epicenter Gym. Kumusta na po kayo? Na-miss na po namin kayo dito sa gym since {expirationDate}! Tumawag lang po ako to check kung nagwo-workout pa rin kayo or kung gusto niyo na pong mag-restart sa fitness goal niyo na {goal}. May bago po kaming offers ngayon—baka gusto niyo pong dumaan this week para makita niyo ulit ang gym?"*

### E. `PT_ACTIVE_NUTRITION` — Enrolled Personal Training: Nutrition & Goal Coaching *(New!)*
- **Target**: Members with **Active Personal Training** (`trainingExpiration >= today`). Ideal for Owner/Coach/Care outreach regarding nutrition, hydration, recovery, and goal check-ins.
- **📱 Suggested Taglish SMS**:
  > *"Hi {firstName}! 💪 Quick nutrition & progress check-in lang for your Personal Training program here at Epicenter Gym! Kumusta ang kain at protein intake natin this week para sa iyong {goal} goal? Remember, 70% ng results ay galing sa nutrition + proper sleep. Reply ka lang here kung kailangan mo ng tips sa meal prep mo!"*
- **📞 Suggested Taglish Call Script**:
  > *"Hello {firstName}! Si {staffName} po ito from Epicenter Gym. Since enrolled ka sa Personal Training natin until {trainingExpirationDate}, gusto lang po kitang kamustahin personally tungkol sa nutrition at diet mo outside the gym. Kumusta po ang meal choices at water intake natin lately? Gusto naming siguraduhin na sabay ang workout at tamang nutrition mo para mabilis nating ma-hit ang {goal} goal mo!"*

### F. `PT_EXPIRING_OR_EXPIRED` — Personal Training Renewal / Follow-Up *(New!)*
- **Target**: Members whose **Training Expiration** (`trainingExpiration`) is expiring within 7 days or recently expired.
- **📱 Suggested Taglish SMS**:
  > *"Hi {firstName}! 👋 Heads-up lang po from Epicenter Gym na ang Personal Training package mo ay valid until {trainingExpirationDate}. Ang ganda na ng progress mo sa {goal}! Let us know kung gusto mo nang i-renew ang PT sessions mo para tuloy-tuloy ang guidance ng coach mo. 💪"*
- **📞 Suggested Taglish Call Script**:
  > *"Hi {firstName}, good day! Si {staffName} po from Epicenter Gym. Tumawag lang po ako regarding your Personal Training program na mag-e-end/nag-end on {trainingExpirationDate}. Kumusta po ang experience niyo with your training so far? Para hindi po maputol yung guided workouts at accountability niyo para sa {goal}, i-schedule na po ba natin ang renewal ng PT sessions niyo?"*

### G. `PROMOTION` — Targeted Promo / Offer Pitch
- **Target**: Custom filtered segment (e.g., loyal members, active members without PT, birthday month, etc.).
- **📱 Suggested Taglish SMS**:
  > *"Hi {firstName}! 🎉 Special heads-up from Epicenter Gym! Meron kaming ongoing promo ngayon na bagay na bagay para sa {goal} goal mo. Limited slots lang ito—daan ka sa front desk or reply here para ma-reserve namin ang slot mo!"*
- **📞 Suggested Taglish Call Script**:
  > *"Hello {firstName}! Si {staffName} po from Epicenter Gym. Isa po kayo sa napili naming tawagan today dahil meron po kaming special promo na makakatulong sa {goal} goal niyo. May 1 minute po ba kayo para ma-share ko yung details?"*

### H. `FEEDBACK` — Member Experience & Feedback Survey
- **Target**: Any selected group of active or expired members.
- **📱 Suggested Taglish SMS**:
  > *"Hi {firstName}! 💙 Dito sa Epicenter Gym, gusto naming laging mapaganda ang workout experience mo. Kumusta ang gym equipment, cleanliness, at staff service natin lately? Reply ka lang ng iyong feedback or suggestions—super ma-a-appreciate namin!"*
- **📞 Suggested Taglish Call Script**:
  > *"Hello {firstName}, good day! Si {staffName} po from Epicenter Gym. Hindi po ito sales call—tumawag lang po kami para manghingi ng quick feedback tungkol sa experience niyo sa gym. Kumusta po ang facilities at service namin? May ma-su-suggest po ba kayo na pwede naming i-improve para mas maging maganda ang workouts niyo?"*

### I. `CONCERNS` — General Concerns / Operational Follow-Up
- **Target**: Hand-picked or filtered members (e.g., pending body scan review, left item, account update).
- **📱 Suggested Taglish SMS**:
  > *"Hi {firstName}! Good day from Epicenter Gym. May quick update/follow-up lang po kami regarding your gym profile. Tawagan ka po namin shortly or reply ka lang here pag free ka. Thank you!"*
- **📞 Suggested Taglish Call Script**:
  > *"Hello {firstName}, good day! Si {staffName} po from Epicenter Gym. Tumawag lang po ako regarding a quick concern/update sa inyong membership..."*

### J. `FOLLOW_UP_ATTEMPT` — Attempt #2 / Attempt #3 Follow-Up
- **Target**: Auto-generated from members who were `NO_ANSWER`, `CANNOT_BE_REACHED`, or `CALLBACK_REQUESTED` in a previous list.
- **📱 Suggested Taglish SMS**:
  > *"Hi {firstName}! 👋 Nag-try po kaming tumawag kanina from Epicenter Gym pero baka busy ka. Gusto lang sana naming mag-follow up regarding your {goal} journey and membership. Text ka lang here kung anong oras best tumawag. Ingat!"*
- **📞 Suggested Taglish Call Script**:
  > *"Hello {firstName}, good day! Si {staffName} po ulit from Epicenter Gym. Nag-follow up lang po kami sa tawag namin last time—kumusta po kayo? May quick update lang po sana kami para sa inyo..."*

---

## 3. New Addition #2: Admin Priority Marking & Default Priority Queue

- **Priority Levels on Every Campaign Item**:
  - `1 - HIGH PRIORITY (🔥 VIP / Urgent)` — Highlighted with a glowing Gold/Rose pill badge.
  - `2 - NORMAL PRIORITY (⚡ Standard)` — Default level for newly generated items.
  - `3 - LOW PRIORITY (💤 Low)` — Muted slate badge.
- **Admin / Manager Privilege Only**:
  - Only `ADMIN` and `MANAGER` users can toggle/set the Priority of a member (both during the **List Preview step** before generating the campaign, and **inside an active campaign** by clicking the star/priority toggle).
  - `CUSTOMER_CARE` staff see the Priority badge clearly (`🔥 HIGH PRIORITY`) in read-only mode.
- **Default Queue Sorting**:
  - By default, every Call List is automatically sorted by:
    1. **Contact Status** (`To Contact` first)
    2. **Priority Level** (`🔥 High Priority` at the very top $\rightarrow$ `⚡ Normal` $\rightarrow$ `💤 Low`)
    3. **Urgency** (Soonest expiration date / most recent lapse)

---

## 4. New Addition #3: Manager's Campaign Remarks / Overview Banner

- Separate from individual member remarks, each Campaign has a dedicated **`managerRemarks` (Campaign Overview & Instructions)** field.
- **How It Works**:
  - When the Manager/Admin creates a campaign (or edits it at any time), they can write a briefing for the team (e.g., *"Team, unahin niyo tawagan yung mga naka-High Priority. Offer the ₱1,000 monthly renewal and remind them about our new morning coach!"*).
  - **Pinned Executive Banner**: Inside the Calling Workspace, this Manager's Remark is displayed at the top of the screen in a high-contrast card (`📌 Manager's Briefing & Campaign Goal`) so every Customer Care agent reads the overview before making their first call.
  - Admins/Managers have an **`[ Edit Briefing & Scripts ]`** button right on the campaign header to update the instructions or Taglish templates live at any time.

---

## 5. New Addition #4: Wildcard Filters Including Personal Training Expiration (`trainingExpiration`)

We will add a dedicated **Personal Training (`trainingExpiration`) Filter Section** to the List Generator so you can filter by gym membership, personal training, or both together:

1. **Gym Membership Status & Expiration (`membershipExpiration`)**:
   - `Active`, `Expiring in next X days`, `Expired between X and Y days ago`, `Inactive`, or `Any`
2. **Personal Training Status & Expiration (`trainingExpiration`) — *NEW!***:
   - **`Has Active Personal Training`** (`trainingExpiration >= Today`) — *Perfect for your personal Nutrition & Goal Coaching texts/calls!*
   - **`Expiring Personal Training`** (`trainingExpiration` expiring within the next `1–7 days`)
   - **`Recently Expired Personal Training`** (`trainingExpiration` expired within the last `1–30 days`)
   - **`Active Gym Member WITHOUT Personal Training`** (`membershipStatus == Active` AND no active `trainingExpiration`) — *Perfect for pitching PT packages to regular gym-goers!*
3. **Attendance & Visit Rate**:
   - Visits in last `30 days` `≤ X` (Low attendance) or `≥ X` (Loyalists)
   - Days since last check-in `≥ X`
4. **Profile & Goal Filters**:
   - Fitness Goal keyword (`member.goal`), Gender, Birthday Month, Tags, plus automatic exclusion of `DO_NOT_CONTACT` members.

---

## 6. New Addition #5: Flawless 4-Screen Design & Past-Error Prevention Guarantee

To make sure you never have to waste time checking and fixing broken mobile/tablet/desktop layouts or unreadable dark text, we will strictly enforce every rule and failure safeguard from [`docs/DESIGN_SYSTEM_TOKENS.md`](file:///e:/Programming/epicenter-app2/docs/DESIGN_SYSTEM_TOKENS.md):

1. **Zero Dark-on-Dark Text (100% WCAG AAA High Contrast)**:
   - Every HTML class in the template will be audited before writing CSS.
   - Titles & numbers: `#ffffff` (`--color-text-pure`), Body & scripts: `#e2e8f0` (`--color-text-body`), Labels & metadata: `#cbd5e1` (`--color-text-secondary`), Accents: `#22d3ee` (Electric Cyan), `#fbbf24` (Brand Gold), `#34d399` (Mint Success), `#fb7185` (Rose Danger).
2. **Read-Only Info Data Cards vs. Edit Form Mode**:
   - Member details during a call (Goal, Membership Expiration, **Training Expiration**, Last Check-In, Past Call Story) will be rendered in clean `.info-data-card` blocks (`10px` uppercase cyan labels + `14px` bold white values)—**never** ugly disabled grey input boxes.
3. **Adaptive Table-to-Card Layout Across All 4 Screens (Failure #25 Safeguard)**:
   - 📱 **Mobile (`< 640px`)**: Automatically switches to a 1-column **Mobile Caller Deck** (no squished horizontal tables or wide sticky columns!). Full-width `min-height: 44px` touch buttons for `📞 Call Now`, `💬 Send SMS`, and 1-tap Outcome Pills, with `16px` clamped titles and `220px` bottom safe-area buffer so nothing is ever cut off at the bottom.
   - 📱 **Tablet Portrait (`640px – 768px`)**: 2-column responsive layout (compact Queue List + Active Member Caller Card).
   - 💻 **Tablet Landscape (`769px – 1024px`)**: Split master-detail workspace with side-by-side filters and script preview.
   - 🖥️ **Desktop (`> 1024px`)**: Full 3-zone Command Center (`max-width: 1400px`) showing the Priority Queue on the left, Active Member & Taglish Script in the center, and Call Outcome Logger + Past Call History Timeline on the right.
4. **Single Scroll Root & MDC Safeguards (Failures #22, #29, #30)**:
   - No nested `overflow-y: auto` page containers that trap scrolling on mobile; all Material dialogs, selects, and datepickers protected by dark `#0f172a` contrast shields.

---

## 7. Updated AI-First Firestore Schema (`call_campaigns` & `call_campaign_items`)

With your new additions, here is the clean, self-explanatory structure that both the app and any AI (Gemini, Claude) will use:

### `call_campaigns/{campaignId}`
- `title`: `"Nov 2026 - Active PT Nutrition Check-In"`
- `objectiveType`: `"PT_ACTIVE_NUTRITION"` *(or `EXPIRING_SOON`, `RECENTLY_EXPIRED`, `LOW_ATTENDANCE`, `LONG_EXPIRED`, `PT_EXPIRING_OR_EXPIRED`, `PROMOTION`, `FEEDBACK`, `CONCERNS`, `FOLLOW_UP_ATTEMPT`)*
- **`managerRemarks`**: `"Focus on checking their daily protein intake and hydration. Remind them they can message Coach anytime!"` *(New!)*
- **`smsTemplateTaglish`**: `"Hi {firstName}! 💪 Quick nutrition & progress check-in..."` *(Editable by Admin/Manager)*
- **`callScriptTaglish`**: `"Hello {firstName}! Si {staffName} po ito from Epicenter Gym..."` *(Editable by Admin/Manager)*
- `attemptNumber`: `1`
- `parentCampaignId`: `null`
- `filtersUsed`: `{ trainingStatus: "ACTIVE_PT", ... }`
- `stats`: `{ totalMembers, completedCount, pendingCount, highPriorityCount, statusBreakdown: { ... } }`

### `call_campaign_items/{itemId}`
- `campaignId`, `campaignTitle`, `objectiveType`, `attemptNumber`
- **`priority`**: `1` (`1 = HIGH`, `2 = NORMAL`, `3 = LOW`) *(New — Admin/Manager editable, default sort key!)*
- **`priorityNote`**: `"VIP PT Client"` *(Optional quick note why they are priority)*
- `memberId`: `"..."`
- `memberSnapshot`:
  - `name`, `firstName`, `contactNumber`, `gender`, `age`, `fitnessGoal`
  - `membershipStatus`, `membershipExpiration`, `daysUntilOrSinceExpiration`
  - **`trainingExpiration`**, **`daysUntilOrSinceTrainingExpiration`**, **`hasActivePt`** *(New!)*
  - `lastCheckInDate`, `checkInsLast30Days`, `previousCallSummary`
- `isContacted`: `true | false`
- `channelUsed`: `"CALL" | "SMS" | "BOTH"`
- `callStatus`: `"PENDING" | "TEXT_SENT" | "ANSWERED_AGREED" | "ANSWERED_INTERESTED" | "ANSWERED_FEEDBACK_GIVEN" | "CALLBACK_REQUESTED" | "NO_ANSWER" | "CANNOT_BE_REACHED" | "REJECTED" | "DO_NOT_CONTACT"`
- `staffStory`: `"Texted and called. Member shared she is hitting her protein goals and will visit tomorrow at 5 PM."`
- `calledBy`, `calledAt`, `attemptHistory[]`

---

## 8. Ready for Your Approval

Everything from your original 15 requirements + your 5 new additions is now unified in this design.

Before I start building Phase 1, please let me know:
1. **Do you approve this updated proposal (`v2`)?**
2. Any tweaks you want to the **10 Campaign Types / Taglish scripts** or the **4 quick questions** from earlier (such as making `/customer-care` the default home page for users who only have the `CUSTOMER_CARE` role, and pre-filling the Taglish SMS text when tapping `💬 Send Text` on mobile)?
