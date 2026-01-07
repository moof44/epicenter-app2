import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
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
import { CashRegisterService } from '../../../../core/services/cash-register.service';
import { Product, CartItem, ProductCategory } from '../../../../core/models/store.model';
import { Observable, map } from 'rxjs';
import { fadeIn } from '../../../../core/animations/animations';

@Component({
  selector: 'app-pos',
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatIconModule, MatCardModule,
    MatBadgeModule, MatDividerModule, MatSnackBarModule, MatChipsModule,
    MatInputModule, MatFormFieldModule
  ],
  templateUrl: './pos.html',
  styleUrl: './pos.css',
  animations: [fadeIn],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class POS {
  private storeService = inject(StoreService);
  private snackBar = inject(MatSnackBar);

  private cashRegisterService = inject(CashRegisterService);

  products$: Observable<Product[]> = this.storeService.getProducts().pipe(
    map(products => products.filter(p => p.type !== 'CONSUMABLE'))
  );
  cart$: Observable<CartItem[]> = this.storeService.cart$;
  cartTotal$: Observable<number> = this.storeService.getCartTotal();
  isShiftOpen$ = this.cashRegisterService.currentShift$.pipe(map(s => s?.status === 'OPEN'));

  selectedCategory: ProductCategory | 'All' = 'All';
  categories: (ProductCategory | 'All')[] = ['All', 'Supplement', 'Drink', 'Merch', 'Fitness'];
  isProcessing = false;
  cartExpanded = false;

  toggleCart(): void {
    this.cartExpanded = !this.cartExpanded;
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

  async checkout(): Promise<void> {
    if (!this.cashRegisterService.isShiftOpen()) {
      this.snackBar.open('Register is closed. Please open a shift first.', 'Close', { duration: 3000 });
      return;
    }

    this.isProcessing = true;
    try {
      const transactionId = await this.storeService.checkout();
      this.snackBar.open(`Sale completed! Transaction: ${transactionId.slice(0, 8)}...`, 'Close', { duration: 4000 });
    } catch (error: any) {
      this.snackBar.open(error.message || 'Checkout failed', 'Close', { duration: 3000 });
    } finally {
      this.isProcessing = false;
    }
  }

  filterProducts(products: Product[]): Product[] {
    if (this.selectedCategory === 'All') return products;
    return products.filter(p => p.category === this.selectedCategory);
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
