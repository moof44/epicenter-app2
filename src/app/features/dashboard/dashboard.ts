import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
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
import { GymRevenueTodayWidget } from './widgets/gym-revenue-today/gym-revenue-today';
import { MembersInGymWidget } from './widgets/members-in-gym/members-in-gym';
import { StaffLeaderboardWidget } from './widgets/staff-leaderboard/staff-leaderboard';
import { MemberHealthWidget } from './widgets/member-health/member-health';
import { SalesSparklineWidget } from './widgets/sales-sparkline/sales-sparkline';
import { PaymentSplitWidget } from './widgets/payment-split/payment-split';
import { PeakHoursWidget } from './widgets/peak-hours/peak-hours';
import { RecentVoidsWidget } from './widgets/recent-voids/recent-voids';
import { CashDiscrepanciesWidget } from './widgets/cash-discrepancies/cash-discrepancies';
import { MyAttendanceWidgetComponent } from './widgets/my-attendance-widget/my-attendance-widget';
import { StaffKioskWidgetComponent } from './widgets/staff-kiosk-widget/staff-kiosk-widget';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
        CommonModule, MatExpansionModule, MatIconModule,
        TodaysSalesWidget, CommendationWidget, MembersCheckedInWidget,
        MonthlyProgressWidget, WeekTrendWidget, VsLastMonthWidget, TopProductWidget,
        BadgeRowWidget, LowStockAlertsWidget, ActivityFeedWidget, PersonalBestsWidget,
        GymRevenueTodayWidget, MembersInGymWidget, StaffLeaderboardWidget,
        MemberHealthWidget, SalesSparklineWidget, PaymentSplitWidget, PeakHoursWidget,
        RecentVoidsWidget, CashDiscrepanciesWidget, MyAttendanceWidgetComponent, StaffKioskWidgetComponent
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
    isManagerView = computed(() =>
        this.authService.hasAnyRole(['ADMIN', 'MANAGER']) &&
        !this.isStaffOnlyView()
    );

    private isStaffOnlyView = computed(() => {
        const user = this.authService.userProfile();
        if (!user?.roles) return false;
        // Staff-only: has STAFF but NOT ADMIN or MANAGER
        return user.roles.includes('STAFF') &&
            !user.roles.includes('ADMIN') &&
            !user.roles.includes('MANAGER');
    });

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
