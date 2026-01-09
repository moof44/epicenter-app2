import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Firestore, collection, collectionData, addDoc, doc, updateDoc, query, orderBy, docData, limit, startAfter, getDocs } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Member } from '../models/member.model';

@Injectable({
    providedIn: 'root'
})
export class MemberService {
    private firestore: Firestore = inject(Firestore);
    private authService = inject(AuthService);
    private membersCollection = collection(this.firestore, 'members');

    private get _currentUserSnapshot() {
        const user = this.authService.userProfile();
        // If system action or pre-auth, handle gracefully or throw.
        // For now, strict:
        if (!user) throw new Error('Action requires authentication');
        return {
            uid: user.uid,
            name: user.displayName,
            timestamp: new Date()
        };
    }

    getMembers(limitCount = 100): Observable<Member[]> {
        const q = query(this.membersCollection, orderBy('name'), limit(limitCount));
        return collectionData(q, { idField: 'id' }) as Observable<Member[]>;
    }

    async getMembersPage(limitCount = 50, lastDoc?: any): Promise<{ members: Member[], lastDoc: any | null }> {
        let q = query(this.membersCollection, orderBy('name'), limit(limitCount));

        if (lastDoc) {
            q = query(q, startAfter(lastDoc));
        }

        const snapshot = await getDocs(q);
        const members = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Member));
        const lastDocument = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

        return { members, lastDoc: lastDocument };
    }

    getMember(id: string): Observable<Member> {
        const docRef = doc(this.firestore, 'members', id);
        return docData(docRef, { idField: 'id' }) as Observable<Member>;
    }

    addMember(member: Member): Promise<any> {
        const trace = this._currentUserSnapshot;
        const memberWithTrace = {
            ...member,
            createdBy: trace,
            lastModifiedBy: trace
        };
        return addDoc(this.membersCollection, memberWithTrace);
    }

    updateMember(id: string, data: Partial<Member>): Promise<void> {
        const docRef = doc(this.firestore, 'members', id);
        const trace = this._currentUserSnapshot;
        return updateDoc(docRef, { ...data, lastModifiedBy: trace });
    }

    setInactive(id: string): Promise<void> {
        return this.updateMember(id, { membershipStatus: 'Inactive' });
    }

    isMembershipExpired(member: Member): boolean {
        if (!member.expiration) return false;
        // Handle Firestore Timestamp or Date object
        const expiry = member.expiration instanceof Date
            ? member.expiration
            : (member.expiration as any).toDate();

        return expiry < new Date();
    }
}
