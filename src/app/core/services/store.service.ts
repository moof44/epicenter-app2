import { Injectable, inject, Injector } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  docData,
  writeBatch,
  increment,
  limit,
  where,
  documentId,
  getDocs,
  getDoc,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData
} from '@angular/fire/firestore';
import { Observable, BehaviorSubject, Subject, map, combineLatest } from 'rxjs';
import { Product, CartItem, Transaction, ProductSalesData, StockMovement, InventoryLog } from '../models/store.model';
import { CashRegisterService } from './cash-register.service';

export interface SaleCompletedEvent {
  transactionId: string;
  amount: number;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  private firestore = inject(Firestore);
  private injector = inject(Injector);
  private productsCollection = collection(this.firestore, 'products');
  private transactionsCollection = collection(this.firestore, 'transactions');
  // private stockMovementsCollection = collection(this.firestore, 'stockMovements'); // Deprecated
  private inventoryLogsCollection = collection(this.firestore, 'inventory_logs'); // New Collection

  // Cart state
  private cartItems = new BehaviorSubject<CartItem[]>([]);
  cart$ = this.cartItems.asObservable();

  // Sale completed event for cash register integration
  private saleCompleted = new Subject<SaleCompletedEvent>();
  saleCompleted$ = this.saleCompleted.asObservable();

  // Products
  getProducts(limitCount = 100): Observable<Product[]> {
    const q = query(this.productsCollection, orderBy('name'), limit(limitCount));
    return collectionData(q, { idField: 'id' }) as Observable<Product[]>;
  }

  async getProductsPage(limitCount = 50, lastDoc?: QueryDocumentSnapshot<DocumentData>): Promise<{ products: Product[], lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
    let q = query(this.productsCollection, orderBy('name'), limit(limitCount));

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    const lastDocument = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

    return { products, lastDoc: lastDocument };
  }

  getProduct(id: string): Observable<Product> {
    const docRef = doc(this.firestore, 'products', id);
    return docData(docRef, { idField: 'id' }) as Observable<Product>;
  }

  addProduct(product: Omit<Product, 'id'>): Promise<any> {
    return addDoc(this.productsCollection, product);
  }

  updateProduct(id: string, data: Partial<Product>): Promise<void> {
    const docRef = doc(this.firestore, 'products', id);
    return updateDoc(docRef, data);
  }

  deleteProduct(id: string): Promise<void> {
    const docRef = doc(this.firestore, 'products', id);
    return deleteDoc(docRef);
  }


