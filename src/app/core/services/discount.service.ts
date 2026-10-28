import { Injectable, inject, signal } from '@angular/core';
import {
    Firestore,
    collection,
    collectionData,
    query,
    where,
    Timestamp,
    doc,
    addDoc,
    updateDoc,
    deleteDoc
} from '@angular/fire/firestore';
import { Observable, shareReplay } from 'rxjs';
import { DiscountRule } from '../models/discount.model';
import { CartItem } from '../models/store.model';
import { createConverter } from '../utils/firestore-converter.utils';

export interface PromoVoucherConfig {
    code: string;
    name: string;
    expirationDate: Date;
    priceLocks: Record<string, number>;
}

export const EPIC1000_VOUCHER: PromoVoucherConfig = {
    code: 'EPIC1000',
    name: 'EPIC 1000 Promo Voucher',
    expirationDate: new Date('2026-12-31T23:59:59.999Z'),
    priceLocks: {
        'Qfi33eVnbxN6kIPRTGbT': 1000,
        'TKNm92Ekg87gub4eHCHO': 2000,
        'GxNrhJR5CVSpnQuy4PwN': 8000,
        'kA3g2qW4jS1u235leAjK': 4000
    }
};

export interface VoucherValidationResult {
    valid: boolean;
    error?: string;
    config?: PromoVoucherConfig;
}

export interface EvaluatedVoucherCart {
    items: CartItem[];
    totalVoucherDiscount: number;
    appliedProductId: string | null;
}

export interface DiscountResult {
    discountAmount: number;
    newPrice: number;
    ruleId: string;
    ruleName: string;
    priority?: number;
}

@Injectable({
    providedIn: 'root',
})
export class DiscountService {
    private firestore = inject(Firestore);
    private discountsCollection = collection(this.firestore, 'discounts').withConverter(
        createConverter<DiscountRule>()
    );

    // Dynamic cache of active discount rules
    private readonly activeRules$ = (() => {
        const q = query(
            this.discountsCollection,
            where('active', '==', true)
        );
        return collectionData(q).pipe(shareReplay({ bufferSize: 1, refCount: false }));
    })();

    activeRules = signal<DiscountRule[]>([]);

    constructor() {
        this.activeRules$.subscribe({
            next: (rules) => {
                // Filter out archived and expired rules in memory
                const now = new Date();
                const filtered = rules.filter(r => {
                    if (r.archived) return false;
                    
                    try {
                        // Check startDate
                        if (r.startDate) {
                            const start = r.startDate instanceof Timestamp ? r.startDate.toDate() : new Date(r.startDate);
                            if (isNaN(start.getTime())) {
                                console.warn(`Invalid startDate format on discount rule: ${r.name || r.id}. Rule skipped.`);
                                return false;
                            }
                            if (now < start) return false;
                        }
                        
                        // Check endDate
                        if (r.endDate) {
                            const end = r.endDate instanceof Timestamp ? r.endDate.toDate() : new Date(r.endDate);
                            if (isNaN(end.getTime())) {
                                console.warn(`Invalid endDate format on discount rule: ${r.name || r.id}. Rule skipped.`);
                                return false;
                            }
                            if (now > end) return false;
                        }
                    } catch (dateErr) {
                        console.warn(`Error parsing date constraints on discount rule: ${r.name || r.id}. Rule skipped.`, dateErr);
                        return false;
                    }
                    
                    return true;
                });
                this.activeRules.set(filtered);
            },
            error: (err) => {
                console.error('Failed to stream active discount rules. Defaulting to empty list.', err);
                this.activeRules.set([]);
            }
        });
    }

