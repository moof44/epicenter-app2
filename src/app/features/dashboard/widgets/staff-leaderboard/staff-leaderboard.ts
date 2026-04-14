import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TransactionService } from '../../../../core/services/transaction.service';
import { DashboardCacheService } from '../../services/dashboard-cache.service';

interface StaffRank {
    staffName: string;
    totalSales: number;
    transactionCount: number;
}

@Component({
    selector: 'app-staff-leaderboard',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    templateUrl: './staff-leaderboard.html',
    styleUrl: './staff-leaderboard.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffLeaderboardWidget {
    private transactionService = inject(TransactionService);
    private cacheService = inject(DashboardCacheService);
    private router = inject(Router);

    rankings = signal<StaffRank[]>([]);
    isLoading = signal(true);

    spotlight = computed(() => this.rankings()[0] ?? null);
    displayRankings = computed(() => this.rankings().slice(0, 5));
    isEmpty = computed(() => this.rankings().length === 0 && !this.isLoading());

    constructor() {
        this.loadData();
    }

    private async loadData(): Promise<void> {
        const cached = this.cacheService.get<StaffRank[]>('staffLeaderboard');
        if (cached) {
            this.rankings.set(cached);
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

            const staffMap = new Map<string, StaffRank>();

            transactions
                .filter(tx => tx.status !== 'VOID' && tx.staffName)
                .forEach(tx => {
                    const name = tx.staffName!;
                    const entry = staffMap.get(name) || { staffName: name, totalSales: 0, transactionCount: 0 };
                    entry.totalSales += tx.totalAmount;
                    entry.transactionCount += 1;
                    staffMap.set(name, entry);
                });

            const sorted = Array.from(staffMap.values())
                .filter(s => s.totalSales > 0)
                .sort((a, b) => b.totalSales - a.totalSales);

            this.rankings.set(sorted);
            this.cacheService.set('staffLeaderboard', sorted);
        } catch (err) {
            console.error('Failed to load staff leaderboard:', err);
        } finally {
            this.isLoading.set(false);
        }
    }

    getRankIcon(index: number): string {
        if (index === 0) return '🥇';
        if (index === 1) return '🥈';
        if (index === 2) return '🥉';
        return `${index + 1}`;
    }

    navigateToSalesByUser(): void {
        this.router.navigate(['/store/sales-by-user']);
    }
}
