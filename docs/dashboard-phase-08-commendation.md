# Phase 8: Commendation of the Day

> Part of: Staff Personal Dashboard Spec
> Focus: Daily motivational message that encourages and sets the tone

---

## 1. Goal

**Psychological driver:** Positive reinforcement and emotional anchoring.

This widget is the emotional heartbeat of the dashboard. While every other widget shows numbers, this one speaks directly to the person. It sets the tone for the shift: "You matter. Your work matters. Keep going."

The existing system has two motivational mechanisms:
- `commendations.ts` — action-triggered ("Great job on that sale!") — shown in snackbars after checkout/check-in
- `staff-reminders.ts` — task-oriented ("Wipe down cardio machines") — shown in a rotating banner

The dashboard commendation is neither of these. It's a third type: a **daily affirmation** — not tied to an action, not a task. It's a message the staff reads when they first open the app, before they've done anything. It should make them feel valued and ready to work.

---

## 2. Data Source

**No Firestore queries. Zero reads.**

The commendation is a local constant — a curated list of messages stored in a TypeScript file. No network call, no database read, no cost.

### Message selection: Deterministic daily rotation

The existing `getRandomCommendation()` picks a random message on every call. For the dashboard, we want the message to be **fixed for the entire day** — the same staff member sees the same message every time they visit the dashboard today. This creates consistency ("my message today is...") and avoids the jarring experience of a new message on every page load.

**Algorithm:**

