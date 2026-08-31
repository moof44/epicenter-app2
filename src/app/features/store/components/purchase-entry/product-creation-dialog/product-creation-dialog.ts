import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ProductService } from '../../../../../core/services/product.service';
import { ProductCategory, ProductType } from '../../../../../core/models/store.model';

@Component({
  selector: 'app-product-creation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule
  ],
  templateUrl: './product-creation-dialog.html',
  styleUrl: './product-creation-dialog.css'
})
export class ProductCreationDialog {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<ProductCreationDialog>);
  private productService = inject(ProductService);

  categories: ProductCategory[] = ['Training', 'Supplements', 'Drinks', 'Boxing'];
  isSaving = false;

  productForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    type: ['RETAIL' as ProductType, Validators.required],
    category: ['Supplements' as ProductCategory, Validators.required],
    price: [0, [Validators.required, Validators.min(0)]],
    unit: ['Item', Validators.required],
    stock: [0], // Initial stock 0, will be added via restock entry
    minStockLevel: [5]
  });

  close() {
    this.dialogRef.close();
  }

  async save() {
    if (this.productForm.invalid || this.isSaving) return;
    this.isSaving = true;

    try {
      const productData = this.productForm.value as any;
      const res = await this.productService.addProduct(productData);
      this.dialogRef.close(res);
    } catch (err) {
      console.error('Error creating product in restock dialog:', err);
    } finally {
      this.isSaving = false;
    }
  }
}
