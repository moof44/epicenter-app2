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
import { Member } from '../models/member.model';
import { AppIndexedDbService } from '../services/dexie/app-indexeddb.service';
import { createConverter } from '../utils/firestore-converter.utils';

@Injectable({
    providedIn: 'root',
})
export class MemberRepository {
    private dbService = inject(AppIndexedDbService);
    private firestore = inject(Firestore);
    private platformId = inject(PLATFORM_ID);

    private membersCollection = collection(this.firestore, 'members').withConverter(
        createConverter<Member>()
    );

    private syncStarted = false;
    private liveMembers$?: Observable<Member[]>;

    /**
     * Returns an Observable of members directly from local Dexie IndexedDB cache (0ms latency),
     * while starting a background real-time sync with Firestore to update Dexie.
     * Falls back to direct Firestore stream on SSR.
     */
    getMembersLive(): Observable<Member[]> {
        // Fallback for SSR server-side rendering
        if (!isPlatformBrowser(this.platformId)) {
            const q = query(this.membersCollection, orderBy('name'));
            return collectionData(q, { idField: 'id' });
        }

        if (!this.liveMembers$) {
            // 1. Live Query from Dexie IndexedDB
            this.liveMembers$ = from(
                liveQuery(async () => {
                    const db = this.dbService.db;
                    if (!db) return [];
                    const members = await db.members.toArray();
                    // Sort by name alphabetically to match standard MemberService order
                    return members.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                })
            ).pipe(
                shareReplay({ bufferSize: 1, refCount: false })
            );

            // 2. Start background delta/full sync from Firestore into Dexie
            this.startBackgroundSync();
        }

        return this.liveMembers$;
    }

    /**
     * Starts background real-time Firestore listener to keep Dexie in sync.
     */
    private startBackgroundSync(): void {
        if (this.syncStarted || !isPlatformBrowser(this.platformId)) return;
        this.syncStarted = true;

        const q = query(this.membersCollection, orderBy('name'));

        collectionData(q, { idField: 'id' })
            .pipe(
                catchError((err) => {
                    console.warn('[MemberRepository] Background sync error (offline?):', err);
                    return of([]);
                })
            )
            .subscribe({
                next: async (remoteMembers) => {
                    if (remoteMembers && remoteMembers.length > 0) {
                        try {
                            const db = this.dbService.db;
                            if (db) {
                                await db.members.bulkPut(remoteMembers);
                            }
                        } catch (err) {
                            console.error('[MemberRepository] Error seeding/updating Dexie:', err);
                        }
                    }
                },
            });
    }

    /**
     * Optimistically update or insert a member in Dexie cache
     */
    async saveLocal(member: Member): Promise<void> {
        if (member.id && this.dbService.members) {
            await this.dbService.members.put(member);
        }
    }

    /**
     * Remove a member from Dexie cache
     */
    async removeLocal(id: string): Promise<void> {
        if (this.dbService.members) {
            await this.dbService.members.delete(id);
        }
    }

    /**
     * Clear local Dexie cache for members
     */
    async clearLocal(): Promise<void> {
        if (this.dbService.members) {
            await this.dbService.members.clear();
        }
    }
}
