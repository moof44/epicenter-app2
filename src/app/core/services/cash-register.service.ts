import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  startAfter,
  arrayUnion,
  increment
} from '@angular/fire/firestore';
import { documentId } from 'firebase/firestore';
import { Observable, BehaviorSubject } from 'rxjs';
import {
  CashTransaction,
  ShiftSession,
  ShiftSummary
} from '../models/cash-register.model';
import { StoreService } from './store.service';

@Injectable({
  providedIn: 'root'
})
export class CashRegisterService {
  private firestore = inject(Firestore);
  private storeService = inject(StoreService);
  private shiftsCollection = collection(this.firestore, 'shifts');

  // Current shift state
  private currentShift = new BehaviorSubject<ShiftSession | null>(null);
  currentShift$ = this.currentShift.asObservable();

  constructor() {
    this.refreshShift();
  }


  // Initialize: Check for active open session
  async refreshShift(): Promise<void> {
    const openShift = await this.getOpenShift();
    this.currentShift.next(openShift); // Update even if null (to clear closed shift)
  }

  // Removed subscribeToSales to prevent non-atomic updates
  // private subscribeToSales(): Subscription { ... }

  // Get currently open shift
  private async getOpenShift(): Promise<ShiftSession | null> {
    const q = query(
      this.shiftsCollection,
      where('status', '==', 'OPEN'),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as ShiftSession;
  }

  // Get last closed shift (for suggested opening balance)
  async getLastClosedShift(): Promise<ShiftSession | null> {
    const q = query(
      this.shiftsCollection,
      where('status', '==', 'CLOSED'),
      orderBy('endTime', 'desc'),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as ShiftSession;
  }

  // Check if shift is open
  isShiftOpen(): boolean {
    const shift = this.currentShift.getValue();
    return shift?.status === 'OPEN';
  }

  getCurrentShiftId(): string | undefined {
    return this.currentShift.getValue()?.id;
  }


  // Open a new shift
  async openShift(openingBalance: number, openedBy: string): Promise<string> {
    // 1. Check local state pending initialization (optional but good UI feedback)
    if (this.isShiftOpen()) {
      throw new Error('A shift is already open. Close it first.');
    }

    // 2. CRITICAL: Check Firestore directly to prevent race conditions (double open)
    const existingOpen = await this.getOpenShift();
    if (existingOpen) {
      this.currentShift.next(existingOpen); // Sync local state
      throw new Error('A shift is ALREADY open in the system. Refreshed state.');
    }

    const newShift: Omit<ShiftSession, 'id'> = {
      openingBalance,
      expectedClosingBalance: openingBalance,
      actualClosingBalance: null,
      discrepancy: null,
      status: 'OPEN',
      startTime: new Date(),
      endTime: null,
      openedBy,
      closedBy: null,
      transactions: [],
      totalSales: 0,
      totalCashSales: 0,
      totalGcashSales: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      totalFloatIn: 0,
      totalFloatOut: 0
    };

    const docRef = await addDoc(this.shiftsCollection, newShift);
    const createdShift: ShiftSession = { ...newShift, id: docRef.id };
    this.currentShift.next(createdShift);

    return docRef.id;
  }

  // Add a cash transaction to current shift
  async addCashTransaction(transaction: Omit<CashTransaction, 'id' | 'timestamp'>): Promise<void> {
    const shift = this.currentShift.getValue();
    if (!shift?.id || shift.status !== 'OPEN') {
      throw new Error('No open shift. Please open a shift first.');
    }

    const newTransaction: CashTransaction = {
      ...transaction,
      timestamp: new Date()
    };

    // ATOMIC UPDATE: Use arrayUnion and increment to prevent overwriting concurrent updates
    const updates: any = {
      transactions: arrayUnion(newTransaction)
    };

    switch (transaction.type) {
      case 'Sale':
        updates.totalRevenue = increment(transaction.amount);
        updates.totalSales = increment(transaction.amount); // Legacy/Total

        if (transaction.paymentMethod === 'GCASH') {
          updates.totalGcashSales = increment(transaction.amount);
        } else {
          // Default to CASH if undefined (for safety/legacy) or explicit CASH
          updates.totalCashSales = increment(transaction.amount);
          updates.expectedClosingBalance = increment(transaction.amount);
        }
        break;
      case 'Float_In':
        updates.totalFloatIn = increment(transaction.amount);
        updates.expectedClosingBalance = increment(transaction.amount);
        break;
      case 'Expense':
        updates.totalExpenses = increment(transaction.amount);
        updates.expectedClosingBalance = increment(-transaction.amount);
        break;
      case 'Float_Out':
        updates.totalFloatOut = increment(transaction.amount);
        updates.expectedClosingBalance = increment(-transaction.amount);
        break;
    }

    const docRef = doc(this.firestore, 'shifts', shift.id);
    await updateDoc(docRef, updates);

    // Refresh local state to reflect changes
    // We call refreshShift() to get the updated authoritative state from Firestore
    // This is safer than patching local state which might be slightly out of sync after atomic update
    await this.refreshShift();
  }


  // Manual cash movements
  async addExpense(amount: number, reason: string, performedBy: string): Promise<void> {
    await this.addCashTransaction({
      type: 'Expense',
      amount,
      reason,
      performedBy
    });
  }

  async addFloatIn(amount: number, reason: string, performedBy: string): Promise<void> {
    await this.addCashTransaction({
      type: 'Float_In',
      amount,
      reason,
      performedBy
    });
  }

  async addFloatOut(amount: number, reason: string, performedBy: string): Promise<void> {
    await this.addCashTransaction({
      type: 'Float_Out',
      amount,
      reason,
      performedBy
    });
  }

  // Get shift summary for closing
  getShiftSummary(): ShiftSummary | null {
    const shift = this.currentShift.getValue();
    if (!shift) return null;

    return {
      openingBalance: shift.openingBalance,
      totalSales: shift.totalSales, // Legacy
      totalCashSales: shift.totalCashSales || 0,
      totalGcashSales: shift.totalGcashSales || 0,
      totalRevenue: shift.totalRevenue || 0,
      totalFloatIn: shift.totalFloatIn,
      totalExpenses: shift.totalExpenses,
      totalFloatOut: shift.totalFloatOut,
      expectedClosingBalance: shift.expectedClosingBalance
    };
  }

  // Get current cash (expected)
  getCurrentCash(): number {
    const shift = this.currentShift.getValue();
    return shift?.expectedClosingBalance ?? 0;
  }

  // Close the shift
  async closeShift(actualClosingBalance: number, closedBy: string): Promise<void> {
    const shift = this.currentShift.getValue();
    if (!shift?.id || shift.status !== 'OPEN') {
      throw new Error('No open shift to close.');
    }

    const discrepancy = actualClosingBalance - shift.expectedClosingBalance;

    const updates: Partial<ShiftSession> = {
      status: 'CLOSED',
      actualClosingBalance,
      discrepancy,
      endTime: new Date(),
      closedBy
    };

    const docRef = doc(this.firestore, 'shifts', shift.id);
    await updateDoc(docRef, updates);

    this.currentShift.next(null);
  }

  // Recalculate shift totals from transactions (Fix sync issues)
  async recalculateShiftTotals(shiftId: string): Promise<{ salesDiff: number }> {
    const shiftRef = doc(this.firestore, 'shifts', shiftId);
    const shiftSnap = await getDocs(query(this.shiftsCollection, where(documentId(), '==', shiftId)));

    if (shiftSnap.empty) throw new Error('Shift not found');

    const shiftData = shiftSnap.docs[0].data() as ShiftSession;
    if (!shiftData.transactions || !Array.isArray(shiftData.transactions)) {
      return { salesDiff: 0 };
    }

    let totalSales = 0;
    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalFloatIn = 0;
    let totalFloatOut = 0;
    let totalCashSales = 0;
    let totalGcashSales = 0;

    const updatedTransactions = [...shiftData.transactions];
    let hasUpdates = false;

    for (let i = 0; i < updatedTransactions.length; i++) {
      const tx = updatedTransactions[i];

      // Skip voided transactions
      if ((tx as any).voided) {
        continue;
      }

      // Backfill Check: If Sale and missing products summary
      if (tx.type === 'Sale' && !tx.productsSummary && tx.relatedTransactionId) {
        try {
          const txRef = doc(this.firestore, 'transactions', tx.relatedTransactionId);
          const txSnap = await getDoc(txRef);
          if (txSnap.exists()) {
            const fullTx = txSnap.data() as any; // Cast to avoid full interface dependency cycle if any
            if (fullTx.items && Array.isArray(fullTx.items)) {
              const summary = fullTx.items.map((item: any) =>
                item.quantity > 1 ? `${item.productName} (x${item.quantity})` : item.productName
              ).join(', ');

              // Update the transaction object in the array
              updatedTransactions[i] = { ...tx, productsSummary: summary };
              hasUpdates = true;
            }
          }
        } catch (err) {
          console.warn('Failed to backfill transaction', tx.relatedTransactionId, err);
        }
      }

      switch (tx.type) {
        case 'Sale':
          totalRevenue += tx.amount;
          totalSales += tx.amount; // Legacy
          if (tx.paymentMethod === 'GCASH') {
            totalGcashSales += tx.amount;
          } else {
            totalCashSales += tx.amount;
          }
          break;
        case 'Float_In':
          totalFloatIn += tx.amount;
          break;
        case 'Expense':
          totalExpenses += tx.amount;
          break;
        case 'Float_Out':
          totalFloatOut += tx.amount;
          break;
      }
    }

    const expectedClosingBalance = shiftData.openingBalance + totalCashSales + totalFloatIn - totalExpenses - totalFloatOut;
    const diff = totalSales - (shiftData.totalSales || 0);

    const updateData: any = {
      totalSales,
      totalRevenue,
      totalExpenses,
      totalFloatIn,
      totalFloatOut,
      totalCashSales,
      totalGcashSales,
      expectedClosingBalance
    };

    if (hasUpdates) {
      updateData.transactions = updatedTransactions;
    }

    await updateDoc(shiftRef, updateData);

    // Refresh if it's the current shift
    if (this.currentShift.getValue()?.id === shiftId) {
      await this.refreshShift();
    }

    return { salesDiff: diff };
  }

  getShiftHistory(limitCount = 50, startDate?: Date, endDate?: Date): Observable<ShiftSession[]> {
    const constraints: any[] = [orderBy('startTime', 'desc')];

    if (startDate) constraints.push(where('startTime', '>=', startDate));
    if (endDate) constraints.push(where('startTime', '<=', endDate));

    constraints.push(limit(limitCount));

    const q = query(this.shiftsCollection, ...constraints);
    return collectionData(q, { idField: 'id' }) as Observable<ShiftSession[]>;
  }

  async getShiftHistoryPage(limitCount = 50, lastDoc?: any): Promise<{ shifts: ShiftSession[], lastDoc: any | null }> {
    let q = query(this.shiftsCollection, orderBy('startTime', 'desc'), limit(limitCount));

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    const shifts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShiftSession));
    const lastDocument = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

    return { shifts, lastDoc: lastDocument };
  }

