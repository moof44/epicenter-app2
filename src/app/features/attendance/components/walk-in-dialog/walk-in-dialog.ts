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
  templateUrl: './walk-in-dialog.html',
  styleUrl: './walk-in-dialog.css'
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
