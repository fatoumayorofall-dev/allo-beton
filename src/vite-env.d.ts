/// <reference types="vite/client" />

// Module declarations for mysql-api
declare module './services/mysql-api' {
  export const authAPI: {
    login: (email: string, password: string) => Promise<any>;
    register: (email: string, password: string, firstName: string, lastName: string, company: string, phone: string) => Promise<any>;
    logout: () => Promise<any>;
    getProfile: () => Promise<any>;
    updateProfile: (profileData: any) => Promise<any>;
  };
  export const productsAPI: {
    getAll: () => Promise<any>;
    getById: (id: string) => Promise<any>;
    create: (productData: any) => Promise<any>;
    update: (id: string, productData: any) => Promise<any>;
    delete: (id: string) => Promise<any>;
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
    getById: (id: string) => Promise<any>;
    create: (customerData: any) => Promise<any>;
    update: (id: string, customerData: any) => Promise<any>;
    delete: (id: string) => Promise<any>;
  };
  export const salesAPI: {
    getAll: () => Promise<any>;
    getById: (id: string) => Promise<any>;
    create: (saleData: any) => Promise<any>;
    update: (id: string, saleData: any) => Promise<any>;
    delete: (id: string) => Promise<any>;
  };
  export const paymentsAPI: {
    getAll: () => Promise<any>;
    getById: (id: string) => Promise<any>;
    create: (paymentData: any) => Promise<any>;
    update: (id: string, paymentData: any) => Promise<any>;
    delete: (id: string) => Promise<any>;
  };
  export const purchaseOrdersAPI: {
    create: (orderData: any) => Promise<any>;
    getBySupplier: (supplierId: string) => Promise<any>;
  };
  export const dashboardAPI: {
    getStats: () => Promise<any>;
  };
}

declare module '../services/mysql-api' {
  export const authAPI: {
    login: (email: string, password: string) => Promise<any>;
    register: (email: string, password: string, firstName: string, lastName: string, company: string, phone: string) => Promise<any>;
    logout: () => Promise<any>;
    getProfile: () => Promise<any>;
    updateProfile: (profileData: any) => Promise<any>;
  };
  export const productsAPI: {
    getAll: () => Promise<any>;
    getById: (id: string) => Promise<any>;
    create: (productData: any) => Promise<any>;
    update: (id: string, productData: any) => Promise<any>;
    delete: (id: string) => Promise<any>;
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
    getById: (id: string) => Promise<any>;
    create: (customerData: any) => Promise<any>;
    update: (id: string, customerData: any) => Promise<any>;
    delete: (id: string) => Promise<any>;
  };
  export const salesAPI: {
    getAll: () => Promise<any>;
    getById: (id: string) => Promise<any>;
    create: (saleData: any) => Promise<any>;
    update: (id: string, saleData: any) => Promise<any>;
    delete: (id: string) => Promise<any>;
  };
  export const paymentsAPI: {
    getAll: () => Promise<any>;
    getById: (id: string) => Promise<any>;
    create: (paymentData: any) => Promise<any>;
    update: (id: string, paymentData: any) => Promise<any>;
    delete: (id: string) => Promise<any>;
  };
  export const purchaseOrdersAPI: {
    create: (orderData: any) => Promise<any>;
    getBySupplier: (supplierId: string) => Promise<any>;
  };
  export const dashboardAPI: {
    getStats: () => Promise<any>;
  };
}

declare module '../../services/mysql-api' {
  export const authAPI: {
    login: (email: string, password: string) => Promise<any>;
    register: (email: string, password: string, firstName: string, lastName: string, company: string, phone: string) => Promise<any>;
    logout: () => Promise<any>;
    getProfile: () => Promise<any>;
    updateProfile: (profileData: any) => Promise<any>;
  };
  export const productsAPI: {
    getAll: () => Promise<any>;
    getById: (id: string) => Promise<any>;
    create: (productData: any) => Promise<any>;
    update: (id: string, productData: any) => Promise<any>;
    delete: (id: string) => Promise<any>;
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
    getById: (id: string) => Promise<any>;
    create: (customerData: any) => Promise<any>;
    update: (id: string, customerData: any) => Promise<any>;
    delete: (id: string) => Promise<any>;
  };
  export const salesAPI: {
    getAll: () => Promise<any>;
    getById: (id: string) => Promise<any>;
    create: (saleData: any) => Promise<any>;
    update: (id: string, saleData: any) => Promise<any>;
    delete: (id: string) => Promise<any>;
  };
  export const paymentsAPI: {
    getAll: () => Promise<any>;
    getById: (id: string) => Promise<any>;
    create: (paymentData: any) => Promise<any>;
    update: (id: string, paymentData: any) => Promise<any>;
    delete: (id: string) => Promise<any>;
  };
  export const purchaseOrdersAPI: {
    create: (orderData: any) => Promise<any>;
    getBySupplier: (supplierId: string) => Promise<any>;
  };
  export const dashboardAPI: {
    getStats: () => Promise<any>;
  };
}
