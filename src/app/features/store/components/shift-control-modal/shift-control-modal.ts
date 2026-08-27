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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CashRegisterService } from '../../../../core/services/cash-register.service';
import { ShiftSession, ShiftSummary, DenominationBreakdown } from '../../../../core/models/cash-register.model';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';

export interface DenominationItem {
  denomination: number;
  label: string;
  type: 'BILL' | 'COIN';
  count: number;
}

@Component({
  selector: 'app-shift-control-modal',
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatDividerModule, MatSnackBarModule,
    MatCheckboxModule, MatTooltipModule
  ],
  templateUrl: './shift-control-modal.html',
  styleUrl: './shift-control-modal.css'
})
export class ShiftControlModal implements OnInit {
  private cashRegisterService = inject(CashRegisterService);
  private notificationService = inject(NotificationService);
  private dialogRef = inject(MatDialogRef<ShiftControlModal>);
  private snackBar = inject(MatSnackBar);
  readonly authService = inject(AuthService);
  currentUser = this.authService.userProfile;

  currentShift: ShiftSession | null = null;
  lastClosedShift: ShiftSession | null = null;
  isShiftOpen = false;
  isLoading = false;

  // Opening form
  openingBalance = 0;
  suggestedBalance = 0;

  // Closing form & Multi-step wizard
  closingStep: 'SUMMARY' | 'COUNT' = 'SUMMARY';
  actualClosingBalance = 0;
  shiftSummary: ShiftSummary | null = null;

  // Denomination Breakdown (Default) vs Manual Override
  isManualOverride = false;

  billDenominations: DenominationItem[] = [
    { denomination: 1000, label: '₱1,000', type: 'BILL', count: 0 },
    { denomination: 500, label: '₱500', type: 'BILL', count: 0 },
    { denomination: 200, label: '₱200', type: 'BILL', count: 0 },
    { denomination: 100, label: '₱100', type: 'BILL', count: 0 },
    { denomination: 50, label: '₱50', type: 'BILL', count: 0 },
    { denomination: 20, label: '₱20', type: 'BILL', count: 0 }
  ];

  coinDenominations: DenominationItem[] = [
    { denomination: 20, label: '₱20 Coin', type: 'COIN', count: 0 },
    { denomination: 10, label: '₱10 Coin', type: 'COIN', count: 0 },
    { denomination: 5, label: '₱5 Coin', type: 'COIN', count: 0 },
    { denomination: 1, label: '₱1 Coin', type: 'COIN', count: 0 },
    { denomination: 0.25, label: '25¢ Coin', type: 'COIN', count: 0 }
  ];

  ngOnInit(): void {
    this.cashRegisterService.currentShift$.subscribe(shift => {
      this.currentShift = shift;
      this.isShiftOpen = shift?.status === 'OPEN';

      if (this.isShiftOpen && shift) {
        this.shiftSummary = this.cashRegisterService.getShiftSummary();

        // If manual override is enabled and count is 0, default to expected
        if (this.isManualOverride && this.actualClosingBalance === 0 && shift.expectedClosingBalance > 0) {
          this.actualClosingBalance = shift.expectedClosingBalance;
        }
      }
    });

    this.loadSuggestedBalance();
  }

  private async loadSuggestedBalance(): Promise<void> {
    const lastShift = await this.cashRegisterService.getLastClosedShift();
    this.lastClosedShift = lastShift;
    if (lastShift?.actualClosingBalance !== null && lastShift?.actualClosingBalance !== undefined) {
      this.suggestedBalance = lastShift.actualClosingBalance;
      this.openingBalance = this.suggestedBalance;
    } else if (lastShift?.expectedClosingBalance) {
      this.suggestedBalance = lastShift.expectedClosingBalance;
      this.openingBalance = this.suggestedBalance;
    }
  }

  switchUser(): void {
    this.dialogRef.close(false);
    this.authService.logout().subscribe();
  }

  goToCashCount(): void {
    this.closingStep = 'COUNT';
  }

  backToSummary(): void {
    this.closingStep = 'SUMMARY';
  }

  // Denomination Counting Logic
  onDenominationChange(): void {
    if (!this.isManualOverride) {
      this.actualClosingBalance = this.getCalculatedDenominationTotal();
    }
  }

  getCalculatedDenominationTotal(): number {
    let total = 0;
    for (const b of this.billDenominations) {
      total += (b.count || 0) * b.denomination;
    }
    for (const c of this.coinDenominations) {
      total += (c.count || 0) * c.denomination;
    }
    return Math.round(total * 100) / 100;
  }

  getTotalPieces(): number {
    let total = 0;
    for (const b of this.billDenominations) {
      total += (b.count || 0);
    }
    for (const c of this.coinDenominations) {
      total += (c.count || 0);
    }
    return total;
  }

  toggleManualOverride(): void {
    if (!this.isManualOverride) {
      // Re-sync with calculated denomination count
      this.actualClosingBalance = this.getCalculatedDenominationTotal();
    }
  }

  clearDenominations(): void {
    this.billDenominations.forEach(b => b.count = 0);
    this.coinDenominations.forEach(c => c.count = 0);
    if (!this.isManualOverride) {
      this.actualClosingBalance = 0;
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

      let denominations: DenominationBreakdown | null = null;
      if (!this.isManualOverride) {
        denominations = {};
        for (const b of this.billDenominations) {
          if (b.count > 0) denominations[b.denomination.toString()] = b.count;
        }
        for (const c of this.coinDenominations) {
          if (c.count > 0) denominations[c.denomination.toString()] = c.count;
        }
      }

      await this.cashRegisterService.closeShift(
        this.actualClosingBalance,
        userName,
        this.isManualOverride,
        denominations
      );

      // If manual override was used, notify Admins/Managers for audit visibility
      if (this.isManualOverride) {
        await this.notificationService.notifyAdmins(
          '⚠️ Shift Closed with Manual Cash Override',
          `${userName} closed shift with a manual total of ₱${this.actualClosingBalance.toFixed(2)} without itemized denomination breakdown.`,
          '/store/reports',
          { shiftId: this.currentShift?.id, staffName: userName, amount: this.actualClosingBalance }
        );
      }

      this.snackBar.open('Shift closed successfully', 'Close', { duration: 3000 });
      this.dialogRef.close(true);
    } catch (err: any) {
      console.error('Error closing shift:', err);
      this.snackBar.open(err.message || 'Failed to close shift', 'Close', { duration: 3000 });
    } finally {
      this.isLoading = false;
    }
  }

  async recalculate(): Promise<void> {
    if (!this.currentShift?.id) return;

    this.isLoading = true;
    try {
      const result = await this.cashRegisterService.recalculateShiftTotals(this.currentShift.id);
      this.shiftSummary = this.cashRegisterService.getShiftSummary();
      this.snackBar.open(`Recalculated. Adjustment: ₱${result.salesDiff.toFixed(2)}`, 'Close', { duration: 4000 });
    } catch (error: any) {
      this.snackBar.open('Recalculation failed: ' + error.message, 'Close', { duration: 3000 });
    } finally {
      this.isLoading = false;
    }
  }

  getDiscrepancy(): number {
    if (!this.shiftSummary) return 0;
    return this.actualClosingBalance - this.shiftSummary.expectedClosingBalance;
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
