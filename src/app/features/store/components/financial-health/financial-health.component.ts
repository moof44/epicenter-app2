import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgApexchartsModule } from 'ng-apexcharts';
import { FinancialAnalyticsService } from '../../../../core/services/financial-analytics.service';
import { FinancialHealthSummary } from '../../../../core/models/financial-health.model';
import { fadeIn } from '../../../../core/animations/animations';

@Component({
  selector: 'app-financial-health',
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatIconModule, MatCardModule,
    MatChipsModule, MatSnackBarModule, MatProgressSpinnerModule, MatTooltipModule,
    NgApexchartsModule
  ],
  templateUrl: './financial-health.component.html',
  styleUrl: './financial-health.component.css',
  animations: [fadeIn]
})
export class FinancialHealthComponent implements OnInit {
  private analyticsService = inject(FinancialAnalyticsService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  readonly Math = Math;

  summary = signal<FinancialHealthSummary | null>(null);
  isLoading = signal(true);
  dateFilter = signal<'THIS_MONTH' | 'LAST_MONTH' | 'LAST_90_DAYS'>('THIS_MONTH');

  donutChartSeries: number[] = [];
  donutChartLabels: string[] = [];
  donutChartColors: string[] = [];
  donutChartOptions: any = {
    chart: { type: 'donut', height: 320 },
    legend: { position: 'bottom' },
    dataLabels: { enabled: true },
    plotOptions: { pie: { donut: { size: '65%' } } }
  };

  ngOnInit(): void {
    this.loadAnalytics();
  }

  setPeriod(period: 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_90_DAYS'): void {
    this.dateFilter.set(period);
    this.loadAnalytics();
  }

  async loadAnalytics(): Promise<void> {
    this.isLoading.set(true);
    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth(), 1);
    let end = new Date();

    if (this.dateFilter() === 'LAST_MONTH') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (this.dateFilter() === 'LAST_90_DAYS') {
      start = new Date();
      start.setDate(start.getDate() - 90);
    }

    try {
      const res = await this.analyticsService.analyzeFinancialHealth(start, end);
      this.summary.set(res);

      this.donutChartSeries = res.outflowBreakdown.map(b => b.amount);
      this.donutChartLabels = res.outflowBreakdown.map(b => b.label);
      this.donutChartColors = res.outflowBreakdown.map(b => b.color);
    } catch (err: any) {
      console.error('Failed to calculate financial health:', err);
      this.snackBar.open('Failed to load financial health analysis', 'Close', { duration: 3000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  navigateToAction(route?: string): void {
    if (route) {
      this.router.navigateByUrl(route);
    }
  }

  printReport(): void {
    window.print();
  }

  getSeverityClass(severity: string): string {
    switch (severity) {
      case 'CRITICAL': return 'sev-critical';
      case 'WARNING': return 'sev-warning';
      case 'POSITIVE': return 'sev-positive';
      default: return 'sev-opportunity';
    }
  }

  getGradeColor(grade?: string): string {
    switch (grade) {
      case 'A': return '#10b981';
      case 'B': return '#0284c7';
      case 'C': return '#f59e0b';
      case 'D': return '#ef4444';
      default: return '#64748b';
    }
  }
}