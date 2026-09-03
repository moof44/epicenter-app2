import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  addDoc,
  updateDoc,
  serverTimestamp,
  documentId
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ProductCommission, CommissionStatus, CommissionPayoutSummary } from '../models/commission.model';
import { Transaction } from '../models/store.model';
import { BillPayable } from '../models/outflow.model';
import { PayablesService } from './payables.service';

@Injectable({
  providedIn: 'root'
})
export class CommissionService {
  private firestore = inject(Firestore);
  private payablesService = inject(PayablesService);

  private readonly commissionsCol = collection(this.firestore, 'commissions');
  private readonly transactionsCol = collection(this.firestore, 'transactions');
  private readonly billsCol = collection(this.firestore, 'bills_payables');

  // Convert timestamps to Date
  private convertCommissionDates(item: any): ProductCommission {
    return {
      ...item,
      transactionDate: item.transactionDate?.toDate ? item.transactionDate.toDate() : (item.transactionDate ? new Date(item.transactionDate) : new Date()),
      reviewedAt: item.reviewedAt?.toDate ? item.reviewedAt.toDate() : (item.reviewedAt ? new Date(item.reviewedAt) : undefined),
      submittedAt: item.submittedAt?.toDate ? item.submittedAt.toDate() : (item.submittedAt ? new Date(item.submittedAt) : undefined),
      paidAt: item.paidAt?.toDate ? item.paidAt.toDate() : (item.paidAt ? new Date(item.paidAt) : undefined),
      claimRequestedAt: item.claimRequestedAt?.toDate ? item.claimRequestedAt.toDate() : (item.claimRequestedAt ? new Date(item.claimRequestedAt) : undefined)
    };
  }

  // Stream of pending commissions for manager queue
  getPendingCommissions$(): Observable<ProductCommission[]> {
    const q = query(
      this.commissionsCol,
      where('status', '==', 'PENDING'),
      orderBy('transactionDate', 'desc'),
      limit(200)
    );
    return collectionData(q, { idField: 'id' }).pipe(
      map(items => items.map(i => this.convertCommissionDates(i)))
    );
  }

  // Stream of approved commissions waiting for cash out
  getApprovedCommissions$(): Observable<ProductCommission[]> {
    const q = query(
      this.commissionsCol,
      where('status', '==', 'APPROVED'),
      orderBy('transactionDate', 'desc'),
      limit(200)
    );
    return collectionData(q, { idField: 'id' }).pipe(
      map(items => items.map(i => this.convertCommissionDates(i)))
    );
  }

  // Stream of staff commissions (self-service)
  getStaffCommissions$(sellerId: string): Observable<ProductCommission[]> {
    const q = query(
      this.commissionsCol,
      where('sellerId', '==', sellerId),
      orderBy('transactionDate', 'desc'),
      limit(300)
    );
    return collectionData(q, { idField: 'id' }).pipe(
      map(items => items.map(i => this.convertCommissionDates(i)))
    );
  }

  // Stream of historical / submitted commissions (payout history)
  getSubmittedCommissions$(limitCount = 200): Observable<ProductCommission[]> {
    const q = query(
      this.commissionsCol,
      where('status', 'in', ['SUBMITTED', 'PAID']),
      orderBy('submittedAt', 'desc'),
      limit(limitCount)
    );
    return collectionData(q, { idField: 'id' }).pipe(
      map(items => items.map(i => this.convertCommissionDates(i)))
    );
  }

  // Batch approve commissions
  async approveCommissions(commissionIds: string[], reviewedBy: string, reviewedByName: string): Promise<void> {
    if (!commissionIds.length) return;
    const batch = writeBatch(this.firestore);
    const now = new Date();

    for (const id of commissionIds) {
      const commRef = doc(this.commissionsCol, id);
      batch.update(commRef, {
        status: 'APPROVED' as CommissionStatus,
        reviewedBy,
        reviewedByName,
        reviewedAt: now,
        rejectionReason: null
      });
    }
    await batch.commit();
  }

  // Batch reject commissions
  async rejectCommissions(commissionIds: string[], rejectionReason: string, reviewedBy: string, reviewedByName: string): Promise<void> {
    if (!commissionIds.length) return;
    const batch = writeBatch(this.firestore);
    const now = new Date();

    for (const id of commissionIds) {
      const commRef = doc(this.commissionsCol, id);
      batch.update(commRef, {
        status: 'REJECTED' as CommissionStatus,
        reviewedBy,
        reviewedByName,
        reviewedAt: now,
        rejectionReason: rejectionReason || 'Denied by manager'
      });
    }
    await batch.commit();
  }

