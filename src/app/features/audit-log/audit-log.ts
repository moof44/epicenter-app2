import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';
import { TransactionService } from '../../core/services/transaction.service';
import { AttendanceService } from '../../core/services/attendance.service';
import { CashRegisterService } from '../../core/services/cash-register.service';
import { UserService } from '../../core/services/user.service';
import { toLocalDateStr } from '../../core/utils/date.utils';
import { Router, RouterModule } from '@angular/router';
import { fadeIn } from '../../core/animations/animations';
import { AuditLogStateService } from './audit-log-state.service';

interface AuditEvent {
    type: 'sale' | 'void' | 'checkin' | 'checkout' | 'shift_open' | 'shift_close' | 'expense' | 'float';
    icon: string;
    color: string;
    title: string;
    detail: string;
    performer: string;
    timestamp: Date;
    amount: number | null;
}

function safeToDate(value: any): Date {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    if (value.toDate) return value.toDate();
    return new Date(value);
}

@Component({
    selector: 'app-audit-log',
    standalone: true,
    imports: [
        RouterModule,
        CommonModule, FormsModule, MatCardModule, MatIconModule, MatButtonModule,
        MatFormFieldModule, MatInputModule, MatSelectModule,
        MatDatepickerModule, MatNativeDateModule, MatChipsModule, MatProgressSpinnerModule,
    ],
    templateUrl: './audit-log.html',
    styleUrl: './audit-log.css',
    animations: [fadeIn],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLogComponent {
    private transactionService = inject(TransactionService);
    private attendanceService = inject(AttendanceService);
    private cashRegisterService = inject(CashRegisterService);
    private userService = inject(UserService);
    private router = inject(Router);

    // State preserved across navigations via root-level service
    private state = inject(AuditLogStateService);

    // Bind to state service signals directly
    startDate = this.state.startDate;
    endDate = this.state.endDate;
    selectedStaff = this.state.selectedStaff;
    selectedTypes = this.state.selectedTypes;
    events = this.state.events;
    currentPage = this.state.currentPage;

    // Local-only
    isLoading = signal(false);
    staffList = signal<{ uid: string; name: string }[]>([]);

    // Pagination
    readonly pageSize = 20;

    pagedEvents = computed(() => {
        const all = this.events();
        const start = this.currentPage() * this.pageSize;
        return all.slice(start, start + this.pageSize);
    });

    totalPages = computed(() => Math.ceil(this.events().length / this.pageSize));
    isEmpty = computed(() => this.events().length === 0 && !this.isLoading());
    totalCount = computed(() => this.events().length);
    // Computed KPI Metrics
    salesCount = computed(() => this.events().filter(e => e.type === 'sale' || e.type === 'void').length);
    shiftsCount = computed(() => this.events().filter(e => e.type === 'shift_open' || e.type === 'shift_close' || e.type === 'float' || e.type === 'expense').length);
    checkinsCount = computed(() => this.events().filter(e => e.type === 'checkin' || e.type === 'checkout').length);

    goBack() {
        this.router.navigate(['/dashboard']);
    }

    eventTypes = [
        { key: 'sale', label: 'Sales', icon: 'point_of_sale' },
        { key: 'void', label: 'Voids', icon: 'remove_circle' },
        { key: 'checkin', label: 'Check-ins', icon: 'how_to_reg' },
        { key: 'shift', label: 'Shifts', icon: 'account_balance_wallet' },
        { key: 'expense', label: 'Expenses', icon: 'money_off' },
    ];

    constructor() {
        this.loadStaffList();
        // Only search if no cached results — otherwise restore previous state
        if (!this.state.hasSearched()) {
            this.search();
        }
    }

    private async loadStaffList(): Promise<void> {
        try {
            const users = await firstValueFrom(this.userService.getStaffUsers());
            this.staffList.set(users.map(u => ({ uid: u.uid, name: u.displayName })));
        } catch (err) {
            console.error('Failed to load staff list:', err);
        }
    }

    toggleType(key: string): void {
        const current = new Set(this.selectedTypes());
        if (current.has(key)) current.delete(key);
        else current.add(key);
        this.selectedTypes.set(current);
    }

    isTypeSelected(key: string): boolean {
        return this.selectedTypes().has(key);
    }

    async search(): Promise<void> {
        // Fix 4: Prevent race conditions from rapid chip toggling
        if (this.isLoading()) return;

        this.isLoading.set(true);
        this.events.set([]);
        this.currentPage.set(0);

        const start = new Date(this.startDate());
        start.setHours(0, 0, 0, 0);
        const end = new Date(this.endDate());
        end.setHours(23, 59, 59, 999);
        const types = this.selectedTypes();
        const staffFilter = this.selectedStaff();

        // Resolve staff uid → name for shift filtering (openedBy/closedBy are names, not uids)
        const staffName = staffFilter
            ? this.staffList().find(s => s.uid === staffFilter)?.name || ''
            : '';

        try {
            const allEvents: AuditEvent[] = [];

            // Transactions (sales + voids)
            if (types.has('sale') || types.has('void')) {
                const txConstraints: any = { startDate: start, endDate: end, limit: 50 };
                if (staffFilter) txConstraints.staffId = staffFilter;

                const transactions = await firstValueFrom(
                    this.transactionService.getTransactions(txConstraints)
                );

                transactions.forEach(tx => {
                    const date = safeToDate(tx.date);
                    if (tx.status === 'VOID' && types.has('void')) {
                        allEvents.push({
                            type: 'void',
                            icon: 'remove_circle',
                            color: 'warn',
                            title: `VOID — ₱${tx.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                            detail: `Reason: ${tx.voidReason || 'N/A'} | Voided by: ${tx.voidedBy || 'Unknown'}`,
                            performer: tx.staffName || 'Unknown',
                            timestamp: safeToDate(tx.voidedAt) || date,
                            amount: tx.totalAmount,
                        });
                    } else if (tx.status !== 'VOID' && types.has('sale')) {
                        const items = tx.items.map(i => i.quantity > 1 ? `${i.quantity}x ${i.productName}` : i.productName).join(', ');
                        allEvents.push({
                            type: 'sale',
                            icon: 'point_of_sale',
                            color: 'primary',
                            title: `Sale — ₱${tx.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${tx.paymentMethod})`,
                            detail: `${items} | Member: ${tx.memberName || 'Walk-in'}`,
                            performer: tx.staffName || 'Unknown',
                            timestamp: date,
                            amount: tx.totalAmount,
                        });
                    }
                });
            }

            // Attendance
            if (types.has('checkin')) {
                const startStr = toLocalDateStr(start);
                const endStr = toLocalDateStr(end);
                const records = await this.attendanceService.getAttendanceRange(startStr, endStr);

                const filtered = staffFilter
                    ? records.filter(r => r.checkedInBy?.uid === staffFilter)
                    : records;

                filtered.slice(0, 50).forEach(r => {
                    allEvents.push({
                        type: 'checkin',
                        icon: 'how_to_reg',
                        color: 'accent',
                        title: `Check-in — ${r.memberName}`,
                        detail: r.lockerNumber ? `Locker ${r.lockerNumber}` : 'No locker',
                        performer: r.checkedInBy?.name || 'Unknown',
                        timestamp: safeToDate(r.checkInTime),
                        amount: null,
                    });
                });
            }

            // Shifts + Expenses (Fix 1+2+3: unified shift/expense handling)
            if (types.has('shift') || types.has('expense')) {
                const shifts = await firstValueFrom(
                    this.cashRegisterService.getShiftHistory(20, start, end)
                );

                // Fix 2: Apply staff filter to shifts by matching openedBy/closedBy name
                const filteredShifts = staffName
                    ? shifts.filter(s => s.openedBy === staffName || s.closedBy === staffName)
                    : shifts;

                filteredShifts.forEach(s => {
                    // Shift open/close events (only when 'shift' chip is active)
                    if (types.has('shift')) {
                        allEvents.push({
                            type: 'shift_open',
                            icon: 'lock_open',
                            color: 'primary',
                            title: `Shift Opened — ₱${s.openingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                            detail: 'Opening balance',
                            performer: s.openedBy || 'Unknown',
                            timestamp: safeToDate(s.startTime),
                            amount: s.openingBalance,
                        });

                        if (s.status === 'CLOSED') {
                            const variance = s.discrepancy ?? 0;
                            const varianceStr = variance === 0
                                ? 'Balanced'
                                : variance < 0
                                    ? `Shortage ₱${Math.abs(variance).toFixed(2)}`
                                    : `Overage ₱${variance.toFixed(2)}`;
                            allEvents.push({
                                type: 'shift_close',
                                icon: 'lock',
                                color: variance !== 0 ? 'warn' : 'primary',
                                title: `Shift Closed — ${varianceStr}`,
                                detail: `Revenue: ₱${(s.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} | Expenses: ₱${(s.totalExpenses || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                                performer: s.closedBy || 'Unknown',
                                timestamp: safeToDate(s.endTime),
                                amount: s.actualClosingBalance,
                            });
                        }
                    }

                    // Fix 1+3: Individual cash movements from shift transactions[]
                    if (types.has('expense') && s.transactions?.length) {
                        s.transactions
                            .filter(t => t.type === 'Expense' || t.type === 'Float_In' || t.type === 'Float_Out')
                            .filter(t => !t.voided)
                            .filter(t => {
                                // Apply staff filter to individual transactions too
                                if (!staffName) return true;
                                return t.performedBy === staffName;
                            })
                            .forEach(t => {
                                const typeLabel = t.type === 'Expense' ? 'Expense'
                                    : t.type === 'Float_In' ? 'Cash In'
                                    : 'Cash Out';
                                const icon = t.type === 'Expense' ? 'money_off'
                                    : t.type === 'Float_In' ? 'add_circle'
                                    : 'remove_circle';

                                allEvents.push({
                                    type: 'expense',
                                    icon,
                                    color: 'warn',
                                    title: `${typeLabel} — ₱${t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                                    detail: t.reason || 'No reason provided',
                                    performer: t.performedBy || 'Unknown',
                                    timestamp: safeToDate(t.timestamp),
                                    amount: t.amount,
                                });
                            });
                    }
                });
            }

            // Sort by timestamp descending
            allEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            this.events.set(allEvents);
            this.state.hasSearched.set(true);
        } catch (err) {
            console.error('Audit log search failed:', err);
        } finally {
            this.isLoading.set(false);
        }
    }

    getRelativeTime(date: Date): string {
        const diff = Date.now() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }

    formatTime(date: Date): string {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    formatDate(date: Date): string {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    nextPage(): void {
        if (this.currentPage() < this.totalPages() - 1) {
            this.currentPage.update(p => p + 1);
        }
    }

    prevPage(): void {
        if (this.currentPage() > 0) {
            this.currentPage.update(p => p - 1);
        }
    }

    canGoNext = computed(() => this.currentPage() < this.totalPages() - 1);
    canGoPrev = computed(() => this.currentPage() > 0);
}
