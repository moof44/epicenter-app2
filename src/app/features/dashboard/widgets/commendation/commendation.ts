import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { getDailyCommendation } from '../../../../core/constants/dashboard-commendations';

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
        this.message.set(getDailyCommendation(uid));
    }
}
