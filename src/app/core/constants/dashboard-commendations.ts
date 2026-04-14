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
    "Hospitality is a superpower. Use it generously. 🦸",
];

/** Returns a deterministic commendation for the given user and day. */
export function getDailyCommendation(uid: string): string {
    const today = new Date();
    const seed = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}-${uid}`;

    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
    }

    const index = Math.abs(hash) % DASHBOARD_COMMENDATIONS.length;
    return DASHBOARD_COMMENDATIONS[index];
}