```typescript
function getDailyCommendation(messages: string[], uid: string): string {
    // Seed: date string + user ID → deterministic hash
    const today = new Date();
    const seed = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}-${uid}`;
    
    // Simple hash to index
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0; // Convert to 32-bit integer
    }
    
    const index = Math.abs(hash) % messages.length;
    return messages[index];
}
```

This ensures:
- Same message all day for the same user
- Different message tomorrow
- Different users see different messages on the same day (uid in seed)
- No Firestore reads

---

## 3. Refresh Behavior & Caching Tier

**Tier: 2 — Session-Cached (fixed for the day)**

But since there's no Firestore query, "caching" here just means the deterministic function returns the same result all day. No `DashboardCacheService` involvement needed — the function itself is the cache.

| Trigger | Behavior |
|---------|----------|
| Any dashboard visit | Compute message from deterministic function. Same result all day. |
| Midnight rollover | Date changes → seed changes → new message. |
| Different user logs in | uid changes → seed changes → different message. |

**Firestore cost: 0. Always.**

---

## 4. Message Categories & Content

### New message list: `DASHBOARD_COMMENDATIONS`

The existing `SALES_COMMENDATIONS` and `CHECKIN_COMMENDATIONS` are action-specific ("Great job on that sale!"). They don't work for a dashboard greeting because the staff hasn't done anything yet.

Create a new list of general affirmations:

```typescript
export const DASHBOARD_COMMENDATIONS: string[] = [
    // Value & Appreciation
    "The gym wouldn't be the same without you. Thank you for showing up. 🙏",
    "Every member you help today is a life you're improving. 💪",
    "Your energy sets the tone for the whole gym. Bring it today. ⚡",
    "Small actions, big impact. Every interaction matters. ✨",
    "You're not just running a gym — you're building a community. 🏠",
    
    // Encouragement & Momentum
    "Today is a fresh start. Make it count. 🌅",
    "One sale at a time, one member at a time. You've got this. 🎯",
    "Consistency beats intensity. Keep showing up. 📈",
    "The best shift starts with a positive mindset. You're ready. 🧠",
    "Progress isn't always visible, but it's always happening. 🌱",
    
    // Team & Belonging
    "The team is stronger because you're part of it. 🤝",
    "Your colleagues count on you. That says a lot about who you are. ⭐",
    "Great teams are built by people who care. That's you. 💙",
    "When you win, the whole gym wins. Let's go. 🏆",
    "You bring something unique to this team. Don't forget that. 🌟",
    
    // Resilience & Growth
    "Tough days build tough people. You're tougher than you think. 🔥",
    "Yesterday is done. Today is yours. Own it. 💥",
    "Every expert was once a beginner. Keep learning, keep growing. 📚",
    "Challenges are just opportunities wearing a disguise. 🎭",
    "You've handled hard days before. Today won't be different. 💎",
    
    // Hospitality & Service
    "A smile costs nothing but means everything to a member. 😊",
    "The best gyms aren't built with equipment — they're built with people like you. 🏋️",
    "Make someone's day today. It might be easier than you think. ☀️",
    "Members remember how you made them feel. Make it count. 💫",
    "Hospitality is a superpower. Use it generously. 🦸"
];
```

**25 messages** — enough for nearly a month without repeats per user. With the uid-seeded hash, different staff see different messages on the same day, so the list feels even larger in practice.

### Tone guidelines

- First person plural ("we", "the team") or second person ("you") — never third person
- Present tense — "You're doing great" not "You did great"
- No metrics or numbers — this is emotional, not analytical
- No tasks or instructions — that's what `staff-reminders.ts` is for
- One emoji per message, at the end — not overloaded
- Max 80 characters — fits on one line on mobile without wrapping

---

## 5. Empty State

There is no empty state. The message list is hardcoded — there's always a message to show.

---

## 6. Visual Design

### Card structure

```
┌──────────────────────────────────────┐
│                                      │
│  "The gym wouldn't be the same       │
│   without you. Thank you for         │
│   showing up. 🙏"                    │
│                                      │
└──────────────────────────────────────┘
```

No title. No icon. No label. Just the message. The simplicity is the design — it stands out precisely because it's different from every other card on the dashboard.

### Typography

- Message text: `mat-body-large` (16px, 400 weight) on desktop, 15px on tablet, 14px on mobile
- Italic — distinguishes it from data text. Feels like a quote.
- Line height: 1.6 — generous spacing for readability
- Text alignment: center on all breakpoints

### Background

Subtle gradient or tinted background to differentiate from the white data cards:

```css
.commendation-card {
    background: linear-gradient(135deg, #e8eaf6 0%, #f3e5f5 100%);
    /* Light indigo → light purple — warm, calming */
    border: none;
    box-shadow: none; /* No elevation — feels soft, not corporate */
}
```

No `mat-elevation` — the card should feel like a gentle note, not a data panel.

### Sizing

| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Card | Spans 2 columns (desktop grid) | Full width | Full width |
| Message text | 16px, italic | 15px | 14px |
| Card padding | 32px 24px | 24px | 20px 16px |
| Card min-height | 80px | 72px | 64px |
| Card max-width | 600px (centered within span) | — | — |

On desktop, the card spans 2 columns in the grid but the text is centered with a max-width to prevent overly long lines.

---

## 7. Interactions

| Action | Behavior |
|--------|----------|
| Tap/click | Nothing. This is not navigable. It's a moment of pause, not a link. |
| Hover (desktop) | No elevation change. No cursor pointer. Intentionally non-interactive. |
| Long press (mobile) | Nothing. |

**Why non-interactive?** Every other card on the dashboard is tappable. Making the commendation non-interactive creates a deliberate contrast — it's the one thing on the page that asks nothing of the staff. It just gives.

---

## 8. Role Visibility

| Role | Sees this widget? | Why |
|------|-------------------|-----|
| ADMIN | ✅ | Everyone deserves encouragement |
| MANAGER | ✅ | Same |
| STAFF | ✅ | Primary audience |
| TRAINER | ✅ | Especially important — trainers have fewer dashboard widgets |

Universal visibility. No role exclusion.

---

## 9. Relationship to Existing Systems

| System | Purpose | When shown | Dashboard commendation overlap? |
|--------|---------|-----------|-------------------------------|
| `SALES_COMMENDATIONS` | Celebrate a sale | Snackbar after checkout | No — action-triggered vs daily |
| `CHECKIN_COMMENDATIONS` | Celebrate a check-in | Snackbar after check-in | No — action-triggered vs daily |
| `CHECKOUT_REMINDERS` | Remind staff to say goodbye | Snackbar after check-out | No — task vs affirmation |
| `STAFF_REMINDERS` | Operational tasks | Rotating banner in app shell | No — tasks vs emotional support |
| **Dashboard commendation** | **Daily affirmation** | **Dashboard page, fixed for the day** | **New category** |

No overlap. Each system serves a different moment and purpose.

---

## 10. Edge Cases

| Scenario | Behavior |
|----------|----------|
| Same user visits 20 times in a day | Same message every time (deterministic hash). Consistent, not jarring. |
| Two staff members on the same device (shared tablet) | Different messages — uid is part of the seed. Logging out and in as a different user changes the message. |
| Message list is empty (shouldn't happen) | Guard: if `messages.length === 0`, hide the widget entirely. |
| Very long message (>80 chars) | All messages are curated to ≤80 chars. If a future message exceeds this, CSS handles wrapping gracefully with `word-wrap: break-word`. |
| User has no uid (not logged in) | Dashboard requires auth guard. This can't happen. |

---

## 11. Component Spec

**File:** `src/app/features/dashboard/widgets/commendation/commendation.ts`

**New constants file:** `src/app/core/constants/dashboard-commendations.ts`

**Inputs:** None.

**Injections:** `AuthService` (for uid in the hash seed)

**Signals:**
- `message = signal('')`

**No loading state needed** — the message is computed synchronously from a local constant. It's available on the first render frame.

**Lifecycle:**
```typescript
constructor() {
    const uid = this.authService.userProfile()?.uid || 'anonymous';
    this.message.set(getDailyCommendation(DASHBOARD_COMMENDATIONS, uid));
}
```

---

## 12. File Location for Constants

**`src/app/core/constants/dashboard-commendations.ts`**

Separate from `commendations.ts` (which holds action-triggered messages). This keeps the two systems independent — editing dashboard messages doesn't risk breaking the snackbar commendations.

---

## Next Step

Phase 9: Contextual Badges & Shift Status — "First to Open" badge and shift reminder.
