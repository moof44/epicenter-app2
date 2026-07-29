import { AuditTrace } from '../utils/firestore-converter.utils';

export type ProductCategory = 'Training' | 'Supplements' | 'Drinks' | 'Boxing';
export type ProductType = 'RETAIL' | 'CONSUMABLE';
export type StockMovementReason = 'SALE' | 'INTERNAL_USE' | 'RESTOCK' | 'AUDIT_ADJUSTMENT';

export interface Product {
    id?: string;
    name: string;
    category: ProductCategory;
    description?: string;
    price: number;
    stock: number;
    imageUrl?: string;
    type: 'RETAIL' | 'CONSUMABLE';
    unit: string;
    minStockLevel: number;
    lastCostPrice?: number;
    averageCost?: number;
    lastModifiedBy?: AuditTrace;
}

export interface CartItem {
    productId: string;
    productName: string;
    price: number;
    originalPrice: number;
    isPriceOverridden: boolean;
    overrideReason?: string;
    quantity: number;
    subtotal: number;
    productCategory?: string;
    discountAmount?: number;
    appliedDiscountId?: string;
    appliedDiscountName?: string;
}

export interface Transaction {
    id?: string;
    date: Date;
    totalAmount: number;
    items: CartItem[];
    staffId?: string | null;
    staffName?: string | null;
    paymentMethod: 'CASH' | 'GCASH';
    referenceNumber?: string | null;
    amountTendered?: number | null;
    changeDue?: number | null;
    memberId?: string | null;
    memberName?: string;
    status?: 'COMPLETED' | 'VOID';
    voidedBy?: string;
    voidReason?: string;
    voidedAt?: Date;
}

export interface InventoryLog {
    id?: string;
    productId: string;
    productName: string;
    changeQuantity?: number;
    changeAmount?: number;
    currentStock?: number;
    previousStock?: number;
    newStock?: number;
    type: StockMovementReason | 'ADDITION' | 'REMOVAL' | string;
    reason?: StockMovementReason | string;
    performedBy?: string;
    staffId?: string | null;
    staffName?: string | null;
    notes?: string;
    timestamp: any;
}


export interface RedemptionClaim {
    id?: string;
    voucherCode: string;
    memberId: string;
    memberName: string;
    productId?: string;
    productName: string;
    coinsSpent: number;
    createdAt?: any;
    expiresAt?: any;
    fulfilledAt?: any;
    fulfilledByStaffId?: string;
    fulfilledByStaffName?: string;
    shiftId?: string | null;
    status: 'PENDING_CLAIM' | 'FULFILLED' | 'EXPIRED' | 'CANCELLED';
}

export interface StockMovement {
    id?: string;
    productId: string;
    changeAmount: number;
    reason: StockMovementReason;
    timestamp: Date;
    performedBy?: string;
    notes?: string;
}

export interface ProductSalesData {
    productId: string;
    productName: string;
    totalQuantitySold: number;
    totalRevenue: number;
}

export interface DailySales {
    date: Date;
    totalSales: number;
}
