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
      // Envoi de photo ou de vidéo : jusqu'à 3 minutes sur un réseau lent
      signal: AbortSignal.timeout(init.body instanceof Blob ? 180000 : 30000),
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
  /** Note des clientes (avis vérifiés : commandes reçues dans l'application) */
  rating?: { average: number | null; count: number };
}
export interface MpListing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: 'neuf' | 'occasion';
  photos: string[];
  /** Vidéo courte façon TikTok (facultative) */
  video: string | null;
  /** Nombre de « j'aime » */
  likes: number;
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
export type ProblemKind = 'non_conforme' | 'abime' | 'incomplet' | 'non_recu';
export const PROBLEM_LABELS: Record<ProblemKind, string> = {
  non_conforme: "L'article ne correspond pas à l'annonce",
  abime: 'Article abîmé',
  incomplet: 'Il manque quelque chose',
  non_recu: "Je n'ai pas reçu ma commande",
};
export interface PublicReview {
  name: string;
  stars: number;
  text: string;
  at: string;
}
export type DeliveryMode = 'vendeur' | 'express' | 'partagee';
export interface PublicDriver {
  name: string;
  phone: string;
  vehicle: 'moto' | 'voiture' | 'velo' | 'pied';
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
  delivery: {
    km: number;
    /** Prix de la course seule : le maximum garanti */
    fee: number;
    /** Part réellement payée (moitié-moitié : baisse quand d'autres commandes rejoignent) */
    share?: number;
    mode?: DeliveryMode;
    tripId?: string;
    deadline?: string | null;
    to: (DeliveryLocation & { landmark?: string }) | null;
    from: DeliveryLocation;
  };
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
  trip?: {
    status: 'ouverte' | 'fermee' | 'acceptee' | 'terminee' | 'annulee';
    mode: 'express' | 'partagee';
    members: number;
    deadline: string | null;
    driver: PublicDriver | null;
  } | null;
  /** Avis vérifié laissé après la livraison */
  review?: { seller: { stars: number; text: string }; driver?: { stars: number }; at: string } | null;
  /** Problème signalé (sous 72 h) et sa résolution */
  dispute?: {
    kind: ProblemKind;
    text: string;
    status: 'ouvert' | 'resolu' | 'rejete';
    at: string;
    resolution: string;
    resolvedAt: string | null;
  } | null;
  /** Vue vendeur : livreur de la course et montant qu'il vous envoie */
  driver?: PublicDriver | null;
  sellerGets?: number | null;
  payout?: { sentAt?: string; receivedAt?: string; amount?: number };
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
  /** Commandes livrées par un livreur : ce qu'il doit vous envoyer */
  payouts?: { orderId: string; amount: number; sentAt: string | null; receivedAt: string | null }[];
}
export interface MpSettings {
  sellerRate: number;
  buyerFee: number;
  driverRate: number;
  delivery: { base: number; perKm: number; min: number; max: number };
  autoPublishTrusted: boolean;
  drivers: boolean;
  freeListings: number;
  proPrice: number;
  proRate: number;
}
export interface MySeller extends MpSeller {
  status: 'en_attente' | 'active' | 'suspendue' | 'fermee';
  trusted: boolean;
  location: DeliveryLocation;
  contactPhone: string;
  plan: 'decouverte' | 'pro';
  planUntil: string | null;
  planRequestedAt: string | null;
}
export interface QuoteOrder {
  seller: MpSeller;
  lines: OrderLine[];
  subtotal: number;
  delivery: { km: number; fee: number };
  buyerFee: number;
  total: number;
  /** Moitié-moitié : part si la commande rejoint maintenant un groupe dans sa direction */
  shared: { share: number; with: number; deadline: string } | null;
}
export interface CartLine {
  listingId: string;
  qty: number;
  variant: string | null;
}

/* ---------- Public ---------- */
export const fetchConfig = () =>
  call<{
    categories: MpCategory[];
    sellerRate: number;
    buyerFee: number;
    delivery: MpSettings['delivery'];
    drivers: boolean;
    shareWaits: number[];
    plans: { freeListings: number; proPrice: number; proRate: number };
  }>('/api/mp/config');
export const fetchListings = (params: Record<string, string>) =>
  call<{ total: number; page: number; listings: MpListing[] }>(`/api/mp/listings?${new URLSearchParams(params)}`);
export const fetchListing = (id: string) =>
  call<{ listing: MpListing; more: MpListing[] }>(`/api/mp/listings/${encodeURIComponent(id)}`);
export const fetchShop = (slug: string) =>
  call<{ seller: MpSeller; listings: MpListing[]; reviews: PublicReview[] }>(
    `/api/mp/sellers/${encodeURIComponent(slug)}`,
  );