    /**
     * Evaluates all active rules and returns the best discount result for the given item.
     * Defensive Design: Fully wrapped in try-catch to guarantee it never crashes the checkout.
     */
    evaluateItemDiscount(
        item: { productId: string; productName: string; originalPrice: number; quantity: number },
        productCategory: string,
        memberTags: string[] = []
    ): DiscountResult | null {
        try {
            const rules = this.activeRules();
            if (rules.length === 0) return null;

            const cleanTags = Array.isArray(memberTags) ? memberTags : [];
            const tagsSet = new Set(cleanTags.map(t => t.toUpperCase()));
            let bestResult: DiscountResult | null = null;

            // Sort active rules by priority descending (Finding 2.B)
            const sortedRules = [...rules].sort((a, b) => {
                const pA = a.priority ?? 0;
                const pB = b.priority ?? 0;
                return pB - pA;
            });

            for (const rule of sortedRules) {
                // 1. Eligibility: Trigger type & Member tag check
                if (rule.triggerType === 'TAG_BASED') {
                    if (!rule.targetTags || rule.targetTags.length === 0) continue;
                    const matchesTag = rule.targetTags.some(tag => tagsSet.has(tag.toUpperCase()));
                    if (!matchesTag) continue;
                }

                // 2. Scope check
                let matchesScope = false;
                if (rule.scope === 'ALL_PRODUCTS') {
                    matchesScope = true;
                } else if (rule.scope === 'CATEGORY') {
                    if (rule.applicableCategories && rule.applicableCategories.includes(productCategory)) {
                        matchesScope = true;
                    }
                } else if (rule.scope === 'SPECIFIC_PRODUCTS') {
                    if (rule.applicableProductIds && rule.applicableProductIds.includes(item.productId)) {
                        matchesScope = true;
                    }
                }

                if (!matchesScope) continue;

                // 3. Quantity check & tier identification
                let activeCalcType = rule.calculationType;
                let activeValue = rule.discountValue;
                const activePriceLocks = rule.priceLocks;

                if (rule.minimumQuantity !== undefined) {
                    if (item.quantity < rule.minimumQuantity) continue;
                }

                if (rule.quantityTiers && rule.quantityTiers.length > 0) {
                    // Find the best quantity tier (highest minQuantity satisfied)
                    const matchingTiers = rule.quantityTiers
                        .filter(tier => item.quantity >= tier.minQuantity)
                        .sort((a, b) => b.minQuantity - a.minQuantity);

                    if (matchingTiers.length > 0) {
                        activeCalcType = matchingTiers[0].calculationType;
                        activeValue = matchingTiers[0].discountValue;
                    } else if (rule.minimumQuantity === undefined) {
                        // If quantityTiers are specified but user didn't hit any tier, bypass this rule
                        continue;
                    }
                }

                // 4. Calculate discount details
                let newPrice = item.originalPrice;
                let discountAmtPerUnit = 0;

                if (activeCalcType === 'PRICE_LOCK') {
                    if (activePriceLocks && activePriceLocks[item.productId] !== undefined) {
                        const lockedPrice = activePriceLocks[item.productId];
                        if (lockedPrice < item.originalPrice) {
                            newPrice = lockedPrice;
                            discountAmtPerUnit = item.originalPrice - lockedPrice;
                        }
                    }
                } else if (activeCalcType === 'PERCENTAGE' && activeValue !== undefined) {
                    discountAmtPerUnit = item.originalPrice * (activeValue / 100);
                    newPrice = item.originalPrice - discountAmtPerUnit;
                } else if (activeCalcType === 'FLAT_RATE' && activeValue !== undefined) {
                    discountAmtPerUnit = activeValue;
                    newPrice = Math.max(0, item.originalPrice - discountAmtPerUnit);
                }

                // Round values to 2 decimal places to prevent float-point inaccuracies (Finding 2)
                discountAmtPerUnit = Math.round(discountAmtPerUnit * 100) / 100;
                newPrice = Math.round((item.originalPrice - discountAmtPerUnit) * 100) / 100;
                const totalDiscount = Math.round((discountAmtPerUnit * item.quantity) * 100) / 100;

                if (totalDiscount > 0) {
                    const currentPriority = rule.priority ?? 0;
                    const bestPriority: number = bestResult?.priority ?? 0;

                    if (
                        !bestResult ||
                        currentPriority > bestPriority ||
                        (currentPriority === bestPriority && totalDiscount > bestResult.discountAmount)
                    ) {
                        bestResult = {
                            discountAmount: totalDiscount,
                            newPrice: newPrice,
                            ruleId: rule.id || 'unknown_id',
                            ruleName: rule.name,
                            priority: currentPriority
                        };
                    }
                }
            }

            return bestResult;
        } catch (error) {
            console.error('Error during discount calculation. Bypassing safely.', error);
            return null;
        }
    }