  // Cart Management
  addToCart(product: Product, quantity = 1): void {
    if (!product.id || product.stock < quantity) return;

    const currentCart = this.cartItems.getValue();
    const existingIndex = currentCart.findIndex(item => item.productId === product.id);

    if (existingIndex >= 0) {
      const updated = [...currentCart];
      const newQty = updated[existingIndex].quantity + quantity;
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: newQty,
        subtotal: newQty * product.price
      };
      this.cartItems.next(updated);
    } else {
      this.cartItems.next([
        ...currentCart,
        {
          productId: product.id,
          productName: product.name,
          price: product.price,
          quantity,
          subtotal: quantity * product.price
        }
      ]);
    }
  }

  updateCartItemQuantity(productId: string, quantity: number): void {
    const currentCart = this.cartItems.getValue();
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }
    const updated = currentCart.map(item =>
      item.productId === productId
        ? { ...item, quantity, subtotal: quantity * item.price }
        : item
    );
    this.cartItems.next(updated);
  }

  removeFromCart(productId: string): void {
    const currentCart = this.cartItems.getValue();
    this.cartItems.next(currentCart.filter(item => item.productId !== productId));
  }

  clearCart(): void {
    this.cartItems.next([]);
  }

  getCartTotal(): Observable<number> {
    return this.cart$.pipe(
      map(items => items.reduce((sum, item) => sum + item.subtotal, 0))
    );
  }


  // Checkout
  async checkout(customItems?: CartItem[], performedBy = 'SYSTEM_POS'): Promise<string> {
    // Enforce Open Register
    const cashRegisterService = this.injector.get(CashRegisterService);
    if (!cashRegisterService.isShiftOpen()) {
      throw new Error('Transaction blocked: Register is closed. Please open a shift.');
    }

    const isCustomTransaction = !!customItems;
    const cartItems = customItems || this.cartItems.getValue();

    if (cartItems.length === 0) throw new Error('Cart is empty');

    const batch = writeBatch(this.firestore);
    const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    const timestamp = new Date(); // Use ServerTimestamp ideally, but Date is okay for now if consistent

    // 1. Fetch current product states (Snapshot for Audit Trail)
    // We need to know previous stock to log it.
    const productIds = [...new Set(cartItems.map(i => i.productId))];
    const productsMap = new Map<string, Product>();

    const chunkedIds = [];
    for (let i = 0; i < productIds.length; i += 10) {
      chunkedIds.push(productIds.slice(i, i + 10));
    }

    for (const chunk of chunkedIds) {
      const q = query(this.productsCollection, where(documentId(), 'in', chunk));
      const snapshot = await getDocs(q);
      snapshot.forEach(doc => productsMap.set(doc.id, { id: doc.id, ...doc.data() } as Product));
    }

    // Deduct stock and Create Logs
    for (const item of cartItems) {
      const product = productsMap.get(item.productId);
      if (!product) continue; // Should not happen

      const productRef = doc(this.firestore, 'products', item.productId);
      const previousStock = product.stock;
      const newStock = previousStock - item.quantity;

      // Update Product Stock
      batch.update(productRef, { stock: increment(-item.quantity) });

      // Create Inventory Log (SALE)
      const logRef = doc(this.inventoryLogsCollection);
      const log: InventoryLog = {
        productId: item.productId,
        productName: product.name,
        type: 'SALE',
        changeAmount: -item.quantity,
        previousStock: previousStock,
        newStock: newStock,
        timestamp: timestamp,
        performedBy: performedBy
      };
      batch.set(logRef, log);
    }

    // Create transaction record
    const transaction: Omit<Transaction, 'id'> = {
      date: timestamp,
      totalAmount: total,
      items: cartItems
    };
    const transactionRef = doc(this.transactionsCollection);
    batch.set(transactionRef, transaction);

    await batch.commit();

    // Only clear the global cart if this was a standard POS checkout
    if (!isCustomTransaction) {
      this.clearCart();
    }

    // Emit sale completed event for cash register integration
    this.saleCompleted.next({
      transactionId: transactionRef.id,
      amount: total,
      timestamp: timestamp
    });

    return transactionRef.id;
  }

  // Inventory Management (Gym Inventory System)

  async logConsumption(productId: string, amount: number, notes?: string): Promise<void> {
    if (amount <= 0) return;

    // Fetch current product for snapshot
    const productDocRef = doc(this.firestore, 'products', productId);
    const productSnapshot = await getDoc(productDocRef);
    if (!productSnapshot.exists()) throw new Error('Product not found');
    const product = { id: productSnapshot.id, ...productSnapshot.data() } as Product;

    const batch = writeBatch(this.firestore);
    const productRef = doc(this.firestore, 'products', productId);

    const previousStock = product.stock;
    const newStock = previousStock - amount;

    // Decrement stock
    batch.update(productRef, { stock: increment(-amount) });

    // Log Movement
    const logRef = doc(this.inventoryLogsCollection);
    const log: InventoryLog = {
      productId,
      productName: product.name,
      type: 'INTERNAL_USE',
      changeAmount: -amount,
      previousStock: previousStock,
      newStock: newStock,
      timestamp: new Date(),
      performedBy: 'STAFF', // Placeholder - should ideally be passed in
      notes
    };
    batch.set(logRef, log);

    await batch.commit();
  }

  async reconcileInventory(auditData: { productId: string; physicalCount: number }[]): Promise<void> {
    const batch = writeBatch(this.firestore);
    const timestamp = new Date();

    // 1. Fetch current product states in batches (to avoid N+1 reads)
    const productIds = auditData.map(d => d.productId);
    const chunkSize = 10;
    const productsMap = new Map<string, Product>();

    for (let i = 0; i < productIds.length; i += chunkSize) {
      const chunk = productIds.slice(i, i + chunkSize);
      const q = query(this.productsCollection, where(documentId(), 'in', chunk));
      const snapshot = await getDocs(q);

      snapshot.forEach(docSnap => {
        productsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as Product);
      });
    }

    // 2. Compare and update
    for (const data of auditData) {
      const product = productsMap.get(data.productId);

      if (!product) continue;

      const systemStock = product.stock || 0;
      const difference = data.physicalCount - systemStock;

      if (difference !== 0) {
        const productRef = doc(this.firestore, 'products', data.productId);

        // Update stock to match physical count
        batch.update(productRef, { stock: increment(difference) });

        // Log Movement
        const logRef = doc(this.inventoryLogsCollection);
        const log: InventoryLog = {
          productId: data.productId,
          productName: product.name,
          type: 'AUDIT_ADJUSTMENT',
          changeAmount: difference,
          previousStock: systemStock,
          newStock: data.physicalCount,
          timestamp: timestamp,
          performedBy: 'STAFF_AUDIT',
          notes: `Stock Take: System ${systemStock} -> Physical ${data.physicalCount}`
        };
        batch.set(logRef, log);
      }
    }

    await batch.commit();
  }

  // New Method for Receiving Stock (if not already present, I'll add it or ensure used appropriately)
  // ...

  // Transactions
  getTransactions(constraints: { limit?: number; startDate?: Date; endDate?: Date } = {}): Observable<Transaction[]> {
    const queryConstraints: any[] = [orderBy('date', 'desc')];

    // Apply Filters
    if (constraints.startDate) {
      queryConstraints.push(where('date', '>=', constraints.startDate));
    }
    if (constraints.endDate) {
      queryConstraints.push(where('date', '<=', constraints.endDate));
    }

    // Default to 50 if no specific limit or strict date range is set? 
    // We enforce a limit unless specifically asked for "all" (which safely shouldn't happen often)
    // Or just apply limit if it's set or default.
    const limitCount = constraints.limit ?? 50;
    queryConstraints.push(limit(limitCount));

    const q = query(this.transactionsCollection, ...queryConstraints);
    return collectionData(q, { idField: 'id' }) as Observable<Transaction[]>;
  }

  // Analytics
  getSalesAnalytics(): Observable<{
    topSelling: ProductSalesData[];
    lowPerformance: ProductSalesData[];
    totalRevenue: number;
  }> {
    return combineLatest([this.getTransactions(), this.getProducts()]).pipe(
      map(([transactions]) => {
        const salesMap = new Map<string, ProductSalesData>();

        // Aggregate sales data
        transactions.forEach(tx => {
          tx.items.forEach(item => {
            const existing = salesMap.get(item.productId);
            if (existing) {
              existing.totalQuantitySold += item.quantity;
              existing.totalRevenue += item.subtotal;
            } else {
              salesMap.set(item.productId, {
                productId: item.productId,
                productName: item.productName,
                totalQuantitySold: item.quantity,
                totalRevenue: item.subtotal
              });
            }
          });
        });

        const salesData = Array.from(salesMap.values());
        const sortedBySales = [...salesData].sort((a, b) => b.totalQuantitySold - a.totalQuantitySold);

        const totalRevenue = transactions.reduce((sum, tx) => sum + tx.totalAmount, 0);

        return {
          topSelling: sortedBySales.slice(0, 5),
          lowPerformance: sortedBySales.slice(-5).reverse(),
          totalRevenue
        };
      })
    );
  }
}
