import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CheckoutService } from '../../../../core/services/checkout.service';
import { ProductService } from '../../../../core/services/product.service';
import { CartStore } from '../../../../core/store/cart.store';
import { AuthService } from '../../../../core/services/auth.service';
import { CashRegisterService } from '../../../../core/services/cash-register.service';
import { MemberService } from '../../../../core/services/member.service';
import { BadgeService } from '../../../../core/services/badge.service';
import { BadgeDefinition } from '../../../../core/models/badge.model';
import { Product, CartItem, ProductCategory } from '../../../../core/models/store.model';
import { Observable, map, firstValueFrom, debounceTime, switchMap, of } from 'rxjs';
import { fadeIn } from '../../../../core/animations/animations';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CheckoutDialog, CheckoutDialogResult } from './checkout-dialog/checkout-dialog';
import { PriceOverrideDialog, PriceOverrideDialogResult } from './price-override-dialog/price-override-dialog';
import { getRandomCommendation } from '../../../../core/constants/commendations';

import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { ViewChild } from '@angular/core';

import { PreventDoubleClickDirective } from '../../../../shared/directives/prevent-double-click.directive';
import { ProductCatalogComponent } from '../product-catalog/product-catalog';

@Component({
  selector: 'app-pos',
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatIconModule, MatCardModule,
    MatBadgeModule, MatDividerModule, MatSnackBarModule, MatChipsModule,
    MatInputModule, MatFormFieldModule, MatDialogModule, MatAutocompleteModule,
    ReactiveFormsModule, MatStepperModule, PreventDoubleClickDirective, MatTooltipModule
  ],
  templateUrl: './pos.html',
  styleUrl: './pos.css',
  animations: [fadeIn],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class POS {
  @ViewChild('stepper') stepper!: MatStepper;

  private checkoutService = inject(CheckoutService);
  private productService = inject(ProductService);
  private cartStore = inject(CartStore);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private authService = inject(AuthService);
  private memberService = inject(MemberService);
  private cashRegisterService = inject(CashRegisterService);
  private badgeService = inject(BadgeService);

  badgeDefinitions = toSignal(this.badgeService.getBadges().pipe(
    map(badges => {
      const mapping: Record<string, BadgeDefinition> = {};
      badges.forEach(b => {
        mapping[b.id.toUpperCase()] = b;
      });
      return mapping;
    })
  ), { initialValue: {} as Record<string, BadgeDefinition> });

  products$: Observable<Product[]> = this.productService.getProducts().pipe(
    map(products => products.filter(p => p.type !== 'CONSUMABLE'))
  );
  cart$: Observable<CartItem[]> = toObservable(this.cartStore.items);
  cartTotal$: Observable<number> = toObservable(this.cartStore.total);
  isShiftOpen$ = this.cashRegisterService.currentShift$.pipe(map(s => s?.status === 'OPEN'));

  selectedCategory = signal<ProductCategory | 'All'>('All');
  categories: (ProductCategory | 'All')[] = ['All', 'Training', 'Supplements', 'Drinks', 'Boxing'];
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
    this.cartStore.addItem(product);
    this.snackBar.open(`${product.name} added to cart`, 'Close', { duration: 1500 });
  }

  updateQuantity(item: CartItem, change: number): void {
    if (!this.cashRegisterService.isShiftOpen()) {
      this.snackBar.open('Register is closed.', 'Close', { duration: 3000 });
      return;
    }
    const newQty = item.quantity + change;
    this.cartStore.updateQuantity(item.productId, newQty);
  }

  removeItem(productId: string): void {
    if (!this.cashRegisterService.isShiftOpen()) {
      this.snackBar.open('Register is closed.', 'Close', { duration: 3000 });
      return;
    }
    this.cartStore.removeItem(productId);
  }

  clearCart(): void {
    if (!this.cashRegisterService.isShiftOpen()) {
      this.snackBar.open('Register is closed.', 'Close', { duration: 3000 });
      return;
    }
    this.cartStore.clear();
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
      this.cartStore.updatePrice(item.productId, result.newPrice, result.reason);
      this.snackBar.open('Price updated', 'Close', { duration: 2000 });
    }
  }

  // Member Selection
  memberControl = new FormControl('');
  members$ = this.memberControl.valueChanges.pipe(
    debounceTime(300),
    switchMap(value => {
      const filterValue = typeof value === 'string' ? value : (value as any)?.name || '';
      if (!filterValue) return of([]);

      return this.memberService.getMembers().pipe(
        map(members => members.filter(m => m.name.toLowerCase().includes(filterValue.toLowerCase())))
      );
    })
  );
  selectedMember = signal<{ id: string | null; name: string; tags: string[] } | null>(null);

  selectMember(member: any): void {
    const tags = member.tags || [];
    this.selectedMember.set({ id: member.id, name: member.name, tags });
    this.cartStore.setMemberTags(tags);
  }

  clearMember(): void {
    this.selectedMember.set(null);
    this.memberControl.setValue('');
    this.cartStore.setMemberTags([]);
  }

  displayMember(member: any): string {
    if (!member) return '';
    return typeof member === 'string' ? member : member.name;
  }

  // Stepper Logic
  onMemberSelected(): void {
    // Optional: Auto-advance if a member is picked via autocomplete? 
    // For now, we'll let them click "Next" manually or call this if needed.
    // this.stepper.next(); 
  }

  skipMemberSelection(): void {
    this.clearMember();
    this.stepper.next();
  }

  resetStepper(): void {
    this.stepper.reset();
    this.clearCart();
    this.clearMember();
  }

  isCheckoutPending = false; // Sync flag to prevent double-click entry

  async checkout(): Promise<void> {
    if (this.isCheckoutPending || this.isProcessing()) return;

    if (!this.cashRegisterService.isShiftOpen()) {
      this.snackBar.open('Register is closed. Please open a shift first.', 'Close', { duration: 3000 });
      return;
    }

    const valid = await this.cashRegisterService.ensureValidShiftForTransaction();
    if (!valid) return;

    this.isCheckoutPending = true;

    try {
      const total = await firstValueFrom(this.cartTotal$);

      const dialogRef = this.dialog.open(CheckoutDialog, {
        width: '500px',
        data: { total: total }
      });

      const result = await firstValueFrom(dialogRef.afterClosed()) as CheckoutDialogResult;

      if (!result) {
        this.isCheckoutPending = false;
        return; // User cancelled
      }

      this.isProcessing.set(true);
      // isCheckoutPending stays true while processing

      const currentMember = this.selectedMember();
      const transactionId = await this.checkoutService.checkout(
        undefined,
        this.authService.userProfile()?.displayName || this.authService.userProfile()?.email || 'Unknown Staff',
        result.paymentMethod,
        result.referenceNumber,
        result.amountTendered,
        result.changeDue,
        currentMember?.id || null, // Pass memberId
        currentMember?.name || 'Walk-in' // Pass memberName
      );

      const commendation = getRandomCommendation('SALES');
      this.snackBar.open(`${commendation} (Tx: ${transactionId.slice(0, 8)})`, 'Close', { duration: 4000 });

      // Reset flow after sale
      this.resetStepper();
    } catch (error: any) {
      // BUG #6 FIX: Also suppress 'SILENT' for defensive robustness.
      // STALE_SHIFT: thrown when shift date != today (modal handles UX).
      // SILENT: thrown when shift is null in addCashTransaction (should never reach here via POS,
      //         but suppressed for safety against any race condition during app initialization).
      if (error.message === 'STALE_SHIFT' || error.message === 'SILENT') return;
      this.snackBar.open(error.message || 'Checkout failed', 'Close', { duration: 3000 });
    } finally {
      this.isProcessing.set(false);
      this.isCheckoutPending = false;
    }
  }

  filterProducts(products: Product[]): Product[] {
    const category = this.selectedCategory();
    if (category === 'All') return products;
    return products.filter(p => p.category === category);
  }

  getCategoryIcon(category: ProductCategory): string {
    const icons: Record<ProductCategory, string> = {
      'Supplements': 'medication',
      'Drinks': 'local_drink',
      'Boxing': 'sports_mma',
      'Training': 'sports_martial_arts'
    };
    return icons[category] || 'inventory_2';
  }

  openCatalog(): void {
    this.dialog.open(ProductCatalogComponent, {
      maxWidth: '100vw',
      width: '100vw',
      height: '100vh',
      hasBackdrop: false,
      panelClass: 'full-screen-modal',
      autoFocus: false
    });
  }

  trackProduct(index: number, product: Product): string {
    return product.id || index.toString();
  }
}
