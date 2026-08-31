import { Component, inject, OnInit, ChangeDetectorRef, DestroyRef, signal, computed, effect } from '@angular/core';
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
import { Product, ProductCategory } from '../../../../core/models/store.model';
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

  // State Signals
  products = signal<Product[]>([]);
  auditValues: Record<string, number> = {};
  auditVersion = signal<number>(0); // Trigger reactivity on auditValues updates
  isLoading = signal<boolean>(true);
  isDraftingPR = signal<boolean>(false);
  isUpdating = signal<boolean>(false);

  // Filters
  searchQuery = signal<string>('');
  selectedCategory = signal<string>('ALL');
  varianceFilter = signal<'ALL' | 'COUNTED' | 'DISCREPANCY' | 'PENDING'>('ALL');
  categories: ProductCategory[] = ['Training', 'Supplements', 'Drinks', 'Boxing'];

  // Computed Metrics
  totalItems = computed(() => this.products().length);

  countedItemsCount = computed(() => {
    this.auditVersion(); // reactive dependency
    return Object.keys(this.auditValues).length;
  });

  matchCount = computed(() => {
    this.auditVersion();
    return this.products().filter(p => this.hasValue(p) && this.getVariance(p) === 0).length;
  });

  discrepancyCount = computed(() => {
    this.auditVersion();
    return this.products().filter(p => this.hasValue(p) && this.getVariance(p) !== 0).length;
  });

  // Filtered Products for Table & Mobile Cards
  filteredProducts = computed(() => {
    this.auditVersion();
    let list = this.products();
    const q = this.searchQuery().trim().toLowerCase();
    const cat = this.selectedCategory();
    const vf = this.varianceFilter();

    if (cat !== 'ALL') {
      list = list.filter(p => p.category === cat);
    }

    if (vf === 'COUNTED') {
      list = list.filter(p => this.hasValue(p));
    } else if (vf === 'DISCREPANCY') {
      list = list.filter(p => this.hasValue(p) && this.getVariance(p) !== 0);
    } else if (vf === 'PENDING') {
      list = list.filter(p => !this.hasValue(p));
    }

    if (q) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
      );
    }

    return list;
  });

  constructor() {
    effect(() => {
      this.dataSource.data = this.filteredProducts();
      this.cdr.markForCheck();
    });
  }

  ngOnInit() {
    this.productService.getProducts().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (products) => {
        this.products.set(products);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  updateAuditValue(id: string, value: any) {
    if (value === null || value === undefined || value === '') {
      delete this.auditValues[id];
    } else {
      this.auditValues[id] = Number(value);
    }
    this.auditVersion.update(v => v + 1);
    this.cdr.markForCheck();
  }

  incrementCount(product: Product): void {
    if (!product.id) return;
    const current = this.auditValues[product.id] !== undefined ? this.auditValues[product.id] : product.stock;
    this.updateAuditValue(product.id, current + 1);
  }

  decrementCount(product: Product): void {
    if (!product.id) return;
    const current = this.auditValues[product.id] !== undefined ? this.auditValues[product.id] : product.stock;
    this.updateAuditValue(product.id, Math.max(0, current - 1));
  }

  setSameAsSystem(product: Product): void {
    if (!product.id) return;
    this.updateAuditValue(product.id, product.stock);
  }

  clearCount(product: Product): void {
    if (!product.id) return;
    this.updateAuditValue(product.id, null);
  }

  hasValue(product: Product): boolean {
    return product.id ? this.auditValues[product.id] !== undefined : false;
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
    if (v < 0) return 'mismatch';
    return 'positive';
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  setCategoryFilter(category: string): void {
    this.selectedCategory.set(category);
  }

  setVarianceFilter(filter: 'ALL' | 'COUNTED' | 'DISCREPANCY' | 'PENDING'): void {
    this.varianceFilter.set(filter);
  }

  async finalizeAdjustment(): Promise<void> {
    const auditData = Object.entries(this.auditValues).map(([productId, physicalCount]) => ({
      productId,
      physicalCount
    }));

    if (auditData.length === 0) return;

    if (!confirm(`Submit inventory adjustments for ${auditData.length} items? This will update live stock levels.`)) return;

    this.isUpdating.set(true);
    try {
      await this.inventoryService.reconcileInventory(auditData);
      this.snackBar.open(`Successfully updated stock levels for ${auditData.length} items!`, 'Close', { duration: 3000 });
      this.auditValues = {};
      this.auditVersion.update(v => v + 1);
    } catch (err) {
      console.error(err);
      this.snackBar.open('Error reconciling inventory', 'Close', { duration: 3000 });
    } finally {
      this.isUpdating.set(false);
      this.cdr.markForCheck();
    }
  }

  async draftPurchaseRequestFromDeficits(): Promise<void> {
    const products = this.products();
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

    this.isDraftingPR.set(true);
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
      this.isDraftingPR.set(false);
      this.cdr.markForCheck();
    }
  }

  getCategoryColor(category?: ProductCategory): string {
    switch (category) {
      case 'Training': return '#38bdf8';
      case 'Supplements': return '#fbbf24';
      case 'Drinks': return '#34d399';
      case 'Boxing': return '#f87171';
      default: return '#94a3b8';
    }
  }
}