    /**
     * Validates a voucher code against member eligibility, expiration, and configuration.
     */
    validatePromoVoucher(
        code: string,
        member: { id?: string | null; name?: string; claimedVouchers?: string[] } | null
    ): VoucherValidationResult {
        const cleanCode = (code || '').trim().toUpperCase();
        if (!cleanCode) {
            return { valid: false, error: 'Please enter a voucher code.' };
        }

        if (cleanCode !== EPIC1000_VOUCHER.code) {
            return { valid: false, error: 'Invalid or unknown voucher code.' };
        }

        const now = new Date();
        if (now > EPIC1000_VOUCHER.expirationDate) {
            return { valid: false, error: 'This voucher code expired on December 31, 2026.' };
        }

        if (member) {
            const claimed = (member.claimedVouchers || []).map(v => v.toUpperCase());
            if (claimed.includes(cleanCode)) {
                return { valid: false, error: 'Voucher ' + cleanCode + ' has already been claimed by ' + (member.name || 'this member') + '.' };
            }
        }

        return { valid: true, config: EPIC1000_VOUCHER };
    }

    /**
     * Evaluates cart items for promo voucher application.
     * Guarantees that only ONE single unit of the highest-discount product receives the promo price lock.
     */
    evaluateVoucherForCart(items: CartItem[], voucherCode: string | null): EvaluatedVoucherCart {
        if (!voucherCode || voucherCode.trim().toUpperCase() !== EPIC1000_VOUCHER.code || items.length === 0) {
            const cleanItems = items.map(item => {
                if (item.appliedVoucherCode || item.voucherDiscount) {
                    const copy = { ...item };
                    delete copy.appliedVoucherCode;
                    delete copy.voucherDiscount;
                    copy.subtotal = copy.quantity * copy.price;
                    return copy;
                }
                return item;
            });
            return { items: cleanItems, totalVoucherDiscount: 0, appliedProductId: null };
        }

        const config = EPIC1000_VOUCHER;
        let bestProductId: string | null = null;
        let maxSavingPerUnit = 0;

        for (const item of items) {
            const lockedPrice = config.priceLocks[item.productId];
            if (lockedPrice !== undefined) {
                const baseUnit = item.originalPrice || item.price;
                const potentialSaving = Math.max(0, baseUnit - lockedPrice);
                if (potentialSaving > maxSavingPerUnit) {
                    maxSavingPerUnit = potentialSaving;
                    bestProductId = item.productId;
                }
            }
        }

        if (!bestProductId || maxSavingPerUnit <= 0) {
            const cleanItems = items.map(item => {
                const copy = { ...item };
                delete copy.appliedVoucherCode;
                delete copy.voucherDiscount;
                copy.subtotal = copy.quantity * copy.price;
                return copy;
            });
            return { items: cleanItems, totalVoucherDiscount: 0, appliedProductId: null };
        }

        const updatedItems = items.map(item => {
            const copy = { ...item };
            if (item.productId === bestProductId) {
                copy.appliedVoucherCode = config.code;
                copy.voucherDiscount = maxSavingPerUnit;
                copy.subtotal = Math.max(0, (item.quantity * item.price) - maxSavingPerUnit);
            } else {
                delete copy.appliedVoucherCode;
                delete copy.voucherDiscount;
                copy.subtotal = item.quantity * item.price;
            }
            return copy;
        });

        return {
            items: updatedItems,
            totalVoucherDiscount: maxSavingPerUnit,
            appliedProductId: bestProductId
        };
    }

    getDiscounts(): Observable<DiscountRule[]> {
        return collectionData(this.discountsCollection, { idField: 'id' });
    }

    addDiscountRule(rule: Omit<DiscountRule, 'id'>): Promise<any> {
        return addDoc(this.discountsCollection, rule);
    }

    updateDiscountRule(id: string, data: Partial<DiscountRule>): Promise<void> {
        const docRef = doc(this.firestore, 'discounts', id).withConverter(
            createConverter<DiscountRule>()
        );
        return updateDoc(docRef, data);
    }

    deleteDiscountRule(id: string): Promise<void> {
        const docRef = doc(this.firestore, 'discounts', id);
        return deleteDoc(docRef);
    }
}
