import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CashRegisterService } from '../../../../../core/services/cash-register.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { OutflowCategory, OUTFLOW_CATEGORIES, getOutflowCategoryMeta } from '../../../../../core/models/outflow.model';

export type MovementType = 'expense' | 'floatIn' | 'floatOut';

export interface CashMovementDialogData {
  type: MovementType;
}

@Component({
  selector: 'app-cash-movement-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule
  ],
  templateUrl: './cash-movement-dialog.html',
  styleUrl: './cash-movement-dialog.css'
})
export class CashMovementDialog {
  readonly dialogRef = inject(MatDialogRef<CashMovementDialog>);
  readonly data = inject<CashMovementDialogData>(MAT_DIALOG_DATA);
  private cashRegisterService = inject(CashRegisterService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  readonly categories = OUTFLOW_CATEGORIES;
  readonly getCategoryMeta = getOutflowCategoryMeta;

  amount = 0;
  reason = '';
  category: OutflowCategory = this.getDefaultCategory();
  billerOrSupplier = '';
  isSubmitting = signal(false);

  private getDefaultCategory(): OutflowCategory {
    if (this.data.type === 'expense') return 'EXPENSE_SUPPLIES';
    if (this.data.type === 'floatOut') return 'LIABILITY_OWNER';
    return 'EXPENSE_MISC';
  }

  getTitle(): string {
    switch (this.data.type) {
      case 'expense': return 'Add Expense / Cash Out';
      case 'floatIn': return 'Add Cash In (Float)';
      case 'floatOut': return 'Cash Out (Remittance / Safe Drop)';
    }
  }

  getSubtitle(): string {
    switch (this.data.type) {
      case 'expense': return 'Record operating expenses and vendor payouts from register';
      case 'floatIn': return 'Deposit additional cash float or change fund into drawer';
      case 'floatOut': return 'Record safe drops or owner remittances out of drawer';
    }
  }

  getIcon(): string {
    switch (this.data.type) {
      case 'expense': return 'remove_circle';
      case 'floatIn': return 'add_circle';
      case 'floatOut': return 'money_off';
    }
  }

  async onSubmit(): Promise<void> {
    if (this.amount <= 0) {
      this.snackBar.open('Amount must be greater than ₱0.00', 'Close', { duration: 3000 });
      return;
    }
    if (!this.reason.trim()) {
      this.snackBar.open('Please provide a reason / description', 'Close', { duration: 3000 });
      return;
    }

    this.isSubmitting.set(true);
    try {
      const user = this.authService.userProfile();
      const userName = user?.displayName || user?.email || 'Unknown Staff';

      switch (this.data.type) {
        case 'expense':
          await this.cashRegisterService.addExpense(
            this.amount,
            this.reason,
            userName,
            this.category,
            this.billerOrSupplier
          );
          break;
        case 'floatIn':
          await this.cashRegisterService.addFloatIn(
            this.amount,
            this.reason,
            userName
          );
          break;
        case 'floatOut':
          await this.cashRegisterService.addFloatOut(
            this.amount,
            this.reason,
            userName,
            this.category,
            this.billerOrSupplier
          );
          break;
      }

      this.dialogRef.close(true);
    } catch (err: any) {
      if (err.message === 'STALE_SHIFT' || err.message === 'SILENT') {
        this.dialogRef.close(true);
        return;
      }
      this.snackBar.open(err.message || 'Failed to record transaction', 'Close', { duration: 3000 });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  onClose(): void {
    this.dialogRef.close(false);
  }
}
