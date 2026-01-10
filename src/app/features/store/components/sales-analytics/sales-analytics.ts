import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { StoreService } from '../../../../core/services/store.service';
import { ProductSalesData } from '../../../../core/models/store.model';
import { fadeIn } from '../../../../core/animations/animations';
import { SettingsService } from '../../../../core/services/settings.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-sales-analytics',
  imports: [
    CommonModule, MatCardModule, MatIconModule, MatTableModule, MatProgressBarModule
  ],
  templateUrl: './sales-analytics.html',
  styleUrl: './sales-analytics.css',
  animations: [fadeIn],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SalesAnalytics {
  private storeService = inject(StoreService);
  private settingsService = inject(SettingsService);

  analytics$ = this.storeService.getSalesAnalytics();
  settings$ = this.settingsService.getSettings();
  settings = toSignal(this.settings$, { initialValue: { monthlyQuota: 0 } });

  // Calculations
  getMonthlyProgress(current: number): number {
    const quota = this.settings().monthlyQuota || 0;
    if (quota === 0) return 0;
    return Math.min((current / quota) * 100, 100);
  }

  getDailyQuota(monthlyRevenue: number): number {
    const quota = this.settings().monthlyQuota || 0;
    if (quota === 0) return 0;

    const remainingQuota = Math.max(quota - monthlyRevenue, 0);
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const remainingDays = lastDay - now.getDate() + 1; // Include today

    return remainingQuota / remainingDays;
  }

  displayedColumns = ['rank', 'productName', 'totalQuantitySold', 'totalRevenue'];

  getMaxQuantity(products: ProductSalesData[]): number {
    return Math.max(...products.map(p => p.totalQuantitySold), 1);
  }
}
