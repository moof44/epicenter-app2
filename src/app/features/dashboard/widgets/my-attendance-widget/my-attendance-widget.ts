import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { StaffAttendanceService } from '../../../../core/services/staff-attendance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { safeToDate } from '../../../../core/utils/date.utils';
import { StaffAttendanceRecord } from '../../../../core/models/staff-attendance.model';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-my-attendance-widget',
    standalone: true,
    imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterLink],
    templateUrl: './my-attendance-widget.html',
    styleUrl: './my-attendance-widget.css'
})
export class MyAttendanceWidgetComponent implements OnInit {
    private attendanceService = inject(StaffAttendanceService);
    private authService = inject(AuthService);

    todayRecord = signal<StaffAttendanceRecord | null>(null);
    daysPresentThisWeek = signal<number>(0);
    totalWorkedHoursThisWeek = signal<number>(0);

    async ngOnInit() {
        const user = this.authService.userProfile();
        if (!user) return;

        try {
            const records = await firstValueFrom(this.attendanceService.getStaffAttendanceHistory(user.uid, 30));
            const manilaToday = this.attendanceService.getManilaTodayStr();
            const todayRec = records.find(r => r.date === manilaToday);
            this.todayRecord.set(todayRec || null);

            // Compute this week's hours
            const sunday = new Date(this.attendanceService.getManilaNow());
            sunday.setDate(sunday.getDate() - sunday.getDay());
            const sunStr = this.attendanceService.getManilaTodayStr();

            const thisWeekRecs = records.filter(r => r.date >= sunStr);
            this.daysPresentThisWeek.set(thisWeekRecs.length);

            const totalMins = thisWeekRecs.reduce((sum, r) => sum + (r.workedMinutes || 0), 0);
            this.totalWorkedHoursThisWeek.set(Math.round((totalMins / 60) * 10) / 10);
        } catch (err) {
            console.error('Error loading my attendance widget:', err);
        }
    }
}
