import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ReportStateService } from '../../../../core/services/report.state.service';
import { AuthService } from '../../../../core/services/auth.service';
import { toLocalDateStr } from '../../../../core/utils/date.utils';

@Component({
    selector: 'app-gym-revenue-today',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    templateUrl: './gym-revenue-today.html',
    styleUrl: './gym-revenue-today.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GymRevenueTodayWidget {
    private reportStateService = inject(ReportStateService);
    private authService = inject(AuthService);
    private router = inject(Router);

    private now = new Date();
    private todayStr = toLocalDateStr(this.now);

    private report = toSignal(
        this.reportStateService.getMonthlyReport(this.now.getFullYear(), this.now.getMonth()),
        { initialValue: { days: [], total: 0 } }
    );

    todayRevenue = computed(() => {
        const days = this.report().days || [];
        const today = days.find(d => {
            try { return toLocalDateStr(d.date) === this.todayStr; }
            catch { return false; }
        });
        return today?.totalSales ?? 0;
    });

    monthlyTotal = computed(() => this.report().total || 0);
    isLoaded = computed(() => this.report().days.length > 0);
    isEmpty = computed(() => this.isLoaded() && this.todayRevenue() === 0);

    navigateToMonthlySales(): void {
        this.router.navigate([this.authService.hasAnyRole(['ADMIN']) ? '/store/monthly-sales' : '/store/history']);
    }
}
