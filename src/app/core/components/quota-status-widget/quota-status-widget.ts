import { Component, inject, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, interval, filter, switchMap, map } from 'rxjs';
import { SettingsService } from '../../services/settings.service';
import { AuthService } from '../../services/auth.service';
import { ReportStateService } from '../../services/report.state.service';

@Component({
    selector: 'app-quota-status-widget',
    standalone: true,
    imports: [CommonModule, MatIconModule, MatTooltipModule],
    templateUrl: './quota-status-widget.html',
    styleUrl: './quota-status-widget.css'
})
export class QuotaStatusWidget {
    private settingsService = inject(SettingsService);
    private authService = inject(AuthService);
    private reportStateService = inject(ReportStateService);
    private destroyRef = inject(DestroyRef);

    // BUG 8 fix: Drive report from a BehaviorSubject so midnight rollover can re-trigger
    private currentDate$ = new BehaviorSubject<Date>(new Date());

    report$ = this.currentDate$.pipe(
        switchMap(date => this.reportStateService.getMonthlyReport(date.getFullYear(), date.getMonth()))
    );
    settings$ = this.settingsService.getSettings();

    report = toSignal(this.report$, { initialValue: { days: [], total: 0 } });
    settings = toSignal(this.settings$, { initialValue: { monthlyQuota: 0 } });

    // BUG 7 fix: Track when real data has loaded to avoid false red flash
    isReportLoaded = toSignal(this.report$.pipe(map(() => true)), { initialValue: false });

    monthlyQuota = computed(() => this.settings().monthlyQuota || 0);
    monthlyRevenue = computed(() => this.report().total || 0);
    todayRevenue = computed(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const localTodayStr = `${year}-${month}-${day}`;

        const days = this.report().days || [];
        const todayItem = days.find(d => {
            try {
                return d.date.toISOString().split('T')[0] === localTodayStr;
            } catch {
                return false;
            }
        });
        return todayItem ? todayItem.totalSales : 0;
    });

    // Visibility Logic
    isWidgetVisible = computed(() => {
        const user = this.authService.userProfile();
        const roles = user?.roles || [];
        const allowed = ['ADMIN', 'MANAGER', 'TRAINER', 'STAFF'];
        return roles.some(r => allowed.includes(r));
    });

    isMonthlyVisible = computed(() => {
        const user = this.authService.userProfile();
        const roles = user?.roles || [];
        const allowed = ['ADMIN', 'MANAGER', 'TRAINER'];
        return roles.some(r => allowed.includes(r));
    });

    // Daily Quota Calculation
    dailyTarget = computed(() => {
        const quota = this.monthlyQuota();
        const current = this.monthlyRevenue();

        if (quota === 0) return 0;

        const remainingQuota = Math.max(quota - current, 0);
        const now = new Date();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const remainingDays = lastDay - now.getDate() + 1;

        return remainingDays > 0 ? remainingQuota / remainingDays : 0;
    });

    // Monthly Progress Color Logic
    monthlyStatus = computed(() => {
        const quota = this.monthlyQuota();
        const current = this.monthlyRevenue();
        if (quota === 0) return 'neutral';

        const percentage = (current / quota) * 100;
        if (percentage >= 100) return 'green';
        if (percentage >= 75) return 'yellow';
        if (percentage >= 50) return 'orange';
        return 'red';
    });

    // Daily Progress Color Logic
    dailyStatus = computed(() => {
        const target = this.dailyTarget();
        const current = this.todayRevenue();
        if (target <= 0) return 'green';

        const percentage = (current / target) * 100;
        if (percentage >= 100) return 'green';
        if (percentage >= 75) return 'yellow';
        if (percentage >= 50) return 'orange';
        return 'red';
    });

    constructor() {
        // BUG 8 fix: Check every 60s if the day/month has changed
        interval(60_000).pipe(
            filter(() => {
                const now = new Date();
                const current = this.currentDate$.getValue();
                return now.getDate() !== current.getDate()
                    || now.getMonth() !== current.getMonth();
            }),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(() => {
            this.currentDate$.next(new Date());
        });
    }

    getStatusColor(status: string): string {
        switch (status) {
            case 'green': return '#4caf50';
            case 'yellow': return '#ffeb3b';
            case 'orange': return '#ff9800';
            case 'red': return '#f44336';
            default: return '#e0e0e0';
        }
    }

    getBgColor(status: string): string {
        switch (status) {
            case 'green': return '#e8f5e9';
            case 'yellow': return '#fffde7';
            case 'orange': return '#fff3e0';
            case 'red': return '#ffebee';
            default: return '#f5f5f5';
        }
    }
}