/** Fil « Pour vous » : articles classés selon les goûts (gardés sur le téléphone), la tendance et la distance */
export type FeedItem = MpListing & { why: string };
export const fetchFeed = (body: {
  v: string;
  taste: unknown;
  seen: string[];
  near?: { lat: number; lng: number } | null;
  page: number;
  per?: number;
}) => post<{ total: number; page: number; items: FeedItem[] }>('/api/mp/feed', body);
export const fetchQuote = (items: CartLine[], to: DeliveryLocation, wait?: number) =>
  post<{ drivers: boolean; orders: QuoteOrder[]; total: number }>('/api/mp/quote', { items, to, wait });

/* ---------- Acheteur ---------- */
export const placeOrders = (body: {
  items: CartLine[];
  to: DeliveryLocation;
  name: string;
  payment: MpOrder['payment'];
  note: string;
  mode?: 'express' | 'partagee';
  wait?: number;
}) => post<{ orders: MpOrder[] }>('/api/mp/orders', body);
export const fetchMyOrders = () => call<{ orders: MpOrder[] }>('/api/mp/me/orders');
export const cancelMyOrder = (id: string) => post<{ order: MpOrder }>(`/api/mp/me/orders/${id}/cancel`, {});
export const reviewOrder = (id: string, body: { sellerStars: number; text: string; driverStars?: number }) =>
  post<{ review: NonNullable<MpOrder['review']> }>(`/api/mp/me/orders/${id}/review`, body);
export const reportProblem = (id: string, kind: ProblemKind, text: string) =>
  post<{ dispute: NonNullable<MpOrder['dispute']> }>(`/api/mp/me/orders/${id}/problem`, { kind, text });
export interface Tracking {
  name: string;
  vehicle: PublicDriver['vehicle'];
  phase: 'chez_vendeur' | 'vers_vous';
  position: { lat: number; lng: number; at: string } | null;
  km?: number;
  minutes?: number;
}
export const fetchTracking = (id: string) => call<{ tracking: Tracking | null }>(`/api/mp/me/orders/${id}/driver`);

/* ---------- Vendeur ---------- */
export const fetchMySeller = () =>
  call<{ seller: MySeller | null; balance?: Balance; settings?: MpSettings }>('/api/mp/me/seller');
export const saveMySeller = (body: Partial<MySeller>) =>
  post<{ seller: MySeller; balance: Balance }>('/api/mp/me/seller', body);
export const uploadPhoto = (blob: Blob) =>
  call<{ url: string }>('/api/mp/me/photos', { method: 'POST', body: blob, headers: { 'Content-Type': blob.type } });
export const uploadVideo = (blob: Blob) =>
  call<{ url: string }>('/api/mp/me/videos', {
    method: 'POST',
    body: blob,
    headers: { 'Content-Type': blob.type || 'video/mp4' },
  });
export const fetchMyListings = () => call<{ listings: MyListing[] }>('/api/mp/me/listings');
export type ListingInput = Pick<
  MyListing,
  'title' | 'description' | 'price' | 'category' | 'condition' | 'photos' | 'video' | 'stock' | 'variants'
> & { variantLabel: string };
export const createListing = (body: ListingInput) => post<{ listing: MyListing }>('/api/mp/me/listings', body);
export const updateListing = (id: string, body: Partial<ListingInput>) =>
  post<{ listing: MyListing }>(`/api/mp/me/listings/${id}`, body, 'PATCH');
export const removeListing = (id: string) => post<{ ok: true }>(`/api/mp/me/listings/${id}`, undefined, 'DELETE');
export const fetchSales = () => call<{ orders: MpOrder[]; balance: Balance }>('/api/mp/me/sales');
export const moveSale = (id: string, status: OrderStatus, reason?: string) =>
  post<{ order: MpOrder; balance: Balance }>(`/api/mp/me/sales/${id}`, { status, reason }, 'PATCH');

export const confirmPayout = (id: string) =>
  post<{ order: MpOrder; balance: Balance }>(`/api/mp/me/sales/${id}/payout`, { received: true }, 'PATCH');
export const requestPro = () => post<{ seller: MySeller }>('/api/mp/me/plan-request', {});

/* ---------- Livreur ---------- */
export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle: PublicDriver['vehicle'];
  zone: string;
  status: 'en_attente' | 'active' | 'suspendue' | 'fermee';
  online: boolean;
  location: { lat: number; lng: number; at: string } | null;
  createdAt: string;
}
export interface DriverBalance {
  deliveries: number;
  earned: number;
  due: number;
  paid: number;
  balance: number;
  payments: { id: string; amount: number; note: string; at: string }[];
  payoutsToSend: { orderId: string; shopName: string; amount: number }[];
}
export interface TripOffer {
  id: string;
  mode: 'express' | 'partagee';
  orders: number;
  km: number;
  earn: number;
  shops: string[];
  toFirstKm: number | null;
}
export interface TripStop {
  orderId: string;
  kind: 'enlevement' | 'depot';
  done: boolean;
  phone: string | null;
  at: DeliveryLocation & { landmark?: string };
  shopName?: string;
  items?: string[];
  buyerName?: string;
  payment?: MpOrder['payment'];
  note?: string;
  money?: { collect: number; sellerGets: number; driverKeeps: number; platformGets: number; driverCommission: number };
  sellerPhone?: string | null;
  payoutSent?: boolean;
}
export interface DriverTrip {
  id: string;
  mode: 'express' | 'partagee';
  status: string;
  km: number;
  stops: TripStop[];
}
export const fetchMyDriver = () =>
  call<{ driver: Driver | null; balance?: DriverBalance; trip?: DriverTrip | null; driverRate?: number }>(
    '/api/mp/me/driver',
  );
