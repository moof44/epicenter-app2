import { Component, Input, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AttendanceService } from '../../../../core/services/attendance.service'; // Fixed path
import { AttendanceRecord } from '../../../../core/models/attendance.model'; // Fixed path
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-attendance-chart',
  imports: [CommonModule],
  template: `
    <div class="chart-container">
       <h3>Attendance Consistency</h3>
       <div class="calendar-grid">
          <div *ngFor="let day of calendarDays" 
               class="day-box" 
               [class.present]="day.present"
               [title]="day.date | date">
               <span class="day-number">{{day.date | date:'d'}}</span>
          </div>
       </div>
       <div class="legend">
          <span class="dot present"></span> Present
          <span class="dot"></span> Absent
       </div>
    </div>
  `,
  styles: [`
    .chart-container { padding: 1rem; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow-x: auto; }
    .calendar-grid { 
        display: grid; 
        grid-template-columns: repeat(7, minmax(30px, 1fr)); 
        gap: 4px; 
        margin-top: 1rem; 
        min-width: 250px;
    }
    .day-box { 
        aspect-ratio: 1; 
        background: #f1f5f9; 
        border-radius: 4px; 
        display: flex; 
        align-items: center; 
        justify-content: center;
        font-size: 0.8rem;
        color: #94a3b8;
    }
    .present { background-color: #4ade80; color: #064e3b; font-weight: bold; }
    .legend { display: flex; gap: 1rem; margin-top: 1rem; font-size: 0.9rem; color: #64748b; flex-wrap: wrap; }
    .dot { width: 10px; height: 10px; border-radius: 50%; background: #f1f5f9; display: inline-block; margin-right: 4px; }
    .dot.present { background: #4ade80; }
  `]
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
