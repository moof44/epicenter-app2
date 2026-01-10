import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { toSignal } from '@angular/core/rxjs-interop';
import { StoreService } from '../../services/store.service';
import { SettingsService } from '../../services/settings.service';
import { AuthService } from '../../services/auth.service';
import { map } from 'rxjs/operators';

@Component({
    selector: 'app-quota-status-widget',
    standalone: true,
    imports: [CommonModule, MatIconModule, MatTooltipModule],
    templateUrl: './quota-status-widget.html',
    styleUrl: './quota-status-widget.css'
})
export class QuotaStatusWidget {
    private storeService = inject(StoreService);
    private settingsService = inject(SettingsService);
    private authService = inject(AuthService);

    analytics$ = this.storeService.getSalesAnalytics();
    settings$ = this.settingsService.getSettings();

    analytics = toSignal(this.analytics$, {
        initialValue: {
            monthlyRevenue: 0,
            todayRevenue: 0,
            totalRevenue: 0,
            topSelling: [],
            lowPerformance: []
        }
    });
    settings = toSignal(this.settings$, { initialValue: { monthlyQuota: 0 } });

    monthlyQuota = computed(() => this.settings().monthlyQuota || 0);
    monthlyRevenue = computed(() => this.analytics().monthlyRevenue || 0);
    todayRevenue = computed(() => this.analytics()?.todayRevenue || 0);

    // Visibility Logic
    isWidgetVisible = computed(() => {
        const user = this.authService.userProfile();
        const roles = user?.roles || [];
        // Visible to everyone with a role basically
        const allowed = ['ADMIN', 'MANAGER', 'TRAINER', 'STAFF'];
        return roles.some(r => allowed.includes(r));
    });

    isMonthlyVisible = computed(() => {
        const user = this.authService.userProfile();
        const roles = user?.roles || [];
        // Hidden for STAFF, visible to others
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
        // Logic: If we are at day 10, there are 10..LastDay days remaining locally (inclusive)
        // Actually, simpler logic: Remaining amount / Remaining days (including today)
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
        // Start of month or target met
        if (target <= 0) return 'green';

        // NOTE: This logic compares "Sales Today" vs "Required Daily Average"
        const percentage = (current / target) * 100;
        if (percentage >= 100) return 'green';
        if (percentage >= 75) return 'yellow';
        if (percentage >= 50) return 'orange';
        return 'red'; // Default to red if low
    });

    getStatusColor(status: string): string {
        switch (status) {
            case 'green': return '#4caf50'; // Green
            case 'yellow': return '#ffeb3b'; // Yellow
            case 'orange': return '#ff9800'; // Orange
            case 'red': return '#f44336'; // Red
            default: return '#e0e0e0';
        }
    }

    getBgColor(status: string): string {
        switch (status) {
            case 'green': return '#e8f5e9';
            case 'yellow': return '#fffde7'; // Light Yellow
            case 'orange': return '#fff3e0';
            case 'red': return '#ffebee';
            default: return '#f5f5f5';
        }
    }
}
