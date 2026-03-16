import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { AttendanceService } from '../../../../core/services/attendance.service'; // Fixed path
import { AttendanceRecord } from '../../../../core/models/attendance.model'; // Fixed path
import { Observable, firstValueFrom } from 'rxjs';
import { fadeIn, staggerList } from '../../../../core/animations/animations'; // Fixed path

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { getRandomCommendation } from '../../../../core/constants/commendations';
import { ConfirmationDialog } from '../../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-active-sessions',
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatChipsModule, MatProgressSpinnerModule, MatSnackBarModule],
  templateUrl: './active-sessions.html',
  styleUrl: './active-sessions.css',
  animations: [fadeIn, staggerList]
})
export class ActiveSessions {
  private attendanceService = inject(AttendanceService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  activeSessions$: Observable<AttendanceRecord[]> = this.attendanceService.getActiveCheckIns();
  displayedColumns: string[] = ['name', 'remarks', 'checkInTime', 'locker', 'expiration', 'actions'];

  isExpired(timestamp: any): boolean {
    if (!timestamp) return false;
    const exp = new Date(timestamp.seconds * 1000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return exp < today;
  }

  isOverdue(checkInTime: any): boolean {
    if (!checkInTime) return false;
    const checkIn = new Date(checkInTime.seconds * 1000);
    const now = new Date();
    const diffMs = now.getTime() - checkIn.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours >= 3;
  }

  async checkOut(record: AttendanceRecord) {
    if (!record.id) return;

    // Locker Key Confirmation
    if (record.lockerNumber) {
      const dialogRef = this.dialog.open(ConfirmationDialog, {
        data: {
          title: 'Locker Key Returned?',
          message: `Please confirm that you have retrieved Locker Key #${record.lockerNumber} from ${record.memberName}.`,
          confirmText: 'Yes, Retrieved',
          cancelText: 'Cancel'
        }
      });

      const result = await firstValueFrom(dialogRef.afterClosed());
      if (!result) return;
    }

    await this.attendanceService.checkOut(record.id);

    const message = getRandomCommendation('CHECKOUT');
    this.snackBar.open(`${message}`, 'Close', { duration: 5000 });
  }
}
