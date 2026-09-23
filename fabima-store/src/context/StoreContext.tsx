import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CATALOG_VERSION, INITIAL_PRODUCTS } from '../data/catalog';
import { isOnSale } from '../config/site';
import type { CartItem, CustomerInfo, Order, OrderNotification, OrderStatus, Product, Review, StockAlert } from '../data/types';
import { PROMO_CODES, SITE_CONFIG } from '../config/site';
import { formatPrice } from '../utils/format';

/* ------------------------------------------------------------------ */
/*  Persistance locale                                                 */
/* ------------------------------------------------------------------ */

const KEYS = {
  products: 'fabima_products',
  cart: 'fabima_cart',
  wishlist: 'fabima_wishlist',
  orders: 'fabima_orders',
  recent: 'fabima_recent',
  promo: 'fabima_promo',
  gift: 'fabima_gift',
  customer: 'fabima_customer',
  catalogVersion: 'fabima_catalog_version',
  stockAlerts: 'fabima_stock_alerts',
};

/** Catalogue mémorisé, sauf s'il date d'une version antérieure du catalogue initial. */
function loadProducts(): Product[] {
  if (load<number>(KEYS.catalogVersion, 0) !== CATALOG_VERSION) {
    save(KEYS.catalogVersion, CATALOG_VERSION);
    return INITIAL_PRODUCTS;
  }
  // Pièces des catégories qui ne sont plus en vente : masquées (les pièces ajoutées par la gérante sont gardées)
  const stored = load<Product[]>(KEYS.products, INITIAL_PRODUCTS).filter(p => isOnSale(p.category));
  return stored.length ? stored : INITIAL_PRODUCTS;
}

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
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
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

export interface Totals {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  giftFee: number;
  total: number;
  itemCount: number;
  /** Montant manquant pour atteindre le minimum du code promo (0 si atteint) */
  promoShortfall: number;
}

export interface GiftWrap {
  enabled: boolean;
  message: string;
}

interface StoreContextValue {
  products: Product[];
  getProduct: (idOrSlug: string) => Product | undefined;
  saveProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  resetCatalog: () => void;
  addReview: (productId: string, review: Omit<Review, 'date'>) => void;

  cart: CartItem[];
  addToCart: (product: Product, opts?: { size?: string; color?: string; quantity?: number; silent?: boolean }) => boolean;
  updateQuantity: (key: string, quantity: number) => void;
  removeFromCart: (key: string) => void;
  clearCart: () => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;

  promoCode: string | null;
  applyPromo: (code: string) => { ok: boolean; message: string };
  removePromo: () => void;
  giftWrap: GiftWrap;
  setGiftWrap: (g: GiftWrap) => void;
  computeTotals: (deliveryFee: number) => Totals;

  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  /** Ajoute des favoris venus d'ailleurs (compte en ligne) sans rien retirer */
  mergeWishlist: (ids: string[]) => void;
  isInWishlist: (productId: string) => boolean;

  recentlyViewed: string[];
  markViewed: (productId: string) => void;

  quickView: Product | null;
  openQuickView: (product: Product | null) => void;

  savedCustomer: CustomerInfo | null;
  saveCustomer: (c: CustomerInfo | null) => void;

  stockAlerts: StockAlert[];
  addStockAlert: (productId: string, contact: string) => void;
  removeStockAlerts: (productId: string) => void;

  orders: Order[];
  placeOrder: (order: Omit<Order, 'id' | 'createdAt' | 'status' | 'history'>) => Order;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  markOrderPaid: (id: string) => void;
  logNotification: (id: string, entry: Omit<OrderNotification, 'date'>) => void;
  findOrder: (id: string, phone: string) => Order | undefined;
  /** Gérante : fusionne les commandes enregistrées sur le serveur (le serveur fait foi pour le statut) */
  syncOrders: (list: Order[]) => void;

