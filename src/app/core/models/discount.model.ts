export interface QuantityTier {
    minQuantity: number;
    calculationType: 'PERCENTAGE' | 'FLAT_RATE' | 'PRICE_LOCK';
    discountValue: number;
}

export interface DiscountRule {
    id?: string;
    name: string;
    description?: string;
    active: boolean;
    archived?: boolean;
    triggerType: 'TAG_BASED' | 'PROMO_CODE' | 'AUTOMATIC';
    targetTags?: string[];
    promoCode?: string;
    scope: 'ALL_PRODUCTS' | 'CATEGORY' | 'SPECIFIC_PRODUCTS';
    applicableCategories?: string[];
    applicableProductIds?: string[];
    calculationType?: 'PERCENTAGE' | 'FLAT_RATE' | 'PRICE_LOCK';
    discountValue?: number;
    priceLocks?: Record<string, number>;
    minimumQuantity?: number;
    quantityTiers?: QuantityTier[];
    startDate?: any; // Firestore Timestamp or Date
    endDate?: any;   // Firestore Timestamp or Date
    priority?: number;
}
