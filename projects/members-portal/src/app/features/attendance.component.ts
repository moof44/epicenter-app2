import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../core/services/dashboard.service';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen text-text-primary py-4 px-2 sm:px-6 select-none animate-fade-in">
      
      <!-- Top Title Section -->
      <div class="border-b border-bg-surface-alt pb-4">
        <h1 class="text-2xl font-black font-oswald text-gold-primary tracking-wide uppercase">My Attendance Tracking</h1>
        <p class="text-xs text-text-secondary mt-0.5">Visualize your gym visit streaks and scan check-in history</p>
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
          
          <!-- Heatmap Card (Spans 2 columns on desktop) -->
          <div class="card-surface lg:col-span-2 flex flex-col gap-4">
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
                @for (record of dashboardService.attendanceRecords(); track record.id) {
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

  streak = computed(() => this.dashboardService.checkInStreak());
  monthVisits = computed(() => this.dashboardService.visitsThisMonth());
  totalVisits = computed(() => this.dashboardService.attendanceRecords().length);

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
