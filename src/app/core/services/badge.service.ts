import { Injectable, inject } from '@angular/core';
import {
    Firestore,
    collection,
    collectionData,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    docData,
    getDocs
} from '@angular/fire/firestore';
import { Observable, shareReplay, from } from 'rxjs';
import { BadgeDefinition } from '../models/badge.model';
import { AuthService } from './auth.service';
import { createConverter } from '../utils/firestore-converter.utils';

@Injectable({
    providedIn: 'root',
})
export class BadgeService {
    private firestore = inject(Firestore);
    private authService = inject(AuthService);
    private badgesCollection = collection(this.firestore, 'badge_definitions').withConverter(
        createConverter<BadgeDefinition>()
    );

    private get _currentUserSnapshot() {
        const user = this.authService.userProfile();
        if (!user) throw new Error('Action requires authentication');
        return {
            uid: user.uid,
            name: user.displayName,
            timestamp: new Date(),
        };
    }

    // Cache the badge definitions list to ensure high efficiency and low billing
    private readonly badges$ = (() => {
        const q = query(this.badgesCollection, orderBy('name'));
        return collectionData(q).pipe(shareReplay({ bufferSize: 1, refCount: false }));
    })();

    getBadges(): Observable<BadgeDefinition[]> {
        return this.badges$;
    }

    async addBadgeDefinition(badge: BadgeDefinition): Promise<any> {
        const docRef = doc(this.firestore, 'badge_definitions', badge.id).withConverter(
            createConverter<BadgeDefinition>()
        );
        // Using setDoc to allow custom document ID (badge.id slug)
        const { setDoc } = await import('@angular/fire/firestore');
        return setDoc(docRef, badge);
    }

    updateBadgeDefinition(id: string, data: Partial<BadgeDefinition>): Promise<void> {
        const docRef = doc(this.firestore, 'badge_definitions', id).withConverter(
            createConverter<BadgeDefinition>()
        );
        return updateDoc(docRef, data);
    }

    deleteBadgeDefinition(id: string): Promise<void> {
        const docRef = doc(this.firestore, 'badge_definitions', id);
        return deleteDoc(docRef);
    }
}
