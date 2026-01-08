import { Component, inject, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InventoryHistoryService } from '../../services/inventory-history.service';
import { InventoryLog } from '../../../../core/models/store.model';
import { fadeIn } from '../../../../core/animations/animations';
import { DocumentData, QueryDocumentSnapshot } from '@angular/fire/firestore';

@Component({
    selector: 'app-inventory-history',
    standalone: true,
    imports: [
        CommonModule, MatTableModule, MatButtonModule, MatIconModule,
        MatProgressSpinnerModule, MatChipsModule, MatTooltipModule
    ],
    templateUrl: './inventory-history.html',
    styleUrl: './inventory-history.css',
    animations: [fadeIn],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryHistoryComponent implements OnInit {
    private historyService = inject(InventoryHistoryService);
    private cdr = inject(ChangeDetectorRef);

    dataSource = new MatTableDataSource<InventoryLog>([]);
    displayedColumns = ['date', 'type', 'product', 'performedBy', 'change', 'newStock'];

    lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
    isLoading = signal(false);
    hasMore = signal(true);
    pageSize = 20;

    ngOnInit() {
        this.loadHistory();
    }

    async loadHistory(loadMore = false) {
        if (this.isLoading()) return;
        this.isLoading.set(true);

        try {
            const result = await this.historyService.getHistory(
                undefined, // No product filter for global view
                this.pageSize,
                loadMore ? (this.lastDoc || undefined) : undefined
            );

            if (loadMore) {
                this.dataSource.data = [...this.dataSource.data, ...result.logs];
            } else {
                this.dataSource.data = result.logs;
            }

            this.lastDoc = result.lastDoc;
            this.hasMore.set(result.logs.length === this.pageSize);
        } catch (err) {
            console.error('Error loading history', err);
        } finally {
            this.isLoading.set(false);
            this.cdr.markForCheck();
        }
    }

    getTypeColor(type: string): string {
        switch (type) {
            case 'RESTOCK': return 'primary'; // Blue/Green usually, mapping to primary theme
            case 'SALE': return 'warn'; // Red
            case 'AUDIT_ADJUSTMENT': return 'accent'; // Orange/Yellow
            case 'INTERNAL_USE': return 'primary'; // Blue
            default: return '';
        }
    }

    getTypeLabel(type: string): string {
        return type.replace('_', ' ');
    }
}
