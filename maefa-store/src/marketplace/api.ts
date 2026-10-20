/** Appels au serveur de la place de marché (même compte que la boutique : numéro de téléphone). */
import { API_BASE } from '../services/api';
import { readToken } from '../context/AccountContext';
import type { DeliveryLocation } from '../data/types';

export type Result<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

async function call<T>(path: string, init: RequestInit = {}): Promise<Result<T>> {
  const token = readToken();
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(init.body instanceof Blob ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
      signal: AbortSignal.timeout(30000),
    });
    const body = await res.json().catch(() => null);
    return res.ok
      ? { ok: true, data: body as T }
      : { ok: false, error: body?.error || 'Une erreur est survenue', status: res.status };
  } catch {
    return { ok: false, error: 'Pas de connexion. Vérifiez votre internet et réessayez.', status: 0 };
  }
}
const post = <T>(path: string, body?: unknown, method = 'POST') =>
  call<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

/* ---------- Types ---------- */
export interface MpCategory {
  id: string;
  name: string;
}
export interface MpSeller {
  id: string;
  shopName: string;
  slug: string;
  description: string;
  category: string;
  zone: string;
  logo: string | null;
  verified: boolean;
  since: string;
  sales?: number;
}
export interface MpListing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: 'neuf' | 'occasion';
  photos: string[];
  variantLabel: string | null;
  variants: string[];
  soldOut: boolean;
  createdAt: string;
  seller: MpSeller | null;
}
export interface MyListing extends MpListing {
  status: 'en_attente' | 'publiee' | 'refusee' | 'retiree';
  stock: number | null;
  reason?: string;
  views?: number;
}
export interface OrderLine {
  listingId: string;
  title: string;
  photo: string;
  price: number;
  qty: number;
  variant: string | null;
  variantLabel: string | null;
}
export type OrderStatus = 'nouvelle' | 'acceptee' | 'prete' | 'en_livraison' | 'livree' | 'refusee' | 'annulee';
export interface MpOrder {
  id: string;
  sellerId: string;
  shopName: string;
  /** Numéro de l'acheteur : seulement pendant la livraison (vue vendeur) */
  buyer: { name: string; phone: string | null };
  lines: OrderLine[];
  subtotal: number;
  /** Adresse exacte : seulement pendant la livraison (vue vendeur) */
  delivery: { km: number; fee: number; to: (DeliveryLocation & { landmark?: string }) | null; from: DeliveryLocation };
  buyerFee: number;
  total: number;
  payment: 'especes' | 'wave' | 'orange_money';
  note: string;
  status: OrderStatus;
  reason?: string;
  history: { status: OrderStatus; at: string; by: string }[];
  createdAt: string;
  /** Vue acheteur */
  seller?: MpSeller | null;
  sellerPhone?: string | null;
  /** Vue vendeur */
  platformFee?: number;
  buyerFeeToPay?: number;
}
export interface Balance {
  sales: number;
  orders: number;
  due: number;
  paid: number;
  balance: number;
  payments: { id: string; amount: number; note: string; at: string }[];
}
export interface MpSettings {
  sellerRate: number;
  buyerFee: number;
  driverRate: number;
  delivery: { base: number; perKm: number; min: number; max: number };
  autoPublishTrusted: boolean;
}
export interface MySeller extends MpSeller {
  status: 'en_attente' | 'active' | 'suspendue' | 'fermee';
  trusted: boolean;
  location: DeliveryLocation;
  contactPhone: string;
}
export interface QuoteOrder {
  seller: MpSeller;
  lines: OrderLine[];
  subtotal: number;
  delivery: { km: number; fee: number };
  buyerFee: number;
  total: number;
}
export interface CartLine {
  listingId: string;
  qty: number;
  variant: string | null;
}

/* ---------- Public ---------- */
export const fetchConfig = () =>
  call<{ categories: MpCategory[]; sellerRate: number; buyerFee: number; delivery: MpSettings['delivery'] }>(
    '/api/mp/config',
  );
export const fetchListings = (params: Record<string, string>) =>
  call<{ total: number; page: number; listings: MpListing[] }>(`/api/mp/listings?${new URLSearchParams(params)}`);
export const fetchListing = (id: string) =>
  call<{ listing: MpListing; more: MpListing[] }>(`/api/mp/listings/${encodeURIComponent(id)}`);
export const fetchShop = (slug: string) =>
  call<{ seller: MpSeller; listings: MpListing[] }>(`/api/mp/sellers/${encodeURIComponent(slug)}`);
export const fetchQuote = (items: CartLine[], to: DeliveryLocation) =>
  post<{ orders: QuoteOrder[]; total: number }>('/api/mp/quote', { items, to });

