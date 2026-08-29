import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ShiftScheduleService, formatShiftSchedule, formatTime12Hour } from '../../../../core/services/shift-schedule.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserService } from '../../../../core/services/user.service';
import { WeeklySchedule, ShiftSwapRequest, DayShiftAssignment } from '../../../../core/models/shift-schedule.model';
import { User } from '../../../../core/models/user.model';

export interface ShiftSwapDialogData {
  schedule: WeeklySchedule;
  weekDays: { dateStr: string; dayName: string; formattedDate: string }[];
}

@Component({
  selector: 'app-shift-swap-modal',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, MatDialogModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatTabsModule, MatChipsModule, MatSnackBarModule
  ],
  templateUrl: './shift-swap-modal.html',
  styleUrl: './shift-swap-modal.css'
})
export class ShiftSwapModalComponent implements OnInit {
  dialogRef = inject(MatDialogRef<ShiftSwapModalComponent>);
  data = inject<ShiftSwapDialogData>(MAT_DIALOG_DATA);
  private scheduleService = inject(ShiftScheduleService);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  formatShiftSchedule = formatShiftSchedule;
  formatTime12Hour = formatTime12Hour;

  currentUser = this.authService.userProfile();
  staffList = signal<User[]>([]);
  pendingRequests = signal<ShiftSwapRequest[]>([]);
  myRequests = signal<ShiftSwapRequest[]>([]);

  selectedTabIndex = signal<number>(0);
  isSubmitting = signal<boolean>(false);

  swapForm: FormGroup = this.fb.group({
    myDate: ['', [Validators.required]],
    targetStaffId: ['', [Validators.required]],
    targetDate: ['', [Validators.required]],
    reason: ['', [Validators.required]]
  });

  myAvailableShifts = signal<{ dateStr: string; label: string; shift: DayShiftAssignment }[]>([]);
  targetAvailableShifts = signal<{ dateStr: string; label: string; shift: DayShiftAssignment }[]>([]);

  get isManagerOrAdmin(): boolean {
    return this.authService.hasAnyRole(['ADMIN', 'MANAGER']);
  }

  ngOnInit(): void {
    this.loadStaffAndRequests();
    this.populateMyAvailableShifts();

    this.swapForm.get('targetStaffId')?.valueChanges.subscribe(targetId => {
      this.populateTargetAvailableShifts(targetId);
    });
  }

  loadStaffAndRequests(): void {
    this.userService.getStaffUsers().subscribe(users => {
      this.staffList.set((users || []).filter(u => u.uid !== this.currentUser?.uid && u.isActive !== false));
    });

    if (this.isManagerOrAdmin) {
      this.scheduleService.getPendingSwapRequests().subscribe(reqs => {
        this.pendingRequests.set(reqs || []);
      });
    }

    if (this.currentUser?.uid) {
      this.scheduleService.getMySwapRequests(this.currentUser.uid).subscribe(reqs => {
        this.myRequests.set(reqs || []);
      });
    }
  }

  populateMyAvailableShifts(): void {
    if (!this.currentUser?.uid || !this.data?.schedule) return;

    const myAssignment = this.data.schedule.assignments?.[this.currentUser.uid];
    if (!myAssignment || !myAssignment.days) return;

    const available: { dateStr: string; label: string; shift: DayShiftAssignment }[] = [];
    for (const day of this.data.weekDays) {
      // Past dates cannot be swapped
      if (this.scheduleService.isPastDate(day.dateStr)) continue;

      const shift = myAssignment.days[day.dateStr];
      if (shift && shift.shiftId !== 'OFF') {
        available.push({
          dateStr: day.dateStr,
          label: day.dayName + ' (' + day.formattedDate + ') – ' + shift.shiftName + ' (' + formatShiftSchedule(shift) + ')',
          shift
        });
      }
    }

    this.myAvailableShifts.set(available);
  }

  populateTargetAvailableShifts(targetStaffId: string): void {
    if (!targetStaffId || !this.data?.schedule) {
      this.targetAvailableShifts.set([]);
      return;
    }

    const targetAssignment = this.data.schedule.assignments?.[targetStaffId];
    if (!targetAssignment || !targetAssignment.days) {
      this.targetAvailableShifts.set([]);
      return;
    }

    const available: { dateStr: string; label: string; shift: DayShiftAssignment }[] = [];
    for (const day of this.data.weekDays) {
      // Past dates cannot be swapped
      if (this.scheduleService.isPastDate(day.dateStr)) continue;

      const shift = targetAssignment.days[day.dateStr];
      if (shift && shift.shiftId !== 'OFF') {
        available.push({
          dateStr: day.dateStr,
          label: day.dayName + ' (' + day.formattedDate + ') – ' + shift.shiftName + ' (' + formatShiftSchedule(shift) + ')',
          shift
        });
      }
    }

    this.targetAvailableShifts.set(available);
  }

  async submitSwap(): Promise<void> {
    if (this.swapForm.invalid || !this.currentUser?.uid) return;

    this.isSubmitting.set(true);
    const { myDate, targetStaffId, targetDate, reason } = this.swapForm.value;

    const myShiftItem = this.myAvailableShifts().find(s => s.dateStr === myDate);
    const targetStaff = this.staffList().find(s => s.uid === targetStaffId);
    const targetShiftItem = this.targetAvailableShifts().find(s => s.dateStr === targetDate);

    if (!myShiftItem || !targetStaff || !targetShiftItem) {
      this.snackBar.open('Please select valid shift dates.', 'Close', { duration: 3000 });
      this.isSubmitting.set(false);
      return;
    }

    try {
      await this.scheduleService.submitSwapRequest({
        weekId: this.data.schedule.id,
        requesterId: this.currentUser.uid,
        requesterName: this.currentUser.displayName || 'Staff Member',
        requesterDate: myDate,
        requesterShift: myShiftItem.shift,
        targetStaffId: targetStaff.uid,
        targetStaffName: targetStaff.displayName || 'Staff Member',
        targetDate,
        targetShift: targetShiftItem.shift,
        reason
      });

      this.snackBar.open('Shift swap request submitted for Manager approval!', 'Close', { duration: 4000 });
      this.swapForm.reset();
      this.selectedTabIndex.set(1);
    } catch (err: any) {
      this.snackBar.open(err.message || 'Failed to submit request', 'Close', { duration: 4000 });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async approveRequest(req: ShiftSwapRequest): Promise<void> {
    if (!confirm('Approve shift swap between ' + req.requesterName + ' and ' + req.targetStaffName + '?')) return;

    try {
      await this.scheduleService.approveSwapRequest(
        req.id,
        this.currentUser?.uid || 'admin',
        this.currentUser?.displayName || 'Management'
      );
      this.snackBar.open('Shift swap approved and schedule updated!', 'Close', { duration: 3000 });
      this.loadStaffAndRequests();
    } catch (err: any) {
      this.snackBar.open(err.message || 'Failed to approve swap', 'Close', { duration: 4000 });
    }
  }

  async rejectRequest(req: ShiftSwapRequest): Promise<void> {
    const reason = prompt('Reason for declining this swap request (optional):');
    try {
      await this.scheduleService.rejectSwapRequest(
        req.id,
        this.currentUser?.uid || 'admin',
        this.currentUser?.displayName || 'Management',
        reason || 'Declined by Management'
      );
      this.snackBar.open('Shift swap declined', 'Close', { duration: 3000 });
      this.loadStaffAndRequests();
    } catch (err: any) {
      this.snackBar.open(err.message || 'Failed to decline swap', 'Close', { duration: 4000 });
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
