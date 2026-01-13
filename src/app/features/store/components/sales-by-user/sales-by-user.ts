import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop'; // Import toSignal
import { switchMap, map, startWith } from 'rxjs/operators';
import { of, combineLatest, from } from 'rxjs';
import { StoreService } from '../../../../core/services/store.service';
import { UserService } from '../../../../core/services/user.service'; // Import UserService
import { fadeIn } from '../../../../core/animations/animations';
import { FormsModule } from '@angular/forms'; // Import FormsModule

import { ReportStateService } from '../../../../core/services/report.state.service';

@Component({
  selector: 'app-sales-by-user',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    FormsModule
  ],
  template: `
    <div class="page-container" [@fadeIn]>
      <div class="header">
        <button mat-icon-button (click)="goBack()" matTooltip="Back to Monthly Report">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="title-group">
          <h1>Sales by User</h1>
          <p class="helper-text">Breakdown of sales performance by staff member.</p>
        </div>
      </div>

      <div class="filters-row">
        <!-- User Selector -->
        <mat-form-field appearance="outline" class="user-select">
          <mat-label>Select Staff</mat-label>
          <mat-select [ngModel]="selectedUserId()" (ngModelChange)="selectedUserId.set($event)">
            <mat-option *ngFor="let user of users()" [value]="user.uid">
              {{ user.displayName }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Month Selector -->
        <div class="month-selector">
          <button mat-icon-button (click)="prevMonth()" matTooltip="Previous Month">
            <mat-icon>chevron_left</mat-icon>
          </button>
          <span class="month-display">{{ getMonthName(viewMonth()) }} {{ viewYear() }}</span>
          <button mat-icon-button (click)="nextMonth()" matTooltip="Next Month" [disabled]="!canGoNext()">
            <mat-icon>chevron_right</mat-icon>
          </button>
        </div>
      </div>

      <div class="content">
        <!-- Loading State -->
        <div class="loading-shade" *ngIf="isLoading()">
           <mat-spinner diameter="40"></mat-spinner>
        </div>

        <mat-card class="table-card" *ngIf="!isLoading()">
          <table mat-table [dataSource]="transactions()" class="sales-table">
            
            <!-- Date Column -->
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef> Date </th>
              <td mat-cell *matCellDef="let tx"> {{ tx.date | date:'MMM dd, HH:mm' }} </td>
            </ng-container>

            <!-- Items Column -->
            <ng-container matColumnDef="items">
              <th mat-header-cell *matHeaderCellDef> Items Sold </th>
              <td mat-cell *matCellDef="let tx"> 
                <span class="item-list">{{ getItemsSummary(tx.items) }}</span>
              </td>
            </ng-container>

            <!-- Amount Column -->
            <ng-container matColumnDef="amount">
              <th mat-header-cell *matHeaderCellDef class="text-right"> Amount </th>
              <td mat-cell *matCellDef="let tx" class="text-right fw-500"> ₱{{ tx.totalAmount | number:'1.2-2' }} </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            
            <!-- Empty State -->
            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell text-center py-4" colspan="3">
                 <span *ngIf="!selectedUserId()">Please select a staff member.</span>
                 <span *ngIf="selectedUserId()">No sales found for this user in this month.</span>
              </td>
            </tr>
          </table>
          
          <div class="table-footer">
             <div class="total-label">Total Sales</div>
             <div class="total-value">₱{{ totalSales() | number:'1.2-2' }}</div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .title-group h1 { margin: 0; font-size: 24px; color: #1f2937; }
    .helper-text { margin: 4px 0 0; color: #6b7280; font-size: 14px; }
    
    .filters-row { display: flex; align-items: center; gap: 24px; margin-bottom: 24px; flex-wrap: wrap; }
    .user-select { min-width: 250px; }
    .month-selector { display: flex; align-items: center; gap: 12px; background: white; padding: 4px 16px; border-radius: 24px; border: 1px solid #e5e7eb; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .month-display { font-weight: 500; min-width: 140px; text-align: center; font-size: 16px; }

    .table-card { overflow: hidden; }
    .sales-table { width: 100%; }
    .text-right { text-align: right; }
    .fw-500 { font-weight: 500; }
    .item-list { color: #4b5563; font-size: 0.9em; }

    .table-footer { display: flex; justify-content: flex-end; align-items: center; gap: 16px; padding: 16px 24px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
    .total-label { font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
    .total-value { font-size: 20px; font-weight: 700; color: #059669; }

    .loading-shade { display: flex; justify-content: center; padding: 48px; }
  `],
  animations: [fadeIn]
})
export class SalesByUserComponent {
  private storeService = inject(StoreService); // Still needed? Maybe not if we remove direct calls
  private reportStateService = inject(ReportStateService);
  private userService = inject(UserService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Users
  users$ = this.userService.getUsers();
  users = toSignal(this.users$, { initialValue: [] });

  // State
  currentDate = signal(new Date());
  selectedUserId = signal<string | null>(null);
  isLoading = signal(false);

  // Computed
  viewMonth = computed(() => this.currentDate().getMonth());
  viewYear = computed(() => this.currentDate().getFullYear());

  constructor() {
    // Initialize from Query Params
    this.route.queryParams.subscribe(params => {
      if (params['date']) {
        this.currentDate.set(new Date(params['date']));
      } else {
        this.currentDate.set(new Date());
      }
      // If user param exists (not required but good for deep linking)
      if (params['userId']) {
        this.selectedUserId.set(params['userId']);
      }
    });
  }

  // Transaction Data & Totals
  viewData = toSignal(
    combineLatest([
      toObservable(this.currentDate),
      toObservable(this.selectedUserId)
    ]).pipe(
      switchMap(([date, userId]) => {
        if (!userId) return of({ transactions: [], total: 0 });
        this.isLoading.set(true);

        return this.reportStateService.getUserSalesReport(userId, date).pipe(
          map(data => {
            this.isLoading.set(false);
            return data;
          })
        );
      })
    ),
    { initialValue: { transactions: [], total: 0 } }
  );

  transactions = computed(() => this.viewData().transactions);
  totalSales = computed(() => this.viewData().total);

  displayedColumns = ['date', 'items', 'amount'];

  // Navigation / Actions
  goBack() {
    // Navigate back to Monthly Report with preserved date state
    // We only preserve the month/year of the Monthly report, 
    // BUT user asked: "if we go back, we will go back to the monthly report with the month chosen as where we left of."
    // Wait, the user said: "example: in monthly sales, we are in January but in sales by user, we chose to go back to december, 
    // when we press back, the monthly sales will remain january."
    // So we need to potentiall separate the "monthly report state" from the "user report state".
    // HOWEVER, the standard way to pass state back is query params.
    // Let's assume the "monthly report state" was passed IN to us, we should pass it BACK.
    // Actually, deeper requirement: "We will not carry the month chosen for the user... the monthly sales will remain january."
    // This implies we need to remember what the PREVIOUS month was.
    // easiest way: read the 'returnDate' query param if we set it.

    const returnDate = this.route.snapshot.queryParams['returnDate'];
    const dateToReturn = returnDate ? new Date(returnDate) : new Date(); // Fallback to now if lost

    this.router.navigate(['/store/monthly-sales'], {
      queryParams: {
        date: dateToReturn.toISOString()
      }
    });
  }

  nextMonth() {
    const next = new Date(this.currentDate());
    next.setMonth(next.getMonth() + 1);
    this.currentDate.set(next);
  }

  prevMonth() {
    const prev = new Date(this.currentDate());
    prev.setMonth(prev.getMonth() - 1);
    this.currentDate.set(prev);
  }

  canGoNext(): boolean {
    const next = new Date(this.currentDate());
    next.setMonth(next.getMonth() + 1);
    const now = new Date();
    // Allow going up to current month (or next month for full view?)
    // Usually limit to current date.
    return next <= new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
  }

  getMonthName(month: number): string {
    return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(2000, month, 1));
  }

  getItemsSummary(items: any[]): string {
    return items.map(i => `${i.quantity}x ${i.productName}`).join(', ');
  }
}
