export interface SystemErrorLog {
    id?: string;
    message: string;
    name?: string;
    stack?: string;
    componentStack?: string;
    url: string;
    timestamp: any; // Date or Firestore Timestamp
    user?: {
        uid: string;
        displayName: string;
        email?: string;
        roles?: string[];
    } | null;
    userAgent: string;
    severity: 'FATAL' | 'ERROR' | 'WARNING';
    status: 'UNRESOLVED' | 'RESOLVED';
    count: number;
    lastOccurredAt: any;
}
