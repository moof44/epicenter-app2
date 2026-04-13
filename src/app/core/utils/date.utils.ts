/** Converts a Date to a local YYYY-MM-DD string (timezone-safe). */
export function toLocalDateStr(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** Alias for toLocalDateStr. Defaults to current date if none provided. */
export const getLocalDateString = (date: Date = new Date()) => toLocalDateStr(date);
