import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { IncidentReport, IncidentCategory, IncidentSeverity, IncidentStatus } from '../models/incident.model';
import { toLocalDateStr } from '../utils/date.utils';

@Injectable({
  providedIn: 'root'
})
export class IncidentService {
  private firestore = inject(Firestore);
  private readonly incidentsCol = collection(this.firestore, 'incident_reports');

  private convertDates(docData: any, id: string): IncidentReport {
    return {
      ...docData,
      id,
      reportedAt: docData.reportedAt?.toDate ? docData.reportedAt.toDate() : (docData.reportedAt ? new Date(docData.reportedAt) : new Date()),
      resolvedAt: docData.resolvedAt?.toDate ? docData.resolvedAt.toDate() : (docData.resolvedAt ? new Date(docData.resolvedAt) : null),
      createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate() : (docData.createdAt ? new Date(docData.createdAt) : new Date()),
      updatedAt: docData.updatedAt?.toDate ? docData.updatedAt.toDate() : (docData.updatedAt ? new Date(docData.updatedAt) : new Date())
    };
  }

  /**
   * Get incidents within a date range (YYYY-MM-DD inclusive).
   * In-memory sorted to avoid composite index requirements.
   */
  getIncidentsByDateRange$(startDateStr: string, endDateStr: string): Observable<IncidentReport[]> {
    const q = query(
      this.incidentsCol,
      where('incidentDate', '>=', startDateStr),
      where('incidentDate', '<=', endDateStr)
    );

    return collectionData(q, { idField: 'id' }).pipe(
      map(items => {
        return (items as any[])
          .map(item => this.convertDates(item, item.id))
          .sort((a, b) => {
            const dateCmp = b.incidentDate.localeCompare(a.incidentDate);
            if (dateCmp !== 0) return dateCmp;
            const timeA = a.createdAt?.getTime ? a.createdAt.getTime() : 0;
            const timeB = b.createdAt?.getTime ? b.createdAt.getTime() : 0;
            return timeB - timeA;
          });
      })
    );
  }

  /**
   * Create a new Incident Report.
   */
  async createIncident(data: {
    title: string;
    category: IncidentCategory;
    severity: IncidentSeverity;
    incidentDate: string; // YYYY-MM-DD
    incidentTime?: string;
    location?: string;
    description: string;
    reportedByUid: string;
    reportedByName: string;
    involvedPersons?: string[];
  }): Promise<string> {
    const now = new Date();
    const yyyymm = toLocalDateStr(now).replace(/-/g, '').slice(0, 6);
    const randSuffix = Math.floor(100 + Math.random() * 900);
    const incidentNumber = `INC-${yyyymm}-${randSuffix}`;

    const docRef = await addDoc(this.incidentsCol, {
      incidentNumber,
      title: data.title.trim(),
      category: data.category,
      severity: data.severity,
      status: 'OPEN' as IncidentStatus,
      incidentDate: data.incidentDate,
      incidentTime: data.incidentTime || '',
      location: data.location?.trim() || '',
      description: data.description.trim(),
      reportedByUid: data.reportedByUid,
      reportedByName: data.reportedByName,
      reportedAt: serverTimestamp(),
      involvedPersons: data.involvedPersons || [],
      resolutionNotes: '',
      resolvedByUid: null,
      resolvedByName: null,
      resolvedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return docRef.id;
  }

  /**
   * Update an existing Incident Report (e.g. resolve, change status, add notes).
   */
  async updateIncident(id: string, updates: Partial<IncidentReport>): Promise<void> {
    const docRef = doc(this.firestore, 'incident_reports', id);
    const payload: any = {
      ...updates,
      updatedAt: serverTimestamp()
    };

    if (updates.status === 'RESOLVED' || updates.status === 'CLOSED') {
      if (!updates.resolvedAt) {
        payload.resolvedAt = serverTimestamp();
      }
    } else if (updates.status === 'OPEN' || updates.status === 'INVESTIGATING') {
      payload.resolvedAt = null;
      payload.resolvedByUid = null;
      payload.resolvedByName = null;
    }

    delete payload.id;
    await updateDoc(docRef, payload);
  }

  /**
   * Delete an Incident Report.
   */
  async deleteIncident(id: string): Promise<void> {
    const docRef = doc(this.firestore, 'incident_reports', id);
    await deleteDoc(docRef);
  }
}
