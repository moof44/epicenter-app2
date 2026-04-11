import { computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { CartItem, Product } from '../models/store.model';

interface CartState {
    items: CartItem[];
}

const initialState: CartState = {
    items: [],
};

export const CartStore = signalStore(
    { providedIn: 'root' },
    withState(initialState),
    withComputed(({ items }) => ({
        total: computed(() => items().reduce((sum, item) => sum + item.subtotal, 0)),
        itemCount: computed(() => items().reduce((sum, item) => sum + item.quantity, 0)),
        isEmpty: computed(() => items().length === 0),
    })),
    withMethods((store) => ({
        addItem(product: Product, quantity = 1): void {
            if (!product.id || product.stock < quantity) return;

            const current = store.items();
            const existingIndex = current.findIndex((item) => item.productId === product.id);

            if (existingIndex >= 0) {
                const updated = [...current];
                const newQty = updated[existingIndex].quantity + quantity;
                updated[existingIndex] = {
                    ...updated[existingIndex],
                    quantity: newQty,
                    subtotal: newQty * updated[existingIndex].price,
                };
                patchState(store, { items: updated });
            } else {
                patchState(store, {
                    items: [
                        ...current,
                        {
                            productId: product.id,
                            productName: product.name,
                            price: product.price,
                            originalPrice: product.price,
                            isPriceOverridden: false,
                            quantity,
                            subtotal: quantity * product.price,
                        },
                    ],
                });
            }
        },

        updateQuantity(productId: string, quantity: number): void {
            if (quantity <= 0) {
                patchState(store, { items: store.items().filter((item) => item.productId !== productId) });
                return;
            }
            const updated = store.items().map((item) =>
                item.productId === productId ? { ...item, quantity, subtotal: quantity * item.price } : item
            );
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
                        subtotal: item.quantity * newPrice,
                    };
                }
                return item;
            });
            patchState(store, { items: updated });
        },

        removeItem(productId: string): void {
            patchState(store, { items: store.items().filter((item) => item.productId !== productId) });
        },

        clear(): void {
            patchState(store, { items: [] });
        },
    }))
);
