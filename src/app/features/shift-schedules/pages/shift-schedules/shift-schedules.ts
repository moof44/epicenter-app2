import { Component, inject, OnInit, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { ShiftScheduleService, formatShiftSchedule, formatTime12Hour } from '../../../../core/services/shift-schedule.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserService } from '../../../../core/services/user.service';
import {
  WeeklySchedule,
  ShiftDefinition,
  StaffWeeklyAssignment,
  DayShiftAssignment,
  ShiftSwapRequest
} from '../../../../core/models/shift-schedule.model';
import { User } from '../../../../core/models/user.model';
import { ShiftDefinitionModalComponent } from '../../components/shift-definition-modal/shift-definition-modal';
import { ShiftSwapModalComponent } from '../../components/shift-swap-modal/shift-swap-modal';
import { Subscription } from 'rxjs';
import { fadeIn } from '../../../../core/animations/animations';

@Component({
  selector: 'app-shift-schedules',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule, MatChipsModule, MatDialogModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatTooltipModule, MatMenuModule
  ],
  templateUrl: './shift-schedules.html',
  styleUrl: './shift-schedules.css',
  animations: [fadeIn]
})
export class ShiftSchedulesComponent implements OnInit, OnDestroy {
  private scheduleService = inject(ShiftScheduleService);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  formatShiftSchedule = formatShiftSchedule;
  formatTime12Hour = formatTime12Hour;

  currentUser = this.authService.userProfile;
  currentDate = signal<Date>(new Date());
  
  weekInfo = computed(() => {
    return this.scheduleService.getWeekRange(this.currentDate());
  });

  staffList = signal<User[]>([]);
  shiftDefinitions = signal<ShiftDefinition[]>([]);
  currentSchedule = signal<WeeklySchedule | null>(null);
  pendingSwaps = signal<ShiftSwapRequest[]>([]);
  isLoading = signal<boolean>(true);
  isCopying = signal<boolean>(false);

  // Mobile active day index (0..6)
  activeMobileDayIndex = signal<number>(0);

  private scheduleSub?: Subscription;
  private swapSub?: Subscription;

  get isManagerOrAdmin(): boolean {
    return this.authService.hasAnyRole(['ADMIN', 'MANAGER']);
  }

  // Today in Manila
  todayStr = computed(() => this.scheduleService.getTodayManilaDateStr());

  // My upcoming shifts for the active week
  myWeeklyShifts = computed(() => {
    const user = this.currentUser();
    const sched = this.currentSchedule();
    const days = this.weekInfo().days;
    if (!user?.uid || !sched?.assignments?.[user.uid]) return [];

    const staffAssignment = sched.assignments[user.uid];
    return days.map(d => {
      const shift = staffAssignment.days?.[d.dateStr] || null;
      return {
        ...d,
        isToday: d.dateStr === this.todayStr(),
        shift
      };
    });
  });

  ngOnInit(): void {
    // Set mobile active day to today if in current week
    this.syncMobileActiveDay();
    this.loadDefinitions();
    this.loadStaffUsers();
    this.loadScheduleForWeek();
    this.loadPendingSwaps();
  }

  ngOnDestroy(): void {
    this.scheduleSub?.unsubscribe();
    this.swapSub?.unsubscribe();
  }

  private syncMobileActiveDay(): void {
    const today = this.scheduleService.getTodayManilaDateStr();
    const days = this.weekInfo().days;
    const index = days.findIndex(d => d.dateStr === today);
    this.activeMobileDayIndex.set(index >= 0 ? index : 0);
  }

  loadDefinitions(): void {
    this.scheduleService.getShiftDefinitions().subscribe(defs => {
      this.shiftDefinitions.set(defs);
    });
  }

  loadStaffUsers(): void {
    this.userService.getStaffUsers().subscribe(users => {
      this.staffList.set((users || []).filter(u => u.isActive !== false));
    });
  }

  loadScheduleForWeek(): void {
    this.isLoading.set(true);
    this.scheduleSub?.unsubscribe();

    const weekId = this.weekInfo().weekId;
    this.scheduleSub = this.scheduleService.getWeeklySchedule(weekId).subscribe({
      next: (sched) => {
        this.currentSchedule.set(sched);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading schedule:', err);
        this.isLoading.set(false);
      }
    });
  }

  loadPendingSwaps(): void {
    if (this.isManagerOrAdmin) {
      this.swapSub = this.scheduleService.getPendingSwapRequests().subscribe(reqs => {
        this.pendingSwaps.set(reqs || []);
      });
    }
  }

  // Week Navigation
  prevWeek(): void {
    const d = new Date(this.currentDate());
    d.setDate(d.getDate() - 7);
    this.currentDate.set(d);
    this.syncMobileActiveDay();
    this.loadScheduleForWeek();
  }

