import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { StoreService } from '../../../../core/services/store.service';
import { ProductSalesData } from '../../../../core/models/store.model';
import { fadeIn } from '../../../../core/animations/animations';

@Component({
  selector: 'app-sales-analytics',
  imports: [
    CommonModule, MatCardModule, MatIconModule, MatTableModule, MatProgressBarModule
  ],
  templateUrl: './sales-analytics.html',
  styleUrl: './sales-analytics.css',
  animations: [fadeIn]
})
export class SalesAnalytics {
  private storeService = inject(StoreService);

  analytics$ = this.storeService.getSalesAnalytics();

  displayedColumns = ['rank', 'productName', 'totalQuantitySold', 'totalRevenue'];

  getMaxQuantity(products: ProductSalesData[]): number {
    return Math.max(...products.map(p => p.totalQuantitySold), 1);
  }
}
