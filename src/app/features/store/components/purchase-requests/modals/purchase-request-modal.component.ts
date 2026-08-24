import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ProductService } from '../../../../../core/services/product.service';
import { Product } from '../../../../../core/models/store.model';
import { PurchaseRequestItem, PurchaseRequestPriority } from '../../../../../core/models/purchase-request.model';
import { PurchaseRequestService } from '../../../../../core/services/purchase-request.service';

interface FormLineItem {
    itemType: 'CATALOG_PRODUCT' | 'CUSTOM_SUPPLY';
    productId?: string;
    name: string;
    category?: string;
    currentStock?: number;
    requestedQuantity: number;
    unit: string;
    estimatedUnitCost: number;
}

@Component({
    selector: 'app-purchase-request-modal',
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
        MatRadioModule,
        MatSnackBarModule,
    ],
    template: `
        <div class="pr-modal-container">
            <h2 mat-dialog-title class="dialog-title">
                <mat-icon color="primary">add_shopping_cart</mat-icon>
                New Purchase / Refill Request
            </h2>

            <mat-dialog-content class="dialog-content">
                <!-- Request Summary Fields -->
                <div class="form-row">
                    <mat-form-field appearance="outline" class="flex-2">
                        <mat-label>Request Title / Purpose</mat-label>
                        <input matInput [(ngModel)]="title" placeholder="e.g. Weekly Drinks & Supplements Refill" required />
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="flex-1">
                        <mat-label>Priority Level</mat-label>
                        <mat-select [(ngModel)]="priority">
                            <mat-option value="LOW">🟢 Low</mat-option>
                            <mat-option value="NORMAL">🔵 Normal</mat-option>
                            <mat-option value="HIGH">🟠 High</mat-option>
                            <mat-option value="URGENT">🔴 Urgent</mat-option>
                        </mat-select>
                    </mat-form-field>
                </div>

                <!-- Items Section -->
                <div class="items-header">
                    <h3>Requested Items & Quantities</h3>
                    <button mat-stroked-button color="primary" type="button" (click)="addItem()">
                        <mat-icon>add</mat-icon> Add Line Item
                    </button>
                </div>

                <div class="items-list">
                    <div *ngFor="let item of items; let idx = index" class="item-card">
                        <div class="item-type-toggle">
                            <mat-radio-group [(ngModel)]="item.itemType" (ngModelChange)="onItemTypeChange(item)">
                                <mat-radio-button value="CATALOG_PRODUCT">Catalog Product</mat-radio-button>
                                <mat-radio-button value="CUSTOM_SUPPLY">Custom Supply / Facility Item</mat-radio-button>
                            </mat-radio-group>

                            <button mat-icon-button color="warn" type="button" (click)="removeItem(idx)" [disabled]="items.length === 1">
                                <mat-icon>delete_outline</mat-icon>
                            </button>
                        </div>

                        <div class="item-fields-grid">
                            <!-- Product Dropdown if Catalog -->
                            <mat-form-field appearance="outline" *ngIf="item.itemType === 'CATALOG_PRODUCT'" class="field-product">
                                <mat-label>Select Product</mat-label>
                                <mat-select [(ngModel)]="item.productId" (ngModelChange)="onProductSelected(item, $event)">
                                    <mat-option *ngFor="let p of products()" [value]="p.id">
                                        {{ p.name }} (Current stock: {{ p.stock }} {{ p.unit || 'Item' }})
                                    </mat-option>
                                </mat-select>
                            </mat-form-field>

                            <!-- Custom Name if Custom Supply -->
                            <mat-form-field appearance="outline" *ngIf="item.itemType === 'CUSTOM_SUPPLY'" class="field-product">
                                <mat-label>Item / Supply Name</mat-label>
                                <input matInput [(ngModel)]="item.name" placeholder="e.g. Mop heads, Disinfectant Gallon" />
                            </mat-form-field>

                            <mat-form-field appearance="outline" class="field-qty">
                                <mat-label>Qty</mat-label>
                                <input matInput type="number" min="1" [(ngModel)]="item.requestedQuantity" />
                            </mat-form-field>

                            <mat-form-field appearance="outline" class="field-unit">
                                <mat-label>Unit</mat-label>
                                <input matInput [(ngModel)]="item.unit" placeholder="pcs, tubs, gals" />
                            </mat-form-field>

                            <mat-form-field appearance="outline" class="field-cost">
                                <mat-label>Est. Unit Cost (₱)</mat-label>
                                <input matInput type="number" min="0" [(ngModel)]="item.estimatedUnitCost" />
                            </mat-form-field>

                            <div class="field-subtotal">
                                <span class="subtotal-label">Subtotal</span>
                                <span class="subtotal-val">₱{{ (item.requestedQuantity * item.estimatedUnitCost) | number:'1.2-2' }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Total & Reason -->
                <div class="total-bar">
                    <span class="total-label">Estimated Total Outgoing:</span>
                    <span class="total-amount">₱{{ calculateTotal() | number:'1.2-2' }}</span>
                </div>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Reason / Notes for Admin</mat-label>
                    <textarea matInput [(ngModel)]="notes" rows="2" placeholder="e.g. Running out of whey protein before weekend peak hours"></textarea>
                </mat-form-field>
            </mat-dialog-content>

            <mat-dialog-actions align="end" class="dialog-actions">
                <button mat-button mat-dialog-close [disabled]="submitting()">Cancel</button>
                <button mat-flat-button color="primary" (click)="submitRequest()" [disabled]="submitting() || !isValid()">
                    <mat-icon *ngIf="!submitting()">send</mat-icon>
                    <span>{{ submitting() ? 'Submitting...' : 'Submit Request' }}</span>
                </button>
            </mat-dialog-actions>
        </div>
    `,
    styles: [`
        .pr-modal-container {
            padding: 8px 12px;
            min-width: 650px;
            max-width: 800px;
        }
        .dialog-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 16px;
        }
        .dialog-content {
            display: flex;
            flex-direction: column;
            gap: 16px;
            max-height: 70vh;
            overflow-y: auto;
        }
        .form-row {
            display: flex;
            gap: 12px;
        }
        .flex-1 { flex: 1; }
        .flex-2 { flex: 2; }
        .w-full { width: 100%; }
        .items-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 8px;
            margin-top: 8px;
            h3 {
                margin: 0;
                font-size: 15px;
                font-weight: 700;
                color: #334155;
            }
        }
        .items-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .item-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
        }
        .item-type-toggle {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        .item-fields-grid {
            display: flex;
            gap: 8px;
            align-items: center;
            flex-wrap: wrap;
        }
        .field-product { flex: 3; min-width: 220px; }
        .field-qty { width: 85px; }
        .field-unit { width: 95px; }
        .field-cost { width: 130px; }
        .field-subtotal {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            min-width: 100px;
            .subtotal-label { font-size: 11px; color: #64748b; }
            .subtotal-val { font-size: 14px; font-weight: 700; color: #0f172a; }
        }
        .total-bar {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            background: #eff6ff;
            border-radius: 8px;
            border: 1px solid #bfdbfe;
            .total-label { font-weight: 600; color: #1e40af; }
            .total-amount { font-size: 18px; font-weight: 800; color: #1e3a8a; }
        }
        .dialog-actions {
            padding: 16px 0 8px;
        }
    `],
})
export class PurchaseRequestModalComponent implements OnInit {
    private dialogRef = inject(MatDialogRef<PurchaseRequestModalComponent>);
    private productService = inject(ProductService);
    private prService = inject(PurchaseRequestService);
    private snackBar = inject(MatSnackBar);

