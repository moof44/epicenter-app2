import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CashRegisterService } from '../../../../core/services/cash-register.service';
import { DashboardCacheService } from '../../services/dashboard-cache.service';

interface DiscrepancyDisplay {
    closedBy: string;
    discrepancy: number;
    date: Date;
    type: 'shortage' | 'overage';
}

@Component({
    selector: 'app-cash-discrepancies',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    templateUrl: './cash-discrepancies.html',
    styleUrl: './cash-discrepancies.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CashDiscrepanciesWidget {
    private cashRegisterService = inject(CashRegisterService);
    private cacheService = inject(DashboardCacheService);
    private router = inject(Router);

    discrepancies = signal<DiscrepancyDisplay[]>([]);
    isLoading = signal(true);

    isClean = computed(() => this.discrepancies().length === 0 && !this.isLoading());

    constructor() {
        this.loadData();
    }

    private async loadData(): Promise<void> {
        const cached = this.cacheService.get<DiscrepancyDisplay[]>('cashDiscrepancies');
        if (cached) {
            this.discrepancies.set(cached);
            this.isLoading.set(false);
            return;
        }

        try {
            const shifts = await firstValueFrom(
                this.cashRegisterService.getShiftHistory(10)
            );

            const withDiscrepancy = shifts
                .filter(s => s.status === 'CLOSED' && s.discrepancy !== null && s.discrepancy !== 0)
                .slice(0, 5)
                .map(s => {
                    const endTime = s.endTime?.toDate ? s.endTime.toDate() : new Date(s.endTime);
                    return {
                        closedBy: s.closedBy || 'Unknown',
                        discrepancy: s.discrepancy!,
                        date: endTime,
                        type: (s.discrepancy! < 0 ? 'shortage' : 'overage') as 'shortage' | 'overage',
                    };
                });

            this.discrepancies.set(withDiscrepancy);
            this.cacheService.set('cashDiscrepancies', withDiscrepancy);
        } catch (err) {
            console.error('Failed to load cash discrepancies:', err);
        } finally {
            this.isLoading.set(false);
        }
    }

    getRelativeTime(date: Date): string {
        const diff = Date.now() - date.getTime();
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    navigateToShiftReports(): void {
        this.router.navigate(['/store/reports']);
    }
}
