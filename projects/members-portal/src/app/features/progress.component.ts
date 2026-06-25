import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../core/services/dashboard.service';

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen text-text-primary py-4 px-2 sm:px-6 select-none animate-fade-in">
      
      <!-- Top Title and Metrics Selector -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-bg-surface-alt pb-4">
        <div>
          <h1 class="text-2xl font-black font-oswald text-gold-primary tracking-wide uppercase">My Fitness Journey</h1>
          <p class="text-xs text-text-secondary mt-0.5">Track your somatic measurements and checkup trends</p>
        </div>
        
        <!-- Toggle Tabs -->
        <div class="flex bg-bg-surface-alt p-1 rounded-xl self-start md:self-center border border-bg-surface-alt/40">
          <button 
            (click)="activeMetric.set('weight')"
            [class.bg-gradient-to-b]="activeMetric() === 'weight'"
            [class.from-gold-primary]="activeMetric() === 'weight'"
            [class.to-gold-dark]="activeMetric() === 'weight'"
            [class.text-black]="activeMetric() === 'weight'"
            [class.text-text-secondary]="activeMetric() !== 'weight'"
            class="px-4 py-1.5 rounded-lg text-xs font-bold font-oswald uppercase tracking-wider transition-all duration-200 active:scale-95"
          >
            Weight
          </button>
          <button 
            (click)="activeMetric.set('bodyFat')"
            [class.bg-gradient-to-b]="activeMetric() === 'bodyFat'"
            [class.from-gold-primary]="activeMetric() === 'bodyFat'"
            [class.to-gold-dark]="activeMetric() === 'bodyFat'"
            [class.text-black]="activeMetric() === 'bodyFat'"
            [class.text-text-secondary]="activeMetric() !== 'bodyFat'"
            class="px-4 py-1.5 rounded-lg text-xs font-bold font-oswald uppercase tracking-wider transition-all duration-200 active:scale-95"
          >
            Body Fat %
          </button>
          <button 
            (click)="activeMetric.set('muscleMass')"
            [class.bg-gradient-to-b]="activeMetric() === 'muscleMass'"
            [class.from-gold-primary]="activeMetric() === 'muscleMass'"
            [class.to-gold-dark]="activeMetric() === 'muscleMass'"
            [class.text-black]="activeMetric() === 'muscleMass'"
            [class.text-text-secondary]="activeMetric() !== 'muscleMass'"
            class="px-4 py-1.5 rounded-lg text-xs font-bold font-oswald uppercase tracking-wider transition-all duration-200 active:scale-95"
          >
            Muscle %
          </button>
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
              {{ metricTitle() }} Progress Trend
            </span>
            <span class="text-[10px] text-text-secondary">
              Showing past {{ chartData().length }} checkups
            </span>
          </div>

          <!-- Chart Area -->
          <div class="relative w-full h-[240px] bg-bg-surface-alt/20 rounded-2xl border border-bg-surface-alt/30 p-2 overflow-hidden">
            
            <svg viewBox="0 0 600 220" width="100%" height="100%" class="select-none overflow-visible">
              <!-- Grid Lines -->
              @for (line of chartMeta().lines; track line.y) {
                <g class="opacity-40">
                  <line 
                    x1="20" 
                    [attr.y1]="line.y" 
                    x2="580" 
                    [attr.y2]="line.y" 
                    stroke="#2a2a2a" 
                    stroke-width="1" 
                    stroke-dasharray="4"
                  />
                  <text 
                    x="24" 
                    [attr.y]="line.y - 4" 
                    fill="#888" 
                    font-size="9" 
                    font-family="sans-serif"
                  >
                    {{ line.val.toFixed(1) }}{{ activeMetric() !== 'weight' ? '%' : ' kg' }}
                  </text>
                </g>
              }

              <!-- Chart Gradient Defs -->
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#D4AF37" stop-opacity="0.3"/>
                  <stop offset="100%" stop-color="#D4AF37" stop-opacity="0.0"/>
                </linearGradient>
              </defs>

              <!-- Filled Area Under Chart -->
              @if (svgAreaPath()) {
                <path [attr.d]="svgAreaPath()" fill="url(#chartGradient)" />
              }

              <!-- Main Plot Line -->
              @if (svgPath()) {
                <path 
                  [attr.d]="svgPath()" 
                  fill="none" 
                  stroke="#D4AF37" 
                  stroke-width="3" 
                  stroke-linecap="round" 
                  stroke-linejoin="round"
                  class="filter drop-shadow-[0_2px_8px_rgba(212,175,55,0.4)]"
                />
              }

              <!-- Node Points -->
              @for (point of chartPoints(); track point.x; let idx = $index) {
                <g class="group">
                  <!-- Hover Pulse Glow -->
                  <circle 
                    [attr.cx]="point.x" 
                    [attr.cy]="point.y" 
                    r="8" 
                    fill="#FFD700" 
                    class="opacity-0 group-hover:opacity-20 transition-opacity duration-150 cursor-pointer"
                  />
                  <!-- Solid Node -->
                  <circle 
                    [attr.cx]="point.x" 
                    [attr.cy]="point.y" 
                    r="4" 
                    fill="#000" 
                    stroke="#D4AF37" 
                    stroke-width="2.5" 
                    class="cursor-pointer"
                  />
                  <!-- Value Text Label (displays above node) -->
                  <text 
                    [attr.x]="point.x" 
                    [attr.y]="point.y - 10" 
                    fill="#FFD700" 
                    font-size="9" 
                    font-weight="bold" 
                    text-anchor="middle"
                    font-family="Oswald"
                    class="opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
                  >
                    {{ point.val.toFixed(1) }}
                  </text>
                  <!-- Date label on horizontal axis -->
                  <text 
                    [attr.x]="point.x" 
                    y="212" 
                    fill="#666" 
                    font-size="8" 
                    text-anchor="middle"
                    font-family="sans-serif"
                    class="opacity-60 pointer-events-none"
                  >
                    {{ formatDateShort(point.date) }}
                  </text>
                </g>
              }
            </svg>

          </div>
        </div>

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
                    <td class="py-3 px-4 font-bold text-text-primary">{{ formatDateFull(entry.date) }}</td>
                    
                    <!-- Weight -->
                    <td class="py-3 px-4">
                      <div class="flex flex-col gap-0.5">
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
                      </div>
                    </td>

                    <!-- Body Fat -->
                    <td class="py-3 px-4">
                      <div class="flex flex-col gap-0.5">
                        <span class="text-text-primary">{{ entry.bodyFat.toFixed(1) }}%</span>
                        @if (getDiff(entry, 'bodyFat', dashboardService.measurements()[idx + 1]); as diff) {
                          <span 
                            [class.text-emerald-400]="diff.type === 'improve'"
                            [class.text-red-400]="diff.type === 'worse'"
                            [class.text-text-muted]="diff.type === 'neutral'"
                            class="text-[9px] font-bold"
                          >
                            {{ diff.text }}
                          </span>
                        }
                      </div>
                    </td>

                    <!-- Muscle Mass -->
                    <td class="py-3 px-4">
                      <div class="flex flex-col gap-0.5">
                        <span class="text-text-primary">{{ entry.muscleMass.toFixed(1) }}%</span>
                        @if (getDiff(entry, 'muscleMass', dashboardService.measurements()[idx + 1]); as diff) {
                          <span 
                            [class.text-emerald-400]="diff.type === 'improve'"
                            [class.text-red-400]="diff.type === 'worse'"
                            [class.text-text-muted]="diff.type === 'neutral'"
                            class="text-[9px] font-bold"
                          >
                            {{ diff.text }}
                          </span>
                        }
                      </div>
                    </td>

                    <!-- BMI -->
                    <td class="py-3 px-4">
                      <div class="flex flex-col gap-0.5">
                        <span class="text-text-secondary">{{ entry.bmi.toFixed(1) }}</span>
                        @if (getDiff(entry, 'bmi', dashboardService.measurements()[idx + 1]); as diff) {
                          <span 
                            [class.text-emerald-400]="diff.type === 'improve'"
                            [class.text-red-400]="diff.type === 'worse'"
                            [class.text-text-muted]="diff.type === 'neutral'"
                            class="text-[9px] font-bold"
                          >
                            {{ diff.text }}
                          </span>
                        }
                      </div>
                    </td>

                    <!-- Metabolism -->
                    <td class="py-3 px-4">
                      <div class="flex flex-col gap-0.5">
                        <span class="text-text-secondary">{{ entry.metabolism }} kcal</span>
                        @if (getDiff(entry, 'metabolism', dashboardService.measurements()[idx + 1]); as diff) {
                          <span 
                            [class.text-emerald-400]="diff.type === 'improve'"
                            [class.text-red-400]="diff.type === 'worse'"
                            [class.text-text-muted]="diff.type === 'neutral'"
                            class="text-[9px] font-bold"
                          >
                            {{ diff.text }}
                          </span>
                        }
                      </div>
                    </td>

                    <!-- Body Age -->
                    <td class="py-3 px-4">
                      <div class="flex flex-col gap-0.5">
                        <span class="text-text-secondary">{{ entry.bodyAge }} Years</span>
                        @if (getDiff(entry, 'bodyAge', dashboardService.measurements()[idx + 1]); as diff) {
                          <span 
                            [class.text-emerald-400]="diff.type === 'improve'"
                            [class.text-red-400]="diff.type === 'worse'"
                            [class.text-text-muted]="diff.type === 'neutral'"
                            class="text-[9px] font-bold"
                          >
                            {{ diff.text }}
                          </span>
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
  `]
})
export class ProgressComponent {
  readonly dashboardService = inject(DashboardService);
  
  readonly activeMetric = signal<'weight' | 'bodyFat' | 'muscleMass'>('weight');

  metricTitle = computed(() => {
    switch (this.activeMetric()) {
      case 'weight': return 'Body Weight';
      case 'bodyFat': return 'Body Fat Percentage';
      case 'muscleMass': return 'Muscle Mass Percentage';
    }
  });

  readonly chartData = computed(() => {
    const measurements = this.dashboardService.measurements();
    if (measurements.length === 0) return [];
    return [...measurements].reverse();
  });

  readonly chartPoints = computed(() => {
    const data = this.chartData();
    const metric = this.activeMetric();
    if (data.length === 0) return [];

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
      const x = data.length > 1 ? (index / (data.length - 1)) * (svgWidth - 60) + 30 : svgWidth / 2;
      const val = Number(item[metric]) || 0;
      const y = svgHeight - ((val - yMin) / yRange) * (svgHeight - topMargin) + topMargin;
      return {
        x,
        y,
        val,
        date: item.date as Date
      };
    });
  });

  readonly svgPath = computed(() => {
    const points = this.chartPoints();
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    
    return points.reduce((path, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${path} L ${p.x} ${p.y}`;
    }, '');
  });

  readonly svgAreaPath = computed(() => {
    const points = this.chartPoints();
    if (points.length < 2) return '';
    const first = points[0];
    const last = points[points.length - 1];
    
    const basePath = this.svgPath();
    return `${basePath} L ${last.x} 180 L ${first.x} 180 Z`;
  });

  readonly chartMeta = computed(() => {
    const data = this.chartData();
    const metric = this.activeMetric();
    if (data.length === 0) return { min: 0, max: 0, mid: 0, lines: [] };

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

    return {
      min: minVal,
      max: maxVal,
      mid: midVal,
      lines: [
        { y: getY(maxVal), val: maxVal },
        { y: getY(midVal), val: midVal },
        { y: getY(minVal), val: minVal }
      ]
    };
  });

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
    
    if (isNaN(currVal) || isNaN(prevVal)) return null;
    
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
