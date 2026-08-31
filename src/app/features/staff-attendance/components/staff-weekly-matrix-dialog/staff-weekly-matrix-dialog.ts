import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { StaffWeeklyAttendanceSummary, StaffAttendanceRecord } from '../../../../core/models/staff-attendance.model';
import { AttendanceRecordDialogComponent } from '../attendance-record-dialog/attendance-record-dialog';
import { StaffAttendanceService } from '../../../../core/services/staff-attendance.service';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface StaffWeeklyMatrixDialogData {
  summary: StaffWeeklyAttendanceSummary;
  refreshCallback: () => void;
}

@Component({
  selector: 'app-staff-weekly-matrix-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  template: `
    <div class="matrix-modal-container">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="modal-title-group">
          <div class="avatar-seal">
            {{ summary.staffName.charAt(0).toUpperCase() }}
          </div>
          <div class="title-meta">
            <h2 class="text-white">{{ summary.staffName }} — 7-Day Attendance Matrix</h2>
            <div class="role-pills-wrap">
              <span class="role-mini-pill font-mono" *ngFor="let r of summary.roles">{{ r }}</span>
              <span class="flag-chip missed" *ngIf="summary.hasMissedCheckout">Missed Checkout</span>
              <span class="flag-chip pending" *ngIf="summary.hasPendingAdjustment">Pending Adjustment</span>
            </div>
          </div>
        </div>
        <button type="button" class="btn-modal-close" (click)="dialogRef.close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Quick Summary Stats Strip -->
      <div class="summary-stats-strip font-mono">
        <div class="stat-pill">
          <span class="lbl text-muted">Days Present</span>
          <strong class="val text-cyan">{{ summary.daysPresent }} / 7 Days</strong>
        </div>
        <div class="stat-pill">
          <span class="lbl text-muted">Late</span>
          <strong class="val text-gold">{{ summary.totalLateMinutes }}m</strong>
        </div>
        <div class="stat-pill">
          <span class="lbl text-muted">Early</span>
          <strong class="val text-mint">+{{ summary.totalEarlyMinutes }}m</strong>
        </div>
        <div class="stat-pill">
          <span class="lbl text-muted">Deficit</span>
          <strong class="val text-rose">{{ summary.totalDeficitMinutes > 0 ? (summary.totalDeficitMinutes + 'm') : '0m' }}</strong>
        </div>
        <div class="stat-pill">
          <span class="lbl text-muted">Overtime</span>
          <strong class="val text-purple">{{ summary.totalOvertimeHours > 0 ? (summary.totalOvertimeHours + 'h') : '0h' }}</strong>
        </div>
        <div class="stat-pill total-pay-pill">
          <span class="lbl text-muted">Week Compensation</span>
          <strong class="val text-gold">₱{{ summary.totalCompensation | number:'1.2-2' }}</strong>
        </div>
      </div>

      <!-- 7-Day Matrix Grid -->
      <div class="dialog-scroll-content">
        <div class="matrix-grid">
          <div class="day-card" *ngFor="let day of summary.dailyMatrix" [class.absent]="!day.isPresent">
            <div class="day-header">
              <span class="day-name text-white font-bold">{{ day.dayName }}</span>
              <span class="day-date font-mono text-muted">{{ day.date | date:'MMM d' }}</span>
            </div>

            <!-- Present Day Body -->
            <div class="day-body" *ngIf="day.isPresent && day.record">
              <div class="shift-tag text-cyan font-bold font-mono">{{ day.record.shiftName }}</div>
              
              <div class="time-row font-mono">
                <span class="text-muted">In:</span>
                <strong class="text-white">{{ day.record.checkInTime | date:'h:mm a':'Asia/Manila' }}</strong>
              </div>

              <div class="time-row font-mono">
                <span class="text-muted">Out:</span>
                <strong *ngIf="day.record.checkOutTime" class="text-white">{{ day.record.checkOutTime | date:'h:mm a':'Asia/Manila' }}</strong>
                <span *ngIf="!day.record.checkOutTime" class="warn-text">Missing Out</span>
              </div>

              <div class="metrics-row font-mono">
                <span *ngIf="day.record.lateMinutes > 0" class="warn-text">Late {{ day.record.lateMinutes }}m</span>
                <span *ngIf="day.record.earlyMinutes > 0" class="success-text">Early {{ day.record.earlyMinutes }}m</span>
              </div>

              <div class="ot-deficit-row font-mono">
                <span *ngIf="day.deficitMinutes > 0" class="danger-text">Deficit {{ day.deficitMinutes }}m</span>
                <span *ngIf="day.overtimeHours > 0" class="ot-text">OT {{ day.overtimeHours }}h</span>
              </div>

              <div class="remarks-chips" *ngIf="day.remarks.length > 0">
                <span class="mini-chip" *ngFor="let rem of day.remarks">{{ rem }}</span>
              </div>

              <div class="day-card-actions">
                <button type="button" class="card-mini-btn" (click)="openEditRecord(day.record)" title="Edit Record">
                  <mat-icon>edit</mat-icon>
                </button>
                <button type="button" class="card-mini-btn warn-btn" (click)="deleteRecord(day.record)" title="Delete Record">
                  <mat-icon>delete_outline</mat-icon>
                </button>
              </div>
            </div>

            <!-- Absent Day Body -->
            <div class="day-body absent-body" *ngIf="!day.isPresent">
              <span class="absent-label text-muted">Absent / Off</span>
              <button type="button" class="add-log-btn" (click)="openAddRecord(summary.staffId, day.date)">
                <mat-icon>add</mat-icon> Log Entry
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <button type="button" class="btn-close-modal" (click)="dialogRef.close()">Done</button>
      </div>
    </div>
  `,
  styles: [`
    .matrix-modal-container {
      background: var(--color-surface, #1e293b);
      border: 1.5px solid var(--color-border, #334155);
      border-radius: var(--radius-2xl, 16px);
      width: 100%;
      box-sizing: border-box;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .modal-header {
      padding: 16px 20px;
      background: rgba(15, 23, 42, 0.95);
      border-bottom: 1.5px solid var(--color-border, #334155);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-title-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .avatar-seal {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-full, 9999px);
      background: rgba(6, 182, 212, 0.18);
      border: 1.5px solid var(--color-cyan-light, #22d3ee);
      color: var(--color-cyan-light, #22d3ee);
      font-weight: var(--font-weight-black, 900);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    .title-meta h2 {
      margin: 0;
      font-size: var(--font-size-base, 16px);
      font-weight: var(--font-weight-black, 900);
    }
    .role-pills-wrap {
      display: flex;
      gap: 4px;
      margin-top: 2px;
      flex-wrap: wrap;
    }
    .role-mini-pill {
      font-size: 9px;
      font-weight: var(--font-weight-bold, 700);
      background: var(--color-surface-alt, #243247);
      border: 1px solid var(--color-border, #334155);
      color: var(--color-cyan-light, #22d3ee);
      padding: 1px 6px;
      border-radius: var(--radius-full, 9999px);
      text-transform: uppercase;
    }
    .flag-chip {
      font-size: 9px;
      font-weight: var(--font-weight-bold, 700);
      padding: 1px 6px;
      border-radius: var(--radius-full, 9999px);
    }
    .flag-chip.missed { background: rgba(248, 113, 113, 0.2); color: var(--color-rose-danger, #f87171); border: 1px solid rgba(248, 113, 113, 0.5); }
    .flag-chip.pending { background: rgba(245, 158, 11, 0.2); color: var(--color-gold-light, #fbbf24); border: 1px solid rgba(245, 158, 11, 0.5); }

    .btn-modal-close {
      background: transparent;
      border: none;
      color: var(--color-text-secondary, #cbd5e1);
      cursor: pointer;
    }
    .btn-modal-close:hover { color: #ffffff; }

    .summary-stats-strip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
      gap: 8px;
      padding: 12px 20px;
      background: var(--color-canvas, #090d16);
      border-bottom: 1px solid var(--color-border, #334155);
    }
    .stat-pill {
      background: var(--color-surface, #1e293b);
      border: 1px solid var(--color-border, #334155);
      border-radius: var(--radius-lg, 8px);
      padding: 6px 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .stat-pill .lbl { font-size: 9px; text-transform: uppercase; }
    .stat-pill .val { font-size: 13px; font-weight: var(--font-weight-black, 900); }
    .total-pay-pill { border-color: rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.08); }

    .dialog-scroll-content {
      padding: 16px 20px;
      max-height: 65vh;
      overflow-y: auto;
    }

    .matrix-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 8px;
    }

    .day-card {
      background: var(--color-canvas, #090d16);
      border: 1.5px solid var(--color-border, #334155);
      border-radius: var(--radius-xl, 12px);
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 11px;
    }
    .day-card.absent { background: rgba(15, 23, 42, 0.4); border-style: dashed; opacity: 0.7; }

    .day-header { display: flex; justify-content: space-between; border-bottom: 1px solid rgba(51, 65, 85, 0.4); padding-bottom: 4px; }
    .day-name { font-size: 11px; }
    .day-date { font-size: 10px; }

    .day-body { display: flex; flex-direction: column; gap: 4px; }
    .shift-tag { font-size: 10px; text-transform: uppercase; }
    .time-row { display: flex; justify-content: space-between; font-size: 11px; }
    .metrics-row, .ot-deficit-row { display: flex; justify-content: space-between; font-size: 10px; }

    .remarks-chips { display: flex; gap: 4px; flex-wrap: wrap; }
    .mini-chip { font-size: 9px; font-weight: var(--font-weight-bold, 700); background: var(--color-surface-alt, #243247); color: var(--color-text-secondary, #cbd5e1); padding: 1px 4px; border-radius: var(--radius-full, 9999px); }

    .day-card-actions { display: flex; justify-content: flex-end; gap: 4px; margin-top: 4px; }
    .card-mini-btn { background: transparent; border: 1px solid var(--color-border, #334155); color: var(--color-text-secondary, #cbd5e1); border-radius: var(--radius-full, 9999px); width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
    .card-mini-btn mat-icon { font-size: 14px !important; width: 14px !important; height: 14px !important; }
    .card-mini-btn.warn-btn:hover { color: var(--color-rose-danger, #f87171); border-color: var(--color-rose-danger, #f87171); }

    .absent-body { padding: 14px 0; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; }
    .absent-label { font-size: 11px; }
    .add-log-btn { background: rgba(6, 182, 212, 0.15); border: 1px solid rgba(6, 182, 212, 0.4); color: var(--color-cyan-light, #22d3ee); font-size: 10px; font-weight: var(--font-weight-bold, 700); padding: 4px 10px; border-radius: var(--radius-full, 9999px); cursor: pointer; display: inline-flex; align-items: center; gap: 2px; }
    .add-log-btn mat-icon { font-size: 14px !important; width: 14px !important; height: 14px !important; }

    .modal-footer {
      padding: 12px 20px;
      background: rgba(15, 23, 42, 0.95);
      border-top: 1px solid var(--color-border, #334155);
      display: flex;
      justify-content: flex-end;
    }
    .btn-close-modal {
      background: var(--color-surface, #1e293b);
      border: 1px solid var(--color-border, #334155);
      color: #ffffff;
      font-size: 12px;
      font-weight: var(--font-weight-bold, 700);
      border-radius: var(--radius-full, 9999px);
      padding: 6px 20px;
      cursor: pointer;
    }

    @media (max-width: 900px) {
      .matrix-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 600px) {
      .matrix-grid { grid-template-columns: 1fr; }
      .summary-stats-strip { grid-template-columns: repeat(2, 1fr); }
    }

    .font-mono { font-family: var(--font-family-mono); }
    .font-bold { font-weight: var(--font-weight-bold, 700); }
    .text-white { color: #ffffff !important; }
    .text-cyan { color: var(--color-cyan-light, #22d3ee) !important; }
    .text-mint { color: var(--color-mint-success, #34d399) !important; }
    .text-gold { color: var(--color-gold-light, #fbbf24) !important; }
    .text-rose { color: var(--color-rose-danger, #f87171) !important; }
    .text-purple { color: #c084fc !important; }
    .text-muted { color: var(--color-text-secondary, #cbd5e1) !important; }
    .warn-text { color: var(--color-gold-light, #fbbf24) !important; font-weight: var(--font-weight-bold, 700); }
    .danger-text { color: var(--color-rose-danger, #f87171) !important; font-weight: var(--font-weight-bold, 700); }
    .success-text { color: var(--color-mint-success, #34d399) !important; font-weight: var(--font-weight-bold, 700); }
    .ot-text { color: #c084fc !important; font-weight: var(--font-weight-bold, 700); }
  `]
})
export class StaffWeeklyMatrixDialogComponent implements OnInit {
  dialogRef = inject(MatDialogRef<StaffWeeklyMatrixDialogComponent>);
  private dialog = inject(MatDialog);
  private attendanceService = inject(StaffAttendanceService);
  private snackBar = inject(MatSnackBar);
  private data = inject<StaffWeeklyMatrixDialogData>(MAT_DIALOG_DATA);

  summary!: StaffWeeklyAttendanceSummary;

  ngOnInit() {
    this.summary = this.data.summary;
  }

  openEditRecord(record: StaffAttendanceRecord) {
    const ref = this.dialog.open(AttendanceRecordDialogComponent, {
      width: '500px',
      panelClass: 'dark-pro-dialog',
      data: {
        record,
        staffId: this.summary.staffId,
        staffName: this.summary.staffName
      }
    });

    ref.afterClosed().subscribe(res => {
      if (res) {
        this.data.refreshCallback();
        this.dialogRef.close(true);
      }
    });
  }

  deleteRecord(record: StaffAttendanceRecord) {
    if (!record.id) return;
    if (confirm(`Are you sure you want to delete the check-in record for ${this.summary.staffName} on ${record.date}?`)) {
      this.attendanceService.deleteAttendanceRecord(record.id).then(() => {
        this.snackBar.open('Record deleted successfully', 'Close', { duration: 3000 });
        this.data.refreshCallback();
        this.dialogRef.close(true);
      }).catch(err => {
        this.snackBar.open('Error deleting record: ' + err.message, 'Close', { duration: 4000 });
      });
    }
  }

  openAddRecord(staffId: string, date: string | Date) {
    let dateStr = '';
    if (typeof date === 'string') {
      dateStr = date;
    } else if (date instanceof Date) {
      dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    const ref = this.dialog.open(AttendanceRecordDialogComponent, {
      width: '500px',
      panelClass: 'dark-pro-dialog',
      data: {
        staffId,
        staffName: this.summary.staffName,
        defaultDate: dateStr
      }
    });

    ref.afterClosed().subscribe(res => {
      if (res) {
        this.data.refreshCallback();
        this.dialogRef.close(true);
      }
    });
  }
}
