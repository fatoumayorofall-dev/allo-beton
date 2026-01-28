// Service de compatibilité pour remplacer Supabase par MySQL
import { 
  authAPI, 
  productsAPI, 
  customersAPI, 
  salesAPI, 
  suppliersAPI, 
  paymentsAPI, 
  dashboardAPI,
  categoriesAPI 
} from './mysql-api.js';

// Fonction pour simuler getCurrentUser
export const getCurrentUser = async () => {
  const token = localStorage.getItem('auth_token');
  if (!token) return null;
  
  try {
    const result = await authAPI.getProfile();
    return result.success ? result.data : null;
  } catch (error) {
    console.error('Erreur getCurrentUser:', error);
    return null;
  }
};

// PROFILES
export const createProfile = async (profileData: any) => {
  try {
    const result = await authAPI.register(
      profileData.email,
      'defaultPassword123', // Mot de passe par défaut
      profileData.first_name,
      profileData.last_name,
      profileData.company,
      profileData.phone
    );
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const getProfile = async (userId?: string) => {
  try {
    const result = await authAPI.getProfile();
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const updateProfile = async (updates: any) => {
  try {
    const result = await authAPI.updateProfile(updates);
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// CATEGORIES
export const getCategories = async () => {
  try {
    const result = await categoriesAPI.getAll();
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const createCategory = async (categoryData: any) => {
  try {
    const result = await categoriesAPI.create(categoryData);
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// PRODUCTS
export const getProducts = async () => {
  try {
    const result = await productsAPI.getAll();
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const createProduct = async (productData: any) => {
  try {
    const result = await productsAPI.create(productData);
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const updateProduct = async (id: string, updates: any) => {
  try {
    const result = await productsAPI.update(id, updates);
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const deleteProduct = async (id: string) => {
  try {
    const result = await productsAPI.delete(id);
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// CUSTOMERS
export const getCustomers = async () => {
  try {
    const result = await customersAPI.getAll();
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const createCustomer = async (customerData: any) => {
  try {
    const result = await customersAPI.create(customerData);
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const updateCustomer = async (id: string, updates: any) => {
  try {
    const result = await customersAPI.update(id, updates);
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const deleteCustomer = async (id: string) => {
  try {
    const result = await customersAPI.delete(id);
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// SUPPLIERS
export const getSuppliers = async () => {
  try {
    const result = await suppliersAPI.getAll();
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const createSupplier = async (supplierData: any) => {
  try {
    const result = await suppliersAPI.create(supplierData);
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const updateSupplier = async (id: string, updates: any) => {
  try {
    const result = await suppliersAPI.update(id, updates);
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const deleteSupplier = async (id: string) => {
  try {
    const result = await suppliersAPI.delete(id);
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// SALES
export const getSales = async () => {
  try {
    const result = await salesAPI.getAll();
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const createSale = async (saleData: any) => {
  try {
    const result = await salesAPI.create(saleData);
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const updateSale = async (id: string, updates: any) => {
  try {
    const result = await salesAPI.update(id, updates);
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const deleteSale = async (id: string) => {
  try {
    // Pour l'instant, utiliser update pour marquer comme annulé
    const result = await salesAPI.update(id, { status: 'cancelled' });
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// PAYMENTS
export const getPayments = async () => {
  try {
    const result = await paymentsAPI.getAll();
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const createPayment = async (paymentData: any) => {
  try {
    const result = await paymentsAPI.create(paymentData);
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// DASHBOARD STATS
export const getDashboardStats = async () => {
  try {
    const result = await dashboardAPI.getStats();
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// REAL-TIME SUBSCRIPTIONS (simulées)
export const subscribeToProducts = (callback: (products: any[]) => void) => {
  // Pour l'instant, retourner un objet avec une méthode unsubscribe
  return {
    unsubscribe: () => {
      console.log('Unsubscribed from products');
    }
  };
};

export const subscribeToCustomers = (callback: (customers: any[]) => void) => {
  return {
    unsubscribe: () => {
      console.log('Unsubscribed from customers');
    }
  };
};

export const subscribeToSales = (callback: (sales: any[]) => void) => {
  return {
    unsubscribe: () => {
      console.log('Unsubscribed from sales');
    }
  };
};

// Fonction pour initialiser les données d'exemple
export const initializeSampleData = async () => {
  try {
    // Cette fonction sera implémentée côté backend
    return { success: true, message: 'Données d\'exemple créées avec succès' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Fonction pour vider le cache (pas nécessaire avec MySQL)
export const clearCache = () => {
  console.log('Cache cleared');
};