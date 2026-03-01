import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { StoreService } from '../../../../../core/services/store.service';
import { Product, ProductCategory, ProductType } from '../../../../../core/models/store.model';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface ProductFormDialogData {
  product?: Product; // If provided, editing
  type?: ProductType; // If adding, sets default type
}

@Component({
  selector: 'app-product-form-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatSelectModule, MatDialogModule
  ],
  template: `
    <h2 mat-dialog-title>{{ isEditing ? 'Edit Product' : 'Add Product' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="productForm" class="product-form-content">
        
        <!-- Name -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Product Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Whey Protein Isolate">
          <mat-error *ngIf="productForm.get('name')?.hasError('required')">Name is required</mat-error>
        </mat-form-field>

        <!-- Description -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3" placeholder="Product details..."></textarea>
        </mat-form-field>

        <!-- Category (Show if RETAIL only, but form holds value) -->
        <mat-form-field appearance="outline" class="full-width" *ngIf="isRetail">
          <mat-label>Category</mat-label>
          <mat-select formControlName="category">
            <mat-option *ngFor="let cat of categories" [value]="cat">{{ cat }}</mat-option>
          </mat-select>
          <mat-error *ngIf="productForm.get('category')?.hasError('required')">Category is required</mat-error>
        </mat-form-field>

        <div class="row-fields">
          <!-- Price (Retail Only) -->
          <mat-form-field appearance="outline" *ngIf="isRetail">
            <mat-label>Price</mat-label>
            <span matTextPrefix>₱&nbsp;</span>
            <input matInput type="number" formControlName="price" min="0">
             <mat-error *ngIf="productForm.get('price')?.hasError('required')">Price is required</mat-error>
          </mat-form-field>

          <!-- Unit -->
          <mat-form-field appearance="outline">
            <mat-label>Unit</mat-label>
            <input matInput formControlName="unit" placeholder="e.g. Bottle, Pcs">
          </mat-form-field>
        </div>

        <div class="row-fields">
          <!-- Min Stock -->
          <mat-form-field appearance="outline">
            <mat-label>Min Stock Level</mat-label>
            <input matInput type="number" formControlName="minStockLevel" min="0">
          </mat-form-field>

          <!-- Image URL -->
          <mat-form-field appearance="outline">
            <mat-label>Image URL</mat-label>
            <input matInput formControlName="imageUrl" placeholder="https://...">
          </mat-form-field>
        </div>
        
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [disabled]="productForm.invalid || isSaving" (click)="save()">
        {{ isSaving ? 'Saving...' : (isEditing ? 'Update' : 'Create') }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .product-form-content {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      min-width: 300px;
    }
    .full-width { width: 100%; }
    .row-fields {
      display: flex;
      gap: 1rem;
    }
    .row-fields mat-form-field {
      flex: 1;
    }
    @media (max-width: 600px) {
      .row-fields { flex-direction: column; gap: 0; }
    }
  `]
})
export class ProductFormDialog {
  private fb = inject(FormBuilder);
  private storeService = inject(StoreService);
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
      stock: [product?.stock || 0] // Hidden, preserved
    });

    // Update validators if type changes (unlikely in this logic but safe to know)
  }

  get isRetail(): boolean {
    return this.productForm.get('type')?.value === 'RETAIL';
  }

  async save() {
    if (this.productForm.invalid) return;

    this.isSaving = true;
    const formValue = this.productForm.value;

    // Ensure Consumables have price 0 if not set (though hidden)
    if (formValue.type === 'CONSUMABLE') {
      formValue.price = 0;
      // Category might be irrelevant but we keep it or set default
    }

    try {
      if (this.isEditing && this.data.product?.id) {
        await this.storeService.updateProduct(this.data.product.id, formValue);
        this.snackBar.open('Product updated successfully', 'Close', { duration: 3000 });
      } else {
        await this.storeService.addProduct(formValue);
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
}