  toasts: Toast[];
  notify: (message: string, type?: Toast['type']) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(loadProducts);
  const [cart, setCart] = useState<CartItem[]>(() => load(KEYS.cart, []));
  const [wishlist, setWishlist] = useState<string[]>(() => load(KEYS.wishlist, []));
  const [orders, setOrders] = useState<Order[]>(() => load(KEYS.orders, []));
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(() => load(KEYS.recent, []));
  const [promoCode, setPromoCode] = useState<string | null>(() => {
    const code = load<string | null>(KEYS.promo, null);
    return code && PROMO_CODES[code] ? code : null;
  });
  const [giftWrap, setGiftWrap] = useState<GiftWrap>(() => load(KEYS.gift, { enabled: false, message: '' }));
  const [savedCustomer, setSavedCustomer] = useState<CustomerInfo | null>(() => load(KEYS.customer, null));
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>(() => load(KEYS.stockAlerts, []));
  const [cartOpen, setCartOpen] = useState(false);
  const [quickView, setQuickView] = useState<Product | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => save(KEYS.products, products), [products]);
  useEffect(() => save(KEYS.cart, cart), [cart]);
  useEffect(() => save(KEYS.wishlist, wishlist), [wishlist]);
  useEffect(() => save(KEYS.orders, orders), [orders]);
  useEffect(() => save(KEYS.recent, recentlyViewed), [recentlyViewed]);
  useEffect(() => save(KEYS.promo, promoCode), [promoCode]);
  useEffect(() => save(KEYS.gift, giftWrap), [giftWrap]);
  useEffect(() => save(KEYS.customer, savedCustomer), [savedCustomer]);
  useEffect(() => save(KEYS.stockAlerts, stockAlerts), [stockAlerts]);

  const notify = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t.slice(-2), { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  }, []);

  /* ---------- Synchronisation panier ↔ catalogue ----------
     Le panier garde une copie du prix : on la réaligne quand le gérant modifie un produit,
     on plafonne la quantité au stock restant et on retire les articles supprimés ou épuisés. */
  useEffect(() => {
    setCart(items => {
      let changed = false;
      const next: CartItem[] = [];
      for (const item of items) {
        const p = products.find(x => x.id === item.productId);
        if (!p || p.stock <= 0) { changed = true; continue; }
        const quantity = Math.min(item.quantity, p.stock);
        const image = p.images[0] ?? item.image;
        if (quantity !== item.quantity || p.price !== item.price || p.name !== item.name || image !== item.image) changed = true;
        next.push({ ...item, quantity, price: p.price, name: p.name, image });
      }
      return changed ? next : items;
    });
  }, [products]);

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

  const addStockAlert = useCallback((productId: string, contact: string) => {
    setStockAlerts(list => (list.some(a => a.productId === productId && a.contact === contact)
      ? list : [...list, { productId, contact, createdAt: new Date().toISOString() }]));
  }, []);
  const removeStockAlerts = useCallback((productId: string) => setStockAlerts(list => list.filter(a => a.productId !== productId)), []);

  const addReview = useCallback((productId: string, review: Omit<Review, 'date'>) => {
    setProducts(list => list.map(p => {
      if (p.id !== productId) return p;
      const reviewCount = p.reviewCount + 1;
      const rating = Math.round(((p.rating * p.reviewCount + review.rating) / reviewCount) * 10) / 10;
      return { ...p, rating, reviewCount, reviews: [{ ...review, date: new Date().toISOString().slice(0, 10) }, ...(p.reviews ?? [])] };
    }));
  }, []);

  /* ---------- Panier ---------- */
  const addToCart: StoreContextValue['addToCart'] = useCallback((product, opts = {}) => {
    const size = opts.size || undefined;
    const color = opts.color || undefined;
    const quantity = opts.quantity ?? 1;
    const key = [product.id, size ?? '', color ?? ''].join('|');
    const inCart = cart.filter(i => i.productId === product.id).reduce((s, i) => s + i.quantity, 0);
    const available = product.stock - inCart;
    if (available <= 0) {
      notify(product.stock <= 0 ? 'Cet article est épuisé' : `Stock maximum atteint (${product.stock})`, 'error');
      return false;
    }
    const qty = Math.min(quantity, available);
    setCart(items => {
      const existing = items.find(i => i.key === key);
      if (existing) return items.map(i => (i.key === key ? { ...i, quantity: i.quantity + qty } : i));
      return [...items, { key, productId: product.id, name: product.name, image: product.images[0], price: product.price, size, color, quantity: qty }];
    });
    if (!opts.silent) {
      notify(qty < quantity ? `Seulement ${qty} ajouté(s) : stock limité` : `« ${product.name} » ajouté au panier`, qty < quantity ? 'info' : 'success');
    }
    return true;
  }, [cart, notify]);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setCart(items => {
      if (quantity <= 0) return items.filter(i => i.key !== key);
      const item = items.find(i => i.key === key);
      if (!item) return items;
      const stock = products.find(p => p.id === item.productId)?.stock ?? quantity;
      const others = items.filter(i => i.productId === item.productId && i.key !== key).reduce((s, i) => s + i.quantity, 0);
      const capped = Math.max(1, Math.min(quantity, stock - others));
      return items.map(i => (i.key === key ? { ...i, quantity: capped } : i));
    });
  }, [products]);

  const removeFromCart = useCallback((key: string) => setCart(items => items.filter(i => i.key !== key)), []);
  const clearCart = useCallback(() => {
    setCart([]);
    setPromoCode(null);
    setGiftWrap({ enabled: false, message: '' });
  }, []);

  /* ---------- Promo & totaux ---------- */
  const applyPromo = useCallback((code: string) => {
    const normalized = code.trim().toUpperCase();
    const promo = PROMO_CODES[normalized];
    if (!promo) return { ok: false, message: 'Ce code promo n\'existe pas' };
    setPromoCode(normalized);
    const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    if (promo.minSubtotal && subtotal < promo.minSubtotal) {
      return { ok: true, message: `Code enregistré : il s'appliquera dès ${formatPrice(promo.minSubtotal)} d'achat` };
    }
    return { ok: true, message: `Code ${normalized} appliqué` };
  }, [cart]);
  const removePromo = useCallback(() => setPromoCode(null), []);

  const computeTotals = useCallback((deliveryFee: number): Totals => {
    const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const itemCount = cart.reduce((s, i) => s + i.quantity, 0);
    const promo = promoCode ? PROMO_CODES[promoCode] : undefined;
    const promoShortfall = promo?.minSubtotal ? Math.max(0, promo.minSubtotal - subtotal) : 0;
    const promoActive = !!promo && promoShortfall === 0;
    let discount = 0;
    if (promoActive && promo.percent) discount = Math.round((subtotal * promo.percent) / 100);
    if (promoActive && promo.amount) discount = Math.min(promo.amount, subtotal);
    const freeShipping = (promoActive && promo.freeShipping) || subtotal - discount >= SITE_CONFIG.freeShippingThreshold;
    const fee = freeShipping ? 0 : deliveryFee;
    const giftFee = giftWrap.enabled && cart.length > 0 ? SITE_CONFIG.giftWrapFee : 0;
    return { subtotal, discount, deliveryFee: fee, giftFee, total: Math.max(0, subtotal - discount + fee + giftFee), itemCount, promoShortfall };
  }, [cart, promoCode, giftWrap.enabled]);

  /* ---------- Favoris & vus récemment ---------- */
  const toggleWishlist = useCallback((productId: string) => {
    const has = wishlist.includes(productId);
    setWishlist(list => (has ? list.filter(id => id !== productId) : [...list, productId]));
    notify(has ? 'Retiré de vos favoris' : 'Ajouté à vos favoris', has ? 'info' : 'success');
  }, [wishlist, notify]);
  const mergeWishlist = useCallback((ids: string[]) => {
    setWishlist(list => {
      const extra = ids.filter(id => !list.includes(id));
      return extra.length ? [...list, ...extra] : list;
    });
  }, []);
  const isInWishlist = useCallback((productId: string) => wishlist.includes(productId), [wishlist]);

  const markViewed = useCallback((productId: string) => {
    setRecentlyViewed(list => [productId, ...list.filter(id => id !== productId)].slice(0, 8));
  }, []);

  /* ---------- Commandes ---------- */
  const adjustStock = useCallback((items: CartItem[], direction: 1 | -1) => {
    setProducts(list => list.map(p => {
      const qty = items.filter(i => i.productId === p.id).reduce((s, i) => s + i.quantity, 0);
      return qty ? { ...p, stock: Math.max(0, p.stock + direction * qty) } : p;
    }));
  }, []);

  const placeOrder: StoreContextValue['placeOrder'] = useCallback((data) => {
    const now = new Date().toISOString();
    const id = `FB-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const order: Order = { ...data, id, createdAt: now, status: 'en_attente', history: [{ status: 'en_attente', date: now }] };
    setOrders(list => [order, ...list]);
    adjustStock(data.items, -1);
    return order;
  }, [adjustStock]);

  const updateOrderStatus = useCallback((id: string, status: OrderStatus) => {
    const order = orders.find(o => o.id === id);
    if (!order || order.status === status) return;
    // Une annulation remet les articles en stock ; une réactivation les retire à nouveau.
    if (status === 'annulee') adjustStock(order.items, 1);
    if (order.status === 'annulee') adjustStock(order.items, -1);
    setOrders(list => list.map(o => (o.id === id
      ? { ...o, status, history: [...o.history, { status, date: new Date().toISOString() }], paymentStatus: status === 'livree' ? 'paye' : o.paymentStatus }
      : o)));
  }, [orders, adjustStock]);

  const markOrderPaid = useCallback((id: string) => {
    setOrders(list => list.map(o => (o.id === id ? { ...o, paymentStatus: 'paye' } : o)));
  }, []);

  const logNotification = useCallback((id: string, entry: Omit<OrderNotification, 'date'>) => {
    setOrders(list => list.map(o => (o.id === id
      ? { ...o, notifications: [...(o.notifications ?? []), { ...entry, date: new Date().toISOString() }] }
      : o)));
  }, []);

  const findOrder = useCallback((id: string, phone: string) => {
    const digits = (s: string) => s.replace(/\D/g, '').slice(-9);
    return orders.find(o => o.id.toUpperCase() === id.trim().toUpperCase() && digits(o.customer.phone) === digits(phone));
  }, [orders]);

  const syncOrders = useCallback((list: Order[]) => {
    if (!list.length) return;
    setOrders(local => {
      const byId = new Map(local.map(o => [o.id, o]));
      for (const remote of list) {
        const mine = byId.get(remote.id);
        // les envois ouverts à la main depuis ce téléphone ne sont connus que localement
        const manual = (mine?.notifications ?? []).filter(n => n.channel === 'manuel');
        const notifications = [...(remote.notifications ?? []), ...manual].sort((a, b) => a.date.localeCompare(b.date));
        byId.set(remote.id, { ...mine, ...remote, notifications });
      }
      return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
  }, []);

  const value = useMemo<StoreContextValue>(() => ({
    products, getProduct, saveProduct, deleteProduct, resetCatalog, addReview,
    cart, addToCart, updateQuantity, removeFromCart, clearCart, cartOpen, setCartOpen,
    promoCode, applyPromo, removePromo, giftWrap, setGiftWrap, computeTotals,
    wishlist, toggleWishlist, mergeWishlist, isInWishlist,
    recentlyViewed, markViewed,
    quickView, openQuickView: setQuickView,
    savedCustomer, saveCustomer: setSavedCustomer,
    stockAlerts, addStockAlert, removeStockAlerts,
    orders, placeOrder, updateOrderStatus, markOrderPaid, logNotification, findOrder, syncOrders,
    toasts, notify,
  }), [products, getProduct, saveProduct, deleteProduct, resetCatalog, addReview, cart, addToCart, updateQuantity, removeFromCart, clearCart,
    cartOpen, promoCode, applyPromo, removePromo, giftWrap, computeTotals, wishlist, toggleWishlist, mergeWishlist, isInWishlist, recentlyViewed, markViewed,
    quickView, savedCustomer, stockAlerts, addStockAlert, removeStockAlerts, orders, placeOrder, updateOrderStatus, markOrderPaid, logNotification, findOrder, syncOrders, toasts, notify]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore doit être utilisé dans <StoreProvider>');
  return ctx;
}
