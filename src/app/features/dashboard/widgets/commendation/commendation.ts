import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { getDailyCommendation } from '../../../../core/constants/dashboard-commendations';
import { getDailyManagerCommendation } from '../../../../core/constants/manager-commendations';

@Component({
    selector: 'app-commendation',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="commendation-card">
            <p class="commendation-text">{{ message() }}</p>
        </div>
    `,
    styleUrl: './commendation.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommendationWidget {
    private authService = inject(AuthService);

    message = signal('');

    constructor() {
        const uid = this.authService.userProfile()?.uid || 'anonymous';
        const isManager = this.authService.hasAnyRole(['ADMIN', 'MANAGER']);
        this.message.set(isManager ? getDailyManagerCommendation(uid) : getDailyCommendation(uid));
    }
}
