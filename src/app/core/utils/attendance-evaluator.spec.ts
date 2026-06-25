import { describe, it, expect } from 'vitest';
import { 
  evaluateAttendance, 
  getDayStatusesForRange, 
  parseLocalDate, 
  formatLocalDate 
} from './attendance-evaluator';

describe('AttendanceEvaluator', () => {
  describe('Date Helpers', () => {
    it('should parse local date strings without timezone shifts', () => {
      const d = parseLocalDate('2026-06-25');
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(5); // June is index 5
      expect(d.getDate()).toBe(25);
    });

    it('should format date objects to local YYYY-MM-DD strings', () => {
      const d = new Date(2026, 5, 25);
      expect(formatLocalDate(d)).toBe('2026-06-25');
    });
  });

  describe('Rest Day and Absence Logic', () => {
    it('should identify Present, Rest, and Absent statuses correctly', () => {
      const attendance = [
        '2026-06-01', // Present
        '2026-06-03', // Present
        '2026-06-04', // Present
        '2026-06-07'  // Present
      ];
      
      const statuses = getDayStatusesForRange(attendance, '2026-06-01', '2026-06-07');
      
      expect(statuses).toEqual([
        { dateStr: '2026-06-01', status: 'Present' },
        { dateStr: '2026-06-02', status: 'Rest' },    // Rest because prev day was Present
        { dateStr: '2026-06-03', status: 'Present' },
        { dateStr: '2026-06-04', status: 'Present' },
        { dateStr: '2026-06-05', status: 'Rest' },    // Rest because prev day was Present
        { dateStr: '2026-06-06', status: 'Absent' },  // Absent because prev day was Rest
        { dateStr: '2026-06-07', status: 'Present' }
      ]);
    });
  });

  describe('Streak Calculation', () => {
    it('should increment streak for consecutive check-ins', () => {
      const attendance = ['2026-06-01', '2026-06-02', '2026-06-03'];
      const refDate = new Date(2026, 5, 3); // June 3rd
      const result = evaluateAttendance(attendance, refDate);
      expect(result.currentStreak).toBe(3);
    });

    it('should maintain/pause streak on rest days and continue incrementing', () => {
      const attendance = ['2026-06-01', '2026-06-03']; // June 2nd is Rest
      const refDate = new Date(2026, 5, 3);
      const result = evaluateAttendance(attendance, refDate);
      expect(result.currentStreak).toBe(2);
    });

    it('should break streak to 0 on absent days', () => {
      const attendance = ['2026-06-01', '2026-06-04']; // June 2 = Rest, June 3 = Absent, June 4 = Present
      const refDate = new Date(2026, 5, 4);
      const result = evaluateAttendance(attendance, refDate);
      // Day 1: Present (streak 1)
      // Day 2: Rest (streak 1)
      // Day 3: Absent (streak breaks to 0)
      // Day 4: Present (streak reset to 1)
      expect(result.currentStreak).toBe(1);
    });

    it('should pause streak on rest days if reference date is a rest day', () => {
      const attendance = ['2026-06-01']; // June 1 = Present, June 2 = Rest
      const refDate = new Date(2026, 5, 2);
      const result = evaluateAttendance(attendance, refDate);
      expect(result.currentStreak).toBe(1);
    });

    it('should break streak on absent days if reference date is an absent day', () => {
      const attendance = ['2026-06-01']; // June 1 = Present, June 2 = Rest, June 3 = Absent
      const refDate = new Date(2026, 5, 3);
      const result = evaluateAttendance(attendance, refDate);
      expect(result.currentStreak).toBe(0);
    });
  });

  describe('Rolling-Window Tier Badges', () => {
    it('should assign level 0 if no thresholds met', () => {
      const attendance = ['2026-06-01'];
      const refDate = new Date(2026, 5, 25);
      const result = evaluateAttendance(attendance, refDate);
      expect(result.badgeLevel).toBe(0);
    });

    it('should award Tier 1 (Bronze) for 11 visits in 30 days', () => {
      const attendance = Array.from({ length: 11 }, (_, i) => `2026-06-${String(i + 1).padStart(2, '0')}`);
      const refDate = new Date(2026, 5, 30);
      const result = evaluateAttendance(attendance, refDate);
      expect(result.badgeLevel).toBe(1);
    });

    it('should award Tier 2 (Silver) only if Tier 1 requirements are also met', () => {
      // 22 visits in 60 days. But let's say they did all 22 visits in the first 30 days of the 60-day window, and 0 in the last 30 days.
      // This means visits in last 30 days = 0 (fails Tier 1).
      // So they should not get Tier 2.
      const attendance = Array.from({ length: 22 }, (_, i) => `2026-05-${String(i + 1).padStart(2, '0')}`);
      const refDate = new Date(2026, 5, 30); // June 30th
      const result = evaluateAttendance(attendance, refDate);
      expect(result.badgeLevel).toBe(0); // Fails Tier 1, so falls back to 0
    });

    it('should award Tier 2 (Silver) if both 30-day and 60-day thresholds are met', () => {
      // 11 in last 30 days, 22 in last 60 days
      const last30 = Array.from({ length: 11 }, (_, i) => `2026-06-${String(i + 10).padStart(2, '0')}`);
      const prev30 = Array.from({ length: 11 }, (_, i) => `2026-05-${String(i + 10).padStart(2, '0')}`);
      const attendance = [...prev30, ...last30];
      const refDate = new Date(2026, 5, 30); // June 30th
      const result = evaluateAttendance(attendance, refDate);
      expect(result.badgeLevel).toBe(2);
    });

    it('should award Tier 3 (Gold) if all progressive thresholds are met', () => {
      // 11 in [June 1-30], 22 in [May 1 - June 30], 33 in [April 1 - June 30]
      const last30 = Array.from({ length: 11 }, (_, i) => `2026-06-${String(i + 10).padStart(2, '0')}`);
      const prev30 = Array.from({ length: 11 }, (_, i) => `2026-05-${String(i + 10).padStart(2, '0')}`);
      const older30 = Array.from({ length: 11 }, (_, i) => `2026-04-${String(i + 10).padStart(2, '0')}`);
      const attendance = [...older30, ...prev30, ...last30];
      const refDate = new Date(2026, 5, 30);
      const result = evaluateAttendance(attendance, refDate);
      expect(result.badgeLevel).toBe(3);
    });

    it('should rank down to Bronze if 60-day window drops below 22 but 30-day is still >= 11', () => {
      const last30 = Array.from({ length: 11 }, (_, i) => `2026-06-${String(i + 10).padStart(2, '0')}`);
      const prev30 = Array.from({ length: 5 }, (_, i) => `2026-05-${String(i + 10).padStart(2, '0')}`);
      const attendance = [...prev30, ...last30]; // 16 visits in 60 days total
      const refDate = new Date(2026, 5, 30);
      const result = evaluateAttendance(attendance, refDate);
      expect(result.badgeLevel).toBe(1); // Meets 30-day (11), fails 60-day (16 < 22) -> Ranks down to Tier 1
    });
  });

  describe('Monthly Collectible Badges', () => {
    it('should award monthly badges for months with >= 4 check-ins starting Jan 2026', () => {
      const attendance = [
        '2025-12-01', '2025-12-02', '2025-12-03', '2025-12-04', // 4 visits in Dec 2025 (should be ignored since it is pre-Jan 2026)
        '2026-01-05', '2026-01-10', '2026-01-15', '2026-01-20', // 4 visits in Jan 2026 -> Earned!
        '2026-02-05', '2026-02-10', '2026-02-15',               // 3 visits in Feb 2026 -> Fails!
        '2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05' // 5 visits in Mar 2026 -> Earned!
      ];
      
      const refDate = new Date(2026, 3, 10); // Today is April 10th, 2026. Jan, Feb, Mar are completed months.
      const result = evaluateAttendance(attendance, refDate);
      
      expect(result.earnedMonthlyBadges).toEqual(['2026-01', '2026-03']);
    });

    it('should not award the badge for the current active month', () => {
      const attendance = [
        '2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04' // 4 visits in June 2026
      ];
      const refDate = new Date(2026, 5, 15); // Today is June 15th, 2026. June is not yet completed.
      const result = evaluateAttendance(attendance, refDate);
      
      expect(result.earnedMonthlyBadges).toEqual([]);
    });
  });
});
