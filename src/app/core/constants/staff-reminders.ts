export interface StaffReminder {
    text: string;
    priority: 'CRITICAL' | 'IMPORTANT' | 'ROUTINE';
}

export const STAFF_REMINDERS: StaffReminder[] = [
    // CRITICAL (Safety, Security, Member Well-being)
    { text: "⚠️ Check all emergency exits are clear and accessible.", priority: 'CRITICAL' },
    { text: "⚠️ Verify the first aid kit is visible and accessible.", priority: 'CRITICAL' },
    { text: "⚠️ Ensure no loose weights are obstructing walkways.", priority: 'CRITICAL' },
    { text: "⚠️ Inspect cables and pulleys for any signs of wear.", priority: 'CRITICAL' },
    { text: "⚠️ Immediate cleanup required for any liquid spills on the floor.", priority: 'CRITICAL' },
    { text: "⚠️ Check that the defibrillator (AED) status indicator is green.", priority: 'CRITICAL' },
    { text: "⚠️ Verify fire extinguishers are in their designated spots.", priority: 'CRITICAL' },
    { text: "⚠️ Close and lock all windows if leaving or during bad weather.", priority: 'CRITICAL' },
    { text: "⚠️ Report any broken equipment immediately and tag it 'Out of Order'.", priority: 'CRITICAL' },
    { text: "⚠️ Monitor the entrance for unauthorized access.", priority: 'CRITICAL' },

    // IMPORTANT (Hygiene, Maintenance, Operations)
    { text: "🧹 Wipe down cardio machines (treadmills, ellipticals).", priority: 'IMPORTANT' },
    { text: "🧹 Sanitize the stretching area mats.", priority: 'IMPORTANT' },
    { text: "🧹 Check and restock paper towels and sanitizer spray bottles.", priority: 'IMPORTANT' },
    { text: "🧹 Wipe down dumbells and rack handles.", priority: 'IMPORTANT' },
    { text: "🧹 Inspect the locker rooms for cleanliness.", priority: 'IMPORTANT' },
    { text: "🧹 Restock toilet paper and soap in the restrooms.", priority: 'IMPORTANT' },
    { text: "🧹 Mop the entryway to keep it inviting.", priority: 'IMPORTANT' },
    { text: "🧹 Check the HVAC/AC settings for optimal gym temperature.", priority: 'IMPORTANT' },
    { text: "🧹 Empty the trash bins if they are over half full.", priority: 'IMPORTANT' },
    { text: "⚡ Ensure the sound system volume is at an appropriate level.", priority: 'IMPORTANT' },
    { text: "⚡ Check inventory levels for supplements and drinks.", priority: 'IMPORTANT' },
    { text: "⚡ Organize the sales counter and declutter the workspace.", priority: 'IMPORTANT' },
    { text: "⚡ Ensure all loaner equipment (belts, bands) is returned.", priority: 'IMPORTANT' },
    { text: "⚡ Remind members about upcoming gym events or challenges.", priority: 'IMPORTANT' },
    { text: "⚡ Check that all TVs are on the correct channels.", priority: 'IMPORTANT' },

    // ROUTINE (Hospitality, Social Media, General)
    { text: "📱 Take a quick photo/video of the gym vibe for Instagram Stories! 📸", priority: 'ROUTINE' },
    { text: "📱 Post a 'Workout Tip of the Day' on our social media.", priority: 'ROUTINE' },
    { text: "📱 Reply to recent comments/DMs on our social pages.", priority: 'ROUTINE' },
    { text: "💧 Stay hydrated! Drink a glass of water now. 🥤", priority: 'ROUTINE' },
    { text: "😊 Smile and greet every member who walks in!", priority: 'ROUTINE' },
    { text: "👋 Say a warm goodbye to members leaving the gym.", priority: 'ROUTINE' },
    { text: "🏋️ Re-rack weights that have been left on machines.", priority: 'ROUTINE' },
    { text: "🏋️ Organize the dumbbell rack by weight (light to heavy).", priority: 'ROUTINE' },
    { text: "🏋️ Straighten up the yoga balls and foam rollers.", priority: 'ROUTINE' },
    { text: "💡 Ask a regular member how their training progress is going.", priority: 'ROUTINE' },
    { text: "💡 Offer a spot to a member if they look like they need help.", priority: 'ROUTINE' },
    { text: "💡 Do a quick walk-around and give a thumbs up to training members.", priority: 'ROUTINE' },
    { text: "💡 Check if the music playlist needs a vibe switch.", priority: 'ROUTINE' },
    { text: "💡 Wipe down the front reception desk.", priority: 'ROUTINE' },
    { text: "💡 Ensure the merchandise display looks neat and attractive.", priority: 'ROUTINE' }
];
