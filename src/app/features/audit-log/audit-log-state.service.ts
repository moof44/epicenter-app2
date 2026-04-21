import { Injectable, signal } from '@angular/core';

interface AuditEvent {
    type: string;
    icon: string;
    color: string;
    title: string;
    detail: string;
    performer: string;
    timestamp: Date;
    amount: number | null;
}

/**
 * Preserves audit log state across route navigations.
 * providedIn: 'root' — survives component destruction.
 */
@Injectable({
    providedIn: 'root',
})
export class AuditLogStateService {
    // Filters
    startDate = signal<Date>(new Date());
    endDate = signal<Date>(new Date());
    selectedStaff = signal<string>('');
    selectedTypes = signal<Set<string>>(new Set(['sale', 'void', 'checkin', 'shift', 'expense']));

    // Results
    events = signal<AuditEvent[]>([]);
    currentPage = signal(0);

    // Track whether we have a cached search
    hasSearched = signal(false);

    clear(): void {
        this.events.set([]);
        this.currentPage.set(0);
        this.hasSearched.set(false);
    }
}
