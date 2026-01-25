import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { StoreService } from '../../../../core/services/store.service';
import { PurchaseService } from '../../../../core/services/purchase.service';
import { Product, ProductCategory, ProductType } from '../../../../core/models/store.model';
import { fadeIn } from '../../../../core/animations/animations';
import { Router } from '@angular/router';

// ==========================================
// Dialog Component for New Product
// ==========================================
@Component({
  selector: 'app-product-creation-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Create New Product</h2>
    <mat-dialog-content>
      <form [formGroup]="productForm" class="dialog-content">
        <mat-form-field appearance="outline">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="2"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Type</mat-label>
          <mat-select formControlName="type">
            <mat-option value="RETAIL">Retail</mat-option>
            <mat-option value="CONSUMABLE">Consumable</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Category</mat-label>
          <mat-select formControlName="category">
            <mat-option *ngFor="let cat of categories" [value]="cat">{{ cat }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Selling Price</mat-label>
          <span matTextPrefix>$&nbsp;</span>
          <input matInput type="number" formControlName="price">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Unit</mat-label>
          <input matInput formControlName="unit" placeholder="e.g. Item, Bottle">
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [disabled]="productForm.invalid" (click)="save()">Create</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content { display: flex; flex-direction: column; gap: 12px; min-width: 300px; padding-top: 10px; }
  `]
})
export class ProductCreationDialog {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<ProductCreationDialog>);
  private storeService = inject(StoreService);

  categories: ProductCategory[] = ['Training', 'Supplements', 'Drinks', 'Boxing'];

  productForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    type: ['RETAIL' as ProductType, Validators.required],
    category: ['Supplements' as ProductCategory, Validators.required],
    price: [0, [Validators.required, Validators.min(0)]],
    unit: ['Item', Validators.required],
    stock: [0], // Initial stock 0, will be added via purchase
    minStockLevel: [5]
  });

  async save() {
    if (this.productForm.invalid) return;
    try {
      const productData = this.productForm.value as any; // Cast to avoid strict type issues with partial
      const res = await this.storeService.addProduct(productData);
      // addProduct returns docRef or similar? StoreService.addProduct returns Promise<any> (addDoc result)
      // I need the ID of the created product.
      // Let's assume storeService.addProduct returns the DocumentReference
      this.dialogRef.close(res);
    } catch (err) {
      console.error(err);
    }
  }
}

// ==========================================
// Main Component
// ==========================================
@Component({
  selector: 'app-purchase-entry',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule,
    MatDialogModule, MatSnackBarModule, MatTooltipModule
  ],
  templateUrl: './purchase-entry.component.html',
  styleUrl: './purchase-entry.component.css',
  animations: [fadeIn]
})
export class PurchaseEntryComponent implements OnInit {
  private fb = inject(FormBuilder);
  private storeService = inject(StoreService);
  private purchaseService = inject(PurchaseService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  purchaseForm!: FormGroup;
  retailProducts: Product[] = [];
  consumableProducts: Product[] = [];
  productsLoaded = false;
  allProducts: Product[] = [];

  constructor() {
    this.initForm();
  }

  ngOnInit() {
    this.loadProducts();
  }

  private initForm() {
    this.purchaseForm = this.fb.group({
      supplierName: ['', Validators.required],
      date: [new Date(), Validators.required],
      referenceNumber: [''],
      items: this.fb.array([])
    });
    // Add one empty row by default
    this.addItem();
  }

  get items() {
    return this.purchaseForm.get('items') as FormArray;
  }

  addItem() {
    const itemGroup = this.fb.group({
      productId: ['', Validators.required],
      productName: [''], // Hidden, auto-filled
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitCost: [0, [Validators.required, Validators.min(0)]]
    });

    // Listen to productId changes to update productName
    itemGroup.get('productId')?.valueChanges.subscribe(id => {
      const p = this.allProducts.find(prod => prod.id === id);
      if (p) {
        itemGroup.patchValue({ productName: p.name }, { emitEvent: false });
        // Optionally suggest lastCostPrice if we had it?
        if (p.lastCostPrice) {
          itemGroup.patchValue({ unitCost: p.lastCostPrice }, { emitEvent: false });
        }
      }
    });

    this.items.push(itemGroup);
  }

  removeItem(index: number) {
    this.items.removeAt(index);
  }

  loadProducts() {
    this.storeService.getProducts().subscribe(products => {
      this.allProducts = products;
      this.retailProducts = products.filter(p => (!p.type || p.type === 'RETAIL'));
      this.consumableProducts = products.filter(p => p.type === 'CONSUMABLE');
      this.productsLoaded = true;
    });
  }

  onProductSelected(_index: number, _productId: string) {
    // Handled by valueChanges mainly, but double check here if needed
  }

  openNewProductDialog(index: number) {
    const dialogRef = this.dialog.open(ProductCreationDialog, {
      width: '400px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) { // result is the docRef or similar. StoreService returns addDoc promise result.
        // If StoreService.addProduct returns DocumentReference, it has .id
        const newId = result.id;
        if (newId) {
          // Need to reload products or wait for subscription update? 
          // Subscription should be live if it's Firestore... 
          // But to be safe and fast, let's wait a tick or just set the ID.
          // Assuming subscription updates quickly.
          // We can set the value after a short delay or find it in allProducts if observable fired
          // For now, let's just set the ID and hope the list updates.
          this.items.at(index).patchValue({ productId: newId });
        }
      }
    });
  }

  get totalCost(): number {
    return this.items.controls.reduce((acc, control) => {
      const qty = control.get('quantity')?.value || 0;
      const cost = control.get('unitCost')?.value || 0;
      return acc + (qty * cost);
    }, 0);
  }

  async save() {
    if (this.purchaseForm.invalid) return;

    try {
      const formVal = this.purchaseForm.getRawValue();

      const order = {
        supplierName: formVal.supplierName,
        date: formVal.date,
        referenceNumber: formVal.referenceNumber,
        totalCost: this.totalCost,
        items: formVal.items.map((i: any) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          unitCost: i.unitCost,
          totalRowCost: i.quantity * i.unitCost
        }))
      };

      await this.purchaseService.recordPurchase(order);

      this.snackBar.open('Purchase recorded successfully', 'Close', { duration: 3000 });
      this.router.navigate(['/store/purchases']); // Redirect to history (Phase 4)
      // Or just reset
      // this.initForm();
    } catch (err) {
      console.error(err);
      this.snackBar.open('Error recording purchase', 'Close', { duration: 3000 });
    }
  }
}
