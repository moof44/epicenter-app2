import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { AttendanceService } from '../../../../core/services/attendance.service';
import { AttendanceRecord } from '../../../../core/models/attendance.model';
import { Observable, firstValueFrom } from 'rxjs';
import { fadeIn, staggerList } from '../../../../core/animations/animations';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { getRandomCommendation } from '../../../../core/constants/commendations';
import { ConfirmationDialog } from '../../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-active-sessions',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatProgressSpinnerModule, MatSnackBarModule
  ],
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

  getMemberInitials(name?: string): string {
    if (!name) return 'MB';
    return name
      .split(' ')
      .filter(p => p.length > 0)
      .slice(0, 2)
      .map(p => p[0].toUpperCase())
      .join('');
  }

  isExpired(timestamp: Date | null): boolean {
    if (!timestamp) return false;
    const exp = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return exp < today;
  }

  isOverdue(checkInTime: Date): boolean {
    if (!checkInTime) return false;
    const checkIn = checkInTime instanceof Date ? checkInTime : new Date(checkInTime);
    const now = new Date();
    const diffMs = now.getTime() - checkIn.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours >= 3;
  }

  async checkOut(record: AttendanceRecord) {
    if (!record.id) return;

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
