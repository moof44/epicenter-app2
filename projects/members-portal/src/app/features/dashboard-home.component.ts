import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../core/services/dashboard.service';
import { ReferralCardComponent } from '../shared/components/referral-card/referral-card.component';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterLink, ReferralCardComponent],
  template: `
    <div class="min-h-screen text-text-primary py-4 px-2 sm:px-6 select-none">
      
      <!-- Loading Skeleton Loader -->
      @if (dashboardService.loading()) {
        <div class="flex flex-col gap-6 animate-pulse">
          <!-- Header Banner Skeleton -->
          <div class="h-20 bg-bg-surface border border-bg-surface-alt rounded-2xl w-full"></div>
          
          <!-- Grid Skeleton -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="h-32 bg-bg-surface border border-bg-surface-alt rounded-2xl"></div>
            <div class="h-32 bg-bg-surface border border-bg-surface-alt rounded-2xl"></div>
            <div class="h-32 bg-bg-surface border border-bg-surface-alt rounded-2xl"></div>
            <div class="h-32 bg-bg-surface border border-bg-surface-alt rounded-2xl"></div>
          </div>
          
          <!-- Somatic Card Skeleton -->
          <div class="h-64 bg-bg-surface border border-bg-surface-alt rounded-2xl w-full"></div>
        </div>
      } @else {
        
        <!-- Welcome Header Banner -->
        <div class="bg-bg-surface border border-bg-surface-alt p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          <div class="flex flex-col">
            <span class="text-xs text-text-secondary font-bold tracking-widest uppercase">Member Dashboard</span>
            <h1 class="text-2xl sm:text-3xl font-black font-oswald text-gold-primary tracking-wide mt-1 uppercase">
              Welcome back, {{ memberName() }}!
            </h1>
            <p class="text-sm text-text-secondary mt-1">Ready to crush your workout goals today?</p>
          </div>
          
          <div class="flex items-center gap-2 self-start sm:self-center">
            <span class="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping absolute"></span>
            <span class="w-3.5 h-3.5 rounded-full bg-emerald-500 relative"></span>
            <span class="text-xs font-bold font-oswald uppercase tracking-widest text-emerald-400">
              {{ memberStatus() }}
            </span>
          </div>
        </div>

        <!-- Quick Action Launcher (Mobile & Desktop) -->
        <div class="grid grid-cols-2 gap-4 mt-6">
          <a 
            routerLink="/dashboard/workout"
            class="flex items-center justify-between p-4 bg-bg-surface border border-bg-surface-alt rounded-2xl transition-all active:scale-98 hover:shadow-[0_4px_20px_rgba(212,175,55,0.15)] hover:border-gold-primary/30"
          >
            <div class="flex flex-col gap-0.5">
              <span class="text-[10px] text-gold-light font-bold uppercase tracking-wider">Workout Log</span>
              <span class="text-[10px] sm:text-xs text-text-secondary font-bold">Track Today's Lift</span>
            </div>
            <span class="text-xl">🏋️‍♂️</span>
          </a>

          <a 
            routerLink="/dashboard/schedule"
            class="flex items-center justify-between p-4 bg-bg-surface border border-bg-surface-alt rounded-2xl transition-all active:scale-98 hover:shadow-[0_4px_20px_rgba(212,175,55,0.15)] hover:border-gold-primary/30"
          >
            <div class="flex flex-col gap-0.5">
              <span class="text-[10px] text-gold-light font-bold uppercase tracking-wider">Timetable</span>
              <span class="text-[10px] sm:text-xs text-text-secondary font-bold">Class Schedules</span>
            </div>
            <span class="text-xl">📅</span>
          </a>
        </div>

        <!-- Quick Stats Cards Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          
          <!-- Membership Validity Card -->
          <div class="card-surface flex flex-col justify-between min-h-[120px] transition-all hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(212,175,55,0.15)] hover:border-gold-primary/30">
            <div class="flex items-start justify-between">
              <span class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Gym Membership</span>
              <span class="p-1.5 bg-gold-dim text-gold-primary rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </span>
            </div>
            <div class="mt-2">
              <div class="text-2xl font-black font-oswald text-gold-light">
                {{ membershipDays() }} Days Left
              </div>
              <div class="text-[10px] text-text-secondary mt-1 font-bold">
                Expires: {{ expiryDateText() }}
              </div>
            </div>
          </div>

          <!-- Personal Training Card -->
          <div class="card-surface flex flex-col justify-between min-h-[120px] transition-all hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(212,175,55,0.15)] hover:border-gold-primary/30">
            <div class="flex items-start justify-between">
              <span class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Personal Training</span>
              <span class="p-1.5 bg-gold-dim text-gold-primary rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </span>
            </div>
            <div class="mt-2">
              @if (ptDays() > 0) {
                <div class="text-2xl font-black font-oswald text-gold-light">
                  {{ ptDays() }} Days Left
                </div>
                <div class="text-[10px] text-text-secondary mt-1 font-bold">
                  Active Package
                </div>
              } @else {
                <div class="text-xl font-black font-oswald text-text-muted uppercase">
                  No Active Coach
                </div>
                <div class="text-[10px] text-text-secondary mt-1 font-bold">
                  Ask desk to subscribe
                </div>
              }
            </div>
          </div>

          <!-- Check-in Streak Card -->
          <div class="card-surface flex flex-col justify-between min-h-[120px] transition-all hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(212,175,55,0.15)] hover:border-gold-primary/30">
            <div class="flex items-start justify-between">
              <span class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Gym Streak</span>
              <span class="p-1.5 bg-red-950 text-red-500 rounded-lg">
                🔥
              </span>
            </div>
            <div class="mt-2">
              <div class="text-2xl font-black font-oswald text-red-400">
                {{ streak() }} Days Active
              </div>
              <div class="text-[10px] text-text-secondary mt-1 font-bold">
                Keep the flame burning!
              </div>
            </div>
          </div>

          <!-- Monthly Visits Card -->
          <div class="card-surface flex flex-col justify-between min-h-[120px] transition-all hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(212,175,55,0.15)] hover:border-gold-primary/30">
            <div class="flex items-start justify-between">
              <span class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Visits This Month</span>
              <span class="p-1.5 bg-gold-dim text-gold-primary rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
              </span>
            </div>
            <div class="mt-2">
              <div class="text-2xl font-black font-oswald text-gold-light">
                {{ monthVisits() }} Session{{ monthVisits() === 1 ? '' : 's' }}
              </div>
              <div class="text-[10px] text-text-secondary mt-1 font-bold">
                Consistent attendance
              </div>
            </div>
          </div>

        </div>

        <!-- Gamification Achievements Section -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 animate-fade-in">
          <!-- Main Badge Display (spans 2 columns on desktop) -->
          <div class="card-surface lg:col-span-2 flex flex-col gap-6">
            <div class="border-b border-bg-surface-alt pb-4">
              <h2 class="text-xl font-bold font-oswald tracking-wide text-gold-primary uppercase">My Attendance Badges</h2>
              <p class="text-xs text-text-secondary mt-0.5">Maintain consistency to level up your status</p>
            </div>

            <div class="flex flex-col sm:flex-row items-center gap-6 p-2">
              <!-- Tier Badge Image / Graphic -->
              <div class="flex flex-col items-center justify-center text-center p-4 bg-bg-surface-alt/20 rounded-2xl border border-bg-surface-alt/30 w-full sm:w-48 aspect-square relative overflow-hidden group">
                <span class="text-5xl select-none transition-transform group-hover:scale-110 duration-300">
                  @if (badgeLevel() === 3) { 👑 }
                  @else if (badgeLevel() === 2) { 🥈 }
                  @else if (badgeLevel() === 1) { 🥉 }
                  @else { 🔒 }
                </span>
                <span class="text-sm font-bold font-oswald uppercase tracking-wider text-gold-light mt-3">
                  @if (badgeLevel() === 3) { Gold Legend }
                  @else if (badgeLevel() === 2) { Silver Consistent }
                  @else if (badgeLevel() === 1) { Bronze Active }
                  @else { No Badge }
                </span>
                <span class="text-[9px] text-text-secondary mt-1">
                  @if (badgeLevel() === 3) { 33+ visits in 90d }
                  @else if (badgeLevel() === 2) { 22+ visits in 60d }
                  @else if (badgeLevel() === 1) { 11+ visits in 30d }
                  @else { Gym consistent! }
                </span>
              </div>

              <!-- Explanation and stats -->
              <div class="flex-1 flex flex-col gap-3">
                <h4 class="text-sm font-bold font-oswald text-gold-light uppercase tracking-wider">How to Level Up:</h4>
                <ul class="text-xs text-text-secondary flex flex-col gap-2 list-none p-0">
                  <li class="flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full bg-gold-primary"></span>
                    <span [class.text-gold-primary]="badgeLevel() >= 1">**Bronze Active:** 11 check-ins in the last 30 days.</span>
                  </li>
                  <li class="flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full bg-gold-primary"></span>
                    <span [class.text-gold-primary]="badgeLevel() >= 2">**Silver Consistent:** 22 check-ins in the last 60 days.</span>
                  </li>
                  <li class="flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full bg-gold-primary"></span>
                    <span [class.text-gold-primary]="badgeLevel() >= 3">**Gold Legend:** 33 check-ins in the last 90 days.</span>
                  </li>
                </ul>
                <p class="text-[10px] text-text-muted mt-2">
                  *Note: The recovery-day logic allows 1 rest day after any check-in without breaking your check-in streak. Consecutive absences will break the streak.
                </p>
              </div>
            </div>
          </div>

          <!-- Monthly Collectible Shelf Card (spans 1 column) -->
          <div class="card-surface flex flex-col justify-between gap-4">
            <div class="border-b border-bg-surface-alt pb-4">
              <h2 class="text-lg font-bold font-oswald text-gold-light uppercase tracking-wider">Monthly Shelf</h2>
              <p class="text-[10px] text-text-secondary mt-0.5">Collectibles earned (at least 4 visits/month)</p>
            </div>

            <div class="flex-1 overflow-y-auto max-h-[160px] pr-1">
              @if (earnedMonthlyBadges().length === 0) {
                <div class="flex flex-col items-center justify-center h-full text-center text-text-muted py-6 gap-2">
                  <span class="text-3xl">🏺</span>
                  <span class="text-[10px] uppercase font-bold tracking-wider">Shelf Empty</span>
                  <span class="text-[9px] max-w-[150px]">Your monthly badges will appear here once you hit 4 check-ins!</span>
                </div>
              } @else {
                <div class="grid grid-cols-2 gap-2">
                  @for (mBadge of earnedMonthlyBadges(); track mBadge) {
                    <div class="flex flex-col items-center justify-center p-2 rounded-xl bg-bg-surface-alt/30 border border-bg-surface-alt/40 text-center">
                      <span class="text-xl">🏅</span>
                      <span class="text-[10px] font-bold text-text-primary mt-1">{{ formatMonthlyBadgeId(mBadge) }}</span>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Somatics / Biometrics Overview -->
        <div class="card-surface mt-6 flex flex-col gap-6">
          <div class="border-b border-bg-surface-alt pb-4">
            <h2 class="text-xl font-bold font-oswald tracking-wide text-gold-primary uppercase">Recent Somatic Overview</h2>
            <p class="text-xs text-text-secondary mt-0.5">Biometrics from your latest body checkup</p>
          </div>

          @if (latestData()) {
            <!-- Core Biometrics Cards Grid -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <!-- Weight Metric -->
              <div class="bg-bg-surface-alt border border-bg-surface-alt/50 p-6 rounded-2xl flex flex-col gap-3">
                <span class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Body Weight</span>
                <div class="flex items-baseline gap-2">
                  <span class="text-4xl font-black font-oswald text-gold-light">{{ latestData().weight }}</span>
                  <span class="text-xs text-text-secondary font-bold">kg</span>
                </div>
                <!-- Trend Indicator -->
                <div class="flex items-center gap-1.5 mt-1 text-xs">
                  @if (trends().weightDelta < 0) {
                    <span class="text-emerald-400 font-bold">↓ {{ abs(trends().weightDelta) }} kg</span>
                    <span class="text-text-muted text-[10px]">vs last check</span>
                  } @else if (trends().weightDelta > 0) {
                    <span class="text-gold-primary font-bold">↑ {{ trends().weightDelta }} kg</span>
                    <span class="text-text-muted text-[10px]">vs last check</span>
                  } @else {
                    <span class="text-text-secondary">No change</span>
                  }
                </div>
              </div>

              <!-- Body Fat Metric -->
              <div class="bg-bg-surface-alt border border-bg-surface-alt/50 p-6 rounded-2xl flex flex-col gap-3">
                <span class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Body Fat</span>
                <div class="flex items-baseline gap-2">
                  <span class="text-4xl font-black font-oswald text-gold-light">{{ latestData().bodyFat }}</span>
                  <span class="text-xs text-text-secondary font-bold">%</span>
                </div>
                <!-- Trend Indicator -->
                <div class="flex items-center gap-1.5 mt-1 text-xs">
                  @if (trends().bodyFatDelta < 0) {
                    <span class="text-emerald-400 font-bold">↓ {{ abs(trends().bodyFatDelta) }}%</span>
                    <span class="text-text-muted text-[10px]">vs last check</span>
                  } @else if (trends().bodyFatDelta > 0) {
                    <span class="text-red-400 font-bold">↑ {{ trends().bodyFatDelta }}%</span>
                    <span class="text-text-muted text-[10px]">vs last check</span>
                  } @else {
                    <span class="text-text-secondary">No change</span>
                  }
                </div>
              </div>

              <!-- Muscle Mass Metric -->
              <div class="bg-bg-surface-alt border border-bg-surface-alt/50 p-6 rounded-2xl flex flex-col gap-3">
                <span class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Muscle Mass</span>
                <div class="flex items-baseline gap-2">
                  <span class="text-4xl font-black font-oswald text-gold-light">{{ latestData().muscleMass }}</span>
                  <span class="text-xs text-text-secondary font-bold">%</span>
                </div>
                <!-- Trend Indicator -->
                <div class="flex items-center gap-1.5 mt-1 text-xs">
                  @if (trends().muscleMassDelta > 0) {
                    <span class="text-emerald-400 font-bold">↑ {{ trends().muscleMassDelta }}%</span>
                    <span class="text-text-muted text-[10px]">vs last check</span>
                  } @else if (trends().muscleMassDelta < 0) {
                    <span class="text-red-400 font-bold">↓ {{ abs(trends().muscleMassDelta) }}%</span>
                    <span class="text-text-muted text-[10px]">vs last check</span>
                  } @else {
                    <span class="text-text-secondary">No change</span>
                  }
                </div>
              </div>

            </div>

            <!-- Secondary Metrics Grid -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
              <div class="p-4 bg-bg-surface-alt/30 border border-bg-surface-alt/30 rounded-xl flex flex-col">
                <span class="text-[9px] text-text-secondary font-bold uppercase tracking-wider">BMI Score</span>
                <span class="text-lg font-bold font-oswald text-text-primary mt-1">{{ latestData().bmi }}</span>
              </div>
              <div class="p-4 bg-bg-surface-alt/30 border border-bg-surface-alt/30 rounded-xl flex flex-col">
                <span class="text-[9px] text-text-secondary font-bold uppercase tracking-wider">Basal Metabolism</span>
                <span class="text-lg font-bold font-oswald text-text-primary mt-1">{{ latestData().metabolism }} kcal</span>
              </div>
              <div class="p-4 bg-bg-surface-alt/30 border border-bg-surface-alt/30 rounded-xl flex flex-col">
                <span class="text-[9px] text-text-secondary font-bold uppercase tracking-wider">Body Age</span>
                <span class="text-lg font-bold font-oswald text-text-primary mt-1">{{ latestData().bodyAge }} Years</span>
              </div>
              <div class="p-4 bg-bg-surface-alt/30 border border-bg-surface-alt/30 rounded-xl flex flex-col">
                <span class="text-[9px] text-text-secondary font-bold uppercase tracking-wider">Last Check Date</span>
                <span class="text-lg font-bold font-oswald text-text-primary mt-1">{{ checkupDateText() }}</span>
              </div>
            </div>
            
          } @else {
            <!-- No Biometrics Fallback -->
            <div class="flex flex-col items-center justify-center py-8 text-center text-text-secondary gap-2">
              <span class="text-3xl">📊</span>
              <span class="text-sm font-bold uppercase tracking-wider text-gold-light">No measurements logged yet</span>
              <p class="text-xs text-text-secondary max-w-sm mt-1">
                Please complete your initial somatic checkup at the fitness desk to activate your biometric tracking indicators.
              </p>
            </div>
          }
        </div>

        <!-- Referral Loop Invitation Widget -->
        <div class="mt-6">
          <app-referral-card></app-referral-card>
        </div>

      }

    </div>
  `,
  styles: [`
    .animate-pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: .5; }
    }
  `]
})
export class DashboardHomeComponent {
  readonly dashboardService = inject(DashboardService);

