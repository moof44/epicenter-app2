import { Component, inject, ViewChild, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../../../core/services/store.service';
import { Transaction } from '../../../../core/models/store.model';
import { fadeIn } from '../../../../core/animations/animations';

@Component({
  selector: 'app-transaction-history',
  imports: [
    CommonModule, MatTableModule, MatPaginatorModule, MatIconModule, MatExpansionModule,
    MatDatepickerModule, MatNativeDateModule, MatInputModule, MatSelectModule, MatButtonModule, MatChipsModule, FormsModule
  ],
  templateUrl: './transaction-history.html',
  styleUrl: './transaction-history.css',
  animations: [fadeIn]
})
export class TransactionHistory implements AfterViewInit, OnInit {
  private storeService = inject(StoreService);

  dataSource = new MatTableDataSource<Transaction>([]);
  displayedColumns = ['date', 'items', 'paymentMethod', 'totalAmount']; // Added paymentMethod column? Or just filter. I'll add column too if useful, but sticking to existing plus filters first.

  @ViewChild(MatPaginator) paginator!: MatPaginator;


  // Filters
  startDate: Date | null = null;
  endDate: Date | null = null;
  paymentMethod: 'CASH' | 'GCASH' | '' = '';
  referenceNumber = '';
  staffName = '';

  constructor() { }

  ngOnInit() {
    this.loadTransactions();
  }

  loadTransactions() {
    const filters: any = {};
    if (this.startDate) filters.startDate = this.startDate;
    if (this.endDate) filters.endDate = this.endDate;
    if (this.paymentMethod) filters.paymentMethod = this.paymentMethod;
    if (this.referenceNumber) filters.referenceNumber = this.referenceNumber;
    if (this.staffName) filters.staffName = this.staffName;
    filters.limit = 50;

    this.storeService.getTransactions(filters).subscribe(transactions => {
      this.dataSource.data = transactions;
    });
  }

  applyFilters() {
    this.loadTransactions();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  formatDate(timestamp: any): Date {
    if (!timestamp) return new Date();
    return timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
  }
}
