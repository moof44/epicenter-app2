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
        productId?: string,
        pageSize = 20,
        lastDocument?: QueryDocumentSnapshot<DocumentData>
    ): Promise<{ logs: InventoryLog[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {

        let q = query(
            this.inventoryLogsCollection,
            orderBy('timestamp', 'desc'),
            limit(pageSize)
        );

        if (productId) {
            // Requires Composite Index: productId Asc + timestamp Desc
            q = query(
                this.inventoryLogsCollection,
                where('productId', '==', productId),
                orderBy('timestamp', 'desc'),
                limit(pageSize)
            );
        }

        if (lastDocument) {
            q = query(q, startAfter(lastDocument));
        }

        const snapshot = await getDocs(q);
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryLog));
        const lastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

        return { logs, lastDoc };
    }
}
