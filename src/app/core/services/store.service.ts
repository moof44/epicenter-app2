import { Injectable, inject } from '@angular/core';
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
  getDoc
} from '@angular/fire/firestore';
import { Observable, BehaviorSubject, Subject, map, combineLatest } from 'rxjs';
import { Product, CartItem, Transaction, ProductSalesData, StockMovement } from '../models/store.model';

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
  private productsCollection = collection(this.firestore, 'products');
  private transactionsCollection = collection(this.firestore, 'transactions');
  private stockMovementsCollection = collection(this.firestore, 'stockMovements');

  // Cart state
  private cartItems = new BehaviorSubject<CartItem[]>([]);
  cart$ = this.cartItems.asObservable();

  // Sale completed event for cash register integration
  private saleCompleted = new Subject<SaleCompletedEvent>();
  saleCompleted$ = this.saleCompleted.asObservable();

  // Products
  getProducts(): Observable<Product[]> {
    const q = query(this.productsCollection, orderBy('name'));
    return collectionData(q, { idField: 'id' }) as Observable<Product[]>;
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
  async checkout(): Promise<string> {
    const cartItems = this.cartItems.getValue();
    if (cartItems.length === 0) throw new Error('Cart is empty');

    const batch = writeBatch(this.firestore);
    const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    const timestamp = new Date();

    // Deduct stock for each product
    for (const item of cartItems) {
      const productRef = doc(this.firestore, 'products', item.productId);
      batch.update(productRef, { stock: increment(-item.quantity) });

      // Create Stock Movement Log (SALE)
      const movementRef = doc(this.stockMovementsCollection);
      const movement: StockMovement = {
        productId: item.productId,
        changeAmount: -item.quantity,
        reason: 'SALE',
        timestamp: timestamp,
        performedBy: 'SYSTEM_POS' // Could be replaced by auth user in future
      };
      batch.set(movementRef, movement);
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
    this.clearCart();

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

    const batch = writeBatch(this.firestore);
    const productRef = doc(this.firestore, 'products', productId);
    
    // Decrement stock
    batch.update(productRef, { stock: increment(-amount) });

    // Log Movement
    const movementRef = doc(this.stockMovementsCollection);
    const movement: StockMovement = {
      productId,
      changeAmount: -amount,
      reason: 'INTERNAL_USE',
      timestamp: new Date(),
      notes,
      performedBy: 'STAFF' // Placeholder
    };
    batch.set(movementRef, movement);

    await batch.commit();
  }

  async reconcileInventory(auditData: { productId: string; physicalCount: number }[]): Promise<void> {
    const batch = writeBatch(this.firestore);
    const timestamp = new Date();

    for (const data of auditData) {
      const productRef = doc(this.firestore, 'products', data.productId);
      const productSnap = await getDoc(productRef);
      
      if (!productSnap.exists()) continue;
      
      const product = productSnap.data() as Product;
      const systemStock = product.stock || 0;
      const difference = data.physicalCount - systemStock;

      if (difference !== 0) {
        // Update stock to match physical count
        batch.update(productRef, { stock: increment(difference) });

        // Log Movement
        const movementRef = doc(this.stockMovementsCollection);
        const movement: StockMovement = {
          productId: data.productId,
          changeAmount: difference,
          reason: 'AUDIT_ADJUSTMENT',
          timestamp: timestamp,
          notes: `Stock Take: System ${systemStock} -> Physical ${data.physicalCount}`,
          performedBy: 'STAFF_AUDIT'
        };
        batch.set(movementRef, movement);
      }
    }

    await batch.commit();
  }

  // Transactions
  getTransactions(): Observable<Transaction[]> {
    const q = query(this.transactionsCollection, orderBy('date', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Transaction[]>;
  }

  // Analytics
  getSalesAnalytics(): Observable<{
    topSelling: ProductSalesData[];
    lowPerformance: ProductSalesData[];
    totalRevenue: number;
  }> {
    return combineLatest([this.getTransactions(), this.getProducts()]).pipe(
      map(([transactions, _products]) => {
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
