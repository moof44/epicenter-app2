import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { TransactionService } from '../../../../core/services/transaction.service';
import { AuthService } from '../../../../core/services/auth.service';
import { DashboardCacheService } from '../../services/dashboard-cache.service';

function getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

@Component({
    selector: 'app-week-trend',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    templateUrl: './week-trend.html',
    styleUrl: './week-trend.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekTrendWidget {
    private transactionService = inject(TransactionService);
    private authService = inject(AuthService);
    private cacheService = inject(DashboardCacheService);
    private router = inject(Router);

    thisWeekTotal = signal(0);
    lastWeekTotal = signal(0);
    isLoading = signal(true);

    direction = computed(() => {
        if (this.thisWeekTotal() > this.lastWeekTotal()) return 'up';
        if (this.thisWeekTotal() < this.lastWeekTotal()) return 'down';
        return 'flat';
    });

    percentageChange = computed(() => {
        const last = this.lastWeekTotal();
        if (last <= 0) return null;
        return ((this.thisWeekTotal() - last) / last) * 100;
    });

    dayOfWeek = computed(() => {
        const d = new Date().getDay();
        return d === 0 ? 7 : d; // 1=Mon ... 7=Sun
    });

    isEarlyWeek = computed(() => this.dayOfWeek() <= 2);
    daysLeftInWeek = computed(() => 7 - this.dayOfWeek());
    isEmpty = computed(() => this.thisWeekTotal() === 0 && this.lastWeekTotal() === 0 && !this.isLoading());

    comparisonText = computed(() => {
        if (this.isEarlyWeek()) return `Week just started — ₱${this.thisWeekTotal().toLocaleString()} so far`;
        const pct = this.percentageChange();
        if (pct === null) return '';
        const absPct = Math.abs(pct).toFixed(0);
        if (this.direction() === 'up') return `${absPct}% more than last week`;
        if (this.direction() === 'down') return `${absPct}% less — ${this.daysLeftInWeek()} days left this week`;
        return 'Same pace as last week';
    });

    trendIcon = computed(() => {
        if (this.direction() === 'up') return 'trending_up';
        if (this.direction() === 'down') return 'trending_down';
        return 'trending_flat';
    });

    constructor() {
        this.loadData();
    }

    private async loadData(): Promise<void> {
        const cached = this.cacheService.get<{ thisWeek: number; lastWeek: number }>('weekTrend');
        if (cached) {
            this.thisWeekTotal.set(cached.thisWeek);
            this.lastWeekTotal.set(cached.lastWeek);
            this.isLoading.set(false);
            return;
        }

        const uid = this.authService.userProfile()?.uid;
        if (!uid) { this.isLoading.set(false); return; }

        const now = new Date();
        const startOfThisWeek = getStartOfWeek(now);
        const startOfLastWeek = getStartOfWeek(new Date(startOfThisWeek.getTime() - 1));
        const endOfLastWeek = new Date(startOfThisWeek.getTime() - 1);
        endOfLastWeek.setHours(23, 59, 59, 999);

        try {
            const [thisWeek, lastWeek] = await Promise.all([
                this.transactionService.getSalesTotal({ startDate: startOfThisWeek, endDate: now, staffId: uid }),
                this.transactionService.getSalesTotal({ startDate: startOfLastWeek, endDate: endOfLastWeek, staffId: uid }),
            ]);
            this.thisWeekTotal.set(thisWeek || 0);
            this.lastWeekTotal.set(lastWeek || 0);
            this.cacheService.set('weekTrend', { thisWeek: thisWeek || 0, lastWeek: lastWeek || 0 });
        } catch (err) {
            console.error('Failed to load week trend:', err);
        } finally {
            this.isLoading.set(false);
        }
    }

    navigateToHistory(): void {
        this.router.navigate(['/store/history']);
    }
}
