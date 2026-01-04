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
import { fadeIn } from '../../../../core/animations/animations';

@Component({
  selector: 'app-check-in-kiosk',
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule,
    MatInputModule, MatAutocompleteModule, MatButtonModule, MatIconModule,
    MatCardModule, MatGridListModule, MatSnackBarModule
  ],
  /* v8 ignore start */
  template: `
    <div class="kiosk-container">
      <mat-card class="search-card">
        <h2>Check In</h2>
        <mat-form-field class="full-width" appearance="outline">
          <mat-label>Search Member</mat-label>
          <input type="text" matInput [formControl]="searchControl" [matAutocomplete]="auto">
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
                   [disabled]="isLockerOccupied(num)"
                   (click)="selectLocker(num)"
                   color="primary">
             {{num}}
           </button>
        </div>

        <div class="actions">
            <button mat-raised-button color="primary" (click)="confirmCheckIn()" class="check-in-btn" 
                    [disabled]="isSubmitting">
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
  private snackBar = inject(MatSnackBar);

  searchControl = new FormControl<string | Member>('');
  members$: Observable<Member[]> = this.memberService.getMembers(); // Explicit type
  filteredMembers$!: Observable<Member[]>;

  selectedMember: Member | null = null;
  selectedLocker: number | null = null;
  occupiedLockers: number[] = [];
  lockerNumbers = Array.from({length: 12}, (_, i) => i + 1);
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
      // console.log('confirmCheckIn called', this.selectedMember);
      if (!this.selectedMember) return;
      this.isSubmitting = true;
      try {
          await this.attendanceService.checkIn(this.selectedMember, this.selectedLocker || undefined);
          // console.log('checkIn successful');
          
          let message = `Checked in ${this.selectedMember.name}!`;
          if (this.selectedMember.subscription) {
              const expDate = this.selectedMember.expiration ? new Date(this.selectedMember.expiration.seconds * 1000).toLocaleDateString() : 'No Expiry';
              message += ` (${this.selectedMember.subscription} - Exp: ${expDate})`;
          }
          
          this.snackBar.open(message, 'Close', { duration: 5000 });
          this.reset();
      } catch (error: any) {
          this.snackBar.open(error.message, 'Close', { duration: 3000 });
      } finally {
          this.isSubmitting = false;
      }
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
