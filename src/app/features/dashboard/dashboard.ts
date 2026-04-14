import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { fadeIn } from '../../core/animations/animations';
import { TodaysSalesWidget } from './widgets/todays-sales/todays-sales';
import { CommendationWidget } from './widgets/commendation/commendation';
import { MembersCheckedInWidget } from './widgets/members-checked-in/members-checked-in';
import { MonthlyProgressWidget } from './widgets/monthly-progress/monthly-progress';
import { WeekTrendWidget } from './widgets/week-trend/week-trend';
import { VsLastMonthWidget } from './widgets/vs-last-month/vs-last-month';
import { TopProductWidget } from './widgets/top-product/top-product';
import { BadgeRowWidget } from './widgets/badge-row/badge-row';
import { LowStockAlertsWidget } from './widgets/low-stock-alerts/low-stock-alerts';
import { ActivityFeedWidget } from './widgets/activity-feed/activity-feed';
import { PersonalBestsWidget } from './widgets/personal-bests/personal-bests';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
        CommonModule, TodaysSalesWidget, CommendationWidget, MembersCheckedInWidget,
        MonthlyProgressWidget, WeekTrendWidget, VsLastMonthWidget, TopProductWidget,
        BadgeRowWidget, LowStockAlertsWidget, ActivityFeedWidget, PersonalBestsWidget
    ],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.css',
    animations: [fadeIn],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
    private authService = inject(AuthService);

    firstName = computed(() => {
        const name = this.authService.userProfile()?.displayName;
        if (!name) return '';
        return name.split(' ')[0];
    });

    greeting = computed(() => {
        const hour = new Date().getHours();
        const name = this.firstName();
        const label = name ? `, ${name}` : '';

        if (hour >= 5 && hour < 12) return `Good morning${label}`;
        if (hour >= 12 && hour < 17) return `Good afternoon${label}`;
        return `Good evening${label}`;
    });

    todayDate = computed(() =>
        new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).format(new Date())
    );

    // Role checks for conditional widget rendering
    hasSalesRole = computed(() =>
        this.authService.hasAnyRole(['ADMIN', 'MANAGER', 'STAFF'])
    );

    hasInventoryRole = computed(() =>
        this.authService.hasAnyRole(['ADMIN', 'MANAGER'])
    );

    hasAnyRole = computed(() =>
        this.authService.hasAnyRole(['ADMIN', 'MANAGER', 'STAFF', 'TRAINER'])
    );
}
