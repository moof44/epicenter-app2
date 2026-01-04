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
import { Observable, switchMap, startWith } from 'rxjs';
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
    }

    .full-width-table { width: 100%; min-width: 500px; background: white; }
    .empty-state { padding: var(--spacing-xl); text-align: center; color: gray; background: white; }
    .expired { color: #ef4444; font-weight: bold; }
  `],
  animations: [fadeIn, staggerList]
})
export class AttendanceHistory {
  private attendanceService = inject(AttendanceService);

  dateControl = new FormControl(new Date());

  history$: Observable<AttendanceRecord[]> = this.dateControl.valueChanges.pipe(
    startWith(new Date()),
    switchMap(date => {
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
