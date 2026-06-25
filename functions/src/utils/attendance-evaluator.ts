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

  const dayBeforeStart = new Date(start);
  dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);
  const dayBeforeStartStr = formatLocalDate(dayBeforeStart);
  
  if (datesSet.has(dayBeforeStartStr)) {
    prevStatus = 'Present';
  } else {
    const twoDaysBeforeStart = new Date(dayBeforeStart);
    twoDaysBeforeStart.setDate(twoDaysBeforeStart.getDate() - 1);
    const twoDaysBeforeStartStr = formatLocalDate(twoDaysBeforeStart);
    if (datesSet.has(twoDaysBeforeStartStr)) {
      prevStatus = 'Rest';
    } else {
      prevStatus = 'Absent';
    }
  }

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
 */
export function evaluateAttendance(
  attendanceDates: string[],
  referenceDate: Date
): AttendanceEvaluationResult {
  const todayStr = formatLocalDate(referenceDate);
  
  let currentStreak = 0;
  if (attendanceDates.length > 0) {
    const sortedDates = [...attendanceDates].sort();
    const firstCheckIn = sortedDates[0];
    
    const traceStatuses = getDayStatusesForRange(attendanceDates, firstCheckIn, todayStr);
    
    for (const day of traceStatuses) {
      if (day.status === 'Present') {
        currentStreak++;
      } else if (day.status === 'Absent') {
        currentStreak = 0;
      }
    }
  }

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

  if (visits30 >= 11) {
    badgeLevel = 1;
    if (visits60 >= 22) {
      badgeLevel = 2;
      if (visits90 >= 33) {
        badgeLevel = 3;
      }
    }
  }

  const earnedMonthlyBadges: string[] = [];
  const monthlyVisits: Record<string, number> = {};
  for (const dateStr of attendanceDates) {
    if (dateStr < '2026-01-01') continue;
    const yearMonth = dateStr.substring(0, 7);
    monthlyVisits[yearMonth] = (monthlyVisits[yearMonth] || 0) + 1;
  }

  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1;

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
