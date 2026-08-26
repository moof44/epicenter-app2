import { Component, inject, ViewChild, AfterViewInit, OnInit } from '@angular/core';
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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

export interface EnrichedShiftSession extends ShiftSession {
  prevShift?: ShiftSession | null;
  prevShiftEndingBalance?: number | null;
  prevShiftClosedBy?: string | null;
  prevShiftEndTime?: any;
  handoverDiscrepancy?: number | null;
  handoverStatus?: 'MATCHED' | 'SHORTAGE' | 'OVERAGE' | 'INITIAL';
}

@Component({
  selector: 'app-shift-history',
  imports: [
    CommonModule, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule,
    MatIconModule, MatChipsModule, MatTooltipModule, MatSidenavModule, MatDividerModule,
    MatTabsModule, MatDatepickerModule, MatNativeDateModule, MatInputModule, FormsModule
  ],
  templateUrl: './shift-history.html',
  styleUrl: './shift-history.css',
  animations: [fadeIn]
})
export class ShiftHistory implements AfterViewInit, OnInit {
  private cashRegisterService = inject(CashRegisterService);

  dataSource = new MatTableDataSource<EnrichedShiftSession>([]);
  displayedColumns = ['date', 'openingCash', 'sales', 'expenses', 'endingBalance', 'variance', 'actions'];

  selectedShift: EnrichedShiftSession | null = null;

  // Summary Metrics
  totalSales = 0;
  totalExpenses = 0;
  totalShiftVariance = 0;
  totalHandoverDiscrepancy = 0;
  mismatchCount = 0;
  closedShiftsCount = 0;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('detailDrawer') detailDrawer!: MatDrawer;

  // Filters
  startDate: Date | null = null;
  endDate: Date | null = null;
  staffFilter = '';

  constructor() { }

  ngOnInit() {
    this.loadShifts();
  }

  loadShifts() {
    this.cashRegisterService.getShiftHistory(
      100,
      this.startDate || undefined,
      this.endDate || undefined
    ).subscribe(shifts => {
      let filtered = shifts.filter(s => s.status === 'CLOSED');

      if (this.staffFilter) {
        const term = this.staffFilter.toLowerCase();
        filtered = filtered.filter(s => s.openedBy && s.openedBy.toLowerCase().includes(term));
      }

      // Sort chronologically (oldest to newest) to accurately link consecutive shifts
      const chronological = [...filtered].sort((a, b) => {
        const timeA = formatShiftDate(a.startTime).getTime();
        const timeB = formatShiftDate(b.startTime).getTime();
        return timeA - timeB;
      });

      // Enrich with previous shift handover data
      const enriched: EnrichedShiftSession[] = chronological.map((shift, idx) => {
        if (idx === 0) {
          return {
            ...shift,
            prevShift: null,
            prevShiftEndingBalance: null,
            prevShiftClosedBy: null,
            prevShiftEndTime: null,
            handoverDiscrepancy: 0,
            handoverStatus: 'INITIAL'
          };
        }

        const prev = chronological[idx - 1];
        const prevEnding = prev.actualClosingBalance !== null && prev.actualClosingBalance !== undefined
          ? prev.actualClosingBalance
          : prev.expectedClosingBalance;

        const diff = (shift.openingBalance || 0) - (prevEnding || 0);
        const roundedDiff = Math.round(diff * 100) / 100;

        let status: 'MATCHED' | 'SHORTAGE' | 'OVERAGE' = 'MATCHED';
        if (roundedDiff < -0.01) {
          status = 'SHORTAGE';
        } else if (roundedDiff > 0.01) {
          status = 'OVERAGE';
        }

        return {
          ...shift,
          prevShift: prev,
          prevShiftEndingBalance: prevEnding,
          prevShiftClosedBy: prev.closedBy,
          prevShiftEndTime: prev.endTime,
          handoverDiscrepancy: roundedDiff,
          handoverStatus: status
        };
      });

      // Reverse for UI table display (newest shift on top)
      const displayed = [...enriched].reverse();
      this.dataSource.data = displayed;

      // Compute KPI summaries
      this.computeSummaryStats(displayed);
    });
  }

  private computeSummaryStats(shifts: EnrichedShiftSession[]) {
    this.closedShiftsCount = shifts.length;
    this.totalSales = shifts.reduce((acc, s) => acc + (s.totalSales || s.totalRevenue || 0), 0);
    this.totalExpenses = shifts.reduce((acc, s) => acc + (s.totalExpenses || 0), 0);
    this.totalShiftVariance = shifts.reduce((acc, s) => acc + this.getVariance(s), 0);
    this.totalHandoverDiscrepancy = shifts.reduce((acc, s) => acc + (s.handoverDiscrepancy || 0), 0);
    this.mismatchCount = shifts.filter(s => s.handoverStatus === 'SHORTAGE' || s.handoverStatus === 'OVERAGE').length;
  }

  applyFilters() {
    this.loadShifts();
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

  getHandoverTooltip(shift: EnrichedShiftSession): string {
    if (shift.handoverStatus === 'INITIAL') {
      return 'First recorded shift in timeline';
    }
    const prevClosing = shift.prevShiftEndingBalance !== null && shift.prevShiftEndingBalance !== undefined 
      ? `₱${shift.prevShiftEndingBalance.toFixed(2)}` 
      : 'N/A';
    const closer = shift.prevShiftClosedBy ? ` (Closed by ${shift.prevShiftClosedBy})` : '';
    const diff = shift.handoverDiscrepancy !== null && shift.handoverDiscrepancy !== undefined
      ? ` • Diff: ${shift.handoverDiscrepancy > 0 ? '+' : ''}₱${shift.handoverDiscrepancy.toFixed(2)}`
      : '';
    return `Previous shift closing was ${prevClosing}${closer}${diff}`;
  }

  // Drill-down
  viewDetails(shift: EnrichedShiftSession): void {
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
