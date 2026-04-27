import {
    FirestoreDataConverter,
    QueryDocumentSnapshot,
    DocumentData,
    Timestamp,
} from '@angular/fire/firestore';

/**
 * Audit trace structure used across the application.
 * Standardizes the 'lastModifiedBy' and 'createdBy' patterns.
 */
export interface AuditTrace {
    uid: string;
    name: string | null;
    timestamp: Date;
}

/**
 * Base utility to ensure all models have an optional id.
 */
export interface BaseModel {
    id?: string;
}

/**
 * Utility to convert Firestore Timestamps to JS Dates recursively.
 * This ensures that by the time data reaches a service, it's always working with standard JS Dates.
 */
export function convertTimestamps(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    if (obj instanceof Timestamp) {
        return obj.toDate();
    }

    if (Array.isArray(obj)) {
        return obj.map(convertTimestamps);
    }

    const newObj: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            newObj[key] = convertTimestamps(obj[key]);
        }
    }
    return newObj;
}

/**
 * Factory to create a standard Firestore converter for any model.
 * - Handles the 'id' field integration.
 * - Handles recursive Timestamp -> Date conversion for all read operations.
 * - Strips 'id' on write operations.
 */
export function createConverter<T extends BaseModel>(): FirestoreDataConverter<T> {
    return {
        toFirestore(item: T): DocumentData {
            const { id, ...data } = item as any;
            return data;
        },
        fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>): T {
            const data = snapshot.data();
            return {
                ...convertTimestamps(data),
                id: snapshot.id,
            } as T;
        },
    };
}
