import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { StoreService } from '../../../../core/services/store.service';
import { Product } from '../../../../core/models/store.model';
import { fadeIn } from '../../../../core/animations/animations';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-stock-take',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatTableModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatSnackBarModule, MatTooltipModule,
    MatCardModule
  ],
  templateUrl: './stock-take.html',
  styleUrl: './stock-take.css',
  animations: [fadeIn]
})
export class StockTakeComponent implements OnInit {
  private storeService = inject(StoreService);
  private snackBar = inject(MatSnackBar);

  dataSource = new MatTableDataSource<Product>([]);
  displayedColumns = ['name', 'systemStock', 'physicalCount', 'variance'];
  
  auditValues: { [id: string]: number } = {};

  ngOnInit() {
    this.storeService.getProducts().subscribe(products => {
      // Sort by Name
      this.dataSource.data = products.sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  updateAuditValue(id: string, value: number) {
    if (value === null || value === undefined) {
      delete this.auditValues[id];
    } else {
      this.auditValues[id] = value;
    }
  }

  hasValue(product: Product): boolean {
    return this.auditValues[product.id!] !== undefined;
  }

  getVariance(product: Product): number {
    if (!this.hasValue(product)) return 0;
    const physical = this.auditValues[product.id!];
    return physical - product.stock;
  }

  getVarianceClass(product: Product): string {
    if (!this.hasValue(product)) return '';
    const v = this.getVariance(product);
    if (v === 0) return 'match';
    if (v < 0) return 'mismatch'; // Missing items
    return 'positive'; // Found extra
  }

  getCountedItems(): number {
    return Object.keys(this.auditValues).length;
  }

  async finalizeAdjustment() {
    const auditData = Object.entries(this.auditValues).map(([productId, physicalCount]) => ({
      productId,
      physicalCount
    }));

    if (auditData.length === 0) return;

    if (!confirm(`Submit inventory adjustments for ${auditData.length} items? This will update stock levels.`)) return;

    try {
      await this.storeService.reconcileInventory(auditData);
      this.snackBar.open('Inventory reconciliation complete', 'Close', { duration: 3000 });
      this.auditValues = {}; // Reset form
      // Note: Data source updates automatically via subscription
    } catch (err) {
      console.error(err);
      this.snackBar.open('Error reconciling inventory', 'Close', { duration: 3000 });
    }
  }
}
