import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { Transaction } from '../../../../../core/models/store.model';

export interface ClaimSaleDialogData {
  transaction: Transaction;
  currentUserName: string;
}

@Component({
  selector: 'app-claim-sale-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatInputModule, FormsModule],
  templateUrl: './claim-sale-dialog.html',
  styleUrl: './claim-sale-dialog.css'
})
export class ClaimSaleDialog {
  readonly dialogRef = inject(MatDialogRef<ClaimSaleDialog>);
  readonly data = inject<ClaimSaleDialogData>(MAT_DIALOG_DATA);

  reason = '';

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    this.dialogRef.close({ reason: this.reason.trim() });
  }
}
