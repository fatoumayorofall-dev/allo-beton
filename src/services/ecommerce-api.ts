/**
 * ALLO BÉTON - SERVICE API E-COMMERCE
 * Client API pour le module e-commerce
 */

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/ecommerce`;

// ============================================================
// HELPERS
// ============================================================

const getHeaders = (includeAuth = true): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = localStorage.getItem('ecom_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Session ID pour paniers anonymes
  let sessionId = localStorage.getItem('ecom_session_id');
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('ecom_session_id', sessionId);
  }
  headers['X-Session-ID'] = sessionId;

  return headers;
};

const handleResponse = async (response: Response) => {
  const data = await response.json();
  if (!response.ok) {
    // Intercepteur 401 : session expirée → déconnexion automatique
    if (response.status === 401) {
      localStorage.removeItem('ecom_token');
      localStorage.removeItem('allo_beton_avatar');
      window.dispatchEvent(new CustomEvent('ecom_session_expired'));
    }
    throw new Error(data.error || 'Erreur serveur');
  }
  return data;
};

// ============================================================
// TYPES
// ============================================================

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  category_id?: string;
  category_name?: string;
  category_slug?: string;
  description?: string;
  short_description?: string;
  price: number;
  compare_price?: number;
  unit: string;
  min_quantity: number;
  step_quantity: number;
  stock_quantity: number;
  stock_status: 'in_stock' | 'out_of_stock' | 'on_backorder';
  image_url?: string;
  gallery?: string[];
  specifications?: Record<string, any>;
  is_featured: boolean;
  rating_avg: number;
  rating_count: number;
  sold_count: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  product_count?: number;
}

export interface CartItem {
  id: string;
  product_id: string;
  name: string;
  slug: string;
  sku: string;
  image_url?: string;
  unit: string;
  quantity: number;
  min_quantity: number;
  step_quantity: number;
  unit_price: number;
  current_price: number;
  price_changed: boolean;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total_price: number;
  stock_quantity: number;
  stock_status: string;
  in_stock: boolean;
}

export interface Cart {
  id: string | null;
  customer_id?: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  shipping_cost: number;
  total: number;
  coupon_code?: string;
  item_count: number;
  quantity_total: number;
  free_shipping_threshold: number;
  free_shipping_remaining: number;
  items: CartItem[];
}

export interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total: number;
  amount_paid: number;
  amount_due: number;
  shipping_address?: string;
  shipping_city?: string;
  created_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total: number;
  image_url?: string;
}

export interface Customer {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  customer_type: string;
  is_verified: boolean;
}

export interface Address {
  id: string;
  type: 'billing' | 'shipping';
  label?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  region?: string;
  postal_code?: string;
  phone?: string;
  instructions?: string;
  is_default: boolean;
}

// ============================================================
// API PRODUITS
// ============================================================

export const productsAPI = {
  /**
   * Liste des produits avec filtres
   */
  getAll: async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    min_price?: number;
    max_price?: number;
    sort?: string;
    order?: 'ASC' | 'DESC';
    featured?: boolean;
    in_stock?: boolean;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });
    }
    const response = await fetch(`${API_BASE}/products?${queryParams}`, {
      headers: getHeaders(false),
    });
    return handleResponse(response);
  },

  /**
   * Produits mis en avant
   */
  getFeatured: async (limit = 8) => {
    const response = await fetch(`${API_BASE}/products/featured?limit=${limit}`, {
      headers: getHeaders(false),
    });
    return handleResponse(response);
  },

  /**
   * Meilleures ventes
   */
  getBestsellers: async (limit = 8) => {
    const response = await fetch(`${API_BASE}/products/bestsellers?limit=${limit}`, {
      headers: getHeaders(false),
    });
    return handleResponse(response);
  },

  /**
   * Détail d'un produit
   */
  getBySlug: async (slug: string) => {
    const response = await fetch(`${API_BASE}/products/${slug}`, {
      headers: getHeaders(false),
    });
    return handleResponse(response);
  },

  /**
   * Liste des catégories
   */
  getCategories: async () => {
    const response = await fetch(`${API_BASE}/products/categories/list`, {
      headers: getHeaders(false),
    });
    return handleResponse(response);
  },

  // ═══ ADMIN METHODS ═══

  /**
   * Créer un produit (Admin)
   */
  create: async (data: Partial<Product>) => {
    const response = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Mettre à jour un produit (Admin)
   */
  update: async (id: string, data: Partial<Product>) => {
    const response = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Supprimer un produit (Admin)
   */
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Créer une catégorie (Admin)
   */
  createCategory: async (data: { name: string; description?: string; image_url?: string }) => {
    const response = await fetch(`${API_BASE}/products/categories`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Mettre à jour une catégorie (Admin)
   */
  updateCategory: async (id: string, data: Partial<Category>) => {
    const response = await fetch(`${API_BASE}/products/categories/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Supprimer une catégorie (Admin)
   */
  deleteCategory: async (id: string) => {
    const response = await fetch(`${API_BASE}/products/categories/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};

// ============================================================
// API PANIER
// ============================================================

export const cartAPI = {
  /**
   * Récupérer le panier
   */
  get: async (): Promise<{ success: boolean; data: Cart }> => {
    const response = await fetch(`${API_BASE}/cart`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Ajouter un produit
   */
  addItem: async (productId: string, quantity = 1) => {
    const response = await fetch(`${API_BASE}/cart/items`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ product_id: productId, quantity }),
    });
    return handleResponse(response);
  },

  /**
   * Modifier quantité
   */
  updateItem: async (itemId: string, quantity: number) => {
    const response = await fetch(`${API_BASE}/cart/items/${itemId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ quantity }),
    });
    return handleResponse(response);
  },

  /**
   * Supprimer un item
   */
  removeItem: async (itemId: string) => {
    const response = await fetch(`${API_BASE}/cart/items/${itemId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Vider le panier
   */
  clear: async () => {
    const response = await fetch(`${API_BASE}/cart`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Appliquer un code promo
   */
  applyCoupon: async (code: string) => {
    const response = await fetch(`${API_BASE}/cart/coupon`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ code }),
    });
    return handleResponse(response);
  },

  /**
   * Retirer le code promo
   */
  removeCoupon: async () => {
    const response = await fetch(`${API_BASE}/cart/coupon`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Fusionner le panier anonyme (session_id) avec le panier du client connecté
   * À appeler juste après login
   */
  merge: async (sessionId: string) => {
    const response = await fetch(`${API_BASE}/cart/merge`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ session_id: sessionId }),
    });
    return handleResponse(response);
  },
};

// ============================================================
// API COMMANDES
// ============================================================

export const ordersAPI = {
  /**
   * Créer une commande
   */
  create: async (data: {
    shipping_address?: Address;
    billing_address?: Address;
    shipping_method?: string;
    customer_notes?: string;
    use_same_address?: boolean;
  }) => {
    const response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Liste des commandes du client
   */
  getAll: async (params?: { page?: number; limit?: number; status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });
    }
    const response = await fetch(`${API_BASE}/orders?${queryParams}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Détail d'une commande
   */
  getById: async (id: string) => {
    const response = await fetch(`${API_BASE}/orders/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Annuler une commande
   */
  cancel: async (id: string, reason?: string) => {
    const response = await fetch(`${API_BASE}/orders/${id}/cancel`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    });
    return handleResponse(response);
  },

  /**
   * Créer une commande via WhatsApp
   */
  createWhatsApp: async (data: {
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    customer_address?: string;
    items: { name: string; quantity: number; unit_price: number; unit?: string }[];
    notes?: string;
  }) => {
    const response = await fetch(`${API_BASE}/orders/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // ═══ ADMIN METHODS ═══

  /**
   * Liste admin des commandes
   */
  adminList: async (params?: { page?: number; limit?: number; status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });
    }
    const response = await fetch(`${API_BASE}/orders/admin/list?${queryParams}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Statistiques des commandes (Admin)
   */
  getStats: async () => {
    const response = await fetch(`${API_BASE}/orders/admin/stats`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Mettre à jour le statut d'une commande (Admin)
   */
  updateStatus: async (id: string, status: string) => {
    const response = await fetch(`${API_BASE}/orders/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    return handleResponse(response);
  },
};

// ============================================================
// API PAIEMENTS
// ============================================================

export const paymentsAPI = {
  /**
   * Initier un paiement
   */
  initiate: async (orderId: string, method: 'wave' | 'orange_money' | 'free_money' | 'card' | 'cash', phone?: string) => {
    const response = await fetch(`${API_BASE}/payments/initiate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ order_id: orderId, method, phone }),
    });
    return handleResponse(response);
  },

  /**
   * Confirmer un paiement
   */
  confirm: async (paymentId: string, paymentMethodId?: string) => {
    const response = await fetch(`${API_BASE}/payments/${paymentId}/confirm`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ payment_method_id: paymentMethodId }),
    });
    return handleResponse(response);
  },

  /**
   * Vérifier le statut
   */
  checkStatus: async (paymentId: string) => {
    const response = await fetch(`${API_BASE}/payments/${paymentId}/status`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};

// ============================================================
// API FACTURES
// ============================================================

export const invoicesAPI = {
  /**
   * Liste des factures du client
   */
  getAll: async (params?: { page?: number; limit?: number; type?: string; status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });
    }
    const response = await fetch(`${API_BASE}/invoices?${queryParams}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Détail d'une facture
   */
  getById: async (id: string) => {
    const response = await fetch(`${API_BASE}/invoices/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Télécharger le PDF (token client)
   */
  downloadPdf: async (id: string, invoiceNumber?: string) => {
    const token = localStorage.getItem('ecom_token');
    const response = await fetch(`${API_BASE}/invoices/${id}/pdf`, {
      headers: { 'Authorization': token ? `Bearer ${token}` : '' },
    });
    if (!response.ok) throw new Error('Impossible de télécharger la facture');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `facture-${invoiceNumber || id}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Télécharger le PDF (token admin ERP)
   */
  adminDownloadPdf: async (id: string, invoiceNumber?: string) => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/invoices/${id}/pdf`, {
      headers: { 'Authorization': token ? `Bearer ${token}` : '' },
    });
    if (!response.ok) throw new Error('Impossible de télécharger la facture');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `facture-${invoiceNumber || id}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Envoyer la facture par email (admin)
   */
  send: async (id: string, email?: string) => {
    const response = await fetch(`${API_BASE}/invoices/${id}/send`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(email ? { email } : {}),
    });
    return handleResponse(response);
  },

  /**
   * Liste admin des factures
   */
  adminList: async (params?: { page?: number; limit?: number; status?: string; type?: string; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });
    }
    const response = await fetch(`${API_BASE}/invoices/admin/list?${queryParams}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};

// ============================================================
// API CLIENTS
// ============================================================

export const customersAPI = {
  /**
   * Inscription
   */
  register: async (data: {
    email?: string;
    phone: string;
    password: string;
    first_name: string;
    last_name: string;
    company_name?: string;
    company_ninea?: string;
    customer_type?: 'particulier' | 'professionnel' | 'entreprise';
  }) => {
    const response = await fetch(`${API_BASE}/customers/register`, {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify(data),
    });
    const result = await handleResponse(response);
    if (result.success && result.data?.token) {
      localStorage.setItem('ecom_token', result.data.token);
    }
    return result;
  },

  /**
   * Connexion
   */
  login: async (identifier: string, password: string) => {
    const response = await fetch(`${API_BASE}/customers/login`, {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify({ login: identifier, password }),
    });
    const result = await handleResponse(response);
    if (result.success && result.data.token) {
      localStorage.setItem('ecom_token', result.data.token);
    }
    return result;
  },

  /**
   * Connexion via Google OAuth (ID token depuis @react-oauth/google)
   */
  loginWithGoogle: async (credential: string) => {
    const response = await fetch(`${API_BASE}/customers/auth/google`, {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify({ credential }),
    });
    const result = await handleResponse(response);
    if (result.success && result.data.token) {
      localStorage.setItem('ecom_token', result.data.token);
    }
    return result;
  },

  /**
   * Connexion via Facebook OAuth (access_token depuis FB.login)
   */
  loginWithFacebook: async (access_token: string) => {
    const response = await fetch(`${API_BASE}/customers/auth/facebook`, {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify({ access_token }),
    });
    const result = await handleResponse(response);
    if (result.success && result.data.token) {
      localStorage.setItem('ecom_token', result.data.token);
    }
    return result;
  },

  /**
   * Connexion via Apple Sign In (id_token depuis AppleID.auth.signIn)
   */
  loginWithApple: async (id_token: string, user?: any) => {
    const response = await fetch(`${API_BASE}/customers/auth/apple`, {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify({ id_token, user }),
    });
    const result = await handleResponse(response);
    if (result.success && result.data.token) {
      localStorage.setItem('ecom_token', result.data.token);
    }
    return result;
  },

  /**
   * Envoyer un code OTP SMS pour vérifier le téléphone
   */
  sendPhoneOtp: async (phone: string) => {
    const response = await fetch(`${API_BASE}/customers/send-phone-otp`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ phone }),
    });
    return handleResponse(response);
  },

  /**
   * Vérifier le code OTP reçu par SMS
   */
  verifyPhoneOtp: async (otp: string) => {
    const response = await fetch(`${API_BASE}/customers/verify-phone-otp`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ otp }),
    });
    return handleResponse(response);
  },

  /**
   * Vérifier l'OTP WhatsApp reçu lors de l'inscription
   */
  verifyRegistrationOTP: async (phone: string, otp: string) => {
    const response = await fetch(`${API_BASE}/customers/verify-registration-otp`, {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify({ phone, otp }),
    });
    const result = await handleResponse(response);
    if (result.success && result.data?.token) {
      localStorage.setItem('ecom_token', result.data.token);
    }
    return result;
  },

  /**
   * Renvoyer l'OTP WhatsApp d'inscription
   */
  resendRegistrationOTP: async (phone: string) => {
    const response = await fetch(`${API_BASE}/customers/resend-registration-otp`, {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify({ phone }),
    });
    return handleResponse(response);
  },

  /**
   * Renvoyer l'email de vérification
   */
  resendVerification: async () => {
    const response = await fetch(`${API_BASE}/customers/resend-verification`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Déconnexion (appelle /logout côté serveur + nettoie le token local)
   */
  logout: async () => {
    try {
      await fetch(`${API_BASE}/customers/logout`, {
        method: 'POST',
        headers: getHeaders(),
      });
    } catch { /* non bloquant */ }
    localStorage.removeItem('ecom_token');
  },

  /**
   * Demande de réinitialisation du mot de passe (envoi email)
   */
  forgotPassword: async (email: string) => {
    const response = await fetch(`${API_BASE}/customers/forgot-password`, {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify({ email }),
    });
    return handleResponse(response);
  },

  /**
   * Réinitialisation effective avec token
   */
  resetPassword: async (customerId: string, token: string, newPassword: string) => {
    const response = await fetch(`${API_BASE}/customers/reset-password`, {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify({ customer_id: customerId, token, new_password: newPassword }),
    });
    return handleResponse(response);
  },

  /**
   * Profil
   */
  getProfile: async () => {
    const response = await fetch(`${API_BASE}/customers/me`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Modifier le profil
   */
  updateProfile: async (data: Partial<Customer>) => {
    const response = await fetch(`${API_BASE}/customers/me`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Changer le mot de passe
   */
  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await fetch(`${API_BASE}/customers/password`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    return handleResponse(response);
  },

  /**
   * Liste des adresses
   */
  getAddresses: async () => {
    const response = await fetch(`${API_BASE}/customers/addresses`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Ajouter une adresse
   */
  addAddress: async (address: Partial<Address>) => {
    const response = await fetch(`${API_BASE}/customers/addresses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(address),
    });
    return handleResponse(response);
  },

  /**
   * Modifier une adresse
   */
  updateAddress: async (id: string, address: Partial<Address>) => {
    const response = await fetch(`${API_BASE}/customers/addresses/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(address),
    });
    return handleResponse(response);
  },

  /**
   * Supprimer une adresse
   */
  deleteAddress: async (id: string) => {
    const response = await fetch(`${API_BASE}/customers/addresses/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Sauvegarder la photo de profil en DB (base64 data URL)
   */
  uploadAvatar: async (avatarData: string | null) => {
    const response = await fetch(`${API_BASE}/customers/avatar`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ avatar_data: avatarData }),
    });
    return handleResponse(response);
  },

  /**
   * Envoyer un message de support
   */
  sendSupport: async (subject: string, message: string) => {
    const response = await fetch(`${API_BASE}/customers/support`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ subject, message }),
    });
    return handleResponse(response);
  },

  /**
   * Vérifier si connecté
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('ecom_token');
  },
};

// ============================================================
// REVIEWS API
// ============================================================

export interface Review {
  id: string;
  customer_name: string;
  rating: number;
  title?: string | null;
  comment: string;
  verified_purchase: 0 | 1;
  helpful_count: number;
  admin_reply?: string | null;
  created_at: string;
}

export interface ReviewStats {
  total: number;
  average: number;
  distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
}

export const reviewsAPI = {
  /**
   * Liste des avis approuvés d'un produit
   */
  list: async (productId: string, opts?: { limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    if (opts?.limit) params.set('limit', String(opts.limit));
    if (opts?.offset) params.set('offset', String(opts.offset));
    const qs = params.toString();
    const response = await fetch(
      `${API_BASE}/reviews/${productId}${qs ? `?${qs}` : ''}`,
      { headers: getHeaders(false) }
    );
    return handleResponse(response) as Promise<{
      success: boolean;
      data: Review[];
      stats: ReviewStats;
    }>;
  },

  /**
   * Créer un avis (auth optionnelle)
   */
  create: async (data: {
    product_id: string;
    customer_name: string;
    customer_email?: string;
    rating: number;
    title?: string;
    comment: string;
  }) => {
    const response = await fetch(`${API_BASE}/reviews`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Marquer un avis comme utile
   */
  markHelpful: async (id: string) => {
    const response = await fetch(`${API_BASE}/reviews/${id}/helpful`, {
      method: 'POST',
      headers: getHeaders(false),
    });
    return handleResponse(response);
  },
};

// Export par défaut
export default {
  products: productsAPI,
  cart: cartAPI,
  orders: ordersAPI,
  payments: paymentsAPI,
  invoices: invoicesAPI,
  customers: customersAPI,
  reviews: reviewsAPI,
};
