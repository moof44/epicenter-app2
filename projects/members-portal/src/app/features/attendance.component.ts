import { Component, inject, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../core/services/dashboard.service';
import { ShareCardService } from '../core/services/share-card.service';
import { AttendanceCalendarComponent } from '../shared/components/attendance-calendar/attendance-calendar.component';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, AttendanceCalendarComponent],
  template: `
    <div class="min-h-screen text-text-primary py-4 px-2 sm:px-6 select-none animate-fade-in">
      
      <!-- Top Title Section -->
      <div class="border-b border-bg-surface-alt pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-black font-oswald text-gold-primary tracking-wide uppercase">My Attendance Tracking</h1>
          <p class="text-xs text-text-secondary mt-0.5">Visualize your gym visit streaks and scan check-in history</p>
        </div>
        
        <button 
          (click)="openConsistencyShareModal(); $event.stopPropagation()"
          class="w-full sm:w-auto h-10 px-5 border border-gold-primary/30 hover:border-gold-primary/60 bg-gold-primary/10 hover:bg-gold-primary/20 text-gold-primary text-xs font-bold font-oswald uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer shadow-sm animate-fade-in"
          title="Share Consistency Card"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186l5.308-2.654m-5.308 2.654l5.308 2.654m-9.754-2.654a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0Zm9.754-5.308a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0Zm0 10.616a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0Z" />
          </svg>
          <span>Share Consistency</span>
        </button>
      </div>

      @if (dashboardService.loading()) {
        <!-- Loader -->
        <div class="h-96 bg-bg-surface border border-bg-surface-alt rounded-2xl w-full mt-6 animate-pulse"></div>
      } @else if (dashboardService.attendanceRecords().length === 0) {
        <!-- Empty State -->
        <div class="card-surface mt-6 flex flex-col items-center justify-center py-16 text-center text-text-secondary gap-3">
          <span class="text-4xl">📅</span>
          <span class="text-base font-bold uppercase tracking-wider text-gold-light">No Attendance Logged</span>
          <p class="text-xs text-text-secondary max-w-sm mt-1">
            You haven't checked in to the gym yet. Scan the portal QR code at the reception desk to check in!
          </p>
        </div>
      } @else {
        
        <!-- Heatmap Graph & Stats Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          
          <!-- Left Column (Spans 2 columns on desktop) -->
          <div class="lg:col-span-2 flex flex-col gap-6">
            
            <!-- Heatmap Card -->
            <div class="card-surface flex flex-col gap-4">
              <div>
                <h2 class="text-base font-bold font-oswald text-gold-light uppercase tracking-wider">Gym Attendance Heatmap</h2>
                <p class="text-[10px] text-text-secondary mt-0.5">Your past 90 days activity grid</p>
              </div>
              
              <!-- Horizontal scrollable container for mobile safety -->
              <div class="w-full overflow-x-auto pb-2 scrollbar-thin">
                <div class="min-w-[420px] flex flex-col gap-2 p-1">
                  
                  <!-- Grid: 7 rows (Sunday at top, Saturday at bottom) flowing in columns -->
                  <div class="grid grid-flow-col grid-rows-7 gap-1.5 self-start">
                    @for (day of past90Days(); track day.dateStr) {
                      <div 
                        [attr.title]="getDayTooltip(day)"
                        [class.bg-gold-primary]="day.visited"
                        [class.bg-bg-surface-alt]="!day.visited"
                        [class.border]="day.visited"
                        [class.border-gold-light]="day.visited"
                        class="w-4.5 h-4.5 rounded-sm transition-all hover:scale-110 cursor-help"
                      ></div>
                    }
                  </div>

                  <!-- Label Indicators -->
                  <div class="flex items-center justify-between text-[9px] text-text-muted px-1 mt-1">
                    <span>90 Days Ago</span>
                    <div class="flex items-center gap-1.5">
                      <span>Less</span>
                      <span class="w-3.5 h-3.5 bg-bg-surface-alt rounded-sm"></span>
                      <span class="w-3.5 h-3.5 bg-gold-primary border border-gold-light rounded-sm"></span>
                      <span>More</span>
                    </div>
                    <span>Today</span>
                  </div>

                </div>
              </div>

            </div>

            <!-- Monthly Calendar View -->
            <app-attendance-calendar [attendanceDates]="attendanceDates()"></app-attendance-calendar>

          </div>

          <!-- Quick Stats Sidebar -->
          <div class="card-surface flex flex-col justify-between gap-4">
            <div class="border-b border-bg-surface-alt pb-3">
              <h2 class="text-base font-bold font-oswald text-gold-light uppercase tracking-wider">Attendance Stats</h2>
              <p class="text-[10px] text-text-secondary mt-0.5">Summary of gym habits</p>
            </div>

            <div class="flex flex-col gap-4">
              <!-- Streak Stat -->
              <div class="flex items-center justify-between bg-bg-surface-alt/40 border border-bg-surface-alt/25 p-3 rounded-xl">
                <div class="flex flex-col">
                  <span class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Active Streak</span>
                  <span class="text-lg font-bold font-oswald text-red-400 mt-1">🔥 {{ streak() }} Days</span>
                </div>
                <span class="text-2xl">⚡</span>
              </div>

              <!-- Monthly Visit Stat -->
              <div class="flex items-center justify-between bg-bg-surface-alt/40 border border-bg-surface-alt/25 p-3 rounded-xl">
                <div class="flex flex-col">
                  <span class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">This Month</span>
                  <span class="text-lg font-bold font-oswald text-gold-primary mt-1">{{ monthVisits() }} Session{{ monthVisits() === 1 ? '' : 's' }}</span>
                </div>
                <span class="text-2xl">💪</span>
              </div>

              <!-- Total Logs Stat -->
              <div class="flex items-center justify-between bg-bg-surface-alt/40 border border-bg-surface-alt/25 p-3 rounded-xl">
                <div class="flex flex-col">
                  <span class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Total Recorded</span>
                  <span class="text-lg font-bold font-oswald text-text-primary mt-1">{{ totalVisits() }} Visit{{ totalVisits() === 1 ? '' : 's' }}</span>
                </div>
                <span class="text-2xl">📝</span>
              </div>
            </div>

          </div>

        </div>

        <!-- Check-in Log Table Card -->
        <div class="card-surface mt-6 flex flex-col gap-4">
          <div class="border-b border-bg-surface-alt pb-3">
            <h2 class="text-lg font-bold font-oswald text-gold-primary uppercase">Gym Attendance Logs</h2>
            <p class="text-[10px] text-text-secondary mt-0.5">History of checked sessions</p>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-bg-surface-alt text-text-secondary uppercase font-oswald tracking-wider">
                  <th class="py-3 px-4">Date</th>
                  <th class="py-3 px-4">Checked In</th>
                  <th class="py-3 px-4">Checked Out</th>
                  <th class="py-3 px-4">Locker Assigned</th>
                  <th class="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-bg-surface-alt/40 font-medium">
                @for (record of paginatedRecords(); track record.id) {
                  <tr class="hover:bg-bg-surface-alt/20 transition-colors">
                    <!-- Date Column -->
                    <td class="py-3 px-4 font-bold text-text-primary">
                      {{ formatLogDate(record.checkInTime) }}
                    </td>
                    <!-- Time In -->
                    <td class="py-3 px-4 text-gold-light">
                      {{ formatTime(record.checkInTime) }}
                    </td>
                    <!-- Time Out -->
                    <td class="py-3 px-4">
                      @if (record.status === 'Checked In') {
                        <span class="px-2 py-0.5 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-md text-[10px] font-bold uppercase animate-pulse">
                          Active
                        </span>
                      } @else {
                        {{ formatTime(record.checkOutTime) }}
                      }
                    </td>
                    <!-- Locker -->
                    <td class="py-3 px-4 text-text-secondary font-mono">
                      {{ record.lockerNumber ? '#' + record.lockerNumber : 'None' }}
                    </td>
                    <!-- Status -->
                    <td class="py-3 px-4">
                      <span 
                        [class.bg-emerald-950]="record.status === 'Checked In'"
                        [class.text-emerald-400]="record.status === 'Checked In'"
                        [class.border-emerald-800]="record.status === 'Checked In'"
                        [class.bg-bg-surface-alt]="record.status === 'Checked Out'"
                        [class.text-text-secondary]="record.status === 'Checked Out'"
                        [class.border-bg-surface-alt]="record.status === 'Checked Out'"
                        class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border"
                      >
                        {{ record.status }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Premium Pagination Controls -->
          @if (totalPages() > 1) {
            <div class="flex flex-col sm:flex-row items-center justify-between border-t border-bg-surface-alt/60 pt-4 mt-2 gap-3">
              <span class="text-[10px] text-text-secondary font-bold font-mono text-center sm:text-left">
                Page {{ currentPage() }} of {{ totalPages() }} (Showing {{ paginatedRecords().length }} of {{ totalVisits() }} logs)
              </span>
              
              <div class="flex items-center gap-1.5 justify-center">
                <!-- Previous Button -->
                <button 
                  (click)="prevPage()"
                  [disabled]="currentPage() === 1"
                  class="p-2 border border-bg-surface-alt hover:border-gold-primary/30 bg-bg-surface-alt/20 hover:bg-bg-surface-alt text-text-primary disabled:opacity-40 disabled:pointer-events-none rounded-xl transition-all cursor-pointer flex items-center justify-center min-w-[36px] h-9 active:scale-95"
                  title="Previous Page"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4 text-gold-primary">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>
                </button>

                <!-- Page Numbers -->
                @for (p of pageNumbers(); track p) {
                  <button
                    (click)="setPage(p)"
                    [class.border-gold-primary]="currentPage() === p"
                    [class.bg-gold-primary]="currentPage() === p"
                    [class.text-bg-surface]="currentPage() === p"
                    [class.font-black]="currentPage() === p"
                    [class.bg-bg-surface-alt/20]="currentPage() !== p"
                    [class.hover:bg-bg-surface-alt]="currentPage() !== p"
                    [class.border-bg-surface-alt]="currentPage() !== p"
                    class="w-9 h-9 border text-xs rounded-xl font-bold font-mono transition-all cursor-pointer flex items-center justify-center active:scale-95"
                  >
                    {{ p }}
                  </button>
                }

                <!-- Next Button -->
                <button 
                  (click)="nextPage()"
                  [disabled]="currentPage() === totalPages()"
                  class="p-2 border border-bg-surface-alt hover:border-gold-primary/30 bg-bg-surface-alt/20 hover:bg-bg-surface-alt text-text-primary disabled:opacity-40 disabled:pointer-events-none rounded-xl transition-all cursor-pointer flex items-center justify-center min-w-[36px] h-9 active:scale-95"
                  title="Next Page"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4 text-gold-primary">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            </div>
          }
        </div>

      }

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

    </div>
  `,
  styles: [`
    .animate-fade-in {
      animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .scrollbar-thin::-webkit-scrollbar {
      height: 4px;
    }
    .scrollbar-thin::-webkit-scrollbar-track {
      background: #121212;
    }
    .scrollbar-thin::-webkit-scrollbar-thumb {
      background: #2a2a2a;
      border-radius: 2px;
    }
  `]
})
export class AttendanceComponent {
  readonly dashboardService = inject(DashboardService);
  readonly shareCardService = inject(ShareCardService);

