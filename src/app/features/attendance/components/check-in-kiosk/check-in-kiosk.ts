import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Router } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Observable, combineLatest, startWith, map } from 'rxjs';
import { Member } from '../../../../core/models/member.model';
import { MemberService } from '../../../../core/services/member.service';
import { AttendanceService } from '../../../../core/services/attendance.service';
import { CashRegisterService } from '../../../../core/services/cash-register.service';
import { fadeIn, staggerList } from '../../../../core/animations/animations';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { LockerRestrictionDialog } from '../locker-restriction-dialog/locker-restriction-dialog';
import { ShiftControlModal } from '../../../store/components/shift-control-modal/shift-control-modal';
import { firstValueFrom } from 'rxjs';
import { getRandomCommendation } from '../../../../core/constants/commendations';
import { RemarksDialog, RemarksDialogResult } from '../../../../shared/components/remarks-dialog/remarks-dialog.component';

@Component({
  selector: 'app-check-in-kiosk',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule,
    MatInputModule, MatAutocompleteModule, MatButtonModule, MatIconModule,
    MatCardModule, MatSnackBarModule, MatDialogModule
  ],
  templateUrl: './check-in-kiosk.html',
  styleUrl: './check-in-kiosk.css',
  animations: [fadeIn, staggerList]
})
export class CheckInKiosk implements OnInit {
  private memberService = inject(MemberService);
  private attendanceService = inject(AttendanceService);
  private cashRegisterService = inject(CashRegisterService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  searchControl = new FormControl<string | Member>('');
  members$: Observable<Member[]> = this.memberService.getMembers();
  filteredMembers$!: Observable<Member[]>;
  isShiftOpen$ = this.cashRegisterService.currentShift$.pipe(map(s => s?.status === 'OPEN'));

  selectedMember: Member | null = null;
  selectedLocker: number | null = null;
  occupiedLockers: number[] = [];
  lockerNumbers = Array.from({ length: 12 }, (_, i) => i + 1);
  isSubmitting = false;

  ngOnInit() {
    this.filteredMembers$ = combineLatest([
      this.members$,
      this.searchControl.valueChanges.pipe(startWith(''))
    ]).pipe(
      map(([members, value]) => this._filter(members, value))
    );
  }

  private _filter(members: Member[], value: string | Member | null): Member[] {
    const filterValue = typeof value === 'string' ? value.toLowerCase() : '';
    return members.filter(member => member.name.toLowerCase().includes(filterValue));
  }

  displayFn(member: Member): string {
    return member && member.name ? member.name : '';
  }

  getMemberInitials(name?: string): string {
    if (!name) return 'MB';
    return name
      .split(' ')
      .filter(p => p.length > 0)
      .slice(0, 2)
      .map(p => p[0].toUpperCase())
      .join('');
  }

  async onMemberSelected(event: any) {
    this.selectedMember = event.option.value;
    this.selectedLocker = null;
    if (this.selectedMember && this.selectedMember.gender) {
      this.occupiedLockers = await this.attendanceService.getOccupiedLockers(this.selectedMember.gender);
    }
  }

  getMembershipStatusDetails() {
    if (!this.selectedMember) return null;

    const exp = this.selectedMember.membershipExpiration;
    if (!exp) {
      return {
        type: 'none',
        label: 'No Active Subscription',
        class: 'status-none',
        icon: 'info'
      };
    }

    let expDate: Date;
    if (exp instanceof Date) {
      expDate = exp;
    } else if (exp && typeof (exp as any).toDate === 'function') {
      expDate = (exp as any).toDate();
    } else {
      expDate = new Date(exp as any);
    }

    const isExpired = this.memberService.isMembershipExpired(this.selectedMember);

    if (isExpired) {
      return {
        type: 'expired',
        label: 'Expired Subscription',
        date: expDate,
        class: 'status-expired',
        icon: 'error'
      };
    } else {
      return {
        type: 'active',
        label: 'Active until',
        date: expDate,
        class: 'status-active',
        icon: 'check_circle'
      };
    }
  }

  isLockerOccupied(num: number): boolean {
    return this.occupiedLockers.includes(num);
  }

  selectLocker(num: number) {
    if (this.isLockerOccupied(num)) return;
    if (this.selectedLocker === num) {
      this.selectedLocker = null;
    } else {
      this.selectedLocker = num;
    }
  }

  openShiftModal(): void {
    this.dialog.open(ShiftControlModal, {
      width: '580px',
      maxWidth: '94vw',
      maxHeight: '92vh',
      disableClose: true,
      autoFocus: false,
      panelClass: 'shift-control-dialog-panel'
    });
  }

  async confirmCheckIn() {
    if (this.isSubmitting) return;

    if (!this.cashRegisterService.isShiftOpen()) {
      this.snackBar.open('Register shift is closed. Please open a shift first.', 'Open Shift', { duration: 5000 })
        .onAction().subscribe(() => {
          this.openShiftModal();
        });
      this.openShiftModal();
      return;
    }

    this.isSubmitting = true;

    if (!this.selectedMember?.id) {
      this.snackBar.open('Invalid member data. Please re-select.', 'Close', { duration: 3000 });
      this.isSubmitting = false;
      return;
    }

    try {
      const member = this.selectedMember;
      const isExpired = this.memberService.isMembershipExpired(member);
      const hasActiveSubscription = member.membershipStatus === 'Active' && !!member.membershipExpiration && !isExpired;
      const hasLocker = !!this.selectedLocker;

      // 0. Remarks Check
      if (member.remarks) {
        const remarkDialog = this.dialog.open(RemarksDialog, {
          data: { member },
          disableClose: true
        });

        const result = await firstValueFrom(remarkDialog.afterClosed()) as RemarksDialogResult;

        if (result.action === 'clear') {
          await this.memberService.updateMember(member.id!, { remarks: '' });
          member.remarks = '';
          this.snackBar.open('Remark cleared.', undefined, { duration: 2000 });
        }
      }

      // 1. Locker Restriction Check
      if (hasLocker && !hasActiveSubscription) {
        const restrictionDialog = this.dialog.open(LockerRestrictionDialog, {
          data: { member }
        });

        const result = await firstValueFrom(restrictionDialog.afterClosed());

        if (!result || result.action === 'cancel') {
          this.isSubmitting = false;
          return;
        }

        if (result.action === 'check-in-no-locker') {
          this.selectedLocker = null;
        }
      }

      // 2. Final Check-in
      await this.doCheckIn(member);

    } catch (error: any) {
      if (error.message === 'STALE_SHIFT' || error.message === 'SILENT') return;
      this.snackBar.open(error.message, 'Close', { duration: 3000 });
    } finally {
      this.isSubmitting = false;
    }
  }

  async doCheckIn(member: Member) {
    await this.attendanceService.checkIn(member, this.selectedLocker || undefined);

    let message = `Checked in ${member.name}!`;
    let expDisplay = 'No Expiry';
    if (member.membershipExpiration) {
      const d = member.membershipExpiration;
      expDisplay = d.toLocaleDateString();
      message += ` (Exp: ${expDisplay})`;
    }

    const isExpired = this.memberService.isMembershipExpired(member);
    const hasActiveSubscription = member.membershipStatus === 'Active' && !!member.membershipExpiration && !isExpired;
    if (!hasActiveSubscription) {
      message += `\n⚠️ Membership is expired. Please renew at the front desk.`;
    }

    const commendation = getRandomCommendation('CHECKIN');
    this.snackBar.open(`${message}\n${commendation}`, 'Close', { duration: 5000 });
    this.reset();
  }

  cancel() {
    this.reset();
  }

  reset() {
    this.selectedMember = null;
    this.selectedLocker = null;
    this.searchControl.setValue('');
  }

  goToaddMember() {
    this.router.navigate(['/members/add'], {
      queryParams: { returnUrl: '/attendance' }
    });
  }
}
