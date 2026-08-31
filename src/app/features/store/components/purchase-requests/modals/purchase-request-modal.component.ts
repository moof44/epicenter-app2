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
      <div class="modal-header">
        <div class="modal-title">
          <mat-icon class="text-gold">add_shopping_cart</mat-icon>
          <h2>New Purchase / Refill Request</h2>
        </div>
        <button type="button" class="btn-modal-close" (click)="dialogRef.close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="dialog-content">
        <!-- Request Summary Fields -->
        <div class="form-row">
          <mat-form-field appearance="outline" class="flex-2" subscriptSizing="dynamic">
            <mat-label>Request Title / Purpose</mat-label>
            <input matInput [(ngModel)]="title" placeholder="e.g. Weekly Drinks & Supplements Refill" required />
          </mat-form-field>

          <mat-form-field appearance="outline" class="flex-1" subscriptSizing="dynamic">
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
          <h3 class="text-white">Requested Items & Quantities</h3>
          <button type="button" class="btn-add-line" (click)="addItem()">
            <mat-icon>add</mat-icon> Add Line Item
          </button>
        </div>

        <div class="items-list">
          <div *ngFor="let item of items; let idx = index" class="item-card">
            <div class="item-type-toggle">
              <mat-radio-group [(ngModel)]="item.itemType" (ngModelChange)="onItemTypeChange(item)" class="radio-row">
                <mat-radio-button value="CATALOG_PRODUCT">Catalog Product</mat-radio-button>
                <mat-radio-button value="CUSTOM_SUPPLY">Custom / Non-Inventory</mat-radio-button>
              </mat-radio-group>

              <button type="button" class="btn-remove-item" *ngIf="items.length > 1" (click)="removeItem(idx)">
                <mat-icon>delete_outline</mat-icon> Remove
              </button>
            </div>

            <!-- Catalog Item Selector -->
            <div class="item-fields-grid" *ngIf="item.itemType === 'CATALOG_PRODUCT'">
              <mat-form-field appearance="outline" class="field-product" subscriptSizing="dynamic">
                <mat-label>Select Product</mat-label>
                <mat-select [ngModel]="item.productId" (ngModelChange)="onProductSelected(item, $event)">
                  <mat-option *ngFor="let p of products()" [value]="p.id">
                    {{ p.name }} (Stock: {{ p.stock }})
                  </mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="field-qty" subscriptSizing="dynamic">
                <mat-label>Qty</mat-label>
                <input matInput type="number" min="1" [(ngModel)]="item.requestedQuantity" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="field-unit" subscriptSizing="dynamic">
                <mat-label>Unit</mat-label>
                <input matInput [(ngModel)]="item.unit" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="field-cost" subscriptSizing="dynamic">
                <mat-label>Est. Unit Cost (₱)</mat-label>
                <span matTextPrefix class="currency-prefix">₱&nbsp;</span>
                <input matInput type="number" min="0" step="0.01" [(ngModel)]="item.estimatedUnitCost" />
              </mat-form-field>

              <div class="field-subtotal">
                <span class="subtotal-label text-muted">Subtotal</span>
                <strong class="subtotal-val font-mono text-gold">₱{{ (item.requestedQuantity * item.estimatedUnitCost) | number:'1.2-2' }}</strong>
              </div>
            </div>

            <!-- Custom / Non-Inventory Item Fields -->
            <div class="item-fields-grid" *ngIf="item.itemType === 'CUSTOM_SUPPLY'">
              <mat-form-field appearance="outline" class="field-product" subscriptSizing="dynamic">
                <mat-label>Item Name / Description</mat-label>
                <input matInput [(ngModel)]="item.name" placeholder="e.g. Cleaning Detergent 5L" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="field-qty" subscriptSizing="dynamic">
                <mat-label>Qty</mat-label>
                <input matInput type="number" min="1" [(ngModel)]="item.requestedQuantity" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="field-unit" subscriptSizing="dynamic">
                <mat-label>Unit</mat-label>
                <input matInput [(ngModel)]="item.unit" placeholder="pcs/btl" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="field-cost" subscriptSizing="dynamic">
                <mat-label>Est. Unit Cost (₱)</mat-label>
                <span matTextPrefix class="currency-prefix">₱&nbsp;</span>
                <input matInput type="number" min="0" step="0.01" [(ngModel)]="item.estimatedUnitCost" />
              </mat-form-field>

              <div class="field-subtotal">
                <span class="subtotal-label text-muted">Subtotal</span>
                <strong class="subtotal-val font-mono text-gold">₱{{ (item.requestedQuantity * item.estimatedUnitCost) | number:'1.2-2' }}</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- Optional Notes -->
        <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
          <mat-label>Notes / Justification (Optional)</mat-label>
          <textarea matInput [(ngModel)]="notes" rows="2" placeholder="e.g. Low stock alert from inventory check"></textarea>
        </mat-form-field>

        <!-- Grand Total Bar -->
        <div class="total-bar">
          <span class="total-label text-muted">Estimated Total Cost:</span>
          <strong class="total-amount font-mono text-gold">₱{{ totalEstimatedCost() | number:'1.2-2' }}</strong>
        </div>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn-cancel" (click)="dialogRef.close()">Cancel</button>
        <button type="button" class="btn-submit-gold" (click)="submit()" [disabled]="isSubmitting">
          {{ isSubmitting ? 'Submitting...' : 'Submit Purchase Request' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .pr-modal-container {
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
    .modal-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .modal-title h2 {
      margin: 0;
      font-size: var(--font-size-base, 16px);
      font-weight: var(--font-weight-black, 900);
      color: #ffffff !important;
    }
    .btn-modal-close {
      background: transparent;
      border: none;
      color: var(--color-text-secondary, #cbd5e1);
      cursor: pointer;
    }
    .btn-modal-close:hover { color: #ffffff; }

    .dialog-content {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: 70vh;
      overflow-y: auto;
    }
    .form-row { display: flex; gap: 12px; }
    .flex-1 { flex: 1; }
    .flex-2 { flex: 2; }
    .w-full { width: 100%; }

    .items-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--color-border, #334155);
      padding-bottom: 8px;
    }
    .items-header h3 { margin: 0; font-size: var(--font-size-sm, 14px); font-weight: var(--font-weight-bold, 700); }

    .btn-add-line {
      background: rgba(6, 182, 212, 0.15);
      border: 1px solid rgba(6, 182, 212, 0.4);
      color: var(--color-cyan-light, #22d3ee);
      font-size: 11px;
      font-weight: var(--font-weight-bold, 700);
      padding: 4px 12px;
      border-radius: var(--radius-full, 9999px);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .btn-add-line mat-icon { font-size: 16px !important; width: 16px !important; height: 16px !important; }

    .items-list { display: flex; flex-direction: column; gap: 12px; }
    .item-card {
      background: var(--color-canvas, #090d16);
      border: 1px solid var(--color-border, #334155);
      border-radius: var(--radius-xl, 12px);
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .item-type-toggle { display: flex; justify-content: space-between; align-items: center; }
    .radio-row { display: flex; gap: 16px; font-size: 12px; color: var(--color-text-secondary, #cbd5e1); }

    .btn-remove-item {
      background: transparent;
      border: none;
      color: var(--color-rose-danger, #f87171);
      font-size: 11px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .btn-remove-item mat-icon { font-size: 16px !important; width: 16px !important; height: 16px !important; }

    .item-fields-grid { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .field-product { flex: 3; min-width: 180px; }
    .field-qty { width: 80px; }
    .field-unit { width: 80px; }
    .field-cost { width: 120px; }
    .field-subtotal { display: flex; flex-direction: column; align-items: flex-end; min-width: 90px; }
    .subtotal-label { font-size: 10px; text-transform: uppercase; }
    .subtotal-val { font-size: 14px; }

    .total-bar {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--color-canvas, #090d16);
      border: 1px solid var(--color-border, #334155);
      border-radius: var(--radius-lg, 8px);
    }
    .total-label { font-size: 12px; font-weight: var(--font-weight-extrabold, 800); text-transform: uppercase; }
    .total-amount { font-size: 18px; font-weight: var(--font-weight-black, 900); }

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
    .btn-submit-gold {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #090d16 !important;
      font-size: 12px;
      font-weight: var(--font-weight-black, 900);
      border: none;
      border-radius: var(--radius-full, 9999px);
      padding: 8px 24px;
      cursor: pointer;
    }

    .font-mono { font-family: var(--font-family-mono); }
    .text-white { color: #ffffff !important; }
    .text-cyan { color: var(--color-cyan-light, #22d3ee) !important; }
    .text-gold { color: var(--color-gold-light, #fbbf24) !important; }
    .text-muted { color: var(--color-text-secondary, #cbd5e1) !important; }
    .currency-prefix { color: var(--color-gold-light, #fbbf24) !important; font-weight: var(--font-weight-bold, 700); }
  `]
})
export class PurchaseRequestModalComponent implements OnInit {
  dialogRef = inject(MatDialogRef<PurchaseRequestModalComponent>);
  private productService = inject(ProductService);
  private prService = inject(PurchaseRequestService);
  private snackBar = inject(MatSnackBar);

  products = signal<Product[]>([]);
  title = '';
  priority: PurchaseRequestPriority = 'NORMAL';
  notes = '';
  isSubmitting = false;

  items: FormLineItem[] = [
    {
      itemType: 'CATALOG_PRODUCT',
      name: '',
      requestedQuantity: 1,
      unit: 'pcs',
      estimatedUnitCost: 0,
    },
  ];

  ngOnInit(): void {
    this.productService.getProducts().subscribe((list) => {
      this.products.set(list);
    });
  }

  addItem(): void {
    this.items.push({
      itemType: 'CATALOG_PRODUCT',
      name: '',
      requestedQuantity: 1,
      unit: 'pcs',
      estimatedUnitCost: 0,
    });
  }

  removeItem(idx: number): void {
    this.items.splice(idx, 1);
  }

  onItemTypeChange(item: FormLineItem): void {
    item.productId = undefined;
    item.name = '';
    item.estimatedUnitCost = 0;
  }

  onProductSelected(item: FormLineItem, productId: string): void {
    item.productId = productId;
    const p = this.products().find((x) => x.id === productId);
    if (p) {
      item.name = p.name;
      item.category = p.category;
      item.currentStock = p.stock || 0;
      item.unit = p.unit || 'pcs';
      item.estimatedUnitCost = (p as any).cost || p.price || 0;
    }
  }

  totalEstimatedCost(): number {
    return this.items.reduce((sum, i) => sum + (i.requestedQuantity || 0) * (i.estimatedUnitCost || 0), 0);
  }

  async submit(): Promise<void> {
    if (!this.title.trim()) {
      this.snackBar.open('Please enter a request title.', 'Close', { duration: 3000 });
      return;
    }

    for (const item of this.items) {
      if (!item.name.trim()) {
        this.snackBar.open('Please select or enter an item name for all lines.', 'Close', { duration: 3000 });
        return;
      }
      if (!item.requestedQuantity || item.requestedQuantity < 1) {
        this.snackBar.open('Quantity must be at least 1.', 'Close', { duration: 3000 });
        return;
      }
    }

    this.isSubmitting = true;
    try {
      const lineItems: PurchaseRequestItem[] = this.items.map((i) => ({
        itemType: i.itemType,
        productId: i.productId || undefined,
        name: i.name,
        category: i.category || 'General',
        currentStockAtRequest: i.currentStock,
        requestedQuantity: i.requestedQuantity,
        unit: i.unit,
        estimatedUnitCost: i.estimatedUnitCost,
        estimatedSubtotal: i.requestedQuantity * i.estimatedUnitCost,
      }));

      await this.prService.createPurchaseRequest({
        title: this.title.trim(),
        priority: this.priority,
        notes: this.notes.trim() || undefined,
        items: lineItems,
        
      });

      this.snackBar.open('Purchase request submitted successfully!', 'Close', { duration: 3000 });
      this.dialogRef.close(true);
    } catch (err: any) {
      this.snackBar.open(err.message || 'Failed to submit request.', 'Close', { duration: 4000 });
    } finally {
      this.isSubmitting = false;
    }
  }
}