  // Sharing Card Signals & State
  isShareModalOpen = signal<boolean>(false);
  generatingShareImage = signal<boolean>(false);
  shareImageUrl = signal<string | null>(null);
  shareBlob = signal<Blob | null>(null);
  shareBadgeTitle = 'Consistency Calendar';
  shareBadgeId = 'consistency-calendar';
  shareModalTitle = signal<string>('Share Consistency');

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

    const isConsistency = this.shareModalTitle() === 'Share Consistency';
    const filename = isConsistency 
      ? `epicenter-consistency-calendar.png`
      : `epicenter-${this.shareBadgeId}-badge.png`;
    const titleText = isConsistency
      ? 'Epicenter Gym Consistency Calendar'
      : 'Epicenter Gym Achievement';
    const textCaption = isConsistency
      ? `Staying consistent with my workout goals at Epicenter Gym! 🔥`
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
    const isConsistency = this.shareModalTitle() === 'Share Consistency';
    const filename = isConsistency
      ? `epicenter-consistency-calendar.png`
      : `epicenter-${this.shareBadgeId}-badge.png`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  copyShareCaption() {
    const isConsistency = this.shareModalTitle() === 'Share Consistency';
    const caption = isConsistency
      ? `Staying consistent with my workout goals at Epicenter Gym! 🔥 Check out epicentergym.ph`
      : `Just unlocked the ${this.shareBadgeTitle} badge at Epicenter Gym! 🔥 Check out epicentergym.ph`;
      
    navigator.clipboard.writeText(caption).then(() => {
      alert('Caption text copied to clipboard! You can paste it when posting your graphic.');
    }).catch(err => {
      console.error('Failed to copy text:', err);
    });
  }

