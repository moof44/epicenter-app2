import { Component, inject, computed, signal, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../core/services/dashboard.service';
import { ShareCardService } from '../core/services/share-card.service';
import { ReferralCardComponent } from '../shared/components/referral-card/referral-card.component';
import { AttendanceCalendarComponent } from '../shared/components/attendance-calendar/attendance-calendar.component';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterLink, ReferralCardComponent, AttendanceCalendarComponent],
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
        <div class="bg-bg-surface border border-bg-surface-alt p-6 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-[0_4px_20px_rgba(0,0,0,0.4)] animate-fade-in-up [animation-delay:0ms]">
          
          <!-- Avatar + Member Welcome Section -->
          <div class="flex items-center gap-4">
            <!-- Premium Avatar with Gold Gradient Ring -->
            <div class="w-16 h-16 rounded-full bg-gradient-to-tr from-gold-primary via-gold-light to-gold-primary p-[2px] shadow-[0_0_15px_rgba(212,175,55,0.3)] shrink-0">
              <div class="w-full h-full rounded-full bg-bg-surface-alt flex items-center justify-center text-gold-primary text-xl font-black font-oswald uppercase select-none">
                {{ memberInitials() }}
              </div>
            </div>
            
            <div class="flex flex-col">
              <div class="flex items-center gap-2">
                <span class="text-[10px] text-text-secondary font-bold tracking-widest uppercase">Member Profile</span>
                <!-- Status Dot -->
                <div class="flex items-center gap-1.5 ml-1">
                  <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute"></span>
                  <span class="w-2 h-2 rounded-full bg-emerald-500 relative"></span>
                  <span class="text-[9px] font-bold font-oswald uppercase tracking-widest text-emerald-400">
                    {{ memberStatus() }}
                  </span>
                </div>
              </div>
              <h1 class="text-xl sm:text-2xl font-black font-oswald text-gold-primary tracking-wide mt-0.5 uppercase">
                {{ memberName() }}
              </h1>
              <p class="text-xs text-text-secondary">Ready to crush your workout goals today?</p>
            </div>
          </div>

          <!-- Equipped Gear Showcase Sockets -->
          <div class="flex flex-col gap-2 bg-bg-surface-alt/45 border border-bg-surface-alt/45 p-3 rounded-xl min-w-[280px] self-start lg:self-center">
            <div class="flex items-center justify-between gap-4">
              <span class="text-[9px] text-gold-light font-bold uppercase tracking-wider">Equipped Showcase</span>
              <div class="flex items-center gap-1.5 shrink-0">
                @if (equippedBadges().length > 0) {
                  <button 
                    (click)="openShowcaseShareModal(); $event.stopPropagation()"
                    class="text-[8.5px] text-gold-primary hover:text-gold-light font-bold uppercase tracking-wider bg-gold-primary/10 hover:bg-gold-primary/20 border border-gold-primary/30 px-1.5 py-0.5 rounded transition-all cursor-pointer flex items-center gap-0.5 shadow-sm active:scale-95 shrink-0"
                    title="Share Showcase Card"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-2.5 h-2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186l5.308-2.654m-5.308 2.654l5.308 2.654m-9.754-2.654a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0Zm9.754-5.308a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0Zm0 10.616a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0Z" />
                    </svg>
                    Share
                  </button>
                }
                <span class="text-[8px] text-text-muted">Tap to unequip</span>
              </div>
            </div>
            
            <div class="flex gap-3 justify-around mt-1">
              @for (slotIdx of [0, 1, 2]; track slotIdx) {
                @if (getEquippedBadgeAt(slotIdx); as badge) {
                  <!-- Equipped Badge Slot -->
                  <button 
                    (click)="toggleBadgeEquip(badge.id)"
                    class="w-12 h-12 rounded-xl bg-gradient-to-b from-gold-primary/20 to-gold-primary/5 border border-gold-primary/45 flex items-center justify-center text-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_10px_rgba(212,175,55,0.15)] relative group cursor-pointer overflow-visible"
                    [title]="badge.title + ' (Click to Unequip)'"
                  >
                    <!-- Glowing Backdrop (masked to circle) -->
                    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[81%] h-[81%] rounded-full overflow-hidden pointer-events-none z-0">
                      <div [class]="'absolute inset-0 w-full h-full ' + getBadgeGlowClass(badge.id)"></div>
                      @if (badge.id === 'gold-legend') {
                        <div class="absolute inset-0 w-full h-full shimmer-ray"></div>
                      }
                    </div>
                    <span class="relative z-10">{{ badge.icon }}</span>
                    <span class="absolute -bottom-1 -right-1 text-[8px] bg-gold-primary text-bg-surface px-1.5 rounded-md font-bold scale-75 border border-bg-surface-alt z-20">EQ</span>
                  </button>
                } @else {
                  <!-- Empty Socket Slot -->
                  <div 
                    class="w-12 h-12 rounded-xl bg-bg-surface/50 border border-dashed border-bg-surface-alt/60 flex flex-col items-center justify-center text-text-muted relative"
                    title="Empty Socket. Tap an unlocked badge below to equip!"
                  >
                    <span class="text-lg font-light select-none text-text-muted/40">+</span>
                    <span class="text-[7px] text-text-muted/30 font-bold uppercase tracking-widest mt-0.5">SLOT</span>
                  </div>
                }
              }
            </div>
          </div>

        </div>

        <!-- Quick Action Launcher (Mobile & Desktop) -->
        <div class="grid grid-cols-1 gap-4 mt-6">
          <a 
            routerLink="/dashboard/workout"
            class="flex items-center justify-between p-4 bg-bg-surface border border-bg-surface-alt rounded-2xl transition-all active:scale-[0.98] hover:scale-[1.005] hover:shadow-[0_4px_20px_rgba(212,175,55,0.15)] hover:border-gold-primary/30 animate-fade-in-up [animation-delay:75ms]"
          >
            <div class="flex flex-col gap-0.5">
              <span class="text-[10px] text-gold-light font-bold uppercase tracking-wider">Workout Log</span>
              <span class="text-[10px] sm:text-xs text-text-secondary font-bold">Track Today's Lift</span>
            </div>
            <span class="text-xl">🏋️‍♂️</span>
          </a>
        </div>

        <!-- Quick Stats Cards Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          
          <!-- Membership Validity Card -->
          <div class="card-surface flex flex-col justify-between min-h-[120px] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_4px_20px_rgba(212,175,55,0.15)] hover:border-gold-primary/30 animate-fade-in-up [animation-delay:150ms]">
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
                {{ animatedMembershipDays() }} Days Left
              </div>
              <div class="text-[10px] text-text-secondary mt-1 font-bold">
                Expires: {{ expiryDateText() }}
              </div>
            </div>
          </div>

          <!-- Check-in Streak Card -->
          <div 
            [class]="'card-surface flex flex-col justify-between min-h-[120px] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] animate-fade-in-up [animation-delay:225ms] border ' + streakCardClass()"
          >
            <div class="flex items-start justify-between">
              <span class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Gym Streak</span>
              
              <!-- Flame Badge with Tier-based animations -->
              @if (streakTier() === 3) {
                <div class="relative w-7 h-7 flex items-center justify-center shrink-0">
                  <div class="absolute inset-0 rounded-lg bg-orange-500/20 animate-ping"></div>
                  <span class="p-1.5 bg-orange-950/80 text-orange-400 rounded-lg border border-orange-500/50 relative z-10 momentum-badge-t3 font-bold select-none text-xs">
                    🔥
                  </span>
                </div>
              } @else if (streakTier() === 2) {
                <div class="relative w-7 h-7 flex items-center justify-center shrink-0">
                  <div class="absolute inset-0 rounded-lg bg-orange-500/10 animate-pulse"></div>
                  <span class="p-1.5 bg-orange-950/40 text-orange-400 rounded-lg border border-orange-500/20 relative z-10 momentum-badge-t2 font-bold select-none text-xs">
                    🔥
                  </span>
                </div>
              } @else {
                <span class="p-1.5 bg-red-950/40 text-red-400 rounded-lg border border-red-500/10 select-none text-xs shrink-0">
                  🔥
                </span>
              }
            </div>
            
            <div class="mt-2">
              <div [class]="'text-2xl font-oswald ' + streakValueClass()">
                {{ animatedStreak() }} Day{{ animatedStreak() === 1 ? '' : 's' }} Active
              </div>
              <div class="text-[10px] text-text-secondary mt-1 font-bold">
                {{ streakMessage() }}
              </div>
            </div>
          </div>

          <!-- Monthly Visits Card -->
          <div class="card-surface flex flex-col justify-between min-h-[120px] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_4px_20px_rgba(212,175,55,0.15)] hover:border-gold-primary/30 animate-fade-in-up [animation-delay:300ms]">
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
                {{ animatedMonthVisits() }} Session{{ monthVisits() === 1 ? '' : 's' }}
              </div>
              <div class="text-[10px] text-text-secondary mt-1 font-bold">
                Consistent attendance
              </div>
            </div>
          </div>

          <!-- Personal Training Card -->
          <div class="card-surface flex flex-col justify-between min-h-[120px] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_4px_20px_rgba(212,175,55,0.15)] hover:border-gold-primary/30 animate-fade-in-up [animation-delay:375ms]">
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
                  {{ animatedPtDays() }} Days Left
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

        </div>

        <!-- Somatics / Biometrics Overview -->
        <div class="card-surface mt-6 flex flex-col gap-6 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(212,175,55,0.05)] hover:border-gold-primary/10 animate-fade-in-up [animation-delay:450ms]">
          <div class="border-b border-bg-surface-alt pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 class="text-xl font-bold font-oswald tracking-wide text-gold-primary uppercase">Recent Somatic Overview</h2>
              <p class="text-xs text-text-secondary mt-0.5">Biometrics from your latest body checkup</p>
            </div>
            
            @if (latestData()) {
              <button 
                (click)="openSomaticShareModal(); $event.stopPropagation()"
                class="w-full sm:w-auto h-9 px-4 border border-gold-primary/30 hover:border-gold-primary/60 bg-gold-primary/10 hover:bg-gold-primary/20 text-gold-primary text-xs font-bold font-oswald uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                title="Share Biometrics Card"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186l5.308-2.654m-5.308 2.654l5.308 2.654m-9.754-2.654a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0Zm9.754-5.308a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0Zm0 10.616a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0Z" />
                </svg>
                <span>Share Biometrics</span>
              </button>
            }
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

        <!-- Gamification Achievements Section -->
        <!-- Gamification Achievements Section (The Prestige Gear Grid) -->
        <div class="card-surface mt-6 flex flex-col gap-6 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(212,175,55,0.05)] hover:border-gold-primary/10 animate-fade-in-up [animation-delay:525ms]">
          
          <div class="border-b border-bg-surface-alt pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 class="text-xl font-bold font-oswald tracking-wide text-gold-primary uppercase">My Equipment Locker</h2>
              <p class="text-xs text-text-secondary mt-0.5">Socket unlocked badges to brag on your profile. Click unlocked to toggle.</p>
            </div>
            
            <div class="text-[10px] font-bold text-text-muted bg-bg-surface-alt/50 border border-bg-surface-alt/30 px-3 py-1.5 rounded-lg self-start sm:self-center">
              Active Streak: <span class="text-red-400">🔥 {{ streak() }} Days</span>
            </div>
          </div>

          <!-- Rolling Tiers Section -->
          <div class="flex flex-col gap-4">
            <h3 class="text-xs font-bold font-oswald text-gold-light uppercase tracking-wider">Attendance Tier Ranks</h3>
            
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              @for (badge of badgesWithProgress(); track badge.id) {
                @if (badge.type === 'tier') {
                  <div 
                    (click)="badge.isUnlocked ? toggleBadgeEquip(badge.id) : null"
                    [class.border-gold-primary/40]="badge.isEquipped"
                    [class.bg-gradient-to-b]="badge.isUnlocked"
                    [class.from-gold-primary/10]="badge.isUnlocked && badge.isEquipped"
                    [class.to-gold-primary/5]="badge.isUnlocked && badge.isEquipped"
                    [class.cursor-pointer]="badge.isUnlocked"
                    [class.hover:border-gold-primary/20]="badge.isUnlocked"
                    class="relative flex items-center gap-4 p-4 rounded-2xl bg-bg-surface-alt/20 border border-bg-surface-alt/40 transition-all select-none group"
                  >
                    <!-- Badge Icon / Graphic with circular SVG progress ring -->
                    <div class="relative w-16 h-16 shrink-0 flex items-center justify-center rounded-xl bg-bg-surface-alt/40 border border-bg-surface-alt/60 overflow-visible">
                      <!-- Glowing Backdrop (masked to circle) -->
                      @if (badge.isUnlocked) {
                        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[81%] h-[81%] rounded-full overflow-hidden pointer-events-none z-0">
                          <div [class]="'absolute inset-0 w-full h-full ' + getBadgeGlowClass(badge.id)"></div>
                          @if (badge.id === 'gold-legend') {
                            <div class="absolute inset-0 w-full h-full shimmer-ray"></div>
                          }
                        </div>
                      }

                      <!-- Circular SVG Progress Ring (behind the badge) -->
                      <svg class="absolute w-full h-full -rotate-90 select-none pointer-events-none z-10" viewBox="0 0 36 36">
                        <!-- Background Circle -->
                        <path 
                          class="text-bg-surface-alt/80 stroke-current" 
                          stroke-width="2.5" 
                          fill="none" 
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <!-- Foreground Progress Ring -->
                        <path 
                          [class.text-gold-primary]="badge.isUnlocked"
                          [class.text-gold-light/35]="!badge.isUnlocked"
                          class="stroke-current transition-all duration-500 ease-out" 
                          [attr.stroke-dasharray]="badge.percentage + ', 100'"
                          stroke-width="2.5" 
                          stroke-linecap="round"
                          fill="none" 
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      
                      <!-- Badge Graphic (Emoji) -->
                      <span 
                        [class.grayscale]="!badge.isUnlocked" 
                        [class.opacity-40]="!badge.isUnlocked" 
                        class="text-3xl select-none relative z-10 transition-transform duration-300 group-hover:scale-110"
                      >
                        {{ badge.isUnlocked ? badge.icon : '🔒' }}
                      </span>
                    </div>

                    <!-- Badge Details -->
                    <div class="flex-1 flex flex-col min-w-0">
                      <div class="flex items-center gap-1.5">
                        <span 
                          [class.text-text-primary]="badge.isUnlocked"
                          [class.text-text-secondary]="!badge.isUnlocked"
                          class="text-xs font-bold font-oswald uppercase tracking-wider truncate"
                        >
                          {{ badge.title }}
                        </span>
                        
                        @if (badge.isEquipped) {
                          <span class="text-[8px] font-black uppercase text-gold-primary bg-gold-dim px-1.5 py-0.5 rounded border border-gold-primary/20 shrink-0">Equipped</span>
                        } @else if (badge.isUnlocked) {
                          <span class="text-[8px] font-black uppercase text-emerald-400 bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-800/30 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">Equip</span>
                        }
                      </div>

                      <span class="text-[10px] text-text-secondary truncate mt-0.5">{{ badge.requirement }}</span>
                      
                      <!-- Progress text and percentage bar -->
                      <div class="flex items-center justify-between mt-2 text-[9px]">
                        <span class="text-text-muted font-mono font-bold">{{ badge.current }}/{{ badge.target }} visits</span>
                        <span class="font-bold font-mono text-gold-primary">{{ badge.percentage }}%</span>
                      </div>
                    </div>
                    
                    <!-- Share Button (direct child of the card container) -->
                    @if (badge.isUnlocked) {
                      <button 
                        (click)="openShareModal(badge); $event.stopPropagation()"
                        class="p-2 text-text-secondary hover:text-gold-primary hover:bg-bg-surface-alt/80 rounded-xl transition-colors cursor-pointer z-20 shrink-0 self-center"
                        title="Share Achievement"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186l5.308-2.654m-5.308 2.654l5.308 2.654m-9.754-2.654a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0Zm9.754-5.308a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0Zm0 10.616a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0Z" />
                        </svg>
                      </button>
                    }
                  </div>
                }
              }
            </div>
          </div>

          <div class="border-t border-bg-surface-alt/60 my-2"></div>

          <!-- Monthly shelf Section -->
          <div class="flex flex-col gap-4">
            <h3 class="text-xs font-bold font-oswald text-gold-light uppercase tracking-wider">Monthly Collectible Trophies</h3>
            
            <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3.5">
              @for (badge of badgesWithProgress(); track badge.id) {
                @if (badge.type === 'monthly') {
                  <div 
                    (click)="badge.isUnlocked ? toggleBadgeEquip(badge.id) : null"
                    [class.border-gold-primary/40]="badge.isEquipped"
                    [class.bg-gradient-to-b]="badge.isUnlocked"
                    [class.from-gold-primary/10]="badge.isUnlocked && badge.isEquipped"
                    [class.to-gold-primary/5]="badge.isUnlocked && badge.isEquipped"
                    [class.cursor-pointer]="badge.isUnlocked"
                    [class.hover:border-gold-primary/20]="badge.isUnlocked"
                    class="relative flex flex-col items-center justify-center p-3.5 rounded-2xl bg-bg-surface-alt/10 border border-bg-surface-alt/40 transition-all select-none group text-center"
                    [title]="badge.isUnlocked ? (badge.isEquipped ? 'Click to Unequip' : 'Click to Equip') : 'Locked: Requires 4+ visits. ' + badge.current + '/4 visits'"
                  >
                    <!-- Progress ring + Icon container -->
                    <div class="relative w-12 h-12 flex items-center justify-center rounded-xl bg-bg-surface-alt/30 border border-bg-surface-alt/40 mb-2 overflow-visible">
                      <!-- Glowing Backdrop (masked to circle) -->
                      @if (badge.isUnlocked) {
                        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[81%] h-[81%] rounded-full overflow-hidden pointer-events-none z-0">
                          <div [class]="'absolute inset-0 w-full h-full ' + getBadgeGlowClass(badge.id)"></div>
                        </div>
                      }

                      <!-- Circular SVG Progress Ring -->
                      <svg class="absolute w-full h-full -rotate-90 select-none pointer-events-none z-10" viewBox="0 0 36 36">
                        <!-- Background Circle -->
                        <path 
                          class="text-bg-surface-alt/80 stroke-current" 
                          stroke-width="2.5" 
                          fill="none" 
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <!-- Foreground Progress Ring -->
                        <path 
                          [class.text-gold-primary]="badge.isUnlocked"
                          [class.text-gold-light/35]="!badge.isUnlocked"
                          class="stroke-current transition-all duration-500 ease-out" 
                          [attr.stroke-dasharray]="badge.percentage + ', 100'"
                          stroke-width="2.5" 
                          stroke-linecap="round"
                          fill="none" 
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>

                      <!-- Badge Graphic -->
                      <span 
                        [class.grayscale]="!badge.isUnlocked" 
                        [class.opacity-45]="!badge.isUnlocked" 
                        class="text-2xl select-none relative z-10 transition-transform duration-300 group-hover:scale-110"
                      >
                        {{ badge.isUnlocked ? badge.icon : '🔒' }}
                      </span>
                    </div>

                    <!-- Title -->
                    <span class="text-[10px] font-bold text-text-primary uppercase tracking-wider font-oswald mt-0.5 truncate max-w-full px-1">
                      {{ badge.title }}
                    </span>
                    
                    <!-- Progress fraction text -->
                    <span class="text-[8px] text-text-muted mt-0.5 font-mono font-bold">
                      @if (badge.isUnlocked) {
                        <span class="text-gold-primary">Secured</span>
                      } @else {
                        {{ badge.current }}/4 visits
                      }
                    </span>

                    @if (badge.isEquipped) {
                      <div class="absolute -top-1 -right-1 text-[7px] font-black uppercase text-gold-primary bg-bg-surface px-1.5 py-0.5 rounded-md border border-gold-primary/30 shadow-md">EQ</div>
                    }
                    
                    <!-- Share Button (positioned top-left absolutely) -->
                    @if (badge.isUnlocked) {
                      <button 
                        (click)="openShareModal(badge); $event.stopPropagation()"
                        class="absolute top-1.5 left-1.5 p-1 text-text-secondary hover:text-gold-primary hover:bg-bg-surface rounded-lg transition-colors cursor-pointer z-20"
                        title="Share Achievement"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186l5.308-2.654m-5.308 2.654l5.308 2.654m-9.754-2.654a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0Zm9.754-5.308a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0Zm0 10.616a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0Z" />
                        </svg>
                      </button>
                    }
                  </div>
                }
              }
            </div>
          </div>
          
        </div>

        <!-- Copy of Attendance Calendar (Dashboard Home) -->
        <div class="card-surface mt-6 flex flex-col gap-4 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(212,175,55,0.05)] hover:border-gold-primary/10 animate-fade-in-up [animation-delay:600ms]">
          <div class="border-b border-bg-surface-alt pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 class="text-xl font-bold font-oswald tracking-wide text-gold-primary uppercase">My Check-In Calendar</h2>
              <p class="text-xs text-text-secondary mt-0.5">Quick overview of your active check-in history</p>
            </div>
            
            <div class="flex items-center gap-2 w-full sm:w-auto">
              <button 
                (click)="openConsistencyShareModal(); $event.stopPropagation()"
                class="w-full sm:w-auto h-9 px-4 border border-gold-primary/30 hover:border-gold-primary/60 bg-gold-primary/10 hover:bg-gold-primary/20 text-gold-primary text-xs font-bold font-oswald uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                title="Share Consistency Card"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186l5.308-2.654m-5.308 2.654l5.308 2.654m-9.754-2.654a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0Zm9.754-5.308a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0Zm0 10.616a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0Z" />
                </svg>
                <span>Share Consistency</span>
              </button>

              <a 
                routerLink="/dashboard/attendance"
                class="w-full sm:w-auto h-9 px-4 border border-bg-surface-alt hover:border-text-secondary bg-bg-surface/50 text-text-secondary hover:text-text-primary text-xs font-bold font-oswald uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
              >
                <span>View Detailed Logs</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </div>
          </div>
          
          <app-attendance-calendar [attendanceDates]="attendanceDates()"></app-attendance-calendar>
        </div>

        <!-- Referral Loop Invitation Widget -->
        <div class="mt-6">
          <app-referral-card></app-referral-card>
        </div>

        <!-- Share Achievement Modal -->
        @if (isShareModalOpen()) {
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div class="bg-bg-surface border border-bg-surface-alt rounded-2xl w-full max-w-sm overflow-hidden shadow-[0_10px_30px_rgba(212,175,55,0.15)] flex flex-col max-h-[90vh] animate-scale-up">
              
              <!-- Modal Header -->
              <div class="p-4 border-b border-bg-surface-alt flex justify-between items-center">
                <h3 class="font-bold font-oswald text-gold-light uppercase tracking-wider text-sm">{{ shareModalTitle() }}</h3>
                <button 
                  (click)="closeShareModal()" 
                  class="text-text-secondary hover:text-text-primary text-lg"
                >
                  ✕
                </button>
              </div>

              <!-- Modal Body -->
              <div class="p-5 flex-1 flex flex-col items-center justify-center overflow-y-auto">
                @if (generatingShareImage()) {
                  <!-- Loading Spinner -->
                  <div class="flex flex-col items-center justify-center py-12 gap-4">
                    <div class="w-12 h-12 border-4 border-gold-dim border-t-gold-primary rounded-full animate-spin"></div>
                    <span class="text-xs text-text-secondary font-medium font-mono">Forging your custom Story Card...</span>
                  </div>
                } @else if (shareImageUrl()) {
                  <!-- Image Preview -->
                  <div class="relative w-full aspect-[9/16] max-h-[50vh] rounded-xl overflow-hidden border border-bg-surface-alt shadow-lg">
                    <img 
                      [src]="shareImageUrl()" 
                      alt="Share Card Preview" 
                      class="w-full h-full object-contain bg-[#0a0a0b]"
                    />
                  </div>
                } @else {
                  <!-- Error Fallback -->
                  <div class="text-center py-6 text-red-400 text-xs">
                    ⚠️ Failed to generate card preview. Please try again.
                  </div>
                }
              </div>

              <!-- Modal Footer -->
              <div class="p-4 border-t border-bg-surface-alt flex flex-col gap-2 bg-bg-surface-alt/25">
                @if (!generatingShareImage() && shareImageUrl()) {
                  <button 
                    (click)="triggerNativeShare()"
                    class="btn-primary w-full h-11 font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5"
                  >
                    <span>{{ canUseWebShare() ? 'Share to Stories' : 'Download Graphic' }}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15" />
                    </svg>
                  </button>
                  
                  @if (!canUseWebShare()) {
                    <button 
                      (click)="copyShareCaption()"
                      class="w-full h-10 border border-bg-surface-alt hover:bg-bg-surface-alt/40 text-text-primary text-[10px] font-bold font-oswald uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>Copy Text Caption</span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5 text-gold-primary">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.524 3h-2.997a2.25 2.25 0 0 0-2.143 1.888L7.5 9v9a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 19.5 18V9a2.25 2.25 0 0 0-1.584-2.112L15.666 3.888Z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 16.5h-3m3-3h-3" />
                      </svg>
                    </button>
                  }
                }
                
                <button 
                  (click)="closeShareModal()"
                  class="w-full h-10 border border-transparent hover:text-text-primary text-text-secondary text-[10px] font-bold font-oswald uppercase tracking-wider rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>

            </div>
          </div>
        }

      }

    </div>
  `,
  styles: [`
    @keyframes glow-pulse-bronze {
      0%, 100% { opacity: 0.45; transform: scale(0.96); }
      50% { opacity: 0.8; transform: scale(1.04); }
    }
    @keyframes glow-pulse-silver {
      0%, 100% { opacity: 0.6; transform: scale(0.95); }
      50% { opacity: 0.9; transform: scale(1.06); }
    }
    @keyframes glow-pulse-gold {
      0%, 100% { opacity: 0.7; transform: scale(0.95); }
      50% { opacity: 0.95; transform: scale(1.10); }
    }
    @keyframes glow-pulse-monthly {
      0%, 100% { opacity: 0.35; transform: scale(0.96); }
      50% { opacity: 0.7; transform: scale(1.04); }
    }
    @keyframes rotate-slow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .badge-glow-bronze {
      background: radial-gradient(circle, rgba(220, 130, 50, 0.7) 0%, rgba(220, 130, 50, 0.2) 60%, rgba(220, 130, 50, 0) 75%);
      animation: glow-pulse-bronze 3s ease-in-out infinite;
    }
    .badge-glow-silver {
      background: radial-gradient(circle, rgba(165, 243, 252, 0.85) 0%, rgba(165, 243, 252, 0.3) 60%, rgba(165, 243, 252, 0) 80%);
      animation: glow-pulse-silver 2.2s ease-in-out infinite;
    }
    .badge-glow-gold {
      background: radial-gradient(circle, rgba(251, 191, 36, 0.95) 0%, rgba(251, 191, 36, 0.4) 65%, rgba(251, 191, 36, 0) 85%);
      animation: glow-pulse-gold 1.6s ease-in-out infinite;
    }
    .badge-glow-monthly {
      background: radial-gradient(circle, rgba(192, 132, 252, 0.5) 0%, rgba(192, 132, 252, 0) 70%);
      animation: glow-pulse-monthly 2.8s ease-in-out infinite;
    }

    /* Conic light rays overlay for Gold badge */
    .shimmer-ray {
      background: conic-gradient(from 0deg, transparent, rgba(251, 191, 36, 0.15), transparent 30%, transparent, rgba(251, 191, 36, 0.15), transparent 70%);
      animation: rotate-slow 10s linear infinite;
    }

    @keyframes pulse-flame-halo {
      0%, 100% { box-shadow: 0 0 5px rgba(249, 115, 22, 0.4); }
      50% { box-shadow: 0 0 15px rgba(249, 115, 22, 0.8); }
    }
    @keyframes bg-pan-fire {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes ember-glow-card {
      0%, 100% { 
        border-color: rgba(239, 68, 68, 0.15); 
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), 0 0 8px rgba(239, 68, 68, 0.05); 
      }
      50% { 
        border-color: rgba(239, 68, 68, 0.35); 
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), 0 0 15px rgba(239, 68, 68, 0.15); 
      }
    }
    @keyframes blaze-glow-card {
      0%, 100% { 
        border-color: rgba(249, 115, 22, 0.25); 
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), 0 0 12px rgba(249, 115, 22, 0.08); 
      }
      50% { 
        border-color: rgba(249, 115, 22, 0.55); 
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), 0 0 25px rgba(249, 115, 22, 0.25); 
      }
    }
    @keyframes supernova-glow-card {
      0%, 100% { 
        border-color: rgba(249, 115, 22, 0.4); 
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), 0 0 15px rgba(249, 115, 22, 0.15), 0 0 25px rgba(239, 68, 68, 0.08); 
      }
      50% { 
        border-color: rgba(251, 191, 36, 0.7); 
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), 0 0 28px rgba(249, 115, 22, 0.4), 0 0 50px rgba(239, 68, 68, 0.22); 
      }
    }

    .momentum-badge-t2 {
      animation: pulse-flame-halo 2s infinite ease-in-out;
    }
    .momentum-badge-t3 {
      animation: pulse-flame-halo 1s infinite ease-in-out;
    }
    .momentum-card-t1 {
      background: radial-gradient(circle at 90% 25%, rgba(239, 68, 68, 0.04) 0%, var(--bg-surface) 60%);
      animation: ember-glow-card 3.5s infinite ease-in-out;
    }
    .momentum-card-t2 {
      background: radial-gradient(circle at 90% 25%, rgba(249, 115, 22, 0.08) 0%, var(--bg-surface) 65%);
      animation: blaze-glow-card 2.5s infinite ease-in-out;
    }
    .momentum-card-t3 {
      background: linear-gradient(-45deg, #0d0d0e, #26160d, #0d0d0e, #331d0f);
      background-size: 400% 400%;
      animation: bg-pan-fire 8s infinite ease-in-out, supernova-glow-card 2s infinite ease-in-out;
    }
  `]
})
export class DashboardHomeComponent {
  readonly dashboardService = inject(DashboardService);
  readonly shareCardService = inject(ShareCardService);

  // Animated Stats Signals
  animatedMembershipDays = signal<number>(0);
  animatedPtDays = signal<number>(0);
  animatedStreak = signal<number>(0);
  animatedMonthVisits = signal<number>(0);

  private animationFrames = new Map<any, number>();

  constructor() {
    effect(() => {
      const target = this.membershipDays();
      this.animateValue(target, this.animatedMembershipDays);
    });
    effect(() => {
      const target = this.ptDays();
      this.animateValue(target, this.animatedPtDays);
    });
    effect(() => {
      const target = this.streak();
      this.animateValue(target, this.animatedStreak);
    });
    effect(() => {
      const target = this.monthVisits();
      this.animateValue(target, this.animatedMonthVisits);
    });
  }

  private animateValue(targetVal: number, animateSignal: any) {
    if (this.animationFrames.has(animateSignal)) {
      cancelAnimationFrame(this.animationFrames.get(animateSignal)!);
      this.animationFrames.delete(animateSignal);
    }

    if (!targetVal || targetVal <= 0) {
      animateSignal.set(0);
      return;
    }
    const duration = 800; // ms
    const startTime = performance.now();
    const startVal = untracked(() => animateSignal());
    
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.round(startVal + (targetVal - startVal) * easeProgress);
      animateSignal.set(currentVal);
      if (progress < 1) {
        const frameId = requestAnimationFrame(tick);
        this.animationFrames.set(animateSignal, frameId);
      } else {
        this.animationFrames.delete(animateSignal);
      }
    };
    
    const frameId = requestAnimationFrame(tick);
    this.animationFrames.set(animateSignal, frameId);
  }

  // Sharing Card Signals & State
  isShareModalOpen = signal<boolean>(false);
  generatingShareImage = signal<boolean>(false);
  shareImageUrl = signal<string | null>(null);
  shareBlob = signal<Blob | null>(null);
  shareBadgeTitle = '';
  shareBadgeId = '';
  shareModalTitle = signal<string>('Share Achievement');

  async openShareModal(badge: any) {
    this.shareModalTitle.set('Share Achievement');
    this.shareBadgeTitle = badge.title;
    this.shareBadgeId = badge.id;
    this.isShareModalOpen.set(true);
    this.generatingShareImage.set(true);
    this.shareImageUrl.set(null);
    this.shareBlob.set(null);

    try {
      const blob = await this.shareCardService.generateShareCard(
        this.memberName(),
        [badge],
        this.streak()
      );
      this.shareBlob.set(blob);
      const url = URL.createObjectURL(blob);
      this.shareImageUrl.set(url);
    } catch (err) {
      console.error('Failed to generate share card image:', err);
    } finally {
      this.generatingShareImage.set(false);
    }
  }

  async openShowcaseShareModal() {
    const equipped = this.equippedBadges().map(id => {
      return this.badgesWithProgress().find(b => b.id === id);
    }).filter(Boolean) as any[];

    if (equipped.length === 0) {
      alert('Equip at least one badge to share your showcase!');
      return;
    }

    this.shareModalTitle.set('Share Showcase');
    this.shareBadgeTitle = equipped.length === 1 ? equipped[0].title : `${equipped.length} Badges`;
    this.shareBadgeId = equipped.map(b => b.id).join('-');
    this.isShareModalOpen.set(true);
    this.generatingShareImage.set(true);
    this.shareImageUrl.set(null);
    this.shareBlob.set(null);

    try {
      const blob = await this.shareCardService.generateShareCard(
        this.memberName(),
        equipped,
        this.streak()
      );
      this.shareBlob.set(blob);
      const url = URL.createObjectURL(blob);
      this.shareImageUrl.set(url);
    } catch (err) {
      console.error('Failed to generate showcase share card image:', err);
    } finally {
      this.generatingShareImage.set(false);
    }
  }

  closeShareModal() {
    this.isShareModalOpen.set(false);
    const url = this.shareImageUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.shareImageUrl.set(null);
    this.shareBlob.set(null);
  }

  canUseWebShare(): boolean {
    return typeof navigator.share !== 'undefined' && typeof navigator.canShare !== 'undefined';
  }

  async triggerNativeShare() {
    const blob = this.shareBlob();
    if (!blob) return;

    const isShowcase = this.shareModalTitle() === 'Share Showcase';
    const isConsistency = this.shareModalTitle() === 'Share Consistency';
    const isBiometrics = this.shareModalTitle() === 'Share Biometrics';
    const filename = isConsistency 
      ? `epicenter-consistency-calendar.png`
      : isShowcase 
        ? `epicenter-equipped-showcase.png` 
        : isBiometrics
          ? `epicenter-biometrics.png`
          : `epicenter-${this.shareBadgeId}-badge.png`;
    const titleText = isConsistency
      ? 'Epicenter Gym Consistency Calendar'
      : isShowcase 
        ? 'Epicenter Gym Showcase' 
        : isBiometrics
          ? 'Epicenter Gym Biometrics Overview'
          : 'Epicenter Gym Achievement';
    const textCaption = isConsistency
      ? `Staying consistent with my workout goals at Epicenter Gym! 🔥`
      : isShowcase 
        ? `Check out my equipped showcase loadout at Epicenter Gym! 🔥`
        : isBiometrics
          ? `My latest body checkup results at Epicenter Gym! 📊`
          : `Unlocking achievements at Epicenter Gym! 🔥`;

    if (this.canUseWebShare()) {
      try {
        const file = new File([blob], filename, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: titleText,
            text: textCaption
          });
        } else {
          this.triggerDownloadFallback();
        }
      } catch (err) {
        console.error('Native share failed, using download fallback:', err);
        this.triggerDownloadFallback();
      }
    } else {
      this.triggerDownloadFallback();
    }
  }

  triggerDownloadFallback() {
    const url = this.shareImageUrl();
    if (!url) return;
    const isShowcase = this.shareModalTitle() === 'Share Showcase';
    const isConsistency = this.shareModalTitle() === 'Share Consistency';
    const filename = isConsistency
      ? `epicenter-consistency-calendar.png`
      : isShowcase
        ? `epicenter-equipped-showcase.png`
        : `epicenter-${this.shareBadgeId}-badge.png`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  copyShareCaption() {
    const isShowcase = this.shareModalTitle() === 'Share Showcase';
    const isConsistency = this.shareModalTitle() === 'Share Consistency';
    const isBiometrics = this.shareModalTitle() === 'Share Biometrics';
    const caption = isConsistency
      ? `Staying consistent with my workout goals at Epicenter Gym! 🔥 Check out epicentergym.ph`
      : isShowcase
        ? `Check out my equipped showcase loadout at Epicenter Gym! 🔥 Leveling up daily at epicentergym.ph`
        : isBiometrics
          ? `Just tracked my latest somatic body checkup biometrics at Epicenter Gym! 📊 Check out epicentergym.ph`
          : `Just unlocked the ${this.shareBadgeTitle} badge at Epicenter Gym! 🔥 Check out epicentergym.ph`;
      
    navigator.clipboard.writeText(caption).then(() => {
      alert('Caption text copied to clipboard! You can paste it when posting your graphic.');
    }).catch(err => {
      console.error('Failed to copy text:', err);
    });
  }

  async openConsistencyShareModal() {
    this.shareModalTitle.set('Share Consistency');
    this.shareBadgeTitle = 'Consistency Calendar';
    this.shareBadgeId = 'consistency-calendar';
    this.isShareModalOpen.set(true);
    this.generatingShareImage.set(true);
    this.shareImageUrl.set(null);
    this.shareBlob.set(null);

    try {
      const blob = await this.shareCardService.generateConsistencyCard(
        this.memberName(),
        this.streak(),
        this.highestTierBadge(),
        this.attendanceDates()
      );
      this.shareBlob.set(blob);
      const url = URL.createObjectURL(blob);
      this.shareImageUrl.set(url);
    } catch (err) {
      console.error('Failed to generate consistency card image:', err);
    } finally {
      this.generatingShareImage.set(false);
    }
  }

  async openSomaticShareModal() {
    this.shareModalTitle.set('Share Biometrics');
    this.shareBadgeTitle = 'Biometrics Overview';
    this.shareBadgeId = 'biometrics';
    this.isShareModalOpen.set(true);
    this.generatingShareImage.set(true);
    this.shareImageUrl.set(null);
    this.shareBlob.set(null);

    try {
      const blob = await this.shareCardService.generateSomaticCard(
        this.memberName(),
        this.latestData() as any,
        this.trends() as any,
        this.streak()
      );
      this.shareBlob.set(blob);
      const url = URL.createObjectURL(blob);
      this.shareImageUrl.set(url);
    } catch (err) {
      console.error('Failed to generate somatic checkup card image:', err);
    } finally {
      this.generatingShareImage.set(false);
    }
  }

  highestTierBadge = computed(() => {
    const lvl = this.badgeLevel();
    if (lvl === 3) {
      return { title: 'Gold Legend', icon: '👑' };
    } else if (lvl === 2) {
      return { title: 'Silver Consistent', icon: '🥈' };
    } else if (lvl === 1) {
      return { title: 'Bronze Active', icon: '🥉' };
    }
    return null;
  });

  memberName = computed(() => this.dashboardService.memberData()?.name || 'Guest');
  memberStatus = computed(() => this.dashboardService.memberData()?.membershipStatus || 'Inactive');
  membershipDays = computed(() => this.dashboardService.membershipDaysLeft());
  ptDays = computed(() => this.dashboardService.ptDaysLeft());
  streak = computed(() => this.dashboardService.checkInStreak());
  streakTier = computed(() => {
    const s = this.streak();
    if (s >= 6) return 3;
    if (s >= 3) return 2;
    return s > 0 ? 1 : 0;
  });
  streakCardClass = computed(() => {
    const tier = this.streakTier();
    if (tier === 3) return 'momentum-card-t3';
    if (tier === 2) return 'momentum-card-t2';
    if (tier === 1) return 'momentum-card-t1';
    return 'border-bg-surface-alt hover:border-gold-primary/10';
  });
  streakValueClass = computed(() => {
    const tier = this.streakTier();
    if (tier === 3) return 'text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300 font-black tracking-wide';
    if (tier === 2) return 'text-orange-400 font-extrabold';
    if (tier === 1) return 'text-red-400 font-bold';
    return 'text-text-muted';
  });
  streakMessage = computed(() => {
    const tier = this.streakTier();
    if (tier === 3) return 'SUPERNOVA MOMENTUM! Unstoppable! 🚀';
    if (tier === 2) return "You're building heat! Keep it up! ⚡";
    if (tier === 1) return 'Keep the flame burning!';
    return 'Start your streak today!';
  });
  monthVisits = computed(() => this.dashboardService.visitsThisMonth());
  badgeLevel = computed(() => this.dashboardService.memberData()?.attendanceBadgeLevel || 0);
  earnedMonthlyBadges = computed(() => this.dashboardService.memberData()?.earnedMonthlyBadges || []);
  equippedBadges = computed<string[]>(() => this.dashboardService.memberData()?.equippedBadges || []);
  
  latestData = computed(() => this.dashboardService.latestMeasurement());
  trends = computed(() => this.dashboardService.somaticTrends());

  memberInitials = computed(() => {
    const name = this.memberName();
    if (!name || name === 'Guest') return 'G';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  });

  allAvailableBadges = computed(() => {
    const badges: Array<{
      id: string;
      title: string;
      icon: string;
      requirement: string;
      type: 'tier' | 'monthly';
      reqVisits: number;
    }> = [
      { id: 'bronze-active', title: 'Bronze Active', icon: '🥉', requirement: '11+ visits in last 30d', type: 'tier', reqVisits: 11 },
      { id: 'silver-consistent', title: 'Silver Consistent', icon: '🥈', requirement: '22+ visits in last 60d', type: 'tier', reqVisits: 22 },
      { id: 'gold-legend', title: 'Gold Legend', icon: '👑', requirement: '33+ visits in last 90d', type: 'tier', reqVisits: 33 },
    ];
    
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    
    let year = 2026;
    let month = 1;
    
    while (year < currentYear || (year === currentYear && month <= currentMonth)) {
      const mId = `${year}-${String(month).padStart(2, '0')}`;
      badges.push({
        id: mId,
        title: this.formatMonthlyBadgeId(mId),
        icon: '🏅',
        requirement: '4+ visits in calendar month',
        type: 'monthly',
        reqVisits: 4
      });
      
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }
    
    return badges;
  });

  attendanceDates = computed(() => {
    const records = this.dashboardService.attendanceRecords();
    return records.map(r => {
      const date = r.checkInTime;
      if (!date) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }).filter(Boolean);
  });

  formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  visits30 = computed(() => {
    const dates = this.attendanceDates();
    const today = new Date();
    const limitDate = new Date(today);
    limitDate.setDate(limitDate.getDate() - 29);
    const limitStr = this.formatLocalDate(limitDate);
    const todayStr = this.formatLocalDate(today);
    return dates.filter(d => d >= limitStr && d <= todayStr).length;
  });

  visits60 = computed(() => {
    const dates = this.attendanceDates();
    const today = new Date();
    const limitDate = new Date(today);
    limitDate.setDate(limitDate.getDate() - 59);
    const limitStr = this.formatLocalDate(limitDate);
    const todayStr = this.formatLocalDate(today);
    return dates.filter(d => d >= limitStr && d <= todayStr).length;
  });

  visits90 = computed(() => {
    const dates = this.attendanceDates();
    const today = new Date();
    const limitDate = new Date(today);
    limitDate.setDate(limitDate.getDate() - 89);
    const limitStr = this.formatLocalDate(limitDate);
    const todayStr = this.formatLocalDate(today);
    return dates.filter(d => d >= limitStr && d <= todayStr).length;
  });

  badgesWithProgress = computed(() => {
    const list = this.allAvailableBadges();
    const lvl = this.badgeLevel();
    const earnedMonthlies = this.earnedMonthlyBadges();
    const v30 = this.visits30();
    const v60 = this.visits60();
    const v90 = this.visits90();
    const vMonth = this.monthVisits();
    
    const today = new Date();
    const currentYearMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    return list.map(badge => {
      let current = 0;
      let target = 4;
      let isUnlocked = false;
      
      if (badge.id === 'bronze-active') {
        current = v30;
        target = 11;
        isUnlocked = lvl >= 1 || current >= target;
      } else if (badge.id === 'silver-consistent') {
        current = v60;
        target = 22;
        isUnlocked = lvl >= 2 || current >= target;
      } else if (badge.id === 'gold-legend') {
        current = v90;
        target = 33;
        isUnlocked = lvl >= 3 || current >= target;
      } else {
        isUnlocked = earnedMonthlies.includes(badge.id);
        target = 4;
        if (badge.id === currentYearMonthStr) {
          current = vMonth;
          if (current >= target) {
            isUnlocked = true;
          }
        } else {
          current = isUnlocked ? 4 : 0;
        }
      }
      
      const percentage = Math.min(100, Math.round((current / target) * 100));
      const isEquipped = this.equippedBadges().includes(badge.id);
      
      return {
        ...badge,
        current,
        target,
        isUnlocked,
        percentage,
        isEquipped
      };
    });
  });

  getEquippedBadgeAt(index: number) {
    const equipped = this.equippedBadges();
    const badgeId = equipped[index];
    if (!badgeId) return null;
    return this.badgesWithProgress().find(b => b.id === badgeId) || null;
  }

  async toggleBadgeEquip(badgeId: string) {
    const current = [...this.equippedBadges()];
    const index = current.indexOf(badgeId);
    
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      if (current.length >= 3) {
        alert('Maximum 3 badges can be equipped. Unequip a badge first!');
        return;
      }
      current.push(badgeId);
    }
    
    try {
      await this.dashboardService.updateEquippedBadges(current);
    } catch (err) {
      console.error('Failed to update equipped badges:', err);
    }
  }

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

  getBadgeGlowClass(badgeId: string): string {
    if (badgeId === 'bronze-active') return 'badge-glow-bronze';
    if (badgeId === 'silver-consistent') return 'badge-glow-silver';
    if (badgeId === 'gold-legend') return 'badge-glow-gold';
    return 'badge-glow-bronze';
  }
}
