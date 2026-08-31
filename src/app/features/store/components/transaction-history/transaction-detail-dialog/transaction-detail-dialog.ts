import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Transaction, CartItem } from '../../../../../core/models/store.model';

export interface TransactionDetailDialogData {
  transaction: Transaction;
}

@Component({
  selector: 'app-transaction-detail-dialog',
  standalone: true,
  imports: [
    CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule, MatTooltipModule
  ],
  templateUrl: './transaction-detail-dialog.html',
  styleUrl: './transaction-detail-dialog.css'
})
export class TransactionDetailDialog {
  readonly dialogRef = inject(MatDialogRef<TransactionDetailDialog>);
  readonly data = inject<TransactionDetailDialogData>(MAT_DIALOG_DATA);
  readonly tx = this.data.transaction;

  formatDate(timestamp: any): Date {
    if (!timestamp) return new Date();
    return timestamp.seconds ? new Date(timestamp.seconds * 1000) : (timestamp instanceof Date ? timestamp : new Date(timestamp));
  }

  trackCartItem(index: number, item: CartItem): string {
    return item.productId || index.toString();
  }

  printReceipt(): void {
    window.print();
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
