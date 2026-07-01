export interface Product {
  id: string;
  name: string;
  barcode: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  isEssential: boolean;
  type: 'part' | 'service';
  description?: string;
  warranty?: string;
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  barcode: string;
  quantity: number;
  price: number;
  cost: number;
  description?: string;
  warranty?: string;
}

export interface Sale {
  id: string;
  timestamp: string;
  items: SaleItem[];
  totalAmount: number;
  totalProfit: number;
  paymentMethod: 'cash' | 'card' | 'mobile_pay';
}

export interface DashboardStats {
  totalSales: number;
  totalProfit: number;
  totalItemsSold: number;
  lowStockCount: number;
}

export interface TrendCategory {
  category: string;
  salesCount: number;
  revenue: number;
  profit: number;
  growth: number; // percentage growth
}

export interface LowStockAlert {
  productId: string;
  productName: string;
  barcode: string;
  stock: number;
  minStock: number;
  isEssential: boolean;
}

export interface AISuggestion {
  title: string;
  description: string;
  type: 'restock' | 'trend' | 'promotion';
  targetCategoryOrProduct?: string;
  severity: 'high' | 'medium' | 'low';
}