  memberName = computed(() => this.dashboardService.memberData()?.name || 'Guest');
  memberStatus = computed(() => this.dashboardService.memberData()?.membershipStatus || 'Inactive');
  membershipDays = computed(() => this.dashboardService.membershipDaysLeft());
  ptDays = computed(() => this.dashboardService.ptDaysLeft());
  streak = computed(() => this.dashboardService.checkInStreak());
  monthVisits = computed(() => this.dashboardService.visitsThisMonth());
  badgeLevel = computed(() => this.dashboardService.memberData()?.attendanceBadgeLevel || 0);
  earnedMonthlyBadges = computed(() => this.dashboardService.memberData()?.earnedMonthlyBadges || []);
  
  latestData = computed(() => this.dashboardService.latestMeasurement());
  trends = computed(() => this.dashboardService.somaticTrends());

  formatMonthlyBadgeId(mBadgeId: string): string {
    if (!mBadgeId) return '';
    const [year, monthStr] = mBadgeId.split('-');
    const month = parseInt(monthStr, 10);
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const monthName = monthNames[month - 1] || monthStr;
    return `${monthName} ${year}`;
  }

  expiryDateText = computed(() => {
    const data = this.dashboardService.memberData();
    if (!data || !data.membershipExpiration) return 'N/A';
    const date = data.membershipExpiration.toDate ? data.membershipExpiration.toDate() : new Date(data.membershipExpiration);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  });

  checkupDateText = computed(() => {
    const data = this.latestData();
    if (!data || !data.date) return 'N/A';
    return data.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  });

  abs(val: number): number {
    return Math.abs(val);
  }
}
