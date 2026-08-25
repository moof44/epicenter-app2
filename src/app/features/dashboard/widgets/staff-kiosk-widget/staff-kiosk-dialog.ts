import { Component, inject, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StaffAttendanceService, DEFAULT_STAFF_SHIFTS } from '../../../../core/services/staff-attendance.service';
import { UserService } from '../../../../core/services/user.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { User } from '../../../../core/models/user.model';
import { StaffShiftDefinition } from '../../../../core/models/staff-attendance.model';
import { fadeIn } from '../../../../core/animations/animations';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-staff-kiosk-dialog',
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
        MatCheckboxModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './staff-kiosk-dialog.html',
    styleUrl: './staff-kiosk-dialog.css',
    animations: [fadeIn]
})
export class StaffKioskDialogComponent implements OnInit, OnDestroy {
    private attendanceService = inject(StaffAttendanceService);
    private userService = inject(UserService);
    private settingsService = inject(SettingsService);
    private dialogRef = inject(MatDialogRef<StaffKioskDialogComponent>);
    private fb = inject(FormBuilder);

    // Step state: 'CHOICE' | 'CLOCK_IN' | 'CLOCK_OUT' | 'RESULT'
    step = signal<'CHOICE' | 'CLOCK_IN' | 'CLOCK_OUT' | 'RESULT'>('CHOICE');

    // Forms
    clockInForm: FormGroup = this.fb.group({
        staffId: ['', [Validators.required]],
        shiftId: ['', [Validators.required]],
        password: ['', [Validators.required]],
        requestAdjustment: [false],
        requestedTime: [''],
        adjustmentReason: ['']
    });

    clockOutForm: FormGroup = this.fb.group({
        staffId: ['', [Validators.required]],
        password: ['', [Validators.required]]
    });

    // Signals
    staffList = signal<User[]>([]);
    shiftsList = signal<StaffShiftDefinition[]>(DEFAULT_STAFF_SHIFTS);
    deviceName = signal<string>('Attendance Terminal');
    manilaTimeStr = signal<string>('');
    manilaDateStr = signal<string>('');

    isSubmitting = signal(false);
    resultMessage = signal<{ text: string; type: 'success' | 'error' } | null>(null);

    private timerInterval: any = null;

    async ngOnInit() {
        this.updateClock();
        this.timerInterval = setInterval(() => this.updateClock(), 1000);
        this.deviceName.set(this.attendanceService.getLocalDeviceName());
        await this.loadData();
    }

    ngOnDestroy() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    private updateClock() {
        const manilaNow = this.attendanceService.getManilaNow();
        this.manilaTimeStr.set(manilaNow.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
        this.manilaDateStr.set(manilaNow.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }));
    }

    async loadData() {
        try {
            const users = await firstValueFrom(this.userService.getStaffUsers());
            this.staffList.set((users || []).filter(u => u.isActive !== false));

            const settings = await this.settingsService.getSettingsOnce();
            if (settings?.staffShifts && settings.staffShifts.length > 0) {
                this.shiftsList.set(settings.staffShifts);
            }

            // Default shift auto-detection
            const defaultShift = this.attendanceService.autoDetectCurrentShift(this.shiftsList());
            this.clockInForm.patchValue({ shiftId: defaultShift.id });
        } catch (err) {
            console.error('Error loading kiosk dialog data:', err);
        }
    }

    selectMode(mode: 'CLOCK_IN' | 'CLOCK_OUT') {
        this.step.set(mode);
    }

    backToChoice() {
        this.step.set('CHOICE');
        this.resultMessage.set(null);
    }

    async submitClockIn() {
        if (this.clockInForm.invalid) return;

        const { staffId, shiftId, password, requestAdjustment, requestedTime, adjustmentReason } = this.clockInForm.value;
        const selectedStaff = this.staffList().find(s => s.uid === staffId);
        if (!selectedStaff) return;

        const selectedShift = this.shiftsList().find(s => s.id === shiftId) || DEFAULT_STAFF_SHIFTS[0];

        this.isSubmitting.set(true);
        try {
            const adjObj = requestAdjustment && requestedTime ? {
                requestedTime,
                reason: adjustmentReason
            } : undefined;

            const res = await this.attendanceService.clockIn(selectedStaff, password, selectedShift, adjObj);
            this.resultMessage.set({ text: res.message, type: 'success' });
            this.step.set('RESULT');
        } catch (err: any) {
            console.error('Clock in error:', err);
            this.resultMessage.set({ text: err.message || 'Clock in failed. Please check credentials.', type: 'error' });
            this.step.set('RESULT');
        } finally {
            this.isSubmitting.set(false);
        }
    }

    async submitClockOut() {
        if (this.clockOutForm.invalid) return;

        const { staffId, password } = this.clockOutForm.value;
        const selectedStaff = this.staffList().find(s => s.uid === staffId);
        if (!selectedStaff) return;

        this.isSubmitting.set(true);
        try {
            const res = await this.attendanceService.clockOut(selectedStaff, password);
            this.resultMessage.set({ text: res.message, type: 'success' });
            this.step.set('RESULT');
        } catch (err: any) {
            console.error('Clock out error:', err);
            this.resultMessage.set({ text: err.message || 'Clock out failed. Please check credentials.', type: 'error' });
            this.step.set('RESULT');
        } finally {
            this.isSubmitting.set(false);
        }
    }

    closeDialog() {
        this.dialogRef.close();
    }
}
