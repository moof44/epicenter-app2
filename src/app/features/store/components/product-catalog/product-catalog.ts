import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogRef } from '@angular/material/dialog';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { StoreService } from '../../../../core/services/store.service';
import { Product, ProductCategory } from '../../../../core/models/store.model';
import { MatSnackBar } from '@angular/material/snack-bar';

type ViewMode = 'CATEGORIES' | 'PRODUCT_LIST' | 'PRODUCT_DETAIL';

@Component({
    selector: 'app-product-catalog',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatIconModule],
    templateUrl: './product-catalog.html',
    styleUrl: './product-catalog.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: [
        trigger('fadeInOut', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('300ms ease-out', style({ opacity: 1 }))
            ]),
            transition(':leave', [
                animate('200ms ease-in', style({ opacity: 0 }))
            ])
        ]),
        trigger('staggerList', [
            transition('* => *', [
                query(':enter', [
                    style({ opacity: 0, transform: 'translateY(20px)' }),
                    stagger(50, [
                        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
                    ])
                ], { optional: true })
            ])
        ])
    ]
})
export class ProductCatalogComponent {
    private dialogRef = inject(MatDialogRef<ProductCatalogComponent>);
    private storeService = inject(StoreService);
    private snackBar = inject(MatSnackBar);

    // State
    viewMode = signal<ViewMode>('CATEGORIES');
    selectedCategory = signal<ProductCategory | 'All' | null>(null);
    selectedProduct = signal<Product | null>(null);

    // Data
    products$ = this.storeService.getProducts();
    products = toSignal(this.products$, { initialValue: [] as Product[] });

    // Computed
    filteredProducts = computed(() => {
        const allProducts = this.products();
        const category = this.selectedCategory();

        if (!category || category === 'All') {
            return allProducts;
        }
        return allProducts.filter(p => p.category === category);
    });

    categories: { id: ProductCategory | 'All', label: string, image: string }[] = [
        { id: 'All', label: 'All Items', image: 'assets/images/catalog/main.png' },
        { id: 'Training', label: 'Training', image: 'assets/images/catalog/training.png' },
        { id: 'Supplements', label: 'Supplements', image: 'assets/images/catalog/supplements.png' },
        { id: 'Drinks', label: 'Drinks', image: 'assets/images/catalog/drinks.png' },
        { id: 'Boxing', label: 'Boxing', image: 'assets/images/catalog/boxing.png' }
    ];

    constructor() { }

    close() {
        this.dialogRef.close();
    }

    selectCategory(category: ProductCategory | 'All') {
        this.selectedCategory.set(category);
        this.viewMode.set('PRODUCT_LIST');
    }

    selectProduct(product: Product) {
        this.selectedProduct.set(product);
        this.viewMode.set('PRODUCT_DETAIL');
    }

    goBack() {
        if (this.viewMode() === 'PRODUCT_DETAIL') {
            this.viewMode.set('PRODUCT_LIST');
            this.selectedProduct.set(null);
        } else if (this.viewMode() === 'PRODUCT_LIST') {
            this.viewMode.set('CATEGORIES');
            this.selectedCategory.set(null);
        }
    }

    addToOrder(product: Product) {
        this.storeService.addToCart(product);
        this.snackBar.open(`${product.name} added to cart`, 'Close', { duration: 2000 });
        this.dialogRef.close(true); // Return true to indicate purchase/action
    }

    getBackgroundImage(): string {
        const mode = this.viewMode();
        if (mode === 'CATEGORIES') return 'url(assets/images/catalog/main.png)';

        const category = this.selectedCategory();
        if (category && category !== 'All') {
            return `url(assets/images/catalog/${category.toLowerCase()}.png)`;
        }
        return 'url(assets/images/catalog/main.png)';
    }
}
