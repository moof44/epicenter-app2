import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  getDoc,
  Timestamp,
  arrayUnion
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { BillPayable, BillStatus, OutflowCategory, OutflowPaymentSource, PayrollItemRecord } from '../models/outflow.model';
import { CashRegisterService } from './cash-register.service';

@Injectable({
  providedIn: 'root'
})
export class PayablesService {
  private firestore = inject(Firestore);
  private cashRegisterService = inject(CashRegisterService);

  private readonly billsCollection = collection(this.firestore, 'bills_payables');

  // Stream of all bills
  getBills$(): Observable<BillPayable[]> {
    const q = query(this.billsCollection, orderBy('dueDate', 'asc'));
    return (collectionData(q, { idField: 'id' }) as Observable<any[]>).pipe(
      map(bills => bills.map(b => this.convertTimestamps(b)))
    );
  }

  // Create new bill
  async createBill(data: {
    title: string;
    category: OutflowCategory;
    billerOrSupplier: string;
    invoiceNumber?: string;
    billingPeriodStart?: Date | null;
    billingPeriodEnd?: Date | null;
    dueDate: Date;
    totalAmountDue: number;
    notes?: string;
    attachmentUrl?: string;
    payrollItems?: PayrollItemRecord[];
    createdBy: string;
  }): Promise<string> {
    const newBill: any = {
      title: data.title.trim(),
      category: data.category,
      billerOrSupplier: data.billerOrSupplier.trim(),
      invoiceNumber: data.invoiceNumber?.trim() || '',
      billingPeriodStart: data.billingPeriodStart ? Timestamp.fromDate(new Date(data.billingPeriodStart)) : null,
      billingPeriodEnd: data.billingPeriodEnd ? Timestamp.fromDate(new Date(data.billingPeriodEnd)) : null,
      dueDate: Timestamp.fromDate(new Date(data.dueDate)),
      totalAmountDue: Number(data.totalAmountDue),
      totalAmountPaid: 0,
      remainingBalance: Number(data.totalAmountDue),
      status: 'UNPAID' as BillStatus,
      notes: data.notes?.trim() || '',
      attachmentUrl: data.attachmentUrl || '',
      payrollItems: data.payrollItems || [],
      payments: [],
      createdAt: Timestamp.now(),
      createdBy: data.createdBy,
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(this.billsCollection, newBill);
    return docRef.id;
  }

  // Record a partial or full payment on a bill
  async recordPayment(
    billId: string,
    payment: {
      amount: number;
      paymentSource: OutflowPaymentSource;
      referenceNumber?: string;
      notes?: string;
    },
    performedBy: string
  ): Promise<void> {
    const billRef = doc(this.firestore, 'bills_payables', billId);
    const snap = await getDoc(billRef);
    if (!snap.exists()) {
      throw new Error('Bill record not found');
    }

    const bill = snap.data() as any;
    const paymentAmount = Number(payment.amount);
    if (paymentAmount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    const newTotalPaid = (bill.totalAmountPaid || 0) + paymentAmount;
    const newRemaining = Math.max(0, (bill.totalAmountDue || 0) - newTotalPaid);
    const newStatus: BillStatus = newRemaining <= 0 ? 'PAID' : 'PARTIALLY_PAID';

    const paymentRecord: any = {
      id: 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      amount: paymentAmount,
      paymentDate: Timestamp.now(),
      paymentSource: payment.paymentSource,
      recordedBy: performedBy,
      referenceNumber: payment.referenceNumber?.trim() || '',
      notes: payment.notes?.trim() || ''
    };

    // If paid from active shift drawer, automatically log as a shift expense!
    if (payment.paymentSource === 'DRAWER_CASH') {
      const activeShift = this.cashRegisterService.getCurrentShift();
      if (activeShift) {
        paymentRecord.shiftId = activeShift.id;
        await this.cashRegisterService.addExpense(
          paymentAmount,
          'Bill Payment: ' + bill.title + ' (' + bill.billerOrSupplier + ')',
          performedBy,
          bill.category,
          bill.billerOrSupplier,
          billId
        );
      }
    }

    const sanitizedPaymentRecord: any = {};
    Object.keys(paymentRecord).forEach(key => {
      if (paymentRecord[key] !== undefined) {
        sanitizedPaymentRecord[key] = paymentRecord[key];
      }
    });

    await updateDoc(billRef, {
      totalAmountPaid: newTotalPaid,
      remainingBalance: newRemaining,
      status: newStatus,
      payments: arrayUnion(sanitizedPaymentRecord),
      updatedAt: Timestamp.now()
    });
  }

  // Delete bill
  async deleteBill(billId: string): Promise<void> {
    const billRef = doc(this.firestore, 'bills_payables', billId);
    await deleteDoc(billRef);
  }

  // Helper to convert Firestore Timestamps to JS Dates
  private convertTimestamps(bill: any): BillPayable {
    return {
      ...bill,
      dueDate: bill.dueDate?.toDate ? bill.dueDate.toDate() : (bill.dueDate ? new Date(bill.dueDate) : new Date()),
      billingPeriodStart: bill.billingPeriodStart?.toDate ? bill.billingPeriodStart.toDate() : (bill.billingPeriodStart ? new Date(bill.billingPeriodStart) : null),
      billingPeriodEnd: bill.billingPeriodEnd?.toDate ? bill.billingPeriodEnd.toDate() : (bill.billingPeriodEnd ? new Date(bill.billingPeriodEnd) : null),
      createdAt: bill.createdAt?.toDate ? bill.createdAt.toDate() : (bill.createdAt ? new Date(bill.createdAt) : new Date()),
      updatedAt: bill.updatedAt?.toDate ? bill.updatedAt.toDate() : (bill.updatedAt ? new Date(bill.updatedAt) : new Date()),
      payments: (bill.payments || []).map((p: any) => ({
        ...p,
        paymentDate: p.paymentDate?.toDate ? p.paymentDate.toDate() : (p.paymentDate ? new Date(p.paymentDate) : new Date())
      }))
    };
  }
}