  // Staff claims a sale attribution
  async requestAttributionClaim(
    transactionId: string,
    claimantStaffId: string,
    claimantStaffName: string,
    claimReason: string
  ): Promise<void> {
    const txRef = doc(this.transactionsCol, transactionId);
    const now = new Date();

    await updateDoc(txRef, {
      commissionClaimStatus: 'CLAIM_PENDING',
      claimantStaffId,
      claimantStaffName,
      claimReason: claimReason || 'Claimed by selling coach',
      claimRequestedAt: now
    });

    // Also flag linked commissions
    const commQuery = query(this.commissionsCol, where('transactionId', '==', transactionId));
    const commSnap = await getDocs(commQuery);
    if (!commSnap.empty) {
      const batch = writeBatch(this.firestore);
      commSnap.forEach(d => {
        batch.update(d.ref, {
          isClaimPending: true,
          claimantStaffId,
          claimantStaffName,
          claimReason,
          claimRequestedAt: now
        });
      });
      await batch.commit();
    }
  }

  // Manager approves attribution claim -> updates seller and downstream reports
  async approveAttributionClaim(
    transactionId: string,
    reviewedBy: string,
    reviewedByName: string
  ): Promise<void> {
    const txRef = doc(this.transactionsCol, transactionId);
    const commQuery = query(this.commissionsCol, where('transactionId', '==', transactionId));
    const commSnap = await getDocs(commQuery);

    const batch = writeBatch(this.firestore);

    // Read tx claimant info
    let claimantId = '';
    let claimantName = '';

    if (!commSnap.empty) {
      const firstComm = commSnap.docs[0].data() as ProductCommission;
      claimantId = firstComm.claimantStaffId || '';
      claimantName = firstComm.claimantStaffName || '';

      commSnap.forEach(d => {
        batch.update(d.ref, {
          sellerId: claimantId,
          sellerName: claimantName,
          isClaimPending: false,
          claimantStaffId: null,
          claimantStaffName: null,
          claimReason: null,
          reviewedBy,
          reviewedByName,
          reviewedAt: new Date()
        });
      });
    }

    batch.update(txRef, {
      commissionClaimStatus: 'CLAIM_APPROVED',
      attributedStaffId: claimantId,
      attributedStaffName: claimantName,
      staffName: claimantName // Updates reports.service.ts staff performance!
    });

    await batch.commit();
  }

  // Manager denies attribution claim
  async rejectAttributionClaim(
    transactionId: string,
    rejectionReason: string,
    reviewedBy: string,
    reviewedByName: string
  ): Promise<void> {
    const txRef = doc(this.transactionsCol, transactionId);
    const commQuery = query(this.commissionsCol, where('transactionId', '==', transactionId));
    const commSnap = await getDocs(commQuery);

    const batch = writeBatch(this.firestore);

    if (!commSnap.empty) {
      commSnap.forEach(d => {
        batch.update(d.ref, {
          isClaimPending: false,
          claimReason: rejectionReason,
          reviewedBy,
          reviewedByName,
          reviewedAt: new Date()
        });
      });
    }

    batch.update(txRef, {
      commissionClaimStatus: 'CLAIM_REJECTED'
    });

    await batch.commit();
  }

  // Cash out approved commissions to Bills & Payables (individual bill per staff)
  async postCommissionsToBills(
    selectedCommissions: ProductCommission[],
    submittedBy: string
  ): Promise<string[]> {
    if (!selectedCommissions.length) return [];

    // Group by sellerId
    const groups = new Map<string, { staffName: string; commissions: ProductCommission[] }>();
    for (const comm of selectedCommissions) {
      const key = comm.sellerId || 'UNKNOWN_STAFF';
      const existing = groups.get(key) || { staffName: comm.sellerName || 'Staff Member', commissions: [] };
      existing.commissions.push(comm);
      groups.set(key, existing);
    }

    const createdBillIds: string[] = [];
    const now = new Date();

    for (const [staffId, group] of groups.entries()) {
      const staffTotal = Math.round(group.commissions.reduce((sum, c) => sum + c.commissionAmount, 0) * 100) / 100;
      const commissionIds = group.commissions.map(c => c.id!).filter(Boolean);

      // Create individual bill payable in bills_payables
      const newBill: any = {
        title: `Sales Commission Payout - ${group.staffName}`,
        category: 'SALARY_STAFF',
        dueDate: now,
        amount: staffTotal,
        remainingBalance: staffTotal,
        status: 'UNPAID',
        isRecurring: false,
        payee: group.staffName,
        metadata: {
          payoutType: 'COMMISSION',
          staffId,
          staffName: group.staffName,
          commissionIds,
          itemCount: commissionIds.length
        },
        payrollItems: [{
          staffId,
          staffName: group.staffName,
          netAmount: staffTotal,
          baseCompensation: 0,
          daysPresent: 0,
          adjustmentAmount: staffTotal,
          adjustmentReason: `Sales Commission (${commissionIds.length} items)`
        }],
        createdAt: now,
        updatedAt: now
      };

      const billDocRef = await addDoc(this.billsCol, newBill);
      createdBillIds.push(billDocRef.id);

      // Lock commission documents to status: SUBMITTED
      const batch = writeBatch(this.firestore);
      for (const commId of commissionIds) {
        const commRef = doc(this.commissionsCol, commId);
        batch.update(commRef, {
          status: 'SUBMITTED' as CommissionStatus,
          billId: billDocRef.id,
          submittedAt: now,
          submittedBy
        });
      }
      await batch.commit();
    }

    return createdBillIds;
  }
}
