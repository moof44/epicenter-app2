import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AttendanceService } from '../../../../core/services/attendance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { DashboardCacheService } from '../../services/dashboard-cache.service';
import { toLocalDateStr } from '../../../../core/utils/date.utils';

interface HourCount {
    hour: string;   // "08:00"
    label: string;  // "8 AM"
    count: number;
}

@Component({
    selector: 'app-peak-hours',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    templateUrl: './peak-hours.html',
    styleUrl: './peak-hours.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeakHoursWidget {
    private attendanceService = inject(AttendanceService);
    private authService = inject(AuthService);
    private cacheService = inject(DashboardCacheService);
    private router = inject(Router);

    hours = signal<HourCount[]>([]);
    isLoading = signal(true);

    topHour = computed(() => this.hours()[0] ?? null);
    displayHours = computed(() => this.hours().slice(0, 5));
    isEmpty = computed(() => this.hours().length === 0 && !this.isLoading());
    maxCount = computed(() => this.hours().length > 0 ? this.hours()[0].count : 1);

    constructor() {
        this.loadData();
    }

    private async loadData(): Promise<void> {
        const cached = this.cacheService.get<HourCount[]>('peakHours');
        if (cached) {
            this.hours.set(cached);
            this.isLoading.set(false);
            return;
        }

        try {
            const todayStr = toLocalDateStr(new Date());
            const records = await this.attendanceService.getHistoryByDate(todayStr);

            const hourlyCounts = new Map<string, number>();
            records.forEach(r => {
                if (!r.checkInTime) return;
                const date: Date = r.checkInTime?.toDate ? r.checkInTime.toDate() : new Date(r.checkInTime);
                const hourKey = date.getHours().toString().padStart(2, '0') + ':00';
                hourlyCounts.set(hourKey, (hourlyCounts.get(hourKey) || 0) + 1);
            });

            const sorted = Array.from(hourlyCounts.entries())
                .map(([hour, count]) => ({
                    hour,
                    label: this.formatHourLabel(hour),
                    count,
                }))
                .sort((a, b) => b.count - a.count);

            this.hours.set(sorted);
            this.cacheService.set('peakHours', sorted);
        } catch (err) {
            console.error('Failed to load peak hours:', err);
        } finally {
            this.isLoading.set(false);
        }
    }

    private formatHourLabel(hour: string): string {
        const h = parseInt(hour, 10);
        if (h === 0) return '12 AM';
        if (h < 12) return `${h} AM`;
        if (h === 12) return '12 PM';
        return `${h - 12} PM`;
    }

    getBarWidth(count: number): number {
        return (count / this.maxCount()) * 100;
    }

    navigateToReports(): void {
        this.router.navigate([this.authService.hasAnyRole(['ADMIN']) ? '/reports' : '/store/history']);
    }
}
