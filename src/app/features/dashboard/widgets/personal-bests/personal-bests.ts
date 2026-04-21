import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { StaffRecordsService } from '../../../../core/services/staff-records.service';
import { AuthService } from '../../../../core/services/auth.service';
import { DashboardCacheService } from '../../services/dashboard-cache.service';
import { StaffRecords } from '../../../../core/models/staff-records.model';

interface RecordDisplay {
    key: string;
    icon: string;
    label: string;
    value: string;
    date: string;
    isBroken: boolean;
}

@Component({
    selector: 'app-personal-bests',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    templateUrl: './personal-bests.html',
    styleUrl: './personal-bests.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonalBestsWidget {
    private staffRecordsService = inject(StaffRecordsService);
    private authService = inject(AuthService);
    private cacheService = inject(DashboardCacheService);
    private snackBar = inject(MatSnackBar);

    records = signal<RecordDisplay[]>([]);
    isLoading = signal(true);
    hasAnyRecord = computed(() => this.records().some(r => r.value !== '—'));

    // Expose for role check — trainers only see check-in record
    isTrainerOnly = computed(() =>
        this.authService.hasAnyRole(['TRAINER']) &&
        !this.authService.hasAnyRole(['ADMIN', 'MANAGER', 'STAFF'])
    );

    constructor() {
        this.loadData();
    }

    private async loadData(): Promise<void> {
        const uid = this.authService.userProfile()?.uid;
        if (!uid) { this.isLoading.set(false); return; }

        try {
            // Check cache first
            const cached = this.cacheService.get<{ records: StaffRecords | null; broken: string[] }>('personalBests');
            let data: StaffRecords | null;
            let broken: string[] = [];

            if (cached) {
                data = cached.records;
                broken = cached.broken;
            } else {
                data = await this.staffRecordsService.getRecords(uid);
                // Note: record-breaking check happens here using today's data from other widgets
                // For now, just display stored records. The check will be integrated when
                // Today's Sales and Members Checked In data is available via a shared signal.
                this.cacheService.set('personalBests', { records: data, broken: [] });
            }

            this.records.set(this.buildDisplayRecords(data, broken));

            if (broken.length > 0) {
                this.snackBar.open('🏆 New personal best!', 'Close', { duration: 4000 });
            }
        } catch (err) {
            console.error('Failed to load personal bests:', err);
        } finally {
            this.isLoading.set(false);
        }
    }

    private buildDisplayRecords(data: StaffRecords | null, broken: string[]): RecordDisplay[] {
        const trainerOnly = this.isTrainerOnly();

        const all: RecordDisplay[] = [
            {
                key: 'highestDailySales',
                icon: '🏆',
                label: 'Best Day',
                value: data?.highestDailySales ? `₱${data.highestDailySales.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—',
                date: this.formatDate(data?.highestDailySales?.date),
                isBroken: broken.includes('highestDailySales'),
            },
            {
                key: 'mostTransactionsInDay',
                icon: '⚡',
                label: 'Most Sales',
                value: data?.mostTransactionsInDay ? `${data.mostTransactionsInDay.value} transactions` : '—',
                date: this.formatDate(data?.mostTransactionsInDay?.date),
                isBroken: broken.includes('mostTransactionsInDay'),
            },
            {
                key: 'highestSingleTransaction',
                icon: '💰',
                label: 'Biggest Sale',
                value: data?.highestSingleTransaction ? `₱${data.highestSingleTransaction.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—',
                date: this.formatDate(data?.highestSingleTransaction?.date),
                isBroken: broken.includes('highestSingleTransaction'),
            },
            {
                key: 'mostCheckInsInDay',
                icon: '👋',
                label: 'Most Check-ins',
                value: data?.mostCheckInsInDay ? `${data.mostCheckInsInDay.value} members` : '—',
                date: this.formatDate(data?.mostCheckInsInDay?.date),
                isBroken: broken.includes('mostCheckInsInDay'),
            },
        ];

        return trainerOnly ? all.filter(r => r.key === 'mostCheckInsInDay') : all;
    }

    private formatDate(date: any): string {
        if (!date) return '';
        const d = date?.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
}
