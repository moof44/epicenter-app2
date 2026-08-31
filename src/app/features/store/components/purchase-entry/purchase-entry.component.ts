import { Component, inject, OnInit, DestroyRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProductService } from '../../../../core/services/product.service';
import { PurchaseService } from '../../../../core/services/purchase.service';
import { Product } from '../../../../core/models/store.model';
import { fadeIn } from '../../../../core/animations/animations';
import { ProductCreationDialog } from './product-creation-dialog/product-creation-dialog';

@Component({
  selector: 'app-purchase-entry',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './purchase-entry.component.html',
  styleUrl: './purchase-entry.component.css',
  animations: [fadeIn]
})
export class PurchaseEntryComponent implements OnInit {
  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private purchaseService = inject(PurchaseService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  purchaseForm!: FormGroup;
  retailProducts = signal<Product[]>([]);
  consumableProducts = signal<Product[]>([]);
  allProducts = signal<Product[]>([]);
  productsLoaded = signal(false);
  isSubmitting = signal(false);

  // Computed Metrics
  totalItemsCount = computed(() => this.items.length);
  
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
    this.addItem();
  }

  get items(): FormArray {
    return this.purchaseForm.get('items') as FormArray;
  }

  addItem() {
    const itemGroup = this.fb.group({
      productId: ['', Validators.required],
      productName: [''],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitCost: [0, [Validators.required, Validators.min(0)]]
    });

    itemGroup.get('productId')?.valueChanges.subscribe(id => {
      const p = this.allProducts().find(prod => prod.id === id);
      if (p) {
        itemGroup.patchValue({ productName: p.name }, { emitEvent: false });
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

  stepQuantity(index: number, delta: number) {
    const control = this.items.at(index).get('quantity');
    if (!control) return;
    const current = Number(control.value) || 1;
    const updated = Math.max(1, current + delta);
    control.setValue(updated);
  }

  loadProducts() {
    this.productService.getProducts().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(products => {
      this.allProducts.set(products);
      this.retailProducts.set(products.filter(p => (!p.type || p.type === 'RETAIL')));
      this.consumableProducts.set(products.filter(p => p.type === 'CONSUMABLE'));
      this.productsLoaded.set(true);
    });
  }

  openNewProductDialog(index: number) {
    const dialogRef = this.dialog.open(ProductCreationDialog, {
      width: '460px',
      panelClass: 'dark-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.id) {
        this.items.at(index).patchValue({ productId: result.id });
      }
    });
  }

  get totalUnits(): number {
    return this.items.controls.reduce((acc, control) => {
      return acc + (Number(control.get('quantity')?.value) || 0);
    }, 0);
  }

  get totalCost(): number {
    return this.items.controls.reduce((acc, control) => {
      const qty = Number(control.get('quantity')?.value) || 0;
      const cost = Number(control.get('unitCost')?.value) || 0;
      return acc + (qty * cost);
    }, 0);
  }

  async save() {
    if (this.purchaseForm.invalid || this.items.length === 0 || this.isSubmitting()) return;

    this.isSubmitting.set(true);
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
          quantity: Number(i.quantity),
          unitCost: Number(i.unitCost),
          totalRowCost: Number(i.quantity) * Number(i.unitCost)
        }))
      };

      await this.purchaseService.recordPurchase(order);

      this.snackBar.open('Restock purchase recorded successfully!', 'Close', { duration: 3000 });
      this.router.navigate(['/store/purchases']);
    } catch (err) {
      console.error('Error recording restock purchase:', err);
      this.snackBar.open('Error recording purchase: ' + ((err as any)?.message || 'Unknown error'), 'Close', { duration: 4000 });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/store/manage']);
  }
}
