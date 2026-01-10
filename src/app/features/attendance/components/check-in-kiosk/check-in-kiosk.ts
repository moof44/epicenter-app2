import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Observable, combineLatest, startWith, map } from 'rxjs';
import { Member } from '../../../../core/models/member.model'; // Fixed path
import { MemberService } from '../../../../core/services/member.service'; // Fixed path
import { AttendanceService } from '../../../../core/services/attendance.service'; // Fixed path
import { CashRegisterService } from '../../../../core/services/cash-register.service';
import { fadeIn } from '../../../../core/animations/animations';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { StoreService } from '../../../../core/services/store.service';
import { WalkInDialog, WalkInDialogResult } from '../walk-in-dialog/walk-in-dialog';
import { LockerRestrictionDialog } from '../locker-restriction-dialog/locker-restriction-dialog';
import { SubscriptionUpdateDialog, SubscriptionUpdateResult } from '../subscription-update-dialog/subscription-update-dialog';
import { firstValueFrom } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-check-in-kiosk',
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule,
    MatInputModule, MatAutocompleteModule, MatButtonModule, MatIconModule,
    MatCardModule, MatGridListModule, MatSnackBarModule, MatDialogModule
  ],
  /* v8 ignore start */
  template: `
    <div class="kiosk-container">
      
      <!-- Register Closed Warning -->
      <mat-card class="warning-card" *ngIf="(isShiftOpen$ | async) === false" [@fadeIn]>
        <mat-icon color="warn">warning</mat-icon>
        <span>Register is closed. Please open a shift in Store to proceed.</span>
      </mat-card>

      <mat-card class="search-card">
        <h2>Check In</h2>
        <mat-form-field class="full-width" appearance="outline">
          <mat-label>Search Member</mat-label>
          <input type="text" matInput [formControl]="searchControl" [matAutocomplete]="auto" [disabled]="(isShiftOpen$ | async) === false">
          <mat-icon matSuffix>search</mat-icon>
          <mat-autocomplete #auto="matAutocomplete" [displayWith]="displayFn" (optionSelected)="onMemberSelected($event)">
            <mat-option *ngFor="let member of filteredMembers$ | async" [value]="member">
              {{member.name}} ({{member.membershipStatus}})
            </mat-option>
          </mat-autocomplete>
        </mat-form-field>
      </mat-card>

      <div *ngIf="selectedMember" class="locker-selection" [@fadeIn]>
        <h3>Welcome, {{selectedMember.name}}!</h3>
        <p>Select a locker (optional) or just Check In.</p>
        
        <div class="locker-grid">
           <button *ngFor="let num of lockerNumbers" 
                   mat-fab 
                   [class.occupied]="isLockerOccupied(num)"
                   [class.selected]="selectedLocker === num"
                   [disabled]="isLockerOccupied(num) || (isShiftOpen$ | async) === false"
                   (click)="selectLocker(num)"
                   color="primary">
             {{num}}
           </button>
        </div>

        <div class="actions">
            <button mat-raised-button color="primary" (click)="confirmCheckIn()" class="check-in-btn" 
                    [disabled]="isSubmitting || (isShiftOpen$ | async) === false">
                <span *ngIf="!isSubmitting">CHECK IN <span *ngIf="selectedLocker">(Locker {{selectedLocker}})</span></span>
                <span *ngIf="isSubmitting">Checking In...</span>
            </button>
            <button mat-button (click)="cancel()" [disabled]="isSubmitting">Cancel</button>
        </div>
      </div>
    </div>
  `,
  /* v8 ignore end */
  styles: [`
    .kiosk-container { max-width: 600px; margin: 0 auto; text-align: center; padding: var(--spacing-md); }
    .search-card { padding: var(--spacing-xl); margin-bottom: var(--spacing-xl); }
    .warning-card { 
      background-color: #fef2f2 !important; 
      color: #b91c1c !important; 
      margin-bottom: var(--spacing-lg); 
      padding: var(--spacing-md);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    .full-width { width: 100%; }
    .locker-selection { 
      /* Removed CSS animation */ 
    }
    .locker-grid { 
        display: grid; 
        grid-template-columns: repeat(auto-fill, minmax(60px, 1fr)); 
        gap: var(--spacing-md); 
        margin: var(--spacing-xl) 0;
        justify-items: center;
    }
    .actions { display: flex; flex-direction: column; gap: var(--spacing-md); }
    .check-in-btn { padding: var(--spacing-lg); font-size: 1.2rem; }
    .occupied { background-color: #e2e8f0 !important; color: #94a3b8 !important; }
    .selected { background-color: #4ade80 !important; color: #000 !important; transform: scale(1.1); }
  `],
  animations: [fadeIn]
})
export class CheckInKiosk implements OnInit {
  private memberService = inject(MemberService);
  private attendanceService = inject(AttendanceService);
  private storeService = inject(StoreService);
  private cashRegisterService = inject(CashRegisterService); // Inject CashRegisterService
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  searchControl = new FormControl<string | Member>('');
  members$: Observable<Member[]> = this.memberService.getMembers(); // Explicit type
  filteredMembers$!: Observable<Member[]>;
  isShiftOpen$ = this.cashRegisterService.currentShift$.pipe(map(s => s?.status === 'OPEN')); // Check Shift Status

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

  async onMemberSelected(event: any) {
    this.selectedMember = event.option.value;
    this.selectedLocker = null;
    if (this.selectedMember && this.selectedMember.gender) { // Check gender exists
      this.occupiedLockers = await this.attendanceService.getOccupiedLockers(this.selectedMember.gender);
    }
  }

