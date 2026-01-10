import { Injectable, inject } from '@angular/core';
import {
    Firestore,
    collection,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    getDocs,
    DocumentData,
    QueryDocumentSnapshot,
} from '@angular/fire/firestore';
import { InventoryLog } from '../../../core/models/store.model';

@Injectable({
    providedIn: 'root'
})
export class InventoryHistoryService {
    private firestore = inject(Firestore);
    private inventoryLogsCollection = collection(this.firestore, 'inventory_logs');

    /**
     * Fetch inventory history with pagination.
     * @param productId Optional filter by product ID.
     * @param pageSize Number of records to fetch.
     * @param lastDocument The last document from the previous page (for cursor).
     */
    async getHistory(
        filters: {
            productId?: string;
            startDate?: Date;
            endDate?: Date;
            type?: string;
            search?: string; // For searching text fields (client-side usually or exact match)
        } = {},
        pageSize = 20,
        lastDocument?: QueryDocumentSnapshot<DocumentData>
    ): Promise<{ logs: InventoryLog[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {

        const constraints: any[] = [orderBy('timestamp', 'desc')];

        // Product Filter
        if (filters.productId) {
            constraints.push(where('productId', '==', filters.productId));
        }

        // Type Filter
        if (filters.type) {
            constraints.push(where('type', '==', filters.type));
        }

        // Date Range
        if (filters.startDate) {
            constraints.push(where('timestamp', '>=', filters.startDate));
        }
        if (filters.endDate) {
            // Add one day to include the end date fully if it's just a date string,
            // or assume the caller handles the time part.
            constraints.push(where('timestamp', '<=', filters.endDate));
        }

        // Limit
        constraints.push(limit(pageSize)); // Use page size or larger if needed

        if (lastDocument) {
            constraints.push(startAfter(lastDocument));
        }

        const q = query(this.inventoryLogsCollection, ...constraints);

        const snapshot = await getDocs(q);
        let logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryLog));

        // Client-side text search (Staff Name / Product Name partial matches)
        // Note: This only filters the *fetched page*. For true search, we'd need Algolia/Elasticsearch.
        // Given constraints, this is best effort.
        if (filters.search) {
            const term = filters.search.toLowerCase();
            logs = logs.filter(log =>
                log.productName?.toLowerCase().includes(term) ||
                log.staffName?.toLowerCase().includes(term) ||
                log.performedBy?.toLowerCase().includes(term)
            );
        }

        const lastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

        return { logs, lastDoc };
    }
}
