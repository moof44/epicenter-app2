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
     * Aggregated Member Health Summary stream.
     * Computes active, inactive, expiring, and new counts directly inside Dexie
     * without loading or emitting 3,600+ member objects into Angular memory.
     */
    getMemberHealthSummaryLive(): Observable<{
        activeCount: number;
        inactiveCount: number;
        expiringCount: number;
        expiringNames: string[];
        newThisMonth: number;
    }> {
        if (!isPlatformBrowser(this.platformId)) {
            return of({
                activeCount: 0,
                inactiveCount: 0,
                expiringCount: 0,
                expiringNames: [],
                newThisMonth: 0,
            });
        }

        return from(
            liveQuery(async () => {
                const db = this.dbService.db;
                if (!db) {
                    return {
                        activeCount: 0,
                        inactiveCount: 0,
                        expiringCount: 0,
                        expiringNames: [],
                        newThisMonth: 0,
                    };
                }

                // Fast index counts on IndexedDB
                const activeCount = await db.members.where('membershipStatus').equals('Active').count();
                const inactiveCount = await db.members.where('membershipStatus').equals('Inactive').count();

                const now = new Date();
                const weekFromNow = new Date(now);
                weekFromNow.setDate(weekFromNow.getDate() + 7);
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

                let newThisMonth = 0;
                const expiringMembers: string[] = [];

                // Fast cursor scan to collect only expiring soon and new members
                await db.members.each((m) => {
                    if (m.membershipExpiration) {
                        const raw = m.membershipExpiration as any;
                        const exp = raw instanceof Date ? raw : (raw.toDate ? raw.toDate() : new Date(raw));
                        if (exp && exp > now && exp <= weekFromNow) {
                            expiringMembers.push(m.name || 'Member');
                        }
                    }
                    if (m.createdBy?.timestamp) {
                        const rawCreated = m.createdBy.timestamp as any;
                        const created = rawCreated instanceof Date ? rawCreated : (rawCreated.toDate ? rawCreated.toDate() : new Date(rawCreated));
                        if (created && created >= startOfMonth) {
                            newThisMonth++;
                        }
                    }
                });

                return {
                    activeCount,
                    inactiveCount,
                    expiringCount: expiringMembers.length,
                    expiringNames: expiringMembers.slice(0, 3),
                    newThisMonth,
                };
            })
        ).pipe(
            shareReplay({ bufferSize: 1, refCount: false })
        );
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
