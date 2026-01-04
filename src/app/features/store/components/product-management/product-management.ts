import { Component, inject, ViewChild, AfterViewInit } from '@angular/core';
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
import { StoreService } from '../../../../core/services/store.service';
import { Product, ProductCategory } from '../../../../core/models/store.model';
import { fadeIn } from '../../../../core/animations/animations';

@Component({
  selector: 'app-product-management',
  imports: [
    CommonModule, FormsModule, MatTableModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatSelectModule, MatDialogModule,
    MatPaginatorModule, MatChipsModule, MatSnackBarModule
  ],
  templateUrl: './product-management.html',
  styleUrl: './product-management.css',
  animations: [fadeIn]
})
export class ProductManagement implements AfterViewInit {
  private storeService = inject(StoreService);
  private snackBar = inject(MatSnackBar);

  dataSource = new MatTableDataSource<Product>([]);
  displayedColumns = ['name', 'category', 'price', 'stock', 'actions'];
  categories: ProductCategory[] = ['Supplement', 'Drink', 'Merch'];

  // Form state
  showForm = false;
  editingProduct: Product | null = null;
  formData: Omit<Product, 'id'> = this.getEmptyForm();

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor() {
    this.storeService.getProducts().subscribe(products => {
      this.dataSource.data = products;
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }


  private getEmptyForm(): Omit<Product, 'id'> {
    return { name: '', category: 'Supplement', price: 0, stock: 0, imageUrl: '' };
  }

  openAddForm(): void {
    this.editingProduct = null;
    this.formData = this.getEmptyForm();
    this.showForm = true;
  }

  openEditForm(product: Product): void {
    this.editingProduct = product;
    this.formData = { ...product };
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
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
    }
  }

  async deleteProduct(product: Product): Promise<void> {
    if (!product.id || !confirm(`Delete "${product.name}"?`)) return;
    try {
      await this.storeService.deleteProduct(product.id);
      this.snackBar.open('Product deleted', 'Close', { duration: 3000 });
    } catch {
      this.snackBar.open('Error deleting product', 'Close', { duration: 3000 });
    }
  }

  getCategoryColor(category: ProductCategory): string {
    const colors: Record<ProductCategory, string> = {
      'Supplement': 'primary',
      'Drink': 'accent',
      'Merch': 'warn'
    };
    return colors[category];
  }
}
