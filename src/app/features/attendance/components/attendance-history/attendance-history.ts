import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { AttendanceService } from '../../../../core/services/attendance.service';
import { AttendanceRecord } from '../../../../core/models/attendance.model';
import { Observable, switchMap, startWith, combineLatest } from 'rxjs';
import { fadeIn, staggerList } from '../../../../core/animations/animations';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-attendance-history',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatTableModule,
    MatDatepickerModule, MatNativeDateModule, MatFormFieldModule, MatInputModule,
    MatIconModule, MatProgressSpinnerModule
  ],
  templateUrl: './attendance-history.html',
  styleUrl: './attendance-history.css',
  animations: [fadeIn, staggerList]
})
export class AttendanceHistory {
  private attendanceService = inject(AttendanceService);

  dateControl = new FormControl(new Date());

  history$: Observable<AttendanceRecord[]> = combineLatest([
    this.dateControl.valueChanges.pipe(startWith(new Date())),
    this.attendanceService.refreshHistory$
  ]).pipe(
    switchMap(([date, _]) => {
      if (!date) return this.attendanceService.getHistoryByDate('');
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      return this.attendanceService.getHistoryByDate(dateStr);
    })
  );

  displayedColumns: string[] = ['name', 'lockerNumber', 'expiration', 'checkInTime', 'checkOutTime', 'status'];

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
}
