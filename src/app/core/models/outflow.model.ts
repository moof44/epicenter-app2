export type OutflowCategory =
  | 'UTILITY_ELECTRICITY'  // Electricity Bill (Meralco / Provider)
  | 'UTILITY_WATER'        // Water Bill (Maynilad / Provider)
  | 'UTILITY_INTERNET'     // Internet & Telco
  | 'SALARY_STAFF'         // Front desk & gym staff wages
  | 'SALARY_COMMISSION'    // Personal trainer commissions
  | 'SALARY_ADVANCE'       // Staff Cash Advance (Vale)
  | 'PURCHASE_INVENTORY'   // Retail products, drinks, supplements
  | 'PURCHASE_EQUIPMENT'   // Gym weights, machines, accessories
  | 'EXPENSE_MAINTENANCE'  // Equipment repair, facility fixes
  | 'EXPENSE_SUPPLIES'     // Cleaning agents, sanitation, drinking water refill
  | 'EXPENSE_MISC'         // General petty cash expenses
  | 'LIABILITY_SUPPLIER'   // Supplier credit / Accounts Payable payment
  | 'LIABILITY_LOAN'       // Debt service / Loan repayment
  | 'LIABILITY_OWNER';     // Owner advance repayment / Drawings

export type OutflowPaymentSource =
  | 'DRAWER_CASH'      // Taken physically from active shift register
  | 'BANK_TRANSFER'    // Paid via BDO/BPI/Bank corporate account
  | 'GCASH_BUSINESS'   // Paid via Gym GCash Merchant/Wallet
  | 'OWNER_ADVANCE';   // Paid out-of-pocket by Owner (increases gym liability to owner)

export type BillStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface BillPaymentRecord {
  id: string;
  amount: number;
  paymentDate: Date;
  paymentSource: OutflowPaymentSource;
  recordedBy: string;
  shiftId?: string;           // Populated if paid from a shift drawer
  referenceNumber?: string;   // GCash Ref / Bank Tx ID / Check No.
  receiptImageUrl?: string;
  notes?: string;
}

export interface PayrollItemRecord {
  staffId: string;
  staffName: string;
  roles?: string[];
  daysPresent: number;
  baseCompensation: number; // Gross Base
  valeDeduction: number;   // Vale Cash Advance
  valeNote?: string;
  adjustmentAmount: number; // Bonus/Commission/Deduction
  adjustmentReason?: string;
  netAmount: number;        // Net Take-Home Pay
}

export interface BillPayable {
  id?: string;
  title: string;              // e.g. "Meralco Bill - August 2026"
  category: OutflowCategory;
  billerOrSupplier: string;   // e.g. "Meralco", "Maynilad", "WheyKing Nutrition"
  invoiceNumber?: string;
  billingPeriodStart?: Date | null;
  billingPeriodEnd?: Date | null;
  dueDate: Date;
  totalAmountDue: number;
  totalAmountPaid: number;
  remainingBalance: number;
  status: BillStatus;
  notes?: string;
  attachmentUrl?: string;     // Bill photo / scan
  payments: BillPaymentRecord[];
  payrollItems?: PayrollItemRecord[];
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

export interface CategoryMetadata {
  category: OutflowCategory;
  label: string;
  group: 'Utilities' | 'Payroll & Staff' | 'Purchases' | 'Operations & Maintenance' | 'Liabilities & Credit';
  icon: string;
  color: string;
}

export const OUTFLOW_CATEGORIES: CategoryMetadata[] = [
  // Utilities
  { category: 'UTILITY_ELECTRICITY', label: 'Electricity Bill', group: 'Utilities', icon: 'bolt', color: '#eab308' },
  { category: 'UTILITY_WATER', label: 'Water Bill', group: 'Utilities', icon: 'water_drop', color: '#0284c7' },
  { category: 'UTILITY_INTERNET', label: 'Internet / Telco', group: 'Utilities', icon: 'wifi', color: '#6366f1' },

  // Payroll & Staff
  { category: 'SALARY_STAFF', label: 'Staff Salary / Wages', group: 'Payroll & Staff', icon: 'badge', color: '#10b981' },
  { category: 'SALARY_COMMISSION', label: 'Trainer Commission', group: 'Payroll & Staff', icon: 'sports', color: '#14b8a6' },
  { category: 'SALARY_ADVANCE', label: 'Staff Cash Advance (Vale)', group: 'Payroll & Staff', icon: 'payments', color: '#f59e0b' },

  // Purchases
  { category: 'PURCHASE_INVENTORY', label: 'Inventory / Store Stock', group: 'Purchases', icon: 'inventory_2', color: '#8b5cf6' },
  { category: 'PURCHASE_EQUIPMENT', label: 'Gym Equipment / Weights', group: 'Purchases', icon: 'fitness_center', color: '#ec4899' },

  // Operations
  { category: 'EXPENSE_SUPPLIES', label: 'Daily Supplies & Water Refill', group: 'Operations & Maintenance', icon: 'local_drink', color: '#06b6d4' },
  { category: 'EXPENSE_MAINTENANCE', label: 'Facility & Machine Repairs', group: 'Operations & Maintenance', icon: 'build', color: '#f97316' },
  { category: 'EXPENSE_MISC', label: 'Miscellaneous Operating Expense', group: 'Operations & Maintenance', icon: 'receipt', color: '#64748b' },

  // Liabilities
  { category: 'LIABILITY_SUPPLIER', label: 'Supplier Credit / Payables', group: 'Liabilities & Credit', icon: 'credit_card', color: '#ef4444' },
  { category: 'LIABILITY_LOAN', label: 'Loan / Debt Repayment', group: 'Liabilities & Credit', icon: 'account_balance', color: '#b91c1c' },
  { category: 'LIABILITY_OWNER', label: 'Owner Advance Repayment', group: 'Liabilities & Credit', icon: 'person', color: '#7c3aed' }
];

export function getOutflowCategoryMeta(cat?: OutflowCategory | string): CategoryMetadata {
  const found = OUTFLOW_CATEGORIES.find(c => c.category === cat);
  return found || { category: 'EXPENSE_MISC', label: (cat as string) || 'General Expense', group: 'Operations & Maintenance', icon: 'receipt', color: '#64748b' };
}
