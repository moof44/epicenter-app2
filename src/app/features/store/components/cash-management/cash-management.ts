import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../../../core/services/auth.service';
import { CashRegisterService } from '../../../../core/services/cash-register.service';
import { CashTransactionType } from '../../../../core/models/cash-register.model';
import { ShiftControlModal } from '../shift-control-modal/shift-control-modal';
import { fadeIn } from '../../../../core/animations/animations';
import { TutorialService } from '../../../../core/services/tutorial.service';
import { TUTORIALS } from '../../../../core/constants/tutorials';

@Component({
  selector: 'app-cash-management',
  imports: [
    CommonModule, FormsModule, MatTableModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatSelectModule, MatCardModule,
    MatChipsModule, MatSnackBarModule, MatDialogModule
  ],
  templateUrl: './cash-management.html',
  styleUrl: './cash-management.css',
  animations: [fadeIn]
})
export class CashManagement implements OnInit {
  private cashRegisterService = inject(CashRegisterService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private authService = inject(AuthService);
  private tutorialService = inject(TutorialService);

  currentShift$ = this.cashRegisterService.currentShift$;
  displayedColumns = ['timestamp', 'type', 'paymentMethod', 'reason', 'amount'];

  // Form state
  showForm = false;
  formType: 'expense' | 'floatIn' | 'floatOut' = 'expense';
  formAmount = 0;
  formReason = '';
  isSubmitting = false;

  ngOnInit(): void {
    setTimeout(() => {
      this.tutorialService.startTutorial(TUTORIALS['SHIFT_MGMT'].id);
    }, 1000);
  }

  openForm(type: 'expense' | 'floatIn' | 'floatOut'): void {
    this.formType = type;
    this.formAmount = 0;
    this.formReason = '';
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
  }

  async submitTransaction(): Promise<void> {
    if (this.formAmount <= 0) {
      this.snackBar.open('Amount must be greater than 0', 'Close', { duration: 3000 });
      return;
    }
    if (!this.formReason.trim()) {
      this.snackBar.open('Please provide a reason', 'Close', { duration: 3000 });
      return;
    }

    this.isSubmitting = true;
    try {
      const user = this.authService.userProfile();
      const userName = user?.displayName || user?.email || 'Unknown Staff';

      switch (this.formType) {
        case 'expense':
          await this.cashRegisterService.addExpense(this.formAmount, this.formReason, userName);
          break;
        case 'floatIn':
          await this.cashRegisterService.addFloatIn(this.formAmount, this.formReason, userName);
          break;
        case 'floatOut':
          await this.cashRegisterService.addFloatOut(this.formAmount, this.formReason, userName);
          break;
      }
      this.snackBar.open('Transaction recorded', 'Close', { duration: 3000 });
      this.closeForm();
    } catch (err: any) {
      this.snackBar.open(err.message || 'Failed to record transaction', 'Close', { duration: 3000 });
    } finally {
      this.isSubmitting = false;
    }
  }

  openShiftModal(): void {
    this.dialog.open(ShiftControlModal, {
      width: '500px',
      disableClose: true
    });
  }

  getFormTitle(): string {
    const titles = {
      expense: 'Add Expense / Cash Out',
      floatIn: 'Add Cash In (Float)',
      floatOut: 'Cash Out (Float)'
    };
    return titles[this.formType];
  }

  getTypeColor(type: CashTransactionType): string {
    const colors: Record<CashTransactionType, string> = {
      'Sale': 'primary',
      'Float_In': 'accent',
      'Expense': 'warn',
      'Float_Out': 'warn'
    };
    return colors[type];
  }

  getTypeIcon(type: CashTransactionType): string {
    const icons: Record<CashTransactionType, string> = {
      'Sale': 'point_of_sale',
      'Float_In': 'add_circle',
      'Expense': 'remove_circle',
      'Float_Out': 'money_off'
    };
    return icons[type];
  }

  isPositive(type: CashTransactionType): boolean {
    return type === 'Sale' || type === 'Float_In';
  }

  formatTimestamp(timestamp: any): Date {
    if (!timestamp) return new Date();
    return timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
  }

  async recalculateShift(): Promise<void> {
    const shift = await this.cashRegisterService.currentShift$.pipe().toPromise(); // Get current value safely or use behaviorsubject value
    // better:
    const currentShift = this.cashRegisterService['currentShift'].getValue(); // Accessing private subject? No, it exposes it as observable usually.
    // The service has `getCurrentShiftId()`
    const shiftId = this.cashRegisterService.getCurrentShiftId();

    if (!shiftId) {
      this.snackBar.open('No active shift to recalculate', 'Close', { duration: 3000 });
      return;
    }

    if (confirm('Are you sure you want to recalculate shift totals? This will update the summary based on all transactions.')) {
      this.isSubmitting = true;
      try {
        const result = await this.cashRegisterService.recalculateShiftTotals(shiftId);
        this.snackBar.open(`Shift totals recalculated. Adjustment: ₱${result.salesDiff.toFixed(2)}`, 'Close', { duration: 4000 });
      } catch (error: any) {
        this.snackBar.open('Recalculation failed: ' + error.message, 'Close', { duration: 3000 });
      } finally {
        this.isSubmitting = false;
      }
    }
  }
}
