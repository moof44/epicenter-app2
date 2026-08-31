/** Converts a Date to a local YYYY-MM-DD string (timezone-safe). */
export function toLocalDateStr(date: Date): string {
    const d = safeToDate(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** Alias for toLocalDateStr. Defaults to current date if none provided. */
export const getLocalDateString = (date: Date = new Date()) => toLocalDateStr(date);

/**
 * Safely converts any date-like input (Date, Firestore Timestamp, ISO string, epoch milliseconds,
 * or plain {seconds, nanoseconds} / {_seconds, _nanoseconds} objects) to a valid JavaScript Date.
 * If the input is null, undefined, or invalid, returns a safe fallback Date.
 */
export function safeToDate(val: any, fallback: Date = new Date()): Date {
    if (!val) return fallback;
    if (val instanceof Date) {
        return isNaN(val.getTime()) ? fallback : val;
    }
    if (typeof val.toDate === 'function') {
        try {
            const d = val.toDate();
            return isNaN(d.getTime()) ? fallback : d;
        } catch {
            return fallback;
        }
    }
    if (typeof val.toMillis === 'function') {
        try {
            const d = new Date(val.toMillis());
            return isNaN(d.getTime()) ? fallback : d;
        } catch {
            return fallback;
        }
    }
    if (typeof val.seconds === 'number') {
        const d = new Date(val.seconds * 1000);
        return isNaN(d.getTime()) ? fallback : d;
    }
    if (typeof val._seconds === 'number') {
        const d = new Date(val._seconds * 1000);
        return isNaN(d.getTime()) ? fallback : d;
    }
    if (typeof val === 'number') {
        const d = new Date(val);
        return isNaN(d.getTime()) ? fallback : d;
    }
    if (typeof val === 'string') {
        const d = new Date(val);
        return isNaN(d.getTime()) ? fallback : d;
    }
    return fallback;
}
