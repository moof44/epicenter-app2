export interface AttendanceEvaluationResult {
  currentStreak: number;
  badgeLevel: number; // 0 = None, 1 = Bronze, 2 = Silver, 3 = Gold
  earnedMonthlyBadges: string[]; // e.g. ["2026-01", "2026-02"]
}

export interface DayStatus {
  dateStr: string;
  status: 'Present' | 'Rest' | 'Absent';
}

/**
 * Utility to parse a YYYY-MM-DD string into a local Date object.
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Utility to format a Date object into YYYY-MM-DD local format.
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generates status (Present, Rest, Absent) for a range of dates.
 * 
 * Rules:
 * 1. Present: Checked in.
 * 2. Rest Day: Absent today, but was Present yesterday.
 * 3. Absent: Absent today, and was either Resting or Absent yesterday.
 */
export function getDayStatusesForRange(
  attendanceDates: string[],
  startDateStr: string,
  endDateStr: string
): DayStatus[] {
  const datesSet = new Set(attendanceDates);
  const start = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);
  
  const results: DayStatus[] = [];
  let prevStatus: 'Present' | 'Rest' | 'Absent' = 'Absent';

  // We need to determine the status of the day before the start date to properly
  // calculate the first day's status. Let's find if there was a check-in on (start - 1 day).
  const dayBeforeStart = new Date(start);
  dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);
  const dayBeforeStartStr = formatLocalDate(dayBeforeStart);
  
  if (datesSet.has(dayBeforeStartStr)) {
    prevStatus = 'Present';
  } else {
    // If the day before wasn't checked in, was the day before THAT checked in?
    const twoDaysBeforeStart = new Date(dayBeforeStart);
    twoDaysBeforeStart.setDate(twoDaysBeforeStart.getDate() - 1);
    const twoDaysBeforeStartStr = formatLocalDate(twoDaysBeforeStart);
    if (datesSet.has(twoDaysBeforeStartStr)) {
      prevStatus = 'Rest'; // start - 2 was Present, start - 1 was Rest
    } else {
      prevStatus = 'Absent';
    }
  }

  // Iterate from start to end date
  const current = new Date(start);
  while (current <= end) {
    const currentStr = formatLocalDate(current);
    let status: 'Present' | 'Rest' | 'Absent';

    if (datesSet.has(currentStr)) {
      status = 'Present';
    } else {
      if (prevStatus === 'Present') {
        status = 'Rest';
      } else {
        status = 'Absent';
      }
    }

    results.push({ dateStr: currentStr, status });
    prevStatus = status;
    
    current.setDate(current.getDate() + 1);
  }

  return results;
}

/**
 * Evaluates the full attendance history of a member up to a specific reference date.
 * Calculates their current streak, badge level, and monthly badges.
 * 
 * @param attendanceDates List of YYYY-MM-DD check-in dates for the member.
 * @param referenceDate The date from which we calculate streaks and rolling windows (typically today).
 * @param signupDateStr The date the member signed up (YYYY-MM-DD), or default to "2026-01-01".
 */
export function evaluateAttendance(
  attendanceDates: string[],
  referenceDate: Date,
  signupDateStr = '2026-01-01'
): AttendanceEvaluationResult {
  const todayStr = formatLocalDate(referenceDate);
  
  // 1. Calculate Streak
  // We need to trace daily status from Jan 1, 2026 (or signup date) up to referenceDate.
  // If the member has no attendance records at all, streak is 0.
  let currentStreak = 0;
  if (attendanceDates.length > 0) {
    // Sort dates ascending
    const sortedDates = [...attendanceDates].sort();
    const firstCheckIn = sortedDates[0];
    
    // We start tracing from the first check-in date
    const traceStart = parseLocalDate(firstCheckIn);
    const traceStatuses = getDayStatusesForRange(attendanceDates, firstCheckIn, todayStr);
    
    for (const day of traceStatuses) {
      if (day.status === 'Present') {
        currentStreak++;
      } else if (day.status === 'Absent') {
        currentStreak = 0; // Breaks the streak
      }
      // Rest status pauses the streak (no change to currentStreak)
    }
  }

  // 2. Calculate Tier Badges (Bronze, Silver, Gold)
  // rolling windows:
  // - last 30 days: [referenceDate - 29 days, referenceDate]
  // - last 60 days: [referenceDate - 59 days, referenceDate]
  // - last 90 days: [referenceDate - 89 days, referenceDate]
  let badgeLevel = 0;

  const countVisitsInWindow = (days: number): number => {
    const limitDate = new Date(referenceDate);
    limitDate.setDate(limitDate.getDate() - (days - 1));
    const limitStr = formatLocalDate(limitDate);
    
    return attendanceDates.filter(d => d >= limitStr && d <= todayStr).length;
  };

  const visits30 = countVisitsInWindow(30);
  const visits60 = countVisitsInWindow(60);
  const visits90 = countVisitsInWindow(90);

  // Progressive tier requirement:
  // Tier 1: 11 visits in 30 days
  // Tier 2: Tier 1 requirements AND 22 visits in 60 days
  // Tier 3: Tier 2 requirements AND 33 visits in 90 days
  if (visits30 >= 11) {
    badgeLevel = 1;
    if (visits60 >= 22) {
      badgeLevel = 2;
      if (visits90 >= 33) {
        badgeLevel = 3;
      }
    }
  }

  // 3. Calculate Monthly Badges (>= 4 visits in a calendar month, starting Jan 2026)
  const earnedMonthlyBadges: string[] = [];
  
  // Group visits by Year-Month (YYYY-MM)
  const monthlyVisits: Record<string, number> = {};
  for (const dateStr of attendanceDates) {
    if (dateStr < '2026-01-01') continue; // Only count January 2026 onwards
    const yearMonth = dateStr.substring(0, 7); // "YYYY-MM"
    monthlyVisits[yearMonth] = (monthlyVisits[yearMonth] || 0) + 1;
  }

  // Determine all completed months from January 2026 up to today's month.
  // Note: The badge for the current month is only awarded once the month is closed (e.g. today is in next month).
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1; // 1-indexed

  let year = 2026;
  let month = 1;

  while (year < currentYear || (year === currentYear && month < currentMonth)) {
    const yearMonthStr = `${year}-${String(month).padStart(2, '0')}`;
    const visits = monthlyVisits[yearMonthStr] || 0;
    
    if (visits >= 4) {
      earnedMonthlyBadges.push(yearMonthStr);
    }
    
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return {
    currentStreak,
    badgeLevel,
    earnedMonthlyBadges
  };
}
