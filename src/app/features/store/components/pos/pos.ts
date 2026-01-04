import { Component, inject } from '@angular/core';
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
import { Product, CartItem, ProductCategory } from '../../../../core/models/store.model';
import { Observable } from 'rxjs';
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
  animations: [fadeIn]
})
export class POS {
  private storeService = inject(StoreService);
  private snackBar = inject(MatSnackBar);

  products$: Observable<Product[]> = this.storeService.getProducts();
  cart$: Observable<CartItem[]> = this.storeService.cart$;
  cartTotal$: Observable<number> = this.storeService.getCartTotal();

  selectedCategory: ProductCategory | 'All' = 'All';
  categories: (ProductCategory | 'All')[] = ['All', 'Supplement', 'Drink', 'Merch'];
  isProcessing = false;


  addToCart(product: Product): void {
    if (product.stock <= 0) {
      this.snackBar.open('Product out of stock', 'Close', { duration: 2000 });
      return;
    }
    this.storeService.addToCart(product);
    this.snackBar.open(`${product.name} added to cart`, 'Close', { duration: 1500 });
  }

  updateQuantity(item: CartItem, change: number): void {
    const newQty = item.quantity + change;
    this.storeService.updateCartItemQuantity(item.productId, newQty);
  }

  removeItem(productId: string): void {
    this.storeService.removeFromCart(productId);
  }

  clearCart(): void {
    this.storeService.clearCart();
  }

  async checkout(): Promise<void> {
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
      'Merch': 'checkroom'
    };
    return icons[category];
  }
}
