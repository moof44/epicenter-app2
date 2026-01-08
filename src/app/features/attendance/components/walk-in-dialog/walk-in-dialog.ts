import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Member } from '../../../../core/models/member.model';

export interface WalkInDialogData {
  member: Member;
  isExpired: boolean;
}

export interface WalkInDialogResult { action: 'walk-in' | 'check-in' | 'cancel' }

@Component({
  selector: 'app-walk-in-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Subscription Alert</h2>
    <mat-dialog-content>
      <p>
        <strong>{{data.member.name}}</strong> 
        <span *ngIf="data.isExpired">has an expired subscription (Enc: {{data.member.expiration?.toDate() | date}}).</span>
        <span *ngIf="!data.isExpired">does not have an active subscription.</span>
      </p>
      <p>Do you want to process this as a <strong>Walk-in</strong>?</p>
      <p class="note">"Yes" will create a Walk-in transaction. "No" will just check them in.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onAction('cancel')">Cancel</button>
      <button mat-stroked-button color="warn" (click)="onAction('check-in')">No (Check-in Only)</button>
      <button mat-raised-button color="primary" (click)="onAction('walk-in')">Yes (Walk-in Transaction)</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .note { font-size: 0.9em; color: #666; margin-top: 10px; }
  `]
})
export class WalkInDialog {
  dialogRef = inject(MatDialogRef<WalkInDialog>);
  data = inject<WalkInDialogData>(MAT_DIALOG_DATA);

  onAction(action: 'walk-in' | 'check-in' | 'cancel') {
    this.dialogRef.close({ action });
  }
}
