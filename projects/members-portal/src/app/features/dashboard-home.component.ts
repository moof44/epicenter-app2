import { Component, inject, computed, signal } from '@angular/core';
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
        <div class="bg-bg-surface border border-bg-surface-alt p-6 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-[0_4px_20px_rgba(0,0,0,0.4)] animate-fade-in">
          
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
                    class="w-12 h-12 rounded-xl bg-gradient-to-b from-gold-primary/20 to-gold-primary/5 border border-gold-primary/45 flex items-center justify-center text-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_10px_rgba(212,175,55,0.15)] relative group cursor-pointer"
                    [title]="badge.title + ' (Click to Unequip)'"
                  >
                    {{ badge.icon }}
                    <span class="absolute -bottom-1 -right-1 text-[8px] bg-gold-primary text-bg-surface px-1.5 rounded-md font-bold scale-75 border border-bg-surface-alt">EQ</span>
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

        <!-- Copy of Attendance Calendar (Dashboard Home) -->
        <div class="card-surface mt-6 flex flex-col gap-4 animate-fade-in">
          <div class="border-b border-bg-surface-alt pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 class="text-xl font-bold font-oswald tracking-wide text-gold-primary uppercase">My Check-In Calendar</h2>
              <p class="text-xs text-text-secondary mt-0.5">Quick overview of your active check-in history</p>
            </div>
            
            <a 
              routerLink="/dashboard/attendance"
              class="w-full sm:w-auto h-9 px-4 border border-gold-primary/30 hover:border-gold-primary/60 bg-gold-primary/10 hover:bg-gold-primary/20 text-gold-primary text-xs font-bold font-oswald uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
            >
              <span>View Detailed Logs</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </a>
          </div>
          
          <app-attendance-calendar [attendanceDates]="attendanceDates()"></app-attendance-calendar>
        </div>

        <!-- Gamification Achievements Section -->
        <!-- Gamification Achievements Section (The Prestige Gear Grid) -->
        <div class="card-surface mt-6 flex flex-col gap-6 animate-fade-in">
          
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
                    <div class="relative w-16 h-16 shrink-0 flex items-center justify-center rounded-xl bg-bg-surface-alt/40 border border-bg-surface-alt/60">
                      <!-- Circular SVG Progress Ring (behind the badge) -->
                      <svg class="absolute w-full h-full -rotate-90 select-none pointer-events-none" viewBox="0 0 36 36">
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
                    <div class="relative w-12 h-12 flex items-center justify-center rounded-xl bg-bg-surface-alt/30 border border-bg-surface-alt/40 mb-2">
                      <!-- Circular SVG Progress Ring -->
                      <svg class="absolute w-full h-full -rotate-90 select-none pointer-events-none" viewBox="0 0 36 36">
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

        <!-- Share Achievement Modal -->
        @if (isShareModalOpen()) {
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div class="bg-bg-surface border border-bg-surface-alt rounded-2xl w-full max-w-sm overflow-hidden shadow-[0_10px_30px_rgba(212,175,55,0.15)] flex flex-col max-h-[90vh]">
              
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
  readonly shareCardService = inject(ShareCardService);

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
    const filename = isShowcase ? `epicenter-equipped-showcase.png` : `epicenter-${this.shareBadgeId}-badge.png`;
    const titleText = isShowcase ? 'Epicenter Gym Showcase' : 'Epicenter Gym Achievement';
    const textCaption = isShowcase 
      ? `Check out my equipped showcase loadout at Epicenter Gym! 🔥`
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
    const filename = isShowcase ? `epicenter-equipped-showcase.png` : `epicenter-${this.shareBadgeId}-badge.png`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  copyShareCaption() {
    const isShowcase = this.shareModalTitle() === 'Share Showcase';
    const caption = isShowcase
      ? `Check out my equipped showcase loadout at Epicenter Gym! 🔥 Leveling up daily at epicentergym.ph`
      : `Just unlocked the ${this.shareBadgeTitle} badge at Epicenter Gym! 🔥 Check out epicentergym.ph`;
      
    navigator.clipboard.writeText(caption).then(() => {
      alert('Caption text copied to clipboard! You can paste it when posting your graphic.');
    }).catch(err => {
      console.error('Failed to copy text:', err);
    });
  }

  memberName = computed(() => this.dashboardService.memberData()?.name || 'Guest');
  memberStatus = computed(() => this.dashboardService.memberData()?.membershipStatus || 'Inactive');
  membershipDays = computed(() => this.dashboardService.membershipDaysLeft());
  ptDays = computed(() => this.dashboardService.ptDaysLeft());
  streak = computed(() => this.dashboardService.checkInStreak());
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
}
