export type ProductCategory = 'Supplement' | 'Drink' | 'Merch';

export interface Product {
  id?: string;
  name: string;
  category: ProductCategory;
  price: number;
  stock: number;
  imageUrl?: string;
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

export interface ProductSalesData {
  productId: string;
  productName: string;
  totalQuantitySold: number;
  totalRevenue: number;
}
