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
  // Champs transformés par l'API backend
  price?: number;
  stock?: number;
  minStock?: number;
  min_stock?: number;
  product_type?: string;
  productType?: string;
  variant?: string;
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

export interface StockMovement {
  id: string;
  user_id?: string;
  product_id: string;
  product_name?: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reference_type: 'sale' | 'purchase' | 'adjustment' | 'return';
  reference_id?: string;
  notes?: string;
  unit_cost?: number;
  supplier_name?: string;
  reference_number?: string;
  previous_stock?: number;
  new_stock?: number;
  created_at?: string;
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
  status?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;

  // Champs fiscaux
  tva_exempt?: boolean;
  is_reseller?: boolean;
  wholesale_discount?: number;

  // Champs financiers (snake_case — mapping DB)
  credit_limit?: number;
  current_balance?: number;
  prepaid_balance?: number;
  payment_terms?: number;

  // Champs financiers (camelCase — alias normalizeCustomer)
  creditLimit?: number;
  balance?: number;
  debt?: number;
  prepaidBalance?: number;

  // Type de client
  customer_type?: 'occasionnel' | 'simple' | 'quotataire' | 'revendeur';
  customerType?: 'occasionnel' | 'simple' | 'quotataire' | 'revendeur';

  // Responsable commercial & localisation GPS
  responsable_commercial?: string | null;
  responsableCommercial?: string | null;
  gps_lat?: number | null;
  gps_lng?: number | null;
  gpsLat?: number | null;
  gpsLng?: number | null;

  // Champs calculés (stats)
  totalPurchases?: number;
  totalOrders?: number;
  lastPurchaseDate?: string | null;
  last_purchase_date?: string | null;
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
  sale_type?: 'quotataire' | 'cash' | 'tranche';
  camion?: string;
  type_beton?: string;
  client_name?: string;
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

// ===== FACTURES =====
export interface Invoice {
  id: string;
  user_id?: string;
  invoice_number: string;
  customer_id?: string;
  customer?: Customer;
  customer_name?: string;
  customer_company?: string;
  invoice_date: string;
  due_date?: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  amount_paid?: number;
  notes?: string;
  payment_terms?: string;
  // Infos entreprise
  company_name?: string;
  company_rc?: string;
  company_ninea?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  created_at?: string;
  updated_at?: string;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id?: string;
  description: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  line_total: number;
  product_id?: string;
  product?: Product;
}

// ===== BONS DE TRANSPORT/LIVRAISON =====
export interface DeliveryNote {
  id: string;
  user_id?: string;
  delivery_number: string;
  invoice_id?: string;
  invoice_number?: string;
  invoice?: Invoice;
  customer_id?: string;
  customer?: Customer;
  delivery_date: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'cancelled';
  // Infos transport
  driver_name: string;
  vehicle_plate: string;
  product_type: string;
  loading_location: string;
  delivery_location: string;
  weight_tons: number;
  unloading_time?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ===== QUOTA CLIENT =====
export interface ClientQuota {
  id: string;
  user_id?: string;
  customer_id: string;
  customer_name?: string;
  product_type?: string;
  product_variant?: string;
  product_id?: string;
  product_name?: string;
  product_display?: string;
  quota_initial: number;
  quota_consumed: number;
  quota_remaining: number;
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ===== CONSOMMATION QUOTA =====
export interface QuotaConsumption {
  id: string;
  quota_id: string;
  sale_id?: string;
  sale_number?: string;
  quantity: number;
  consumed_at: string;
  notes?: string;
}

// ===== FACTURE D'AVOIR (CREDIT NOTE) =====
export interface CreditNote {
  id: string;
  user_id?: string;
  credit_note_number: string;
  original_sale_id?: string;
  original_sale_number?: string;
  customer_id: string;
  customer_name?: string;
  status: 'draft' | 'validated' | 'applied';
  reason?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  items?: CreditNoteItem[];
  created_at?: string;
  updated_at?: string;
}

export interface CreditNoteItem {
  id: string;
  credit_note_id?: string;
  product_id?: string;
  productName?: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

// ===== MOUVEMENT DE VENTE =====
export interface SaleMovement {
  id: string;
  user_id?: string;
  movement_date: string;
  customer_id?: string;
  customer?: Customer;
  invoice_id?: string;
  invoice?: Invoice;
  vehicle_plate: string;
  quantity_tons: number;
  payment_mode: 'cash' | 'credit' | 'transfer';
  product_type: string;
  sale_type: 'quotataire' | 'cash' | 'credit';
  notes?: string;
  created_at?: string;
}