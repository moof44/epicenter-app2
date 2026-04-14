import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TransactionService } from '../../../../core/services/transaction.service';
import { AuthService } from '../../../../core/services/auth.service';
import { DashboardCacheService } from '../../services/dashboard-cache.service';

interface TopProductData {
    name: string;
    quantity: number;
    revenue: number;
}

@Component({
    selector: 'app-top-product',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    templateUrl: './top-product.html',
    styleUrl: './top-product.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopProductWidget {
    private transactionService = inject(TransactionService);
    private authService = inject(AuthService);
    private cacheService = inject(DashboardCacheService);
    private router = inject(Router);

    topProduct = signal<TopProductData | null>(null);
    runnerUp = signal<TopProductData | null>(null);
    isLoading = signal(true);

    isEmpty = computed(() => this.topProduct() === null && !this.isLoading());

    constructor() {
        this.loadData();
    }

    private async loadData(): Promise<void> {
        const cached = this.cacheService.get<{ top: TopProductData | null; runnerUp: TopProductData | null }>('topProduct');
        if (cached) {
            this.topProduct.set(cached.top);
            this.runnerUp.set(cached.runnerUp);
            this.isLoading.set(false);
            return;
        }

        const uid = this.authService.userProfile()?.uid;
        if (!uid) { this.isLoading.set(false); return; }

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        try {
            const transactions = await firstValueFrom(
                this.transactionService.getTransactions({
                    startDate: startOfMonth,
                    endDate: now,
                    staffId: uid,
                    limit: 30,
                })
            );

            const productMap = new Map<string, TopProductData>();
            transactions
                .filter(tx => tx.status !== 'VOID')
                .forEach(tx => {
                    tx.items.forEach(item => {
                        const entry = productMap.get(item.productId) || { name: item.productName, quantity: 0, revenue: 0 };
                        entry.quantity += item.quantity;
                        entry.revenue += item.subtotal;
                        productMap.set(item.productId, entry);
                    });
                });

            const sorted = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity);
            const top = sorted[0] || null;
            const runner = sorted[1] || null;

            this.topProduct.set(top);
            this.runnerUp.set(runner);
            this.cacheService.set('topProduct', { top, runnerUp: runner });
        } catch (err) {
            console.error('Failed to load top product:', err);
        } finally {
            this.isLoading.set(false);
        }
    }

    navigateToStats(): void {
        if (this.authService.hasAnyRole(['ADMIN'])) {
            this.router.navigate(['/store/stats']);
        } else {
            this.router.navigate(['/store/history']);
        }
    }
}
