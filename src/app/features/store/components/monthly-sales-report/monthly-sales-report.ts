import { Component, inject, signal, computed } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Subject, startWith, switchMap, combineLatest } from 'rxjs';
import { DailySalesService } from '../../../../core/services/daily-sales.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { fadeIn } from '../../../../core/animations/animations';

import { ReportStateService } from '../../../../core/services/report.state.service';

@Component({
    selector: 'app-monthly-sales-report',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        MatProgressBarModule
    ],
    templateUrl: './monthly-sales-report.html',
    styleUrl: './monthly-sales-report.css',
    animations: [fadeIn]
})
export class MonthlySalesReport {
    private dailySalesService = inject(DailySalesService);
    private reportStateService = inject(ReportStateService);
    private settingsService = inject(SettingsService);

    // State
    currentDate = signal(new Date());

    // Selection
    viewMonth = computed(() => this.currentDate().getMonth());
    viewYear = computed(() => this.currentDate().getFullYear());

    // Refresh trigger for post-recalculation reloads
    private refreshTrigger = new Subject<void>();

    // Data Loading
    report$ = combineLatest([
        toObservable(this.currentDate),
        this.refreshTrigger.pipe(startWith(undefined))
    ]).pipe(
        switchMap(([date]) => this.reportStateService.getMonthlyReport(date.getFullYear(), date.getMonth()))
    );
    report = toSignal(this.report$);

    settings$ = this.settingsService.getSettings();
    settings = toSignal(this.settings$, { initialValue: { monthlyQuota: 0 } });

    // Columns
    displayedColumns = ['date', 'dayName', 'totalSales', 'actions'];

    // Calculations
    progress = computed(() => {
        const total = this.report()?.total || 0;
        const config = this.settings();
        const quota = config.monthlyQuota || 0;
        if (quota === 0) return 0;
        return Math.min((total / quota) * 100, 100);
    });

    isTargetMet = computed(() => {
        const total = this.report()?.total || 0;
        const config = this.settings();
        const quota = config.monthlyQuota || 0;
        return quota > 0 && total >= quota;
    });

    nextMonth() {
        const next = new Date(this.currentDate());
        next.setMonth(next.getMonth() + 1);
        this.currentDate.set(next);
    }

    prevMonth() {
        const prev = new Date(this.currentDate());
        prev.setMonth(prev.getMonth() - 1);
        this.currentDate.set(prev);
    }

    getMonthName(month: number): string {
        return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(2000, month, 1));
    }

    getDayName(date: Date): string {
        return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
    }

    private router = inject(Router);
    private route = inject(ActivatedRoute);

    constructor() {
        // Initialize from params if available to restore state
        this.route.queryParams.subscribe(params => {
            if (params['date']) {
                this.currentDate.set(new Date(params['date']));
            }
        });
    }

    goToSalesByUser() {
        // Pass current date as 'date' (to init the user report with same month)
        // AND 'returnDate' (so it knows where to come back to)
        this.router.navigate(['/store/sales-by-user'], {
            queryParams: {
                date: this.currentDate().toISOString(),
                returnDate: this.currentDate().toISOString()
            }
        });
    }

    async recalculateMonth() {
        if (confirm(`Recalculate sales for ${this.getMonthName(this.viewMonth())} ${this.viewYear()}?`)) {
            await this.dailySalesService.recalculateSalesForMonth(this.viewYear(), this.viewMonth());
            this.reportStateService.invalidateMonthlyReport(this.viewYear(), this.viewMonth());
            this.refreshTrigger.next();
            alert('Month recalculated.');
        }
    }

    async recalculateDay(daySales: any) {
        if (confirm(`Recalculate sales for ${this.getDayName(daySales.date)} ${daySales.date.toLocaleDateString()}?`)) {
            await this.dailySalesService.recalculateSalesForDay(daySales.date);
            this.reportStateService.invalidateMonthlyReport(this.viewYear(), this.viewMonth());
            this.refreshTrigger.next();
        }
    }

    async recalculateAll() {
        if (confirm('Recalculate ENTIRE historical database? This will be slow.')) {
            await this.dailySalesService.recalculateDailySales();
            this.reportStateService.clearCache();
            this.refreshTrigger.next();
            alert('Full database refreshed.');
        }
    }
}
