import { Component, inject, ViewChild, AfterViewInit, ChangeDetectionStrategy, OnInit, ChangeDetectorRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Firestore, collection, query, orderBy, limit, getDocs, startAfter, DocumentData, QueryDocumentSnapshot, where } from '@angular/fire/firestore';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { PurchaseOrder } from '../../../../core/models/purchase.model';
import { fadeIn } from '../../../../core/animations/animations';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-purchase-history',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MatTableModule, MatButtonModule, MatIconModule,
    MatPaginatorModule, MatCardModule, MatProgressSpinnerModule, MatTooltipModule,
    MatDatepickerModule, MatNativeDateModule, MatInputModule, MatFormFieldModule, FormsModule
  ],
  templateUrl: './purchase-history.component.html',
  styleUrl: './purchase-history.component.css',
  animations: [
    fadeIn,
    trigger('detailExpand', [
      state('collapsed,void', style({ height: '0px', minHeight: '0', visibility: 'hidden' })),
      state('expanded', style({ height: '*', visibility: 'visible' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PurchaseHistoryComponent implements OnInit, AfterViewInit {
  private firestore = inject(Firestore);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  dataSource = new MatTableDataSource<PurchaseOrder>([]);
  columnsToDisplay = ['date', 'supplier', 'reference', 'items', 'total'];
  columnsToDisplayWithExpand = [...this.columnsToDisplay, 'expand'];
  expandedElement: PurchaseOrder | null = null;

  // Stats
  totalSpent = signal(0);
  ordersThisMonth = signal(0);
  recentSpending = signal(0);
  avgOrderValue = computed(() => {
    const list = this.ordersList();
    if (list.length === 0) return 0;
    return this.totalSpent() / list.length;
  });

  // Pagination & Filtering
  ordersList = signal<PurchaseOrder[]>([]);
  lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
  isLoading = signal(false);
  hasMore = signal(true);
  pageSize = 20;

  startDate: Date | null = null;
  endDate: Date | null = null;
  supplierFilter = '';
  productFilter = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit() {
    this.loadOrders();
    this.loadStats();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  async loadStats() {
    try {
      const purchasesRef = collection(this.firestore, 'purchases');
      const snap = await getDocs(purchasesRef);
      let total = 0;
      let thisMonthCount = 0;
      let recentTotal = 0;

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      snap.forEach(doc => {
        const data = doc.data() as PurchaseOrder;
        const cost = data.totalCost || 0;
        total += cost;

        const docDate = data.date?.toDate ? data.date.toDate() : (data.date ? new Date(data.date) : null);
        if (docDate) {
          if (docDate.getMonth() === currentMonth && docDate.getFullYear() === currentYear) {
            thisMonthCount++;
          }
          if (docDate >= thirtyDaysAgo) {
            recentTotal += cost;
          }
        }
      });

      this.totalSpent.set(total);
      this.ordersThisMonth.set(thisMonthCount);
      this.recentSpending.set(recentTotal);
      this.cdr.markForCheck();
    } catch (err) {
      console.error('Error calculating purchase stats', err);
    }
  }

  async loadOrders(isNextPage = false) {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    this.cdr.markForCheck();

    try {
      const purchasesRef = collection(this.firestore, 'purchases');
      let q = query(purchasesRef, orderBy('date', 'desc'), limit(this.pageSize));

      if (this.startDate) {
        q = query(purchasesRef, where('date', '>=', this.startDate), orderBy('date', 'desc'), limit(this.pageSize));
      }
      if (this.endDate) {
        const end = new Date(this.endDate);
        end.setHours(23, 59, 59, 999);
        q = query(purchasesRef, where('date', '<=', end), orderBy('date', 'desc'), limit(this.pageSize));
      }

      if (isNextPage && this.lastDoc) {
        q = query(q, startAfter(this.lastDoc));
      }

      const snap = await getDocs(q);
      const newOrders: PurchaseOrder[] = [];
      snap.forEach(doc => {
        newOrders.push({ id: doc.id, ...doc.data() } as PurchaseOrder);
      });

      let filtered = newOrders;
      if (this.supplierFilter) {
        const sLower = this.supplierFilter.toLowerCase();
        filtered = filtered.filter(o => o.supplierName?.toLowerCase().includes(sLower));
      }
      if (this.productFilter) {
        const pLower = this.productFilter.toLowerCase();
        filtered = filtered.filter(o => o.items?.some(i => i.productName?.toLowerCase().includes(pLower)));
      }

      if (isNextPage) {
        const combined = [...this.dataSource.data, ...filtered];
        this.dataSource.data = combined;
        this.ordersList.set(combined);
      } else {
        this.dataSource.data = filtered;
        this.ordersList.set(filtered);
      }

      this.lastDoc = snap.docs[snap.docs.length - 1] || null;
      this.hasMore.set(snap.docs.length === this.pageSize);
    } catch (err) {
      console.error('Error loading purchase orders', err);
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  applyFilters() {
    this.lastDoc = null;
    this.hasMore.set(true);
    this.loadOrders();
  }

  resetFilters() {
    this.startDate = null;
    this.endDate = null;
    this.supplierFilter = '';
    this.productFilter = '';
    this.applyFilters();
  }

  toggleExpand(order: PurchaseOrder, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    this.expandedElement = this.expandedElement === order ? null : order;
    this.cdr.markForCheck();
  }

  goBack() {
    this.router.navigate(['/store/manage']);
  }
}
