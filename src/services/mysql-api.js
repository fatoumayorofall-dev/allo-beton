const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api';

// Configuration par défaut pour fetch
const defaultOptions = {
  headers: {
    'Content-Type': 'application/json',
  },
};

// Fonction pour obtenir le token d'authentification
const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

// Fonction pour ajouter le token aux en-têtes
const getAuthHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Fonction utilitaire pour faire des requêtes API
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...getAuthHeaders(),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Erreur HTTP: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`Erreur API ${endpoint}:`, error);
    
    // Gérer les erreurs d'authentification (sans boucle infinie)
    if (error.message.includes('Token') || error.message.includes('401')) {
      if (localStorage.getItem('auth_token')) {
        localStorage.removeItem('auth_token');
        // Éviter le reload en boucle — rediriger proprement
        if (!window._authRedirecting) {
          window._authRedirecting = true;
          window.location.href = '/';
        }
      }
    }
    
    throw error;
  }
};

// API d'authentification
export const authAPI = {
  login: async (email, password) => {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login: email, password }),
    });
    
    if (response.success && response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    
    return response;
  },

  register: async (email, password, firstName, lastName, company, phone) => {
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        firstName,
        lastName,
        company,
        phone,
      }),
    });
    
    if (response.success && response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    
    return response;
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    return Promise.resolve({ success: true });
  },

  getProfile: () => apiRequest('/auth/profile'),

  updateProfile: (profileData) => apiRequest('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  }),

  changePassword: (currentPassword, newPassword) => apiRequest('/auth/change-password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  }),

  resetPassword: async (email) => {
    // Pour l'instant, retourner un succès simulé
    return { success: true, message: 'Email de réinitialisation envoyé' };
  },
};

// API des produits
export const productsAPI = {
  getAll: () => apiRequest('/products'),

  getTypes: () => apiRequest('/products/types'),

  initialize: () => apiRequest('/products/initialize', { method: 'POST' }),

  addCarriereType: (name, price) => apiRequest('/products/variants/carriere', {
    method: 'POST',
    body: JSON.stringify({ name, price }),
  }),

  create: (productData) => apiRequest('/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  }),

  update: (id, productData) => apiRequest(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(productData),
  }),

  delete: (id) => apiRequest(`/products/${id}`, {
    method: 'DELETE',
  }),

  restock: (id, restockData) => apiRequest(`/products/${id}/restock`, {
    method: 'POST',
    body: JSON.stringify(restockData),
  }),

  getMovements: (id, limit = 50, offset = 0) =>
    apiRequest(`/products/${id}/movements?limit=${limit}&offset=${offset}`),

  getAllMovements: (params = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', params.limit);
    if (params.offset) query.set('offset', params.offset);
    if (params.type) query.set('type', params.type);
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    if (params.search) query.set('search', params.search);
    return apiRequest(`/products/movements/all?${query.toString()}`);
  },
};

// API des clients
export const customersAPI = {
  getAll: () => apiRequest('/customers'),

  getStats: () => apiRequest('/customers/stats'),

  create: (customerData) => apiRequest('/customers', {
    method: 'POST',
    body: JSON.stringify(customerData),
  }),

  update: (id, customerData) => apiRequest(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(customerData),
  }),

  delete: (id) => apiRequest(`/customers/${id}`, {
    method: 'DELETE',
  }),

  // Dépôt pour quotataires (recharger solde prépayé) - AVEC TRAÇABILITÉ
  deposit: (id, amount, notes, payment_method, reference) => apiRequest(`/customers/${id}/deposit`, {
    method: 'POST',
    body: JSON.stringify({ amount, notes, payment_method, reference }),
  }),

  // Récupérer l'historique des dépôts avec traçabilité
  getDeposits: (id) => apiRequest(`/customers/${id}/deposits`),

  // Déduire du solde prépayé (lors d'une vente)
  deduct: (id, amount, saleId) => apiRequest(`/customers/${id}/deduct`, {
    method: 'POST',
    body: JSON.stringify({ amount, saleId }),
  }),
};

