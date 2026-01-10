export const SALES_COMMENDATIONS = [
    "Great job on that sale! 💸",
    "Another one bites the dust! Keep it up! 👏",
    "You're on fire today! 🔥",
    "Excellent work closing that deal! 🤝",
    "Way to go! The team appreciates it. ⭐",
    "Boom! Sale complete. 💥",
    "Fantastic! Keep the momentum going. 🚀",
    "You're a sales machine! 🤖",
    "Nice hustle! Great result. 💪",
    "Outstanding! That's how it's done. ✨"
];

export const CHECKIN_COMMENDATIONS = [
    "Member checked in! Lets get them moving! 🏃",
    "One more in the gym! Great job. 🏋️",
    "Efficient check-in! Keep smiling. 😊",
    "Welcome received! You're doing great. 👋",
    "Smooth entry! Keep up the good work. ⭐",
    "Another member ready to train! 💪",
    "Quick and easy check-in. Nice! ⚡",
    "You're managing the flow perfectly! 🌊",
    "Great customer service! 👍",
    "Checking them in like a pro! 🏅"
];

export const CHECKOUT_REMINDERS = [
    "Say: 'Take care, see you tomorrow!' 👋",
    "Reminder: 'Don't forget to get your keys!' 🔑",
    "Say: 'Thank you for training with us!' 🙏",
    "Reminder: 'Have a great rest of your day!' ☀️",
    "Say: 'Great session! See you soon.' 💪",
    "Reminder: 'Check if they left anything behind.' 👀",
    "Say: 'Drive safe and rest well!' 🚗",
    "Reminder: 'Ask how their workout was!' 🗣️",
    "Say: 'Hope to see you back tomorrow!' 📅",
    "Reminder: 'Thank you, come again!' ⭐"
];

export function getRandomCommendation(type: 'SALES' | 'CHECKIN' | 'CHECKOUT'): string {
    let list: string[];
    switch (type) {
        case 'SALES': list = SALES_COMMENDATIONS; break;
        case 'CHECKIN': list = CHECKIN_COMMENDATIONS; break;
        case 'CHECKOUT': list = CHECKOUT_REMINDERS; break;
        default: list = [];
    }
    const randomIndex = Math.floor(Math.random() * list.length);
    return list[randomIndex];
}
