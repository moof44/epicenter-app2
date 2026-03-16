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
  templateUrl: './subscription-update-dialog.html',
  styleUrl: './subscription-update-dialog.css'
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
