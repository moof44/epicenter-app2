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

export interface MemberQueryOptions {
    search?: string;
    status?: string;
    subscription?: string;
    pageIndex: number;
    pageSize: number;
}

export interface PagedMembersResult {
    items: Member[];
    totalCount: number;
}

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
     * Returns a paginated Observable slice directly from Dexie IndexedDB (0ms latency),
     * only loading pageSize (10-20) records into Angular memory at a time.
     */
    getMembersPagedLive(options: MemberQueryOptions): Observable<PagedMembersResult> {
        if (!isPlatformBrowser(this.platformId)) {
            return of({ items: [], totalCount: 0 });
        }

        this.startBackgroundSync();

        return from(
            liveQuery(async () => {
                const db = this.dbService.db;
                if (!db) return { items: [], totalCount: 0 };

                const search = (options.search || '').trim().toLowerCase();
                const status = options.status || 'All';
                const subscription = options.subscription || 'All';
                const pageIndex = options.pageIndex || 0;
                const pageSize = options.pageSize || 10;
                const nowMs = Date.now();

                const getExpMs = (exp: any): number => {
                    if (!exp) return 0;
                    if (exp.seconds) return exp.seconds * 1000;
                    if (exp instanceof Date) return exp.getTime();
                    if (exp.toDate) return exp.toDate().getTime();
                    const d = new Date(exp);
                    return isNaN(d.getTime()) ? 0 : d.getTime();
                };

                const isFiltered = search !== '' || status !== 'All' || subscription !== 'All';

                if (!isFiltered) {
                    const totalCount = await db.members.count();
                    const items = await db.members
                        .orderBy('name')
                        .offset(pageIndex * pageSize)
                        .limit(pageSize)
                        .toArray();
                    return { items, totalCount };
                }

                const filtered = db.members.orderBy('name').filter((m) => {
                    if (search) {
                        const nameMatch = m.name ? m.name.toLowerCase().includes(search) : false;
                        const contactMatch = m.contactNumber ? m.contactNumber.includes(search) : false;
                        if (!nameMatch && !contactMatch) return false;
                    }
                    if (status !== 'All' && m.membershipStatus !== status) {
                        return false;
                    }
                    if (subscription !== 'All') {
                        const memExpMs = getExpMs(m.membershipExpiration);
                        const trainExpMs = getExpMs(dataTrainingExp(m));
                        const hasActive = memExpMs > nowMs || trainExpMs > nowMs;
                        if (subscription === 'HasSubscription' && !hasActive) return false;
                        if (subscription === 'NoSubscription' && hasActive) return false;
                    }
                    return true;
                });

                function dataTrainingExp(m: Member) {
                    return m.trainingExpiration;
                }

                const totalCount = await filtered.count();
                const items = await filtered
                    .offset(pageIndex * pageSize)
                    .limit(pageSize)
                    .toArray();

                return { items, totalCount };
            })
        );
    }

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
                    // Use Dexie's native B-tree index for instant 0ms pre-sorted retrieval
                    return await db.members.orderBy('name').toArray();
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

        setTimeout(() => {
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
        }, 4000); // Defer by 4s so Dexie serves initial UI in 0ms without thread contention
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
