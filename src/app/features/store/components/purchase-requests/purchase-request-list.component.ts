import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { PurchaseRequestService } from '../../../../core/services/purchase-request.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PurchaseRequest } from '../../../../core/models/purchase-request.model';
import { PurchaseRequestModalComponent } from './modals/purchase-request-modal.component';
import { FulfillRequestModalComponent } from './modals/fulfill-request-modal.component';

@Component({
    selector: 'app-purchase-request-list',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
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
    ],
    templateUrl: './purchase-request-list.component.html',
    styleUrl: './purchase-request-list.component.scss',
})
export class PurchaseRequestListComponent implements OnInit {
    private prService = inject(PurchaseRequestService);
    public authService = inject(AuthService);
    private dialog = inject(MatDialog);
    private snackBar = inject(MatSnackBar);

    requests = signal<PurchaseRequest[]>([]);
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

    // Filtered Stream
    filteredRequests = computed(() => {
        const query = this.searchQuery().toLowerCase().trim();
        const status = this.statusFilter();
        const priority = this.priorityFilter();

        return this.requests().filter((req) => {
            const matchesQuery =
                !query ||
                req.requestNumber.toLowerCase().includes(query) ||
                req.title.toLowerCase().includes(query) ||
                (req.requestedBy?.displayName && req.requestedBy.displayName.toLowerCase().includes(query)) ||
                req.items.some((i) => i.name.toLowerCase().includes(query));

            const matchesStatus = status === 'ALL' || req.status === status;
            const matchesPriority = priority === 'ALL' || req.priority === priority;

            return matchesQuery && matchesStatus && matchesPriority;
        });
    });

    ngOnInit(): void {
        this.prService.getPurchaseRequests().subscribe({
            next: (data) => {
                this.requests.set(data || []);
            },
            error: (err) => {
                console.error('Failed to load purchase requests:', err);
            },
        });
    }

    openCreateDialog(): void {
        this.dialog.open(PurchaseRequestModalComponent, {
            width: '800px',
            disableClose: true,
        });
    }

    openFulfillDialog(request: PurchaseRequest, event?: Event): void {
        if (event) event.stopPropagation();
        this.dialog.open(FulfillRequestModalComponent, {
            width: '850px',
            data: request,
            disableClose: true,
        });
    }

    async approve(request: PurchaseRequest, event?: Event): Promise<void> {
        if (event) event.stopPropagation();
        if (!request.id) return;
        const notes = prompt('Approval Notes / Instructions (Optional):', '');
        if (notes === null) return; // User cancelled prompt

        try {
            await this.prService.approvePurchaseRequest(request.id, {
                approvedItems: request.items,
                approvalNotes: notes.trim(),
            });
            this.snackBar.open(`✅ Request ${request.requestNumber} approved!`, 'Close', { duration: 2500 });
        } catch {
            this.snackBar.open('Failed to approve request.', 'Close', { duration: 3000 });
        }
    }

    async reject(request: PurchaseRequest, event?: Event): Promise<void> {
        if (event) event.stopPropagation();
        if (!request.id) return;
        const reason = prompt('Please enter the reason for rejection:');
        if (!reason || !reason.trim()) {
            this.snackBar.open('Rejection cancelled: reason is required.', 'Close', { duration: 2500 });
            return;
        }

        try {
            await this.prService.rejectPurchaseRequest(request.id, reason.trim());
            this.snackBar.open(`Request ${request.requestNumber} rejected.`, 'Close', { duration: 2500 });
        } catch {
            this.snackBar.open('Failed to reject request.', 'Close', { duration: 3000 });
        }
    }

    async markOrdered(request: PurchaseRequest, event?: Event): Promise<void> {
        if (event) event.stopPropagation();
        if (!request.id) return;
        const supplier = prompt('Supplier Name / Store (e.g. Wheyl, SM Store):', request.supplierName || '');
        if (supplier === null) return;

        try {
            await this.prService.markAsOrdered(request.id, {
                supplierName: supplier.trim(),
            });
            this.snackBar.open(`Request ${request.requestNumber} marked as Ordered / In Transit!`, 'Close', { duration: 2500 });
        } catch {
            this.snackBar.open('Failed to update status.', 'Close', { duration: 3000 });
        }
    }
}
