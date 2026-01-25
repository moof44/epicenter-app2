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
import { StoreService } from '../../../../core/services/store.service';
import { Product, ProductCategory, ProductType } from '../../../../core/models/store.model';
import { fadeIn } from '../../../../core/animations/animations';
import { ProductFormDialog } from './product-form-dialog/product-form-dialog';

@Component({
  selector: 'app-product-management',
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
  private storeService = inject(StoreService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);

  dataSource = new MatTableDataSource<Product>([]);
  displayedColumns = ['name', 'category', 'price', 'stock', 'actions'];
  categories: ProductCategory[] = ['Training', 'Supplements', 'Drinks', 'Boxing'];

  // Data State - Reactive
  products$ = this.storeService.getProducts();
  products = toSignal(this.products$, { initialValue: [] as Product[] });

  // UI State - Signals
  currentFilter = signal<ProductType>('RETAIL');

  // Computed filtered data
  filteredProducts = computed(() => {
    const all = this.products();
    const filter = this.currentFilter();
    return all.filter(p => {
      const type = p.type || 'RETAIL';
      return type === filter;
    });
  });

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor() {
    effect(() => {
      this.dataSource.data = this.filteredProducts();

      if (this.currentFilter() === 'CONSUMABLE') {
        this.displayedColumns = ['name', 'unit', 'stock', 'actions'];
      } else {
        this.displayedColumns = ['name', 'category', 'price', 'stock', 'actions'];
      }
      this.cdr.markForCheck();
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  onTabChange(index: number) {
    this.currentFilter.set(index === 0 ? 'RETAIL' : 'CONSUMABLE');
  }

  openAddForm(): void {
    this.dialog.open(ProductFormDialog, {
      width: '500px',
      maxWidth: '95vw',
      data: { type: this.currentFilter() }
    });
  }

  openEditForm(product: Product): void {
    this.dialog.open(ProductFormDialog, {
      width: '500px',
      maxWidth: '95vw',
      data: { product: product }
    });
  }

  async deleteProduct(product: Product): Promise<void> {
    if (!product.id || !confirm(`Delete "${product.name}"?`)) return;
    try {
      await this.storeService.deleteProduct(product.id);
      this.snackBar.open('Product deleted', 'Close', { duration: 3000 });
    } catch {
      this.snackBar.open('Error deleting product', 'Close', { duration: 3000 });
    } finally {
      this.cdr.markForCheck();
    }
  }

  async quickConsume(product: Product): Promise<void> {
    if (!product.id) return;
    try {
      await this.storeService.logConsumption(product.id, 1, 'Quick Consume Button');
      this.snackBar.open(`Consumed 1 ${product.unit || 'unit'} of ${product.name}`, 'Close', { duration: 2000 });
    } catch (err) {
      console.error(err);
      this.snackBar.open('Error logging consumption', 'Close', { duration: 3000 });
    } finally {
      this.cdr.markForCheck();
    }
  }

  getCategoryColor(category: ProductCategory): string {
    const colors: Record<ProductCategory, string> = {
      'Supplements': 'primary',
      'Drinks': 'accent',
      'Boxing': 'warn',
      'Training': 'warn'
    };
    return colors[category] || 'primary';
  }
}
