import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { StaffAttendanceService, DEFAULT_STAFF_SHIFTS } from '../../../../core/services/staff-attendance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { StaffAttendanceRecord, StaffShiftDefinition } from '../../../../core/models/staff-attendance.model';
import { User } from '../../../../core/models/user.model';
import { toLocalDateStr } from '../../../../core/utils/date.utils';

export interface AttendanceDialogData {
    mode: 'CREATE' | 'EDIT';
    record?: StaffAttendanceRecord;
    staffUsers: User[];
    shifts: StaffShiftDefinition[];
}

@Component({
    selector: 'app-attendance-record-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatSnackBarModule
    ],
    templateUrl: './attendance-record-dialog.html',
    styleUrl: './attendance-record-dialog.css'
})
export class AttendanceRecordDialogComponent implements OnInit {
    private attendanceService = inject(StaffAttendanceService);
    private authService = inject(AuthService);
    private dialogRef = inject(MatDialogRef<AttendanceRecordDialogComponent>);
    private snackBar = inject(MatSnackBar);
    private fb = inject(FormBuilder);
    public data: AttendanceDialogData = inject(MAT_DIALOG_DATA);

    isSubmitting = signal(false);
    isEdit = signal(false);

    recordForm: FormGroup = this.fb.group({
        staffId: ['', [Validators.required]],
        shiftId: ['', [Validators.required]],
        date: [new Date(), [Validators.required]],
        checkInTime: ['08:00', [Validators.required]],
        checkOutTime: [''],
        status: ['CHECKED_OUT', [Validators.required]],
        remarks: ['']
    });

    ngOnInit() {
        this.isEdit.set(this.data.mode === 'EDIT');

        if (this.data.mode === 'EDIT' && this.data.record) {
            const r = this.data.record;
            
            // Format check-in / check-out times to HH:mm
            const inH = r.checkInTime.getHours().toString().padStart(2, '0');
            const inM = r.checkInTime.getMinutes().toString().padStart(2, '0');
            const checkInStr = `${inH}:${inM}`;

            let checkOutStr = '';
            if (r.checkOutTime) {
                const outH = r.checkOutTime.getHours().toString().padStart(2, '0');
                const outM = r.checkOutTime.getMinutes().toString().padStart(2, '0');
                checkOutStr = `${outH}:${outM}`;
            }

            const [y, m, d] = r.date.split('-').map(Number);
            const dateObj = new Date(y, m - 1, d);

            this.recordForm.patchValue({
                staffId: r.staffId,
                shiftId: r.shiftId,
                date: dateObj,
                checkInTime: checkInStr,
                checkOutTime: checkOutStr,
                status: r.status,
                remarks: r.remarks || ''
            });

            this.recordForm.get('staffId')?.disable();
        } else {
            // Create mode defaults
            const autoShift = this.attendanceService.autoDetectCurrentShift(this.data.shifts);
            this.recordForm.patchValue({
                shiftId: autoShift.id,
                checkInTime: autoShift.startTime,
                checkOutTime: autoShift.endTime
            });
        }
    }

    async onSubmit() {
        if (this.recordForm.invalid) return;

        this.isSubmitting.set(true);
        const formVal = this.recordForm.getRawValue();
        const admin = this.authService.userProfile();
        const adminName = admin?.displayName || 'Admin';

        const selectedShift = this.data.shifts.find(s => s.id === formVal.shiftId) || DEFAULT_STAFF_SHIFTS[0];
        const dateStr = toLocalDateStr(new Date(formVal.date));

        // Construct Date objects
        const [inH, inM] = formVal.checkInTime.split(':').map(Number);
        const [y, m, d] = dateStr.split('-').map(Number);
        const checkInDate = new Date(y, m - 1, d, inH, inM, 0, 0);

        let checkOutDate: Date | null = null;
        if (formVal.checkOutTime) {
            const [outH, outM] = formVal.checkOutTime.split(':').map(Number);
            checkOutDate = new Date(y, m - 1, d, outH, outM, 0, 0);
        }

        const payload = {
            date: dateStr,
            shift: selectedShift,
            checkInTime: checkInDate,
            checkOutTime: checkOutDate,
            status: formVal.status as 'CHECKED_IN' | 'CHECKED_OUT',
            remarks: formVal.remarks
        };

        try {
            if (this.isEdit()) {
                await this.attendanceService.updateAttendanceRecord(this.data.record!.id!, payload, adminName);
                this.snackBar.open('Attendance record updated successfully!', 'Close', { duration: 3000 });
            } else {
                const staffUser = this.data.staffUsers.find(u => u.uid === formVal.staffId);
                if (!staffUser) throw new Error('Staff member not found.');
                await this.attendanceService.createManualAttendanceRecord(staffUser, payload, adminName);
                this.snackBar.open('Manual attendance record created!', 'Close', { duration: 3000 });
            }

            this.dialogRef.close(true);
        } catch (err: any) {
            console.error('Error saving attendance record:', err);
            this.snackBar.open(err.message || 'Failed to save record.', 'Close', { duration: 4000 });
        } finally {
            this.isSubmitting.set(false);
        }
    }

    onCancel() {
        this.dialogRef.close(false);
    }
}