  isLockerOccupied(num: number): boolean {
    return this.occupiedLockers.includes(num);
  }

  selectLocker(num: number) {
    if (this.selectedLocker === num) {
      this.selectedLocker = null;
    } else {
      this.selectedLocker = num;
    }
  }

  async confirmCheckIn() {
    if (!this.cashRegisterService.isShiftOpen()) {
      this.snackBar.open('Register is closed. Please open a shift first.', 'Close', { duration: 3000 });
      return;
    }

    if (!this.selectedMember) return;
    this.isSubmitting = true;
    try {
      const member = this.selectedMember;
      const isExpired = this.memberService.isMembershipExpired(member);
      const hasActiveSubscription = member.membershipStatus === 'Active' && !!member.membershipExpiration && !isExpired;
      const hasLocker = !!this.selectedLocker;

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
          this.selectedLocker = null; // Clear locker selection
          // Proceed to standard flow (will hit Step 2)
        }
        else if (result.action === 'update-subscription') {
          const updateDialog = this.dialog.open(SubscriptionUpdateDialog, {
            data: { member }
          });
          const updateResult = await firstValueFrom(updateDialog.afterClosed()) as SubscriptionUpdateResult;

          if (!updateResult || updateResult.action === 'cancel') {
            this.isSubmitting = false;
            return;
          }

          // Update Member Subscription
          const newExpiration = Timestamp.fromDate(updateResult.subscriptionDate);
          await this.memberService.updateMember(member.id!, {
            membershipExpiration: newExpiration,
            membershipStatus: 'Active'
          });

          // Update local member object for subsequent checks
          member.membershipExpiration = newExpiration;
          // Re-evaluate active status (it's active now)
          // But we proceed directly to check-in or pay flow

          if (updateResult.action === 'pay-and-check-in') {
            const products = await firstValueFrom(this.storeService.getProducts());
            // Try to find "Monthly", "Membership", or similar
            const membershipProduct = products.find(p =>
              p.name.toLowerCase().includes('monthly') ||
              p.name.toLowerCase().includes('membership')
            );

            if (!membershipProduct) {
              // Fallback or Warning? For now, we error to be safe.
              throw new Error('Membership product not found (search "Monthly" or "Membership"). Cannot process payment.');
            }

            await this.storeService.checkout([{
              productId: membershipProduct.id!,
              productName: membershipProduct.name,
              price: membershipProduct.price,
              originalPrice: membershipProduct.price,
              isPriceOverridden: false,
              quantity: 1,
              subtotal: membershipProduct.price
            }], 'ATTENDANCE_SUBSCRIPTION_UPDATE', updateResult.paymentMethod, updateResult.referenceNumber, undefined, undefined, member.id, member.name);

            this.snackBar.open('Subscription updated & Payment processed.', undefined, { duration: 2000 });
          } else {
            this.snackBar.open('Subscription updated.', undefined, { duration: 2000 });
          }

          // Proceed to Check-In (Skip Walk-in check since they are now subscribed)
          await this.doCheckIn(member);
          return;
        }
      }

      // 2. Subscription / Walk-in Check (Only if still not actively subscribed)
      // We re-check active status because it might have changed above? 
      // Actually, if we updated sub above, we returned early. So we only reach here if NO sub update happened.
      // OR if 'check-in-no-locker' was chosen.

      if (!hasActiveSubscription) {
        const dialogRef = this.dialog.open(WalkInDialog, {
          data: {
            member: member,
            isExpired: !!member.membershipExpiration // Distinguish expired vs never had one
          }
        });

        const result = await firstValueFrom(dialogRef.afterClosed()) as WalkInDialogResult;

        if (!result || result.action === 'cancel') {
          this.isSubmitting = false;
          return;
        }

        if (result.action === 'walk-in') {
          const products = await firstValueFrom(this.storeService.getProducts());
          const walkInProduct = products.find(p => p.name.toLowerCase().includes('walk-in'));

          if (!walkInProduct) {
            throw new Error('Walk-in product not found. Please contact admin.');
          }

          await this.storeService.checkout([{
            productId: walkInProduct.id!,
            productName: walkInProduct.name,
            price: walkInProduct.price,
            originalPrice: walkInProduct.price,
            isPriceOverridden: false,
            quantity: 1,
            subtotal: walkInProduct.price
          }], 'ATTENDANCE_WALK_IN', result.paymentMethod, result.referenceNumber, undefined, undefined, member.id, member.name);

          this.snackBar.open('Walk-in transaction created.', undefined, { duration: 2000 });
        }
        // If 'check-in' (no walk-in), we just fall through to doCheckIn
      }

      // 3. Final Check-in
      await this.doCheckIn(member);

    } catch (error: any) {
      this.snackBar.open(error.message, 'Close', { duration: 3000 });
    } finally {
      this.isSubmitting = false;
    }
  }

  async doCheckIn(member: Member) {
    await this.attendanceService.checkIn(member, this.selectedLocker || undefined);

    let message = `Checked in ${member.name}!`;
    // Resolve expiration for display
    let expDisplay = 'No Expiry';
    if (member.membershipExpiration) {
      const d = member.membershipExpiration.toDate ? member.membershipExpiration.toDate() : new Date(member.membershipExpiration);
      expDisplay = d.toLocaleDateString();
      message += ` (Exp: ${expDisplay})`;
    }

    this.snackBar.open(message, 'Close', { duration: 5000 });
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
}
