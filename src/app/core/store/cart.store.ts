import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { CartItem, Product } from '../models/store.model';
import { DiscountService } from '../services/discount.service';

interface CartState {
    items: CartItem[];
    memberTags: string[];
    activeVoucherCode: string | null;
}

const initialState: CartState = {
    items: [],
    memberTags: [],
    activeVoucherCode: null,
};

function recalculateItemDiscount(
    item: CartItem,
    tags: string[],
    discountService: DiscountService
): CartItem {
    const result = discountService.evaluateItemDiscount(
        {
            productId: item.productId,
            productName: item.productName,
            originalPrice: item.originalPrice,
            quantity: item.quantity
        },
        item.productCategory || '',
        tags
    );

    if (result) {
        return {
            ...item,
            price: result.newPrice,
            discountAmount: result.discountAmount,
            appliedDiscountId: result.ruleId,
            appliedDiscountName: result.ruleName,
            isPriceOverridden: true,
            overrideReason: `Promo: ${result.ruleName}`,
            subtotal: item.quantity * result.newPrice
        };
    } else {
        const cleanItem = {
            ...item,
            price: item.originalPrice,
            discountAmount: 0,
            isPriceOverridden: false,
            subtotal: item.quantity * item.originalPrice
        };
        delete cleanItem.appliedDiscountId;
        delete cleanItem.appliedDiscountName;
        delete cleanItem.overrideReason;
        return cleanItem;
    }
}

function recomputeCartItems(
    rawItems: CartItem[],
    tags: string[],
    voucherCode: string | null,
    discountService: DiscountService
): CartItem[] {
    // 1. Recalculate standard tier/tag-based discounts
    const tagDiscounted = rawItems.map(item => {
        if (item.isPriceOverridden && !item.appliedDiscountId) {
            return item;
        }
        return recalculateItemDiscount(item, tags, discountService);
    });

    // 2. Evaluate promo voucher (single item, highest saving)
    const voucherResult = discountService.evaluateVoucherForCart(tagDiscounted, voucherCode);
    return voucherResult.items;
}

export const CartStore = signalStore(
    { providedIn: 'root' },
    withState(initialState),
    withComputed(({ items, activeVoucherCode }) => ({
        total: computed(() => items().reduce((sum, item) => sum + item.subtotal, 0)),
        itemCount: computed(() => items().reduce((sum, item) => sum + item.quantity, 0)),
        isEmpty: computed(() => items().length === 0),
        totalVoucherDiscount: computed(() => items().reduce((sum, item) => sum + (item.voucherDiscount || 0), 0)),
        hasActiveVoucher: computed(() => !!activeVoucherCode()),
    })),
    withMethods((store, discountService = inject(DiscountService)) => ({
        addItem(product: Product, quantity = 1): void {
            if (!product.id || product.stock < quantity) return;

            const current = store.items();
            const existingIndex = current.findIndex((item) => item.productId === product.id);

            let intermediateItems: CartItem[];
            if (existingIndex >= 0) {
                const existing = current[existingIndex];
                const newQty = existing.quantity + quantity;
                const tempItem: CartItem = {
                    ...existing,
                    quantity: newQty,
                    subtotal: newQty * existing.price
                };

                const updated = [...current];
                updated[existingIndex] = tempItem;
                intermediateItems = updated;
            } else {
                const newItem: CartItem = {
                    productId: product.id,
                    productName: product.name,
                    price: product.price,
                    originalPrice: product.price,
                    isPriceOverridden: false,
                    quantity,
                    productCategory: product.category,
                    subtotal: quantity * product.price,
                };
                intermediateItems = [...current, newItem];
            }

            const finalItems = recomputeCartItems(
                intermediateItems,
                store.memberTags(),
                store.activeVoucherCode(),
                discountService
            );
            patchState(store, { items: finalItems });
        },

        updateQuantity(productId: string, quantity: number): void {
            if (quantity <= 0) {
                const filtered = store.items().filter((item) => item.productId !== productId);
                const finalItems = recomputeCartItems(
                    filtered,
                    store.memberTags(),
                    store.activeVoucherCode(),
                    discountService
                );
                patchState(store, { items: finalItems });
                return;
            }

            const intermediateItems = store.items().map((item) => {
                if (item.productId === productId) {
                    return {
                        ...item,
                        quantity,
                        subtotal: quantity * item.price
                    };
                }
                return item;
            });

            const finalItems = recomputeCartItems(
                intermediateItems,
                store.memberTags(),
                store.activeVoucherCode(),
                discountService
            );
            patchState(store, { items: finalItems });
        },

        updatePrice(productId: string, newPrice: number, reason: string): void {
            const intermediateItems = store.items().map((item) => {
                if (item.productId === productId) {
                    const cleanItem: CartItem = {
                        ...item,
                        price: newPrice,
                        isPriceOverridden: newPrice !== item.originalPrice,
                        discountAmount: 0,
                        subtotal: item.quantity * newPrice,
                    };
                    if (reason) {
                        cleanItem.overrideReason = reason;
                    } else {
                        delete cleanItem.overrideReason;
                    }
                    delete cleanItem.appliedDiscountId;
                    delete cleanItem.appliedDiscountName;
                    delete cleanItem.appliedVoucherCode;
                    delete cleanItem.voucherDiscount;
                    return cleanItem;
                }
                return item;
            });

            const finalItems = recomputeCartItems(
                intermediateItems,
                store.memberTags(),
                store.activeVoucherCode(),
                discountService
            );
            patchState(store, { items: finalItems });
        },

        setMemberTags(tags: string[]): void {
            patchState(store, { memberTags: tags });
            const finalItems = recomputeCartItems(
                store.items(),
                tags,
                store.activeVoucherCode(),
                discountService
            );
            patchState(store, { items: finalItems });
        },

        applyVoucher(code: string): void {
            const cleanCode = (code || '').trim().toUpperCase();
            patchState(store, { activeVoucherCode: cleanCode });
            const finalItems = recomputeCartItems(
                store.items(),
                store.memberTags(),
                cleanCode,
                discountService
            );
            patchState(store, { items: finalItems });
        },

        removeVoucher(): void {
            patchState(store, { activeVoucherCode: null });
            const finalItems = recomputeCartItems(
                store.items(),
                store.memberTags(),
                null,
                discountService
            );
            patchState(store, { items: finalItems });
        },

        removeItem(productId: string): void {
            const filtered = store.items().filter((item) => item.productId !== productId);
            const finalItems = recomputeCartItems(
                filtered,
                store.memberTags(),
                store.activeVoucherCode(),
                discountService
            );
            patchState(store, { items: finalItems });
        },

        clear(): void {
            patchState(store, { items: [], memberTags: [], activeVoucherCode: null });
        },
    }))
);
