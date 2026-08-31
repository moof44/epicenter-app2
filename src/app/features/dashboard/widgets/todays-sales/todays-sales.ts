import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { TransactionService } from '../../../../core/services/transaction.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
    selector: 'app-todays-sales',
    standalone: true,
    imports: [CommonModule, MatCardModule, MatIconModule],
    templateUrl: './todays-sales.html',
    styleUrl: './todays-sales.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodaysSalesWidget {
    private transactionService = inject(TransactionService);
    private authService = inject(AuthService);
    private router = inject(Router);

    todayTotal = signal(0);
    yesterdayTotal = signal(0);
    todayCount = signal(0);
    isLoading = signal(true);

    averageTicket = computed(() =>
        this.todayCount() > 1 ? this.todayTotal() / this.todayCount() : 0
    );

    comparisonPct = computed(() => {
        const yesterday = this.yesterdayTotal();
        if (yesterday <= 0) return null;
        return ((this.todayTotal() - yesterday) / yesterday) * 100;
    });

    comparisonDirection = computed(() => {
        const today = this.todayTotal();
        const yesterday = this.yesterdayTotal();
        if (today > yesterday) return 'up';
        if (today < yesterday) return 'down';
        return 'same';
    });

    isEmpty = computed(() => this.todayTotal() === 0 && !this.isLoading());
    showAverage = computed(() => this.todayCount() > 1);

    motivationMessage = computed(() => {
        const total = this.todayTotal();
        if (total === 0) return 'You have not made a sale yet today! Offer arriving members cold drinks, energy boosters, or day passes.';
        if (total < 1500) return '🔥 You unlocked your first sales today! Keep offering supplements & cold drinks!';
        if (total < 4000) return '⚡ Great hustle today! Keep offering merch & package renewals to incoming members!';
        return '🚀 Outstanding personal sales today! You are crushing your shift targets!';
    });

    comparisonText = computed(() => {
        const today = this.todayTotal();
        const yesterday = this.yesterdayTotal();
        const pct = this.comparisonPct();

        if (today === 0 && yesterday === 0) return '';
        if (today === 0 && yesterday > 0) return 'Your first sale will show here';
        if (yesterday === 0 && today > 0) return 'Great start today';
        if (pct === null) return '';
        if (today === yesterday) return 'Same as yesterday';

        const absPct = Math.abs(pct).toFixed(0);
        return today > yesterday
            ? `↑ ${absPct}% from yesterday`
            : `↓ ${absPct}% from yesterday`;
    });

    constructor() {
        this.loadData();
    }

    private async loadData(): Promise<void> {
        const uid = this.authService.userProfile()?.uid;
        if (!uid) {
            this.isLoading.set(false);
            return;
        }

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        const yesterday = new Date(startOfToday);
        yesterday.setDate(yesterday.getDate() - 1);
        const endOfYesterday = new Date(yesterday);
        endOfYesterday.setHours(23, 59, 59);

        try {
            const [todayTotal, yesterdayTotal] = await Promise.all([
                this.transactionService.getSalesTotal({ startDate: startOfToday, endDate: endOfToday, staffId: uid }),
                this.transactionService.getSalesTotal({ startDate: yesterday, endDate: endOfYesterday, staffId: uid }),
            ]);

            this.todayTotal.set(todayTotal || 0);
            this.yesterdayTotal.set(yesterdayTotal || 0);
        } catch (err) {
            console.error('Failed to load today\'s sales:', err);
        } finally {
            this.isLoading.set(false);
        }
    }

    navigateToHistory(): void {
        this.router.navigate(['/store/history']);
    }

    navigateToPos(): void {
        this.router.navigate(['/store/pos']);
    }
}
