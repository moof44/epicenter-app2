import { Component, inject, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
    StaffAttendanceService,
    DEFAULT_STAFF_SHIFTS,
    formatShiftSchedule,
    formatTime12Hour
} from '../../../../core/services/staff-attendance.service';
import { UserService } from '../../../../core/services/user.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { AuthService } from '../../../../core/services/auth.service';
import { User } from '../../../../core/models/user.model';
import { StaffShiftDefinition } from '../../../../core/models/staff-attendance.model';
import { fadeIn } from '../../../../core/animations/animations';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-staff-kiosk',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatCheckboxModule,
        MatSnackBarModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './staff-kiosk.html',
    styleUrl: './staff-kiosk.css',
    animations: [fadeIn]
})
export class StaffKioskComponent implements OnInit, OnDestroy {
    private attendanceService = inject(StaffAttendanceService);
    private userService = inject(UserService);
    private settingsService = inject(SettingsService);
    private authService = inject(AuthService);
    private snackBar = inject(MatSnackBar);
    private fb = inject(FormBuilder);

    formatShiftSchedule = formatShiftSchedule;

    // Kiosk Registration State
    isAuthorized = signal<boolean | null>(null);
    showAdminAuthModal = signal(false);

    // Kiosk Forms
    adminAuthForm: FormGroup = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required]],
        deviceName: ['Front Desk Kiosk', [Validators.required]]
    });

    kioskForm: FormGroup = this.fb.group({
        staffId: ['', [Validators.required]],
        mode: ['CHECK_IN', [Validators.required]],
        shiftId: ['', [Validators.required]],
        password: ['', [Validators.required]],
        requestAdjustment: [false],
        requestedTime: [''],
        adjustmentReason: ['']
    });

    // Data Signals
    staffList = signal<User[]>([]);
    shiftsList = signal<StaffShiftDefinition[]>(DEFAULT_STAFF_SHIFTS);
    deviceName = signal<string>('Attendance Terminal');

    // Manila Time Signals
    manilaTimeStr = signal<string>('');
    manilaDateStr = signal<string>('');
    private timerInterval: any = null;

    // UI Loading & Feedback
    isSubmitting = signal(false);
    resultMessage = signal<{ text: string; type: 'success' | 'error' } | null>(null);

    async ngOnInit() {
        this.updateManilaClock();
        this.timerInterval = setInterval(() => this.updateManilaClock(), 1000);

        await this.checkDeviceAuthorization();
        if (this.isAuthorized()) {
            await this.loadKioskData();
        }
    }

    ngOnDestroy() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    private updateManilaClock() {
        const manilaNow = this.attendanceService.getManilaNow();
        this.manilaTimeStr.set(manilaNow.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
        this.manilaDateStr.set(manilaNow.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    }

    async checkDeviceAuthorization() {
        const authorized = await this.attendanceService.isCurrentDeviceAuthorized();
        this.isAuthorized.set(authorized);
        if (authorized) {
            this.deviceName.set(this.attendanceService.getLocalDeviceName());
        }
    }

    async loadKioskData() {
        try {
            // Load active staff users
            const users = await firstValueFrom(this.userService.getStaffUsers());
            this.staffList.set((users || []).filter(u => u.isActive !== false));

            // Load shifts from settings or default
            const settings = await this.settingsService.getSettingsOnce();
            if (settings?.staffShifts && settings.staffShifts.length > 0) {
                this.shiftsList.set(settings.staffShifts);
            } else {
                this.shiftsList.set(DEFAULT_STAFF_SHIFTS);
            }

            // Auto-detect current Manila shift
            const autoShift = this.attendanceService.autoDetectCurrentShift(this.shiftsList());
            this.kioskForm.patchValue({ shiftId: autoShift.id });
        } catch (err) {
            console.error('Error loading kiosk data:', err);
        }
    }

    // ==========================================
    // ADMIN DEVICE REGISTRATION
    // ==========================================

    openAdminAuth() {
        this.adminAuthForm.reset({
            email: '',
            password: '',
            deviceName: 'Front Desk Kiosk'
        });
        this.showAdminAuthModal.set(true);
    }

    closeAdminAuth() {
        this.showAdminAuthModal.set(false);
    }

    async submitAdminAuth() {
        if (this.adminAuthForm.invalid) return;

        this.isSubmitting.set(true);
        const { email, password, deviceName } = this.adminAuthForm.value;

        try {
            // Verify admin password
            const isValid = await this.attendanceService.verifyStaffPassword(email, password);
            if (!isValid) {
                this.snackBar.open('Invalid Admin credentials.', 'Close', { duration: 4000 });
                return;
            }

            // Register current device
            const adminUser = this.staffList().find(u => u.email.toLowerCase() === email.toLowerCase()) || {
                uid: 'admin_device_reg',
                displayName: 'Admin User'
            } as User;

            await this.attendanceService.registerDevice(deviceName, adminUser);
            this.snackBar.open('Device authorized successfully!', 'Close', { duration: 4000 });
            this.showAdminAuthModal.set(false);
            await this.checkDeviceAuthorization();
            await this.loadKioskData();
        } catch (err: any) {
            console.error('Admin device auth error:', err);
            this.snackBar.open(err.message || 'Device authorization failed.', 'Close', { duration: 5000 });
        } finally {
            this.isSubmitting.set(false);
        }
    }

    // ==========================================
    // STAFF CLOCK-IN / CLOCK-OUT SUBMISSION
    // ==========================================

    async submitKioskAction() {
        if (this.kioskForm.invalid) return;

        const { staffId, mode, shiftId, password, requestAdjustment, requestedTime, adjustmentReason } = this.kioskForm.value;
        const selectedStaff = this.staffList().find(s => s.uid === staffId);
        if (!selectedStaff) {
            this.snackBar.open('Please select your staff name.', 'Close', { duration: 3000 });
            return;
        }

        const selectedShift = this.shiftsList().find(s => s.id === shiftId) || DEFAULT_STAFF_SHIFTS[0];

        this.isSubmitting.set(true);
        this.resultMessage.set(null);

        try {
            if (mode === 'CHECK_IN') {
                const adjObj = requestAdjustment && requestedTime ? {
                    requestedTime,
                    reason: adjustmentReason
                } : undefined;

                const res = await this.attendanceService.clockIn(selectedStaff, password, selectedShift, adjObj);
                this.resultMessage.set({ text: res.message, type: 'success' });
            } else {
                const res = await this.attendanceService.clockOut(selectedStaff, password);
                this.resultMessage.set({ text: res.message, type: 'success' });
            }

            // Reset form fields
            this.kioskForm.patchValue({
                password: '',
                requestAdjustment: false,
                requestedTime: '',
                adjustmentReason: ''
            });

        } catch (err: any) {
            console.error('Kiosk operation error:', err);
            const errorMsg = err.message || 'Operation failed. Please try again.';
            this.resultMessage.set({ text: errorMsg, type: 'error' });
        } finally {
            this.isSubmitting.set(false);
        }
    }
}
