import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AttendanceService } from '../../../../core/services/attendance.service'; // Fixed path
import { AttendanceRecord } from '../../../../core/models/attendance.model'; // Fixed path
import { Observable, switchMap, startWith, combineLatest } from 'rxjs';
import { fadeIn, staggerList } from '../../../../core/animations/animations'; // Fixed path

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-attendance-history',
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatTableModule,
    MatDatepickerModule, MatNativeDateModule, MatFormFieldModule, MatInputModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="history-container" [@fadeIn]>
       <div class="filters">
         <mat-form-field appearance="outline">
            <mat-label>Select Date</mat-label>
            <input matInput [matDatepicker]="picker" [formControl]="dateControl">
            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
         </mat-form-field>
       </div>

       <div class="table-wrapper">
         <div class="loading-shade" *ngIf="!(history$ | async)">
            <mat-spinner diameter="40"></mat-spinner>
         </div>
         
         <ng-container *ngIf="history$ | async as history">
             <!-- Desktop View -->
             <div class="desktop-view">
                <table mat-table [dataSource]="history" class="full-width-table" [@staggerList]>
                    <!-- Name -->
                    <ng-container matColumnDef="name">
                    <th mat-header-cell *matHeaderCellDef> Member </th>
                    <td mat-cell *matCellDef="let record"> {{record.memberName}} </td>
                    </ng-container>
                    
                    <!-- In -->
                    <ng-container matColumnDef="checkInTime">
                    <th mat-header-cell *matHeaderCellDef> Time In </th>
                    <td mat-cell *matCellDef="let record"> {{ record.checkInTime.seconds * 1000 | date:'shortTime' }} </td>
                    </ng-container>

                    <!-- Locker -->
                    <ng-container matColumnDef="lockerNumber">
                    <th mat-header-cell *matHeaderCellDef> Locker </th>
                    <td mat-cell *matCellDef="let record"> 
                        <span *ngIf="record.lockerNumber">#{{record.lockerNumber}}</span>
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

                    <!-- Out -->
                    <ng-container matColumnDef="checkOutTime">
                    <th mat-header-cell *matHeaderCellDef> Time Out </th>
                    <td mat-cell *matCellDef="let record"> 
                        {{ record.checkOutTime ? (record.checkOutTime.seconds * 1000 | date:'shortTime') : '-' }} 
                    </td>
                    </ng-container>

                    <!-- Status -->
                    <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef> Status </th>
                    <td mat-cell *matCellDef="let record"> {{record.status}} </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
                </table>
             </div>

             <!-- Mobile Card View -->
             <div class="mobile-view card-list" [@staggerList]>
                <div class="history-card" *ngFor="let record of history">
                    <div class="card-header">
                        <span class="name">{{record.memberName}}</span>
                        <span class="status-badge" [class.status-active]="!record.checkOutTime">{{record.status}}</span>
                    </div>

                    <div class="card-details">
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="label">Time In</span>
                                <span class="value">{{ record.checkInTime.seconds * 1000 | date:'shortTime' }}</span>
                            </div>
                            <div class="detail-item">
                                <span class="label">Time Out</span>
                                <span class="value">{{ record.checkOutTime ? (record.checkOutTime.seconds * 1000 | date:'shortTime') : '-' }}</span>
                            </div>
                            <div class="detail-item" *ngIf="record.lockerNumber">
                                <span class="label">Locker</span>
                                <span class="value">#{{record.lockerNumber}}</span>
                            </div>
                            <div class="detail-item" *ngIf="record.memberExpiration">
                                <span class="label">Expiry</span>
                                <span class="value" [class.expired]="isExpired(record.memberExpiration)">
                                    {{ record.memberExpiration.seconds * 1000 | date:'shortDate' }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
             </div>
             
             <div *ngIf="history.length === 0" class="empty-state">
                No records found for this date.
             </div>
         </ng-container>
       </div>
    </div>
  `,
  styles: [`
    .history-container { padding-top: var(--spacing-md); }
    .filters { margin-bottom: var(--spacing-md); }
    .table-wrapper { 
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); 
        border-radius: 8px; 
        overflow: hidden; 
        overflow-x: auto;
        min-height: 200px;
        position: relative;
        background: white;
    }

    /* Desktop Styles */
    .full-width-table { width: 100%; min-width: 500px; background: white; }
    
    .empty-state { padding: var(--spacing-xl); text-align: center; color: gray; background: white; }
    .expired { color: #ef4444; font-weight: bold; }

    /* Mobile Styles */
    .mobile-view { display: none; padding: 16px; background: #f8fafc; }
    .history-card {
        background: white;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        border: 1px solid #e2e8f0;
    }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
    .name { font-weight: 600; font-size: 1rem; color: #0f172a; }
    .status-badge { font-size: 0.75rem; padding: 2px 8px; background: #e2e8f0; border-radius: 12px; color: #64748b; font-weight: 500; }
    .status-active { background: #dcfce7; color: #166534; }
    
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .detail-item { display: flex; flex-direction: column; }
    .label { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
    .value { font-size: 0.9rem; color: #334155; font-weight: 500; }

    @media (max-width: 768px) {
        .desktop-view { display: none; }
        .mobile-view { display: block; }
        .table-wrapper { background: transparent; box-shadow: none; border-radius: 0; }
        .full-width-table { display: none; } /* Redundant but safe */
    }
  `],
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

  isExpired(timestamp: any): boolean {
    if (!timestamp) return false;
    const exp = new Date(timestamp.seconds * 1000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return exp < today;
  }
}
