export type PurchaseRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
export type PurchaseRequestPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type PurchaseRequestItemType = 'CATALOG_PRODUCT' | 'CUSTOM_SUPPLY';
export type OutgoingPaymentSource = 'CASH_DRAWER' | 'GCASH' | 'BANK_TRANSFER' | 'OWNER_PERSONAL';

export interface PurchaseRequestItem {
    productId?: string;
    name: string;
    category?: string;
    itemType: PurchaseRequestItemType;
    requestedQuantity: number;
    approvedQuantity?: number;
    receivedQuantity?: number;
    unit: string;
    estimatedUnitCost?: number;
    estimatedTotalCost?: number;
    actualUnitCost?: number;
    actualTotalCost?: number;
    currentStockSnapshot?: number;
}

export interface PurchaseRequest {
    id?: string;
    requestNumber: string; // e.g. PR-2026-0001
    title: string;
    status: PurchaseRequestStatus;
    priority: PurchaseRequestPriority;
    items: PurchaseRequestItem[];
    estimatedTotalAmount: number;
    actualTotalAmount?: number;
    requestedBy: {
        uid: string;
        displayName: string;
        role?: string;
    };
    requestedAt: any;
    notes?: string;
    urgencyReason?: string;

    // Reviewer info
    reviewedBy?: {
        uid: string;
        displayName: string;
    } | null;
    reviewedAt?: any;
    rejectionReason?: string;
    approvalNotes?: string;

    // Procurement & Payment tracking
    supplierName?: string;
    orderedAt?: any;
    paidVia?: OutgoingPaymentSource;
    paymentReference?: string;
    paidAt?: any;

    // Receiving & Restock info
    receivedAt?: any;
    receivedBy?: {
        uid: string;
        displayName: string;
    } | null;
    receivingNotes?: string;
    linkedPurchaseOrderId?: string;

    createdAt: any;
    updatedAt: any;
}
