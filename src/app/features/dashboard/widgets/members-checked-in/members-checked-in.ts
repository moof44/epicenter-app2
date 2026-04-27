import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AttendanceService } from '../../../../core/services/attendance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { toLocalDateStr } from '../../../../core/utils/date.utils';

@Component({
    selector: 'app-members-checked-in',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    templateUrl: './members-checked-in.html',
    styleUrl: './members-checked-in.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembersCheckedInWidget {
    private attendanceService = inject(AttendanceService);
    private authService = inject(AuthService);
    private router = inject(Router);

    count = signal(0);
    names = signal<string[]>([]);
    latestTime = signal<Date | null>(null);
    isLoading = signal(true);

    isEmpty = computed(() => this.count() === 0 && !this.isLoading());
    displayNames = computed(() => this.names().slice(0, 5));
    extraCount = computed(() => Math.max(this.count() - 5, 0));
    isApproximate = computed(() => this.count() >= 20);

    latestTimeText = computed(() => {
        const t = this.latestTime();
        if (!t) return '';
        return t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    });

    constructor() {
        this.loadData();
    }

    private async loadData(): Promise<void> {
        const uid = this.authService.userProfile()?.uid;
        if (!uid) {
            this.isLoading.set(false);
            return;
        }

        const todayStr = toLocalDateStr(new Date());

        try {
            const records = await this.attendanceService.getCheckInsByStaff(uid, todayStr, 20);
            this.count.set(records.length);
            this.names.set(records.map(r => r.memberName));

            if (records.length > 0) {
                const raw = records[0].checkInTime;
                this.latestTime.set(raw instanceof Date ? raw : new Date(raw));
            }
        } catch (err) {
            // Index might not exist yet — graceful degradation
            console.warn('Members checked-in query failed (index may be needed):', err);
        } finally {
            this.isLoading.set(false);
        }
    }

    navigateToAttendance(): void {
        this.router.navigate(['/attendance']);
    }
}
