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
  startAfter,
  arrayUnion,
  increment,
  documentId
} from '@angular/fire/firestore';
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

  // RECOVERY UTILITY: Recalculate totals from transaction list
  async recalculateShiftTotals(shiftId: string): Promise<{ salesDiff: number }> {
    const shiftRef = doc(this.firestore, 'shifts', shiftId);
    const snapshot = await getDocs(query(this.shiftsCollection, where(documentId(), '==', shiftId)));

    if (snapshot.empty) throw new Error('Shift not found');
    const shift = snapshot.docs[0].data() as ShiftSession;

    let totalSales = 0;
    let totalCashSales = 0;
    let totalGcashSales = 0;
    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalFloatIn = 0;
    let totalFloatOut = 0;

    // Recalculate from transaction history
    shift.transactions.forEach(tx => {
      if (tx.type === 'Sale') {
        totalSales += tx.amount;
        totalRevenue += tx.amount;

        if (tx.paymentMethod === 'GCASH') {
          totalGcashSales += tx.amount;
        } else {
          totalCashSales += tx.amount;
        }
      } else if (tx.type === 'Expense') {
        totalExpenses += tx.amount;
      } else if (tx.type === 'Float_In') {
        totalFloatIn += tx.amount;
      } else if (tx.type === 'Float_Out') {
        totalFloatOut += tx.amount;
      }
    });

    // Recalculate Expected Closing Balance
    // Expected = Opening + Cash Info (Cash Sales + Float In - Expenses - Float Out)
    const expectedClosingBalance = shift.openingBalance + totalCashSales + totalFloatIn - totalExpenses - totalFloatOut;

    const diff = totalSales - shift.totalSales;

    await updateDoc(shiftRef, {
      totalSales,
      totalCashSales,
      totalGcashSales,
      totalRevenue,
      totalExpenses,
      totalFloatIn,
      totalFloatOut,
      expectedClosingBalance
    });

    // Refresh if it's the current shift
    if (this.currentShift.getValue()?.id === shiftId) {
      this.refreshShift();
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
}
