import { Injectable, PLATFORM_ID, inject, isDevMode } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import Dexie, { Table } from 'dexie';
import { Member } from '../../models/member.model';
import { Product } from '../../models/store.model';
import { OutboxItem } from '../../models/outbox.model';

export class GymAppLocalDb extends Dexie {
    members!: Table<Member, string>;
    products!: Table<Product, string>;
    outboxQueue!: Table<OutboxItem, number>;

    constructor() {
        super(isDevMode() ? 'GymApp_dev' : 'GymApp');
        this.version(1).stores({
            members: 'id, name, membershipStatus, portalUid',
        });
        this.version(2).stores({
            members: 'id, name, membershipStatus, portalUid',
            products: 'id, name, category, stock',
        });
        this.version(3).stores({
            members: 'id, name, membershipStatus, portalUid',
            products: 'id, name, category, stock',
            outboxQueue: '++id, clientTxId, type, status, createdAt',
        });
    }
}

@Injectable({
    providedIn: 'root',
})
export class AppIndexedDbService {
    private platformId = inject(PLATFORM_ID);
    private _db: GymAppLocalDb | null = null;

    get isBrowser(): boolean {
        return isPlatformBrowser(this.platformId);
    }

    get db(): GymAppLocalDb | null {
        if (this.isBrowser && !this._db) {
            this._db = new GymAppLocalDb();
        }
        return this._db;
    }

    get members(): Table<Member, string> | null {
        return this.db ? this.db.members : null;
    }

    get products(): Table<Product, string> | null {
        return this.db ? this.db.products : null;
    }

    get outboxQueue(): Table<OutboxItem, number> | null {
        return this.db ? this.db.outboxQueue : null;
    }
}