/* ---------- Acheteur ---------- */
export const placeOrders = (body: {
  items: CartLine[];
  to: DeliveryLocation;
  name: string;
  payment: MpOrder['payment'];
  note: string;
}) => post<{ orders: MpOrder[] }>('/api/mp/orders', body);
export const fetchMyOrders = () => call<{ orders: MpOrder[] }>('/api/mp/me/orders');
export const cancelMyOrder = (id: string) => post<{ order: MpOrder }>(`/api/mp/me/orders/${id}/cancel`, {});

/* ---------- Vendeur ---------- */
export const fetchMySeller = () =>
  call<{ seller: MySeller | null; balance?: Balance; settings?: MpSettings }>('/api/mp/me/seller');
export const saveMySeller = (body: Partial<MySeller>) =>
  post<{ seller: MySeller; balance: Balance }>('/api/mp/me/seller', body);
export const uploadPhoto = (blob: Blob) =>
  call<{ url: string }>('/api/mp/me/photos', { method: 'POST', body: blob, headers: { 'Content-Type': blob.type } });
export const fetchMyListings = () => call<{ listings: MyListing[] }>('/api/mp/me/listings');
export type ListingInput = Pick<
  MyListing,
  'title' | 'description' | 'price' | 'category' | 'condition' | 'photos' | 'stock' | 'variants'
> & { variantLabel: string };
export const createListing = (body: ListingInput) => post<{ listing: MyListing }>('/api/mp/me/listings', body);
export const updateListing = (id: string, body: Partial<ListingInput>) =>
  post<{ listing: MyListing }>(`/api/mp/me/listings/${id}`, body, 'PATCH');
export const removeListing = (id: string) => post<{ ok: true }>(`/api/mp/me/listings/${id}`, undefined, 'DELETE');
export const fetchSales = () => call<{ orders: MpOrder[]; balance: Balance }>('/api/mp/me/sales');
export const moveSale = (id: string, status: OrderStatus, reason?: string) =>
  post<{ order: MpOrder; balance: Balance }>(`/api/mp/me/sales/${id}`, { status, reason }, 'PATCH');

/* ---------- Gérante ---------- */
const admin = (pin: string) => ({ 'x-admin-pin': pin });
export interface AdminSeller extends MySeller {
  ownerPhone: string | null;
  listings: number;
  balance: Balance;
  /** Refus et annulations du vendeur : signal de vente hors application */
  risk: { orders: number; dropped: number; rate: number; alert: boolean };
}
export interface Overview {
  sellers: Record<'en_attente' | 'active' | 'suspendue' | 'fermee', number>;
  listingsPending: number;
  listingsPublished: number;
  ordersActive: number;
  ordersDelivered: number;
  sales: number;
  earned: number;
  outstanding: number;
  settings: MpSettings;
}
export const adminOverview = (pin: string) => call<Overview>('/api/admin/mp/overview', { headers: admin(pin) });
export const adminSellers = (pin: string) =>
  call<{ sellers: AdminSeller[] }>('/api/admin/mp/sellers', { headers: admin(pin) });
export const adminPatchSeller = (pin: string, id: string, body: { status?: string; trusted?: boolean }) =>
  call<{ seller: MySeller }>(`/api/admin/mp/sellers/${id}`, {
    method: 'PATCH',
    headers: admin(pin),
    body: JSON.stringify(body),
  });
export const adminPayment = (pin: string, id: string, amount: number, note: string) =>
  call<{ balance: Balance }>(`/api/admin/mp/sellers/${id}/payments`, {
    method: 'POST',
    headers: admin(pin),
    body: JSON.stringify({ amount, note }),
  });
export const adminListings = (pin: string, status = '') =>
  call<{ listings: (MyListing & { seller: (MpSeller & { status: string }) | null })[] }>(
    `/api/admin/mp/listings?status=${status}`,
    { headers: admin(pin) },
  );
export const adminModerate = (pin: string, id: string, status: 'publiee' | 'refusee' | 'retiree', reason = '') =>
  call<{ listing: MyListing }>(`/api/admin/mp/listings/${id}`, {
    method: 'PATCH',
    headers: admin(pin),
    body: JSON.stringify({ status, reason }),
  });
export const adminOrders = (pin: string) =>
  call<{ orders: MpOrder[] }>('/api/admin/mp/orders', { headers: admin(pin) });
export const adminSettings = (pin: string, body: Partial<MpSettings>) =>
  call<{ settings: MpSettings }>('/api/admin/mp/settings', {
    method: 'PATCH',
    headers: admin(pin),
    body: JSON.stringify(body),
  });
