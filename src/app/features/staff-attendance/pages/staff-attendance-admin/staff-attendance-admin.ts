import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import {
    StaffAttendanceService,
    DEFAULT_STAFF_SHIFTS,
    formatShiftSchedule,
    formatTime12Hour
} from '../../../../core/services/staff-attendance.service';
import { UserService } from '../../../../core/services/user.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
    StaffWeeklyAttendanceSummary,
    StaffAttendanceRecord,
    KioskDevice
} from '../../../../core/models/staff-attendance.model';
import { User } from '../../../../core/models/user.model';
import { PayablesService } from '../../../../core/services/payables.service';
import {
    Firestore,
    collection,
    query,
    where,
    getDocs,
    Timestamp
} from '@angular/fire/firestore';
import { fadeIn } from '../../../../core/animations/animations';
import { firstValueFrom, Observable } from 'rxjs';
import { AttendanceRecordDialogComponent } from '../../components/attendance-record-dialog/attendance-record-dialog';
import {
    PayrollAdjustmentDialogComponent,
    PayrollDialogResult
} from '../../components/payroll-adjustment-dialog/payroll-adjustment-dialog';

@Component({
    selector: 'app-staff-attendance-admin',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatTabsModule,
        MatCardModule,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatChipsModule,
        MatTooltipModule,
        MatSlideToggleModule,
        MatSnackBarModule,
        MatDialogModule
    ],
    templateUrl: './staff-attendance-admin.html',
    styleUrl: './staff-attendance-admin.css',
    animations: [fadeIn]
})
export class StaffAttendanceAdminComponent implements OnInit {
    private attendanceService = inject(StaffAttendanceService);
    private userService = inject(UserService);
    private settingsService = inject(SettingsService);
    private authService = inject(AuthService);
    private payablesService = inject(PayablesService);
    private firestore = inject(Firestore);
    private snackBar = inject(MatSnackBar);
    private dialog = inject(MatDialog);
    private fb = inject(FormBuilder);
    private router = inject(Router);

    shifts = DEFAULT_STAFF_SHIFTS;
    formatShiftSchedule = formatShiftSchedule;
    formatTime12Hour = formatTime12Hour;

    openKioskTerminal() {
        window.open('/staff-kiosk', '_blank');
    }

    // Date range for Weekly Sunday-to-Saturday report
    currentSunday = signal<Date>(this.getSundayOfWeek(new Date()));
    currentSaturday = signal<Date>(this.getSaturdayOfWeek(new Date()));

    dateForm: FormGroup = this.fb.group({
        selectedDate: [new Date()]
    });

    // Report Summaries & Filtering
    statusFilter = signal<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE');
    allUsers = signal<User[]>([]);
    weeklySummaries = signal<StaffWeeklyAttendanceSummary[]>([]);
    expandedStaffId = signal<string | null>(null);
    isLoadingReport = signal(false);
    isPostingPayroll = signal(false);

    displayedSummaries = computed(() => {
        const summaries = this.weeklySummaries();
        const filter = this.statusFilter();
        const users = this.allUsers();

        if (filter === 'ALL') return summaries;

        return summaries.filter(s => {
            const user = users.find(u => u.uid === s.staffId);
            if (!user) return true;
            return filter === 'ACTIVE' ? user.isActive !== false : user.isActive === false;
        });
    });

    totalWeeklyCompensation = computed(() => {
        return this.displayedSummaries().reduce((sum, s) => sum + (s.totalCompensation || 0), 0);
    });

    // Pending Adjustments
    pendingAdjustments$: Observable<StaffAttendanceRecord[]> = this.attendanceService.getPendingAdjustments();

    // Registered Devices
    registeredDevices$: Observable<KioskDevice[]> = this.attendanceService.getRegisteredDevices();

    // Table Columns
    reportColumns = [
        'staffName',
        'roles',
        'daysPresent',
        'lateMins',
        'earlyMins',
        'deficitMins',
        'otHours',
        'dailyRate',
        'totalComp',
        'actions'
    ];

    adjustmentColumns = [
        'staffName',
        'date',
        'shiftName',
        'systemCheckIn',
        'requestedTime',
        'reason',
        'actions'
    ];

    deviceColumns = [
        'deviceName',
        'deviceId',
        'registeredBy',
        'registeredAt',
        'status',
        'actions'
    ];

    ngOnInit() {
        this.loadWeeklyReport();
    }

    private getSundayOfWeek(d: Date): Date {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day; // Adjust to Sunday
        const sunday = new Date(date.setDate(diff));
        sunday.setHours(0, 0, 0, 0);
        return sunday;
    }

    private getSaturdayOfWeek(d: Date): Date {
        const sunday = this.getSundayOfWeek(d);
        const saturday = new Date(sunday);
        saturday.setDate(saturday.getDate() + 6);
        saturday.setHours(23, 59, 59, 999);
        return saturday;
    }

    async onDateChange() {
        const selected = this.dateForm.value.selectedDate;
        if (selected) {
            this.currentSunday.set(this.getSundayOfWeek(selected));
            this.currentSaturday.set(this.getSaturdayOfWeek(selected));
            await this.loadWeeklyReport();
        }
    }

