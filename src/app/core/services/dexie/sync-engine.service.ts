import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, BehaviorSubject, fromEvent, merge, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { OutboxQueueService } from './outbox-queue.service';
import { OutboxItem } from '../../models/outbox.model';

import { Firestore, collection, addDoc, doc, writeBatch, increment, arrayUnion } from '@angular/fire/firestore';

@Injectable({
    providedIn: 'root',
})
export class SyncEngineService {
    private platformId = inject(PLATFORM_ID);
    private outboxQueueService = inject(OutboxQueueService);
    private firestore = inject(Firestore);

    private isBrowser = isPlatformBrowser(this.platformId);
    private onlineSubject = new BehaviorSubject<boolean>(
        this.isBrowser ? navigator.onLine : true
    );

    public isOnline$ = this.onlineSubject.asObservable().pipe(shareReplay(1));
    public isOnlineSignal = signal<boolean>(this.isBrowser ? navigator.onLine : true);

    private broadcastChannel: BroadcastChannel | null = null;
    private isFlushing = false;

    constructor() {
        if (this.isBrowser) {
            // Listen to browser network connectivity events
            merge(
                of(navigator.onLine),
                fromEvent(window, 'online').pipe(map(() => true)),
                fromEvent(window, 'offline').pipe(map(() => false))
            ).subscribe((status) => {
                this.onlineSubject.next(status);
                this.isOnlineSignal.set(status);

                // Auto-trigger queue flush when returning online
                if (status) {
                    this.notifyTabs('NETWORK_ONLINE');
                    this.flushOutboxQueue();
                }
            });

            // Initialize multi-tab Sync BroadcastChannel
            if ('BroadcastChannel' in window) {
                try {
                    this.broadcastChannel = new BroadcastChannel('epicenter_dexie_sync');
                    this.broadcastChannel.onmessage = (event) => {
                        console.log('[SyncEngineService] Broadcast event received:', event.data);
                    };
                } catch (e) {
                    console.warn('[SyncEngineService] BroadcastChannel initialization failed:', e);
                }
            }
        }
    }

    /**
     * Broadcasts a sync notification event to other open browser tabs
     */
    notifyTabs(eventType: string, payload?: any): void {
        if (this.broadcastChannel) {
            try {
                this.broadcastChannel.postMessage({ type: eventType, payload, timestamp: Date.now() });
            } catch (err) {
                console.warn('[SyncEngineService] Broadcast postMessage failed:', err);
            }
        }
    }

    /**
     * Flushes all pending outbox queue items through an optional custom handler or processor function
     */
    async flushOutboxQueue(
        processor?: (item: OutboxItem) => Promise<void>
    ): Promise<{ processed: number; failed: number }> {
        if (!this.onlineSubject.value || this.isFlushing) {
            return { processed: 0, failed: 0 };
        }

        this.isFlushing = true;
        let processedCount = 0;
        let failedCount = 0;

        try {
            const pendingItems = await this.outboxQueueService.getPendingItems();

            for (const item of pendingItems) {
                if (!item.id) continue;

                await this.outboxQueueService.markProcessing(item.id);

                try {
                    if (processor) {
                        await processor(item);
                    } else {
                        await this.defaultProcessItem(item);
                    }
                    await this.outboxQueueService.markSuccess(item.id);
                    processedCount++;
                    this.notifyTabs('OUTBOX_ITEM_SYNCED', { id: item.id, type: item.type });
                } catch (err: any) {
                    failedCount++;
                    const errorMessage = err?.message || String(err);
                    await this.outboxQueueService.markFailed(item.id, errorMessage);
                    console.error(`[SyncEngineService] Failed processing outbox item #${item.id}:`, err);
                }
            }
        } finally {
            this.isFlushing = false;
        }

        return { processed: processedCount, failed: failedCount };
    }

    private async defaultProcessItem(item: OutboxItem): Promise<void> {
        if (item.type === 'CHECKIN' && item.payload) {
            const attendanceCollection = collection(this.firestore, 'attendance');
            await addDoc(attendanceCollection, item.payload);
        }
    }
}
