import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { UserPayslip } from '../../../../core/services/user.service';

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

  printPayslip(): void {
    window.print();
  }

  close(): void {
    this.dialogRef.close();
  }
}
