import { Component, inject, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { StoreService } from '../../../../core/services/store.service';
import { Transaction } from '../../../../core/models/store.model';
import { fadeIn } from '../../../../core/animations/animations';

@Component({
  selector: 'app-transaction-history',
  imports: [
    CommonModule, MatTableModule, MatPaginatorModule, MatIconModule, MatExpansionModule
  ],
  templateUrl: './transaction-history.html',
  styleUrl: './transaction-history.css',
  animations: [fadeIn]
})
export class TransactionHistory implements AfterViewInit {
  private storeService = inject(StoreService);

  dataSource = new MatTableDataSource<Transaction>([]);
  displayedColumns = ['date', 'items', 'totalAmount'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor() {
    this.storeService.getTransactions().subscribe(transactions => {
      this.dataSource.data = transactions;
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  formatDate(timestamp: any): Date {
    if (!timestamp) return new Date();
    return timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
  }
}
