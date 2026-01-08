export type ProductCategory = 'Supplement' | 'Drink' | 'Merch' | 'Fitness';
export type ProductType = 'RETAIL' | 'CONSUMABLE';
export type StockMovementReason = 'SALE' | 'INTERNAL_USE' | 'RESTOCK' | 'AUDIT_ADJUSTMENT';

export interface Product {
  id?: string;
  name: string;
  category: 'Supplement' | 'Drink' | 'Merch' | 'Fitness';
  price: number;
  stock: number;
  imageUrl?: string;
  // New fields for Gym Inventory System
  type: 'RETAIL' | 'CONSUMABLE';
  unit: string;
  minStockLevel: number;
  // Cost tracking
  lastCostPrice?: number;
  averageCost?: number;
}

export interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Transaction {
  id?: string;
  date: any; // Firestore Timestamp or Date
  totalAmount: number;
  items: CartItem[];
}

export interface InventoryLog {
  id?: string;
  productId: string;
  productName: string; // Snapshot
  type: StockMovementReason;
  changeAmount: number;
  previousStock: number;
  newStock: number; // Snapshot
  timestamp: any; // Firestore Timestamp
  performedBy: string;
  notes?: string;
}

export interface StockMovement {
  id?: string;
  productId: string;
  changeAmount: number;
  reason: StockMovementReason;
  timestamp: any; // Firestore Timestamp or Date
  performedBy?: string;
  notes?: string;
}

export interface ProductSalesData {
  productId: string;
  productName: string;
  totalQuantitySold: number;
  totalRevenue: number;
}
