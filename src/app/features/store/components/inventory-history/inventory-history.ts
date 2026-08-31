import { Component, inject, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { InventoryHistoryService } from '../../services/inventory-history.service';
import { InventoryLog } from '../../../../core/models/store.model';
import { fadeIn } from '../../../../core/animations/animations';
import { DocumentData, QueryDocumentSnapshot } from '@angular/fire/firestore';

@Component({
  selector: 'app-inventory-history',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule
  ],
  templateUrl: './inventory-history.html',
  styleUrl: './inventory-history.css',
  animations: [fadeIn],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryHistoryComponent implements OnInit {
  private historyService = inject(InventoryHistoryService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  dataSource = new MatTableDataSource<InventoryLog>([]);
  displayedColumns = ['date', 'type', 'product', 'performedBy', 'change', 'newStock'];

  lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
  isLoading = signal(false);
  hasMore = signal(true);
  pageSize = 30;

  // Filters
  startDate: Date | null = null;
  endDate: Date | null = null;
  selectedType = '';
  searchQuery = '';

  // Computed Metrics
  logsList = signal<InventoryLog[]>([]);
  totalLogsCount = computed(() => this.logsList().length);
  restockCount = computed(() => this.logsList().filter(l => l.type === 'RESTOCK').length);
  salesCount = computed(() => this.logsList().filter(l => l.type === 'SALE').length);
  adjustmentCount = computed(() => this.logsList().filter(l => l.type === 'AUDIT_ADJUSTMENT' || l.type === 'INTERNAL_USE').length);

  ngOnInit() {
    this.loadHistory();
  }

  setTypeFilter(type: string) {
    this.selectedType = type;
    this.applyFilters();
  }

  applyFilters() {
    this.lastDoc = null;
    this.hasMore.set(true);
    this.loadHistory();
  }

  resetFilters() {
    this.startDate = null;
    this.endDate = null;
    this.selectedType = '';
    this.searchQuery = '';
    this.applyFilters();
  }

  async loadHistory(loadMore = false) {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    this.cdr.markForCheck();

    try {
      const filters = {
        startDate: this.startDate || undefined,
        endDate: this.endDate || undefined,
        type: this.selectedType || undefined,
        search: this.searchQuery.trim() || undefined
      };

      const result = await this.historyService.getHistory(
        filters,
        this.pageSize,
        loadMore ? (this.lastDoc || undefined) : undefined
      );

      if (loadMore) {
        const combined = [...this.dataSource.data, ...result.logs];
        this.dataSource.data = combined;
        this.logsList.set(combined);
      } else {
        this.dataSource.data = result.logs;
        this.logsList.set(result.logs);
      }

      this.lastDoc = result.lastDoc;
      this.hasMore.set(result.logs.length === this.pageSize);
    } catch (err) {
      console.error('Error loading inventory audit history:', err);
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }


  getChange(log: InventoryLog): number {
    return log.changeAmount ?? log.changeQuantity ?? 0;
  }

  getTypeLabel(type: string): string {
    if (!type) return 'Unknown';
    switch (type) {
      case 'RESTOCK': return 'Restock';
      case 'SALE': return 'POS Sale';
      case 'AUDIT_ADJUSTMENT': return 'Audit Variance';
      case 'INTERNAL_USE': return 'Internal Use';
      default: return type.replace(/_/g, ' ');
    }
  }

  goBack() {
    this.router.navigate(['/store/manage']);
  }
}
