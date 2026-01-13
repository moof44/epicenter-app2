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
  template: `
    <div class="container" [@fadeIn]>
       <div class="loading-shade" *ngIf="!(activeSessions$ | async)">
          <mat-spinner diameter="40"></mat-spinner>
       </div>

       <ng-container *ngIf="activeSessions$ | async as sessions">
           <!-- Desktop Table -->
           <div class="desktop-view table-container">
             <table mat-table [dataSource]="sessions" class="full-width-table" [@staggerList]>
                
                <!-- Name Column -->
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef> Member </th>
                  <td mat-cell *matCellDef="let record"> 
                    <div class="name">{{record.memberName}}</div>
                    <div class="gender-badge">{{record.memberGender}}</div>
                  </td>
                </ng-container>

                <!-- Remarks Column -->
                <ng-container matColumnDef="remarks">
                  <th mat-header-cell *matHeaderCellDef> Remarks </th>
                  <td mat-cell *matCellDef="let record">
                     <div *ngIf="record.memberRemarks" class="remarks-cell">
                        <mat-icon style="font-size:16px; width:16px; height:16px; vertical-align:middle; color:#f59e0b; margin-right:4px;">warning</mat-icon>
                        {{record.memberRemarks | slice:0:20}}{{record.memberRemarks.length > 20 ? '...' : ''}}
                     </div>
                     <span *ngIf="!record.memberRemarks">-</span>
                  </td>
                </ng-container>

                <!-- Check In Time -->
                <ng-container matColumnDef="checkInTime">
                  <th mat-header-cell *matHeaderCellDef> Time In </th>
                  <td mat-cell *matCellDef="let record"> 
                     {{ record.checkInTime.seconds * 1000 | date:'shortTime' }}
                     <mat-icon *ngIf="isOverdue(record.checkInTime)" class="overdue-icon" matTooltip="Checked in > 3 hours. Check out?">history</mat-icon>
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
                <tr mat-row *matRowDef="let row; columns: displayedColumns;" [class.overdue-row]="isOverdue(row.checkInTime)"></tr>
             </table>
           </div>

           <!-- Mobile Card List -->
           <div class="mobile-view card-list" [@staggerList]>
              <div class="session-card" *ngFor="let record of sessions" [class.overdue-card]="isOverdue(record.checkInTime)">
                  <div class="card-header">
                      <div class="member-info">
                          <span class="name">{{record.memberName}}</span>
                          <span class="gender-badge">{{record.memberGender}}</span>
                      </div>
                      <span *ngIf="record.lockerNumber" class="locker-badge">#{{record.lockerNumber}}</span>
                  </div>
                  
                  <div class="card-details">
                      <div class="detail-row">
                          <mat-icon class="icon">schedule</mat-icon>
                          <span>In: {{ record.checkInTime.seconds * 1000 | date:'shortTime' }}</span>
                          <mat-icon *ngIf="isOverdue(record.checkInTime)" class="overdue-icon">history</mat-icon>
                      </div>
                      <div class="detail-row" *ngIf="record.memberExpiration">
                          <mat-icon class="icon">event</mat-icon>
                          <span [class.expired]="isExpired(record.memberExpiration)">
                              Exp: {{ record.memberExpiration.seconds * 1000 | date:'shortDate' }}
                          </span>
                      </div>
                       <div class="detail-row" *ngIf="record.memberRemarks">
                          <mat-icon class="icon warn-icon">warning</mat-icon>
                          <span class="remarks-text">{{record.memberRemarks}}</span>
                      </div>
                  </div>

                  <div class="card-actions">
                      <button mat-flat-button color="warn" (click)="checkOut(record)" class="full-width-btn">
                          CHECK OUT
                      </button>
                  </div>
              </div>
           </div>
           
           <div *ngIf="sessions.length === 0" class="empty-state">
              No members currently checked in.
           </div>
       </ng-container>
    </div>
  `,
  styles: [`
    .container { position: relative; min-height: 200px; }
    
    /* Desktop Styles */
    .table-container { 
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); 
        border-radius: 8px; 
        overflow: hidden; 
        overflow-x: auto; 
    }
    .full-width-table { width: 100%; min-width: 500px; background: white; }
    
    /* Shared Styles */
    .name { font-weight: 500; font-size: 1rem; }
    .gender-badge { font-size: 0.8em; color: gray; }
    .locker-badge { background: #e0f2fe; color: #0284c7; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.9em; }
    .empty-state { padding: var(--spacing-xl); text-align: center; color: gray; background: white; border-radius: 8px; margin-top: 16px; }
    .expired { color: #ef4444; font-weight: bold; }
    .overdue-row { background-color: #fff3cd !important; }
    .overdue-card { border-left: 4px solid #d97706 !important; background-color: #fffbef; }
    .overdue-icon { color: #d97706; margin-left: 8px; vertical-align: middle; font-size: 18px; width: 18px; height: 18px; }
    .warn-icon { color: #f59e0b; }

    /* Mobile Styles */
    .mobile-view { display: none; }
    .session-card {
        background: white;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        border: 1px solid #e2e8f0;
    }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .member-info { display: flex; flex-direction: column; }
    .card-details { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .detail-row { display: flex; align-items: center; color: #64748b; font-size: 0.95rem; }
    .detail-row .icon { font-size: 18px; width: 18px; height: 18px; margin-right: 8px; color: #94a3b8; }
    .full-width-btn { width: 100%; padding: 24px 0; font-size: 1.1rem; }
    .remarks-text { color: #b45309; font-size: 0.9em; }

    @media (max-width: 768px) {
        .desktop-view { display: none; }
        .mobile-view { display: block; }
    }
  `],
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
