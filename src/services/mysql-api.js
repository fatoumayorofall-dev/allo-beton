const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
    
    // Gérer les erreurs d'authentification
    if (error.message.includes('Token') || error.message.includes('401')) {
      localStorage.removeItem('auth_token');
      window.location.reload();
    }
    
    throw error;
  }
};

// API d'authentification
export const authAPI = {
  login: async (email, password) => {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
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
};

// API des clients
export const customersAPI = {
  getAll: () => apiRequest('/customers'),
  
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
};

// API des ventes
export const salesAPI = {
  getAll: () => apiRequest('/sales'),
  
  create: (saleData) => apiRequest('/sales', {
    method: 'POST',
    body: JSON.stringify(saleData),
  }),
  
  update: (id, saleData) => apiRequest(`/sales/${id}`, {
    method: 'PUT',
    body: JSON.stringify(saleData),
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
  getAll: () => apiRequest('/payments'),
  
  create: (paymentData) => apiRequest('/payments', {
    method: 'POST',
    body: JSON.stringify(paymentData),
  }),
};

// API du tableau de bord
export const dashboardAPI = {
  getStats: () => apiRequest('/dashboard/stats'),
};

// API des catégories
export const categoriesAPI = {
  getAll: () => apiRequest('/categories'),
  
  create: (categoryData) => apiRequest('/categories', {
    method: 'POST',
    body: JSON.stringify(categoryData),
  }),
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

// Fonction utilitaire pour vérifier si l'utilisateur est connecté
export const isAuthenticated = () => {
  return !!getAuthToken();
};

export default {
  auth: authAPI,
  products: productsAPI,
  customers: customersAPI,
  sales: salesAPI,
  suppliers: suppliersAPI,
  payments: paymentsAPI,
  dashboard: dashboardAPI,
  categories: categoriesAPI,
  notifications: notificationsAPI,
  health: healthAPI,
  isAuthenticated,
};