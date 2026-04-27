import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TransactionService } from '../../../../core/services/transaction.service';
import { DashboardCacheService } from '../../services/dashboard-cache.service';
import { Transaction } from '../../../../core/models/store.model';

interface VoidDisplay {
    id: string;
    amount: number;
    voidedBy: string;
    reason: string;
    date: Date;
}

@Component({
    selector: 'app-recent-voids',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    templateUrl: './recent-voids.html',
    styleUrl: './recent-voids.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentVoidsWidget {
    private transactionService = inject(TransactionService);
    private cacheService = inject(DashboardCacheService);
    private router = inject(Router);

    voids = signal<VoidDisplay[]>([]);
    isLoading = signal(true);

    isEmpty = computed(() => this.voids().length === 0 && !this.isLoading());
    isClean = computed(() => this.voids().length === 0 && !this.isLoading());

    constructor() {
        this.loadData();
    }

    private async loadData(): Promise<void> {
        const cached = this.cacheService.get<VoidDisplay[]>('recentVoids');
        if (cached) {
            this.voids.set(cached);
            this.isLoading.set(false);
            return;
        }

        try {
            // Get recent transactions and filter for VOID client-side
            // (Firestore can't efficiently query status == 'VOID' with orderBy date without composite index)
            const transactions = await firstValueFrom(
                this.transactionService.getTransactions({ limit: 50 })
            );

            const voided = transactions
                .filter(tx => tx.status === 'VOID')
                .slice(0, 5)
                .map(tx => ({
                    id: tx.id || '',
                    amount: tx.totalAmount,
                    voidedBy: tx.voidedBy || 'Unknown',
                    reason: tx.voidReason || 'No reason provided',
                    date: tx.voidedAt instanceof Date ? tx.voidedAt : new Date(),
                }));

            this.voids.set(voided);
            this.cacheService.set('recentVoids', voided);
        } catch (err) {
            console.error('Failed to load recent voids:', err);
        } finally {
            this.isLoading.set(false);
        }
    }

    getRelativeTime(date: Date): string {
        const diff = Date.now() - date.getTime();
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    navigateToHistory(): void {
        this.router.navigate(['/store/history']);
    }
}
