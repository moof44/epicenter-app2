import { Component, inject, OnInit, OnDestroy, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { CommissionService } from '../../../../core/services/commission.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ProductCommission, CommissionStatus } from '../../../../core/models/commission.model';
import { fadeIn } from '../../../../core/animations/animations';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-commission-center',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatPaginatorModule, MatIconModule, MatButtonModule,
    MatChipsModule, MatTooltipModule, MatDialogModule, MatCheckboxModule, FormsModule
  ],
  templateUrl: './commission-center.html',
  styleUrl: './commission-center.css',
  animations: [fadeIn],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommissionCenter implements OnInit, OnDestroy {
  private commissionService = inject(CommissionService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  private subs = new Subscription();
  private dataSubs = new Subscription();

  // User & Role
  currentUser = computed(() => this.authService.userProfile());
  isManagerView = computed(() => {
    return this.authService.hasAnyRole(['ADMIN', 'MANAGER', 'COACH_OWNER']);
  });

  // Active Tab
  activeManagerTab: 'APPROVALS' | 'CASHOUT' | 'HISTORY' = 'APPROVALS';
  activeStaffTab: 'APPROVED' | 'PENDING' | 'SUBMITTED' | 'REJECTED' = 'APPROVED';

  // Signals for Data
  pendingCommissions = signal<ProductCommission[]>([]);
  approvedCommissions = signal<ProductCommission[]>([]);
  staffCommissions = signal<ProductCommission[]>([]);
  historyCommissions = signal<ProductCommission[]>([]);
  isLoading = signal<boolean>(false);
  isPostingToBills = signal<boolean>(false);

  // Selection for Batch Actions
  selectedCommissionIds = new Set<string>();

  // Manager KPIs
  totalPendingAmount = computed(() => {
    return this.pendingCommissions().reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
  });

  totalApprovedAmount = computed(() => {
    return this.approvedCommissions().reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
  });

  totalHistoryAmount = computed(() => {
    return this.historyCommissions().reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
  });

  pendingClaimsCount = computed(() => {
    return this.pendingCommissions().filter(c => c.isClaimPending).length;
  });

  // Group approved commissions by staff for cash out
  approvedByStaff = computed(() => {
    const map = new Map<string, { staffId: string; staffName: string; total: number; items: ProductCommission[] }>();
    for (const c of this.approvedCommissions()) {
      const key = c.sellerId || 'UNKNOWN';
      const entry = map.get(key) || { staffId: key, staffName: c.sellerName || 'Staff', total: 0, items: [] };
      entry.total += (c.commissionAmount || 0);
      entry.items.push(c);
      map.set(key, entry);
    }
    return Array.from(map.values());
  });

  // Staff filtered lists
  staffApproved = computed(() => this.staffCommissions().filter(c => c.status === 'APPROVED'));
  staffPending = computed(() => this.staffCommissions().filter(c => c.status === 'PENDING'));
  staffSubmitted = computed(() => this.staffCommissions().filter(c => c.status === 'SUBMITTED' || c.status === 'PAID'));
  staffRejected = computed(() => this.staffCommissions().filter(c => c.status === 'REJECTED'));

  staffTotalEarned = computed(() => {
    return this.staffCommissions()
      .filter(c => c.status === 'APPROVED' || c.status === 'SUBMITTED' || c.status === 'PAID')
      .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
  });

  ngOnInit(): void {
    this.isLoading.set(true);
    // Listen to user profile to initialize and react as soon as auth state resolves
    this.subs.add(
      this.authService.user$.subscribe(user => {
        if (user) {
          this.setupDataStreams(user);
        }
      })
    );
  }

  setupDataStreams(user: any) {
    this.dataSubs.unsubscribe();
    this.dataSubs = new Subscription();
    this.isLoading.set(true);

    const isManager = this.authService.hasAnyRole(['ADMIN', 'MANAGER', 'COACH_OWNER']);

    if (isManager) {
      this.dataSubs.add(
        this.commissionService.getPendingCommissions$().subscribe({
          next: items => {
            this.pendingCommissions.set(items);
            this.isLoading.set(false);
            this.cdr.markForCheck();
          },
          error: err => {
            console.error('Pending commissions error:', err);
            this.isLoading.set(false);
            this.cdr.markForCheck();
          }
        })
      );

      this.dataSubs.add(
        this.commissionService.getApprovedCommissions$().subscribe({
          next: items => {
            this.approvedCommissions.set(items);
            this.cdr.markForCheck();
          },
          error: err => console.error('Approved commissions error:', err)
        })
      );

      this.dataSubs.add(
        this.commissionService.getSubmittedCommissions$().subscribe({
          next: items => {
            this.historyCommissions.set(items);
            this.cdr.markForCheck();
          },
          error: err => console.error('History commissions error:', err)
        })
      );
    }

    if (user?.uid) {
      this.dataSubs.add(
        this.commissionService.getStaffCommissions$(user.uid).subscribe({
          next: items => {
            this.staffCommissions.set(items);
            if (!isManager) this.isLoading.set(false);
            this.cdr.markForCheck();
          },
          error: err => {
            console.error('Staff commissions error:', err);
            if (!isManager) this.isLoading.set(false);
            this.cdr.markForCheck();
          }
        })
      );
    }
  }

  async loadData() {
    const user = this.authService.userProfile();
    if (user) {
      this.setupDataStreams(user);
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.dataSubs.unsubscribe();
  }

  // Batch Selection
  isAllPendingSelected(): boolean {
    const pending = this.pendingCommissions();
    return pending.length > 0 && pending.every(c => this.selectedCommissionIds.has(c.id!));
  }

  toggleSelectAllPending(): void {
    if (this.isAllPendingSelected()) {
      this.selectedCommissionIds.clear();
    } else {
      this.pendingCommissions().forEach(c => {
        if (c.id) this.selectedCommissionIds.add(c.id);
      });
    }
  }

  toggleSelection(commId?: string): void {
    if (!commId) return;
    if (this.selectedCommissionIds.has(commId)) {
      this.selectedCommissionIds.delete(commId);
    } else {
      this.selectedCommissionIds.add(commId);
    }
  }

  isSelected(commId?: string): boolean {
    return commId ? this.selectedCommissionIds.has(commId) : false;
  }

  // Batch Approve
  async batchApprove(): Promise<void> {
    const ids = Array.from(this.selectedCommissionIds);
    if (!ids.length) return;

    const user = this.currentUser();
    const reviewerId = user?.uid || 'ADMIN';
    const reviewerName = user?.displayName || user?.email || 'Admin';

    try {
      await this.commissionService.approveCommissions(ids, reviewerId, reviewerName);
      this.selectedCommissionIds.clear();
      this.snackBar.open(`Successfully approved ${ids.length} commission item${ids.length > 1 ? 's' : ''}`, 'Close', { duration: 3000 });
      await this.loadData();
    } catch (err: any) {
      this.snackBar.open('Error approving: ' + err.message, 'Close', { duration: 4000 });
    }
  }

  // Batch Deny
  async batchDeny(): Promise<void> {
    const ids = Array.from(this.selectedCommissionIds);
    if (!ids.length) return;

    const reason = prompt(`Please enter reason for denying ${ids.length} commission item(s):`, 'Denied by manager review');
    if (reason === null) return;

    const user = this.currentUser();
    const reviewerId = user?.uid || 'ADMIN';
    const reviewerName = user?.displayName || user?.email || 'Admin';

    try {
      await this.commissionService.rejectCommissions(ids, reason, reviewerId, reviewerName);
      this.selectedCommissionIds.clear();
      this.snackBar.open(`Denied ${ids.length} commission item(s)`, 'Close', { duration: 3000 });
      await this.loadData();
    } catch (err: any) {
      this.snackBar.open('Error denying: ' + err.message, 'Close', { duration: 4000 });
    }
  }

  // Quick Approve single item
  async quickApprove(comm: ProductCommission): Promise<void> {
    if (!comm.id) return;
    const user = this.currentUser();
    await this.commissionService.approveCommissions([comm.id], user?.uid || 'ADMIN', user?.displayName || 'Admin');
    this.snackBar.open(`Approved ₱${comm.commissionAmount.toFixed(2)} for ${comm.sellerName}`, 'Close', { duration: 2500 });
    await this.loadData();
  }

  // Quick Deny single item
  async quickDeny(comm: ProductCommission): Promise<void> {
    if (!comm.id) return;
    const reason = prompt('Reason for denying this commission:', 'Product returned / invalid attribution');
    if (reason === null) return;
    const user = this.currentUser();
    await this.commissionService.rejectCommissions([comm.id], reason, user?.uid || 'ADMIN', user?.displayName || 'Admin');
    this.snackBar.open('Commission item denied', 'Close', { duration: 2500 });
    await this.loadData();
  }

  // Claim Attribution Review
  async approveClaim(comm: ProductCommission): Promise<void> {
    if (!comm.transactionId) return;
    const user = this.currentUser();
    try {
      await this.commissionService.approveAttributionClaim(comm.transactionId, user?.uid || 'ADMIN', user?.displayName || 'Admin');
      this.snackBar.open(`Attribution transferred to ${comm.claimantStaffName}`, 'Close', { duration: 3000 });
      await this.loadData();
    } catch (err: any) {
      this.snackBar.open('Error approving claim: ' + err.message, 'Close', { duration: 4000 });
    }
  }

  async rejectClaim(comm: ProductCommission): Promise<void> {
    if (!comm.transactionId) return;
    const reason = prompt('Reason for rejecting attribution claim:', 'Claim not verified');
    if (reason === null) return;
    const user = this.currentUser();
    try {
      await this.commissionService.rejectAttributionClaim(comm.transactionId, reason, user?.uid || 'ADMIN', user?.displayName || 'Admin');
      this.snackBar.open('Attribution claim rejected', 'Close', { duration: 3000 });
      await this.loadData();
    } catch (err: any) {
      this.snackBar.open('Error rejecting claim: ' + err.message, 'Close', { duration: 4000 });
    }
  }

  // Post to Bills & Payables (Cashing Out)
  async postStaffToBills(staffGroup: { staffId: string; staffName: string; total: number; items: ProductCommission[] }): Promise<void> {
    const confirmMsg = `Post commission payout of ₱${staffGroup.total.toFixed(2)} (${staffGroup.items.length} items) for ${staffGroup.staffName} to Bills & Payables? Once posted, these records will be locked.`;
    if (!confirm(confirmMsg)) return;

    this.isPostingToBills.set(true);
    const user = this.currentUser();
    try {
      const billIds = await this.commissionService.postCommissionsToBills(staffGroup.items, user?.displayName || 'Admin');
      this.snackBar.open(`Created bill in Bills & Payables! Reference: #${billIds[0]?.slice(0, 8).toUpperCase()}`, 'Close', { duration: 5000 });
      await this.loadData();
    } catch (err: any) {
      this.snackBar.open('Error posting to bills: ' + err.message, 'Close', { duration: 4000 });
    } finally {
      this.isPostingToBills.set(false);
      this.cdr.markForCheck();
    }
  }

  async postAllApprovedToBills(): Promise<void> {
    const groups = this.approvedByStaff();
    if (!groups.length) return;

    const totalAll = groups.reduce((sum, g) => sum + g.total, 0);
    const confirmMsg = `Generate ${groups.length} individual bills in Bills & Payables for a total of ₱${totalAll.toFixed(2)}? Once posted, all records will be locked.`;
    if (!confirm(confirmMsg)) return;

    this.isPostingToBills.set(true);
    const user = this.currentUser();
    try {
      await this.commissionService.postCommissionsToBills(this.approvedCommissions(), user?.displayName || 'Admin');
      this.snackBar.open(`Successfully posted ${groups.length} bills to Bills & Payables!`, 'Close', { duration: 5000 });
      await this.loadData();
    } catch (err: any) {
      this.snackBar.open('Error posting bills: ' + err.message, 'Close', { duration: 4000 });
    } finally {
      this.isPostingToBills.set(false);
      this.cdr.markForCheck();
    }
  }

  formatDate(timestamp: any): Date {
    if (!timestamp) return new Date();
    return timestamp.seconds ? new Date(timestamp.seconds * 1000) : (timestamp instanceof Date ? timestamp : new Date(timestamp));
  }
}
