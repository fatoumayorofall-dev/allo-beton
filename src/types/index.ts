export interface Product {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  category_id?: string;
  supplier_id?: string;
  cost_price?: number;
  selling_price: number;
  tax_rate?: number;
  unit?: string;
  weight?: number;
  dimensions?: string;
  image_url?: string;
  status?: string;
  is_tracked?: boolean;
  created_at?: string;
  updated_at?: string;
  // Relations virtuelles pour l'affichage
  category?: Category;
  supplier?: Supplier;
  inventory?: InventoryItem;
}

export interface Category {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  parent_id?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryItem {
  id: string;
  user_id?: string;
  product_id?: string;
  quantity?: number;
  reserved_quantity?: number;
  min_stock_level?: number;
  max_stock_level?: number;
  reorder_point?: number;
  location?: string;
  last_counted_at?: string;
  last_received_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  user_id?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  company?: string;
  tax_number?: string;
  credit_limit?: number;
  payment_terms?: number;
  status?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Champs calculés
  balance?: number;
  totalPurchases?: number;
}

export interface Supplier {
  id: string;
  user_id?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  contact_person?: string;
  tax_number?: string;
  payment_terms?: number;
  status?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Champs calculés pour l'affichage
  rating?: number;
  totalOrders?: number;
  lastOrderDate?: string;
  productsSupplied?: string[];
}

export interface Sale {
  id: string;
  user_id?: string;
  customer_id?: string;
  sale_number: string;
  status?: string;
  sale_date?: string;
  due_date?: string;
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  shipping_amount?: number;
  total_amount?: number;
  payment_status?: string;
  payment_method?: string;
  notes?: string;
  shipping_address?: string;
  created_at?: string;
  updated_at?: string;
  // Relations
  customer?: Customer;
  items?: SaleItem[];
  // Champs pour compatibilité avec l'interface existante
  customerId?: string;
  customerName?: string;
  sellerName?: string;
  total?: number;
  tax?: number;
  deliveryDate?: string;
}

export interface SaleItem {
  id: string;
  sale_id?: string;
  product_id?: string;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  tax_rate?: number;
  line_total: number;
  created_at?: string;
  // Relations
  product?: Product;
  // Champs pour compatibilité
  productId?: string;
  productName?: string;
  price?: number;
  total?: number;
}

export interface Payment {
  id: string;
  user_id?: string;
  sale_id?: string;
  payment_number: string;
  amount: number;
  payment_method: string;
  payment_date?: string;
  reference_number?: string;
  status?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Champs pour compatibilité
  saleId?: string;
  method?: string;
  reference?: string;
  date?: string;
}

export interface PurchaseOrder {
  id: string;
  user_id?: string;
  supplier_id?: string;
  order_number: string;
  status?: string;
  order_date?: string;
  expected_delivery_date?: string;
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Relations
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id?: string;
  product_id?: string;
  quantity: number;
  unit_cost: number;
  received_quantity?: number;
  line_total: number;
  created_at?: string;
  // Relations
  product?: Product;
}

export interface Profile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  company?: string;
  phone?: string;
  avatar_url?: string;
  position?: string;
  bio?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DashboardStats {
  totalSales: number;
  monthlyRevenue: number;
  pendingOrders: number;
  lowStockItems: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  createdAt: string;
}