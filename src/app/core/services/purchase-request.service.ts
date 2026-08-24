import { Injectable, inject } from '@angular/core';
import {
    Firestore,
    collection,
    collectionData,
    addDoc,
    doc,
    updateDoc,
    query,
    orderBy,
    getDocs,
    limit,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { PurchaseRequest, PurchaseRequestItem, OutgoingPaymentSource } from '../models/purchase-request.model';
import { PurchaseService } from './purchase.service';
import { AuthService } from './auth.service';
import { createConverter } from '../utils/firestore-converter.utils';

@Injectable({
    providedIn: 'root',
})
export class PurchaseRequestService {
    private firestore = inject(Firestore);
    private purchaseService = inject(PurchaseService);
    private authService = inject(AuthService);

    private requestsCollection = collection(this.firestore, 'purchase_requests').withConverter(
        createConverter<PurchaseRequest>()
    );

    /**
     * Real-time stream of all purchase requests ordered by requested date descending.
     */
    getPurchaseRequests(): Observable<PurchaseRequest[]> {
        const q = query(this.requestsCollection, orderBy('requestedAt', 'desc'));
        return collectionData(q, { idField: 'id' });
    }

    /**
     * Generates a unique sequential PR number: PR-YYYY-XXXX
     */
    private async generateRequestNumber(): Promise<string> {
        const year = new Date().getFullYear();
        const q = query(this.requestsCollection, orderBy('requestNumber', 'desc'), limit(1));
        const snapshot = await getDocs(q);

        let nextSeq = 1;
        if (!snapshot.empty) {
            const lastDoc = snapshot.docs[0].data();
            const lastNum = lastDoc.requestNumber;
            if (lastNum && lastNum.startsWith(`PR-${year}-`)) {
                const seqPart = parseInt(lastNum.replace(`PR-${year}-`, ''), 10);
                if (!isNaN(seqPart)) {
                    nextSeq = seqPart + 1;
                }
            }
        }

        return `PR-${year}-${String(nextSeq).padStart(4, '0')}`;
    }

    /**
     * Submits a new Purchase Request from staff or trainer.
     */
    async createPurchaseRequest(payload: {
        title: string;
        priority: PurchaseRequest['priority'];
        items: PurchaseRequestItem[];
        notes?: string;
        urgencyReason?: string;
    }): Promise<string> {
        const currentUser = this.authService.userProfile();
        const now = new Date();
        const requestNumber = await this.generateRequestNumber();

        const estimatedTotal = payload.items.reduce(
            (sum, item) => sum + (item.estimatedTotalCost || (item.estimatedUnitCost || 0) * item.requestedQuantity),
            0
        );

        const request: PurchaseRequest = {
            requestNumber,
            title: payload.title,
            status: 'PENDING',
            priority: payload.priority,
            items: payload.items.map((i) => ({
                ...i,
                approvedQuantity: i.requestedQuantity,
                estimatedTotalCost: (i.estimatedUnitCost || 0) * i.requestedQuantity,
            })),
            estimatedTotalAmount: estimatedTotal,
            requestedBy: {
                uid: currentUser?.uid || 'unknown',
                displayName: currentUser?.displayName || 'Staff Member',
                role: currentUser?.roles?.[0] || 'STAFF',
            },
            requestedAt: now,
            notes: payload.notes || '',
            urgencyReason: payload.urgencyReason || '',
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await addDoc(this.requestsCollection, request as PurchaseRequest);
        return docRef.id;
    }

    /**
     * Approves a purchase request with optional adjustments to approved quantities.
     */
    async approvePurchaseRequest(
        id: string,
        updates: {
            approvedItems: PurchaseRequestItem[];
            approvalNotes?: string;
        }
    ): Promise<void> {
        const currentUser = this.authService.userProfile();
        const now = new Date();

        const estimatedTotal = updates.approvedItems.reduce(
            (sum, item) => sum + (item.estimatedUnitCost || 0) * (item.approvedQuantity ?? item.requestedQuantity),
            0
        );

        const docRef = doc(this.firestore, 'purchase_requests', id);
        await updateDoc(docRef, {
            status: 'APPROVED',
            items: updates.approvedItems,
            estimatedTotalAmount: estimatedTotal,
            reviewedBy: {
                uid: currentUser?.uid || 'admin',
                displayName: currentUser?.displayName || 'Admin',
            },
            reviewedAt: now,
            approvalNotes: updates.approvalNotes || '',
            updatedAt: now,
        });
    }

    /**
     * Rejects a purchase request with a reason.
     */
    async rejectPurchaseRequest(id: string, rejectionReason: string): Promise<void> {
        const currentUser = this.authService.userProfile();
        const now = new Date();

        const docRef = doc(this.firestore, 'purchase_requests', id);
        await updateDoc(docRef, {
            status: 'REJECTED',
            rejectionReason,
            reviewedBy: {
                uid: currentUser?.uid || 'admin',
                displayName: currentUser?.displayName || 'Admin',
            },
            reviewedAt: now,
            updatedAt: now,
        });
    }

    /**
     * Marks an approved purchase request as ORDERED with supplier & payment metadata.
     */
    async markAsOrdered(
        id: string,
        details: {
            supplierName?: string;
            paidVia?: OutgoingPaymentSource;
            paymentReference?: string;
        }
    ): Promise<void> {
        const now = new Date();
        const docRef = doc(this.firestore, 'purchase_requests', id);
        await updateDoc(docRef, {
            status: 'ORDERED',
            supplierName: details.supplierName || '',
            paidVia: details.paidVia || 'CASH_DRAWER',
            paymentReference: details.paymentReference || '',
            orderedAt: now,
            paidAt: now,
            updatedAt: now,
        });
    }

    /**
     * Fulfills a purchase request:
     * 1. Records official stock intake in PurchaseService for all catalog products (increments physical inventory).
     * 2. Marks request as RECEIVED with actual costs and payment source.
     */
    async fulfillAndRestock(
        id: string,
        request: PurchaseRequest,
        fulfillmentData: {
            items: PurchaseRequestItem[];
            supplierName?: string;
            paidVia?: OutgoingPaymentSource;
            paymentReference?: string;
            receivingNotes?: string;
        }
    ): Promise<void> {
        const currentUser = this.authService.userProfile();
        const now = new Date();

        // 1. Separate catalog products from custom operational supplies
        const catalogItems = fulfillmentData.items.filter(
            (item) => item.productId && (item.receivedQuantity ?? item.approvedQuantity ?? item.requestedQuantity) > 0
        );

        // 2. If there are catalog products, record purchase to increment inventory & log audit
        if (catalogItems.length > 0) {
            const purchaseOrderItems = catalogItems.map((item) => {
                const qty = item.receivedQuantity ?? item.approvedQuantity ?? item.requestedQuantity;
                const unitCost = item.actualUnitCost ?? item.estimatedUnitCost ?? 0;
                return {
                    productId: item.productId!,
                    productName: item.name,
                    quantity: qty,
                    unitCost: unitCost,
                    totalRowCost: qty * unitCost,
                };
            });

            const totalCost = purchaseOrderItems.reduce((sum, i) => sum + i.totalRowCost, 0);

            await this.purchaseService.recordPurchase({
                supplierName: fulfillmentData.supplierName || request.supplierName || 'General Supplier',
                referenceNumber: `${request.requestNumber}${fulfillmentData.paymentReference ? ' / ' + fulfillmentData.paymentReference : ''}`,
                totalCost: totalCost,
                items: purchaseOrderItems,
                date: now,
            });
        }

        // 3. Compute actual total amount across all items (including custom supplies)
        const actualTotalAmount = fulfillmentData.items.reduce((sum, item) => {
            const qty = item.receivedQuantity ?? item.approvedQuantity ?? item.requestedQuantity;
            const cost = item.actualUnitCost ?? item.estimatedUnitCost ?? 0;
            return sum + qty * cost;
        }, 0);

        // 4. Update the PurchaseRequest document to RECEIVED
        const docRef = doc(this.firestore, 'purchase_requests', id);
        await updateDoc(docRef, {
            status: 'RECEIVED',
            items: fulfillmentData.items,
            actualTotalAmount,
            supplierName: fulfillmentData.supplierName || request.supplierName || '',
            paidVia: fulfillmentData.paidVia || request.paidVia || 'CASH_DRAWER',
            paymentReference: fulfillmentData.paymentReference || request.paymentReference || '',
            receivingNotes: fulfillmentData.receivingNotes || '',
            receivedBy: {
                uid: currentUser?.uid || 'admin',
                displayName: currentUser?.displayName || 'Admin',
            },
            receivedAt: now,
            updatedAt: now,
        });
    }
}
