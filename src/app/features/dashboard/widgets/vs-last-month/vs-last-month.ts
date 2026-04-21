import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { TransactionService } from '../../../../core/services/transaction.service';
import { AuthService } from '../../../../core/services/auth.service';
import { DashboardCacheService } from '../../services/dashboard-cache.service';

@Component({
    selector: 'app-vs-last-month',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    templateUrl: './vs-last-month.html',
    styleUrl: './vs-last-month.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VsLastMonthWidget {
    private transactionService = inject(TransactionService);
    private authService = inject(AuthService);
    private cacheService = inject(DashboardCacheService);
    private router = inject(Router);

    currentMonthTotal = signal(0);
    lastMonthTotal = signal(0);
    isLoading = signal(true);

    difference = computed(() => this.currentMonthTotal() - this.lastMonthTotal());

    direction = computed(() => {
        if (this.currentMonthTotal() > this.lastMonthTotal()) return 'ahead';
        if (this.currentMonthTotal() < this.lastMonthTotal()) return 'behind';
        return 'same';
    });

    percentageChange = computed(() => {
        const last = this.lastMonthTotal();
        if (last <= 0) return null;
        return ((this.currentMonthTotal() - last) / last) * 100;
    });

    daysElapsed = computed(() => new Date().getDate());
    daysInMonth = computed(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    });
    daysLeft = computed(() => this.daysInMonth() - this.daysElapsed());

    paceProjection = computed(() => {
        const elapsed = this.daysElapsed();
        if (elapsed < 5) return null;
        return (this.currentMonthTotal() / elapsed) * this.daysInMonth();
    });

    isEmpty = computed(() => this.currentMonthTotal() === 0 && this.lastMonthTotal() === 0 && !this.isLoading());

    primaryText = computed(() => {
        const current = this.currentMonthTotal();
        const last = this.lastMonthTotal();
        const diff = Math.abs(this.difference());
        const diffStr = `₱${diff.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        if (current === 0 && last === 0) return '';
        if (current === 0 && last > 0) return 'Your first sale this month will show here';
        if (last === 0 && current > 0) return 'Great start to the month';
        if (current > last) return `You're ${diffStr} ahead of last month`;
        if (current < last) return `${diffStr} behind — ${this.daysLeft()} days to catch up`;
        return 'Right on pace with last month';
    });

    trendIcon = computed(() => {
        if (this.direction() === 'ahead') return 'trending_up';
        if (this.direction() === 'behind') return 'trending_down';
        return 'trending_flat';
    });

    constructor() {
        this.loadData();
    }

    private async loadData(): Promise<void> {
        const cached = this.cacheService.get<{ current: number; last: number }>('vsLastMonth');
        if (cached) {
            this.currentMonthTotal.set(cached.current);
            this.lastMonthTotal.set(cached.last);
            this.isLoading.set(false);
            return;
        }

        const uid = this.authService.userProfile()?.uid;
        if (!uid) { this.isLoading.set(false); return; }

        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        try {
            const [current, last] = await Promise.all([
                this.transactionService.getSalesTotal({ startDate: startOfThisMonth, endDate: now, staffId: uid }),
                this.transactionService.getSalesTotal({ startDate: startOfLastMonth, endDate: endOfLastMonth, staffId: uid }),
            ]);
            this.currentMonthTotal.set(current || 0);
            this.lastMonthTotal.set(last || 0);
            this.cacheService.set('vsLastMonth', { current: current || 0, last: last || 0 });
        } catch (err) {
            console.error('Failed to load month comparison:', err);
        } finally {
            this.isLoading.set(false);
        }
    }

    navigateToMonthlySales(): void {
        if (this.authService.hasAnyRole(['ADMIN'])) {
            this.router.navigate(['/store/monthly-sales']);
        } else {
            this.router.navigate(['/store/history']);
        }
    }
}
