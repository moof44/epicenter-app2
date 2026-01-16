import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CashRegisterService } from '../../../../core/services/cash-register.service';
import { ShiftSession, ShiftSummary } from '../../../../core/models/cash-register.model';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-shift-control-modal',
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatDividerModule, MatSnackBarModule
  ],
  templateUrl: './shift-control-modal.html',
  styleUrl: './shift-control-modal.css'
})
export class ShiftControlModal implements OnInit {
  private cashRegisterService = inject(CashRegisterService);
  private dialogRef = inject(MatDialogRef<ShiftControlModal>);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);

  currentShift: ShiftSession | null = null;
  isShiftOpen = false;
  isLoading = false;

  // Opening form
  openingBalance = 0;
  suggestedBalance = 0;

  // Closing form
  actualClosingBalance = 0;
  shiftSummary: ShiftSummary | null = null;

  ngOnInit(): void {
    this.cashRegisterService.currentShift$.subscribe(shift => {
      this.currentShift = shift;
      this.isShiftOpen = shift?.status === 'OPEN';

      if (this.isShiftOpen && shift) {
        this.shiftSummary = this.cashRegisterService.getShiftSummary();

        // Only set actualClosingBalance to expected if it hasn't been set yet (or on first load)
        // We compare with 0 or check if it matches the *previous* expected balance to determine if we should update it.
        // Better: Only set it when the modal Opens.
        // However, this subscription runs whenever currentShift updates.
        // If we are strictly in "Close Register" mode, we might want to start with the expected balance.

        // Fix: Don't overwrite if we already have a value that might be user input
        if (this.actualClosingBalance === 0 && shift.expectedClosingBalance > 0) {
          this.actualClosingBalance = shift.expectedClosingBalance;
        }
      }
    });

    this.loadSuggestedBalance();
  }


  private async loadSuggestedBalance(): Promise<void> {
    const lastShift = await this.cashRegisterService.getLastClosedShift();
    if (lastShift?.actualClosingBalance) {
      this.suggestedBalance = lastShift.actualClosingBalance;
      this.openingBalance = this.suggestedBalance;
    }
  }

  async openShift(): Promise<void> {
    if (this.openingBalance < 0) {
      this.snackBar.open('Opening balance cannot be negative', 'Close', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    try {
      const user = this.authService.userProfile();
      const userName = user?.displayName || user?.email || 'Unknown Staff';
      await this.cashRegisterService.openShift(this.openingBalance, userName);
      this.snackBar.open('Shift opened successfully', 'Close', { duration: 3000 });
      this.dialogRef.close(true);
    } catch (err: any) {
      this.snackBar.open(err.message || 'Failed to open shift', 'Close', { duration: 3000 });
    } finally {
      this.isLoading = false;
    }
  }

  async closeShift(): Promise<void> {
    if (this.actualClosingBalance < 0) {
      this.snackBar.open('Closing balance cannot be negative', 'Close', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    try {
      const user = this.authService.userProfile();
      const userName = user?.displayName || user?.email || 'Unknown Staff';
      await this.cashRegisterService.closeShift(this.actualClosingBalance, userName);
      this.snackBar.open('Shift closed successfully', 'Close', { duration: 3000 });
      this.dialogRef.close(true);
    } catch (err: any) {
      console.error('Error closing shift:', err);
      this.snackBar.open(err.message || 'Failed to close shift', 'Close', { duration: 3000 });
    } finally {
      this.isLoading = false;
    }
  }

  getDiscrepancy(): number {
    if (!this.shiftSummary) return 0;
    return this.actualClosingBalance - this.shiftSummary.expectedClosingBalance;
  }

  async recalculateTotals(): Promise<void> {
    if (!this.currentShift?.id) return;

    this.isLoading = true;
    try {
      const result = await this.cashRegisterService.recalculateShiftTotals(this.currentShift.id);
      this.snackBar.open(`Recalculated. Adjustment: ₱${result.salesDiff.toFixed(2)}`, 'Close', { duration: 4000 });
      // Reload summary
      this.shiftSummary = this.cashRegisterService.getShiftSummary();
    } catch (err: any) {
      this.snackBar.open('Recalculation failed: ' + err.message, 'Close', { duration: 3000 });
    } finally {
      this.isLoading = false;
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
