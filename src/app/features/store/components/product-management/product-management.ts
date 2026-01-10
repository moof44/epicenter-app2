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
import { MatDialogModule } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { StoreService } from '../../../../core/services/store.service';
import { Product, ProductCategory, ProductType } from '../../../../core/models/store.model';
import { fadeIn } from '../../../../core/animations/animations';

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

  dataSource = new MatTableDataSource<Product>([]);
  displayedColumns = ['name', 'category', 'price', 'stock', 'actions']; // Default to RETAIL columns
  categories: ProductCategory[] = ['Supplement', 'Drink', 'Merch', 'Fitness', 'Membership'];

  // Data State - Reactive
  products$ = this.storeService.getProducts();
  products = toSignal(this.products$, { initialValue: [] as Product[] });

  // UI State - Signals
  currentFilter = signal<ProductType>('RETAIL');
  showForm = signal(false);

  // Form State - Mutable for Template Forms
  editingProduct: Product | null = null;
  formData: Omit<Product, 'id'> = this.getEmptyForm();

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
      this.cdr.markForCheck(); // Mark for check when data or columns change
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  onTabChange(index: number) {
    this.currentFilter.set(index === 0 ? 'RETAIL' : 'CONSUMABLE');
  }

  private getEmptyForm(): Omit<Product, 'id'> {
    return {
      name: '',
      category: 'Supplement',
      price: 0,
      stock: 0,
      imageUrl: '',
      type: 'RETAIL',
      unit: 'Item',
      minStockLevel: 5
    };
  }

  openAddForm(): void {
    this.editingProduct = null;
    this.formData = this.getEmptyForm();

    // Pre-set type based on current tab
    this.formData.type = this.currentFilter();
    if (this.currentFilter() === 'CONSUMABLE') {
      this.formData.price = 0;
      this.formData.unit = 'Bottle';
    }

    this.showForm.set(true);
  }

  openEditForm(product: Product): void {
    this.editingProduct = product;
    this.formData = { ...product };
    // Maintain defaults if missing
    if (!this.formData.type) this.formData.type = 'RETAIL';
    if (!this.formData.unit) this.formData.unit = 'Item';
    if (this.formData.minStockLevel === undefined) this.formData.minStockLevel = 5;

    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingProduct = null;
    this.formData = this.getEmptyForm();
  }

  async saveProduct(): Promise<void> {
    try {
      if (this.editingProduct?.id) {
        await this.storeService.updateProduct(this.editingProduct.id, this.formData);
        this.snackBar.open('Product updated successfully', 'Close', { duration: 3000 });
      } else {
        await this.storeService.addProduct(this.formData);
        this.snackBar.open('Product added successfully', 'Close', { duration: 3000 });
      }
      this.closeForm();
    } catch {
      this.snackBar.open('Error saving product', 'Close', { duration: 3000 });
    } finally {
      this.cdr.markForCheck();
    }
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
      'Supplement': 'primary',
      'Drink': 'accent',
      'Merch': 'warn',
      'Fitness': 'primary',
      'Membership': 'accent'
    };
    return colors[category] || 'primary';
  }

  // Helper for template binding since we use signals now
  // This method is no longer needed as formData is a plain object
  // updateFormData(field: keyof Omit<Product, 'id'>, value: any) {
  //   this.formData.update(current => ({ ...current, [field]: value }));
  // }
}
