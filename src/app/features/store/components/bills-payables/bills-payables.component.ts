import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { PayablesService } from '../../../../core/services/payables.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CashRegisterService } from '../../../../core/services/cash-register.service';
import {
  BillPayable,
  BillStatus,
  OutflowCategory,
  OutflowPaymentSource,
  OUTFLOW_CATEGORIES,
  getOutflowCategoryMeta
} from '../../../../core/models/outflow.model';
import { fadeIn } from '../../../../core/animations/animations';

@Component({
  selector: 'app-bills-payables',
  imports: [
    CommonModule, FormsModule, MatTableModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatSelectModule, MatCardModule,
    MatChipsModule, MatTabsModule, MatSnackBarModule, MatDialogModule,
    MatTooltipModule, MatDatepickerModule, MatNativeDateModule, MatDividerModule
  ],
  templateUrl: './bills-payables.component.html',
  styleUrl: './bills-payables.component.css',
  animations: [fadeIn]
})
export class BillsPayablesComponent implements OnInit {
  private payablesService = inject(PayablesService);
  private authService = inject(AuthService);
  private cashRegisterService = inject(CashRegisterService);
  private snackBar = inject(MatSnackBar);

  readonly categories = OUTFLOW_CATEGORIES;
  readonly getCategoryMeta = getOutflowCategoryMeta;

  bills = signal<BillPayable[]>([]);
  isLoading = signal(true);
  currentShift$ = this.cashRegisterService.currentShift$;

  // Filter State
  searchQuery = signal('');
  selectedCategory = signal<string>('ALL');
  selectedStatus = signal<string>('ALL');

  // Modals & Panels
  showCreateModal = false;
  showPaymentModal = false;
  showHistoryDrawer = false;
  selectedBillForPayment: BillPayable | null = null;
  selectedBillForHistory: BillPayable | null = null;

  // Create Bill Form
  newBill = {
    title: '',
    category: 'UTILITY_ELECTRICITY' as OutflowCategory,
    billerOrSupplier: '',
    invoiceNumber: '',
    billingPeriodStart: null as Date | null,
    billingPeriodEnd: null as Date | null,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    totalAmountDue: 0,
    notes: ''
  };

  // Payment Form
  paymentForm = {
    amount: 0,
    paymentSource: 'DRAWER_CASH' as OutflowPaymentSource,
    referenceNumber: '',
    notes: ''
  };

  isSubmitting = false;

  // KPIs
  totalUnpaidAmount = computed(() => {
    return this.bills()
      .filter(b => b.status !== 'PAID' && b.status !== 'CANCELLED')
      .reduce((sum, b) => sum + (b.remainingBalance || 0), 0);
  });

  dueSoonCount = computed(() => {
    const now = Date.now();
    const in7Days = now + 7 * 24 * 60 * 60 * 1000;
    return this.bills().filter(b => {
      if (b.status === 'PAID' || b.status === 'CANCELLED') return false;
      const due = new Date(b.dueDate).getTime();
      return due >= now && due <= in7Days;
    }).length;
  });

