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
    getDocs,
    writeBatch,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { SystemErrorLog } from '../models/system-error.model';
import { createConverter } from '../utils/firestore-converter.utils';

@Injectable({
    providedIn: 'root',
})
export class ErrorLoggerService {
    private firestore = inject(Firestore);
    private errorsCollection = collection(this.firestore, 'system_errors').withConverter(
        createConverter<SystemErrorLog>()
    );

    private lastLoggedCache = new Map<string, { id: string; count: number; time: number }>();

    /**
     * Logs a system error to Firestore system_errors collection with debouncing/deduplication.
     */
    async logError(errorData: Omit<SystemErrorLog, 'id' | 'timestamp' | 'lastOccurredAt' | 'count' | 'status'> & { severity?: SystemErrorLog['severity'] }): Promise<void> {
        try {
            const now = new Date();
            const cacheKey = `${errorData.url}::${errorData.message.slice(0, 100)}`;
            const cached = this.lastLoggedCache.get(cacheKey);

            // Deduplicate if identical error on same URL occurred within 30 seconds
            if (cached && (Date.now() - cached.time) < 30000) {
                cached.count += 1;
                cached.time = Date.now();
                const docRef = doc(this.firestore, 'system_errors', cached.id);
                await updateDoc(docRef, {
                    count: cached.count,
                    lastOccurredAt: now,
                });
                return;
            }

            const record: SystemErrorLog = {
                ...errorData,
                severity: errorData.severity || 'ERROR',
                status: 'UNRESOLVED',
                count: 1,
                timestamp: now,
                lastOccurredAt: now,
            };

            const docRef = await addDoc(this.errorsCollection, record as SystemErrorLog);
            this.lastLoggedCache.set(cacheKey, { id: docRef.id, count: 1, time: Date.now() });
        } catch (err) {
            console.error('[ErrorLoggerService] Failed to record system error in Firestore:', err);
        }
    }

    /**
     * Returns real-time stream of error logs ordered by lastOccurredAt descending.
     */
    getErrorLogs(): Observable<SystemErrorLog[]> {
        const q = query(this.errorsCollection, orderBy('lastOccurredAt', 'desc'));
        return collectionData(q, { idField: 'id' });
    }

    /**
     * Marks an error log as RESOLVED.
     */
    async markAsResolved(id: string): Promise<void> {
        const docRef = doc(this.firestore, 'system_errors', id);
        await updateDoc(docRef, { status: 'RESOLVED' });
    }

    /**
     * Marks an error log as UNRESOLVED.
     */
    async markAsUnresolved(id: string): Promise<void> {
        const docRef = doc(this.firestore, 'system_errors', id);
        await updateDoc(docRef, { status: 'UNRESOLVED' });
    }

    /**
     * Deletes an individual error log.
     */
    async deleteLog(id: string): Promise<void> {
        const docRef = doc(this.firestore, 'system_errors', id);
        await deleteDoc(docRef);
    }

    /**
     * Deletes all logs in the system_errors collection.
     */
    async clearAllLogs(): Promise<void> {
        const snapshot = await getDocs(this.errorsCollection);
        const batch = writeBatch(this.firestore);
        snapshot.docs.forEach((docSnap) => {
            batch.delete(docSnap.ref);
        });
        await batch.commit();
        this.lastLoggedCache.clear();
    }

    /**
     * Formats an error log into a markdown prompt ready to copy and paste to the AI Coding Assistant.
     */
    formatForAi(log: SystemErrorLog): string {
        const timeStr = log.lastOccurredAt instanceof Date 
            ? log.lastOccurredAt.toLocaleString() 
            : (log.lastOccurredAt?.toDate ? log.lastOccurredAt.toDate().toLocaleString() : String(log.lastOccurredAt));

        const userStr = log.user 
            ? `${log.user.displayName} (${log.user.uid}) - Roles: [${log.user.roles?.join(', ') || 'N/A'}]` 
            : 'Unauthenticated / Guest';

        return `### 🚨 App Error Report for AI Assistant

**Error Message**: \`${log.message}\`  
**Error Name**: \`${log.name || 'Error'}\`  
**Page URL**: \`${log.url}\`  
**Severity**: \`${log.severity}\`  
**Occurrences**: \`${log.count}\`  
**Last Occurred**: \`${timeStr}\`  
**User Context**: \`${userStr}\`  
**Browser / User Agent**: \`${log.userAgent}\`  

#### Stack Trace:
\`\`\`text
${log.stack || 'No stack trace available'}
\`\`\`

---
*Please trace how this error occurred in the codebase and provide a fix.*`;
    }
}