    products = signal<Product[]>([]);
    title = '';
    priority: PurchaseRequestPriority = 'NORMAL';
    notes = '';
    submitting = signal(false);

    items: FormLineItem[] = [
        {
            itemType: 'CATALOG_PRODUCT',
            name: '',
            requestedQuantity: 1,
            unit: 'Item',
            estimatedUnitCost: 0,
        },
    ];

    ngOnInit(): void {
        this.productService.getProducts().subscribe((data) => {
            // Sort retail products
            const sorted = [...data].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            this.products.set(sorted);
        });
    }

    addItem(): void {
        this.items.push({
            itemType: 'CATALOG_PRODUCT',
            name: '',
            requestedQuantity: 1,
            unit: 'Item',
            estimatedUnitCost: 0,
        });
    }

    removeItem(index: number): void {
        if (this.items.length > 1) {
            this.items.splice(index, 1);
        }
    }

    onItemTypeChange(item: FormLineItem): void {
        item.productId = undefined;
        item.name = '';
        item.estimatedUnitCost = 0;
    }

    onProductSelected(item: FormLineItem, productId: string): void {
        const product = this.products().find((p) => p.id === productId);
        if (product) {
            item.name = product.name;
            item.category = product.category;
            item.unit = product.unit || 'Item';
            item.currentStock = product.stock || 0;
            item.estimatedUnitCost = product.lastCostPrice || product.price || 0;
        }
    }

    calculateTotal(): number {
        return this.items.reduce((sum, item) => sum + (item.requestedQuantity || 0) * (item.estimatedUnitCost || 0), 0);
    }

    isValid(): boolean {
        if (!this.title.trim()) return false;
        if (this.items.length === 0) return false;
        for (const item of this.items) {
            if (item.itemType === 'CATALOG_PRODUCT' && !item.productId) return false;
            if (item.itemType === 'CUSTOM_SUPPLY' && !item.name.trim()) return false;
            if (!item.requestedQuantity || item.requestedQuantity <= 0) return false;
        }
        return true;
    }

    async submitRequest(): Promise<void> {
        if (!this.isValid() || this.submitting()) return;
        this.submitting.set(true);

        try {
            const requestItems: PurchaseRequestItem[] = this.items.map((i) => ({
                productId: i.productId,
                name: i.name,
                category: i.category,
                itemType: i.itemType,
                requestedQuantity: Number(i.requestedQuantity),
                unit: i.unit || 'Item',
                estimatedUnitCost: Number(i.estimatedUnitCost) || 0,
                estimatedTotalCost: (Number(i.requestedQuantity) || 0) * (Number(i.estimatedUnitCost) || 0),
                currentStockSnapshot: i.currentStock,
            }));

            await this.prService.createPurchaseRequest({
                title: this.title.trim(),
                priority: this.priority,
                items: requestItems,
                notes: this.notes.trim(),
            });

            this.snackBar.open('🎉 Purchase Request submitted successfully!', 'Close', { duration: 3000 });
            this.dialogRef.close(true);
        } catch (err) {
            console.error('Failed to submit purchase request:', err);
            this.snackBar.open('Failed to submit request. Please try again.', 'Close', { duration: 3500 });
        } finally {
            this.submitting.set(false);
        }
    }
}