export const saveMyDriver = (body: { name: string; vehicle: string; zone: string }) =>
  post<{ driver: Driver; balance: DriverBalance }>('/api/mp/me/driver', body);
export const setPresence = (online: boolean, location?: { lat: number; lng: number }) =>
  post<{ driver: Driver }>('/api/mp/me/driver/presence', { online, location });
export const fetchTripOffers = () => call<{ trips: TripOffer[]; current: DriverTrip | null }>('/api/mp/driver/trips');
export const acceptTrip = (id: string) => post<{ trip: DriverTrip }>(`/api/mp/driver/trips/${id}/accept`, {});
export const stopDone = (id: string, orderId: string, kind: TripStop['kind']) =>
  post<{ trip: DriverTrip; balance: DriverBalance }>(`/api/mp/driver/trips/${id}/stop`, { orderId, kind });
export const payoutSent = (orderId: string) =>
  post<{ balance: DriverBalance }>(`/api/mp/driver/orders/${orderId}/payout`, {});

/* ---------- Gérante ---------- */
const admin = (pin: string) => ({ 'x-admin-pin': pin });
export interface AdminSeller extends MySeller {
  ownerPhone: string | null;
  listings: number;
  balance: Balance;
  /** Refus et annulations du vendeur : signal de vente hors application */
  risk: { orders: number; dropped: number; rate: number; alert: boolean };
}
export interface AdminDriver extends Driver {
  ownerPhone: string | null;
  balance: DriverBalance;
  current: string | null;
}
export interface AdminTrip {
  id: string;
  mode: 'express' | 'partagee';
  status: string;
  deadline: string | null;
  price: { total: number; km: number; shares: Record<string, number> } | null;
  orders: { id: string; status: OrderStatus; shopName: string }[];
  driver: PublicDriver | null;
  createdAt: string;
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
  subscriptions: number;
  drivers: { en_attente: number; active: number; online: number };
  tripsOpen: number;
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
export const adminDrivers = (pin: string) =>
  call<{ drivers: AdminDriver[] }>('/api/admin/mp/drivers', { headers: admin(pin) });
export const adminPatchDriver = (pin: string, id: string, status: string) =>
  call<{ driver: Driver }>(`/api/admin/mp/drivers/${id}`, {
    method: 'PATCH',
    headers: admin(pin),
    body: JSON.stringify({ status }),
  });
export const adminDriverPayment = (pin: string, id: string, amount: number) =>
  call<{ balance: DriverBalance }>(`/api/admin/mp/drivers/${id}/payments`, {
    method: 'POST',
    headers: admin(pin),
    body: JSON.stringify({ amount, note: 'Commissions reçues' }),
  });
export const adminTrips = (pin: string) => call<{ trips: AdminTrip[] }>('/api/admin/mp/trips', { headers: admin(pin) });
export const adminCloseTrip = (pin: string, id: string) =>
  call<{ trip: AdminTrip }>(`/api/admin/mp/trips/${id}/close`, { method: 'POST', headers: admin(pin) });
export const adminActivatePro = (pin: string, id: string, months: number) =>
  call<{ seller: MySeller }>(`/api/admin/mp/sellers/${id}/plan`, {
    method: 'POST',
    headers: admin(pin),
    body: JSON.stringify({ months }),
  });
export interface AdminDispute {
  orderId: string;
  shopName: string;
  buyer: { name: string; phone: string };
  total: number;
  orderStatus: OrderStatus;
  driverId: string | null;
  problem: string;
  kind: ProblemKind;
  text: string;
  status: 'ouvert' | 'resolu' | 'rejete';
  at: string;
  resolution: string;
  resolvedAt: string | null;
}
export const adminDisputes = (pin: string) =>
  call<{ disputes: AdminDispute[] }>('/api/admin/mp/disputes', { headers: admin(pin) });
export const adminResolveDispute = (pin: string, id: string, status: 'resolu' | 'rejete', resolution: string) =>
  call<{ dispute: NonNullable<MpOrder['dispute']> }>(`/api/admin/mp/disputes/${id}`, {
    method: 'PATCH',
    headers: admin(pin),
    body: JSON.stringify({ status, resolution }),
  });