  badgeLevel = computed(() => this.dashboardService.memberData()?.attendanceBadgeLevel || 0);
  memberName = computed(() => this.dashboardService.memberData()?.name || 'Guest');
  
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

  // Pagination Signals & Config
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  constructor() {
    // Reset page to 1 whenever attendance records refresh
    effect(() => {
      this.dashboardService.attendanceRecords();
      this.currentPage.set(1);
    }, { allowSignalWrites: true });
  }

  streak = computed(() => this.dashboardService.checkInStreak());
  monthVisits = computed(() => this.dashboardService.visitsThisMonth());
  totalVisits = computed(() => this.dashboardService.attendanceRecords().length);
  attendanceDates = computed(() => this.dashboardService.attendanceRecords().map(r => r.date).filter(Boolean));

  totalPages = computed(() => Math.ceil(this.totalVisits() / this.pageSize()));

  paginatedRecords = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return this.dashboardService.attendanceRecords().slice(start, end);
  });

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const visibleCount = 5;
    
    let start = Math.max(1, current - Math.floor(visibleCount / 2));
    let end = Math.min(total, start + visibleCount - 1);
    
    if (end - start + 1 < visibleCount) {
      start = Math.max(1, end - visibleCount + 1);
    }
    
    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  setPage(p: number) {
    this.currentPage.set(p);
  }

  readonly past90Days = computed(() => {
    const records = this.dashboardService.attendanceRecords();
    const dates = new Set(records.map(r => r.date));
    
    const arr = [];
    const now = new Date();
    // Build list of past 90 days (oldest first)
    for (let i = 89; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      arr.push({
        date: d,
        dateStr,
        visited: dates.has(dateStr)
      });
    }
    return arr;
  });

  getDayTooltip(day: any): string {
    const formatted = day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    return `${formatted}: ${day.visited ? 'Visited Gym' : 'No gym record'}`;
  }

  formatLogDate(d: Date): string {
    if (!d) return '';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatTime(d?: Date): string {
    if (!d) return 'N/A';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
}
