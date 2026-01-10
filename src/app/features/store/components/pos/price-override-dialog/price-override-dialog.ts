import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';

export interface PriceOverrideDialogData {
    productName: string;
    currentPrice: number;
    originalPrice: number;
}

export interface PriceOverrideDialogResult {
    newPrice: number;
    reason: string;
}

@Component({
    selector: 'app-price-override-dialog',
    imports: [
        CommonModule, MatDialogModule, MatButtonModule, MatIconModule,
        MatInputModule, MatFormFieldModule, FormsModule
    ],
    template: `
    <h2 mat-dialog-title>Override Price</h2>
    <mat-dialog-content>
      <div class="product-info">
        <p class="name">{{ data.productName }}</p>
        <p class="original-price">Original Price: ₱{{ data.originalPrice | number:'1.2-2' }}</p>
      </div>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>New Price</mat-label>
        <input matInput type="number" [(ngModel)]="newPrice" min="0" placeholder="0.00">
        <span matPrefix>₱&nbsp;</span>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Reason for Override</mat-label>
        <textarea matInput [(ngModel)]="reason" placeholder="e.g. Negotiation, Promo, etc..." rows="3"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-flat-button color="primary" (click)="confirm()" 
        [disabled]="newPrice() < 0 || newPrice() === null">
        Confirm
      </button>
    </mat-dialog-actions>
  `,
    styles: [`
    .full-width { width: 100%; margin-bottom: 8px; }
    .product-info { margin-bottom: 16px; }
    .name { font-weight: 500; font-size: 16px; margin: 0 0 4px; }
    .original-price { color: rgba(0,0,0,0.6); font-size: 14px; margin: 0; }
  `]
})
export class PriceOverrideDialog {
    readonly dialogRef = inject(MatDialogRef<PriceOverrideDialog>);
    readonly data = inject<PriceOverrideDialogData>(MAT_DIALOG_DATA);

    newPrice = signal<number>(this.data.currentPrice);
    reason = signal('');

    cancel(): void {
        this.dialogRef.close();
    }

    confirm(): void {
        const result: PriceOverrideDialogResult = {
            newPrice: this.newPrice(),
            reason: this.reason()
        };
        this.dialogRef.close(result);
    }
}
