import { Component, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReportStateService } from '../../../../core/services/report.state.service';
import { AuthService } from '../../../../core/services/auth.service';

interface SparkPoint {
    x: number;
    y: number;
    day: number;
    date: string;
    sales: number;
}

@Component({
    selector: 'app-sales-sparkline',
    standalone: true,
    imports: [CommonModule],
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

    activePoint = signal<SparkPoint | null>(null);

    isLoaded = computed(() => this.report().days.length > 0);
    monthlyTotal = computed(() => this.report().total || 0);

    sparkPoints = computed<SparkPoint[]>(() => {
        const days = this.report().days || [];
        if (days.length === 0) return [];

        const maxSales = Math.max(...days.map(d => d.totalSales || 0), 100);
        const svgWidth = 500;
        const svgHeight = 75;
        const paddingX = 12;
        const paddingTop = 12;
        const usableWidth = svgWidth - paddingX * 2;
        const usableHeight = svgHeight - paddingTop - 10;

        return days.map((d, index) => {
            const x = days.length > 1 
                ? paddingX + (index / (days.length - 1)) * usableWidth 
                : svgWidth / 2;
            const y = svgHeight - 10 - ((d.totalSales || 0) / maxSales) * usableHeight;
            const dateStr = d.date instanceof Date 
                ? d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) 
                : (d.date ? String(d.date) : `Day ${index + 1}`);
            return {
                x,
                y,
                day: index + 1,
                date: dateStr,
                sales: d.totalSales || 0,
            };
        });
    });

    linePath = computed<string>(() => {
        const points = this.sparkPoints();
        if (points.length === 0) return '';
        if (points.length === 1) return `M 0,${points[0].y} L 500,${points[0].y}`;

        // Generate smooth Bezier curve
        let d = `M ${points[0].x},${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            const mx = (p0.x + p1.x) / 2;
            d += ` C ${mx},${p0.y} ${mx},${p1.y} ${p1.x},${p1.y}`;
        }
        return d;
    });

    areaPath = computed<string>(() => {
        const points = this.sparkPoints();
        if (points.length === 0) return '';
        const line = this.linePath();
        const lastX = points[points.length - 1].x;
        const firstX = points[0].x;
        return `${line} L ${lastX},75 L ${firstX},75 Z`;
    });

    onHover(point: SparkPoint): void {
        this.activePoint.set(point);
    }

    onLeave(): void {
        this.activePoint.set(null);
    }

    navigateToReports(): void {
        this.router.navigate([this.authService.hasAnyRole(['ADMIN']) ? '/reports' : '/store/history']);
    }
}