  // Get today's transactions from current shift
  getTodayTransactions(): CashTransaction[] {
    const shift = this.currentShift.getValue();
    return shift?.transactions ?? [];
  }

  // Void a transaction within a shift (Open or Closed - for correction)
  async voidTransactionInShift(relatedTransactionId: string, txDate: Date): Promise<void> {
    // Find shift that covers this time
    // Simplify: Order by startTime desc, startAt(txDate). 
    // The shift started closest to txDate (before it) is likely the one.

    // Note: Firestore comparisons on dates work well.
    // Finding shift with startTime <= txDate.
    const q = query(
      this.shiftsCollection,
      where('startTime', '<=', txDate),
      orderBy('startTime', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.warn('No shift found covering this transaction date.');
      // Fallback: If no shift found (maybe legacy data), just warn.
      return;
    }

    const shiftDoc = snapshot.docs[0];
    const shiftData = shiftDoc.data() as ShiftSession;

    // Find the tx in array
    const transactions = shiftData.transactions || [];
    const txIndex = transactions.findIndex(t => t.relatedTransactionId === relatedTransactionId);

    if (txIndex === -1) {
      console.warn('Shift found but transaction not in list.');
      // It's possible the transaction was a pure Inventory Log update or something? 
      // Or maybe shift logic was different back then. Safe to ignore/warn.
      return;
    }

    const tx = transactions[txIndex];
    if ((tx as any).voided) {
      // Already voided, do nothing.
      return;
    }

    // Update the array item
    const updatedTx = { ...tx, voided: true };
    const newTransactions = [...transactions];
    newTransactions[txIndex] = updatedTx;

    // Decrement totals
    const updates: any = {
      transactions: newTransactions
    };

    const amount = tx.amount;

    if (tx.type === 'Sale') {
      updates.totalRevenue = increment(-amount);
      updates.totalSales = increment(-amount);

      if (tx.paymentMethod === 'GCASH') {
        updates.totalGcashSales = increment(-amount);
      } else {
        updates.totalCashSales = increment(-amount);
        updates.expectedClosingBalance = increment(-amount);
      }
    } else if (tx.type === 'Float_In') {
      updates.totalFloatIn = increment(-amount);
      updates.expectedClosingBalance = increment(-amount);
    } else if (tx.type === 'Expense') { // Expenses reduce expected balance, so voiding ADDS it back
      updates.totalExpenses = increment(-amount);
      updates.expectedClosingBalance = increment(amount);
    } else if (tx.type === 'Float_Out') {
      updates.totalFloatOut = increment(-amount);
      updates.expectedClosingBalance = increment(amount);
    }

    const docRef = doc(this.firestore, 'shifts', shiftDoc.id);
    await updateDoc(docRef, updates);

    // Refresh if current
    if (this.currentShift.getValue()?.id === shiftDoc.id) {
      await this.refreshShift();
    }
  }
}
