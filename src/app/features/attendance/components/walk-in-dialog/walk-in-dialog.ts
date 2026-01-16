import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Member } from '../../../../core/models/member.model';

export interface WalkInDialogData {
  member: Member;
  isExpired: boolean;
}

import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { PreventDoubleClickDirective } from '../../../../shared/directives/prevent-double-click.directive';

export interface WalkInDialogResult {
  action: 'walk-in' | 'check-in' | 'cancel';
  paymentMethod?: 'CASH' | 'GCASH';
  referenceNumber?: string;
}

@Component({
  selector: 'app-walk-in-dialog',
  imports: [
    CommonModule, MatDialogModule, MatButtonModule, FormsModule,
    MatButtonToggleModule, MatInputModule, MatFormFieldModule,
    PreventDoubleClickDirective
  ],
  template: `
    <h2 mat-dialog-title>Subscription Alert</h2>
    <mat-dialog-content>
      <p>
        <strong>{{data.member.name}}</strong> 
        <span *ngIf="data.isExpired">has an expired subscription (Enc: {{data.member.membershipExpiration?.toDate() | date}}).</span>
        <span *ngIf="!data.isExpired">does not have an active subscription.</span>
      </p>
      
      <div class="payment-section">
        <p><strong>Payment Method (for Walk-in):</strong></p>
        <mat-button-toggle-group [(ngModel)]="paymentMethod" name="paymentMethod" aria-label="Payment Method">
          <mat-button-toggle value="CASH">Cash</mat-button-toggle>
          <mat-button-toggle value="GCASH">GCash</mat-button-toggle>
        </mat-button-toggle-group>

        <mat-form-field appearance="outline" class="full-width" *ngIf="paymentMethod === 'GCASH'">
          <mat-label>Reference Number</mat-label>
          <input matInput [(ngModel)]="referenceNumber" required placeholder="Ref No.">
        </mat-form-field>
      </div>

      <p class="note">"Yes" will create a Walk-in transaction. "No" will just check them in.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onAction('cancel')">Cancel</button>
      <button mat-stroked-button color="warn" (click)="onAction('check-in')">No (Check-in Only)</button>
      <button mat-raised-button color="primary" appPreventDoubleClick (throttledClick)="onAction('walk-in')"
        [disabled]="paymentMethod === 'GCASH' && !referenceNumber">
        Yes (Walk-in Transaction)
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .note { font-size: 0.9em; color: #666; margin-top: 10px; }
    .payment-section { margin: 15px 0; padding: 10px; background: #f8f9fa; border-radius: 8px; }
    .full-width { width: 100%; margin-top: 10px; }
    mat-button-toggle-group { margin-bottom: 5px; }
  `]
})
export class WalkInDialog {
  dialogRef = inject(MatDialogRef<WalkInDialog>);
  data = inject<WalkInDialogData>(MAT_DIALOG_DATA);

  paymentMethod: 'CASH' | 'GCASH' = 'CASH';
  referenceNumber = '';

  onAction(action: 'walk-in' | 'check-in' | 'cancel') {
    if (action === 'walk-in') {
      if (this.paymentMethod === 'GCASH' && !this.referenceNumber) return;

      this.dialogRef.close({
        action,
        paymentMethod: this.paymentMethod,
        referenceNumber: this.referenceNumber
      });
    } else {
      this.dialogRef.close({ action });
    }
  }
}
