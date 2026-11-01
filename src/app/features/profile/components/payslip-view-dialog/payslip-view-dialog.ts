import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { UserPayslip } from '../../../../core/services/user.service';
import { safeToDate } from '../../../../core/utils/date.utils';

@Component({
  selector: 'app-payslip-view-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './payslip-view-dialog.html',
  styleUrl: './payslip-view-dialog.css'
})
export class PayslipViewDialogComponent {
  dialogRef = inject(MatDialogRef<PayslipViewDialogComponent>);
  payslip: UserPayslip = inject(MAT_DIALOG_DATA);

  formatDate(val: any): Date | null {
    if (!val) return null;
    return safeToDate(val);
  }

  printPayslip(): void {
    window.print();
  }

  close(): void {
    this.dialogRef.close();
  }
}
