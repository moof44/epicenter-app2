export interface StaffRecordEntry {
    value: number;
    date: any; // Firestore Timestamp or Date
}

export interface StaffRecords {
    highestDailySales: StaffRecordEntry | null;
    mostTransactionsInDay: StaffRecordEntry | null;
    highestSingleTransaction: (StaffRecordEntry & { transactionId?: string }) | null;
    mostCheckInsInDay: StaffRecordEntry | null;
    lastUpdated?: any;
}
