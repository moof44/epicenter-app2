import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { UserCommissionPayslip } from '../../../../core/services/user.service';
import { CommissionService } from '../../../../core/services/commission.service';
import { ProductCommission } from '../../../../core/models/commission.model';
import { Firestore, collection, query, where, documentId, getDocs } from '@angular/fire/firestore';

@Component({
  selector: 'app-commission-payslip-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './commission-payslip-dialog.html',
  styleUrl: './commission-payslip-dialog.css'
})
export class CommissionPayslipDialog implements OnInit {
  dialogRef = inject(MatDialogRef<CommissionPayslipDialog>);
  payslip: UserCommissionPayslip = inject(MAT_DIALOG_DATA);
  private firestore = inject(Firestore);

  items = signal<ProductCommission[]>([]);
  isLoading = signal<boolean>(true);

  async ngOnInit() {
    if (this.payslip.commissionIds && this.payslip.commissionIds.length > 0) {
      try {
        const commsCol = collection(this.firestore, 'commissions');
        // Fetch items in chunks of 10 if needed
        const chunk = this.payslip.commissionIds.slice(0, 30);
        const q = query(commsCol, where(documentId(), 'in', chunk));
        const snap = await getDocs(q);
        const fetched: ProductCommission[] = [];
        snap.forEach(d => fetched.push({ id: d.id, ...d.data() } as ProductCommission));
        this.items.set(fetched);
      } catch (err) {
        console.warn('Failed to load itemized details:', err);
      } finally {
        this.isLoading.set(false);
      }
    } else {
      this.isLoading.set(false);
    }
  }

  printPayslip(): void {
    window.print();
  }

  formatDate(timestamp: any): Date {
    if (!timestamp) return new Date();
    return timestamp.seconds ? new Date(timestamp.seconds * 1000) : (timestamp instanceof Date ? timestamp : new Date(timestamp));
  }
}
