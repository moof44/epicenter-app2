import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Member } from '../../../../core/models/member.model';

export interface LockerRestrictionDialogData {
  member: Member;
}

export interface LockerRestrictionResult { action: 'check-in-no-locker' | 'update-subscription' | 'cancel' }

@Component({
  selector: 'app-locker-restriction-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Locker Restriction</h2>
    <mat-dialog-content>
      <p>
        <strong>{{data.member.name}}</strong> does not have an active subscription. 
        Lockers are reserved for active members only.
      </p>
      <p>How would you like to proceed?</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="actions-column">
      <button mat-button (click)="onAction('cancel')">Cancel</button>
      <button mat-stroked-button (click)="onAction('check-in-no-locker')">Check-in (No Locker)</button>
      <button mat-raised-button color="primary" (click)="onAction('update-subscription')">Update Subscription</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .actions-column { flex-direction: column; align-items: flex-end; gap: 8px; }
    .actions-column button { margin: 0; width: 100%; max-width: 250px; }
  `]
})
export class LockerRestrictionDialog {
  dialogRef = inject(MatDialogRef<LockerRestrictionDialog>);
  data = inject<LockerRestrictionDialogData>(MAT_DIALOG_DATA);

  onAction(action: 'check-in-no-locker' | 'update-subscription' | 'cancel') {
    this.dialogRef.close({ action });
  }
}
