import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getDayStatusesForRange, formatLocalDate, parseLocalDate } from '../../../core/utils/attendance-evaluator';

interface CalendarDay {
  date: Date;
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  status: 'Present' | 'Rest' | 'Absent' | 'Future' | 'None';
}

@Component({
  selector: 'app-attendance-calendar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card-surface p-4 flex flex-col gap-4">
      
      <!-- Calendar Header -->
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold font-oswald text-gold-light uppercase tracking-wider">
          {{ monthNames[currentMonth.getMonth()] }} {{ currentMonth.getFullYear() }}
        </h3>
        <div class="flex items-center gap-2">
          <button 
            (click)="prevMonth()" 
            class="p-1.5 rounded-lg border border-bg-surface-alt bg-bg-surface-alt/40 hover:bg-bg-surface-alt text-text-primary transition-colors text-xs"
            type="button"
          >
            ◀
          </button>
          <button 
            (click)="nextMonth()" 
            class="p-1.5 rounded-lg border border-bg-surface-alt bg-bg-surface-alt/40 hover:bg-bg-surface-alt text-text-primary transition-colors text-xs"
            type="button"
          >
            ▶
          </button>
        </div>
      </div>

      <!-- Days of Week Headers -->
      <div class="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-text-muted uppercase tracking-wider font-oswald border-b border-bg-surface-alt/40 pb-2">
        <span>Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
      </div>

      <!-- Days Grid -->
      <div class="grid grid-cols-7 gap-1.5">
        @for (day of calendarDays; track day.dateStr) {
          <div 
            [attr.title]="getDayTooltip(day)"
            [class.opacity-30]="!day.isCurrentMonth"
            [class.bg-gold-primary]="day.status === 'Present'"
            [class.text-black]="day.status === 'Present'"
            [class.font-bold]="day.status === 'Present'"
            
            [class.bg-slate-800/45]="day.status === 'Rest'"
            [class.text-slate-400]="day.status === 'Rest'"
            [class.border]="day.status === 'Rest'"
            [class.border-slate-700/45]="day.status === 'Rest'"
            
            [class.bg-red-950/40]="day.status === 'Absent'"
            [class.text-red-400]="day.status === 'Absent'"
            [class.border]="day.status === 'Absent'"
            [class.border-red-900/50]="day.status === 'Absent'"
            
            [class.bg-transparent]="day.status === 'Future' || day.status === 'None'"
            [class.text-text-muted]="day.status === 'Future' || day.status === 'None'"
            
            class="aspect-square flex flex-col justify-between p-1 rounded-lg transition-transform hover:scale-105 cursor-help"
          >
            <!-- Day Number in top-left corner -->
            <span class="text-[9px] font-mono leading-none self-start">{{ day.dayNumber }}</span>
            
            <!-- Central Status Icon -->
            <div class="flex-grow flex items-center justify-center text-[11px] sm:text-xs leading-none select-none">
              @if (day.status === 'Present') {
                <span>🏋️</span>
              } @else if (day.status === 'Rest') {
                <span>🛌</span>
              } @else if (day.status === 'Absent') {
                <span class="text-[8px] opacity-75">❌</span>
              }
            </div>
          </div>
        }
      </div>

      <!-- Calendar Legend -->
      <div class="flex items-center gap-3.5 text-[10px] text-text-muted mt-2 border-t border-bg-surface-alt/30 pt-3 flex-wrap justify-start select-none">
        <div class="flex items-center gap-1.5 bg-gold-primary/10 border border-gold-primary/30 px-2.5 py-1.5 rounded-xl text-gold-light">
          <span class="text-xs">🏋️</span>
          <span class="font-bold uppercase tracking-wider font-oswald text-[9px]">Present</span>
        </div>
        <div class="flex items-center gap-1.5 bg-slate-800/40 border border-slate-700/45 px-2.5 py-1.5 rounded-xl text-slate-400">
          <span class="text-xs">🛌</span>
          <span class="font-bold uppercase tracking-wider font-oswald text-[9px]">Rest Day</span>
        </div>
        <div class="flex items-center gap-1.5 bg-red-950/30 border border-red-900/40 px-2.5 py-1.5 rounded-xl text-red-400">
          <span class="text-xs">❌</span>
          <span class="font-bold uppercase tracking-wider font-oswald text-[9px]">Absent</span>
        </div>
      </div>

    </div>
  `,
  styles: []
})
export class AttendanceCalendarComponent implements OnInit, OnChanges {
  @Input() attendanceDates: string[] = [];

  currentMonth: Date = new Date();
  calendarDays: CalendarDay[] = [];

  readonly monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  ngOnInit() {
    this.generateCalendar();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['attendanceDates']) {
      this.generateCalendar();
    }
  }

  prevMonth() {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.generateCalendar();
  }

  nextMonth() {
    const next = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    // Don't navigate to future months beyond the current system month
    const today = new Date();
    if (next.getFullYear() < today.getFullYear() || (next.getFullYear() === today.getFullYear() && next.getMonth() <= today.getMonth())) {
      this.currentMonth = next;
      this.generateCalendar();
    }
  }

  generateCalendar() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();

    // First day of current month
    const firstDay = new Date(year, month, 1);
    // Last day of current month
    const lastDay = new Date(year, month + 1, 0);

    // Start with grid days from the previous month to fill the first row
    const startOffset = firstDay.getDay(); // 0 is Sun, 1 is Mon, etc.
    const days: CalendarDay[] = [];

    // Fill offset days from the previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, prevMonthLastDay - i);
      const dateStr = formatLocalDate(prevDate);
      days.push({
        date: prevDate,
        dateStr,
        dayNumber: prevDate.getDate(),
        isCurrentMonth: false,
        status: 'None' // We don't render status for non-current month days in the grid
      });
    }

    // Get statuses for the entire current month range
    const startStr = formatLocalDate(firstDay);
    const endStr = formatLocalDate(lastDay);
    const statuses = getDayStatusesForRange(this.attendanceDates, startStr, endStr);
    const statusMap = new Map(statuses.map(s => [s.dateStr, s.status]));

    const todayStr = formatLocalDate(new Date());

    // Fill days of the current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const currentDate = new Date(year, month, i);
      const dateStr = formatLocalDate(currentDate);

      let status: 'Present' | 'Rest' | 'Absent' | 'Future' | 'None' = 'None';
      if (dateStr > todayStr) {
        status = 'Future';
      } else {
        const computedStatus = statusMap.get(dateStr) || 'Absent';
        if (dateStr === todayStr && computedStatus === 'Absent') {
          status = 'None';
        } else {
          status = computedStatus;
        }
      }

      days.push({
        date: currentDate,
        dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        status
      });
    }

    // Pad the end of grid to complete the final row (make multiple of 7)
    const endOffset = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= endOffset; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({
        date: nextDate,
        dateStr: formatLocalDate(nextDate),
        dayNumber: i,
        isCurrentMonth: false,
        status: 'None'
      });
    }

    this.calendarDays = days;
  }

  getDayTooltip(day: CalendarDay): string {
    if (!day.isCurrentMonth) return '';
    const formattedDate = day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    
    switch (day.status) {
      case 'Present': return `${formattedDate}: Present (Checked In)`;
      case 'Rest': return `${formattedDate}: Rest Day (Workout Recovery)`;
      case 'Absent': return `${formattedDate}: Absent (Missed Target)`;
      case 'Future': return `${formattedDate}: Future`;
      default: return formattedDate;
    }
  }
}
