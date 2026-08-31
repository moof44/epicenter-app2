import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PurchaseRequestService } from '../../../../core/services/purchase-request.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PurchaseRequest, PurchaseRequestPriority, PurchaseRequestStatus } from '../../../../core/models/purchase-request.model';
import { PurchaseRequestModalComponent } from './modals/purchase-request-modal.component';
import { FulfillRequestModalComponent } from './modals/fulfill-request-modal.component';
import { fadeIn } from '../../../../core/animations/animations';

@Component({
  selector: 'app-purchase-request-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatBadgeModule,
    MatExpansionModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './purchase-request-list.component.html',
  styleUrl: './purchase-request-list.component.css',
  animations: [fadeIn]
})
export class PurchaseRequestListComponent implements OnInit {
  private prService = inject(PurchaseRequestService);
  public authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  requests = signal<PurchaseRequest[]>([]);
  isLoading = signal<boolean>(true);
  searchQuery = signal<string>('');
  statusFilter = signal<string>('ALL');
  priorityFilter = signal<string>('ALL');

  // KPI Summary Metrics
  pendingCount = computed(() => this.requests().filter((r) => r.status === 'PENDING').length);
  inTransitCount = computed(() => this.requests().filter((r) => r.status === 'APPROVED' || r.status === 'ORDERED').length);
  fulfilledCount = computed(() => this.requests().filter((r) => r.status === 'RECEIVED').length);
  totalEstimatedPending = computed(() =>
    this.requests()
      .filter((r) => r.status === 'PENDING' || r.status === 'APPROVED' || r.status === 'ORDERED')
      .reduce((sum, r) => sum + (r.estimatedTotalAmount || 0), 0)
  );

  filteredRequests = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();
    const priority = this.priorityFilter();

    return this.requests().filter((r) => {
      const matchStatus = status === 'ALL' || r.status === status;
      const matchPriority = priority === 'ALL' || r.priority === priority;
      const matchQuery =
        !q ||
        r.requestNumber?.toLowerCase().includes(q) ||
        r.title?.toLowerCase().includes(q) ||
        r.requestedBy?.displayName?.toLowerCase().includes(q) ||
        r.items?.some((i) => i.name?.toLowerCase().includes(q));

      return matchStatus && matchPriority && matchQuery;
    });
  });

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.isLoading.set(true);
    this.prService.getPurchaseRequests().subscribe({
      next: (data: PurchaseRequest[]) => {
        this.requests.set(data);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Error fetching purchase requests:', err);
        this.isLoading.set(false);
      },
    });
  }

  setStatusFilter(status: string): void {
    this.statusFilter.set(status);
  }

  setPriorityFilter(priority: string): void {
    this.priorityFilter.set(priority);
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(PurchaseRequestModalComponent, {
      width: '780px',
      maxWidth: '95vw',
      panelClass: 'dark-pro-dialog'
    });
    ref.afterClosed().subscribe((res) => {
      if (res) this.loadRequests();
    });
  }

  openFulfillDialog(req: PurchaseRequest): void {
    const ref = this.dialog.open(FulfillRequestModalComponent, {
      width: '840px',
      maxWidth: '95vw',
      data: { request: req },
      panelClass: 'dark-pro-dialog'
    });
    ref.afterClosed().subscribe((res) => {
      if (res) this.loadRequests();
    });
  }

  async approveRequest(req: PurchaseRequest): Promise<void> {
    if (!req.id) return;
    try {
      await this.prService.approvePurchaseRequest(req.id, {
        approvedItems: req.items,
        approvalNotes: 'Approved from Purchase Requests dashboard'
      });
      this.snackBar.open('Purchase request approved!', 'Close', { duration: 3000 });
      this.loadRequests();
    } catch (err: any) {
      this.snackBar.open(err.message || 'Error approving request', 'Close', { duration: 4000 });
    }
  }

  async rejectRequest(req: PurchaseRequest): Promise<void> {
    if (!req.id) return;
    const reason = prompt('Please enter a rejection reason:') || 'Budget / allocation rejected';
    try {
      await this.prService.rejectPurchaseRequest(req.id, reason);
      this.snackBar.open('Purchase request rejected', 'Close', { duration: 3000 });
      this.loadRequests();
    } catch (err: any) {
      this.snackBar.open(err.message || 'Error rejecting request', 'Close', { duration: 4000 });
    }
  }

  async markOrdered(req: PurchaseRequest): Promise<void> {
    if (!req.id) return;
    try {
      await this.prService.markAsOrdered(req.id, {
        supplierName: req.supplierName || 'General Supplier',
        paidVia: 'CASH_DRAWER'
      });
      this.snackBar.open('Request marked as Ordered / In-Transit', 'Close', { duration: 3000 });
      this.loadRequests();
    } catch (err: any) {
      this.snackBar.open(err.message || 'Error marking ordered', 'Close', { duration: 4000 });
    }
  }

  getItemCost(item: any): number {
    return (item.estimatedUnitCost || 0) * (item.requestedQuantity || 1);
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'PENDING': return 'status-pending';
      case 'APPROVED': return 'status-approved';
      case 'ORDERED': return 'status-ordered';
      case 'RECEIVED': return 'status-received';
      case 'REJECTED': return 'status-rejected';
      case 'CANCELLED': return 'status-cancelled';
      default: return 'status-default';
    }
  }

  getPriorityBadgeClass(priority: string): string {
    switch (priority) {
      case 'URGENT': return 'prio-urgent';
      case 'HIGH': return 'prio-high';
      case 'NORMAL': return 'prio-normal';
      case 'LOW': return 'prio-low';
      default: return 'prio-normal';
    }
  }

  goBack(): void {
    this.router.navigate(['/store/manage']);
  }
}
