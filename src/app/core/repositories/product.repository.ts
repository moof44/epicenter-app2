import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
    Firestore,
    collection,
    collectionData,
    query,
    orderBy,
} from '@angular/fire/firestore';
import { liveQuery } from 'dexie';
import { Observable, from, shareReplay, catchError, of } from 'rxjs';
import { Product } from '../models/store.model';
import { AppIndexedDbService } from '../services/dexie/app-indexeddb.service';
import { createConverter } from '../utils/firestore-converter.utils';

@Injectable({
    providedIn: 'root',
})
export class ProductRepository {
    private dbService = inject(AppIndexedDbService);
    private firestore = inject(Firestore);
    private platformId = inject(PLATFORM_ID);

    private productsCollection = collection(this.firestore, 'products').withConverter(
        createConverter<Product>()
    );

    private syncStarted = false;
    private liveProducts$?: Observable<Product[]>;

    /**
     * Returns an Observable of products directly from local Dexie IndexedDB cache (0ms latency),
     * while starting a background real-time sync with Firestore to update Dexie.
     * Falls back to direct Firestore stream on SSR.
     */
    getProductsLive(): Observable<Product[]> {
        // Fallback for SSR server-side rendering
        if (!isPlatformBrowser(this.platformId)) {
            const q = query(this.productsCollection, orderBy('name'));
            return collectionData(q, { idField: 'id' });
        }

        if (!this.liveProducts$) {
            // 1. Live Query from Dexie IndexedDB
            this.liveProducts$ = from(
                liveQuery(async () => {
                    const db = this.dbService.db;
                    if (!db) return [];
                    const products = await db.products.toArray();
                    // Sort by name alphabetically to match standard ProductService order
                    return products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                })
            ).pipe(
                shareReplay({ bufferSize: 1, refCount: false })
            );

            // 2. Start background delta/full sync from Firestore into Dexie
            this.startBackgroundSync();
        }

        return this.liveProducts$;
    }

    /**
     * Starts background real-time Firestore listener to keep Dexie products in sync.
     */
    private startBackgroundSync(): void {
        if (this.syncStarted || !isPlatformBrowser(this.platformId)) return;
        this.syncStarted = true;

        const q = query(this.productsCollection, orderBy('name'));

        collectionData(q, { idField: 'id' })
            .pipe(
                catchError((err) => {
                    console.warn('[ProductRepository] Background sync error (offline?):', err);
                    return of([]);
                })
            )
            .subscribe({
                next: async (remoteProducts) => {
                    if (remoteProducts && remoteProducts.length > 0) {
                        try {
                            const db = this.dbService.db;
                            if (db) {
                                await db.products.bulkPut(remoteProducts);
                            }
                        } catch (err) {
                            console.error('[ProductRepository] Error seeding/updating Dexie:', err);
                        }
                    }
                },
            });
    }

    /**
     * Optimistically update or insert a product in Dexie cache
     */
    async saveLocal(product: Product): Promise<void> {
        if (product.id && this.dbService.products) {
            await this.dbService.products.put(product);
        }
    }

    /**
     * Remove a product from Dexie cache
     */
    async removeLocal(id: string): Promise<void> {
        if (this.dbService.products) {
            await this.dbService.products.delete(id);
        }
    }

    /**
     * Clear local Dexie cache for products
     */
    async clearLocal(): Promise<void> {
        if (this.dbService.products) {
            await this.dbService.products.clear();
        }
    }
}