    async navigateWeek(direction: number) {
        const curr = new Date(this.currentSunday());
        curr.setDate(curr.getDate() + (direction * 7));
        this.currentSunday.set(this.getSundayOfWeek(curr));
        this.currentSaturday.set(this.getSaturdayOfWeek(curr));
        this.dateForm.patchValue({ selectedDate: this.currentSunday() });
        await this.loadWeeklyReport();
    }

    async loadWeeklyReport() {
        this.isLoadingReport.set(true);
        try {
            const staffUsers = await firstValueFrom(this.userService.getStaffUsers());
            this.allUsers.set(staffUsers || []);

            const settings = await this.settingsService.getSettingsOnce();

            const summaries = await this.attendanceService.getWeeklyAttendanceReport(
                this.currentSunday(),
                this.currentSaturday(),
                staffUsers || [],
                settings
            );

            this.weeklySummaries.set(summaries);
        } catch (err) {
            console.error('Error loading weekly report:', err);
            this.snackBar.open('Failed to load weekly report.', 'Close', { duration: 3000 });
        } finally {
            this.isLoadingReport.set(false);
        }
    }

    toggleExpand(staffId: string) {
        if (this.expandedStaffId() === staffId) {
            this.expandedStaffId.set(null);
        } else {
            this.expandedStaffId.set(staffId);
        }
    }

    // ==========================================
    // MANUAL ATTENDANCE ENTRY & EDIT / DELETE
    // ==========================================

