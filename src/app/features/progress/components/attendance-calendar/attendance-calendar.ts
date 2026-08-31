import { Component, Input, OnInit, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AttendanceService } from '../../../../core/services/attendance.service';
import { AttendanceRecord } from '../../../../core/models/attendance.model';

interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  status: 'present' | 'rest' | 'neutral' | 'future';
  icon: string;
  label: string;
  colorClass: string;
  isToday: boolean;
  isInCurrentMonth: boolean;
}

@Component({
  selector: 'app-attendance-calendar',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './attendance-calendar.html',
  styleUrl: './attendance-calendar.css'
})
export class AttendanceCalendarComponent implements OnInit, OnChanges {
  @Input() memberId: string | null = null;

  private attendanceService = inject(AttendanceService);

  currentDate = new Date();
  calendarDays: CalendarDay[] = [];
  weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  attendanceHistory: AttendanceRecord[] = [];
  loading = true;

  // Gamified metrics
  monthlyWorkoutCount = 0;
  monthlyRestCount = 0;
  consistencyScore = 0;
  activeStreak = 0;

  async ngOnInit() {
    this.currentDate = new Date();
    this.currentDate.setDate(1);
    if (this.memberId) {
      await this.loadData();
    }
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['memberId'] && this.memberId) {
      await this.loadData();
    }
  }

  async loadData() {
    if (!this.memberId) return;
    this.loading = true;
    try {
      this.attendanceHistory = await this.attendanceService.getMemberAttendance(this.memberId);
      this.generateCalendar();
    } catch (error: any) {
      console.error('Error loading attendance:', error);
    } finally {
      this.loading = false;
    }
  }

  changeMonth(delta: number) {
    this.currentDate.setMonth(this.currentDate.getMonth() + delta);
    this.currentDate = new Date(this.currentDate);
    this.generateCalendar();
  }

  generateCalendar() {
    this.calendarDays = [];
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay();
    const totalDays = lastDayOfMonth.getDate();

    for (let i = 0; i < startDayOfWeek; i++) {
      const prevDate = new Date(year, month, -startDayOfWeek + 1 + i);
      this.calendarDays.push(this.createDayObject(prevDate, false));
    }

    let workouts = 0;
    let rests = 0;

    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(year, month, i);
      const dayObj = this.createDayObject(date, true);
      this.calendarDays.push(dayObj);

      if (dayObj.status === 'present') workouts++;
      else if (dayObj.status === 'rest') rests++;
    }

    this.monthlyWorkoutCount = workouts;
    this.monthlyRestCount = rests;

    // A recommended gym cadence is 3 to 4 days/week (~14 days/month = 100% target)
    const targetMonthlyWorkouts = 14;
    this.consistencyScore = Math.min(100, Math.round((workouts / targetMonthlyWorkouts) * 100));
    this.calculateStreak();
  }

  calculateStreak() {
    let streak = 0;
    const today = new Date();
    const checkDate = new Date(today);

    while (true) {
      if (this.isDateInHistory(checkDate)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        if (streak === 0 && checkDate.getDate() === today.getDate()) {
          checkDate.setDate(checkDate.getDate() - 1);
          if (this.isDateInHistory(checkDate)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          }
        }
        break;
      }
    }
    this.activeStreak = streak;
  }

  createDayObject(date: Date, isInCurrentMonth: boolean): CalendarDay {
    const today = new Date();
    const isToday = date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    if (date > today) {
      return {
        date,
        dayOfMonth: date.getDate(),
        status: 'future',
        icon: '',
        label: '',
        colorClass: 'future-day',
        isToday,
        isInCurrentMonth
      };
    }

    const { status, icon, label, colorClass } = this.calculateDayStatus(date);

    return {
      date,
      dayOfMonth: date.getDate(),
      status,
      icon,
      label,
      colorClass: isInCurrentMonth ? colorClass : 'other-month',
      isToday,
      isInCurrentMonth
    };
  }

  calculateDayStatus(date: Date): { status: 'present' | 'rest' | 'neutral', icon: string, label: string, colorClass: string } {
    const wasPresent = this.isDateInHistory(date);
    if (wasPresent) {
      return { status: 'present', icon: 'fitness_center', label: 'WORKOUT', colorClass: 'present-day' };
    }

    const prevDate = new Date(date);
    prevDate.setDate(date.getDate() - 1);
    const wasPrevPresent = this.isDateInHistory(prevDate);

    if (wasPrevPresent) {
      return { status: 'rest', icon: 'hotel', label: 'RECOVERY', colorClass: 'rest-day' };
    }

    return { status: 'neutral', icon: 'remove', label: 'OFF', colorClass: 'neutral-day' };
  }

  private isDateInHistory(date: Date): boolean {
    const dateStr = this.formatDate(date);
    return this.attendanceHistory.some(r => r.date === dateStr);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
