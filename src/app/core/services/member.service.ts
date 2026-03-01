import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Firestore, collection, collectionData, addDoc, doc, updateDoc, query, orderBy, docData, limit, startAfter, getDocs, getDoc, writeBatch, where } from '@angular/fire/firestore';
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

    // Exemption: No limit applied to ensure all members are streamed and updated in real-time.
    getMembers(): Observable<Member[]> {
        const q = query(this.membersCollection, orderBy('name'));
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

    async renewMembership(id: string): Promise<void> {
        // Fetch current member data to check existing expiration
        const docRef = doc(this.firestore, 'members', id);
        const snapshot = await getDoc(docRef);

        if (!snapshot.exists()) {
            throw new Error('Member not found');
        }

        const memberData = snapshot.data() as Member;
        const now = new Date();
        let baseDate = now;

        // Check if current expiration is valid and in the future
        if (memberData.membershipExpiration) {
            const currentExpiry = memberData.membershipExpiration instanceof Date
                ? memberData.membershipExpiration
                : (memberData.membershipExpiration as any).toDate();

            if (currentExpiry > now) {
                baseDate = currentExpiry;
            }
        }

        // Calculate new expiration: Base Date + 30 days
        const newExpiration = new Date(baseDate);
        newExpiration.setDate(newExpiration.getDate() + 30);

        return this.updateMember(id, {
            membershipStatus: 'Active',
            membershipExpiration: newExpiration
        });
    }

    async renewTraining(id: string): Promise<void> {
        const docRef = doc(this.firestore, 'members', id);
        const snapshot = await getDoc(docRef);

        if (!snapshot.exists()) {
            throw new Error('Member not found');
        }

        const memberData = snapshot.data() as Member;
        const now = new Date();
        let baseDate = now;

        if (memberData.trainingExpiration) {
            const currentExpiry = memberData.trainingExpiration instanceof Date
                ? memberData.trainingExpiration
                : (memberData.trainingExpiration as any).toDate();

            if (currentExpiry > now) {
                baseDate = currentExpiry;
            }
        }

        const newExpiration = new Date(baseDate);
        newExpiration.setDate(newExpiration.getDate() + 30);

        return this.updateMember(id, {
            trainingExpiration: newExpiration
        });
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
        if (!member.membershipExpiration) return false;
        // Handle Firestore Timestamp or Date object
        const expiry = member.membershipExpiration instanceof Date
            ? member.membershipExpiration
            : (member.membershipExpiration as any).toDate();

        return expiry < new Date();
    }

    // ==========================================
    // Duplicate Resolution Features
    // ==========================================

    async findPotentialDuplicates(): Promise<Member[][]> {
        // 1. Fetch all members (Heavy operation, but necessary for dedupe)
        // If dataset is huge, this might need cloud function, but for < 10k members client side is fine.
        const q = query(this.membersCollection, orderBy('name'));
        const snapshot = await getDocs(q);
        const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));

        const groups: Member[][] = [];
        const processed = new Set<string>();

        // 2. Approach: Strict Key Grouping -> Fuzzy Name Check
        // Key: Gender + Birthday (YYYY-MM-DD)
        // User said: "birthday is certainly not changing and gender..."

        const bucketMap = new Map<string, Member[]>();

        for (const m of members) {
            const dateStr = this.normalizeDate(m.birthday);
            if (!dateStr || !m.gender) continue; // Skip if missing critical data

            const key = `${m.gender}-${dateStr}`;
            if (!bucketMap.has(key)) {
                bucketMap.set(key, []);
            }
            bucketMap.get(key)!.push(m);
        }

        // 3. Analyze buckets for Name Similarity
        for (const bucket of bucketMap.values()) {
            if (bucket.length < 2) continue;

            // Pairwise comparison within bucket
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

        // 1. Move Attendance Records
        const attendanceRef = collection(this.firestore, 'attendance');
        const attQ = query(attendanceRef, where('memberId', '==', secondaryId));
        const attSnap = await getDocs(attQ);

        attSnap.forEach(docSnap => {
            batch.update(docSnap.ref, { memberId: primaryId });
        });

        // 2. Move Transactions
        const transactionsRef = collection(this.firestore, 'transactions');
        const transQ = query(transactionsRef, where('memberId', '==', secondaryId));
        const transSnap = await getDocs(transQ);

        transSnap.forEach(docSnap => {
            batch.update(docSnap.ref, { memberId: primaryId });
        });

        // 3. Delete Secondary Member
        const secondaryRef = doc(this.firestore, 'members', secondaryId);
        batch.delete(secondaryRef);

        await batch.commit();
    }

    private normalizeDate(date: any): string | null {
        if (!date) return null;
        try {
            const d = date instanceof Date ? date : date.toDate();
            // Create UTC string or normalized local YYYY-MM-DD
            return d.toISOString().split('T')[0];
        } catch (e) {
            return null;
        }
    }

    private isSimilarName(n1: string, n2: string): boolean {
        const s1 = n1.toLowerCase().trim();
        const s2 = n2.toLowerCase().trim();

        if (s1 === s2) return true;

        // Check for containment (Nicknames logic: "Jireh" in "Jireh Padua")
        if (s1.length > 3 && s2.includes(s1)) return true;
        if (s2.length > 3 && s1.includes(s2)) return true;

        // Levenshtein Distance for typos
        const dist = this.levenshtein(s1, s2);
        const maxLen = Math.max(s1.length, s2.length);

        // Allow distance of 3 or 20% difference
        return dist <= 3 || (dist / maxLen) < 0.2;
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
                        matrix[i - 1][j - 1] + 1, // substitution
                        Math.min(
                            matrix[i][j - 1] + 1, // insertion
                            matrix[i - 1][j] + 1 // deletion
                        )
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }
}
