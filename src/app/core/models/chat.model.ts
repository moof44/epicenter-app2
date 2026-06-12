export interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: any; // Date or Firestore Timestamp
  type: 'user' | 'system';
  metadata?: {
    transactionType?: 'STORE_SALE' | 'STORE_SALE_VOIDED' | 'SHIFT_OPENED' | 'SHIFT_CLOSED' | 'CASH_EXPENSE' | 'CASH_FLOAT';
    referencedId?: string;
    amount?: number;
  };
}
