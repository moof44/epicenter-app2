import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { StaffAttendanceService } from '../../../../core/services/staff-attendance.service';
import { StaffKioskDialogComponent } from './staff-kiosk-dialog';

@Component({
    selector: 'app-staff-kiosk-widget',
    standalone: true,
    imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatDialogModule],
    templateUrl: './staff-kiosk-widget.html',
    styleUrl: './staff-kiosk-widget.css'
})
export class StaffKioskWidgetComponent implements OnInit {
    private attendanceService = inject(StaffAttendanceService);
    private dialog = inject(MatDialog);

    isAuthorized = signal<boolean>(false);
    deviceName = signal<string>('Attendance Terminal');

    async ngOnInit() {
        const authorized = await this.attendanceService.isCurrentDeviceAuthorized();
        this.isAuthorized.set(authorized);
        if (authorized) {
            this.deviceName.set(this.attendanceService.getLocalDeviceName());
        }
    }

    openKioskModal() {
        this.dialog.open(StaffKioskDialogComponent, {
            width: '520px',
            disableClose: true,
            panelClass: 'staff-kiosk-dialog-panel'
        });
    }
}
