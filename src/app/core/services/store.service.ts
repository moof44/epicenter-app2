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
  DocumentData,
  sum,
  getAggregateFromServer,
  arrayUnion
} from '@angular/fire/firestore';
import { Observable, BehaviorSubject, Subject, map, combineLatest } from 'rxjs';
import { Product, CartItem, Transaction, ProductSalesData, InventoryLog, DailySales } from '../models/store.model';
import { CashRegisterService } from './cash-register.service';
import { AuthService } from './auth.service';
import { MemberService } from './member.service';

export interface SaleCompletedEvent {
  transactionId: string;
  amount: number;
  timestamp: Date;
  paymentMethod: 'CASH' | 'GCASH';
}

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  private firestore = inject(Firestore);
  private injector = inject(Injector);
  private authService = inject(AuthService);
  private memberService = inject(MemberService);
  private productsCollection = collection(this.firestore, 'products');
  private transactionsCollection = collection(this.firestore, 'transactions');
  // private stockMovementsCollection = collection(this.firestore, 'stockMovements'); // Deprecated
  private inventoryLogsCollection = collection(this.firestore, 'inventory_logs'); // New Collection

  private get _currentUserSnapshot() {
    const user = this.authService.userProfile();
    // System actions might not have user, but UI actions should.
    // If called from UI without user, throw.
    if (!user) throw new Error('Action requires authentication');
    return {
      uid: user.uid,
      name: user.displayName,
      timestamp: new Date()
    };
  }

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
    const trace = this._currentUserSnapshot;
    return addDoc(this.productsCollection, { ...product, lastModifiedBy: trace });
  }

  updateProduct(id: string, data: Partial<Product>): Promise<void> {
    const docRef = doc(this.firestore, 'products', id);
    const trace = this._currentUserSnapshot;
    return updateDoc(docRef, { ...data, lastModifiedBy: trace });
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
        // Preserve price override if exists, otherwise use current product price? 
        // Logic: If already in cart, keep existing price strategy.
        subtotal: newQty * updated[existingIndex].price
      };
      this.cartItems.next(updated);
    } else {
      this.cartItems.next([
        ...currentCart,
        {
          productId: product.id,
          productName: product.name,
          price: product.price,
          originalPrice: product.price, // Initialize original price
          isPriceOverridden: false,
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

  updateCartItemPrice(productId: string, newPrice: number, reason: string): void {
    const currentCart = this.cartItems.getValue();
    const updated = currentCart.map(item => {
      if (item.productId === productId) {
        return {
          ...item,
          price: newPrice,
          isPriceOverridden: newPrice !== item.originalPrice,
          overrideReason: reason,
          subtotal: item.quantity * newPrice
        };
      }
      return item;
    });
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
  async checkout(customItems?: CartItem[], performedBy = 'SYSTEM_POS', paymentMethod: 'CASH' | 'GCASH' = 'CASH', referenceNumber?: string, amountTendered?: number, changeDue?: number, memberId?: string | null, memberName?: string): Promise<string> {
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
      const staff = this.authService.userProfile();
      const log: InventoryLog = {
        productId: item.productId,
        productName: product.name,
        type: 'SALE',
        changeAmount: -item.quantity,
        previousStock: previousStock,
        newStock: newStock,
        timestamp: timestamp,
        performedBy: performedBy,
        staffId: staff?.uid,
        staffName: staff?.displayName
      };
      batch.set(logRef, log);
    }

    // Create transaction record
    const staff = this.authService.userProfile();
    const transaction: Omit<Transaction, 'id'> = {
      date: timestamp,
      totalAmount: total,
      items: cartItems,
      staffId: staff?.uid || null,
      staffName: staff?.displayName || null,
      paymentMethod,
      referenceNumber: referenceNumber || null,
      amountTendered: amountTendered || null,
      changeDue: changeDue || null,
      memberId: memberId || null,
      memberName: memberName || 'Walk-in'
    };
    const transactionRef = doc(this.transactionsCollection);
    batch.set(transactionRef, transaction);

    // 3. Update Daily Sales (Denormalization)
    const dateStr = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
    const dfsRef = doc(this.firestore, 'daily_sales', dateStr);
    batch.set(dfsRef, {
      date: timestamp,
      totalSales: increment(total)
    }, { merge: true });

    // 4. ATOMIC UPDATE: Update Shift (Cash Management)
    // We do this HERE instead of via listeners to prevent race conditions/missing data.

    // NOTE: In the previous step we checked `isShiftOpen`.
    // Let's get the ID.
    const shiftId = cashRegisterService.getCurrentShiftId();
    if (shiftId) {
      const shiftRef = doc(this.firestore, 'shifts', shiftId);

      const cashTx = {
        type: 'Sale',
        amount: total,
        reason: `POS Sale #${transactionRef.id.slice(0, 8)}`,
        performedBy: 'System',
        relatedTransactionId: transactionRef.id,
        paymentMethod: paymentMethod,
        timestamp: timestamp
      };

      const shiftUpdates: any = {
        transactions: arrayUnion(cashTx),
        totalSales: increment(total),
        totalRevenue: increment(total),
        // Recalculate Expected? No, just increment totals. Expected is calculated on read/refresh usually or derived.
        // But we maintain it in DB for queries.
        // Expected = Opening + CashSales + FloatIn - Expenses - FloatOut
        // If Cash, increment CashSales and Expected.
        // If GCash, increment GCashSales (Expected stays same for Cash drawer?).
      };

      if (paymentMethod === 'GCASH') {
        shiftUpdates.totalGcashSales = increment(total);
      } else {
        shiftUpdates.totalCashSales = increment(total);
        shiftUpdates.expectedClosingBalance = increment(total);
      }

      batch.update(shiftRef, shiftUpdates);
    }

    await batch.commit();

    // 5. Refresh Shift State (UI)
    cashRegisterService.refreshShift();

    // Only clear the global cart if this was a standard POS checkout
    if (!isCustomTransaction) {
      this.clearCart();
    }

    // Emit sale completed event for cash register integration
    this.saleCompleted.next({
      transactionId: transactionRef.id,
      amount: total,
      timestamp: timestamp,
      paymentMethod
    });

    // 4. Automatic Membership Renewal
    // Check if any purchased item is a 'Membership' type
    if (memberId) {
      const membershipItem = cartItems.find(item => {
        // We need to look up the category from the map we fetched earlier, OR fetched in the loop.
        // The loop above inside 'Deduct Stock' had productsMap.
        // We need to access that productsMap here or check the cart item if we carry the category (we don't atm).
        // Best way: use the productsMap populated earlier.
        const product = productsMap.get(item.productId);
        return product?.category === 'Membership';
      });

      if (membershipItem) {
        // Trigger generic 30-day renewal
        // We do this async and don't block the checkout return necessarily, or we await it to ensure consistency.
        // Let's await it to be safe.
        try {
          await this.memberService.renewMembership(memberId);
        } catch (error) {
          console.error('Failed to auto-renew membership:', error);
          // We don't throw here to avoid failing the already-committed transaction, 
          // but we should probably notify/alert in a real app.
        }
      }

      // Check for 'Training' type
      const trainingItem = cartItems.find(item => {
        const product = productsMap.get(item.productId);
        return product?.category === 'Training';
      });

      if (trainingItem) {
        try {
          await this.memberService.renewTraining(memberId);
        } catch (error) {
          console.error('Failed to auto-renew training:', error);
        }
      }
    }

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
    const staff = this.authService.userProfile();
    const log: InventoryLog = {
      productId,
      productName: product.name,
      type: 'INTERNAL_USE',
      changeAmount: -amount,
      previousStock: previousStock,
      newStock: newStock,
      timestamp: new Date(),
      performedBy: 'STAFF',
      staffId: staff?.uid,
      staffName: staff?.displayName,
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
      const difference = this.calculateStockVariance(systemStock, data.physicalCount);

      if (difference !== 0) {
        const productRef = doc(this.firestore, 'products', data.productId);

        // Update stock to match physical count
        batch.update(productRef, { stock: increment(difference) });

        // Log Movement
        const logRef = doc(this.inventoryLogsCollection);
        const staff = this.authService.userProfile();
        const log: InventoryLog = {
          productId: data.productId,
          productName: product.name,
          type: 'AUDIT_ADJUSTMENT',
          changeAmount: difference,
          previousStock: systemStock,
          newStock: data.physicalCount,
          timestamp: timestamp,
          performedBy: 'STAFF_AUDIT',
          staffId: staff?.uid,
          staffName: staff?.displayName,
          notes: `Stock Take: System ${systemStock} -> Physical ${data.physicalCount}`
        };
        batch.set(logRef, log);
      }
    }

    await batch.commit();
  }

  // Helper for Inventory Variance
  calculateStockVariance(currentStock: number, physicalCount: number): number {
    return physicalCount - currentStock;
  }

  // New Method for Receiving Stock (if not already present, I'll add it or ensure used appropriately)
  // ...

  // Transactions
  getTransactions(constraints: {
    limit?: number;
    startDate?: Date;
    endDate?: Date;
    paymentMethod?: 'CASH' | 'GCASH';
    // For exact matches only (Firestore limitation without advanced indexing)
    memberId?: string;
    referenceNumber?: string;
    staffName?: string;
    staffId?: string;
  } = {}): Observable<Transaction[]> {
    const queryConstraints: any[] = [orderBy('date', 'desc')];

    // Apply Filters
    if (constraints.startDate) {
      queryConstraints.push(where('date', '>=', constraints.startDate));
    }
    if (constraints.endDate) {
      queryConstraints.push(where('date', '<=', constraints.endDate));
    }
    if (constraints.paymentMethod) {
      queryConstraints.push(where('paymentMethod', '==', constraints.paymentMethod));
    }
    if (constraints.memberId) {
      queryConstraints.push(where('memberId', '==', constraints.memberId));
    }
    if (constraints.referenceNumber) {
      queryConstraints.push(where('referenceNumber', '==', constraints.referenceNumber));
    }
    if (constraints.staffName) {
      queryConstraints.push(where('staffName', '==', constraints.staffName));
    }
    if (constraints.staffId) {
      queryConstraints.push(where('staffId', '==', constraints.staffId));
    }

    // Default to 50 if no specific limit or strict date range is set? 
    // We enforce a limit unless specifically asked for "all" (which safely shouldn't happen often)
    // Or just apply limit if it's set or default.
    const limitCount = constraints.limit ?? 50;
    queryConstraints.push(limit(limitCount));

    const q = query(this.transactionsCollection, ...queryConstraints);
    return collectionData(q, { idField: 'id' }) as Observable<Transaction[]>;
  }

  async getSalesTotal(constraints: {
    startDate?: Date;
    endDate?: Date;
    staffId?: string;
  }): Promise<number> {
    const queryConstraints: any[] = [];
    if (constraints.startDate) queryConstraints.push(where('date', '>=', constraints.startDate));
    if (constraints.endDate) queryConstraints.push(where('date', '<=', constraints.endDate));
    if (constraints.staffId) queryConstraints.push(where('staffId', '==', constraints.staffId));

    const q = query(this.transactionsCollection, ...queryConstraints);
    const snapshot = await getAggregateFromServer(q, {
      totalSales: sum('totalAmount')
    });

    return snapshot.data().totalSales;
  }

  // Analytics
  getSalesAnalytics(): Observable<{
    topSelling: ProductSalesData[];
    lowPerformance: ProductSalesData[];
    totalRevenue: number;
    monthlyRevenue: number;
    todayRevenue: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Start of Today (00:00:00)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    return combineLatest([
      this.getTransactions({ limit: 1000 }), // Monthly analytics needs more transactions
      this.getProducts()
    ]).pipe(
      map(([transactions]) => {
        const salesMap = new Map<string, ProductSalesData>();
        let totalRevenue = 0;
        let monthlyRevenue = 0;
        let todayRevenue = 0;

        transactions.forEach(tx => {
          const txDate = tx.date instanceof Date ? tx.date : (tx.date as any).toDate();
          totalRevenue += tx.totalAmount;

          if (txDate >= startOfMonth && txDate <= endOfMonth) {
            monthlyRevenue += tx.totalAmount;
          }

          if (txDate >= startOfToday && txDate <= endOfToday) {
            todayRevenue += tx.totalAmount;
          }

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

        return {
          topSelling: sortedBySales.slice(0, 5),
          lowPerformance: sortedBySales.slice(-5).reverse(),
          totalRevenue,
          monthlyRevenue,
          todayRevenue
        };
      })
    );
  }

  /**
   * Fetches transactions for a specific month and aggregates them by day.
   */
  getMonthlySalesReport(year: number, month: number): Observable<{ days: DailySales[], total: number }> {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);

    const dailySalesCol = collection(this.firestore, 'daily_sales');
    // We can query by ID range since IDs are YYYY-MM-DD
    // But easier to query by 'date' field if we saved it as timestamp (which we did in checkout cleanup)
    // Actually, querying by ID string range is very efficient too.
    const startId = startDate.toISOString().split('T')[0];
    const endId = endDate.toISOString().split('T')[0];

    const q = query(dailySalesCol,
      where(documentId(), '>=', startId),
      where(documentId(), '<=', endId)
    );

    return collectionData(q, { idField: 'id' }).pipe(
      map(docs => {
        let monthlyTotal = 0;

        // Pre-fill all days of month with 0?
        // The previous implementation did fill 0s. Let's keep that behavior for the chart/table continuity.
        const dailyMap = new Map<string, number>();
        const daysInMonth = endDate.getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          const d = new Date(year, month, i);
          const k = d.toISOString().split('T')[0];
          dailyMap.set(k, 0);
        }

        docs.forEach((doc: any) => {
          dailyMap.set(doc.id, doc.totalSales);
          monthlyTotal += doc.totalSales;
        });

        const sortedDays = Array.from(dailyMap.entries()).map(([k, v]) => ({
          date: new Date(k),
          totalSales: v
        })).sort((a, b) => a.date.getTime() - b.date.getTime());

        return { days: sortedDays, total: monthlyTotal };
      })
    );
  }

  /**
   * ADMIN UTILITY: Re-calculates daily sales from history to populate the daily_sales collection.
   * This should be run once.
   */
  async recalculateDailySales(): Promise<void> {
    // console.log('Starting Daily Sales Recalculation...');
    const allTransactions = await getDocs(this.transactionsCollection); // Heavy read, do once
    const salesMap = new Map<string, number>();

    allTransactions.forEach(docSnap => {
      const data = docSnap.data() as Transaction;
      const date = data.date instanceof Date ? data.date : (data.date as any).toDate();
      const dateStr = date.toISOString().split('T')[0];
      const current = salesMap.get(dateStr) || 0;
      salesMap.set(dateStr, current + data.totalAmount);
    });

    let batch = writeBatch(this.firestore);
    let count = 0;

    for (const [dateStr, total] of salesMap.entries()) {
      const ref = doc(this.firestore, 'daily_sales', dateStr);
      // We can use set with date field for future flexibilty
      batch.set(ref, {
        totalSales: total,
        date: new Date(dateStr) // Approximate timestamp for the day
      });
      count++;
      // Batches have limit of 500
      if (count >= 400) { // Safety margin
        await batch.commit();
        batch = writeBatch(this.firestore); // Can't reuse variable easily in loop without let re-assign logic or new batch
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
    }
    // console.log('Recalculation Complete.');
  }
}
