import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { StaffAttendanceService } from '../../../../core/services/staff-attendance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { StaffAttendanceRecord } from '../../../../core/models/staff-attendance.model';
import { fadeIn } from '../../../../core/animations/animations';
import { Observable } from 'rxjs';

@Component({
    selector: 'app-my-attendance-history',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatTooltipModule
    ],
    templateUrl: './my-attendance-history.html',
    styleUrl: './my-attendance-history.css',
    animations: [fadeIn]
})
export class MyAttendanceHistoryComponent implements OnInit {
    private attendanceService = inject(StaffAttendanceService);
    private authService = inject(AuthService);

    historyRecords$: Observable<StaffAttendanceRecord[]> | null = null;

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
            this.historyRecords$ = this.attendanceService.getStaffAttendanceHistory(user.uid);
        }
    }
}
