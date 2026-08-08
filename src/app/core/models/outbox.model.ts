export interface OutboxItem {
    id?: number;               // Dexie auto-increment primary key
    clientTxId: string;        // UUID for idempotency
    type: 'POS_SALE' | 'CHECKIN' | 'MEMBER_UPDATE' | 'WORKOUT_LOG' | 'CUSTOM_MUTATION';
    payload: any;              // Function parameters
    status: 'PENDING' | 'PROCESSING' | 'FAILED';
    retryCount: number;
    lastError?: string;
    createdAt: number;         // Epoch timestamp
}
