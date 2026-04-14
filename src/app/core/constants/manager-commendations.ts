export const MANAGER_COMMENDATIONS: string[] = [
    // Leadership & Team
    'Your team performs because you lead by example. Keep it up. 🏆',
    'A great manager builds great people. That\'s what you do every day. 🌟',
    'The energy in this gym starts with you. Thank you for setting the tone. ⚡',
    'Behind every strong team is a leader who cares. That\'s you. 💙',
    'Your staff trusts you. That trust is earned, not given. 🤝',

    // Business & Growth
    'Every decision you make shapes this business. You\'re doing it right. 📈',
    'Growth isn\'t accidental — it\'s the result of your daily effort. 🌱',
    'The numbers tell a story. Your story is one of progress. 📊',
    'Smart decisions today build a stronger gym tomorrow. 🧠',
    'You\'re not just managing a gym — you\'re building something lasting. 🏗️',

    // Resilience
    'Tough days are part of the journey. You handle them with grace. 💎',
    'Not every day is a record day. But every day you show up matters. 🔥',
    'The best leaders don\'t avoid problems — they solve them. That\'s you. 🛠️',
    'Consistency in leadership is the hardest skill. You\'ve got it. 📅',
    'Your calm under pressure keeps the whole team steady. 🌊',

    // Members & Community
    'Every member who walks through that door is here because of what you built. 🏠',
    'A gym is only as good as the experience it creates. Yours is excellent. ✨',
    'Members don\'t just come for the equipment — they come for the culture you created. 💪',
    'Happy members, happy business. You\'re making both happen. 😊',
    'The community you\'ve built here is something to be proud of. 🎯',

    // Recognition
    'Take a moment to appreciate how far this gym has come. You did that. 🙏',
    'The owner in you should be proud of the manager in you. ⭐',
    'Your dedication doesn\'t go unnoticed. The results speak for themselves. 🏅',
    'Today is another chance to make this place even better. Let\'s go. 🚀',
    'You\'re the reason this gym runs smoothly. Don\'t forget that. 💫',
];

/** Returns a deterministic manager commendation for the given user and day. */
export function getDailyManagerCommendation(uid: string): string {
    const today = new Date();
    const seed = `mgr-${today.getFullYear()}-${today.getMonth()}-${today.getDate()}-${uid}`;

    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
    }

    const index = Math.abs(hash) % MANAGER_COMMENDATIONS.length;
    return MANAGER_COMMENDATIONS[index];
}
