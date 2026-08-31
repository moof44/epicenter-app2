import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { ProductService } from '../../../../../core/services/product.service';
import { Product, ProductCategory, ProductType } from '../../../../../core/models/store.model';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface ProductFormDialogData {
  product?: Product;
  type?: ProductType;
}

@Component({
  selector: 'app-product-form-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatSelectModule, MatDialogModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './product-form-dialog.html',
  styleUrl: './product-form-dialog.css'
})
export class ProductFormDialog {
  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private snackBar = inject(MatSnackBar);
  public dialogRef = inject(MatDialogRef<ProductFormDialog>);

  productForm: FormGroup;
  isEditing = false;
  isSaving = false;

  categories: ProductCategory[] = ['Training', 'Supplements', 'Drinks', 'Boxing'];
  public data = inject<ProductFormDialogData>(MAT_DIALOG_DATA);

  constructor() {
    this.isEditing = !!this.data.product;
    const product = this.data.product;
    const defaultType = this.data.type || 'RETAIL';

    this.productForm = this.fb.group({
      name: [product?.name || '', Validators.required],
      description: [product?.description || ''],
      category: [product?.category || 'Supplements', defaultType === 'RETAIL' ? Validators.required : null],
      price: [product?.price || 0, defaultType === 'RETAIL' ? [Validators.required, Validators.min(0)] : []],
      unit: [product?.unit || (defaultType === 'CONSUMABLE' ? 'Bottle' : 'Item'), Validators.required],
      minStockLevel: [product?.minStockLevel || 5, [Validators.required, Validators.min(0)]],
      imageUrl: [product?.imageUrl || ''],
      type: [product?.type || defaultType],
      stock: [product?.stock || 0]
    });
  }

  get isRetail(): boolean {
    return this.productForm.get('type')?.value === 'RETAIL';
  }

  async save() {
    if (this.productForm.invalid) return;

    this.isSaving = true;
    const formValue = this.productForm.value;

    if (formValue.type === 'CONSUMABLE') {
      formValue.price = 0;
    }

    try {
      if (this.isEditing && this.data.product?.id) {
        await this.productService.updateProduct(this.data.product.id, formValue);
        this.snackBar.open('Product updated successfully', 'Close', { duration: 3000 });
      } else {
        await this.productService.addProduct(formValue);
        this.snackBar.open('Product created successfully', 'Close', { duration: 3000 });
      }
      this.dialogRef.close(true);
    } catch (error) {
      console.error(error);
      this.snackBar.open('Error saving product', 'Close', { duration: 3000 });
    } finally {
      this.isSaving = false;
    }
  }

  onClose(): void {
    this.dialogRef.close(false);
  }
}
