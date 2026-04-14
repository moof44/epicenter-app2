import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MemberService } from '../../../../core/services/member.service';
import { AttendanceService } from '../../../../core/services/attendance.service';
import { toLocalDateStr } from '../../../../core/utils/date.utils';
import { Member } from '../../../../core/models/member.model';

function safeToDate(value: any): Date | null {
    if (!value) return null;
    try {
        return value instanceof Date ? value : value.toDate();
    } catch {
        return null;
    }
}

@Component({
    selector: 'app-member-health',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    templateUrl: './member-health.html',
    styleUrl: './member-health.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberHealthWidget {
    private memberService = inject(MemberService);
    private attendanceService = inject(AttendanceService);
    private router = inject(Router);

    private members = toSignal(this.memberService.getMembers(), { initialValue: [] });

    todayCheckIns = signal(0);
    isCheckInsLoaded = signal(false);

    activeCount = computed(() =>
        this.members().filter(m => m.membershipStatus === 'Active').length
    );

    inactiveCount = computed(() =>
        this.members().filter(m => m.membershipStatus === 'Inactive').length
    );

    expiringThisWeek = computed(() => {
        const now = new Date();
        const weekFromNow = new Date(now);
        weekFromNow.setDate(weekFromNow.getDate() + 7);

        return this.members().filter(m => {
            if (!m.membershipExpiration) return false;
            const exp = safeToDate(m.membershipExpiration);
            if (!exp) return false;
            return exp > now && exp <= weekFromNow;
        });
    });

    newThisMonth = computed(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        return this.members().filter(m => {
            const created = safeToDate(m.createdBy?.timestamp);
            if (!created) return false;
            return created >= startOfMonth;
        }).length;
    });

    expiringCount = computed(() => this.expiringThisWeek().length);
    expiringNames = computed(() => this.expiringThisWeek().slice(0, 3).map(m => m.name));
    expiringExtra = computed(() => Math.max(this.expiringCount() - 3, 0));

    isLoaded = computed(() => this.members().length > 0 || this.isCheckInsLoaded());

    constructor() {
        this.loadTodayCheckIns();
    }

    private async loadTodayCheckIns(): Promise<void> {
        try {
            const todayStr = toLocalDateStr(new Date());
            const records = await this.attendanceService.getHistoryByDate(todayStr);
            // Deduplicate by memberId for unique visits
            const uniqueMembers = new Set(records.map(r => r.memberId));
            this.todayCheckIns.set(uniqueMembers.size);
        } catch (err) {
            console.error('Failed to load today check-ins:', err);
        } finally {
            this.isCheckInsLoaded.set(true);
        }
    }

    navigateToMembers(): void {
        this.router.navigate(['/members']);
    }
}
