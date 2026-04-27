/**
 * ALLO BÉTON - CONTEXTE E-COMMERCE
 * Gestion globale du state e-commerce (panier, client, etc.)
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { cartAPI, customersAPI, Cart, Customer } from '../services/ecommerce-api';

// Constantes e-commerce
export const ECOMMERCE_CONFIG = {
  TAX_RATE: 0.18, // 18% TVA
  FREE_SHIPPING_THRESHOLD: 500000, // 500 000 FCFA
  CURRENCY: 'FCFA',
  CURRENCY_SYMBOL: 'F',
  LOCALE: 'fr-FR',
};

interface EcommerceContextType {
  // Panier
  cart: Cart | null;
  cartLoading: boolean;
  cartError: string | null;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateCartItem: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => Promise<void>;
  refreshCart: () => Promise<void>;

  // Client
  customer: Customer | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  login: (identifier: string, password: string) => Promise<boolean>;
  loginWithGoogle: (credential: string) => Promise<boolean>;
  loginWithFacebook: (accessToken: string) => Promise<boolean>;
  loginWithApple: (idToken: string, user?: any) => Promise<boolean>;
  register: (data: any) => Promise<{ needs_verification?: boolean; email?: string; needs_otp?: boolean; phone?: string }>;
  verifyRegistrationOTP: (phone: string, otp: string) => Promise<void>;
  resendRegistrationOTP: (phone: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string; dev_reset_link?: string }>;
  resetPassword: (customerId: string, token: string, newPassword: string) => Promise<boolean>;
  refreshCustomer: () => Promise<void>;

  // Utils
  formatPrice: (amount: number) => string;
}

const defaultCart: Cart = {
  id: null,
  status: 'active',
  subtotal: 0,
  tax_amount: 0,
  discount_amount: 0,
  shipping_cost: 0,
  total: 0,
  item_count: 0,
  quantity_total: 0,
  free_shipping_threshold: 500000,
  free_shipping_remaining: 500000,
  items: [],
};

const EcommerceContext = createContext<EcommerceContextType | undefined>(undefined);

// Messages d'erreur localisés
const ERROR_MESSAGES: Record<string, string> = {
  'Network Error': 'Erreur de connexion. Vérifiez votre connexion internet.',
  'Request failed with status code 401': 'Session expirée. Veuillez vous reconnecter.',
  'Request failed with status code 403': 'Accès refusé. Vous n\'avez pas les droits nécessaires.',
  'Request failed with status code 404': 'Ressource non trouvée.',
  'Request failed with status code 500': 'Erreur serveur. Veuillez réessayer plus tard.',
  'ECONNREFUSED': 'Impossible de se connecter au serveur.',
};

const getErrorMessage = (error: any): string => {
  const message = error?.message || error?.response?.data?.message || String(error);
  return ERROR_MESSAGES[message] || message;
};

export const EcommerceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<Cart>(defaultCart);
  const [cartLoading, setCartLoading] = useState(true);
  const [cartError, setCartError] = useState<string | null>(null);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Formater prix en FCFA
  const formatPrice = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' F';
  };

  // Charger le panier
  const refreshCart = useCallback(async () => {
    try {
      setCartLoading(true);
      setCartError(null);
      const response = await cartAPI.get();
      if (response.success) {
        setCart(response.data);
      }
    } catch (error: any) {
      console.error('Erreur chargement panier:', error);
      setCartError(getErrorMessage(error));
    } finally {
      setCartLoading(false);
    }
  }, []);

  // Fusionner le panier anonyme avec le panier client après login
  const mergeAndRefreshCart = useCallback(async () => {
    try {
      const sessionId = localStorage.getItem('ecom_session_id');
      if (sessionId) {
        await cartAPI.merge(sessionId).catch(() => {}); // non-bloquant
      }
    } finally {
      await refreshCart();
    }
  }, [refreshCart]);

  // Charger le profil client
  const refreshCustomer = useCallback(async () => {
    if (!customersAPI.isAuthenticated()) {
      setCustomer(null);
      setAuthLoading(false);
      return;
    }

    try {
      setAuthLoading(true);
      const response = await customersAPI.getProfile();
      if (response.success) {
        setCustomer(response.data);
      }
    } catch (error) {
      console.error('Erreur profil:', error);
      customersAPI.logout();
      setCustomer(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // Init au montage
  useEffect(() => {
    refreshCart();
    refreshCustomer();
  }, [refreshCart, refreshCustomer]);

  // Intercepteur session expirée (401 global depuis ecommerce-api.ts)
  useEffect(() => {
    const handleExpired = () => {
      setCustomer(null);
      setCart(defaultCart);
      try {
        localStorage.removeItem('allo_beton_avatar');
        localStorage.removeItem('allo_dash_tab');
      } catch { /* silent */ }
    };
    window.addEventListener('ecom_session_expired', handleExpired);
    return () => window.removeEventListener('ecom_session_expired', handleExpired);
  }, []);

  // Ajouter au panier (optimistic UI: badge incrémenté immédiatement, rollback si échec)
  const addToCart = async (productId: string, quantity = 1) => {
    const snapshot = cart;
    // Optimistic: bump des compteurs visibles dans la navbar
    setCart(prev => prev ? {
      ...prev,
      item_count: (prev.item_count || 0) + quantity,
      quantity_total: (prev.quantity_total || 0) + quantity,
    } : prev);
    try {
      setCartLoading(true);
      setCartError(null);
      const response = await cartAPI.addItem(productId, quantity);
      if (response.success) {
        setCart(response.data);
      } else {
        // Rollback
        setCart(snapshot);
      }
    } catch (error: any) {
      // Rollback complet sur erreur
      setCart(snapshot);
      const errorMsg = getErrorMessage(error);
      setCartError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setCartLoading(false);
    }
  };

  // Modifier quantité
  const updateCartItem = async (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    try {
      setCartError(null);
      const response = await cartAPI.updateItem(itemId, quantity);
      if (response.success) {
        setCart(response.data);
      }
    } catch (error: any) {
      const errorMsg = getErrorMessage(error);
      setCartError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  // Supprimer du panier
  const removeFromCart = async (itemId: string) => {
    try {
      setCartError(null);
      const response = await cartAPI.removeItem(itemId);
      if (response.success) {
        setCart(response.data);
      }
    } catch (error: any) {
      const errorMsg = getErrorMessage(error);
      setCartError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  // Vider le panier
  const clearCart = async () => {
    try {
      setCartError(null);
      await cartAPI.clear();
      setCart(defaultCart);
    } catch (error: any) {
      const errorMsg = getErrorMessage(error);
      setCartError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  // Appliquer coupon
  const applyCoupon = async (code: string): Promise<boolean> => {
    if (!code.trim()) {
      setCartError('Veuillez entrer un code promo');
      return false;
    }
    try {
      setCartError(null);
      const response = await cartAPI.applyCoupon(code.trim().toUpperCase());
      if (response.success) {
        setCart(response.data);
        return true;
      }
      setCartError('Code promo invalide ou expiré');
      return false;
    } catch (error: any) {
      setCartError(getErrorMessage(error) || 'Code promo invalide');
      return false;
    }
  };

  // Retirer coupon
  const removeCoupon = async () => {
    try {
      setCartError(null);
      const response = await cartAPI.removeCoupon();
      if (response.success) {
        setCart(response.data);
      }
    } catch (error: any) {
      setCartError(getErrorMessage(error));
    }
  };

  // Connexion
  const login = async (identifier: string, password: string): Promise<boolean> => {
    try {
      setAuthLoading(true);
      const response = await customersAPI.login(identifier, password);
      if (response.success) {
        setCustomer(response.data);
        await mergeAndRefreshCart();
        return true;
      }
      return false;
    } catch (error: any) {
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  // Inscription
  const register = async (data: any): Promise<{ needs_verification?: boolean; email?: string; needs_otp?: boolean; phone?: string }> => {
    try {
      setAuthLoading(true);
      const response = await customersAPI.register(data);
      if (response.success) {
        if (response.needs_otp) {
          return { needs_otp: true, phone: response.phone };
        }
        if (response.needs_verification) {
          return { needs_verification: true, email: response.data?.email };
        }
        setCustomer(response.data);
        await mergeAndRefreshCart();
        return {};
      }
      return {};
    } catch (error: any) {
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  // Vérifier OTP WhatsApp d'inscription
  const verifyRegistrationOTP = async (phone: string, otp: string): Promise<void> => {
    try {
      setAuthLoading(true);
      const response = await customersAPI.verifyRegistrationOTP(phone, otp);
      if (response.success) {
        setCustomer(response.data);
        await mergeAndRefreshCart();
      }
    } catch (error: any) {
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  // Renvoyer OTP WhatsApp d'inscription
  const resendRegistrationOTP = async (phone: string): Promise<void> => {
    await customersAPI.resendRegistrationOTP(phone);
  };

  // Connexion Google
  const loginWithGoogle = async (credential: string): Promise<boolean> => {
    try {
      setAuthLoading(true);
      const response = await customersAPI.loginWithGoogle(credential);
      if (response.success) {
        setCustomer(response.data);
        await mergeAndRefreshCart();
        return true;
      }
      return false;
    } catch (error: any) {
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  // Connexion Apple
  const loginWithApple = async (idToken: string, user?: any): Promise<boolean> => {
    try {
      setAuthLoading(true);
      const response = await customersAPI.loginWithApple(idToken, user);
      if (response.success) {
        setCustomer(response.data);
        await mergeAndRefreshCart();
        return true;
      }
      return false;
    } catch (error: any) {
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  // Connexion Facebook
  const loginWithFacebook = async (accessToken: string): Promise<boolean> => {
    try {
      setAuthLoading(true);
      const response = await customersAPI.loginWithFacebook(accessToken);
      if (response.success) {
        setCustomer(response.data);
        await mergeAndRefreshCart();
        return true;
      }
      return false;
    } catch (error: any) {
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  // Déconnexion
  const logout = async () => {
    await customersAPI.logout();
    setCustomer(null);
    // Nettoyer toutes les données personnelles du localStorage
    try {
      localStorage.removeItem('allo_beton_avatar');
      localStorage.removeItem('allo_dash_tab');
    } catch { /* silent */ }
    await refreshCart();
  };

  // Mot de passe oublié
  const forgotPassword = async (email: string) => {
    try {
      const res = await customersAPI.forgotPassword(email);
      return res;
    } catch (e: any) {
      throw e;
    }
  };

  // Réinitialisation
  const resetPassword = async (customerId: string, token: string, newPassword: string): Promise<boolean> => {
    try {
      const res = await customersAPI.resetPassword(customerId, token, newPassword);
      return !!res.success;
    } catch (e: any) {
      throw e;
    }
  };

  const value: EcommerceContextType = {
    cart,
    cartLoading,
    cartError,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    applyCoupon,
    removeCoupon,
    refreshCart,
    customer,
    isAuthenticated: !!customer,
    authLoading,
    login,
    loginWithGoogle,
    loginWithFacebook,
    loginWithApple,
    register,
    verifyRegistrationOTP,
    resendRegistrationOTP,
    logout,
    forgotPassword,
    resetPassword,
    refreshCustomer,
    formatPrice,
  };

  return (
    <EcommerceContext.Provider value={value}>
      {children}
    </EcommerceContext.Provider>
  );
};

export const useEcommerce = (): EcommerceContextType => {
  const context = useContext(EcommerceContext);
  if (context === undefined) {
    throw new Error('useEcommerce must be used within an EcommerceProvider');
  }
  return context;
};

export default EcommerceContext;
