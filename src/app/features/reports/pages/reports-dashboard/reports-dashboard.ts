import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { ReportsService, DailyPerformanceResult, WeeklyPerformanceResult, MonthlyPerformanceResult } from '../../../../core/services/reports.service';
import { IncidentService } from '../../../../core/services/incident.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { AuthService } from '../../../../core/services/auth.service';
import { IncidentDialogComponent } from '../../components/incident-dialog/incident-dialog.component';
import { VolumeChartComponent } from '../../components/volume-chart/volume-chart';
import { SalesPerformanceComponent } from '../../components/sales-performance/sales-performance';
import { StaffSalesComponent } from '../../components/staff-sales/staff-sales';
import { ProductBreakdownComponent } from '../../components/product-breakdown/product-breakdown';
import { MemberAttendanceComponent } from '../../components/member-attendance/member-attendance';
import { IncidentReport, SystemAnomaly } from '../../../../core/models/incident.model';
import { toLocalDateStr } from '../../../../core/utils/date.utils';
import { firstValueFrom } from 'rxjs';
import { fadeIn } from '../../../../core/animations/animations';

export type PerformanceCadence = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';

@Component({
  selector: 'app-reports-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatNativeDateModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    VolumeChartComponent,
    SalesPerformanceComponent,
    StaffSalesComponent,
    ProductBreakdownComponent,
    MemberAttendanceComponent
  ],
  templateUrl: './reports-dashboard.html',
  styleUrl: './reports-dashboard.css',
  animations: [fadeIn]
})
export class ReportsDashboardComponent implements OnInit {
  private reportsService = inject(ReportsService);
  private incidentService = inject(IncidentService);
  private settingsService = inject(SettingsService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  // Active Cadence Mode
  activeCadence = signal<PerformanceCadence>('DAILY');
  isLoading = signal(false);

  // Date States
  selectedDailyDate = signal<Date>(new Date());
  selectedWeeklyDate = signal<Date>(new Date());
  selectedMonthlyYear = signal<number>(new Date().getFullYear());
  selectedMonthlyMonth = signal<number>(new Date().getMonth());

  // Custom range fallback
  range = new FormGroup({
    start: new FormControl<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    end: new FormControl<Date>(new Date())
  });

  // Performance Data Store
  dailyData = signal<DailyPerformanceResult | null>(null);
  weeklyData = signal<WeeklyPerformanceResult | null>(null);
  monthlyData = signal<MonthlyPerformanceResult | null>(null);

  // Legacy/Custom Range Data Cache
  volumeData: { date: string; count: number }[] = [];
  peakHours: { hour: string; count: number }[] = [];
  salesData: { date: string; total: number }[] = [];
  monthlyQuota = signal(0);
  staffData: { name: string; total: number }[] = [];
  productData: { name: string; quantity: number; revenue: number }[] = [];
  memberData: { name: string; count: number }[] = [];

  // Weekly Date Range Computations
  weekRange = computed(() => {
    const d = new Date(this.selectedWeeklyDate());
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday as start of week
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { monday, sunday };
  });

  weeklyDateLabel = computed(() => {
    const { monday, sunday } = this.weekRange();
    const mStr = monday.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const sStr = sunday.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    return `${mStr} – ${sStr}`;
  });

  monthlyDateLabel = computed(() => {
    const d = new Date(this.selectedMonthlyYear(), this.selectedMonthlyMonth(), 1);
    return d.toLocaleDateString([], { month: 'long', year: 'numeric' });
  });

  dailyDateLabel = computed(() => {
    const d = this.selectedDailyDate();
    const now = new Date();
    const isToday = toLocalDateStr(d) === toLocalDateStr(now);
    const dateFormatted = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    return isToday ? `Today (${dateFormatted})` : dateFormatted;
  });

  ngOnInit() {
    this.authService.user$.subscribe(user => {
      if (user && !this.authService.hasAnyRole(['ADMIN', 'MANAGER'])) {
        this.router.navigate(['/dashboard']);
        return;
      }
    });
    this.loadSettings();
    this.refreshCurrentCadence();
  }

  async loadSettings() {
    try {
      const s = await firstValueFrom(this.settingsService.getSettings());
      this.monthlyQuota.set(s.monthlyQuota || 0);
    } catch {
      this.monthlyQuota.set(0);
    }
  }

  // ── Cadence Switcher Handlers ──
  setCadence(cadence: PerformanceCadence) {
    this.activeCadence.set(cadence);
    this.refreshCurrentCadence();
  }

  refreshCurrentCadence() {
    switch (this.activeCadence()) {
      case 'DAILY':
        this.loadDailyPerformance();
        break;
      case 'WEEKLY':
        this.loadWeeklyPerformance();
        break;
      case 'MONTHLY':
        this.loadMonthlyPerformance();
        break;
      case 'CUSTOM':
        this.loadCustomRangeReport();
        break;
    }
  }

  // ── Daily Navigation ──
  prevDay() {
    const prev = new Date(this.selectedDailyDate());
    prev.setDate(prev.getDate() - 1);
    this.selectedDailyDate.set(prev);
    this.loadDailyPerformance();
  }

  nextDay() {
    const next = new Date(this.selectedDailyDate());
    next.setDate(next.getDate() + 1);
    this.selectedDailyDate.set(next);
    this.loadDailyPerformance();
  }

  setDailyToday() {
    this.selectedDailyDate.set(new Date());
    this.loadDailyPerformance();
  }

  onDailyDatePicked(e: any) {
    if (e.target.value) {
      const [y, m, d] = e.target.value.split('-').map(Number);
      this.selectedDailyDate.set(new Date(y, m - 1, d));
      this.loadDailyPerformance();
    }
  }

  // ── Weekly Navigation ──
  prevWeek() {
    const prev = new Date(this.selectedWeeklyDate());
    prev.setDate(prev.getDate() - 7);
    this.selectedWeeklyDate.set(prev);
    this.loadWeeklyPerformance();
  }

  nextWeek() {
    const next = new Date(this.selectedWeeklyDate());
    next.setDate(next.getDate() + 7);
    this.selectedWeeklyDate.set(next);
    this.loadWeeklyPerformance();
  }

  setWeeklyCurrent() {
    this.selectedWeeklyDate.set(new Date());
    this.loadWeeklyPerformance();
  }

  // ── Monthly Navigation ──
  prevMonth() {
    let m = this.selectedMonthlyMonth() - 1;
    let y = this.selectedMonthlyYear();
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    this.selectedMonthlyMonth.set(m);
    this.selectedMonthlyYear.set(y);
    this.loadMonthlyPerformance();
  }

  nextMonth() {
    let m = this.selectedMonthlyMonth() + 1;
    let y = this.selectedMonthlyYear();
    if (m > 11) {
      m = 0;
      y += 1;
    }
    this.selectedMonthlyMonth.set(m);
    this.selectedMonthlyYear.set(y);
    this.loadMonthlyPerformance();
  }

  setMonthlyCurrent() {
    const now = new Date();
    this.selectedMonthlyYear.set(now.getFullYear());
    this.selectedMonthlyMonth.set(now.getMonth());
    this.loadMonthlyPerformance();
  }

  // ── Data Loaders ──
  async loadDailyPerformance() {
    this.isLoading.set(true);
    try {
      const data = await this.reportsService.getDailyPerformance(this.selectedDailyDate());
      this.dailyData.set(data);

      // Populate chart inputs for daily peak hour visualization
      this.volumeData = data.attendance.hourlyDistribution.map(h => ({ date: h.hour, count: h.count }));
      this.peakHours = [{ hour: data.attendance.peakHour, count: data.attendance.peakCount }];
    } catch (err) {
      console.error('[ReportsDashboard] Error loading daily performance:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadWeeklyPerformance() {
    this.isLoading.set(true);
    const { monday, sunday } = this.weekRange();
    try {
      const data = await this.reportsService.getWeeklyPerformance(monday, sunday);
      this.weeklyData.set(data);

      // Populate charts
      this.salesData = data.dayPace.map(d => ({ date: d.dayName, total: d.currentSales }));
      this.volumeData = data.hourlyDistribution.map(h => ({ date: h.hour, count: h.totalCount }));
      this.peakHours = [
        { hour: data.peakRushHour.hour, count: data.peakRushHour.avgCount },
        { hour: data.lullHour.hour, count: data.lullHour.avgCount }
      ];
      this.staffData = data.staffLeaderboard.map(s => ({ name: s.name, total: s.totalSales }));
    } catch (err) {
      console.error('[ReportsDashboard] Error loading weekly performance:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadMonthlyPerformance() {
    this.isLoading.set(true);
    const y = this.selectedMonthlyYear();
    const m = this.selectedMonthlyMonth();
    try {
      const data = await this.reportsService.getMonthlyPerformance(y, m, this.monthlyQuota());
      this.monthlyData.set(data);

      // Populate charts for monthly view
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0, 23, 59, 59);
      const [vol, sales] = await Promise.all([
        this.reportsService.getVolumeAnalytics(start, end),
        this.reportsService.getSalesAnalytics(start, end)
      ]);
      this.volumeData = vol.dailyVolume;
      this.peakHours = vol.peakHours;
      this.salesData = sales.dailySales;
      this.staffData = sales.staffPerformance;
      this.productData = sales.topProducts;
    } catch (err) {
      console.error('[ReportsDashboard] Error loading monthly performance:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadCustomRangeReport() {
    if (!this.range.value.start || !this.range.value.end) return;
    this.isLoading.set(true);
    try {
      const start = this.range.value.start;
      const end = this.range.value.end;
      const [volume, sales, attendees] = await Promise.all([
        this.reportsService.getVolumeAnalytics(start, end),
        this.reportsService.getSalesAnalytics(start, end),
        this.reportsService.getTopAttendees(start, end)
      ]);
      this.volumeData = volume.dailyVolume;
      this.peakHours = volume.peakHours;
      this.salesData = sales.dailySales;
      this.staffData = sales.staffPerformance;
      this.productData = sales.topProducts;
      this.memberData = attendees;
    } catch (err) {
      console.error('[ReportsDashboard] Error loading custom range report:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── Incident Management ──
  openCreateIncidentDialog() {
    let defaultDate = toLocalDateStr(new Date());
    if (this.activeCadence() === 'DAILY') {
      defaultDate = toLocalDateStr(this.selectedDailyDate());
    }

    const ref = this.dialog.open(IncidentDialogComponent, {
      width: '620px',
      maxWidth: '95vw',
      data: { defaultDate }
    });

    ref.afterClosed().subscribe(res => {
      if (res) {
        this.refreshCurrentCadence();
      }
    });
  }

  openEditIncidentDialog(incident: IncidentReport) {
    const ref = this.dialog.open(IncidentDialogComponent, {
      width: '620px',
      maxWidth: '95vw',
      data: { incident }
    });

    ref.afterClosed().subscribe(res => {
      if (res) {
        this.refreshCurrentCadence();
      }
    });
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
