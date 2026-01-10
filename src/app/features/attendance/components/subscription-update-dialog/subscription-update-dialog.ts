import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { Member } from '../../../../core/models/member.model';

export interface SubscriptionUpdateDialogData {
  member: Member;
}

import { MatButtonToggleModule } from '@angular/material/button-toggle';

export interface SubscriptionUpdateResult {
  action: 'check-in-only' | 'pay-and-check-in' | 'cancel',
  subscriptionDate: Date,
  paymentMethod?: 'CASH' | 'GCASH';
  referenceNumber?: string;
}

@Component({
  selector: 'app-subscription-update-dialog',
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, MatDialogModule,
    MatButtonModule, MatDatepickerModule, MatFormFieldModule,
    MatInputModule, MatNativeDateModule, MatButtonToggleModule
  ],
  template: `
    <h2 mat-dialog-title>Update Subscription</h2>
    <mat-dialog-content>
      <p>Updating subscription for <strong>{{data.member.name}}</strong>.</p>
      
      <div class="form-container">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Subscription Type</mat-label>
          <input matInput value="Monthly Membership" disabled>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>New Expiration Date</mat-label>
          <input matInput [matDatepicker]="picker" [formControl]="dateControl">
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
        </mat-form-field>

        <div class="payment-section">
            <p><strong>Payment Method:</strong></p>
            <mat-button-toggle-group [(ngModel)]="paymentMethod" [ngModelOptions]="{standalone: true}" name="paymentMethod">
              <mat-button-toggle value="CASH">Cash</mat-button-toggle>
              <mat-button-toggle value="GCASH">GCash</mat-button-toggle>
            </mat-button-toggle-group>
    
            <mat-form-field appearance="outline" class="full-width" *ngIf="paymentMethod === 'GCASH'">
              <mat-label>Reference Number</mat-label>
              <input matInput [(ngModel)]="referenceNumber" [ngModelOptions]="{standalone: true}" required placeholder="Ref No.">
            </mat-form-field>
        </div>
      </div>

    </mat-dialog-content>
    <mat-dialog-actions align="end" class="actions-column">
      <button mat-button (click)="onAction('cancel')">Cancel</button>
      <button mat-stroked-button (click)="onAction('check-in-only')">Update & Check-in (No Pay)</button>
      <button mat-raised-button color="primary" (click)="onAction('pay-and-check-in')"
        [disabled]="paymentMethod === 'GCASH' && !referenceNumber">
        Update, Pay & Check-in
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form-container { display: flex; flex-direction: column; gap: 16px; margin: 16px 0; }
    .full-width { width: 100%; }
    .actions-column { flex-direction: column; align-items: flex-end; gap: 8px; }
    .actions-column button { margin: 0; width: 100%; max-width: 250px; }
    .payment-section { margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 8px; width: 100%; box-sizing: border-box; }
  `]
})
export class SubscriptionUpdateDialog {
  dateControl = new FormControl(this.getDefaultDate(), [Validators.required]);
  dialogRef = inject(MatDialogRef<SubscriptionUpdateDialog>);
  data = inject<SubscriptionUpdateDialogData>(MAT_DIALOG_DATA);

  paymentMethod: 'CASH' | 'GCASH' = 'CASH';
  referenceNumber = '';

  getDefaultDate(): Date {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date;
  }

  onAction(action: 'check-in-only' | 'pay-and-check-in' | 'cancel') {
    if (action === 'cancel') {
      this.dialogRef.close({ action });
      return;
    }

    if (this.dateControl.invalid || !this.dateControl.value) {
      this.dateControl.markAsTouched();
      return;
    }

    if (action === 'pay-and-check-in') {
      if (this.paymentMethod === 'GCASH' && !this.referenceNumber) return;
    }

    this.dialogRef.close({
      action,
      subscriptionDate: this.dateControl.value,
      paymentMethod: this.paymentMethod,
      referenceNumber: this.referenceNumber
    });
  }
}
