import { Component, inject, ViewChild, AfterViewInit, OnInit, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TransactionService } from '../../../../core/services/transaction.service';
import { CommissionService } from '../../../../core/services/commission.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Transaction, CartItem } from '../../../../core/models/store.model';
import { fadeIn } from '../../../../core/animations/animations';
import { firstValueFrom } from 'rxjs';
import { TransactionDetailDialog } from './transaction-detail-dialog/transaction-detail-dialog';
import { ClaimSaleDialog } from './claim-sale-dialog/claim-sale-dialog';

@Component({
  selector: 'app-transaction-history',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatPaginatorModule, MatIconModule, MatExpansionModule,
    MatDatepickerModule, MatNativeDateModule, MatInputModule, MatSelectModule, MatButtonModule,
    MatChipsModule, MatTooltipModule, MatDialogModule, FormsModule
  ],
  templateUrl: './transaction-history.html',
  styleUrl: './transaction-history.css',
  animations: [fadeIn],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionHistory implements AfterViewInit, OnInit {
  private transactionService = inject(TransactionService);
  private commissionService = inject(CommissionService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);

  dataSource = new MatTableDataSource<Transaction>([]);
  displayedColumns = ['date', 'reference', 'customerStaff', 'paymentMethod', 'items', 'totalAmount', 'status', 'actions'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // Raw data signal
  transactions = signal<Transaction[]>([]);
  isLoading = signal<boolean>(false);

  // Filters State
  startDate: Date | null = null;
  endDate: Date | null = null;
  paymentMethod: 'CASH' | 'GCASH' | 'SPLIT' | '' = '';
  referenceNumber = '';
  staffName = '';

  // Summary Metrics Signals
  totalRevenue = computed(() => {
    return this.transactions()
      .filter(tx => tx.status !== 'VOID')
      .reduce((sum, tx) => sum + (tx.totalAmount || 0), 0);
  });

  totalOrders = computed(() => {
    return this.transactions().filter(tx => tx.status !== 'VOID').length;
  });

  totalCashRevenue = computed(() => {
    return this.transactions()
      .filter(tx => tx.status !== 'VOID')
      .reduce((sum, tx) => {
        if (tx.paymentMethod === 'CASH') return sum + (tx.totalAmount || 0);
        if (tx.paymentMethod === 'SPLIT') return sum + (tx.cashAmount || 0);
        return sum;
      }, 0);
  });

  totalGcashRevenue = computed(() => {
    return this.transactions()
      .filter(tx => tx.status !== 'VOID')
      .reduce((sum, tx) => {
        if (tx.paymentMethod === 'GCASH') return sum + (tx.totalAmount || 0);
        if (tx.paymentMethod === 'SPLIT') return sum + (tx.gcashAmount || 0);
        return sum;
      }, 0);
  });

  activeFiltersCount = computed(() => {
    let count = 0;
    if (this.startDate || this.endDate) count++;
    if (this.paymentMethod) count++;
    if (this.referenceNumber.trim()) count++;
    if (this.staffName.trim()) count++;
    return count;
  });

  ngOnInit() {
    this.loadTransactions();
  }

  async loadTransactions() {
    this.isLoading.set(true);
    const filters: any = {};
    if (this.startDate) filters.startDate = this.startDate;
    if (this.endDate) filters.endDate = this.endDate;
    if (this.paymentMethod) filters.paymentMethod = this.paymentMethod;
    if (this.referenceNumber.trim()) filters.referenceNumber = this.referenceNumber.trim();
    if (this.staffName.trim()) filters.staffName = this.staffName.trim();
    filters.limit = 50;

    try {
      const txs = await firstValueFrom(this.transactionService.getTransactions(filters));
      this.transactions.set(txs);
      this.dataSource.data = txs;
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  applyFilters() {
    this.loadTransactions();
  }

  resetFilters() {
    this.startDate = null;
    this.endDate = null;
    this.paymentMethod = '';
    this.referenceNumber = '';
    this.staffName = '';
    this.loadTransactions();
  }

  openDetail(tx: Transaction): void {
    this.dialog.open(TransactionDetailDialog, {
      width: '560px',
      maxWidth: '94vw',
      maxHeight: '92vh',
      data: { transaction: tx }
    });
  }

  claimSale(tx: Transaction): void {
    if (!tx.id) return;
    const user = this.authService.userProfile();
    const currentUserName = user?.displayName || user?.email || 'Staff';

    const dialogRef = this.dialog.open(ClaimSaleDialog, {
      width: '480px',
      maxWidth: '94vw',
      data: {
        transaction: tx,
        currentUserName
      }
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (!result) return;
      try {
        await this.commissionService.requestAttributionClaim(
          tx.id!,
          user?.uid || 'UNKNOWN',
          currentUserName,
          result.reason
        );
        tx.commissionClaimStatus = 'CLAIM_PENDING';
        tx.claimantStaffName = currentUserName;
        this.cdr.markForCheck();
        this.snackBar.open('Attribution claim submitted for manager review.', 'Close', { duration: 4000 });
      } catch (err: any) {
        this.snackBar.open('Failed to submit claim: ' + err.message, 'Close', { duration: 4000 });
      }
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  formatDate(timestamp: any): Date {
    if (!timestamp) return new Date();
    return timestamp.seconds ? new Date(timestamp.seconds * 1000) : (timestamp instanceof Date ? timestamp : new Date(timestamp));
  }

  trackTransaction(index: number, item: Transaction): string {
    return item.id || index.toString();
  }

  trackCartItem(index: number, item: CartItem): string {
    return item.productId || index.toString();
  }
}