  nextWeek(): void {
    const d = new Date(this.currentDate());
    d.setDate(d.getDate() + 7);
    this.currentDate.set(d);
    this.syncMobileActiveDay();
    this.loadScheduleForWeek();
  }

  todayWeek(): void {
    this.currentDate.set(new Date());
    this.syncMobileActiveDay();
    this.loadScheduleForWeek();
  }

  isPast(dateStr: string): boolean {
    return this.scheduleService.isPastDate(dateStr);
  }

  // Assignment helpers
  getStaffAssignment(staffId: string): StaffWeeklyAssignment | undefined {
    return this.currentSchedule()?.assignments?.[staffId];
  }

  getDayShift(staffId: string, dateStr: string): DayShiftAssignment | null {
    return this.currentSchedule()?.assignments?.[staffId]?.days?.[dateStr] || null;
  }

  async assignShift(staff: User, dateStr: string, shift: ShiftDefinition | null): Promise<void> {
    if (!this.isManagerOrAdmin) {
      this.snackBar.open('Only Managers and Admins can assign shifts.', 'Close', { duration: 3000 });
      return;
    }

    if (this.isPast(dateStr)) {
      this.snackBar.open('Past schedules are locked and cannot be modified.', 'Close', { duration: 3000 });
      return;
    }

    const weekInfo = this.weekInfo();
    const dayAssignment: DayShiftAssignment | null = shift ? {
      shiftId: shift.id,
      shiftName: shift.name || 'Shift',
      startTime: shift.startTime || '08:00',
      endTime: shift.endTime || '15:00',
      isFlexible: Boolean(shift.isFlexible),
      colorHex: shift.colorHex || '#0284c7'
    } : null;

    try {
      await this.scheduleService.updateDayAssignment(
        weekInfo.weekId,
        weekInfo.startDate,
        weekInfo.endDate,
        staff.uid,
        staff.displayName,
        staff.roles || [],
        dateStr,
        dayAssignment
      );
    } catch (err: any) {
      this.snackBar.open(err.message || 'Failed to update shift', 'Close', { duration: 4000 });
    }
  }

  async copyFromPreviousWeek(): Promise<void> {
    if (!this.isManagerOrAdmin) return;

    const currentWeekInfo = this.weekInfo();
    // Compute previous week ID
    const prevDate = new Date(currentWeekInfo.startDate);
    prevDate.setDate(prevDate.getDate() - 7);
    const prevWeekInfo = this.scheduleService.getWeekRange(prevDate);

    if (!confirm('Copy shift assignments from previous week (' + prevWeekInfo.startDate + ' to ' + prevWeekInfo.endDate + ') into this week?')) {
      return;
    }

    this.isCopying.set(true);
    try {
      await this.scheduleService.copyPreviousWeek(
        currentWeekInfo.weekId,
        currentWeekInfo.startDate,
        currentWeekInfo.endDate,
        prevWeekInfo.weekId
      );
      this.snackBar.open('Successfully duplicated previous week schedule!', 'Close', { duration: 3000 });
    } catch (err: any) {
      this.snackBar.open(err.message || 'Failed to copy schedule', 'Close', { duration: 4000 });
    } finally {
      this.isCopying.set(false);
    }
  }

  // Daily Headcount computation
  getDayHeadcount(dateStr: string): { total: number; opening: number; morning: number; night: number; flex: number } {
    const sched = this.currentSchedule();
    if (!sched?.assignments) return { total: 0, opening: 0, morning: 0, night: 0, flex: 0 };

    let total = 0, opening = 0, morning = 0, night = 0, flex = 0;
    for (const staff of Object.values(sched.assignments)) {
      const shift = staff.days?.[dateStr];
      if (shift && shift.shiftId !== 'OFF') {
        total++;
        if (shift.shiftId === 'opening') opening++;
        else if (shift.shiftId === 'morning') morning++;
        else if (shift.shiftId === 'night') night++;
        else flex++;
      }
    }
    return { total, opening, morning, night, flex };
  }

  // Modals
  openShiftDefinitions(): void {
    this.dialog.open(ShiftDefinitionModalComponent, {
      width: '640px',
      maxWidth: '95vw'
    });
  }

  openShiftSwaps(): void {
    const sched = this.currentSchedule() || {
      id: this.weekInfo().weekId,
      startDate: this.weekInfo().startDate,
      endDate: this.weekInfo().endDate,
      status: 'PUBLISHED',
      assignments: {},
      createdBy: '',
      createdByName: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.dialog.open(ShiftSwapModalComponent, {
      width: '680px',
      maxWidth: '95vw',
      data: {
        schedule: sched,
        weekDays: this.weekInfo().days
      }
    });
  }

  printSchedule(): void {
    window.print();
  }
}
