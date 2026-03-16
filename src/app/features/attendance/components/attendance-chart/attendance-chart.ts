import { Component, Input, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AttendanceService } from '../../../../core/services/attendance.service'; // Fixed path
import { AttendanceRecord } from '../../../../core/models/attendance.model'; // Fixed path
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-attendance-chart',
  imports: [CommonModule],
  templateUrl: './attendance-chart.html',
  styleUrl: './attendance-chart.css'
})
export class AttendanceChart implements OnChanges {
    @Input() memberId!: string;
    
    private attendanceService = inject(AttendanceService);
    calendarDays: {date: Date, present: boolean}[] = [];

    ngOnChanges(changes: SimpleChanges) {
        if (changes['memberId'] && this.memberId) {
            this.loadAttendance_();
        }
    }

    async loadAttendance_() {
        if (!this.memberId) return;
        try {
            const records = await this.attendanceService.getMemberAttendance(this.memberId);
            this.generateCalendar(records);
        } catch (error) {
            console.error('Error loading attendance chart:', error);
            // Optionally handle error UI
        }
    }

    generateCalendar(records: AttendanceRecord[]) {
        const today = new Date();
        const days = [];
        // Generate last 28 days (4 weeks)
        for (let i = 27; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            
            const isPresent = records.some(r => r.date === dateStr);
            days.push({ date: d, present: isPresent });
        }
        this.calendarDays = days;
    }
}
