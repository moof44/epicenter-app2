import { Injectable, inject, OnDestroy } from '@angular/core';
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
  startAfter
} from '@angular/fire/firestore';
import { Observable, BehaviorSubject, Subscription } from 'rxjs';
import {
  CashTransaction,
  ShiftSession,
  ShiftSummary
} from '../models/cash-register.model';
import { StoreService } from './store.service';

@Injectable({
  providedIn: 'root'
})
export class CashRegisterService implements OnDestroy {
  private firestore = inject(Firestore);
  private storeService = inject(StoreService);
  private shiftsCollection = collection(this.firestore, 'shifts');

  // Current shift state
  private currentShift = new BehaviorSubject<ShiftSession | null>(null);
  currentShift$ = this.currentShift.asObservable();

  // Subscription for auto-sync with POS
  private saleSubscription: Subscription;

  constructor() {
    this.initializeShift();
    this.saleSubscription = this.subscribeToSales();
  }

  ngOnDestroy(): void {
    this.saleSubscription?.unsubscribe();
  }


  // Initialize: Check for active open session
  private async initializeShift(): Promise<void> {
    const openShift = await this.getOpenShift();
    if (openShift) {
      this.currentShift.next(openShift);
    }
  }

  // Subscribe to POS sales for auto-sync
  private subscribeToSales(): Subscription {
    return this.storeService.saleCompleted$.subscribe(async (sale) => {
      const shift = this.currentShift.getValue();
      if (!shift?.id || shift.status !== 'OPEN') return;

      await this.addCashTransaction({
        type: 'Sale',
        amount: sale.amount,
        reason: `POS Sale #${sale.transactionId.slice(0, 8)}`,
        performedBy: 'System',
        relatedTransactionId: sale.transactionId
      });
    });
  }

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


  // Open a new shift
  async openShift(openingBalance: number, openedBy: string): Promise<string> {
    if (this.isShiftOpen()) {
      throw new Error('A shift is already open. Close it first.');
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

    // Update totals based on transaction type
    const updates: Partial<ShiftSession> = {
      transactions: [...shift.transactions, newTransaction]
    };

    switch (transaction.type) {
      case 'Sale':
        updates.totalSales = shift.totalSales + transaction.amount;
        break;
      case 'Float_In':
        updates.totalFloatIn = shift.totalFloatIn + transaction.amount;
        break;
      case 'Expense':
        updates.totalExpenses = shift.totalExpenses + transaction.amount;
        break;
      case 'Float_Out':
        updates.totalFloatOut = shift.totalFloatOut + transaction.amount;
        break;
    }

    // Recalculate expected closing balance
    const newTotalSales = updates.totalSales ?? shift.totalSales;
    const newTotalFloatIn = updates.totalFloatIn ?? shift.totalFloatIn;
    const newTotalExpenses = updates.totalExpenses ?? shift.totalExpenses;
    const newTotalFloatOut = updates.totalFloatOut ?? shift.totalFloatOut;

    updates.expectedClosingBalance =
      shift.openingBalance + newTotalSales + newTotalFloatIn - newTotalExpenses - newTotalFloatOut;

    const docRef = doc(this.firestore, 'shifts', shift.id);
    await updateDoc(docRef, updates);

    // Update local state
    this.currentShift.next({ ...shift, ...updates });
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
      totalSales: shift.totalSales,
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

  getShiftHistory(limitCount = 50): Observable<ShiftSession[]> {
    const q = query(this.shiftsCollection, orderBy('startTime', 'desc'), limit(limitCount));
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
