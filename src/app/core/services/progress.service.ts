import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, query, orderBy } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Measurement } from '../models/measurement.model';

@Injectable({
    providedIn: 'root'
})
export class ProgressService {
    private firestore: Firestore = inject(Firestore);

    getTimeSeries(memberId: string): Observable<Measurement[]> {
        const colRef = collection(this.firestore, `members/${memberId}/measurements`);
        const q = query(colRef, orderBy('date', 'desc'));
        return collectionData(q, { idField: 'id' }) as Observable<Measurement[]>;
    }

    addEntry(memberId: string, data: Measurement): Promise<any> {
        const colRef = collection(this.firestore, `members/${memberId}/measurements`);
        return addDoc(colRef, data);
    }
}
