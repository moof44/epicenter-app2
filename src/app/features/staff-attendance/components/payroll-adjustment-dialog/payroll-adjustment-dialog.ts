import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { StaffWeeklyAttendanceSummary } from '../../../../core/models/staff-attendance.model';

export interface PayrollItemEdit {
  staffId: string;
  staffName: string;
  roles: string[];
  daysPresent: number;
  baseCompensation: number;
  valeDeduction: number;
  valeNote?: string;
  adjustmentAmount: number;
  adjustmentReason: string;
  netAmount: number;
  included: boolean;
}

export interface PayrollDialogData {
  sunday: Date;
  saturday: Date;
  staffSummaries: StaffWeeklyAttendanceSummary[];
  detectedVales?: Record<string, { amount: number; note: string }>;
}

export interface PayrollDialogResult {
  title: string;
  totalGross: number;
  totalVale: number;
  totalAdjustments: number;
  totalNet: number;
  items: PayrollItemEdit[];
  notes: string;
}

@Component({
  selector: 'app-payroll-adjustment-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatButtonModule,
    MatIconModule, MatFormFieldModule, MatInputModule, MatCheckboxModule,
    MatTooltipModule
  ],
  templateUrl: './payroll-adjustment-dialog.html',
  styleUrl: './payroll-adjustment-dialog.css'
})
export class PayrollAdjustmentDialogComponent implements OnInit {
  dialogRef = inject(MatDialogRef<PayrollAdjustmentDialogComponent>);
  data: PayrollDialogData = inject(MAT_DIALOG_DATA);

  payrollTitle = '';
  items: PayrollItemEdit[] = [];

  ngOnInit(): void {
    const satStr = this.data.saturday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    this.payrollTitle = `Weekly Staff Payroll - Week ending ${satStr}`;

    const vales = this.data.detectedVales || {};

    this.items = this.data.staffSummaries
      .filter(s => (s.totalCompensation || 0) > 0 || s.daysPresent > 0)
      .map(s => {
        const base = s.totalCompensation || 0;
        // Match detected vale by staffId or staffName
        const detected = vales[s.staffId] || vales[s.staffName.toLowerCase()] || { amount: 0, note: '' };
        const valeAmt = detected.amount || 0;
        const net = Math.max(0, base - valeAmt);

        return {
          staffId: s.staffId,
          staffName: s.staffName,
          roles: s.roles || [],
          daysPresent: s.daysPresent || 0,
          baseCompensation: base,
          valeDeduction: valeAmt,
          valeNote: detected.note || '',
          adjustmentAmount: 0,
          adjustmentReason: '',
          netAmount: net,
          included: true
        };
      });
  }

  recalculateRow(item: PayrollItemEdit): void {
    const base = Number(item.baseCompensation || 0);
    const vale = Number(item.valeDeduction || 0);
    const adj = Number(item.adjustmentAmount || 0);
    item.netAmount = Math.max(0, base - vale + adj);
  }

  get totalGross(): number {
    return this.items
      .filter(i => i.included)
      .reduce((sum, i) => sum + Number(i.baseCompensation || 0), 0);
  }

  get totalVale(): number {
    return this.items
      .filter(i => i.included)
      .reduce((sum, i) => sum + Number(i.valeDeduction || 0), 0);
  }

  get totalAdjustments(): number {
    return this.items
      .filter(i => i.included)
      .reduce((sum, i) => sum + Number(i.adjustmentAmount || 0), 0);
  }

  get totalNet(): number {
    return this.items
      .filter(i => i.included)
      .reduce((sum, i) => sum + Number(i.netAmount || 0), 0);
  }

  get activeStaffCount(): number {
    return this.items.filter(i => i.included).length;
  }

  toggleAll(checked: boolean): void {
    this.items.forEach(i => i.included = checked);
  }

  submit(): void {
    if (this.totalNet <= 0 && this.activeStaffCount === 0) {
      return;
    }

    const sunStr = this.data.sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const satStr = this.data.saturday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const breakdownLines = this.items
      .filter(i => i.included)
      .map(i => {
        let line = `• ${i.staffName}: Gross ₱${i.baseCompensation.toLocaleString()}`;
        if (i.valeDeduction > 0) {
          line += ` | Vale: -₱${i.valeDeduction.toLocaleString()}` + (i.valeNote ? ` (${i.valeNote})` : '');
        }
        if (i.adjustmentAmount !== 0) {
          line += ` | Adj: ${i.adjustmentAmount > 0 ? '+' : ''}₱${i.adjustmentAmount.toLocaleString()} (${i.adjustmentReason || 'Bonus/Deduction'})`;
        }
        line += ` => Net Payout: ₱${i.netAmount.toLocaleString()}`;
        return line;
      });

    const notes = [
      `Weekly Payroll Period: ${sunStr} – ${satStr} (${this.activeStaffCount} staff members)`,
      '',
      `Total Gross: ₱${this.totalGross.toLocaleString()}`,
      `Total Vale Deductions: -₱${this.totalVale.toLocaleString()}`,
      `Total Adjustments: ${this.totalAdjustments >= 0 ? '+' : ''}₱${this.totalAdjustments.toLocaleString()}`,
      `FINAL NET PAYABLE: ₱${this.totalNet.toLocaleString()}`,
      '',
      'Staff Breakdown:',
      ...breakdownLines
    ].join('\n');

    const result: PayrollDialogResult = {
      title: this.payrollTitle,
      totalGross: this.totalGross,
      totalVale: this.totalVale,
      totalAdjustments: this.totalAdjustments,
      totalNet: this.totalNet,
      items: this.items.filter(i => i.included),
      notes
    };

    this.dialogRef.close(result);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
