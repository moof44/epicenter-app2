export type CommissionType = 'PERCENTAGE' | 'FIXED' | 'NONE';

export type CommissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUBMITTED' | 'PAID';

export interface ProductCommission {
  id?: string;
  transactionId: string;
  transactionDate: Date;
  receiptNumber?: string;

  // Product Data
  productId: string;
  productName: string;
  productCategory?: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;

  // Commission Calculations
  commissionType: 'PERCENTAGE' | 'FIXED';
  commissionRate: number;              // Rate applied (e.g. 10 for 10% or ₱50 flat)
  commissionAmount: number;            // Total earned commission

  // Attribution
  sellerId: string;                    // Current credited staff UID
  sellerName: string;                  // Current credited staff name
  cashierId: string;                   // Staff who operated the register
  cashierName: string;

  // Claim / Transfer State
  isClaimPending?: boolean;
  claimantStaffId?: string;
  claimantStaffName?: string;
  claimReason?: string;
  claimRequestedAt?: Date;

  // Customer Data ("Whom it was sold to")
  memberId?: string | null;
  memberName: string;

  // Approval Workflow
  status: CommissionStatus;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: Date;
  rejectionReason?: string;

  // Bills & Payables Integration
  billId?: string | null;
  submittedAt?: Date;
  submittedBy?: string;
  paidAt?: Date;
  paymentSource?: string;
  payoutReferenceNumber?: string;
}

export interface CommissionPayoutSummary {
  staffId: string;
  staffName: string;
  totalAmount: number;
  itemCount: number;
  commissionIds: string[];
}
