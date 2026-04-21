import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgApexchartsModule, ApexAxisChartSeries, ApexChart, ApexStroke, ApexTooltip, ApexGrid, ApexYAxis } from 'ng-apexcharts';
import { ReportStateService } from '../../../../core/services/report.state.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
    selector: 'app-sales-sparkline',
    standalone: true,
    imports: [CommonModule, NgApexchartsModule],
    templateUrl: './sales-sparkline.html',
    styleUrl: './sales-sparkline.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesSparklineWidget {
    private reportStateService = inject(ReportStateService);
    private authService = inject(AuthService);
    private router = inject(Router);

    private now = new Date();
    private report = toSignal(
        this.reportStateService.getMonthlyReport(this.now.getFullYear(), this.now.getMonth()),
        { initialValue: { days: [], total: 0 } }
    );

    isLoaded = computed(() => this.report().days.length > 0);
    monthlyTotal = computed(() => this.report().total || 0);

    chartSeries = computed<ApexAxisChartSeries>(() => [{
        name: 'Sales',
        data: this.report().days.map(d => d.totalSales),
    }]);

    chartOptions = computed<ApexChart>(() => ({
        type: 'area',
        height: 80,
        sparkline: { enabled: true },
        animations: { enabled: true, easing: 'easeinout', speed: 600 },
    }));

    strokeOptions: ApexStroke = {
        curve: 'smooth',
        width: 2,
    };

    tooltipOptions: ApexTooltip = {
        enabled: true,
        fixed: { enabled: false },
        y: { formatter: (val: number) => `₱${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
    };

    gridOptions: ApexGrid = { show: false };
    yaxisOptions: ApexYAxis = { show: false, min: 0 };

    navigateToReports(): void {
        this.router.navigate([this.authService.hasAnyRole(['ADMIN']) ? '/reports' : '/store/history']);
    }
}
