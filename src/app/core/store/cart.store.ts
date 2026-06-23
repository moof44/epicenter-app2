import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { CartItem, Product } from '../models/store.model';
import { DiscountService } from '../services/discount.service';

interface CartState {
    items: CartItem[];
    memberTags: string[];
}

const initialState: CartState = {
    items: [],
    memberTags: [],
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
        return {
            ...item,
            price: item.originalPrice,
            discountAmount: 0,
            appliedDiscountId: undefined,
            appliedDiscountName: undefined,
            isPriceOverridden: false,
            overrideReason: undefined,
            subtotal: item.quantity * item.originalPrice
        };
    }
}

export const CartStore = signalStore(
    { providedIn: 'root' },
    withState(initialState),
    withComputed(({ items }) => ({
        total: computed(() => items().reduce((sum, item) => sum + item.subtotal, 0)),
        itemCount: computed(() => items().reduce((sum, item) => sum + item.quantity, 0)),
        isEmpty: computed(() => items().length === 0),
    })),
    withMethods((store, discountService = inject(DiscountService)) => ({
        addItem(product: Product, quantity = 1): void {
            if (!product.id || product.stock < quantity) return;

            const current = store.items();
            const existingIndex = current.findIndex((item) => item.productId === product.id);

            let updatedItem: CartItem;
            if (existingIndex >= 0) {
                const existing = current[existingIndex];
                const newQty = existing.quantity + quantity;
                const tempItem = {
                    ...existing,
                    quantity: newQty,
                    subtotal: newQty * existing.price
                };

                if (existing.isPriceOverridden && !existing.appliedDiscountId) {
                    updatedItem = {
                        ...tempItem,
                        subtotal: newQty * existing.price
                    };
                } else {
                    updatedItem = recalculateItemDiscount(tempItem, store.memberTags(), discountService);
                }

                const updated = [...current];
                updated[existingIndex] = updatedItem;
                patchState(store, { items: updated });
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

                const finalItem = recalculateItemDiscount(newItem, store.memberTags(), discountService);
                patchState(store, {
                    items: [...current, finalItem],
                });
            }
        },

        updateQuantity(productId: string, quantity: number): void {
            if (quantity <= 0) {
                patchState(store, { items: store.items().filter((item) => item.productId !== productId) });
                return;
            }
            const updated = store.items().map((item) => {
                if (item.productId === productId) {
                    const tempItem = {
                        ...item,
                        quantity,
                        subtotal: quantity * item.price
                    };

                    if (item.isPriceOverridden && !item.appliedDiscountId) {
                        return {
                            ...tempItem,
                            subtotal: quantity * item.price
                        };
                    } else {
                        return recalculateItemDiscount(tempItem, store.memberTags(), discountService);
                    }
                }
                return item;
            });
            patchState(store, { items: updated });
        },

        updatePrice(productId: string, newPrice: number, reason: string): void {
            const updated = store.items().map((item) => {
                if (item.productId === productId) {
                    return {
                        ...item,
                        price: newPrice,
                        isPriceOverridden: newPrice !== item.originalPrice,
                        overrideReason: reason,
                        discountAmount: 0,
                        appliedDiscountId: undefined,
                        appliedDiscountName: undefined,
                        subtotal: item.quantity * newPrice,
                    };
                }
                return item;
            });
            patchState(store, { items: updated });
        },

        setMemberTags(tags: string[]): void {
            patchState(store, { memberTags: tags });
            const current = store.items();
            const updated = current.map((item) => {
                if (item.isPriceOverridden && !item.appliedDiscountId) {
                    return item;
                }
                return recalculateItemDiscount(item, tags, discountService);
            });
            patchState(store, { items: updated });
        },

        removeItem(productId: string): void {
            patchState(store, { items: store.items().filter((item) => item.productId !== productId) });
        },

        clear(): void {
            patchState(store, { items: [], memberTags: [] });
        },
    }))
);
