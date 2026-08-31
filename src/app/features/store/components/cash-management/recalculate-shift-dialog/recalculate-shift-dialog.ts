import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CashRegisterService } from '../../../../../core/services/cash-register.service';
import { ShiftSession } from '../../../../../core/models/cash-register.model';

export interface RecalculateDialogData {
  shift: ShiftSession;
}

export interface RecalculateResult {
  salesDiff: number;
}

@Component({
  selector: 'app-recalculate-shift-dialog',
  standalone: true,
  imports: [
    CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ],
  templateUrl: './recalculate-shift-dialog.html',
  styleUrl: './recalculate-shift-dialog.css'
})
export class RecalculateShiftDialog {
  readonly dialogRef = inject(MatDialogRef<RecalculateShiftDialog>);
  readonly data = inject<RecalculateDialogData>(MAT_DIALOG_DATA);
  private cashRegisterService = inject(CashRegisterService);

  isCalculating = signal(false);
  errorMessage = signal<string | null>(null);
  result = signal<RecalculateResult | null>(null);

  async onRecalculate(): Promise<void> {
    const shiftId = this.data.shift.id;
    if (!shiftId) {
      this.errorMessage.set('No active shift ID available.');
      return;
    }

    this.isCalculating.set(true);
    this.errorMessage.set(null);

    try {
      const res = await this.cashRegisterService.recalculateShiftTotals(shiftId);
      this.result.set(res);
    } catch (err: any) {
      console.error('Recalculate error:', err);
      this.errorMessage.set(err.message || 'Failed to recalculate shift totals.');
    } finally {
      this.isCalculating.set(false);
    }
  }

  onClose(): void {
    this.dialogRef.close(this.result() !== null);
  }
}
