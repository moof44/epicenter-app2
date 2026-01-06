import { Component, inject, ViewChild, AfterViewInit, ChangeDetectionStrategy } from '@angular/core';
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

@Component({
  selector: 'app-purchase-history',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatPaginatorModule, MatCardModule, MatProgressSpinnerModule
  ],
  templateUrl: './purchase-history.component.html',
  styleUrl: './purchase-history.component.css',
  animations: [
    fadeIn,
    trigger('detailExpand', [
      state('collapsed,void', style({height: '0px', minHeight: '0'})),
      state('expanded', style({height: '*'})),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PurchaseHistoryComponent implements AfterViewInit {
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

  constructor() {
    this.loadOrders();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  async loadOrders() {
    if (this.isLoading || (!this.hasMore && this.lastDoc)) return;
    
    this.isLoading = true;
    try {
      const ordersCol = collection(this.firestore, 'purchase_orders');
      
      let q = query(
        ordersCol, 
        orderBy('date', 'desc'), 
        limit(this.pageSize)
      );
      
      if (this.lastDoc) {
        q = query(
          ordersCol, 
          orderBy('date', 'desc'), 
          startAfter(this.lastDoc), 
          limit(this.pageSize)
        );
      }
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        this.hasMore = false;
        this.isLoading = false;
        return;
      }

      this.lastDoc = snapshot.docs[snapshot.docs.length - 1];
      
      const newOrders = snapshot.docs.map(d => {
        const data = d.data();
        return { id: d.id, ...data } as PurchaseOrder;
      });

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
