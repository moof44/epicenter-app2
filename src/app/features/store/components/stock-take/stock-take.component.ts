import { Component, inject, OnInit, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProductService } from '../../../../core/services/product.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { PurchaseRequestService } from '../../../../core/services/purchase-request.service';
import { PurchaseRequestItem } from '../../../../core/models/purchase-request.model';
import { Product } from '../../../../core/models/store.model';
import { fadeIn } from '../../../../core/animations/animations';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-stock-take',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatTableModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatSnackBarModule, MatTooltipModule,
    MatCardModule, MatProgressSpinnerModule
  ],
  templateUrl: './stock-take.html',
  styleUrl: './stock-take.css',
  animations: [fadeIn]
})
export class StockTakeComponent implements OnInit {
  private productService = inject(ProductService);
  private inventoryService = inject(InventoryService);
  private purchaseRequestService = inject(PurchaseRequestService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  dataSource = new MatTableDataSource<Product>([]);
  displayedColumns = ['name', 'systemStock', 'physicalCount', 'variance'];
  
  auditValues: Record<string, number> = {};
  isLoading = true;
  isDraftingPR = false;

  ngOnInit() {
    this.productService.getProducts().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (products) => {
        this.dataSource.data = products;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  updateAuditValue(id: string, value: number) {
    if (value === null || value === undefined) {
      delete this.auditValues[id];
    } else {
      this.auditValues[id] = value;
    }
  }

  hasValue(product: Product): boolean {
    return this.auditValues[product.id!] !== undefined;
  }

  getVariance(product: Product): number {
    if (!this.hasValue(product)) return 0;
    const physical = this.auditValues[product.id!];
    return physical - product.stock;
  }

  getVarianceClass(product: Product): string {
    if (!this.hasValue(product)) return '';
    const v = this.getVariance(product);
    if (v === 0) return 'match';
    if (v < 0) return 'mismatch'; // Missing items
    return 'positive'; // Found extra
  }

  getCountedItems(): number {
    return Object.keys(this.auditValues).length;
  }

  async finalizeAdjustment() {
    const auditData = Object.entries(this.auditValues).map(([productId, physicalCount]) => ({
      productId,
      physicalCount
    }));

    if (auditData.length === 0) return;

    if (!confirm(`Submit inventory adjustments for ${auditData.length} items? This will update stock levels.`)) return;

    try {
      await this.inventoryService.reconcileInventory(auditData);
      this.snackBar.open('Inventory reconciliation complete', 'Close', { duration: 3000 });
      this.auditValues = {}; // Reset form
      // Note: Data source updates automatically via subscription
    } catch (err) {
      console.error(err);
      this.snackBar.open('Error reconciling inventory', 'Close', { duration: 3000 });
    }
  }

  async draftPurchaseRequestFromDeficits(): Promise<void> {
    const products = this.dataSource.data;
    const shortages = products.filter(p => {
      const current = this.auditValues[p.id!] !== undefined ? this.auditValues[p.id!] : p.stock;
      const minLevel = p.minStockLevel ?? 3;
      return current <= minLevel || this.getVariance(p) < 0;
    });

    if (shortages.length === 0) {
      this.snackBar.open('No stock shortages or items below minimum reorder levels detected.', 'Close', { duration: 3000 });
      return;
    }

    const items: PurchaseRequestItem[] = shortages.map(p => {
      const current = this.auditValues[p.id!] !== undefined ? this.auditValues[p.id!] : p.stock;
      const targetLevel = (p.minStockLevel ? p.minStockLevel * 2 : 10);
      const reorderQty = Math.max(5, targetLevel - current);
      return {
        productId: p.id,
        name: p.name,
        category: p.category,
        itemType: 'CATALOG_PRODUCT',
        requestedQuantity: reorderQty,
        unit: p.unit || 'pcs',
        estimatedUnitCost: p.lastCostPrice || p.averageCost || (p.price ? p.price * 0.7 : 0),
        currentStockSnapshot: current
      };
    });

    if (!confirm(`Draft a Restock Purchase Request for ${items.length} shortage items?`)) return;

    this.isDraftingPR = true;
    try {
      await this.purchaseRequestService.createPurchaseRequest({
        title: `Restock PR - Shortages from Stock Take (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`,
        priority: 'HIGH',
        items,
        notes: `Automatically drafted from physical stock check. ${items.length} items flagged for replenishment.`
      });

      const snack = this.snackBar.open(
        `Restock PR drafted for ${items.length} items!`,
        'View PRs',
        { duration: 5000 }
      );

      snack.onAction().subscribe(() => {
        this.router.navigate(['/store/purchase-requests']);
      });
    } catch (err: any) {
      console.error('Failed to draft PR from stock take:', err);
      this.snackBar.open(err.message || 'Failed to draft purchase request', 'Close', { duration: 3000 });
    } finally {
      this.isDraftingPR = false;
    }
  }
}
