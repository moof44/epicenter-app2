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
            <h2 mat-dialog-title class="dialog-title">
                <mat-icon color="accent">inventory</mat-icon>
                Receive Goods & Restock Inventory — {{ request.requestNumber }}
            </h2>

            <mat-dialog-content class="dialog-content">
                <p class="section-desc">
                    Confirm the actual delivered quantities and unit costs paid. Catalog items will be <strong>automatically added to inventory stock</strong>.
                </p>

                <!-- Supplier & Payment Method Bar -->
                <div class="meta-grid">
                    <mat-form-field appearance="outline" class="flex-1">
                        <mat-label>Supplier Name / Store</mat-label>
                        <input matInput [(ngModel)]="supplierName" placeholder="e.g. Wheyl Philippines, SM Supermarket" />
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="flex-1">
                        <mat-label>Payment Source (Outgoing Money)</mat-label>
                        <mat-select [(ngModel)]="paidVia">
                            <mat-option value="CASH_DRAWER">💵 Cash Drawer (Shift Cash Out)</mat-option>
                            <mat-option value="GCASH">📱 GCash / Maya Wallet</mat-option>
                            <mat-option value="BANK_TRANSFER">🏦 Bank Transfer (BDO/BPI)</mat-option>
                            <mat-option value="OWNER_PERSONAL">💳 Owner Out-of-Pocket</mat-option>
                        </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="flex-1">
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
                                    <div class="item-name">{{ item.name }}</div>
                                    <span class="item-type-tag" [class.catalog]="item.itemType === 'CATALOG_PRODUCT'">
                                        {{ item.itemType === 'CATALOG_PRODUCT' ? '📦 Stock Catalog' : '🧹 Facility Supply' }}
                                    </span>
                                </td>
                                <td class="text-center text-muted">
                                    {{ item.approvedQuantity ?? item.requestedQuantity }} {{ item.unit }}
                                </td>
                                <td class="text-center">
                                    <input type="number" min="0" [(ngModel)]="item.receivedQtyInput" class="compact-input" />
                                </td>
                                <td class="text-right">
                                    <input type="number" min="0" [(ngModel)]="item.actualUnitCostInput" class="compact-input text-right" />
                                </td>
                                <td class="text-right font-bold">
                                    ₱{{ (item.receivedQtyInput * item.actualUnitCostInput) | number:'1.2-2' }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Total Amount Summary -->
                <div class="total-summary-card">
                    <div class="total-row">
                        <span class="total-label">Total Outgoing Payment:</span>
                        <span class="total-val">₱{{ calculateTotal() | number:'1.2-2' }}</span>
                    </div>
                </div>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Receiving Notes (Optional)</mat-label>
                    <input matInput [(ngModel)]="receivingNotes" placeholder="e.g. Received in good condition by front desk" />
                </mat-form-field>
            </mat-dialog-content>

            <mat-dialog-actions align="end" class="dialog-actions">
                <button mat-button mat-dialog-close [disabled]="submitting()">Cancel</button>
                <button mat-flat-button color="primary" (click)="confirmFulfillment()" [disabled]="submitting() || !isValid()">
                    <mat-icon *ngIf="!submitting()">check_circle</mat-icon>
                    <span>{{ submitting() ? 'Restocking Inventory...' : 'Confirm & Restock Inventory' }}</span>
                </button>
            </mat-dialog-actions>
        </div>
    `,
    styles: [`
        .fulfill-modal-container {
            padding: 8px 12px;
            min-width: 700px;
            max-width: 900px;
        }
        .dialog-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 8px;
        }
        .section-desc {
            margin: 0 0 16px 0;
            color: #64748b;
            font-size: 13px;
        }
        .dialog-content {
            display: flex;
            flex-direction: column;
            gap: 16px;
            max-height: 70vh;
            overflow-y: auto;
        }
        .meta-grid {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }
        .flex-1 { flex: 1; min-width: 200px; }
        .w-full { width: 100%; }
        .table-wrapper {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
        }
        .fulfill-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;

            th {
                background: #f8fafc;
                padding: 10px 12px;
                color: #475569;
                font-weight: 600;
                border-bottom: 1px solid #e2e8f0;
            }
            td {
                padding: 10px 12px;
                border-bottom: 1px solid #f1f5f9;
                color: #1e293b;
            }
        }
        .item-name { font-weight: 600; color: #0f172a; }
        .item-type-tag {
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 4px;
            background: #f1f5f9;
            color: #64748b;
            &.catalog { background: #eff6ff; color: #2563eb; }
        }
        .compact-input {
            width: 90px;
            padding: 6px 8px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            font-size: 13px;
            &:focus { outline: none; border-color: #3b82f6; }
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-muted { color: #64748b; }
        .font-bold { font-weight: 700; color: #0f172a; }

        .total-summary-card {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            padding: 12px 16px;
            .total-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .total-label { font-weight: 700; color: #166534; font-size: 15px; }
            .total-val { font-size: 20px; font-weight: 800; color: #15803d; }
        }
        .dialog-actions {
            padding: 16px 0 8px;
        }
    `],
})
export class FulfillRequestModalComponent implements OnInit {
    private dialogRef = inject(MatDialogRef<FulfillRequestModalComponent>);
    public request = inject<PurchaseRequest>(MAT_DIALOG_DATA);
    private prService = inject(PurchaseRequestService);
    private snackBar = inject(MatSnackBar);

    supplierName = '';
    paidVia: OutgoingPaymentSource = 'CASH_DRAWER';
    paymentReference = '';
    receivingNotes = '';
    submitting = signal(false);

    items: FulfillLineItem[] = [];

    ngOnInit(): void {
        this.supplierName = this.request.supplierName || '';
        this.paidVia = this.request.paidVia || 'CASH_DRAWER';
        this.paymentReference = this.request.paymentReference || '';

        this.items = this.request.items.map((item) => ({
            ...item,
            receivedQtyInput: item.approvedQuantity ?? item.requestedQuantity,
            actualUnitCostInput: item.actualUnitCost || item.estimatedUnitCost || 0,
        }));
    }

    calculateTotal(): number {
        return this.items.reduce((sum, i) => sum + (i.receivedQtyInput || 0) * (i.actualUnitCostInput || 0), 0);
    }

    isValid(): boolean {
        if (!this.request?.id) return false;
        if (this.items.length === 0) return false;
        for (const item of this.items) {
            if (item.receivedQtyInput < 0) return false;
            if (item.actualUnitCostInput < 0) return false;
        }
        return true;
    }

    async confirmFulfillment(): Promise<void> {
        if (!this.isValid() || this.submitting() || !this.request.id) return;
        this.submitting.set(true);

        try {
            const updatedItems: PurchaseRequestItem[] = this.items.map((i) => ({
                ...i,
                receivedQuantity: Number(i.receivedQtyInput),
                actualUnitCost: Number(i.actualUnitCostInput),
                actualTotalCost: (Number(i.receivedQtyInput) || 0) * (Number(i.actualUnitCostInput) || 0),
            }));

            await this.prService.fulfillAndRestock(this.request.id, this.request, {
                items: updatedItems,
                supplierName: this.supplierName.trim(),
                paidVia: this.paidVia,
                paymentReference: this.paymentReference.trim(),
                receivingNotes: this.receivingNotes.trim(),
            });

            this.snackBar.open('✅ Inventory successfully restocked & purchase completed!', 'Close', {
                duration: 3500,
            });
            this.dialogRef.close(true);
        } catch (err) {
            console.error('Failed to fulfill request:', err);
            this.snackBar.open('Failed to restock inventory. Please try again.', 'Close', { duration: 3500 });
        } finally {
            this.submitting.set(false);
        }
    }
}
