import { Component, inject, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { Firestore, collection, collectionData, query, orderBy } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { PurchaseOrder } from '../../../../core/models/purchase.model';
import { fadeIn } from '../../../../core/animations/animations';

@Component({
  selector: 'app-purchase-history',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatPaginatorModule, MatCardModule
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

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor() {
    this.loadOrders();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  loadOrders() {
    const ordersCol = collection(this.firestore, 'purchase_orders');
    const q = query(ordersCol, orderBy('date', 'desc'));
    
    collectionData(q, { idField: 'id' }).pipe(
      map((orders: any[]) => orders as PurchaseOrder[]) // Cast
    ).subscribe(orders => {
      this.dataSource.data = orders;
      this.calculateStats(orders);
    });
  }

  calculateStats(orders: PurchaseOrder[]) {
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