// API des ventes
export const salesAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);
    if (params.date_from) query.set('date_from', params.date_from);
    if (params.date_to) query.set('date_to', params.date_to);
    if (params.sale_type) query.set('sale_type', params.sale_type);
    if (params.type_beton) query.set('type_beton', params.type_beton);
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    const qs = query.toString();
    return apiRequest(`/sales${qs ? '?' + qs : ''}`);
  },

  getById: (id) => apiRequest(`/sales/${id}`),

  create: (saleData) => apiRequest('/sales', {
    method: 'POST',
    body: JSON.stringify(saleData),
  }),

  update: (id, saleData) => apiRequest(`/sales/${id}`, {
    method: 'PUT',
    body: JSON.stringify(saleData),
  }),

  duplicate: (id) => apiRequest(`/sales/${id}/duplicate`, {
    method: 'POST',
  }),

  importPreview: async (formData) => {
    const url = `${API_BASE_URL}/sales/import/preview`;
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await fetch(url, { method: 'POST', body: formData, headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erreur import preview');
    return data;
  },

  import: (payload) => apiRequest('/sales/import', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
};

// API des fournisseurs
export const suppliersAPI = {
  getAll: () => apiRequest('/suppliers'),
  
  create: (supplierData) => apiRequest('/suppliers', {
    method: 'POST',
    body: JSON.stringify(supplierData),
  }),
  
  update: (id, supplierData) => apiRequest(`/suppliers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(supplierData),
  }),
  
  delete: (id) => apiRequest(`/suppliers/${id}`, {
    method: 'DELETE',
  }),
};

// API des paiements
export const paymentsAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/payments${query ? '?' + query : ''}`);
  },

  getPendingSales: () => apiRequest('/payments/pending-sales'),

  create: (paymentData) => apiRequest('/payments', {
    method: 'POST',
    body: JSON.stringify(paymentData),
  }),

  cancel: (paymentId) => apiRequest(`/payments/${paymentId}/cancel`, {
    method: 'PUT',
  }),
};

// API du tableau de bord
export const dashboardAPI = {
  getStats: () => apiRequest('/dashboard/stats'),
};

// API des paramètres
export const settingsAPI = {
  getAll: () => apiRequest('/settings'),
  
  update: (settingsData) => apiRequest('/settings', {
    method: 'PUT',
    body: JSON.stringify(settingsData),
  }),
};

// API des catégories
export const categoriesAPI = {
  getAll: () => apiRequest('/categories'),
  
  create: (categoryData) => apiRequest('/categories', {
    method: 'POST',
    body: JSON.stringify(categoryData),
  }),
};

// API des commandes fournisseur
export const purchaseOrdersAPI = {
  create: (orderData) => apiRequest('/purchase-orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  }),

  getAll: () => apiRequest('/purchase-orders'),

  getBySupplier: (supplierId) => apiRequest(`/purchase-orders/supplier/${supplierId}`),

  updateStatus: (id, status) => apiRequest(`/purchase-orders/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }),

  receive: (id, items) => apiRequest(`/purchase-orders/${id}/receive`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  }),
};

// API des factures
export const invoicesAPI = {
  getAll: () => apiRequest('/invoices'),
  
  getById: (id) => apiRequest(`/invoices/${id}`),
  
  create: (invoiceData) => apiRequest('/invoices', {
    method: 'POST',
    body: JSON.stringify(invoiceData),
  }),
  
  update: (id, invoiceData) => apiRequest(`/invoices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(invoiceData),
  }),
  
  delete: (id) => apiRequest(`/invoices/${id}`, {
    method: 'DELETE',
  }),
};

// API des bons de transport
export const deliveryNotesAPI = {
  getAll: () => apiRequest('/delivery-notes'),
  
  getById: (id) => apiRequest(`/delivery-notes/${id}`),
  
  create: (noteData) => apiRequest('/delivery-notes', {
    method: 'POST',
    body: JSON.stringify(noteData),
  }),
  
  update: (id, noteData) => apiRequest(`/delivery-notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(noteData),
  }),
  
  delete: (id) => apiRequest(`/delivery-notes/${id}`, {
    method: 'DELETE',
  }),
};

// API des quotas clients
export const quotasAPI = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/quotas${qs ? '?' + qs : ''}`);
  },
  create: (data) => apiRequest('/quotas', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`/quotas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiRequest(`/quotas/${id}`, { method: 'DELETE' }),
  // Historique de consommation d'un quota
  getConsumptions: (id) => apiRequest(`/quotas/${id}/consumptions`),
  // Consommer du quota
  consume: (id, quantity, saleId, notes) => apiRequest(`/quotas/${id}/consume`, {
    method: 'POST',
    body: JSON.stringify({ quantity, sale_id: saleId, notes }),
  }),
  // Obtenir le quota actif d'un client
  getActiveByCustomer: (customerId) => apiRequest(`/quotas/customer/${customerId}/active`),
};

// API des avoirs (credit notes)
export const creditNotesAPI = {
  getAll: () => apiRequest('/credit-notes'),
  getById: (id) => apiRequest(`/credit-notes/${id}`),
  create: (data) => apiRequest('/credit-notes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`/credit-notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiRequest(`/credit-notes/${id}`, { method: 'DELETE' }),
};

// API de santé
export const healthAPI = {
  check: () => apiRequest('/health'),
};

// API des notifications
export const notificationsAPI = {
  getAll: () => apiRequest('/notifications'),
  
  markAsRead: (id) => apiRequest(`/notifications/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ read: true }),
  }),
  
  markAllAsRead: () => apiRequest('/notifications/mark-all-read', {
    method: 'PUT',
  }),
  
  create: (notificationData) => apiRequest('/notifications', {
    method: 'POST',
    body: JSON.stringify(notificationData),
  }),
};

// API Gestion Bancaire
export const banksAPI = {
  // Banques
  getAll: () => apiRequest('/banks'),
  getById: (id) => apiRequest(`/banks/${id}`),
  create: (data) => apiRequest('/banks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`/banks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiRequest(`/banks/${id}`, { method: 'DELETE' }),

  // Comptes
  getAccounts: (bankId) => apiRequest(`/banks/${bankId}/accounts`),
  createAccount: (bankId, data) => apiRequest(`/banks/${bankId}/accounts`, { method: 'POST', body: JSON.stringify(data) }),
  updateAccount: (id, data) => apiRequest(`/banks/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAccount: (id) => apiRequest(`/banks/accounts/${id}`, { method: 'DELETE' }),

  // Prêts / Dettes
  getAllLoans: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/banks/loans/all${query ? '?' + query : ''}`);
  },
  createLoan: (data) => apiRequest('/banks/loans', { method: 'POST', body: JSON.stringify(data) }),
  updateLoan: (id, data) => apiRequest(`/banks/loans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLoan: (id) => apiRequest(`/banks/loans/${id}`, { method: 'DELETE' }),

  // Échéances
  getSchedules: (loanId) => apiRequest(`/banks/loans/${loanId}/schedules`),
  getUpcomingSchedules: (days = 30) => apiRequest(`/banks/schedules/upcoming?days=${days}`),
  createSchedule: (loanId, data) => apiRequest(`/banks/loans/${loanId}/schedules`, { method: 'POST', body: JSON.stringify(data) }),
  generateSchedules: (loanId, data) => apiRequest(`/banks/loans/${loanId}/schedules/generate`, { method: 'POST', body: JSON.stringify(data) }),
  paySchedule: (id, data) => apiRequest(`/banks/schedules/${id}/pay`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSchedule: (id) => apiRequest(`/banks/schedules/${id}`, { method: 'DELETE' }),

  // Résumé
  getSummary: () => apiRequest('/banks/summary/overview'),
};

// API Partenaires Investisseurs
export const partnersAPI = {
  getAll: () => apiRequest('/partners'),
  getById: (id) => apiRequest(`/partners/${id}`),
  create: (data) => apiRequest('/partners', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`/partners/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiRequest(`/partners/${id}`, { method: 'DELETE' }),
  getSummary: () => apiRequest('/partners/summary'),
  // Contrats
  getAllContracts: () => apiRequest('/partners/contracts/all'),
  createContract: (data) => apiRequest('/partners/contracts', { method: 'POST', body: JSON.stringify(data) }),
  updateContract: (id, data) => apiRequest(`/partners/contracts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteContract: (id) => apiRequest(`/partners/contracts/${id}`, { method: 'DELETE' }),
  getContractPayments: (contractId) => apiRequest(`/partners/contracts/${contractId}/payments`),
  // Paiements
  createPayment: (data) => apiRequest('/partners/payments', { method: 'POST', body: JSON.stringify(data) }),
  deletePayment: (id) => apiRequest(`/partners/payments/${id}`, { method: 'DELETE' }),
  getUpcomingPayments: () => apiRequest('/partners/payments/upcoming'),
};

// Fonction utilitaire pour vérifier si l'utilisateur est connecté
export const isAuthenticated = () => {
  return !!getAuthToken();
};

export default {
  get: (endpoint) => apiRequest(endpoint),
  post: (endpoint, data) => apiRequest(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: (endpoint, data) => apiRequest(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' }),
  auth: authAPI,
  products: productsAPI,
  customers: customersAPI,
  sales: salesAPI,
  suppliers: suppliersAPI,
  payments: paymentsAPI,
  dashboard: dashboardAPI,
  settings: settingsAPI,
  categories: categoriesAPI,
  notifications: notificationsAPI,
  purchaseOrders: purchaseOrdersAPI,
  invoices: invoicesAPI,
  deliveryNotes: deliveryNotesAPI,
  quotas: quotasAPI,
  creditNotes: creditNotesAPI,
  banks: banksAPI,
  partners: partnersAPI,
  health: healthAPI,
  isAuthenticated,
};