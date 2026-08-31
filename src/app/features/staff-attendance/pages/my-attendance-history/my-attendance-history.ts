import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { StaffAttendanceService, formatShiftSchedule, formatTime12Hour } from '../../../../core/services/staff-attendance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { StaffAttendanceRecord } from '../../../../core/models/staff-attendance.model';
import { fadeIn, staggerList } from '../../../../core/animations/animations';
import { Observable, map, shareReplay } from 'rxjs';

@Component({
  selector: 'app-my-attendance-history',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './my-attendance-history.html',
  styleUrl: './my-attendance-history.css',
  animations: [fadeIn, staggerList]
})
export class MyAttendanceHistoryComponent implements OnInit {
  private attendanceService = inject(StaffAttendanceService);
  private authService = inject(AuthService);

  formatShiftSchedule = formatShiftSchedule;
  formatTime12Hour = formatTime12Hour;

  historyRecords$: Observable<StaffAttendanceRecord[]> | null = null;

  totalWorkedHours$: Observable<number> | null = null;
  completedShiftsCount$: Observable<number> | null = null;
  totalOvertimeHours$: Observable<number> | null = null;
  totalDeficitMinutes$: Observable<number> | null = null;

  displayedColumns = [
    'date',
    'shiftName',
    'scheduledTimes',
    'checkInTime',
    'checkOutTime',
    'workedTime',
    'deficit',
    'overtime',
    'adjustmentStatus',
    'remarks'
  ];

  ngOnInit() {
    const user = this.authService.userProfile();
    if (user) {
      this.historyRecords$ = this.attendanceService.getStaffAttendanceHistory(user.uid).pipe(
        shareReplay(1)
      );

      this.totalWorkedHours$ = this.historyRecords$.pipe(
        map(records => {
          const totalMins = records.reduce((acc, r) => acc + (r.workedMinutes || 0), 0);
          return Math.round((totalMins / 60) * 10) / 10;
        })
      );

      this.completedShiftsCount$ = this.historyRecords$.pipe(
        map(records => records.filter(r => !!r.checkOutTime).length)
      );

      this.totalOvertimeHours$ = this.historyRecords$.pipe(
        map(records => records.reduce((acc, r) => acc + (r.overtimeHours || 0), 0))
      );

      this.totalDeficitMinutes$ = this.historyRecords$.pipe(
        map(records => records.reduce((acc, r) => acc + (r.deficitMinutes || 0), 0))
      );
    }
  }
}
