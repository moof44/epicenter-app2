import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PurchaseRequest, PurchaseRequestItem, OutgoingPaymentSource } from '../../../../../core/models/purchase-request.model';
import { PurchaseRequestService } from '../../../../../core/services/purchase-request.service';

interface FulfillLineItem extends PurchaseRequestItem {
  receivedQtyInput: number;
  actualUnitCostInput: number;
}

@Component({
  selector: 'app-fulfill-request-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="fulfill-modal-container">
      <div class="modal-header">
        <div class="modal-title">
          <mat-icon class="text-mint">inventory</mat-icon>
          <h2>Receive Goods & Restock — {{ request.requestNumber }}</h2>
        </div>
        <button type="button" class="btn-modal-close" (click)="dialogRef.close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="dialog-content">
        <p class="section-desc text-muted">
          Confirm the delivered quantities and unit costs. Catalog products will be <strong class="text-cyan">automatically restocked into live inventory</strong>.
        </p>

        <!-- Supplier & Payment Method Bar -->
        <div class="meta-grid">
          <mat-form-field appearance="outline" class="flex-1" subscriptSizing="dynamic">
            <mat-label>Supplier Name / Vendor</mat-label>
            <input matInput [(ngModel)]="supplierName" placeholder="e.g. Wheyl Philippines, SM Mart" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="flex-1" subscriptSizing="dynamic">
            <mat-label>Payment Source (Outgoing)</mat-label>
            <mat-select [(ngModel)]="paidVia">
              <mat-option value="CASH_DRAWER">💵 Cash Drawer (Till Cash Out)</mat-option>
              <mat-option value="GCASH">📱 GCash / Maya Wallet</mat-option>
              <mat-option value="BANK_TRANSFER">🏦 Bank Transfer</mat-option>
              <mat-option value="OWNER_PERSONAL">💳 Owner Out-of-Pocket</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="flex-1" subscriptSizing="dynamic">
            <mat-label>Receipt / Reference #</mat-label>
            <input matInput [(ngModel)]="paymentReference" placeholder="e.g. OR #12345 or GCash Ref" />
          </mat-form-field>
        </div>

        <!-- Items Table -->
        <div class="table-wrapper">
          <table class="fulfill-table">
            <thead>
              <tr>
                <th>Item / Product</th>
                <th class="text-center">Approved Qty</th>
                <th class="text-center">Actual Received Qty</th>
                <th class="text-right">Actual Cost (₱/unit)</th>
                <th class="text-right">Total (₱)</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of items">
                <td>
                  <div class="item-name text-white font-bold">{{ item.name }}</div>
                  <small class="item-type-badge font-mono text-cyan" *ngIf="item.itemType === 'CATALOG_PRODUCT'">Catalog Product (Auto-Restock)</small>
                  <small class="item-type-badge font-mono text-muted" *ngIf="item.itemType === 'CUSTOM_SUPPLY'">Custom Expense</small>
                </td>
                <td class="text-center font-mono text-muted">{{ item.requestedQuantity }} {{ item.unit }}</td>
                <td class="text-center">
                  <input type="number" class="qty-field font-mono" min="0" [(ngModel)]="item.receivedQtyInput" />
                </td>
                <td class="text-right">
                  <div class="cost-input-box">
                    <span class="currency-prefix">₱</span>
                    <input type="number" class="cost-field font-mono" min="0" step="0.01" [(ngModel)]="item.actualUnitCostInput" />
                  </div>
                </td>
                <td class="text-right font-mono font-bold text-gold">
                  ₱{{ (item.receivedQtyInput * item.actualUnitCostInput) | number:'1.2-2' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Grand Total Bar -->
        <div class="grand-total-bar">
          <div class="total-col">
            <span class="tot-label text-muted">Estimated Cost:</span>
            <span class="font-mono text-muted">₱{{ request.estimatedTotalAmount | number:'1.2-2' }}</span>
          </div>
          <div class="total-col total-actual">
            <span class="tot-label text-white">Actual Total Outflow:</span>
            <strong class="font-mono text-gold text-lg">₱{{ totalActualCost() | number:'1.2-2' }}</strong>
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn-cancel" (click)="dialogRef.close()">Cancel</button>
        <button type="button" class="btn-fulfill-mint" (click)="submit()" [disabled]="isSubmitting">
          <mat-icon>inventory_2</mat-icon>
          <span>{{ isSubmitting ? 'Restocking...' : 'Confirm Delivery & Restock' }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .fulfill-modal-container {
      background: var(--color-surface, #1e293b);
      border: 1.5px solid var(--color-border, #334155);
      border-radius: var(--radius-2xl, 16px);
      width: 100%;
      box-sizing: border-box;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .modal-header {
      padding: 16px 20px;
      background: rgba(15, 23, 42, 0.95);
      border-bottom: 1.5px solid var(--color-border, #334155);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-title { display: flex; align-items: center; gap: 10px; }
    .modal-title h2 { margin: 0; font-size: var(--font-size-base, 16px); font-weight: var(--font-weight-black, 900); color: #ffffff !important; }
    .btn-modal-close { background: transparent; border: none; color: var(--color-text-secondary, #cbd5e1); cursor: pointer; }
    .btn-modal-close:hover { color: #ffffff; }

    .dialog-content { padding: 20px; display: flex; flex-direction: column; gap: 16px; max-height: 70vh; overflow-y: auto; }
    .section-desc { margin: 0; font-size: var(--font-size-xs, 12px); line-height: 1.5; }

    .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .flex-1 { width: 100%; }

    .table-wrapper {
      background: var(--color-canvas, #090d16);
      border: 1px solid var(--color-border, #334155);
      border-radius: var(--radius-xl, 12px);
      overflow-x: auto;
    }
    .fulfill-table { width: 100%; border-collapse: collapse; text-align: left; }
    .fulfill-table th {
      padding: 10px 14px;
      background: var(--color-surface-alt, #243247);
      color: var(--color-text-secondary, #cbd5e1);
      font-size: 10px;
      font-weight: var(--font-weight-extrabold, 800);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .fulfill-table td { padding: 12px 14px; border-bottom: 1px solid rgba(51, 65, 85, 0.4); font-size: 12px; vertical-align: middle; }

    .item-name { font-size: 13px; }
    .item-type-badge { font-size: 10px; }

    .qty-field {
      width: 70px;
      background: var(--color-surface, #1e293b);
      border: 1px solid var(--color-border, #334155);
      border-radius: var(--radius-md, 6px);
      color: #ffffff;
      padding: 4px;
      text-align: center;
      font-size: 13px;
      outline: none;
    }
    .qty-field:focus { border-color: var(--color-cyan-light, #22d3ee); }

    .cost-input-box {
      display: inline-flex;
      align-items: center;
      background: var(--color-surface, #1e293b);
      border: 1px solid var(--color-border, #334155);
      border-radius: var(--radius-md, 6px);
      padding: 2px 6px;
    }
    .cost-field {
      width: 80px;
      background: transparent;
      border: none;
      color: #ffffff;
      font-size: 13px;
      text-align: right;
      outline: none;
    }

    .grand-total-bar {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 24px;
      padding: 12px 16px;
      background: var(--color-canvas, #090d16);
      border: 1px solid var(--color-border, #334155);
      border-radius: var(--radius-lg, 8px);
    }
    .total-col { display: flex; align-items: baseline; gap: 8px; }
    .tot-label { font-size: 11px; text-transform: uppercase; font-weight: var(--font-weight-extrabold, 800); }

    .modal-actions {
      padding: 16px 20px;
      background: rgba(15, 23, 42, 0.95);
      border-top: 1px solid var(--color-border, #334155);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    .btn-cancel {
      background: transparent;
      border: 1px solid var(--color-border, #334155);
      color: var(--color-text-secondary, #cbd5e1);
      font-size: 12px;
      font-weight: var(--font-weight-bold, 700);
      border-radius: var(--radius-full, 9999px);
      padding: 8px 18px;
      cursor: pointer;
    }
    .btn-fulfill-mint {
      background: linear-gradient(135deg, #34d399 0%, #059669 100%);
      color: #090d16 !important;
      font-size: 12px;
      font-weight: var(--font-weight-black, 900);
      border: none;
      border-radius: var(--radius-full, 9999px);
      padding: 8px 24px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }
    .btn-fulfill-mint mat-icon { font-size: 16px !important; width: 16px !important; height: 16px !important; }

    .font-mono { font-family: var(--font-family-mono); }
    .text-white { color: #ffffff !important; }
    .text-cyan { color: var(--color-cyan-light, #22d3ee) !important; }
    .text-mint { color: var(--color-mint-success, #34d399) !important; }
    .text-gold { color: var(--color-gold-light, #fbbf24) !important; }
    .text-muted { color: var(--color-text-secondary, #cbd5e1) !important; }
    .currency-prefix { color: var(--color-gold-light, #fbbf24) !important; font-weight: var(--font-weight-bold, 700); }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-lg { font-size: 18px; }
  `]
})
export class FulfillRequestModalComponent implements OnInit {
  dialogRef = inject(MatDialogRef<FulfillRequestModalComponent>);
  private prService = inject(PurchaseRequestService);
  private snackBar = inject(MatSnackBar);
  private data = inject<{ request: PurchaseRequest }>(MAT_DIALOG_DATA);

  request!: PurchaseRequest;
  items: FulfillLineItem[] = [];

  supplierName = '';
  paidVia: OutgoingPaymentSource = 'CASH_DRAWER';
  paymentReference = '';
  isSubmitting = false;

  ngOnInit(): void {
    this.request = this.data.request;
    this.items = this.request.items.map((i) => ({
      ...i,
      receivedQtyInput: i.receivedQuantity ?? i.requestedQuantity,
      actualUnitCostInput: i.actualUnitCost ?? i.estimatedUnitCost ?? 0,
    }));
  }

  totalActualCost(): number {
    return this.items.reduce(
      (sum, i) => sum + (i.receivedQtyInput || 0) * (i.actualUnitCostInput || 0),
      0
    );
  }

  async submit(): Promise<void> {
    for (const item of this.items) {
      if (item.receivedQtyInput < 0) {
        this.snackBar.open('Received quantity cannot be negative.', 'Close', { duration: 3000 });
        return;
      }
    }

    this.isSubmitting = true;
    try {
      const fulfilledItems: PurchaseRequestItem[] = this.items.map((i) => ({
        ...i,
        receivedQuantity: i.receivedQtyInput,
        actualUnitCost: i.actualUnitCostInput,
        actualSubtotal: i.receivedQtyInput * i.actualUnitCostInput,
      }));

      await this.prService.fulfillAndRestock(
        this.request.id!,
        this.request,
        {
          items: fulfilledItems,
          paidVia: this.paidVia,
          supplierName: this.supplierName.trim() || undefined,
          paymentReference: this.paymentReference.trim() || undefined
        }
      );

      this.snackBar.open('Goods received! Inventory stock updated successfully.', 'Close', { duration: 4000 });
      this.dialogRef.close(true);
    } catch (err: any) {
      this.snackBar.open(err.message || 'Failed to fulfill request.', 'Close', { duration: 4000 });
    } finally {
      this.isSubmitting = false;
    }
  }
}
