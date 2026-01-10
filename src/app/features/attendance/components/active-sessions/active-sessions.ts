import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { AttendanceService } from '../../../../core/services/attendance.service'; // Fixed path
import { AttendanceRecord } from '../../../../core/models/attendance.model'; // Fixed path
import { Observable } from 'rxjs';
import { fadeIn, staggerList } from '../../../../core/animations/animations'; // Fixed path

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { getRandomCommendation } from '../../../../core/constants/commendations';

@Component({
  selector: 'app-active-sessions',
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatChipsModule, MatProgressSpinnerModule, MatSnackBarModule],
  template: `
    <div class="table-container" [@fadeIn]>
       <div class="loading-shade" *ngIf="!(activeSessions$ | async)">
          <mat-spinner diameter="40"></mat-spinner>
       </div>

       <ng-container *ngIf="activeSessions$ | async as sessions">
           <table mat-table [dataSource]="sessions" class="full-width-table" [@staggerList]>
              
              <!-- Name Column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef> Member </th>
                <td mat-cell *matCellDef="let record"> 
                  <div class="name">{{record.memberName}}</div>
                  <div class="gender-badge">{{record.memberGender}}</div>
                </td>
              </ng-container>

              <!-- Check In Time -->
              <ng-container matColumnDef="checkInTime">
                <th mat-header-cell *matHeaderCellDef> Time In </th>
                <td mat-cell *matCellDef="let record"> 
                   {{ record.checkInTime.seconds * 1000 | date:'shortTime' }}
                </td>
              </ng-container>

              <!-- Locker -->
              <ng-container matColumnDef="locker">
                <th mat-header-cell *matHeaderCellDef> Locker </th>
                <td mat-cell *matCellDef="let record"> 
                   <span *ngIf="record.lockerNumber" class="locker-badge">#{{record.lockerNumber}}</span>
                   <span *ngIf="!record.lockerNumber">-</span>
                </td>
              </ng-container>

              <!-- Expiration -->
              <ng-container matColumnDef="expiration">
                <th mat-header-cell *matHeaderCellDef> Expiration </th>
                <td mat-cell *matCellDef="let record"> 
                   <span *ngIf="record.memberExpiration" [class.expired]="isExpired(record.memberExpiration)">
                       {{ record.memberExpiration.seconds * 1000 | date:'shortDate' }}
                   </span>
                   <span *ngIf="!record.memberExpiration">-</span>
                </td>
              </ng-container>

              <!-- Actions -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef> Actions </th>
                <td mat-cell *matCellDef="let record">
                   <button mat-flat-button color="warn" (click)="checkOut(record)">
                     CHECK OUT
                   </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
           </table>
           
           <div *ngIf="sessions.length === 0" class="empty-state">
              No members currently checked in.
           </div>
       </ng-container>
    </div>
  `,
  styles: [`
    .table-container { 
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); 
        border-radius: 8px; 
        overflow: hidden; 
        overflow-x: auto; 
        min-height: 200px;
        position: relative;
    }

    .full-width-table { width: 100%; min-width: 500px; background: white; }
    .name { font-weight: 500; }
    .gender-badge { font-size: 0.8em; color: gray; }
    .locker-badge { background: #e0f2fe; color: #0284c7; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
    .empty-state { padding: var(--spacing-xl); text-align: center; color: gray; background: white; }
    .expired { color: #ef4444; font-weight: bold; }
  `],
  animations: [fadeIn, staggerList]
})
export class ActiveSessions {
  private attendanceService = inject(AttendanceService);
  private snackBar = inject(MatSnackBar);

  activeSessions$: Observable<AttendanceRecord[]> = this.attendanceService.getActiveCheckIns();
  displayedColumns: string[] = ['name', 'checkInTime', 'locker', 'expiration', 'actions'];

  isExpired(timestamp: any): boolean {
    if (!timestamp) return false;
    const exp = new Date(timestamp.seconds * 1000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return exp < today;
  }

  async checkOut(record: AttendanceRecord) {
    if (!record.id) return;
    await this.attendanceService.checkOut(record.id);

    const message = getRandomCommendation('CHECKOUT');
    this.snackBar.open(`${message}`, 'Close', { duration: 5000 });
  }
}
