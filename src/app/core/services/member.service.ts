import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { MemberRepository } from '../repositories/member.repository';
import {
    Firestore,
    collection,
    collectionData,
    addDoc,
    doc,
    updateDoc,
    query,
    orderBy,
    docData,
    limit,
    startAfter,
    getDocs,
    getDoc,
    writeBatch,
    where,
    QueryDocumentSnapshot,
} from '@angular/fire/firestore';
import { Observable, shareReplay } from 'rxjs';
import { Member } from '../models/member.model';
import { createConverter } from '../utils/firestore-converter.utils';

@Injectable({
    providedIn: 'root',
})
export class MemberService {
    private firestore: Firestore = inject(Firestore);
    private authService = inject(AuthService);
    private memberRepository = inject(MemberRepository);
    private membersCollection = collection(this.firestore, 'members').withConverter(
        createConverter<Member>()
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

    getMembers(): Observable<Member[]> {
        return this.memberRepository.getMembersLive();
    }

    getMemberHealthSummary(): Observable<{
        activeCount: number;
        inactiveCount: number;
        expiringCount: number;
        expiringNames: string[];
        newThisMonth: number;
    }> {
        return this.memberRepository.getMemberHealthSummaryLive();
    }

    async getMembersPage(
        limitCount = 50,
        lastDoc?: QueryDocumentSnapshot<Member>
    ): Promise<{ members: Member[]; lastDoc: QueryDocumentSnapshot<Member> | null }> {
        let q = query(this.membersCollection, orderBy('name'), limit(limitCount));

        if (lastDoc) {
            q = query(q, startAfter(lastDoc));
        }

        const snapshot = await getDocs(q);
        const members = snapshot.docs.map((doc) => doc.data());
        const lastDocument =
            snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

        return { members, lastDoc: lastDocument };
    }

    getMember(id: string): Observable<Member | undefined> {
        const docRef = doc(this.firestore, 'members', id).withConverter(
            createConverter<Member>()
        );
        return docData(docRef);
    }

    async getMemberOnce(id: string): Promise<Member | undefined> {
        const docRef = doc(this.firestore, 'members', id).withConverter(
            createConverter<Member>()
        );
        const snapshot = await getDoc(docRef);
        return snapshot.data();
    }

    addMember(member: Member): Promise<any> {
        const trace = this._currentUserSnapshot;
        const memberWithTrace = {
            ...member,
            createdBy: trace,
            lastModifiedBy: trace,
        };
        return addDoc(this.membersCollection, memberWithTrace as Member);
    }

    async renewMembership(id: string): Promise<void> {
        const docRef = doc(this.firestore, 'members', id).withConverter(
            createConverter<Member>()
        );
        const snapshot = await getDoc(docRef);

        if (!snapshot.exists()) {
            throw new Error('Member not found');
        }

        const memberData = snapshot.data();
        const now = new Date();
        let baseDate = now;

        if (memberData.membershipExpiration && memberData.membershipExpiration > now) {
            baseDate = memberData.membershipExpiration;
        }

        const newExpiration = new Date(baseDate);
        newExpiration.setDate(newExpiration.getDate() + 30);

        return this.updateMember(id, {
            membershipStatus: 'Active',
            membershipExpiration: newExpiration,
        });
    }

    async renewTraining(id: string): Promise<void> {
        const docRef = doc(this.firestore, 'members', id).withConverter(
            createConverter<Member>()
        );
        const snapshot = await getDoc(docRef);

        if (!snapshot.exists()) {
            throw new Error('Member not found');
        }

        const memberData = snapshot.data();
        const now = new Date();
        let baseDate = now;

        if (memberData.trainingExpiration && memberData.trainingExpiration > now) {
            baseDate = memberData.trainingExpiration;
        }

        const newExpiration = new Date(baseDate);
        newExpiration.setDate(newExpiration.getDate() + 30);

        return this.updateMember(id, {
            trainingExpiration: newExpiration,
        });
    }

    updateMember(id: string, data: Partial<Member>): Promise<void> {
        const docRef = doc(this.firestore, 'members', id).withConverter(
            createConverter<Member>()
        );
        const trace = this._currentUserSnapshot;
        return updateDoc(docRef, { ...data, lastModifiedBy: trace });
    }

    setInactive(id: string): Promise<void> {
        return this.updateMember(id, { membershipStatus: 'Inactive' });
    }

    isMembershipExpired(member: Member): boolean {
        if (!member.membershipExpiration) return false;
        const exp = member.membershipExpiration as any;
        const expMs = exp.seconds
            ? exp.seconds * 1000
            : exp instanceof Date
              ? exp.getTime()
              : exp.toDate
                ? exp.toDate().getTime()
                : new Date(exp).getTime();
        return expMs > 0 && expMs < Date.now();
    }

    async findPotentialDuplicates(): Promise<Member[][]> {
        const q = query(this.membersCollection, orderBy('name'));
        const snapshot = await getDocs(q);
        const members = snapshot.docs.map((doc) => doc.data());

        const groups: Member[][] = [];
        const processed = new Set<string>();
        const bucketMap = new Map<string, Member[]>();

        for (const m of members) {
            const dateStr = this.normalizeDate(m.birthday);
            if (!dateStr || !m.gender) continue;

            const key = `${m.gender}-${dateStr}`;
            if (!bucketMap.has(key)) {
                bucketMap.set(key, []);
            }
            bucketMap.get(key)!.push(m);
        }

        for (const bucket of bucketMap.values()) {
            if (bucket.length < 2) continue;

            for (let i = 0; i < bucket.length; i++) {
                if (processed.has(bucket[i].id!)) continue;

                const similarGroup = [bucket[i]];

                for (let j = i + 1; j < bucket.length; j++) {
                    if (processed.has(bucket[j].id!)) continue;

                    if (this.isSimilarName(bucket[i].name, bucket[j].name)) {
                        similarGroup.push(bucket[j]);
                        processed.add(bucket[j].id!);
                    }
                }

                if (similarGroup.length > 1) {
                    groups.push(similarGroup);
                    processed.add(bucket[i].id!);
                }
            }
        }

        return groups;
    }

    async mergeMembers(primaryId: string, secondaryId: string): Promise<void> {
        const batch = writeBatch(this.firestore);

        const attendanceRef = collection(this.firestore, 'attendance');
        const attQ = query(attendanceRef, where('memberId', '==', secondaryId));
        const attSnap = await getDocs(attQ);

        attSnap.forEach((docSnap) => {
            batch.update(docSnap.ref, { memberId: primaryId });
        });

        const transactionsRef = collection(this.firestore, 'transactions');
        const transQ = query(transactionsRef, where('memberId', '==', secondaryId));
        const transSnap = await getDocs(transQ);

        transSnap.forEach((docSnap) => {
            batch.update(docSnap.ref, { memberId: primaryId });
        });

        const secondaryRef = doc(this.firestore, 'members', secondaryId);
        batch.delete(secondaryRef);

        await batch.commit();
    }

    private normalizeDate(date: any): string | null {
        if (!date) return null;
        try {
            const d = date instanceof Date ? date : date.toDate();
            return d.toISOString().split('T')[0];
        } catch (e) {
            return null;
        }
    }

    private isSimilarName(n1: string, n2: string): boolean {
        const s1 = n1.toLowerCase().trim();
        const s2 = n2.toLowerCase().trim();

        if (s1 === s2) return true;

        if (s1.length > 3 && s2.includes(s1)) return true;
        if (s2.length > 3 && s1.includes(s2)) return true;

        const dist = this.levenshtein(s1, s2);
        const maxLen = Math.max(s1.length, s2.length);

        return dist <= 3 || dist / maxLen < 0.2;
    }

    private levenshtein(a: string, b: string): number {
        const matrix = [];

        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) == a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }
}
