import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { StoreService } from '../../../../core/services/store.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CashRegisterService } from '../../../../core/services/cash-register.service';
import { Product, CartItem, ProductCategory } from '../../../../core/models/store.model';
import { Observable, map, firstValueFrom } from 'rxjs';
import { fadeIn } from '../../../../core/animations/animations';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CheckoutDialog, CheckoutDialogResult } from './checkout-dialog/checkout-dialog';
import { PriceOverrideDialog, PriceOverrideDialogResult } from './price-override-dialog/price-override-dialog';

@Component({
  selector: 'app-pos',
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatIconModule, MatCardModule,
    MatBadgeModule, MatDividerModule, MatSnackBarModule, MatChipsModule,
    MatInputModule, MatFormFieldModule, MatDialogModule
  ],
  templateUrl: './pos.html',
  styleUrl: './pos.css',
  animations: [fadeIn],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class POS {
  private storeService = inject(StoreService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private authService = inject(AuthService);

  private cashRegisterService = inject(CashRegisterService);

  products$: Observable<Product[]> = this.storeService.getProducts().pipe(
    map(products => products.filter(p => p.type !== 'CONSUMABLE'))
  );
  cart$: Observable<CartItem[]> = this.storeService.cart$;
  cartTotal$: Observable<number> = this.storeService.getCartTotal();
  isShiftOpen$ = this.cashRegisterService.currentShift$.pipe(map(s => s?.status === 'OPEN'));

  selectedCategory = signal<ProductCategory | 'All'>('All');
  categories: (ProductCategory | 'All')[] = ['All', 'Supplement', 'Drink', 'Merch', 'Fitness'];
  isProcessing = signal(false);
  cartExpanded = signal(false);

  toggleCart(): void {
    this.cartExpanded.update(v => !v);
  }

  addToCart(product: Product): void {
    if (!this.cashRegisterService.isShiftOpen()) {
      this.snackBar.open('Register is closed. Please open a shift first.', 'Close', { duration: 3000 });
      return;
    }

    if (product.stock <= 0) {
      this.snackBar.open('Product out of stock', 'Close', { duration: 2000 });
      return;
    }
    this.storeService.addToCart(product);
    this.snackBar.open(`${product.name} added to cart`, 'Close', { duration: 1500 });
  }

  updateQuantity(item: CartItem, change: number): void {
    if (!this.cashRegisterService.isShiftOpen()) {
      this.snackBar.open('Register is closed.', 'Close', { duration: 3000 });
      return;
    }
    const newQty = item.quantity + change;
    this.storeService.updateCartItemQuantity(item.productId, newQty);
  }

  removeItem(productId: string): void {
    if (!this.cashRegisterService.isShiftOpen()) {
      this.snackBar.open('Register is closed.', 'Close', { duration: 3000 });
      return;
    }
    this.storeService.removeFromCart(productId);
  }

  clearCart(): void {
    if (!this.cashRegisterService.isShiftOpen()) {
      this.snackBar.open('Register is closed.', 'Close', { duration: 3000 });
      return;
    }
    this.storeService.clearCart();
  }

  async openPriceOverrideDialog(item: CartItem): Promise<void> {
    if (!this.cashRegisterService.isShiftOpen()) return;

    const dialogRef = this.dialog.open(PriceOverrideDialog, {
      width: '400px',
      data: {
        productName: item.productName,
        currentPrice: item.price,
        originalPrice: item.originalPrice
      }
    });

    const result = await firstValueFrom(dialogRef.afterClosed()) as PriceOverrideDialogResult;

    if (result) {
      this.storeService.updateCartItemPrice(item.productId, result.newPrice, result.reason);
      this.snackBar.open('Price updated', 'Close', { duration: 2000 });
    }
  }

  async checkout(): Promise<void> {
    if (!this.cashRegisterService.isShiftOpen()) {
      this.snackBar.open('Register is closed. Please open a shift first.', 'Close', { duration: 3000 });
      return;
    }

    const total = await firstValueFrom(this.cartTotal$);

    const dialogRef = this.dialog.open(CheckoutDialog, {
      width: '400px',
      data: { total: total }
    });

    const result = await firstValueFrom(dialogRef.afterClosed()) as CheckoutDialogResult;

    if (!result) return; // User cancelled

    this.isProcessing.set(true);
    try {
      const transactionId = await this.storeService.checkout(
        undefined,
        this.authService.userProfile()?.displayName || this.authService.userProfile()?.email || 'Unknown Staff',
        result.paymentMethod,
        result.referenceNumber,
        result.amountTendered,
        result.changeDue
      );
      this.snackBar.open(`Sale completed! Transaction: ${transactionId.slice(0, 8)}...`, 'Close', { duration: 4000 });
    } catch (error: any) {
      this.snackBar.open(error.message || 'Checkout failed', 'Close', { duration: 3000 });
    } finally {
      this.isProcessing.set(false);
    }
  }

  filterProducts(products: Product[]): Product[] {
    const category = this.selectedCategory();
    if (category === 'All') return products;
    return products.filter(p => p.category === category);
  }

  getCategoryIcon(category: ProductCategory): string {
    const icons: Record<ProductCategory, string> = {
      'Supplement': 'fitness_center',
      'Drink': 'local_drink',
      'Merch': 'checkroom',
      'Fitness': 'directions_run'
    };
    return icons[category];
  }
}
