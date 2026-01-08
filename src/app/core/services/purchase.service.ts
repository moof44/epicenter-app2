import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, writeBatch, serverTimestamp, increment, getDocs, query, where, documentId } from '@angular/fire/firestore';
import { PurchaseOrder } from '../models/purchase.model';
// import { StockMovement } from '../models/store.model'; // Deprecated

@Injectable({
  providedIn: 'root'
})
export class PurchaseService {
  private firestore = inject(Firestore);

  constructor() { }

  /**
   * Records a purchase order atomically:
   * 1. Saves the PurchaseOrder to 'purchase_orders' collection
   * 2. Updates each Product's stock and cost prices
   * 3. Creates StockMovement records for audit
   */
  async recordPurchase(order: PurchaseOrder): Promise<void> {
    const batch = writeBatch(this.firestore);

    // 1. Save Purchase Order
    const purchasesCol = collection(this.firestore, 'purchase_orders');
    const orderDocRef = doc(purchasesCol); // Auto-ID
    const orderId = orderDocRef.id;

    // Assign ID and timestamp if not present
    const finalOrder = {
      ...order,
      id: orderId,
      date: order.date || serverTimestamp(),
    };

    batch.set(orderDocRef, finalOrder);

    // 2. Process Items
    const productsCol = collection(this.firestore, 'products');
    const logsCol = collection(this.firestore, 'inventory_logs'); // New Collection

    // Pre-fetch products for snapshots
    const productIds = order.items.map(i => i.productId);
    const productsMap = new Map<string, any>();

    // Batch read products (handle chunking if needed, but purchase orders usually small)
    // For safety, let's just do one query for all if small, or loop if necessary.
    // Assuming < 30 items usually.
    if (productIds.length > 0) {
      const q = query(productsCol, where(documentId(), 'in', productIds));
      const snapshot = await getDocs(q);
      snapshot.forEach(d => productsMap.set(d.id, d.data()));
    }

    for (const item of order.items) {
      const productRef = doc(productsCol, item.productId);
      const logRef = doc(logsCol);

      const currentProduct = productsMap.get(item.productId);
      const currentStock = currentProduct?.stock || 0;
      const newStock = currentStock + item.quantity;
      const productName = currentProduct?.name || item.productName || 'Unknown Product';

      // Update Product: increment stock, set lastCostPrice
      batch.update(productRef, {
        stock: increment(item.quantity),
        lastCostPrice: item.unitCost
      });

      // 3. Inventory Audit Log
      // Note: We use 'any' for InventoryLog here because we might need to cast or import it properly.
      // Ideally reuse the interface from store.model
      const log = {
        productId: item.productId,
        productName: productName,
        type: 'RESTOCK',
        changeAmount: item.quantity,
        previousStock: currentStock,
        newStock: newStock,
        timestamp: serverTimestamp(),
        performedBy: 'SYSTEM_PURCHASE', // Or logged in user if available
        notes: `Purchase Order #${order.referenceNumber || orderId} from ${order.supplierName || 'Unknown'}`
      };

      batch.set(logRef, log);
    }

    await batch.commit();
  }
}
