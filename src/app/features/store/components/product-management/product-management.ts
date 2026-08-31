import { Component, inject, ViewChild, AfterViewInit, signal, computed, effect, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProductService } from '../../../../core/services/product.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { Product, ProductCategory, ProductType } from '../../../../core/models/store.model';
import { fadeIn } from '../../../../core/animations/animations';
import { ProductFormDialog } from './product-form-dialog/product-form-dialog';

@Component({
  selector: 'app-product-management',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatTableModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatSelectModule, MatDialogModule,
    MatPaginatorModule, MatChipsModule, MatSnackBarModule, MatTabsModule, MatTooltipModule
  ],
  templateUrl: './product-management.html',
  styleUrl: './product-management.css',
  animations: [fadeIn],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductManagement implements AfterViewInit {
  private productService = inject(ProductService);
  private inventoryService = inject(InventoryService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);

  dataSource = new MatTableDataSource<Product>([]);
  displayedColumns = ['name', 'category', 'price', 'stock', 'status', 'actions'];
  categories: ProductCategory[] = ['Training', 'Supplements', 'Drinks', 'Boxing'];

  // Data State
  products$ = this.productService.getProducts();
  products = toSignal(this.products$, { initialValue: [] as Product[] });

  // Filters & State
  currentFilter = signal<ProductType>('RETAIL');
  searchQuery = signal<string>('');
  selectedCategory = signal<string>('ALL');
  statusFilter = signal<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');

  // Products filtered by type (for metrics)
  typeProducts = computed(() => {
    const all = this.products();
    const type = this.currentFilter();
    return all.filter(p => (p.type || 'RETAIL') === type);
  });

  // Summary Metrics
  totalSkus = computed(() => this.typeProducts().length);
  activeSkusCount = computed(() => {
    return this.typeProducts().filter(p => p.isActive !== false && !p.disabled).length;
  });
  disabledSkusCount = computed(() => {
    return this.typeProducts().filter(p => p.isActive === false || p.disabled === true).length;
  });
  totalInventoryValue = computed(() => {
    if (this.currentFilter() !== 'RETAIL') return 0;
    return this.typeProducts()
      .filter(p => p.isActive !== false && !p.disabled)
      .reduce((sum, p) => sum + (p.price || 0) * (p.stock || 0), 0);
  });
  lowStockCount = computed(() => {
    return this.typeProducts().filter(p => p.stock > 0 && p.stock <= (p.minStockLevel || 5)).length;
  });
  outOfStockCount = computed(() => {
    return this.typeProducts().filter(p => (p.stock || 0) <= 0).length;
  });

  // Fully filtered products for table
  filteredProducts = computed(() => {
    let list = this.typeProducts();
    const q = this.searchQuery().trim().toLowerCase();
    const cat = this.selectedCategory();
    const status = this.statusFilter();

    if (cat !== 'ALL') {
      list = list.filter(p => p.category === cat);
    }

    if (status === 'ACTIVE') {
      list = list.filter(p => p.isActive !== false && !p.disabled);
    } else if (status === 'DISABLED') {
      list = list.filter(p => p.isActive === false || p.disabled === true);
    }

    if (q) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    return list;
  });

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor() {
    effect(() => {
      this.dataSource.data = this.filteredProducts();

      if (this.currentFilter() === 'CONSUMABLE') {
        this.displayedColumns = ['name', 'unit', 'stock', 'status', 'actions'];
      } else {
        this.displayedColumns = ['name', 'category', 'price', 'stock', 'status', 'actions'];
      }
      this.cdr.markForCheck();
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  onTabChange(index: number) {
    this.currentFilter.set(index === 0 ? 'RETAIL' : 'CONSUMABLE');
    this.selectedCategory.set('ALL');
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

  openAddForm(): void {
    this.dialog.open(ProductFormDialog, {
      width: '560px',
      maxWidth: '94vw',
      maxHeight: '92vh',
      data: { type: this.currentFilter() }
    });
  }

  openEditForm(product: Product): void {
    this.dialog.open(ProductFormDialog, {
      width: '560px',
      maxWidth: '94vw',
      maxHeight: '92vh',
      data: { product: product }
    });
  }

  async deleteProduct(product: Product): Promise<void> {
    if (!product.id || !confirm(`Delete "${product.name}" from inventory?`)) return;
    try {
      await this.productService.deleteProduct(product.id);
      this.snackBar.open(`"${product.name}" deleted successfully`, 'Close', { duration: 3000 });
    } catch {
      this.snackBar.open('Error deleting product', 'Close', { duration: 3000 });
    } finally {
      this.cdr.markForCheck();
    }
  }

  async quickConsume(product: Product): Promise<void> {
    if (!product.id) return;
    try {
      await this.inventoryService.logConsumption(product.id, 1, 'Quick Consume Button');
      this.snackBar.open(`Consumed 1 ${product.unit || 'unit'} of ${product.name}`, 'Close', { duration: 2000 });
    } catch (err) {
      console.error(err);
      this.snackBar.open('Error logging consumption', 'Close', { duration: 3000 });
    } finally {
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

  isProductActive(product: Product): boolean {
    return product.isActive !== false && !product.disabled;
  }

  setStatusFilter(status: 'ALL' | 'ACTIVE' | 'DISABLED'): void {
    this.statusFilter.set(status);
  }

  async toggleProductActive(product: Product): Promise<void> {
    if (!product.id) return;
    const currentActive = this.isProductActive(product);
    const nextActive = !currentActive;

    try {
      await this.productService.updateProduct(product.id, {
        isActive: nextActive,
        disabled: !nextActive
      });
      this.snackBar.open(
        `"${product.name}" is now ${nextActive ? 'Active (visible in POS)' : 'Disabled (hidden from POS)'}`,
        'Close',
        { duration: 2500 }
      );
    } catch (err) {
      console.error('Error toggling product status:', err);
      this.snackBar.open('Failed to update product status', 'Close', { duration: 3000 });
    } finally {
      this.cdr.markForCheck();
    }
  }
}