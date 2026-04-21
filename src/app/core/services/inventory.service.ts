import { Injectable, inject } from '@angular/core';
import {
    Firestore,
    collection,
    doc,
    writeBatch,
    increment,
    query,
    where,
    documentId,
    getDocs,
    getDoc,
} from '@angular/fire/firestore';
import { Product, InventoryLog } from '../models/store.model';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root',
})
export class InventoryService {
    private firestore = inject(Firestore);
    private authService = inject(AuthService);
    private productsCollection = collection(this.firestore, 'products');
    private inventoryLogsCollection = collection(
        this.firestore,
        'inventory_logs'
    );

    async logConsumption(
        productId: string,
        amount: number,
        notes?: string
    ): Promise<void> {
        if (amount <= 0) return;

        const productDocRef = doc(this.firestore, 'products', productId);
        const productSnapshot = await getDoc(productDocRef);
        if (!productSnapshot.exists()) throw new Error('Product not found');
        const product = {
            id: productSnapshot.id,
            ...productSnapshot.data(),
        } as Product;

        const batch = writeBatch(this.firestore);
        const productRef = doc(this.firestore, 'products', productId);

        const previousStock = product.stock;
        const newStock = previousStock - amount;

        batch.update(productRef, { stock: increment(-amount) });

        const logRef = doc(this.inventoryLogsCollection);
        const staff = this.authService.userProfile();
        const log: InventoryLog = {
            productId,
            productName: product.name,
            type: 'INTERNAL_USE',
            changeAmount: -amount,
            previousStock,
            newStock,
            timestamp: new Date(),
            performedBy: 'STAFF',
            staffId: staff?.uid,
            staffName: staff?.displayName,
            notes,
        };
        batch.set(logRef, log);

        await batch.commit();
    }

    async reconcileInventory(
        auditData: { productId: string; physicalCount: number }[]
    ): Promise<void> {
        let batch = writeBatch(this.firestore);
        let batchCount = 0;
        const timestamp = new Date();

        const productIds = auditData.map((d) => d.productId);
        const chunkSize = 10;
        const productsMap = new Map<string, Product>();

        for (let i = 0; i < productIds.length; i += chunkSize) {
            const chunk = productIds.slice(i, i + chunkSize);
            const q = query(
                this.productsCollection,
                where(documentId(), 'in', chunk)
            );
            const snapshot = await getDocs(q);
            snapshot.forEach((docSnap) => {
                productsMap.set(docSnap.id, {
                    id: docSnap.id,
                    ...docSnap.data(),
                } as Product);
            });
        }

        for (const data of auditData) {
            const product = productsMap.get(data.productId);
            if (!product) continue;

            const systemStock = product.stock || 0;
            const difference = this.calculateStockVariance(
                systemStock,
                data.physicalCount
            );

            if (difference !== 0) {
                const productRef = doc(this.firestore, 'products', data.productId);
                batch.update(productRef, { stock: increment(difference) });

                const logRef = doc(this.inventoryLogsCollection);
                const staff = this.authService.userProfile();
                const log: InventoryLog = {
                    productId: data.productId,
                    productName: product.name,
                    type: 'AUDIT_ADJUSTMENT',
                    changeAmount: difference,
                    previousStock: systemStock,
                    newStock: data.physicalCount,
                    timestamp,
                    performedBy: 'STAFF_AUDIT',
                    staffId: staff?.uid,
                    staffName: staff?.displayName,
                    notes: `Stock Take: System ${systemStock} -> Physical ${data.physicalCount}`,
                };
                batch.set(logRef, log);
                batchCount += 2; // update + set = 2 operations

                if (batchCount >= 400) {
                    await batch.commit();
                    batch = writeBatch(this.firestore);
                    batchCount = 0;
                }
            }
        }

        if (batchCount > 0) {
            await batch.commit();
        }
    }

    calculateStockVariance(
        currentStock: number,
        physicalCount: number
    ): number {
        return physicalCount - currentStock;
    }
}
