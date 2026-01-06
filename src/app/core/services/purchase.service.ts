import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, writeBatch, serverTimestamp, increment } from '@angular/fire/firestore';
import { PurchaseOrder } from '../models/purchase.model';
import { StockMovement } from '../models/store.model';

@Injectable({
  providedIn: 'root'
})
export class PurchaseService {
  private firestore = inject(Firestore);

  constructor() {}

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
    const movementsCol = collection(this.firestore, 'stock_movements');

    for (const item of order.items) {
      const productRef = doc(productsCol, item.productId);
      const movementRef = doc(movementsCol);

      // Update Product: increment stock, set lastCostPrice
      batch.update(productRef, {
        stock: increment(item.quantity),
        lastCostPrice: item.unitCost
      });

      // 3. Stock Movement Audit
      const movement: StockMovement = {
        productId: item.productId,
        changeAmount: item.quantity,
        reason: 'RESTOCK',
        timestamp: serverTimestamp(), // Use server timestamp for consistency
        notes: `Purchase Order #${order.referenceNumber || orderId} from ${order.supplierName || 'Unknown'}`
      };
      
      batch.set(movementRef, movement);
    }

    await batch.commit();
  }
}
