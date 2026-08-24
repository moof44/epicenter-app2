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

    private summary = toSignal(
        this.memberService.getMemberHealthSummary(),
        {
            initialValue: {
                activeCount: 0,
                inactiveCount: 0,
                expiringCount: 0,
                expiringNames: [],
                newThisMonth: 0,
            }
        }
    );

    todayCheckIns = signal(0);
    isCheckInsLoaded = signal(false);

    activeCount = computed(() => this.summary().activeCount);
    inactiveCount = computed(() => this.summary().inactiveCount);
    expiringCount = computed(() => this.summary().expiringCount);
    expiringNames = computed(() => this.summary().expiringNames);
    newThisMonth = computed(() => this.summary().newThisMonth);
    expiringExtra = computed(() => Math.max(this.expiringCount() - 3, 0));

    isLoaded = computed(() => (this.summary().activeCount > 0 || this.summary().inactiveCount > 0) || this.isCheckInsLoaded());

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
