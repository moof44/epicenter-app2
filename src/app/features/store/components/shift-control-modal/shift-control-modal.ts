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
import { ShiftSession, ShiftSummary, DenominationBreakdown, HandoverDenominationAudit } from '../../../../core/models/cash-register.model';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { compareDenominations } from '../../../../core/utils/cash-register.utils';

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
  openingRemarks = '';
  isOpeningManualOverride = false;
  isLiabilityConfirmed = false;
  isSameAsPreviousActive = false;
  handoverAudit: HandoverDenominationAudit | null = null;

  openingBillDenominations: DenominationItem[] = [
    { denomination: 1000, label: '₱1,000', type: 'BILL', count: 0 },
    { denomination: 500, label: '₱500', type: 'BILL', count: 0 },
    { denomination: 200, label: '₱200', type: 'BILL', count: 0 },
    { denomination: 100, label: '₱100', type: 'BILL', count: 0 },
    { denomination: 50, label: '₱50', type: 'BILL', count: 0 },
    { denomination: 20, label: '₱20 (Bill / Coin)', type: 'BILL', count: 0 }
  ];

  openingCoinDenominations: DenominationItem[] = [
    { denomination: 10, label: '₱10 Coin', type: 'COIN', count: 0 },
    { denomination: 5, label: '₱5 Coin', type: 'COIN', count: 0 },
    { denomination: 1, label: '₱1 Coin', type: 'COIN', count: 0 },
    { denomination: 0.25, label: '25¢ Coin', type: 'COIN', count: 0 }
  ];

  // Closing form & Multi-step wizard
  closingStep: 'SUMMARY' | 'COUNT' = 'SUMMARY';
  actualClosingBalance = 0;
  shiftSummary: ShiftSummary | null = null;
  isManualOverride = false;

  billDenominations: DenominationItem[] = [
    { denomination: 1000, label: '₱1,000', type: 'BILL', count: 0 },
    { denomination: 500, label: '₱500', type: 'BILL', count: 0 },
    { denomination: 200, label: '₱200', type: 'BILL', count: 0 },
    { denomination: 100, label: '₱100', type: 'BILL', count: 0 },
    { denomination: 50, label: '₱50', type: 'BILL', count: 0 },
    { denomination: 20, label: '₱20 (Bill / Coin)', type: 'BILL', count: 0 }
  ];

  coinDenominations: DenominationItem[] = [
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

    this.recalculateHandoverAudit();
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

  // ════════════════ OPENING COUNT & HANDOVER LOGIC ════════════════

  copyPreviousHandover(): void {
    if (!this.lastClosedShift) return;

    const prevClosingDenoms = this.lastClosedShift.closingDenominations || {};
    
    for (const b of this.openingBillDenominations) {
      b.count = Number(prevClosingDenoms[String(b.denomination)] || 0);
    }
    for (const c of this.openingCoinDenominations) {
      c.count = Number(prevClosingDenoms[String(c.denomination)] || 0);
    }

    this.openingBalance = this.getCalculatedOpeningTotal();
    this.isSameAsPreviousActive = true;
    this.isLiabilityConfirmed = true;
    this.recalculateHandoverAudit();
    this.snackBar.open('Copied exact handover count from previous shift.', 'Close', { duration: 2500 });
  }

  onOpeningDenominationChange(): void {
    this.isSameAsPreviousActive = false;
    if (!this.isOpeningManualOverride) {
      this.openingBalance = this.getCalculatedOpeningTotal();
    }
    this.recalculateHandoverAudit();
  }

  getCalculatedOpeningTotal(): number {
    let total = 0;
    for (const b of this.openingBillDenominations) {
      total += (b.count || 0) * b.denomination;
    }
    for (const c of this.openingCoinDenominations) {
      total += (c.count || 0) * c.denomination;
    }
    return Math.round(total * 100) / 100;
  }

  getOpeningPieces(): number {
    let total = 0;
    for (const b of this.openingBillDenominations) {
      total += (b.count || 0);
    }
    for (const c of this.openingCoinDenominations) {
      total += (c.count || 0);
    }
    return total;
  }

  toggleOpeningManualOverride(): void {
    if (!this.isOpeningManualOverride) {
      this.openingBalance = this.getCalculatedOpeningTotal();
    }
    this.recalculateHandoverAudit();
  }

  clearOpeningDenominations(): void {
    this.openingBillDenominations.forEach(b => b.count = 0);
    this.openingCoinDenominations.forEach(c => c.count = 0);
    this.isSameAsPreviousActive = false;
    if (!this.isOpeningManualOverride) {
      this.openingBalance = 0;
    }
    this.recalculateHandoverAudit();
  }

  getPrevCount(denomination: number): number {
    if (!this.lastClosedShift?.closingDenominations) return 0;
    return Number(this.lastClosedShift.closingDenominations[String(denomination)] || 0);
  }

  getOpeningDiff(item: DenominationItem): number {
    const prev = this.getPrevCount(item.denomination);
    return (item.count || 0) - prev;
  }

  recalculateHandoverAudit(): void {
    const prevClosingCash = (this.lastClosedShift?.actualClosingBalance !== null && this.lastClosedShift?.actualClosingBalance !== undefined)
      ? this.lastClosedShift.actualClosingBalance
      : (this.lastClosedShift?.expectedClosingBalance || 0);

    const openBreakdown: DenominationBreakdown = {};
    if (!this.isOpeningManualOverride) {
      for (const b of this.openingBillDenominations) {
        if (b.count > 0) openBreakdown[String(b.denomination)] = b.count;
      }
      for (const c of this.openingCoinDenominations) {
        if (c.count > 0) openBreakdown[String(c.denomination)] = c.count;
      }
    }

    this.handoverAudit = compareDenominations(
      this.lastClosedShift?.closingDenominations,
      openBreakdown,
      prevClosingCash,
      this.openingBalance,
      this.lastClosedShift?.id,
      this.lastClosedShift?.closedBy || this.lastClosedShift?.openedBy,
      this.openingRemarks
    );
  }

  async openShift(): Promise<void> {
    if (this.openingBalance < 0) {
      this.snackBar.open('Opening balance cannot be negative', 'Close', { duration: 3000 });
      return;
    }

    this.recalculateHandoverAudit();

    // If there is a cash mismatch and no remarks, suggest a note
    if (this.handoverAudit && this.handoverAudit.status === 'CASH_MISMATCH' && !this.openingRemarks.trim()) {
      if (!confirm('There is a cash difference of ₱' + Math.abs(this.handoverAudit.cashVariance).toFixed(2) + ' vs previous shift close without remarks. Do you still want to proceed?')) {
        return;
      }
    }

    this.isLoading = true;
    try {
      const user = this.authService.userProfile();
      const userName = user?.displayName || user?.email || 'Unknown Staff';

      let denominations: DenominationBreakdown | null = null;
      if (!this.isOpeningManualOverride) {
        denominations = {};
        for (const b of this.openingBillDenominations) {
          if (b.count > 0) denominations[String(b.denomination)] = b.count;
        }
        for (const c of this.openingCoinDenominations) {
          if (c.count > 0) denominations[String(c.denomination)] = c.count;
        }
      }

      await this.cashRegisterService.openShift(
        this.openingBalance,
        userName,
        this.isOpeningManualOverride,
        denominations,
        this.openingRemarks,
        this.handoverAudit
      );

      this.snackBar.open('Shift opened successfully', 'Close', { duration: 3000 });
      this.dialogRef.close(true);
    } catch (err: any) {
      this.snackBar.open(err.message || 'Failed to open shift', 'Close', { duration: 3000 });
    } finally {
      this.isLoading = false;
    }
  }

  // ════════════════ CLOSING COUNT LOGIC ════════════════

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

  async closeShift(): Promise<void> {
    if (this.actualClosingBalance < 0) {
      this.snackBar.open('Closing balance cannot be negative', 'Close', { duration: 3000 });
      return;
    }

    const expected = this.shiftSummary?.expectedClosingBalance || 0;
    if (this.actualClosingBalance === 0 && expected > 0) {
      const confirmed = confirm(
        `⚠️ ZERO CASH COUNT WARNING:\n\n` +
        `Actual counted cash is ₱0.00, but expected cash in drawer is ₱${expected.toFixed(2)}.\n\n` +
        `Did you perform a physical cash count?\n` +
        `• Click "Cancel" to go back and count bills and coins.\n` +
        `• Click "OK" ONLY if the physical cash drawer is truly empty (₱0.00).`
      );
      if (!confirmed) {
        return;
      }
    }

    const discrepancy = this.getDiscrepancy();
    if (Math.abs(discrepancy) >= 500 && this.actualClosingBalance > 0) {
      const confirmed = confirm(
        `⚠️ LARGE CASH DISCREPANCY DETECTED:\n\n` +
        `Expected: ₱${expected.toFixed(2)}\n` +
        `Counted: ₱${this.actualClosingBalance.toFixed(2)}\n` +
        `Discrepancy: ${discrepancy > 0 ? '+' : ''}₱${discrepancy.toFixed(2)}\n\n` +
        `Are you sure you want to close this shift with this variance?`
      );
      if (!confirmed) {
        return;
      }
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
          userName + ' closed shift with a manual total of ₱' + this.actualClosingBalance.toFixed(2) + ' without itemized denomination breakdown.',
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
      this.snackBar.open('Recalculated. Adjustment: ₱' + result.salesDiff.toFixed(2), 'Close', { duration: 4000 });
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
