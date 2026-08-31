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
    <div class="override-container">
      <div class="override-header">
        <h2 class="dialog-title"><mat-icon class="text-cyan">price_change</mat-icon> Override Price</h2>
        <button type="button" class="btn-close" (click)="cancel()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="override-body">
        <div class="product-banner">
          <span class="name">{{ data.productName }}</span>
          <span class="original-price">Original Catalog Price: <strong>₱{{ data.originalPrice | number:'1.2-2' }}</strong></span>
        </div>

        <mat-form-field appearance="outline" class="full-width custom-mat-field">
          <mat-label>New Override Price</mat-label>
          <input matInput type="number" [(ngModel)]="newPrice" min="0" placeholder="0.00">
          <span matPrefix>₱&nbsp;</span>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width custom-mat-field">
          <mat-label>Reason for Override</mat-label>
          <textarea matInput [(ngModel)]="reason" placeholder="e.g. Member discount, promo, negotiation..." rows="3"></textarea>
        </mat-form-field>
      </div>

      <div class="override-actions">
        <button type="button" class="btn-cancel" (click)="cancel()">Cancel</button>
        <button type="button" class="btn-confirm-gold" (click)="confirm()" 
          [disabled]="newPrice() < 0 || newPrice() === null">
          Apply Price
        </button>
      </div>
    </div>
  `,
    styles: [`
    .override-container {
      background: var(--color-surface, #0f172a);
      color: #ffffff;
      border-radius: var(--radius-2xl, 16px);
      overflow: hidden;
    }
    .override-header {
      padding: 16px 20px;
      background: rgba(15, 23, 42, 0.95);
      border-bottom: 1.5px solid var(--color-border, #334155);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .dialog-title {
      margin: 0;
      font-size: var(--font-size-base, 16px);
      font-weight: var(--font-weight-black, 900);
      color: #ffffff !important;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-close {
      background: transparent;
      border: none;
      color: var(--color-text-secondary, #cbd5e1);
      cursor: pointer;
    }
    .override-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .product-banner {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--color-border, #334155);
      border-radius: var(--radius-xl, 12px);
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .name {
      font-weight: var(--font-weight-bold, 700);
      font-size: var(--font-size-sm, 14px);
      color: #ffffff !important;
    }
    .original-price {
      color: var(--color-text-secondary, #cbd5e1) !important;
      font-size: var(--font-size-xs, 12px);
    }
    .original-price strong {
      color: var(--color-cyan-light, #22d3ee) !important;
    }
    .full-width { width: 100%; }
    .override-actions {
      padding: 14px 20px;
      background: rgba(15, 23, 42, 0.95);
      border-top: 1.5px solid var(--color-border, #334155);
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    .btn-confirm-gold {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #090d16 !important;
      font-size: var(--font-size-xs, 12px);
      font-weight: var(--font-weight-black, 900);
      border: none;
      border-radius: var(--radius-full, 9999px);
      padding: 8px 18px;
      cursor: pointer;
    }
    .btn-cancel {
      background: var(--color-surface, #0f172a);
      border: 1px solid var(--color-border, #334155);
      color: var(--color-text-secondary, #cbd5e1) !important;
      font-size: var(--font-size-xs, 12px);
      font-weight: var(--font-weight-bold, 700);
      padding: 8px 16px;
      border-radius: var(--radius-full, 9999px);
      cursor: pointer;
    }
    .text-cyan { color: var(--color-cyan-light, #22d3ee) !important; }
  `]
})
export class PriceOverrideDialog {
    readonly dialogRef = inject(MatDialogRef<PriceOverrideDialog>);
    readonly data = inject<PriceOverrideDialogData>(MAT_DIALOG_DATA);

    newPrice = signal<number>(this.data.currentPrice);
    reason = signal<string>('');

    confirm(): void {
        this.dialogRef.close({
            newPrice: this.newPrice(),
            reason: this.reason()
        });
    }

    cancel(): void {
        this.dialogRef.close();
    }
}
