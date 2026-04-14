import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AttendanceService } from '../../../../core/services/attendance.service';

@Component({
    selector: 'app-members-in-gym',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    templateUrl: './members-in-gym.html',
    styleUrl: './members-in-gym.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembersInGymWidget {
    private attendanceService = inject(AttendanceService);
    private router = inject(Router);

    private activeCheckIns = toSignal(
        this.attendanceService.getActiveCheckIns(),
        { initialValue: [] }
    );

    count = computed(() => this.activeCheckIns().length);
    recentNames = computed(() =>
        this.activeCheckIns().slice(0, 5).map(r => r.memberName)
    );
    extraCount = computed(() => Math.max(this.count() - 5, 0));
    isEmpty = computed(() => this.count() === 0);

    navigateToAttendance(): void {
        this.router.navigate(['/attendance']);
    }
}
