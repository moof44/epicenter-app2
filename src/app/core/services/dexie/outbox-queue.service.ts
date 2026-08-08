import { Injectable, inject } from '@angular/core';
import { AppIndexedDbService } from './app-indexeddb.service';
import { OutboxItem } from '../../models/outbox.model';

@Injectable({
    providedIn: 'root',
})
export class OutboxQueueService {
    private dbService = inject(AppIndexedDbService);

    /**
     * Pushes a new mutation task into the Dexie Outbox Queue
     */
    async addToOutbox(
        item: Omit<OutboxItem, 'id' | 'createdAt' | 'retryCount' | 'status'> & {
            status?: OutboxItem['status'];
        }
    ): Promise<number> {
        const queue = this.dbService.outboxQueue;
        if (!queue) {
            throw new Error('Dexie OutboxQueue table is unavailable.');
        }

        const record: OutboxItem = {
            ...item,
            status: item.status || 'PENDING',
            retryCount: 0,
            createdAt: Date.now(),
        };

        const id = await queue.add(record);
        return id;
    }

    /**
     * Gets all pending mutation items waiting for sync (sorted by createdAt)
     */
    async getPendingItems(): Promise<OutboxItem[]> {
        const queue = this.dbService.outboxQueue;
        if (!queue) return [];

        return queue
            .where('status')
            .equals('PENDING')
            .sortBy('createdAt');
    }

    /**
     * Marks an outbox item as PROCESSING
     */
    async markProcessing(id: number): Promise<void> {
        const queue = this.dbService.outboxQueue;
        if (!queue) return;
        await queue.update(id, { status: 'PROCESSING' });
    }

    /**
     * Marks an outbox item as successfully executed and removes it from the queue
     */
    async markSuccess(id: number): Promise<void> {
        const queue = this.dbService.outboxQueue;
        if (!queue) return;
        await queue.delete(id);
    }

    /**
     * Marks an outbox item as FAILED with an error message and increments retryCount
     */
    async markFailed(id: number, error: string): Promise<void> {
        const queue = this.dbService.outboxQueue;
        if (!queue) return;

        const item = await queue.get(id);
        if (item) {
            await queue.update(id, {
                status: 'FAILED',
                retryCount: (item.retryCount || 0) + 1,
                lastError: error,
            });
        }
    }

    /**
     * Resets a FAILED item back to PENDING for manual or automated retry
     */
    async resetFailedToPending(id: number): Promise<void> {
        const queue = this.dbService.outboxQueue;
        if (!queue) return;
        await queue.update(id, { status: 'PENDING', lastError: undefined });
    }

    /**
     * Clears all items in the outbox queue
     */
    async clearQueue(): Promise<void> {
        const queue = this.dbService.outboxQueue;
        if (!queue) return;
        await queue.clear();
    }
}
