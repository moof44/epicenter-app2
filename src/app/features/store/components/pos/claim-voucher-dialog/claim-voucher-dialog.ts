import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Functions, httpsCallable } from '@angular/fire/functions';

@Component({
  selector: 'app-claim-voucher-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatIconModule, MatProgressSpinnerModule
  ],
  templateUrl: './claim-voucher-dialog.html',
  styleUrl: './claim-voucher-dialog.css'
})
export class ClaimVoucherDialog {
  private dialogRef = inject(MatDialogRef<ClaimVoucherDialog>);
  private functions = inject(Functions);

  voucherCode = '';
  isProcessing = signal(false);
  errorMessage = signal<string | null>(null);
  successData = signal<{ memberName: string; productName: string; coinsSpent: number } | null>(null);

  async onFulfill(): Promise<void> {
    if (!this.voucherCode || !this.voucherCode.trim()) {
      this.errorMessage.set('Please enter or scan a valid voucher code.');
      return;
    }

    this.isProcessing.set(true);
    this.errorMessage.set(null);

    try {
      const claimFn = httpsCallable(this.functions, 'fulfillRedemptionVoucher');
      const cleanCode = this.voucherCode.trim().toUpperCase();
      const res = await claimFn({ voucherCode: cleanCode });
      const data = res.data as any;

      this.successData.set({
        memberName: data?.claim?.memberName || 'Member',
        productName: data?.claim?.productName || 'Reward Product',
        coinsSpent: data?.claim?.coinsSpent || 0
      });
    } catch (err: any) {
      console.error('Fulfill voucher error:', err);
      this.errorMessage.set(err.message || 'Invalid or expired voucher code.');
    } finally {
      this.isProcessing.set(false);
    }
  }

  async onCancelAndRefund(): Promise<void> {
    if (!this.voucherCode || !this.voucherCode.trim()) {
      this.errorMessage.set('Please enter a voucher code to refund.');
      return;
    }

    if (!confirm(`Are you sure you want to CANCEL voucher ${this.voucherCode.trim().toUpperCase()} and refund coins to the member?`)) return;

    this.isProcessing.set(true);
    this.errorMessage.set(null);

    try {
      const cancelFn = httpsCallable(this.functions, 'cancelRedemptionVoucher');
      const cleanCode = this.voucherCode.trim().toUpperCase();
      const res = await cancelFn({ voucherCode: cleanCode });
      const data = res.data as any;

      alert(data?.message || `Voucher ${cleanCode} cancelled and coins refunded!`);
      this.dialogRef.close(true);
    } catch (err: any) {
      console.error('Cancel voucher error:', err);
      this.errorMessage.set(err.message || 'Unable to cancel voucher.');
    } finally {
      this.isProcessing.set(false);
    }
  }

  onClose(): void {
    this.dialogRef.close(this.successData() !== null);
  }
}
