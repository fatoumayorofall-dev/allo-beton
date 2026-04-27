// TypeScript declarations for mysql-api.js
export const authAPI: {
  login: (email: string, password: string) => Promise<any>;
  register: (email: string, password: string, firstName: string, lastName: string, company: string, phone: string) => Promise<any>;
  logout: () => Promise<any>;
  getProfile: () => Promise<any>;
  updateProfile: (profileData: any) => Promise<any>;
};

export const productsAPI: {
  getAll: () => Promise<any>;
  getTypes: () => Promise<any>;
  initialize: () => Promise<any>;
  addCarriereType: (name: string, price: number) => Promise<any>;
  getById: (id: string) => Promise<any>;
  create: (productData: any) => Promise<any>;
  update: (id: string, productData: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
  restock: (id: string, restockData: { quantity: number; unitCost?: number; supplier?: string; reference?: string; notes?: string }) => Promise<any>;
  getMovements: (id: string, limit?: number, offset?: number) => Promise<any>;
};

export const suppliersAPI: {
  getAll: () => Promise<any>;
  getById: (id: string) => Promise<any>;
  create: (supplierData: any) => Promise<any>;
  update: (id: string, supplierData: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
};

export const customersAPI: {
  getAll: () => Promise<any>;
  getStats: () => Promise<any>;
  create: (customerData: any) => Promise<any>;
  update: (id: string, customerData: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
  deposit: (id: string, amount: number, notes?: string, payment_method?: string, reference?: string) => Promise<any>;
  getDeposits: (id: string | number) => Promise<any>;
  deduct: (id: string, amount: number, saleId?: string) => Promise<any>;
};

export const salesAPI: {
  getAll: () => Promise<any>;
  getById: (id: string) => Promise<any>;
  create: (saleData: any) => Promise<any>;
  update: (id: string, saleData: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
  importPreview: (formData: FormData) => Promise<any>;
  import: (payload: any) => Promise<any>;
};

export const paymentsAPI: {
  getAll: () => Promise<any>;
  getPendingSales: () => Promise<any>;
  getById: (id: string) => Promise<any>;
  create: (paymentData: any) => Promise<any>;
  update: (id: string, paymentData: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
};

export const purchaseOrdersAPI: {
  create: (orderData: any) => Promise<any>;
  getBySupplier: (supplierId: string) => Promise<any>;
};

export const invoicesAPI: {
  getAll: () => Promise<any>;
  getById: (id: string) => Promise<any>;
  create: (invoiceData: any) => Promise<any>;
  update: (id: string, invoiceData: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
};

export const deliveryNotesAPI: {
  getAll: () => Promise<any>;
  getById: (id: string) => Promise<any>;
  create: (noteData: any) => Promise<any>;
  update: (id: string, noteData: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
};

export const quotasAPI: {
  getAll: (params?: Record<string, string>) => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
  getConsumptions: (id: string) => Promise<any>;
  consume: (id: string, quantity: number, saleId?: string, notes?: string) => Promise<any>;
  getActiveByCustomer: (customerId: string) => Promise<any>;
};

export const creditNotesAPI: {
  getAll: () => Promise<any>;
  getById: (id: string) => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
};

export const settingsAPI: {
  getAll: () => Promise<any>;
  update: (settingsData: any) => Promise<any>;
};

export const dashboardAPI: {
  getStats: () => Promise<any>;
};

export default any;