  overdueCount = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.bills().filter(b => {
      if (b.status === 'PAID' || b.status === 'CANCELLED') return false;
      return new Date(b.dueDate).getTime() < today.getTime();
    }).length;
  });

  filteredBills = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const cat = this.selectedCategory();
    const status = this.selectedStatus();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.bills().filter(b => {
      if (status === 'OVERDUE') {
        if (b.status === 'PAID' || b.status === 'CANCELLED' || new Date(b.dueDate).getTime() >= today.getTime()) {
          return false;
        }
      } else if (status !== 'ALL' && b.status !== status) {
        return false;
      }

      if (cat !== 'ALL' && b.category !== cat) {
        return false;
      }

      if (query) {
        const matchTitle = b.title.toLowerCase().includes(query);
        const matchBiller = b.billerOrSupplier.toLowerCase().includes(query);
        const matchInv = (b.invoiceNumber || '').toLowerCase().includes(query);
        if (!matchTitle && !matchBiller && !matchInv) return false;
      }

      return true;
    });
  });

  displayedColumns = [
    'category',
    'title',
    'biller',
    'dueDate',
    'totalAmount',
    'paidAmount',
    'remainingBalance',
    'status',
    'actions'
  ];

  ngOnInit(): void {
    this.payablesService.getBills$().subscribe({
      next: (data) => {
        this.bills.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load bills:', err);
        this.isLoading.set(false);
      }
    });
  }

  openCreateModal(): void {
    this.newBill = {
      title: '',
      category: 'UTILITY_ELECTRICITY',
      billerOrSupplier: '',
      invoiceNumber: '',
      billingPeriodStart: null,
      billingPeriodEnd: null,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      totalAmountDue: 0,
      notes: ''
    };
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  async submitCreateBill(): Promise<void> {
    if (!this.newBill.title.trim()) {
      this.snackBar.open('Please enter a bill title', 'Close', { duration: 3000 });
      return;
    }
    if (this.newBill.totalAmountDue <= 0) {
      this.snackBar.open('Amount due must be greater than 0', 'Close', { duration: 3000 });
      return;
    }

    this.isSubmitting = true;
    try {
      const user = this.authService.userProfile();
      const userName = user?.displayName || user?.email || 'Staff';

      await this.payablesService.createBill({
        ...this.newBill,
        createdBy: userName
      });

      this.snackBar.open('Bill / Payable created successfully', 'Close', { duration: 3000 });
      this.closeCreateModal();
    } catch (err: any) {
      this.snackBar.open(err.message || 'Failed to create bill', 'Close', { duration: 3000 });
    } finally {
      this.isSubmitting = false;
    }
  }

  openPaymentModal(bill: BillPayable): void {
    this.selectedBillForPayment = bill;
    const isShiftOpen = this.cashRegisterService.isShiftOpen();
    this.paymentForm = {
      amount: bill.remainingBalance,
      paymentSource: isShiftOpen ? 'DRAWER_CASH' : 'BANK_TRANSFER',
      referenceNumber: '',
      notes: ''
    };
    this.showPaymentModal = true;
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.selectedBillForPayment = null;
  }

  async submitPayment(): Promise<void> {
    if (!this.selectedBillForPayment?.id) return;
    if (this.paymentForm.amount <= 0) {
      this.snackBar.open('Payment amount must be greater than 0', 'Close', { duration: 3000 });
      return;
    }
    if (this.paymentForm.amount > this.selectedBillForPayment.remainingBalance) {
      this.snackBar.open('Payment exceeds remaining balance', 'Close', { duration: 3000 });
      return;
    }

    this.isSubmitting = true;
    try {
      const user = this.authService.userProfile();
      const userName = user?.displayName || user?.email || 'Staff';

      await this.payablesService.recordPayment(
        this.selectedBillForPayment.id,
        this.paymentForm,
        userName
      );

      this.snackBar.open('Payment recorded successfully', 'Close', { duration: 3000 });
      this.closePaymentModal();
    } catch (err: any) {
      this.snackBar.open(err.message || 'Failed to record payment', 'Close', { duration: 3000 });
    } finally {
      this.isSubmitting = false;
    }
  }

  openHistoryDrawer(bill: BillPayable): void {
    this.selectedBillForHistory = bill;
    this.showHistoryDrawer = true;
  }

  closeHistoryDrawer(): void {
    this.showHistoryDrawer = false;
    this.selectedBillForHistory = null;
  }

  async deleteBill(bill: BillPayable): Promise<void> {
    if (!bill.id) return;
    if (!confirm('Are you sure you want to delete "' + bill.title + '"?')) return;

    try {
      await this.payablesService.deleteBill(bill.id);
      this.snackBar.open('Bill deleted', 'Close', { duration: 2500 });
    } catch (err: any) {
      this.snackBar.open(err.message || 'Failed to delete bill', 'Close', { duration: 3000 });
    }
  }

  isShiftOpen(): boolean {
    return this.cashRegisterService.isShiftOpen();
  }

  isOverdue(dueDate: Date, status: BillStatus): boolean {
    if (status === 'PAID' || status === 'CANCELLED') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dueDate).getTime() < today.getTime();
  }

  getStatusClass(status: BillStatus, dueDate: Date): string {
    if (status === 'PAID') return 'status-paid';
    if (this.isOverdue(dueDate, status)) return 'status-overdue';
    if (status === 'PARTIALLY_PAID') return 'status-partial';
    return 'status-unpaid';
  }

  getPaymentSourceLabel(source: OutflowPaymentSource): string {
    switch (source) {
      case 'DRAWER_CASH': return '💵 Cash Drawer (Till)';
      case 'BANK_TRANSFER': return '🏦 Bank Transfer';
      case 'GCASH_BUSINESS': return '📱 GCash';
      case 'OWNER_ADVANCE': return '👤 Owner Advance';
      default: return source;
    }
  }
}