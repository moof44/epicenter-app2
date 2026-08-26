import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../core/services/dashboard.service';

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen text-text-primary py-4 px-2 sm:px-6 select-none animate-fade-in-up">
      
      <!-- Top Title and Metrics Selector -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-bg-surface-alt pb-4">
        <div>
          <h1 class="text-2xl font-black font-oswald text-gold-primary tracking-wide uppercase">My Fitness Journey</h1>
          <p class="text-xs text-text-secondary mt-0.5">Track your somatic measurements and checkup trends</p>
        </div>
        
        <!-- Interactive Legend -->
        <div class="flex flex-wrap gap-4 bg-bg-surface-alt/45 p-2 rounded-xl border border-bg-surface-alt/40 self-start md:self-center select-none">
          <!-- Weight Legend -->
          <div 
            (mouseenter)="focusedMetric.set('weight')"
            (mouseleave)="focusedMetric.set(null)"
            (click)="selectMetricByUser('weight')"
            class="flex items-center gap-2 cursor-pointer transition-all duration-200 hover:scale-[1.03] px-3 py-1.5 rounded-lg border border-transparent"
            [class.bg-white/5]="selectedMetric() === 'weight'"
            [class.border-gold-primary/30]="selectedMetric() === 'weight'"
            [class.opacity-40]="focusedMetric() !== null && focusedMetric() !== 'weight'"
          >
            <span class="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-gold-primary to-gold-light shadow-[0_0_8px_rgba(212,175,55,0.8)]"></span>
            <span class="text-[10px] font-bold font-oswald uppercase tracking-wider text-gold-light">Weight (kg)</span>
          </div>

          <!-- Muscle Mass Legend -->
          <div 
            (mouseenter)="focusedMetric.set('muscleMass')"
            (mouseleave)="focusedMetric.set(null)"
            (click)="selectMetricByUser('muscleMass')"
            class="flex items-center gap-2 cursor-pointer transition-all duration-200 hover:scale-[1.03] px-3 py-1.5 rounded-lg border border-transparent"
            [class.bg-white/5]="selectedMetric() === 'muscleMass'"
            [class.border-emerald-500/30]="selectedMetric() === 'muscleMass'"
            [class.opacity-40]="focusedMetric() !== null && focusedMetric() !== 'muscleMass'"
          >
            <span class="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            <span class="text-[10px] font-bold font-oswald uppercase tracking-wider text-emerald-400">Muscle Mass (%)</span>
          </div>

          <!-- Body Fat Legend -->
          <div 
            (mouseenter)="focusedMetric.set('bodyFat')"
            (mouseleave)="focusedMetric.set(null)"
            (click)="selectMetricByUser('bodyFat')"
            class="flex items-center gap-2 cursor-pointer transition-all duration-200 hover:scale-[1.03] px-3 py-1.5 rounded-lg border border-transparent"
            [class.bg-white/5]="selectedMetric() === 'bodyFat'"
            [class.border-pink-500/30]="selectedMetric() === 'bodyFat'"
            [class.opacity-40]="focusedMetric() !== null && focusedMetric() !== 'bodyFat'"
          >
            <span class="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-pink-500 to-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.8)]"></span>
            <span class="text-[10px] font-bold font-oswald uppercase tracking-wider text-pink-400">Body Fat (%)</span>
          </div>
        </div>
      </div>

      <!-- Main Layout Body -->
      @if (dashboardService.loading()) {
        <!-- Pulse Loader -->
        <div class="h-96 bg-bg-surface border border-bg-surface-alt rounded-2xl w-full mt-6 animate-pulse"></div>
      } @else if (dashboardService.measurements().length === 0) {
        <!-- Empty State -->
        <div class="card-surface mt-6 flex flex-col items-center justify-center py-16 text-center text-text-secondary gap-3">
          <span class="text-4xl">📉</span>
          <span class="text-base font-bold uppercase tracking-wider text-gold-light">No Somatic Records Found</span>
          <p class="text-xs text-text-secondary max-w-sm mt-1">
            Complete your initial body composition checkup at the gym. Staff will log your stats and they'll display here.
          </p>
        </div>
      } @else {
        
        <!-- Responsive SVG Chart Card -->
        <div class="card-surface mt-6 flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold font-oswald text-gold-light uppercase tracking-wider">
              Somatic Progress Trends
            </span>
            <span class="text-[10px] text-text-secondary">
              Showing past {{ chartData().length }} checkups
            </span>
          </div>

          <!-- Chart Area -->
          <div class="relative w-full h-[260px] sm:h-[300px] bg-bg-surface-alt/20 rounded-2xl border border-bg-surface-alt/30 p-2 overflow-hidden">
            
            <svg viewBox="0 0 600 220" width="100%" height="100%" class="select-none overflow-visible">
              <!-- Chart Gradient Defs -->
              <defs>
                <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#D4AF37" stop-opacity="0.15"/>
                  <stop offset="100%" stop-color="#D4AF37" stop-opacity="0.0"/>
                </linearGradient>
                <linearGradient id="muscleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#10B981" stop-opacity="0.15"/>
                  <stop offset="100%" stop-color="#10B981" stop-opacity="0.0"/>
                </linearGradient>
                <linearGradient id="fatGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#EC4899" stop-opacity="0.15"/>
                  <stop offset="100%" stop-color="#EC4899" stop-opacity="0.0"/>
                </linearGradient>
              </defs>

              <!-- Y-Axis Labels & Reference Gridlines (for selected metric) -->
              @for (tick of yAxisTicks(); track tick.y) {
                <g class="transition-all duration-300">
                  <!-- Subtle horizontal reference line across the chart width -->
                  <line 
                    x1="50" 
                    [attr.y1]="tick.y" 
                    x2="580" 
                    [attr.y2]="tick.y" 
                    stroke="#222" 
                    stroke-dasharray="3 3"
                    stroke-width="1"
                  />
                  <!-- Tick mark on the Y-Axis line -->
                  <line 
                    x1="45" 
                    [attr.y1]="tick.y" 
                    x2="50" 
                    [attr.y2]="tick.y" 
                    stroke="#555" 
                    stroke-width="1"
                  />
                  <!-- Tick text label -->
                  <text 
                    x="40" 
                    [attr.y]="tick.y + 4" 
                    fill="#bbb" 
                    font-size="12" 
                    font-weight="600"
                    font-family="sans-serif"
                    text-anchor="end"
                  >
                    {{ tick.text }}
                  </text>
                </g>
              }

              <!-- Axis Lines -->
              <!-- Vertical Axis Line (Y-axis at x=50) -->
              <line 
                x1="50" 
                y1="15" 
                x2="50" 
                y2="180" 
                stroke="#555" 
                stroke-width="1.5" 
                stroke-linecap="round"
              />
              <!-- Horizontal Axis Line (X-axis at y=180) -->
              <line 
                x1="50" 
                y1="180" 
                x2="585" 
                y2="180" 
                stroke="#555" 
                stroke-width="1.5" 
                stroke-linecap="round"
              />

              <!-- Filled Area Under Chart -->
              <!-- 1. Weight Area -->
              @if (weightAreaPath() && (focusedMetric() === null || focusedMetric() === 'weight')) {
                <path [attr.d]="weightAreaPath()" fill="url(#weightGradient)" class="chart-area transition-all duration-300" />
              }
              <!-- 2. Muscle Mass Area -->
              @if (muscleMassAreaPath() && (focusedMetric() === null || focusedMetric() === 'muscleMass')) {
                <path [attr.d]="muscleMassAreaPath()" fill="url(#muscleGradient)" class="chart-area transition-all duration-300" />
              }
              <!-- 3. Body Fat Area -->
              @if (bodyFatAreaPath() && (focusedMetric() === null || focusedMetric() === 'bodyFat')) {
                <path [attr.d]="bodyFatAreaPath()" fill="url(#fatGradient)" class="chart-area transition-all duration-300" />
              }

              <!-- Main Plot Lines -->
              <!-- 1. Weight Line -->
              @if (weightPath()) {
                <path 
                  [attr.d]="weightPath()" 
                  fill="none" 
                  stroke="#D4AF37" 
                  stroke-width="3" 
                  stroke-linecap="round" 
                  stroke-linejoin="round"
                  class="chart-line-weight glow-weight transition-all duration-300"
                  [class.opacity-15]="focusedMetric() !== null && focusedMetric() !== 'weight'"
                />
              }

              <!-- 2. Muscle Mass Line -->
              @if (muscleMassPath()) {
                <path 
                  [attr.d]="muscleMassPath()" 
                  fill="none" 
                  stroke="#10B981" 
                  stroke-width="3" 
                  stroke-linecap="round" 
                  stroke-linejoin="round"
                  class="chart-line-muscle glow-muscle transition-all duration-300"
                  [class.opacity-15]="focusedMetric() !== null && focusedMetric() !== 'muscleMass'"
                />
              }

              <!-- 3. Body Fat Line -->
              @if (bodyFatPath()) {
                <path 
                  [attr.d]="bodyFatPath()" 
                  fill="none" 
                  stroke="#EC4899" 
                  stroke-width="3" 
                  stroke-linecap="round" 
                  stroke-linejoin="round"
                  class="chart-line-fat glow-fat transition-all duration-300"
                  [class.opacity-15]="focusedMetric() !== null && focusedMetric() !== 'bodyFat'"
                />
              }

              <!-- Node Points (Grouped by Line) -->
              <!-- Weight Nodes -->
              @for (point of chartPoints().weight; track point.x; let idx = $index) {
                <g class="group chart-node transition-all duration-300" [class.opacity-15]="focusedMetric() !== null && focusedMetric() !== 'weight'">
                  <!-- Touch/Hover Pulse Glow -->
                  <circle 
                    [attr.cx]="point.x" 
                    [attr.cy]="point.y" 
                    r="12" 
                    fill="#FFD700" 
                    class="opacity-0 group-hover:opacity-20 transition-opacity duration-150 cursor-pointer"
                  />
                  <!-- Solid Node -->
                  <circle 
                    [attr.cx]="point.x" 
                    [attr.cy]="point.y" 
                    r="5.5" 
                    fill="#000" 
                    stroke="#D4AF37" 
                    stroke-width="3" 
                    class="cursor-pointer"
                  />
                  <!-- Value Text Label (Visible permanently if Weight is selected or on Hover) -->
                  <text 
                    [attr.x]="point.x" 
                    [attr.y]="point.y - 14" 
                    fill="#FFD700" 
                    font-size="13" 
                    font-weight="bold" 
                    text-anchor="middle"
                    font-family="Oswald"
                    class="pointer-events-none filter drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.95)] transition-opacity duration-200"
                    [class.opacity-100]="selectedMetric() === 'weight'"
                    [class.opacity-0]="selectedMetric() !== 'weight'"
                    [class.group-hover:opacity-100]="selectedMetric() !== 'weight'"
                  >
                    {{ point.val.toFixed(1) }} kg
                  </text>
                </g>
              }

              <!-- Muscle Mass Nodes -->
              @for (point of chartPoints().muscleMass; track point.x; let idx = $index) {
                <g class="group chart-node transition-all duration-300" [class.opacity-15]="focusedMetric() !== null && focusedMetric() !== 'muscleMass'">
                  <!-- Touch/Hover Pulse Glow -->
                  <circle 
                    [attr.cx]="point.x" 
                    [attr.cy]="point.y" 
                    r="12" 
                    fill="#34D399" 
                    class="opacity-0 group-hover:opacity-20 transition-opacity duration-150 cursor-pointer"
                  />
                  <!-- Solid Node -->
                  <circle 
                    [attr.cx]="point.x" 
                    [attr.cy]="point.y" 
                    r="5.5" 
                    fill="#000" 
                    stroke="#10B981" 
                    stroke-width="3" 
                    class="cursor-pointer"
                  />
                  <!-- Value Text Label (Visible permanently if Muscle Mass is selected or on Hover) -->
                  <text 
                    [attr.x]="point.x" 
                    [attr.y]="point.y - 14" 
                    fill="#34D399" 
                    font-size="13" 
                    font-weight="bold" 
                    text-anchor="middle"
                    font-family="Oswald"
                    class="pointer-events-none filter drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.95)] transition-opacity duration-200"
                    [class.opacity-100]="selectedMetric() === 'muscleMass'"
                    [class.opacity-0]="selectedMetric() !== 'muscleMass'"
                    [class.group-hover:opacity-100]="selectedMetric() !== 'muscleMass'"
                  >
                    {{ point.val.toFixed(1) }}%
                  </text>
                </g>
              }

              <!-- Body Fat Nodes -->
              @for (point of chartPoints().bodyFat; track point.x; let idx = $index) {
                <g class="group chart-node transition-all duration-300" [class.opacity-15]="focusedMetric() !== null && focusedMetric() !== 'bodyFat'">
                  <!-- Touch/Hover Pulse Glow -->
                  <circle 
                    [attr.cx]="point.x" 
                    [attr.cy]="point.y" 
                    r="12" 
                    fill="#F472B6" 
                    class="opacity-0 group-hover:opacity-20 transition-opacity duration-150 cursor-pointer"
                  />
                  <!-- Solid Node -->
                  <circle 
                    [attr.cx]="point.x" 
                    [attr.cy]="point.y" 
                    r="5.5" 
                    fill="#000" 
                    stroke="#EC4899" 
                    stroke-width="3" 
                    class="cursor-pointer"
                  />
                  <!-- Value Text Label (Visible permanently if Body Fat is selected or on Hover) -->
                  <text 
                    [attr.x]="point.x" 
                    [attr.y]="point.y - 14" 
                    fill="#F472B6" 
                    font-size="13" 
                    font-weight="bold" 
                    text-anchor="middle"
                    font-family="Oswald"
                    class="pointer-events-none filter drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.95)] transition-opacity duration-200"
                    [class.opacity-100]="selectedMetric() === 'bodyFat'"
                    [class.opacity-0]="selectedMetric() !== 'bodyFat'"
                    [class.group-hover:opacity-100]="selectedMetric() !== 'bodyFat'"
                  >
                    {{ point.val.toFixed(1) }}%
                  </text>
                </g>
              }

              <!-- Date labels on horizontal axis -->
              @if (chartPoints().weight.length > 0) {
                @for (point of chartPoints().weight; track point.x) {
                  <!-- Axis Tick mark -->
                  <line 
                    [attr.x1]="point.x" 
                    y1="180" 
                    [attr.x2]="point.x" 
                    y2="185" 
                    stroke="#555" 
                    stroke-width="1"
                  />
                  <!-- Date Text label -->
                  <text 
                    [attr.x]="point.x" 
                    y="204" 
                    fill="#aaa" 
                    font-size="12" 
                    font-weight="600"
                    text-anchor="middle"
                    font-family="sans-serif"
                    class="pointer-events-none"
                  >
                    {{ formatDateShort(point.date) }}
                  </text>
                }
              }
            </svg>

          </div>
        </div>

        <!-- 📸 Monthly Body Composition Scan Reports Section -->
        @if (scanReports().length > 0) {
          <div class="card-surface mt-6 flex flex-col gap-4">
            <div class="flex items-center justify-between border-b border-bg-surface-alt pb-3">
              <div>
                <h2 class="text-lg font-bold font-oswald text-gold-primary uppercase flex items-center gap-2">
                  <span>📄</span> Body Scale Scan Reports
                </h2>
                <p class="text-[10px] text-text-secondary mt-0.5">High-resolution scan sheets generated by the gym's body composition analyzer</p>
              </div>
              <span class="text-[10px] font-bold text-gold-light bg-gold-primary/10 border border-gold-primary/30 px-2.5 py-1 rounded-full">
                {{ scanReports().length }} {{ scanReports().length === 1 ? 'Scan' : 'Scans' }}
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (scan of scanReports(); track scan.id) {
                <div class="bg-bg-surface-alt/30 border border-bg-surface-alt/60 rounded-xl overflow-hidden flex flex-col justify-between hover:border-gold-primary/40 transition-all duration-200">
                  
                  <!-- Clickable Scan Thumbnail -->
                  <div class="relative group cursor-pointer h-48 bg-black/40 flex items-center justify-center overflow-hidden" (click)="activeScanModal.set(scan)">
                    <img [src]="scan.reportImageUrl" alt="Body Composition Scan" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                    <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1.5 text-gold-light">
                      <span class="text-2xl">🔍</span>
                      <span class="text-[11px] font-bold font-oswald uppercase tracking-wider">Click to Zoom & View</span>
                    </div>
                  </div>

                  <!-- Metadata Card Footer -->
                  <div class="p-3 flex flex-col gap-2">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold text-text-primary font-oswald uppercase">{{ formatDateFull(scan.date) }}</span>
                      @if (scan.weight && scan.weight > 0) {
                        <span class="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">✓ Stats Logged</span>
                      } @else {
                        <span class="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">⏳ Stats Pending</span>
                      }
                    </div>

                    @if (!scan.weight || scan.weight <= 0) {
                      <p class="text-[10px] text-text-muted leading-tight">
                        ℹ️ Scan sheet stored. Numerical progress trends will update once transcribed by gym staff.
                      </p>
                    } @else {
                      <div class="text-[11px] text-text-secondary flex items-center gap-3">
                        <span>Weight: <strong class="text-gold-light">{{ scan.weight }}kg</strong></span>
                        <span *ngIf="scan.bodyFat">Fat: <strong class="text-pink-400">{{ scan.bodyFat }}%</strong></span>
                      </div>
                    }

                    <div class="flex items-center gap-2 pt-1">
                      <button type="button" class="flex-1 py-1.5 px-3 rounded-lg bg-gold-primary text-black font-oswald font-bold text-xs uppercase tracking-wider hover:bg-gold-light transition-colors" (click)="activeScanModal.set(scan)">
                        View Full Report
                      </button>
                      <a [href]="scan.reportImageUrl" target="_blank" download="Body_Composition_Report.jpg" class="p-1.5 rounded-lg border border-bg-surface-alt hover:border-gold-primary/50 text-text-secondary hover:text-gold-light transition-colors" title="Download Image">
                        💾
                      </a>
                    </div>
                  </div>

                </div>
              }
            </div>
          </div>
        }

        <!-- Somatic History Timeline Card -->
        <div class="card-surface mt-6 flex flex-col gap-4">
          <div class="border-b border-bg-surface-alt pb-3">
            <h2 class="text-lg font-bold font-oswald text-gold-primary uppercase">Biometric Checkup Timeline</h2>
            <p class="text-[10px] text-text-secondary mt-0.5">Chronological summary of all fitness desk checkups</p>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-bg-surface-alt text-text-secondary uppercase font-oswald tracking-wider">
                  <th class="py-3 px-4">Date</th>
                  <th class="py-3 px-4">Weight (kg)</th>
                  <th class="py-3 px-4">Body Fat (%)</th>
                  <th class="py-3 px-4">Muscle Mass (%)</th>
                  <th class="py-3 px-4">BMI</th>
                  <th class="py-3 px-4">Metabolism</th>
                  <th class="py-3 px-4">Body Age</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-bg-surface-alt/40 font-medium">
                @for (entry of dashboardService.measurements(); track entry.id; let idx = $index) {
                  <tr class="hover:bg-bg-surface-alt/20 transition-colors">
                    <td class="py-3 px-4 font-bold text-text-primary">
                      <div class="flex items-center gap-1.5">
                        <span>{{ formatDateFull(entry.date) }}</span>
                        @if (entry.reportImageUrl) {
                          <button type="button" class="text-gold-primary hover:text-gold-light p-0.5 rounded cursor-pointer" title="View attached scan sheet" (click)="activeScanModal.set(entry)">
                            📄
                          </button>
                        }
                      </div>
                    </td>
                    
                    <!-- Weight -->
                    <td class="py-3 px-4">
                      <div class="flex flex-col gap-0.5">
                        @if (entry.weight && entry.weight > 0) {
                          <span class="text-gold-light font-bold">{{ entry.weight.toFixed(1) }} kg</span>
                          @if (getDiff(entry, 'weight', dashboardService.measurements()[idx + 1]); as diff) {
                            <span 
                              [class.text-emerald-400]="diff.type === 'improve'"
                              [class.text-red-400]="diff.type === 'worse'"
                              [class.text-text-muted]="diff.type === 'neutral'"
                              class="text-[9px] font-bold"
                            >
                              {{ diff.text }}
                            </span>
                          }
                        } @else {
                          <span class="text-text-muted italic">Pending</span>
                        }
                      </div>
                    </td>

                    <!-- Body Fat -->
                    <td class="py-3 px-4">
                      <div class="flex flex-col gap-0.5">
                        @if (entry.bodyFat && entry.bodyFat > 0) {
                          <span class="text-text-primary">{{ entry.bodyFat.toFixed(1) }}%</span>
                          @if (getDiff(entry, 'bodyFat', dashboardService.measurements()[idx + 1]); as diff) {
                            <span 
                              [class.text-emerald-400]="diff.type === 'improve'"
                              [class.text-red-400]="diff.type === 'worse'"
                              [class.text-text-muted]="diff.type === 'neutral'"
                              [class.animate-fade-blink]="diff.type === 'improve'"
                              class="text-[9px] font-bold inline-flex items-center gap-1"
                            >
                              <span>{{ diff.text }}</span>
                              @if (diff.type === 'improve') { <span>🤩</span> }
                              @if (diff.type === 'worse') { <span>😢</span> }
                            </span>
                          }
                        } @else {
                          <span class="text-text-muted italic">--</span>
                        }
                      </div>
                    </td>

                    <!-- Muscle Mass -->
                    <td class="py-3 px-4">
                      <div class="flex flex-col gap-0.5">
                        @if (entry.muscleMass && entry.muscleMass > 0) {
                          <span class="text-text-primary">{{ entry.muscleMass.toFixed(1) }}%</span>
                          @if (getDiff(entry, 'muscleMass', dashboardService.measurements()[idx + 1]); as diff) {
                            <span 
                              [class.text-emerald-400]="diff.type === 'improve'"
                              [class.text-red-400]="diff.type === 'worse'"
                              [class.text-text-muted]="diff.type === 'neutral'"
                              [class.animate-fade-blink]="diff.type === 'improve'"
                              class="text-[9px] font-bold inline-flex items-center gap-1"
                            >
                              <span>{{ diff.text }}</span>
                              @if (diff.type === 'improve') { <span>💪</span> }
                              @if (diff.type === 'worse') { <span>😢</span> }
                            </span>
                          }
                        } @else {
                          <span class="text-text-muted italic">--</span>
                        }
                      </div>
                    </td>

                    <!-- BMI -->
                    <td class="py-3 px-4">
                      <div class="flex flex-col gap-0.5">
                        @if (entry.bmi && entry.bmi > 0) {
                          <span class="text-text-secondary">{{ entry.bmi.toFixed(1) }}</span>
                          @if (getDiff(entry, 'bmi', dashboardService.measurements()[idx + 1]); as diff) {
                            <span 
                              [class.text-emerald-400]="diff.type === 'improve'"
                              [class.text-red-400]="diff.type === 'worse'"
                              [class.text-text-muted]="diff.type === 'neutral'"
                              [class.animate-fade-blink]="diff.type === 'improve'"
                              class="text-[9px] font-bold inline-flex items-center gap-1"
                            >
                              <span>{{ diff.text }}</span>
                              @if (diff.type === 'improve') { <span>🤩</span> }
                              @if (diff.type === 'worse') { <span>😢</span> }
                            </span>
                          }
                        } @else {
                          <span class="text-text-muted italic">--</span>
                        }
                      </div>
                    </td>

                    <!-- Metabolism -->
                    <td class="py-3 px-4">
                      <div class="flex flex-col gap-0.5">
                        @if (entry.metabolism && entry.metabolism > 0) {
                          <span class="text-text-secondary">{{ entry.metabolism }} kcal</span>
                          @if (getDiff(entry, 'metabolism', dashboardService.measurements()[idx + 1]); as diff) {
                            <span 
                              [class.text-emerald-400]="diff.type === 'improve'"
                              [class.text-red-400]="diff.type === 'worse'"
                              [class.text-text-muted]="diff.type === 'neutral'"
                              [class.animate-fade-blink]="diff.type === 'improve'"
                              class="text-[9px] font-bold inline-flex items-center gap-1"
                            >
                              <span>{{ diff.text }}</span>
                              @if (diff.type === 'improve') { <span>🤩</span> }
                              @if (diff.type === 'worse') { <span>😢</span> }
                            </span>
                          }
                        } @else {
                          <span class="text-text-muted italic">--</span>
                        }
                      </div>
                    </td>

                    <!-- Body Age -->
                    <td class="py-3 px-4">
                      <div class="flex flex-col gap-0.5">
                        @if (entry.bodyAge && entry.bodyAge > 0) {
                          <span class="text-text-secondary">{{ entry.bodyAge }} Years</span>
                          @if (getDiff(entry, 'bodyAge', dashboardService.measurements()[idx + 1]); as diff) {
                            <span 
                              [class.text-emerald-400]="diff.type === 'improve'"
                              [class.text-red-400]="diff.type === 'worse'"
                              [class.text-text-muted]="diff.type === 'neutral'"
                              [class.animate-fade-blink]="diff.type === 'improve'"
                              class="text-[9px] font-bold inline-flex items-center gap-1"
                            >
                              <span>{{ diff.text }}</span>
                              @if (diff.type === 'improve') { <span>✨</span> }
                              @if (diff.type === 'worse') { <span>👴</span> }
                            </span>
                          }
                        } @else {
                          <span class="text-text-muted italic">--</span>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

      }

      <!-- 📸 Fullscreen Scan Image Preview Modal (Member Portal) -->
      @if (activeScanModal(); as modalScan) {
        <div class="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 animate-fade-in" (click)="activeScanModal.set(null)">
          <div class="bg-bg-surface border border-gold-primary/30 rounded-2xl max-w-4xl max-h-[95vh] w-full flex flex-col overflow-hidden shadow-2xl" (click)="$event.stopPropagation()">
            
            <!-- Modal Header -->
            <div class="flex items-center justify-between p-4 border-b border-bg-surface-alt bg-bg-surface-alt/40">
              <div class="flex items-center gap-2">
                <span class="text-xl">📄</span>
                <div>
                  <h3 class="text-sm sm:text-base font-bold font-oswald text-gold-primary uppercase">
                    Body Composition Analysis Report
                  </h3>
                  <p class="text-[10px] text-text-secondary">Scan Date: {{ formatDateFull(modalScan.date) }}</p>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <a [href]="modalScan.reportImageUrl" target="_blank" download="Body_Composition_Report.jpg" class="px-3 py-1.5 rounded-lg bg-gold-primary/20 hover:bg-gold-primary/30 border border-gold-primary/40 text-gold-light text-xs font-bold font-oswald uppercase tracking-wider transition-colors flex items-center gap-1.5">
                  <span>⬇️</span> Download
                </a>
                <button type="button" class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-text-primary flex items-center justify-center text-sm font-bold transition-colors cursor-pointer" (click)="activeScanModal.set(null)">
                  ✕
                </button>
              </div>
            </div>

            <!-- Modal Body (Full image with scroll / pinch zoom) -->
            <div class="p-2 sm:p-4 overflow-auto flex items-center justify-center bg-black/60 max-h-[calc(95vh-80px)]">
              <img [src]="modalScan.reportImageUrl" alt="Full Body Composition Scan Report" class="max-w-full max-h-[80vh] object-contain rounded-lg shadow-lg">
            </div>

          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    @keyframes drawLine {
      from { stroke-dashoffset: 1200; }
      to { stroke-dashoffset: 0; }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .chart-line-weight {
      stroke-dasharray: 1200;
      stroke-dashoffset: 1200;
      animation: drawLine 1.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
    }
    .chart-line-muscle {
      stroke-dasharray: 1200;
      stroke-dashoffset: 1200;
      animation: drawLine 1.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
      animation-delay: 0.25s;
    }
    .chart-line-fat {
      stroke-dasharray: 1200;
      stroke-dashoffset: 1200;
      animation: drawLine 1.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
      animation-delay: 0.5s;
    }
    .chart-area {
      opacity: 0;
      animation: fadeIn 1s ease-out forwards;
      animation-delay: 1.2s;
    }
    .chart-node {
      opacity: 0;
      animation: fadeIn 0.5s ease-out forwards;
      animation-delay: 1.0s;
    }
    .glow-weight {
      filter: drop-shadow(0px 3px 6px rgba(212, 175, 55, 0.5));
    }
    .glow-muscle {
      filter: drop-shadow(0px 3px 6px rgba(16, 185, 129, 0.5));
    }
    .glow-fat {
      filter: drop-shadow(0px 3px 6px rgba(236, 72, 153, 0.5));
    }
  `]
})
export class ProgressComponent implements OnInit, OnDestroy {
  readonly dashboardService = inject(DashboardService);
  
  readonly focusedMetric = signal<'weight' | 'bodyFat' | 'muscleMass' | null>(null);
  readonly selectedMetric = signal<'weight' | 'bodyFat' | 'muscleMass'>('weight');

  private carouselInterval: any;
  private inactivityTimeout: any;

  ngOnInit() {
    this.startCarousel();
  }

  ngOnDestroy() {
    this.clearTimers();
  }

  private startCarousel() {
    this.clearTimers();
    this.carouselInterval = setInterval(() => {
      const current = this.selectedMetric();
      let next: 'weight' | 'bodyFat' | 'muscleMass' = 'weight';
      if (current === 'weight') next = 'muscleMass';
      else if (current === 'muscleMass') next = 'bodyFat';
      else if (current === 'bodyFat') next = 'weight';
      this.selectedMetric.set(next);
    }, 4000);
  }

  private clearTimers() {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
      this.carouselInterval = null;
    }
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
      this.inactivityTimeout = null;
    }
  }

  selectMetricByUser(metric: 'weight' | 'bodyFat' | 'muscleMass') {
    this.selectedMetric.set(metric);
    this.clearTimers();
    this.inactivityTimeout = setTimeout(() => {
      this.resetToDefault();
    }, 15000);
  }

  private resetToDefault() {
    this.selectedMetric.set('weight');
    this.startCarousel();
  }

  readonly activeScanModal = signal<any | null>(null);

  readonly scanReports = computed(() => {
    return this.dashboardService.measurements().filter(m => !!m.reportImageUrl);
  });

  readonly chartData = computed(() => {
    const measurements = this.dashboardService.measurements();
    const validMeasurements = measurements.filter(m => m.weight !== undefined && m.weight !== null && Number(m.weight) > 0);
    if (validMeasurements.length === 0) return [];
    return [...validMeasurements].reverse();
  });

  readonly yAxisTicks = computed(() => {
    const data = this.chartData();
    const metric = this.selectedMetric();
    if (data.length === 0) return [];

    const values = data.map(m => Number(m[metric]) || 0);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const valRange = maxVal - minVal || 1;

    const padding = valRange * 0.15;
    const yMin = minVal - padding;
    const yMax = maxVal + padding;
    const yRange = yMax - yMin;

    const svgHeight = 180;
    const topMargin = 20;

    const getY = (val: number) => {
      return svgHeight - ((val - yMin) / yRange) * (svgHeight - topMargin) + topMargin;
    };

    const midVal = (minVal + maxVal) / 2;
    const unit = metric === 'weight' ? ' kg' : '%';

    return [
      { y: getY(maxVal), val: maxVal, text: `${maxVal.toFixed(1)}${unit}` },
      { y: getY(midVal), val: midVal, text: `${midVal.toFixed(1)}${unit}` },
      { y: getY(minVal), val: minVal, text: `${minVal.toFixed(1)}${unit}` }
    ];
  });

  readonly chartPoints = computed(() => {
    const data = this.chartData();
    if (data.length === 0) {
      return { weight: [], bodyFat: [], muscleMass: [] };
    }

    const getPointsForMetric = (metric: 'weight' | 'bodyFat' | 'muscleMass') => {
      const values = data.map(m => Number(m[metric]) || 0);
      const minVal = Math.min(...values);
      const maxVal = Math.max(...values);
      const valRange = maxVal - minVal || 1;

      const padding = valRange * 0.15;
      const yMin = minVal - padding;
      const yMax = maxVal + padding;
      const yRange = yMax - yMin;

      const svgWidth = 600;
      const svgHeight = 180;
      const topMargin = 20;

      return data.map((item, index) => {
        const x = data.length > 1 ? (index / (data.length - 1)) * (svgWidth - 80) + 50 : svgWidth / 2;
        const val = Number(item[metric]) || 0;
        const y = svgHeight - ((val - yMin) / yRange) * (svgHeight - topMargin) + topMargin;
        return {
          x,
          y,
          val,
          date: item.date as Date
        };
      });
    };

    return {
      weight: getPointsForMetric('weight'),
      bodyFat: getPointsForMetric('bodyFat'),
      muscleMass: getPointsForMetric('muscleMass')
    };
  });

  getSplinePath(points: {x: number, y: number}[]): string {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const cp1x = p1.x + (p2.x - p1.x) * 0.3;
      const cp1y = p1.y;
      const cp2x = p2.x - (p2.x - p1.x) * 0.3;
      const cp2y = p2.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  }

  getSplineAreaPath(points: {x: number, y: number}[]): string {
    if (points.length < 2) return '';
    const basePath = this.getSplinePath(points);
    const first = points[0];
    const last = points[points.length - 1];
    return `${basePath} L ${last.x} 180 L ${first.x} 180 Z`;
  }

  readonly weightPath = computed(() => this.getSplinePath(this.chartPoints().weight));
  readonly weightAreaPath = computed(() => this.getSplineAreaPath(this.chartPoints().weight));

  readonly bodyFatPath = computed(() => this.getSplinePath(this.chartPoints().bodyFat));
  readonly bodyFatAreaPath = computed(() => this.getSplineAreaPath(this.chartPoints().bodyFat));

  readonly muscleMassPath = computed(() => this.getSplinePath(this.chartPoints().muscleMass));
  readonly muscleMassAreaPath = computed(() => this.getSplineAreaPath(this.chartPoints().muscleMass));

  formatDateShort(d: Date): string {
    if (!d) return '';
    return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
  }

  formatDateFull(d: Date): string {
    if (!d) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getDiff(entry: any, field: string, prevEntry: any): { text: string, type: 'improve' | 'worse' | 'neutral' } | null {
    if (!prevEntry) return null;
    
    const currVal = Number(entry[field]);
    const prevVal = Number(prevEntry[field]);
    
    if (isNaN(currVal) || isNaN(prevVal) || currVal <= 0 || prevVal <= 0) return null;
    
    const delta = currVal - prevVal;
    if (Math.abs(delta) < 0.05) return null; // no significant change
    
    let type: 'improve' | 'worse' | 'neutral' = 'neutral';
    
    if (field === 'bodyFat') {
      type = delta < 0 ? 'improve' : 'worse';
    } else if (field === 'muscleMass') {
      type = delta > 0 ? 'improve' : 'worse';
    } else if (field === 'bodyAge') {
      type = delta < 0 ? 'improve' : 'worse';
    } else if (field === 'bmi') {
      type = delta < 0 ? 'improve' : 'worse';
    } else if (field === 'metabolism') {
      type = delta > 0 ? 'improve' : 'worse';
    } else {
      type = 'neutral';
    }
    
    const formattedDelta = (field === 'bodyAge' || field === 'metabolism') 
      ? Math.abs(delta).toFixed(0) 
      : Math.abs(delta).toFixed(1);
      
    const unit = field === 'weight' ? ' kg' : (field === 'bodyFat' || field === 'muscleMass' ? '%' : (field === 'metabolism' ? ' kcal' : (field === 'bodyAge' ? ' Yrs' : '')));
    const arrow = delta > 0 ? '↑' : '↓';
    
    return {
      text: `${arrow} ${formattedDelta}${unit}`,
      type
    };
  }
}
