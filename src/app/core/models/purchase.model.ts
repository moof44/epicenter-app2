
export interface PurchaseItem {
  productId: string;
  productName: string; // Snapshot of name at time of purchase
  quantity: number;
  unitCost: number; // Buying price per unit
  totalRowCost: number; // quantity * unitCost
}

export interface PurchaseOrder {
  id?: string;
  supplierName?: string;
  date: any; // Firestore Timestamp
  referenceNumber?: string; // e.g. Receipt #
  totalCost: number;
  items: PurchaseItem[];
}
