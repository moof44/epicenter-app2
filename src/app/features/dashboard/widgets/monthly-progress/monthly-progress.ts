import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ReportStateService } from '../../../../core/services/report.state.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { TransactionService } from '../../../../core/services/transaction.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
    selector: 'app-monthly-progress',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    templateUrl: './monthly-progress.html',
    styleUrl: './monthly-progress.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthlyProgressWidget {
    private reportStateService = inject(ReportStateService);
    private settingsService = inject(SettingsService);
    private transactionService = inject(TransactionService);
    private authService = inject(AuthService);
    private router = inject(Router);

    staffTotal = signal(0);
    isLoading = signal(true);

    private now = new Date();
    private year = this.now.getFullYear();
    private month = this.now.getMonth();

    // Gym total from existing cache
    private report = toSignal(
        this.reportStateService.getMonthlyReport(this.year, this.month).pipe(map(r => r.total)),
        { initialValue: 0 }
    );

    // Quota from existing cache
    private settings = toSignal(
        this.settingsService.getSettings().pipe(map(s => s.monthlyQuota || 0)),
        { initialValue: 0 }
    );

    gymTotal = computed(() => this.report());
    quota = computed(() => this.settings());

    gymProgress = computed(() => {
        const q = this.quota();
        return q > 0 ? Math.min((this.gymTotal() / q) * 100, 100) : 0;
    });

    staffContributionPct = computed(() => {
        const gym = this.gymTotal();
        return gym > 0 ? (this.staffTotal() / gym) * 100 : 0;
    });

    remainingDays = computed(() => {
        const lastDay = new Date(this.year, this.month + 1, 0).getDate();
        return lastDay - this.now.getDate() + 1;
    });

    dailyTarget = computed(() => {
        const remaining = Math.max(this.quota() - this.gymTotal(), 0);
        const days = this.remainingDays();
        return days > 0 ? remaining / days : 0;
    });

    isQuotaMet = computed(() => this.gymProgress() >= 100);
    isQuotaConfigured = computed(() => this.quota() > 0);

    ringColor = computed(() => {
        const pct = this.gymProgress();
        if (this.quota() === 0) return '#e0e0e0';
        if (pct >= 100) return '#4caf50';
        if (pct >= 75) return '#ffeb3b';
        if (pct >= 50) return '#ff9800';
        return '#f44336';
    });

    // SVG ring calculations (circumference for a circle with r=60)
    readonly circumference = 2 * Math.PI * 60;
    ringOffset = computed(() => {
        const pct = Math.min(this.gymProgress(), 100);
        return this.circumference - (pct / 100) * this.circumference;
    });

    constructor() {
        this.loadStaffTotal();
    }

    private async loadStaffTotal(): Promise<void> {
        const uid = this.authService.userProfile()?.uid;
        if (!uid) {
            this.isLoading.set(false);
            return;
        }

        const startOfMonth = new Date(this.year, this.month, 1);
        const now = new Date();

        try {
            const total = await this.transactionService.getSalesTotal({
                startDate: startOfMonth,
                endDate: now,
                staffId: uid,
            });
            this.staffTotal.set(total || 0);
        } catch (err) {
            console.error('Failed to load staff monthly total:', err);
        } finally {
            this.isLoading.set(false);
        }
    }

    navigateToMonthlySales(): void {
        this.router.navigate(['/store/monthly-sales']);
    }
}
