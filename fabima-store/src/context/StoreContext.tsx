import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { INITIAL_PRODUCTS } from '../data/catalog';
import type { CartItem, Order, OrderStatus, Product } from '../data/types';
import { PROMO_CODES, SITE_CONFIG } from '../config/site';

/* ------------------------------------------------------------------ */
/*  Persistance locale                                                 */
/* ------------------------------------------------------------------ */

const KEYS = {
  products: 'fabima_products',
  cart: 'fabima_cart',
  wishlist: 'fabima_wishlist',
  orders: 'fabima_orders',
  recent: 'fabima_recent',
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage indisponible (navigation privée) : on continue sans persister */
  }
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface Totals {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  itemCount: number;
}

interface StoreContextValue {
  products: Product[];
  getProduct: (idOrSlug: string) => Product | undefined;
  saveProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  resetCatalog: () => void;

  cart: CartItem[];
  addToCart: (product: Product, opts?: { size?: string; color?: string; quantity?: number }) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeFromCart: (key: string) => void;
  clearCart: () => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;

  promoCode: string | null;
  applyPromo: (code: string) => boolean;
  removePromo: () => void;
  computeTotals: (deliveryFee: number) => Totals;

  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;

  recentlyViewed: string[];
  markViewed: (productId: string) => void;

  orders: Order[];
  placeOrder: (order: Omit<Order, 'id' | 'createdAt' | 'status' | 'history'>) => Order;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  markOrderPaid: (id: string) => void;
  findOrder: (id: string, phone: string) => Order | undefined;

