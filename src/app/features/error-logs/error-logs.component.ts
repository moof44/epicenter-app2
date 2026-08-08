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
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { ErrorLoggerService } from '../../core/services/error-logger.service';
import { SystemErrorLog } from '../../core/models/system-error.model';

@Component({
    selector: 'app-error-logs',
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
        MatExpansionModule,
        MatSnackBarModule,
        MatTooltipModule,
        MatBadgeModule,
    ],
    templateUrl: './error-logs.component.html',
    styleUrl: './error-logs.component.scss',
})
export class ErrorLogsComponent implements OnInit {
    private errorLoggerService = inject(ErrorLoggerService);
    private snackBar = inject(MatSnackBar);

    logs = signal<SystemErrorLog[]>([]);
    searchQuery = signal<string>('');
    severityFilter = signal<string>('ALL');
    statusFilter = signal<string>('UNRESOLVED');

    // KPI Counters
    totalCount = computed(() => this.logs().length);
    unresolvedCount = computed(() => this.logs().filter((l) => l.status === 'UNRESOLVED').length);
    fatalCount = computed(() => this.logs().filter((l) => l.severity === 'FATAL').length);

    // Filtered logs stream
    filteredLogs = computed(() => {
        const query = this.searchQuery().toLowerCase().trim();
        const severity = this.severityFilter();
        const status = this.statusFilter();

        return this.logs().filter((log) => {
            const matchesQuery =
                !query ||
                log.message.toLowerCase().includes(query) ||
                (log.name && log.name.toLowerCase().includes(query)) ||
                log.url.toLowerCase().includes(query) ||
                (log.user && log.user.displayName.toLowerCase().includes(query));

            const matchesSeverity = severity === 'ALL' || log.severity === severity;
            const matchesStatus = status === 'ALL' || log.status === status;

            return matchesQuery && matchesSeverity && matchesStatus;
        });
    });

    ngOnInit(): void {
        this.errorLoggerService.getErrorLogs().subscribe({
            next: (data) => {
                this.logs.set(data || []);
            },
            error: (err) => {
                console.error('Failed to load error logs:', err);
            },
        });
    }

    async toggleStatus(log: SystemErrorLog, event?: Event): Promise<void> {
        if (event) event.stopPropagation();
        if (!log.id) return;
        try {
            if (log.status === 'UNRESOLVED') {
                await this.errorLoggerService.markAsResolved(log.id);
                this.snackBar.open('Error marked as Resolved.', 'Close', { duration: 2500 });
            } else {
                await this.errorLoggerService.markAsUnresolved(log.id);
                this.snackBar.open('Error marked as Unresolved.', 'Close', { duration: 2500 });
            }
        } catch {
            this.snackBar.open('Failed to update status.', 'Close', { duration: 3000 });
        }
    }

    async deleteLog(log: SystemErrorLog, event: Event): Promise<void> {
        event.stopPropagation();
        if (!log.id) return;
        try {
            await this.errorLoggerService.deleteLog(log.id);
            this.snackBar.open('Error log deleted.', 'Close', { duration: 2500 });
        } catch {
            this.snackBar.open('Failed to delete log.', 'Close', { duration: 3000 });
        }
    }

    async clearAll(): Promise<void> {
        if (!confirm('Are you sure you want to clear ALL system error logs?')) return;
        try {
            await this.errorLoggerService.clearAllLogs();
            this.snackBar.open('All error logs cleared.', 'Close', { duration: 3000 });
        } catch {
            this.snackBar.open('Failed to clear logs.', 'Close', { duration: 3000 });
        }
    }

    copyForAi(log: SystemErrorLog, event: Event): void {
        event.stopPropagation();
        const markdown = this.errorLoggerService.formatForAi(log);
        navigator.clipboard.writeText(markdown).then(
            () => {
                this.snackBar.open('📋 Copied Error Report formatted for AI Assistant!', 'Close', {
                    duration: 3500,
                    panelClass: ['success-snackbar'],
                });
            },
            (err) => {
                console.error('Clipboard copy failed:', err);
                this.snackBar.open('Clipboard copy failed. Please select text manually.', 'Close', {
                    duration: 3000,
                });
            }
        );
    }
}
