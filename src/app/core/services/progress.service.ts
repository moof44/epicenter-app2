import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, query, orderBy, limit, doc, updateDoc, getDoc, setDoc, writeBatch } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable } from 'rxjs';
import { Measurement, DeletedMeasurement } from '../models/measurement.model';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class ProgressService {
    private firestore: Firestore = inject(Firestore);
    private functions: Functions = inject(Functions);
    private authService = inject(AuthService);

    private get _currentUserSnapshot() {
        const user = this.authService.userProfile();
        if (!user) throw new Error('Action requires authentication');
        return {
            uid: user.uid,
            name: user.displayName,
            timestamp: new Date()
        };
    }

    /**
     * Upload a Starfit/InBody scan report image via Cloud Function (CORS-free and authenticated).
     */
    async uploadReportImage(memberId: string, file: File): Promise<{ downloadUrl: string; storagePath: string }> {
        // Read file as base64 data URL
        const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });

        const uploadFn = httpsCallable<
            { memberId: string; fileBase64: string; fileName: string; contentType: string },
            { success: boolean; downloadUrl: string; storagePath: string }
        >(this.functions, 'uploadMemberProgressScan');

        const result = await uploadFn({
            memberId,
            fileBase64: base64,
            fileName: file.name,
            contentType: file.type || 'image/jpeg'
        });

        return {
            downloadUrl: result.data.downloadUrl,
            storagePath: result.data.storagePath
        };
    }

    getTimeSeries(memberId: string): Observable<Measurement[]> {
        const colRef = collection(this.firestore, `members/${memberId}/measurements`);
        const q = query(colRef, orderBy('date', 'desc'), limit(50));
        return collectionData(q, { idField: 'id' }) as Observable<Measurement[]>;
    }

    async addEntry(memberId: string, data: Measurement): Promise<any> {
        const colRef = collection(this.firestore, `members/${memberId}/measurements`);
        const trace = this._currentUserSnapshot;
        const docRef = await addDoc(colRef, { ...data, createdBy: trace, lastModifiedBy: trace });

        // Optimistic sync for member pending scan flag
        const isImageUploaded = Boolean(data.reportImageUrl);
        const hasWeight = data.weight !== undefined && data.weight !== null && Number(data.weight) > 0;
        if (isImageUploaded && !hasWeight) {
            await setDoc(doc(this.firestore, 'members', memberId), {
                hasPendingProgressScan: true,
                pendingProgressDate: data.date
            }, { merge: true });
        }

        return docRef;
    }

    async updateEntry(memberId: string, docId: string, data: Partial<Measurement>): Promise<void> {
        const docRef = doc(this.firestore, `members/${memberId}/measurements`, docId);
        const trace = this._currentUserSnapshot;
        await updateDoc(docRef, { ...data, lastModifiedBy: trace });
    }

    async softDeleteEntry(memberId: string, docId: string): Promise<string> {
        const batch = writeBatch(this.firestore);

        // 1. Read the original document
        const originalRef = doc(this.firestore, `members/${memberId}/measurements`, docId);
        const snap = await getDoc(originalRef);
        if (!snap.exists()) throw new Error('Measurement not found');

        const originalData = snap.data() as Measurement;
        const trace = this._currentUserSnapshot;

        // 2. Write to deleted_measurements (root collection)
        const deletedRef = doc(collection(this.firestore, 'deleted_measurements'));
        batch.set(deletedRef, {
            ...originalData,
            deletedBy: trace,
            deletedFrom: `members/${memberId}/measurements`,
            originalMemberId: memberId,
            originalDocId: docId
        } as DeletedMeasurement);

        // 3. Delete from original location
        batch.delete(originalRef);

        // 4. Commit atomically
        await batch.commit();

        // Return the deleted doc ID for undo functionality
        return deletedRef.id;
    }

    async restoreEntry(deletedDocId: string): Promise<void> {
        const batch = writeBatch(this.firestore);

        // 1. Read from deleted_measurements
        const deletedRef = doc(this.firestore, 'deleted_measurements', deletedDocId);
        const snap = await getDoc(deletedRef);
        if (!snap.exists()) throw new Error('Deleted measurement not found');

        const data = snap.data() as DeletedMeasurement;
        const memberId = data.originalMemberId;
        const originalDocId = data.originalDocId;

        // 2. Restore to original location (exclude deletion metadata)
        const measurementData: Partial<DeletedMeasurement> = { ...data };
        delete measurementData.deletedBy;
        delete measurementData.deletedFrom;
        delete measurementData.originalMemberId;
        delete measurementData.originalDocId;
        const originalRef = doc(this.firestore, `members/${memberId}/measurements`, originalDocId);
        batch.set(originalRef, measurementData);

        // 3. Remove from deleted_measurements
        batch.delete(deletedRef);

        await batch.commit();
    }
}
