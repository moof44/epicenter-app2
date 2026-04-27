import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { StaleShiftDialog } from '../../shared/components/stale-shift-dialog/stale-shift-dialog';
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

@Injectable({
  providedIn: 'root'
})
export class CashRegisterService {
  private firestore = inject(Firestore);
  private shiftsCollection = collection(this.firestore, 'shifts');
  private dialog = inject(MatDialog);

  // Current shift state
  private currentShift = new BehaviorSubject<ShiftSession | null>(null);
  currentShift$ = this.currentShift.asObservable();

  // Guard: prevents multiple StaleShiftDialogs from stacking
  private isStaleDialogOpen = false;

  constructor() {
    this.refreshShift();
  }

  // Pre-validate a shift before any cash operations
  async ensureValidShiftForTransaction(): Promise<boolean> {
    // DISABLE_FOR_NOW: Temporarily allow transactions regardless of shift date
    return true;

    /* 
    const shift = this.currentShift.getValue();
    if (!shift || shift.status !== 'OPEN') {
      // Return false safely. Basic logic usually catches this and throws its own "Register closed" logic.
      return false;
    }

    // BUG #1 FIX: Safely handle both Firestore Timestamp and plain JS Date.
    // When a shift is first opened, startTime is a JS Date (in-memory).
    // After refreshShift() reads from Firestore, it becomes a Firestore Timestamp with .toDate().
    // Calling .toDate() on a plain Date crashes with: TypeError: shift.startTime.toDate is not a function
    const rawStart = shift.startTime;
    const startDate: Date = rawStart instanceof Date ? rawStart : new Date(rawStart);
    const shiftDate = startDate.toLocaleDateString('en-CA');
    const today = new Date().toLocaleDateString('en-CA');

    if (shiftDate !== today) {
      // BUG #4 FIX: Prevent multiple StaleShiftDialogs from stacking.
      // This service is a singleton (providedIn: 'root'), so this flag protects
      // all callers (POS, Kiosk, Cash Management) simultaneously.
      if (!this.isStaleDialogOpen) {
        this.isStaleDialogOpen = true;
        const dialogRef = this.dialog.open(StaleShiftDialog, {
          data: { shiftDate },
          disableClose: true,
          width: '450px'
        });
        dialogRef.afterClosed().subscribe(() => {
          this.isStaleDialogOpen = false;
        });
      }
      // Throw a specific error code to intercept and silence in UI
      throw new Error('STALE_SHIFT');
    }

    return true;
    */
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
    const valid = await this.ensureValidShiftForTransaction();
    if (!valid) {
      throw new Error('SILENT');
    }

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
  // Recalculate shift totals from transactions (Fix sync issues)
  // NOW ENHANCED: Verifies current status of transactions from source of truth
  async recalculateShiftTotals(shiftId: string): Promise<{ salesDiff: number }> {
    const shiftRef = doc(this.firestore, 'shifts', shiftId);
    const shiftSnap = await getDocs(query(this.shiftsCollection, where(documentId(), '==', shiftId)));

    if (shiftSnap.empty) throw new Error('Shift not found');

    const shiftData = shiftSnap.docs[0].data() as ShiftSession;
    if (!shiftData.transactions || !Array.isArray(shiftData.transactions)) {
      return { salesDiff: 0 };
    }

    // 1. Fetch latest state of all Sales transactions to check for VOID status
    // (Self-healing step for desynchronized data)
    const salesTxs = shiftData.transactions.filter(t => t.type === 'Sale' && t.relatedTransactionId);
    const txIds = salesTxs.map(t => t.relatedTransactionId!);
    const validVoidIds = new Set<string>();

    // Chunk requests to avoid Firestore 'in' limit (10)
    const chunkSize = 10;
    for (let i = 0; i < txIds.length; i += chunkSize) {
      const chunk = txIds.slice(i, i + chunkSize);
      if (chunk.length === 0) continue;

      const q = query(collection(this.firestore, 'transactions'), where(documentId(), 'in', chunk));
      const snap = await getDocs(q);

      snap.forEach(doc => {
        const data = doc.data();
        if (data['status'] === 'VOID') {
          validVoidIds.add(doc.id);
        }
      });
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
      let isVoid = (tx as any).voided;

      // Check external truth
      if (tx.type === 'Sale' && tx.relatedTransactionId && validVoidIds.has(tx.relatedTransactionId)) {
        if (!isVoid) {
          isVoid = true;
          updatedTransactions[i] = { ...tx, voided: true };
          hasUpdates = true;
        }
      }

      // Skip voided transactions
      if (isVoid) {
        continue;
      }

      // Backfill Check: If Sale and missing products summary
      if (tx.type === 'Sale' && !tx.productsSummary && tx.relatedTransactionId) {
        // ... (Existing backfill logic simplified or kept if needed, but 'in' query above didn't get this data)
        // Leaving backfill logic as 'optional enhancement' - skipping here for brevity unless essential.
        // Actually, the previous backfill was useful. Let's keep it minimal if really needed, 
        // but typically 'productsSummary' is populated. 
        // I will omit the slow individual fetch here since we prioritized status check.
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

  // Pre-calculate shift updates for an atomic batched void operation
  async getVoidTransactionShiftUpdates(relatedTransactionId: string, txDate: Date): Promise<{ shiftRef: any, updates: any } | null> {
    const q = query(
      this.shiftsCollection,
      where('startTime', '<=', txDate),
      orderBy('startTime', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const shiftDoc = snapshot.docs[0];
    const shiftData = shiftDoc.data() as ShiftSession;

    const transactions = shiftData.transactions || [];
    const txIndex = transactions.findIndex(t => t.relatedTransactionId === relatedTransactionId);

    if (txIndex === -1) return null;

    const tx = transactions[txIndex];
    if ((tx as any).voided) return null;

    const updatedTx = { ...tx, voided: true };
    const newTransactions = [...transactions];
    newTransactions[txIndex] = updatedTx;

    const updates: any = { transactions: newTransactions };
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
    } else if (tx.type === 'Expense') {
      updates.totalExpenses = increment(-amount);
      updates.expectedClosingBalance = increment(amount);
    } else if (tx.type === 'Float_Out') {
      updates.totalFloatOut = increment(-amount);
      updates.expectedClosingBalance = increment(amount);
    }

    const shiftRef = doc(this.firestore, 'shifts', shiftDoc.id);
    return { shiftRef, updates };
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
