import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { fadeIn } from '../../core/animations/animations';
import { PageContainerComponent } from '../../shared/ui';
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
        PageContainerComponent,
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

    isManagerView = computed(() => {
        return this.authService.hasAnyRole(['ADMIN', 'MANAGER']);
    });

    hasSalesRole = computed(() => {
        return this.authService.hasAnyRole(['ADMIN', 'MANAGER', 'STAFF']);
    });

    hasInventoryRole = computed(() => {
        return this.authService.hasAnyRole(['ADMIN', 'MANAGER']);
    });

    greeting = computed(() => {
        const hour = new Date().getHours();
        const first = this.firstName();
        const namePart = first ? `, ${first}` : '';

        if (hour < 12) return `Good morning${namePart}`;
        if (hour < 18) return `Good afternoon${namePart}`;
        return `Good evening${namePart}`;
    });

    todayDate = computed(() => {
        return new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        }).format(new Date());
    });
}
