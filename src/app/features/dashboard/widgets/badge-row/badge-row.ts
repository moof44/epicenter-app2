import { Component, inject, signal, computed, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { CashRegisterService } from '../../../../core/services/cash-register.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ShiftControlModal } from '../../../store/components/shift-control-modal/shift-control-modal';

@Component({
    selector: 'app-badge-row',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    templateUrl: './badge-row.html',
    styleUrl: './badge-row.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeRowWidget {
    private cashRegisterService = inject(CashRegisterService);
    private authService = inject(AuthService);
    private dialog = inject(MatDialog);
    private destroyRef = inject(DestroyRef);

    shift = toSignal(this.cashRegisterService.currentShift$, { initialValue: null });
    durationText = signal('');

    isShiftOpen = computed(() => this.shift()?.status === 'OPEN');

    isFirstToOpen = computed(() => {
        const s = this.shift();
        const name = this.authService.userProfile()?.displayName;
        return s?.status === 'OPEN' && !!name && s.openedBy === name;
    });

    openedBy = computed(() => this.shift()?.openedBy || '');
    expectedBalance = computed(() => this.shift()?.expectedClosingBalance ?? 0);

    isLongShift = computed(() => {
        const s = this.shift();
        if (!s?.startTime) return false;
        const start = s.startTime?.toDate ? s.startTime.toDate() : new Date(s.startTime);
        return (Date.now() - start.getTime()) > 10 * 3600000; // 10 hours
    });

    constructor() {
        this.updateDuration();
        interval(60_000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.updateDuration());
    }

    private updateDuration(): void {
        const s = this.shift();
        if (!s?.startTime) { this.durationText.set(''); return; }

        const start: Date = s.startTime?.toDate ? s.startTime.toDate() : new Date(s.startTime);
        const ms = Date.now() - start.getTime();
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);

        if (ms < 60000) this.durationText.set('Just opened');
        else if (hours === 0) this.durationText.set(`${minutes}m`);
        else if (hours < 24) this.durationText.set(`${hours}h ${minutes}m`);
        else this.durationText.set(`${hours}h`);
    }

    openShiftModal(): void {
        this.dialog.open(ShiftControlModal, { width: '500px', disableClose: true });
    }
}
