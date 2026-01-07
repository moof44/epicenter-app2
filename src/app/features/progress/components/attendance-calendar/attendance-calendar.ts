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
    status: 'present' | 'rest' | 'skipped' | 'future' | 'neutral';
    icon: string;
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

    currentDate = new Date(); // Points to the first day of the displayed month
    calendarDays: CalendarDay[] = [];
    weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    attendanceHistory: AttendanceRecord[] = [];
    loading = true;

    async ngOnInit() {
        this.currentDate = new Date();
        this.currentDate.setDate(1); // Start at first of month
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
        this.currentDate = new Date(this.currentDate); // Trigger change detection if needed
        this.generateCalendar();
    }

    generateCalendar() {
        this.calendarDays = [];
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        // Days from previous month to fill the first row
        const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) - 6 (Sat)

        const totalDays = lastDayOfMonth.getDate();

        // Add nulls or previous month days for padding
        for (let i = 0; i < startDayOfWeek; i++) {
            const prevDate = new Date(year, month, -startDayOfWeek + 1 + i);
            this.calendarDays.push(this.createDayObject(prevDate, false));
        }

        // Add days of current month
        for (let i = 1; i <= totalDays; i++) {
            const date = new Date(year, month, i);
            this.calendarDays.push(this.createDayObject(date, true));
        }
    }

    createDayObject(date: Date, isInCurrentMonth: boolean): CalendarDay {
        const today = new Date();
        const isToday = date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();

        // Don't calculate status for future dates
        if (date > today) {
            return {
                date,
                dayOfMonth: date.getDate(),
                status: 'future',
                icon: '',
                colorClass: 'future-day',
                isToday,
                isInCurrentMonth
            };
        }

        const { status, icon, colorClass } = this.calculateDayStatus(date);

        return {
            date,
            dayOfMonth: date.getDate(),
            status,
            icon,
            colorClass: isInCurrentMonth ? colorClass : 'other-month',
            isToday,
            isInCurrentMonth
        };
    }

    calculateDayStatus(date: Date): { status: 'present' | 'rest' | 'skipped' | 'neutral', icon: string, colorClass: string } {
        // Case A: Member was Present
        const wasPresent = this.isDateInHistory(date);

        if (wasPresent) {
            return { status: 'present', icon: 'check', colorClass: 'present-day' };
        }

        // Case B: Member was Absent
        // Check previous day
        const prevDate = new Date(date);
        prevDate.setDate(date.getDate() - 1);

        const wasPrevPresent = this.isDateInHistory(prevDate);

        // Sub-case B1: Rest Day (Previous Day was Present)
        if (wasPrevPresent) {
            return { status: 'rest', icon: 'bed', colorClass: 'rest-day' };
        }

        // Sub-case B2: Skipped (Previous Day was NOT Present)
        return { status: 'skipped', icon: 'close', colorClass: 'skipped-day' };
    }

    private isDateInHistory(date: Date): boolean {
        const dateStr = this.formatDate(date);
        return this.attendanceHistory.some(r => r.date === dateStr);
    }

    private formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`; // Matches YYYY-MM-DD from service
    }
}