    openAddRecordDialog(preselectedStaffId?: string, preselectedDate?: string | Date) {
        const dialogRef = this.dialog.open(AttendanceRecordDialogComponent, {
            width: '460px',
            data: {
                mode: 'CREATE',
                staffUsers: this.allUsers(),
                shifts: this.shifts
            }
        });

        if (preselectedStaffId || preselectedDate) {
            setTimeout(() => {
                if (dialogRef.componentInstance) {
                    if (preselectedStaffId) {
                        dialogRef.componentInstance.recordForm.patchValue({ staffId: preselectedStaffId });
                    }
                    if (preselectedDate) {
                        const dateObj = typeof preselectedDate === 'string'
                            ? new Date(preselectedDate + 'T00:00:00')
                            : preselectedDate;
                        dialogRef.componentInstance.recordForm.patchValue({ date: dateObj });
                    }
                }
            }, 50);
        }

        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                await this.loadWeeklyReport();
            }
        });
    }

    openEditRecordDialog(record: StaffAttendanceRecord) {
        const dialogRef = this.dialog.open(AttendanceRecordDialogComponent, {
            width: '460px',
            data: {
                mode: 'EDIT',
                record,
                staffUsers: this.allUsers(),
                shifts: this.shifts
            }
        });

        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                await this.loadWeeklyReport();
            }
        });
    }

    async deleteRecord(record: StaffAttendanceRecord) {
        const confirmMsg = `Are you sure you want to delete the attendance log for ${record.staffName} on ${record.date} (${record.shiftName})?`;
        if (!confirm(confirmMsg)) return;

        try {
            await this.attendanceService.deleteAttendanceRecord(record.id!);
            this.snackBar.open('Attendance record deleted successfully.', 'Close', { duration: 3000 });
            await this.loadWeeklyReport();
        } catch (err: any) {
            console.error('Error deleting record:', err);
            this.snackBar.open(err.message || 'Failed to delete attendance record.', 'Close', { duration: 4000 });
        }
    }

    // ==========================================
    // CHECK-IN ADJUSTMENT APPROVALS
    // ==========================================

    async reviewAdjustment(record: StaffAttendanceRecord, status: 'APPROVED' | 'DENIED') {
        const user = this.authService.userProfile();
        const reviewerName = user?.displayName || 'Admin';

        try {
            await this.attendanceService.reviewAdjustment(record.id!, status, reviewerName);
            this.snackBar.open(`Check-in adjustment ${status.toLowerCase()} successfully.`, 'Close', { duration: 3000 });
            await this.loadWeeklyReport();
        } catch (err: any) {
            console.error('Error reviewing adjustment:', err);
            this.snackBar.open(err.message || 'Failed to update adjustment request.', 'Close', { duration: 4000 });
        }
    }

    // ==========================================
    // REGISTERED DEVICES ACTIONS
    // ==========================================

    async toggleDevice(device: KioskDevice) {
        try {
            await this.attendanceService.toggleDeviceStatus(device.id!, !device.isActive);
            this.snackBar.open(`Device ${!device.isActive ? 'activated' : 'deactivated'}`, 'Close', { duration: 2000 });
        } catch (err) {
            console.error('Error toggling device status:', err);
            this.snackBar.open('Failed to update device status.', 'Close', { duration: 3000 });
        }
    }

    async revokeDevice(device: KioskDevice) {
        if (!confirm(`Are you sure you want to revoke registration for "${device.deviceName}"?`)) return;

        try {
            await this.attendanceService.revokeDevice(device.id!);
            this.snackBar.open('Device registration revoked.', 'Close', { duration: 2000 });
        } catch (err) {
            console.error('Error revoking device:', err);
            this.snackBar.open('Failed to revoke device.', 'Close', { duration: 3000 });
        }
    }

    // ==========================================
    // EXPORT TO CSV
    // ==========================================

    exportToCSV() {
        const summaries = this.weeklySummaries();
        if (!summaries || summaries.length === 0) return;

        const headers = ['Staff Name', 'Roles', 'Days Present', 'Late (mins)', 'Early (mins)', 'Deficit (mins)', 'Overtime (hrs)', 'Daily Rate (PHP)', 'Total Compensation (PHP)'];
        const rows = summaries.map(s => [
            `"${s.staffName}"`,
            `"${s.roles.join(', ')}"`,
            s.daysPresent,
            s.totalLateMinutes,
            s.totalEarlyMinutes,
            s.totalDeficitMinutes,
            s.totalOvertimeHours,
            s.dailySalaryRate,
            s.totalCompensation
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Staff_Payroll_Attendance_${this.currentSunday().toISOString().substring(0, 10)}.csv`);
        link.click();
    }

    async postWeeklyPayrollToPayables(): Promise<void> {
        const summaries = this.displayedSummaries();
        if (!summaries || summaries.length === 0) {
            this.snackBar.open('No staff attendance summaries available for this week.', 'Close', { duration: 3000 });
            return;
        }

        const sun = this.currentSunday();
        const sat = this.currentSaturday();

        // 1. Query Shift drawer expenses for SALARY_ADVANCE in [sun, sat]
        const detectedVales: Record<string, { amount: number; note: string }> = {};
        try {
            const shiftsColl = collection(this.firestore, 'shifts');
            const shiftsQ = query(
                shiftsColl,
                where('startTime', '>=', Timestamp.fromDate(sun)),
                where('startTime', '<=', Timestamp.fromDate(sat))
            );
            const shiftsSnap = await getDocs(shiftsQ);
            shiftsSnap.forEach(docSnap => {
                const shiftData = docSnap.data();
                const txs = shiftData['transactions'] || [];
                txs.forEach((tx: any) => {
                    if ((tx.type === 'Expense' || tx.type === 'Float_Out') && !tx.voided && tx.category === 'SALARY_ADVANCE') {
                        const payee = (tx.billerOrSupplier || tx.notes || '').toLowerCase().trim();
                        const amt = Number(tx.amount || 0);
                        if (payee && amt > 0) {
                            if (!detectedVales[payee]) {
                                detectedVales[payee] = { amount: amt, note: `₱${amt.toLocaleString()} from Shift Drawer` };
                            } else {
                                detectedVales[payee].amount += amt;
                                detectedVales[payee].note += `, +₱${amt.toLocaleString()}`;
                            }
                        }
                    }
                });
            });
        } catch (e) {
            console.warn('Could not query shift vales:', e);
        }

        // 2. Open Payroll Adjustment Dialog
        const dialogRef = this.dialog.open(PayrollAdjustmentDialogComponent, {
            width: '960px',
            maxWidth: '95vw',
            data: {
                sunday: sun,
                saturday: sat,
                staffSummaries: summaries,
                detectedVales
            }
        });

        dialogRef.afterClosed().subscribe(async (result: PayrollDialogResult | undefined) => {
            if (!result) return;

            this.isPostingPayroll.set(true);
            try {
                const user = this.authService.userProfile();
                const userName = user?.displayName || user?.email || 'Admin';

                await this.payablesService.createBill({
                    title: result.title,
                    category: 'SALARY_STAFF',
                    billerOrSupplier: 'Gym Staff & Coaches',
                    billingPeriodStart: sun,
                    billingPeriodEnd: sat,
                    dueDate: sat,
                    totalAmountDue: result.totalNet,
                    notes: result.notes,
                    payrollItems: result.items.map(item => ({
                        staffId: item.staffId,
                        staffName: item.staffName,
                        roles: item.roles || [],
                        daysPresent: item.daysPresent || 0,
                        baseCompensation: Number(item.baseCompensation || 0),
                        valeDeduction: Number(item.valeDeduction || 0),
                        valeNote: item.valeNote || '',
                        adjustmentAmount: Number(item.adjustmentAmount || 0),
                        adjustmentReason: item.adjustmentReason || '',
                        netAmount: Number(item.netAmount || 0)
                    })),
                    createdBy: userName
                });

                const snack = this.snackBar.open(
                    `Weekly Payroll (Net: ₱${result.totalNet.toLocaleString()}) posted to Bills & Payables!`,
                    'View Payables',
                    { duration: 5000 }
                );

                snack.onAction().subscribe(() => {
                    this.router.navigate(['/store/payables']);
                });
            } catch (err: any) {
                console.error('Failed to post weekly payroll:', err);
                this.snackBar.open(err.message || 'Failed to post payroll bill', 'Close', { duration: 3000 });
            } finally {
                this.isPostingPayroll.set(false);
            }
        });
    }
}