  toasts: Toast[];
  notify: (message: string, type?: Toast['type']) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => load(KEYS.products, INITIAL_PRODUCTS));
  const [cart, setCart] = useState<CartItem[]>(() => load(KEYS.cart, []));
  const [wishlist, setWishlist] = useState<string[]>(() => load(KEYS.wishlist, []));
  const [orders, setOrders] = useState<Order[]>(() => load(KEYS.orders, []));
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(() => load(KEYS.recent, []));
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => save(KEYS.products, products), [products]);
  useEffect(() => save(KEYS.cart, cart), [cart]);
  useEffect(() => save(KEYS.wishlist, wishlist), [wishlist]);
  useEffect(() => save(KEYS.orders, orders), [orders]);
  useEffect(() => save(KEYS.recent, recentlyViewed), [recentlyViewed]);

  const notify = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  }, []);

  /* ---------- Produits ---------- */
  const getProduct = useCallback(
    (idOrSlug: string) => products.find(p => p.id === idOrSlug || p.slug === idOrSlug),
    [products],
  );

  const saveProduct = useCallback((product: Product) => {
    setProducts(list => {
      const exists = list.some(p => p.id === product.id);
      return exists ? list.map(p => (p.id === product.id ? product : p)) : [product, ...list];
    });
  }, []);

  const deleteProduct = useCallback((id: string) => setProducts(list => list.filter(p => p.id !== id)), []);
  const resetCatalog = useCallback(() => setProducts(INITIAL_PRODUCTS), []);

  /* ---------- Panier ---------- */
  const addToCart: StoreContextValue['addToCart'] = useCallback((product, opts = {}) => {
    const size = opts.size || undefined;
    const color = opts.color || undefined;
    const quantity = opts.quantity ?? 1;
    const key = [product.id, size ?? '', color ?? ''].join('|');
    setCart(items => {
      const existing = items.find(i => i.key === key);
      if (existing) {
        return items.map(i => (i.key === key ? { ...i, quantity: Math.min(i.quantity + quantity, product.stock) } : i));
      }
      return [...items, { key, productId: product.id, name: product.name, image: product.images[0], price: product.price, size, color, quantity }];
    });
    notify(`« ${product.name} » ajouté au panier`);
  }, [notify]);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setCart(items => (quantity <= 0 ? items.filter(i => i.key !== key) : items.map(i => (i.key === key ? { ...i, quantity } : i))));
  }, []);

  const removeFromCart = useCallback((key: string) => setCart(items => items.filter(i => i.key !== key)), []);
  const clearCart = useCallback(() => { setCart([]); setPromoCode(null); }, []);

  /* ---------- Promo & totaux ---------- */
  const applyPromo = useCallback((code: string) => {
    const normalized = code.trim().toUpperCase();
    if (!PROMO_CODES[normalized]) return false;
    setPromoCode(normalized);
    return true;
  }, []);
  const removePromo = useCallback(() => setPromoCode(null), []);

  const computeTotals = useCallback((deliveryFee: number): Totals => {
    const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const itemCount = cart.reduce((s, i) => s + i.quantity, 0);
    const promo = promoCode ? PROMO_CODES[promoCode] : undefined;
    let discount = 0;
    if (promo?.percent) discount = Math.round((subtotal * promo.percent) / 100);
    if (promo?.amount && subtotal >= 40000) discount = promo.amount;
    const freeShipping = promo?.freeShipping || subtotal - discount >= SITE_CONFIG.freeShippingThreshold;
    const fee = freeShipping ? 0 : deliveryFee;
    return { subtotal, discount, deliveryFee: fee, total: Math.max(0, subtotal - discount + fee), itemCount };
  }, [cart, promoCode]);

  /* ---------- Favoris & vus récemment ---------- */
  const toggleWishlist = useCallback((productId: string) => {
    const has = wishlist.includes(productId);
    setWishlist(list => (has ? list.filter(id => id !== productId) : [...list, productId]));
    notify(has ? 'Retiré de vos favoris' : 'Ajouté à vos favoris ♥', has ? 'info' : 'success');
  }, [wishlist, notify]);
  const isInWishlist = useCallback((productId: string) => wishlist.includes(productId), [wishlist]);

  const markViewed = useCallback((productId: string) => {
    setRecentlyViewed(list => [productId, ...list.filter(id => id !== productId)].slice(0, 8));
  }, []);

  /* ---------- Commandes ---------- */
  const placeOrder: StoreContextValue['placeOrder'] = useCallback((data) => {
    const now = new Date().toISOString();
    const id = `FB-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const order: Order = { ...data, id, createdAt: now, status: 'en_attente', history: [{ status: 'en_attente', date: now }] };
    setOrders(list => [order, ...list]);
    // Décrémente le stock
    setProducts(list => list.map(p => {
      const qty = data.items.filter(i => i.productId === p.id).reduce((s, i) => s + i.quantity, 0);
      return qty ? { ...p, stock: Math.max(0, p.stock - qty) } : p;
    }));
    return order;
  }, []);

  const updateOrderStatus = useCallback((id: string, status: OrderStatus) => {
    setOrders(list => list.map(o => (o.id === id
      ? { ...o, status, history: [...o.history, { status, date: new Date().toISOString() }], paymentStatus: status === 'livree' ? 'paye' : o.paymentStatus }
      : o)));
  }, []);

  const markOrderPaid = useCallback((id: string) => {
    setOrders(list => list.map(o => (o.id === id ? { ...o, paymentStatus: 'paye' } : o)));
  }, []);

  const findOrder = useCallback((id: string, phone: string) => {
    const digits = (s: string) => s.replace(/\D/g, '').slice(-9);
    return orders.find(o => o.id.toUpperCase() === id.trim().toUpperCase() && digits(o.customer.phone) === digits(phone));
  }, [orders]);

  const value = useMemo<StoreContextValue>(() => ({
    products, getProduct, saveProduct, deleteProduct, resetCatalog,
    cart, addToCart, updateQuantity, removeFromCart, clearCart, cartOpen, setCartOpen,
    promoCode, applyPromo, removePromo, computeTotals,
    wishlist, toggleWishlist, isInWishlist,
    recentlyViewed, markViewed,
    orders, placeOrder, updateOrderStatus, markOrderPaid, findOrder,
    toasts, notify,
  }), [products, getProduct, saveProduct, deleteProduct, resetCatalog, cart, addToCart, updateQuantity, removeFromCart, clearCart,
    cartOpen, promoCode, applyPromo, removePromo, computeTotals, wishlist, toggleWishlist, isInWishlist, recentlyViewed, markViewed,
    orders, placeOrder, updateOrderStatus, markOrderPaid, findOrder, toasts, notify]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore doit être utilisé dans <StoreProvider>');
  return ctx;
}
