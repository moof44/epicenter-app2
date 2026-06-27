export interface Badge {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  type: 'tier' | 'monthly';
}

export const TIER_BADGES: Record<number, Badge> = {
  1: {
    id: 'tier_bronze',
    name: 'Bronze Active',
    description: 'Checked in 11 times within the last 30 days.',
    imageUrl: 'assets/badges/tier-bronze.png',
    type: 'tier'
  },
  2: {
    id: 'tier_silver',
    name: 'Silver Consistent',
    description: 'Checked in 22 times within the last 60 days.',
    imageUrl: 'assets/badges/tier-silver.png',
    type: 'tier'
  },
  3: {
    id: 'tier_gold',
    name: 'Gold Legend',
    description: 'Checked in 33 times within the last 90 days.',
    imageUrl: 'assets/badges/tier-gold.png',
    type: 'tier'
  }
};

// Generates monthly badge details dynamically
export function getMonthlyBadge(year: number, month: number): Badge {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[month - 1];
  
  // Custom thematic names/descriptions can be loaded here based on month
  const themes: Record<number, { name: string; desc: string }> = {
    1: { name: 'Frost & Fire', desc: 'Conquered the winter chill and started the year strong.' },
    2: { name: 'Heart & Hustle', desc: 'Dedicated to consistency and loving the grind.' },
    3: { name: 'Spring Sprint', desc: 'Accelerated your fitness goals this spring.' },
    4: { name: 'April Action', desc: 'No excuses, pure action all month long.' },
    5: { name: 'May Momentum', desc: 'Maintained the momentum with absolute focus.' },
    6: { name: 'Summer Shred', desc: 'Turning up the heat on your workout routine.' },
    7: { name: 'July Jolt', desc: 'Electrified your training sessions this July.' },
    8: { name: 'August Grit', desc: 'Pushed through the heat with absolute grit.' },
    9: { name: 'Fall Focus', desc: 'Locked in and focused on autumn gains.' },
    10: { name: 'October Overdrive', desc: 'Switched into high gear for October.' },
    11: { name: 'November Never-Give-Up', desc: 'No winter slacking allowed. Solid effort.' },
    12: { name: 'December Dedication', desc: 'Finished the year as strong as you started.' }
  };

  const theme = themes[month] || { name: 'Monthly Achiever', desc: 'Completed at least 4 workouts.' };

  return {
    id: `${year}-${String(month).padStart(2, '0')}`,
    name: `${monthName} ${year} - ${theme.name}`,
    description: theme.desc,
    imageUrl: `assets/badges/monthly-${String(month).padStart(2, '0')}.png`,
    type: 'monthly'
  };
}

export interface BadgeDefinition {
    id: string; // unique slug, e.g. 'founder'
    name: string;
    description?: string;
    iconUrl?: string;
    colorHex?: string;
    type: 'ADMINISTRATIVE' | 'ACHIEVEMENT' | 'SYSTEM_INTERNAL';
    visibility: 'PUBLIC' | 'PRIVATE_MEMBER' | 'INTERNAL_STAFF';
}
