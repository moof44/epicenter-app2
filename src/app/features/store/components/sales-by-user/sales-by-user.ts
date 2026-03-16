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
  templateUrl: './sales-by-user.html',
  styleUrl: './sales-by-user.css',
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
