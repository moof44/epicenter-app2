import { Component, inject, ViewChild, AfterViewInit, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Firestore, collection, query, orderBy, limit, getDocs, startAfter, DocumentData, QueryDocumentSnapshot } from '@angular/fire/firestore';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { PurchaseOrder } from '../../../../core/models/purchase.model';
import { fadeIn } from '../../../../core/animations/animations';

import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { where } from '@angular/fire/firestore';

@Component({
  selector: 'app-purchase-history',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatPaginatorModule, MatCardModule, MatProgressSpinnerModule,
    MatDatepickerModule, MatNativeDateModule, MatInputModule, FormsModule
  ],
  templateUrl: './purchase-history.component.html',
  styleUrl: './purchase-history.component.css',
  animations: [
    fadeIn,
    trigger('detailExpand', [
      state('collapsed,void', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PurchaseHistoryComponent implements OnInit, AfterViewInit {
  private firestore = inject(Firestore);

  dataSource = new MatTableDataSource<PurchaseOrder>([]);
  columnsToDisplay = ['date', 'supplier', 'items', 'total'];
  columnsToDisplayWithExpand = [...this.columnsToDisplay, 'expand'];
  expandedElement: PurchaseOrder | null = null;

  // Stats
  totalSpent = 0;
  ordersThisMonth = 0;
  recentSpending = 0;

  // Pagination
  orders: PurchaseOrder[] = [];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
  isLoading = false;
  hasMore = true;
  pageSize = 20;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // Filters
  startDate: Date | null = null;
  endDate: Date | null = null;
  supplierFilter = '';
  productFilter = '';

  constructor() { }

  ngOnInit() {
    this.loadOrders();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  applyFilters() {
    this.orders = []; // Clear existing
    this.lastDoc = null;
    this.hasMore = true;
    this.loadOrders();
  }

  async loadOrders() {
    if (this.isLoading || (!this.hasMore && this.lastDoc)) return;

    this.isLoading = true;
    try {
      const ordersCol = collection(this.firestore, 'purchase_orders');

      const constraints: any[] = [orderBy('date', 'desc')];

      // Date Filters
      if (this.startDate) {
        constraints.push(where('date', '>=', this.startDate));
      }
      if (this.endDate) {
        constraints.push(where('date', '<=', this.endDate));
      }

      // Limit
      constraints.push(limit(this.pageSize));

      if (this.lastDoc) {
        constraints.push(startAfter(this.lastDoc));
      }

      const q = query(ordersCol, ...constraints);

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        this.hasMore = false;
        this.isLoading = false;
        if (this.orders.length === 0) this.dataSource.data = [];
        return;
      }

      this.lastDoc = snapshot.docs[snapshot.docs.length - 1];

      let newOrders = snapshot.docs.map(d => {
        const data = d.data();
        return { id: d.id, ...data } as PurchaseOrder;
      });

      // Client-side Supplier Filtering (Best effort without full index)
      if (this.supplierFilter) {
        const term = this.supplierFilter.toLowerCase();
        newOrders = newOrders.filter(o => o.supplierName?.toLowerCase().includes(term));
      }

      // Client-side Product Filtering
      if (this.productFilter) {
        const term = this.productFilter.toLowerCase();
        newOrders = newOrders.filter(o =>
          o.items.some(item => item.productName.toLowerCase().includes(term))
        );
      }

      this.orders = [...this.orders, ...newOrders];
      this.dataSource.data = this.orders;

      this.calculateStats(this.orders);

      if (snapshot.docs.length < this.pageSize) {
        this.hasMore = false;
      }
    } catch (error) {
      console.error('Error loading orders', error);
    } finally {
      this.isLoading = false;
    }
  }

  calculateStats(orders: PurchaseOrder[]) {
    // Note: This only calculates stats for LOADED orders. 
    // For full dataset stats, we would need a server-side aggregation.
    this.totalSpent = orders.reduce((acc, o) => acc + o.totalCost, 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    this.ordersThisMonth = orders.filter(o => {
      const d = o.date?.toDate ? o.date.toDate() : new Date(o.date);
      return d >= startOfMonth;
    }).length;

    this.recentSpending = orders.filter(o => {
      const d = o.date?.toDate ? o.date.toDate() : new Date(o.date);
      return d >= thirtyDaysAgo;
    }).reduce((acc, o) => acc + o.totalCost, 0);
  }
}
