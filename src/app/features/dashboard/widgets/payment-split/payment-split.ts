import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TransactionService } from '../../../../core/services/transaction.service';
import { AuthService } from '../../../../core/services/auth.service';
import { DashboardCacheService } from '../../services/dashboard-cache.service';

@Component({
    selector: 'app-payment-split',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    templateUrl: './payment-split.html',
    styleUrl: './payment-split.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentSplitWidget {
    private transactionService = inject(TransactionService);
    private authService = inject(AuthService);
    private cacheService = inject(DashboardCacheService);
    private router = inject(Router);

    cashTotal = signal(0);
    gcashTotal = signal(0);
    isLoading = signal(true);

    total = computed(() => this.cashTotal() + this.gcashTotal());
    cashPct = computed(() => this.total() > 0 ? (this.cashTotal() / this.total()) * 100 : 0);
    gcashPct = computed(() => this.total() > 0 ? (this.gcashTotal() / this.total()) * 100 : 0);
    isEmpty = computed(() => this.total() === 0 && !this.isLoading());

    constructor() {
        this.loadData();
    }

    private async loadData(): Promise<void> {
        const cached = this.cacheService.get<{ cash: number; gcash: number }>('paymentSplit');
        if (cached) {
            this.cashTotal.set(cached.cash);
            this.gcashTotal.set(cached.gcash);
            this.isLoading.set(false);
            return;
        }

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        try {
            const transactions = await firstValueFrom(
                this.transactionService.getTransactions({
                    startDate: startOfToday,
                    endDate: endOfToday,
                    limit: 100,
                })
            );

            let cash = 0;
            let gcash = 0;
            transactions
                .filter(tx => tx.status !== 'VOID')
                .forEach(tx => {
                    if (tx.paymentMethod === 'GCASH') {
                        gcash += tx.totalAmount;
                    } else if (tx.paymentMethod === 'SPLIT') {
                        const cashPart = tx.cashAmount !== undefined && tx.cashAmount !== null ? Number(tx.cashAmount) : 0;
                        const gcashPart = tx.gcashAmount !== undefined && tx.gcashAmount !== null ? Number(tx.gcashAmount) : (tx.totalAmount - cashPart);
                        cash += cashPart;
                        gcash += gcashPart;
                    } else {
                        cash += tx.totalAmount;
                    }
                });

            this.cashTotal.set(cash);
            this.gcashTotal.set(gcash);
            this.cacheService.set('paymentSplit', { cash, gcash });
        } catch (err) {
            console.error('Failed to load payment split:', err);
        } finally {
            this.isLoading.set(false);
        }
    }

    navigateToReports(): void {
        this.router.navigate([this.authService.hasAnyRole(['ADMIN']) ? '/reports' : '/store/history']);
    }
}
