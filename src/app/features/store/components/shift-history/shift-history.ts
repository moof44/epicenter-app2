import { Component, inject, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSidenavModule, MatDrawer } from '@angular/material/sidenav';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { CashRegisterService } from '../../../../core/services/cash-register.service';
import { ShiftSession, CashTransaction } from '../../../../core/models/cash-register.model';
import {
  calculateVariance,
  getVarianceType,
  calculateNetCashFlow,
  filterTransactionsByType,
  formatShiftDate
} from '../../../../core/utils/cash-register.utils';
import { fadeIn } from '../../../../core/animations/animations';

@Component({
  selector: 'app-shift-history',
  imports: [
    CommonModule, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule,
    MatIconModule, MatChipsModule, MatTooltipModule, MatSidenavModule, MatDividerModule,
    MatTabsModule
  ],
  templateUrl: './shift-history.html',
  styleUrl: './shift-history.css',
  animations: [fadeIn]
})
export class ShiftHistory implements AfterViewInit {
  private cashRegisterService = inject(CashRegisterService);

  dataSource = new MatTableDataSource<ShiftSession>([]);
  displayedColumns = ['date', 'openingCash', 'sales', 'expenses', 'endingBalance', 'variance', 'actions'];

  selectedShift: ShiftSession | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('detailDrawer') detailDrawer!: MatDrawer;

  constructor() {
    this.cashRegisterService.getShiftHistory().subscribe(shifts => {
      // Only show closed shifts
      this.dataSource.data = shifts.filter(s => s.status === 'CLOSED');
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }


  // Helper methods
  formatDate(timestamp: any): Date {
    return formatShiftDate(timestamp);
  }

  getVariance(shift: ShiftSession): number {
    return calculateVariance(shift);
  }

  getVarianceType(shift: ShiftSession): 'balanced' | 'shortage' | 'overage' {
    return getVarianceType(calculateVariance(shift));
  }

  getNetCashFlow(shift: ShiftSession): number {
    return calculateNetCashFlow(shift);
  }

  // Drill-down
  viewDetails(shift: ShiftSession): void {
    this.selectedShift = shift;
    this.detailDrawer.open();
  }

  closeDetails(): void {
    this.detailDrawer.close();
    this.selectedShift = null;
  }

  // Transaction filtering for detail view
  getSalesTransactions(shift: ShiftSession): CashTransaction[] {
    return filterTransactionsByType(shift.transactions, 'Sale');
  }

  getExpenseTransactions(shift: ShiftSession): CashTransaction[] {
    return filterTransactionsByType(shift.transactions, 'Expense');
  }

  getFloatInTransactions(shift: ShiftSession): CashTransaction[] {
    return filterTransactionsByType(shift.transactions, 'Float_In');
  }

  getFloatOutTransactions(shift: ShiftSession): CashTransaction[] {
    return filterTransactionsByType(shift.transactions, 'Float_Out');
  }

  getVarianceLabel(type: 'balanced' | 'shortage' | 'overage'): string {
    const labels = {
      balanced: 'Balanced',
      shortage: 'Shortage',
      overage: 'Overage'
    };
    return labels[type];
  }

  getVarianceIcon(type: 'balanced' | 'shortage' | 'overage'): string {
    const icons = {
      balanced: 'check_circle',
      shortage: 'warning',
      overage: 'info'
    };
    return icons[type];
  }
}
