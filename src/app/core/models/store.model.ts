export type ProductCategory = 'Supplement' | 'Drink' | 'Merch';
export type ProductType = 'RETAIL' | 'CONSUMABLE';
export type StockMovementReason = 'SALE' | 'INTERNAL_USE' | 'RESTOCK' | 'AUDIT_ADJUSTMENT';

export interface Product {
  id?: string;
  name: string;
  category: ProductCategory;
  price: number;
  stock: number;
  imageUrl?: string;
  // New fields for Gym Inventory System
  type: ProductType;
  unit: string;
  minStockLevel: number;
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
