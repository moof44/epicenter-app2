import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TransactionService } from '../../../../core/services/transaction.service';
import { AttendanceService } from '../../../../core/services/attendance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { toLocalDateStr } from '../../../../core/utils/date.utils';

interface ActivityItem {
    type: 'sale' | 'checkin';
    timestamp: Date;
    description: string;
    amount: number | null;
    isVoided: boolean;
    icon: string;
    routerLink: string;
}

function getRelativeTime(date: Date): string {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

@Component({
    selector: 'app-activity-feed',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    templateUrl: './activity-feed.html',
    styleUrl: './activity-feed.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityFeedWidget {
    private transactionService = inject(TransactionService);
    private attendanceService = inject(AttendanceService);
    private authService = inject(AuthService);
    private router = inject(Router);

    activities = signal<(ActivityItem & { relativeTime: string })[]>([]);
    isLoading = signal(true);

    isEmpty = computed(() => this.activities().length === 0 && !this.isLoading());

    constructor() {
        this.loadData();
    }

    private async loadData(): Promise<void> {
        const uid = this.authService.userProfile()?.uid;
        if (!uid) { this.isLoading.set(false); return; }

        const isTrainer = this.authService.hasAnyRole(['TRAINER'])
            && !this.authService.hasAnyRole(['ADMIN', 'MANAGER', 'STAFF']);

        const todayStr = toLocalDateStr(new Date());

        try {
            const [salesItems, checkinItems] = await Promise.all([
                isTrainer ? Promise.resolve([]) : this.loadSales(uid),
                this.loadCheckins(uid, todayStr),
            ]);

            const merged = [...salesItems, ...checkinItems]
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                .slice(0, 5)
                .map(item => ({ ...item, relativeTime: getRelativeTime(item.timestamp) }));

            this.activities.set(merged);
        } catch (err) {
            console.error('Failed to load activity feed:', err);
        } finally {
            this.isLoading.set(false);
        }
    }

    private async loadSales(uid: string): Promise<ActivityItem[]> {
        const txs = await firstValueFrom(
            this.transactionService.getTransactions({ staffId: uid, limit: 5 })
        );
        return txs.map(tx => {
            const date = tx.date instanceof Date ? tx.date : new Date(tx.date);
            const summary = tx.items
                .map(i => i.quantity > 1 ? `${i.quantity}x ${i.productName}` : i.productName)
                .join(', ');
            return {
                type: 'sale' as const,
                timestamp: date,
                description: `Sold ${summary} to ${tx.memberName || 'Walk-in'}`,
                amount: tx.totalAmount,
                isVoided: tx.status === 'VOID',
                icon: 'point_of_sale',
                routerLink: '/store/history',
            };
        });
    }

    private async loadCheckins(uid: string, todayStr: string): Promise<ActivityItem[]> {
        try {
            const records = await this.attendanceService.getCheckInsByStaff(uid, todayStr, 5);
            return records.map(r => {
                const date = r.checkInTime instanceof Date ? r.checkInTime : new Date(r.checkInTime);
                return {
                    type: 'checkin' as const,
                    timestamp: date,
                    description: `Checked in ${r.memberName}`,
                    amount: null,
                    isVoided: false,
                    icon: 'how_to_reg',
                    routerLink: '/attendance',
                };
            });
        } catch {
            return [];
        }
    }

    navigateTo(link: string): void {
        this.router.navigate([link]);
    }
}
