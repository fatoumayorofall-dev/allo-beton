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
  /** Vitrine de la boutique en ligne : bannière et couleur choisies par le vendeur */
  cover: string | null;
  accent: ShopAccent;
  /** « À la une » : mise en avant payée (en tête de l'accueil et du fil) */
  featured?: boolean;
  /** Nombre de clientes qui suivent la boutique */
  followers?: number;
  verified: boolean;
  since: string;
  sales?: number;
  /** Note des clientes (avis vérifiés : commandes reçues dans l'application) */
  rating?: { average: number | null; count: number };
}
/** Prix affiché, ou caché « à négocier » (le public voit une classe de prix et fait une offre) */
export type PriceMode = 'affiche' | 'negocier';
export interface MpListing {
  id: string;
  title: string;
  description: string;
  /** null quand le prix est à négocier */
  price: number | null;
  negotiable: boolean;
  /** Classe de prix montrée à la place d'un prix caché (« 20 000 – 30 000 F ») */
  priceBand: string | null;
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
export interface MyListing extends Omit<MpListing, 'price'> {
  price: number;
  priceMode: PriceMode;
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
export type OrderStatus =
  'nouvelle' | 'acceptee' | 'prete' | 'en_livraison' | 'retour' | 'livree' | 'refusee' | 'annulee';
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
    pickupMode?: PickupMode;
    relay?: { id: string; name: string } | null;
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
  /** Vue acheteur : code à donner au livreur quand on a le colis en main */
  handoverCode?: string | null;
  /** Vue vendeur : code à donner au livreur en lui remettant le colis (ou en le récupérant) */
  pickupCode?: string | null;
  /** Livraison ratée (client absent ou refus) : le colis est rapporté au vendeur */
  failedDelivery?: { reason: 'absent' | 'refus'; at: string; forgiven?: string } | null;
  /** Vue gérante : codes de remise et essais faux */
  handover?: { pickup: string; dropoff: string; tries: number };
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
  payout?: { sentAt?: string; receivedAt?: string; amount?: number; missing?: string | null };
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
  /** Argent qu'un livreur peut garder avant d'être bloqué */
  driverCashCap: number;
  /** Nouvelle boutique : montant d'articles au plus par commande */
  newSellerMaxOrder: number;
  /** Prix d'une semaine « À la une » */
  boostPrice: number;
}
export interface MySeller extends MpSeller {
  status: 'en_attente' | 'active' | 'suspendue' | 'fermee';
  trusted: boolean;
  location: DeliveryLocation;
  contactPhone: string;
  plan: 'decouverte' | 'pro';
  planUntil: string | null;
  planRequestedAt: string | null;
  /** Où le livreur récupère les colis : adresse, point donné à chaque commande, ou point relais */
  pickupMode: PickupMode;
  relay: Relay | null;
  /** Parrainage : code à partager, boutiques venues grâce à lui, mois Pro gagnés */
  referralCode: string | null;
  referrals: number;
  referralMonths: number;
  /** « À la une » jusqu'à cette date (null : pas en ce moment) */
  boostUntil: string | null;
  boostRequestedAt: string | null;
}
export type PickupMode = 'fixe' | 'variable' | 'relais';
export interface Relay {
  id: string;
  name: string;
  zone: string;
  hours: string;
  address: string;
  landmark: string;
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
export type ShopAccent = 'prune' | 'or' | 'emeraude' | 'indigo' | 'corail' | 'terracotta' | 'noir';
/** Une boutique dans l'annuaire : jamais de prix (on ne met pas les vendeurs en concurrence) */
export interface ShopSummary extends MpSeller {
  pro: boolean;
  sales: number;
  rating: { average: number | null; count: number };
  articles: number;
  photos: string[];
  /** Live en cours (son identifiant) */
  live?: string | null;
}
export const fetchShops = (params: Record<string, string>) =>
  call<{ shops: ShopSummary[] }>(`/api/mp/shops?${new URLSearchParams(params)}`);
export const fetchShop = (slug: string) =>
  call<{
    seller: MpSeller;
    listings: MpListing[];
    reviews: PublicReview[];
    /** Live en cours de la boutique */
    live?: { id: string; title: string } | null;
  }>(`/api/mp/sellers/${encodeURIComponent(slug)}`);
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
  'title' | 'description' | 'price' | 'priceMode' | 'category' | 'condition' | 'photos' | 'video' | 'stock' | 'variants'
> & { variantLabel: string };
export const createListing = (body: ListingInput) => post<{ listing: MyListing }>('/api/mp/me/listings', body);
export const updateListing = (id: string, body: Partial<ListingInput>) =>
  post<{ listing: MyListing }>(`/api/mp/me/listings/${id}`, body, 'PATCH');
export const removeListing = (id: string) => post<{ ok: true }>(`/api/mp/me/listings/${id}`, undefined, 'DELETE');
export const fetchSales = () => call<{ orders: MpOrder[]; balance: Balance }>('/api/mp/me/sales');
export const moveSale = (
  id: string,
  status: OrderStatus,
  reason?: string,
  pickup?: { lat: number; lng: number; landmark?: string },
) => post<{ order: MpOrder; balance: Balance }>(`/api/mp/me/sales/${id}`, { status, reason, pickup }, 'PATCH');
export const fetchRelays = () => call<{ relays: Relay[] }>('/api/mp/relays');

export const confirmPayout = (id: string, missing = false) =>
  post<{ order: MpOrder; balance: Balance }>(
    `/api/mp/me/sales/${id}/payout`,
    missing ? { missing: true } : { received: true },
    'PATCH',
  );
export const requestPro = () => post<{ seller: MySeller }>('/api/mp/me/plan-request', {});
export const requestBoost = () => post<{ seller: MySeller }>('/api/mp/me/boost-request', {});
export const followShop = (slug: string, follow: boolean) =>
  post<{ following: boolean; followers: number }>(`/api/mp/sellers/${slug}/follow`, { follow });
export const fetchFollows = () => call<{ shops: string[] }>('/api/mp/me/follows');

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
/** Argent que garde le livreur (commissions dues + parts des vendeurs) et son plafond */
export interface DriverCash {
  held: number;
  cap: number;
  blocked: boolean;
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
  kind: 'enlevement' | 'depot' | 'retour';
  done: boolean;
  /** Livraison ratée : raison */
  failed?: 'absent' | 'refus';
  /** Le code de remise est demandé pour valider l'arrêt */
  needsCode?: boolean;
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
/** Espace livreur : inscription, argent, course en cours */
export interface DriverHome {
  driver: Driver | null;
  balance?: DriverBalance;
  cash?: DriverCash;
  trip?: DriverTrip | null;
  driverRate?: number;
}
export const fetchMyDriver = () => call<DriverHome>('/api/mp/me/driver');
export const saveMyDriver = (body: { name: string; vehicle: string; zone: string }) =>
  post<{ driver: Driver; balance: DriverBalance }>('/api/mp/me/driver', body);
export const setPresence = (online: boolean, location?: { lat: number; lng: number }) =>
  post<{ driver: Driver }>('/api/mp/me/driver/presence', { online, location });
export const fetchTripOffers = () =>
  call<{ trips: TripOffer[]; current: DriverTrip | null; cash: DriverCash }>('/api/mp/driver/trips');
export const acceptTrip = (id: string) => post<{ trip: DriverTrip }>(`/api/mp/driver/trips/${id}/accept`, {});
/** offlineAt : heure réelle d'un arrêt fait sans réseau et envoyé plus tard */
export const stopDone = (id: string, orderId: string, kind: TripStop['kind'], code?: string, offlineAt?: string) =>
  post<{ trip: DriverTrip; balance: DriverBalance; cash: DriverCash }>(`/api/mp/driver/trips/${id}/stop`, {
    orderId,
    kind,
    code,
    offlineAt,
  });
export const deliveryFailed = (id: string, orderId: string, reason: 'absent' | 'refus', offlineAt?: string) =>
  post<{ trip: DriverTrip }>(`/api/mp/driver/trips/${id}/fail`, { orderId, reason, offlineAt });
export const payoutSent = (orderId: string) =>
  post<{ balance: DriverBalance; cash: DriverCash }>(`/api/mp/driver/orders/${orderId}/payout`, {});

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
  cash: DriverCash;
  /** Plafond propre au livreur (après une caution) ; sinon le plafond général */
  cashCap?: number | null;
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
  /** Mises « À la une » payées */
  boosts: number;
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
export const adminPatchDriver = (pin: string, id: string, body: { status?: string; cashCap?: number | null }) =>
  call<{ driver: Driver }>(`/api/admin/mp/drivers/${id}`, {
    method: 'PATCH',
    headers: admin(pin),
    body: JSON.stringify(body),
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
export const adminLives = (pin: string) => call<{ lives: AdminLive[] }>('/api/admin/mp/lives', { headers: admin(pin) });
export const adminStopLive = (pin: string, id: string, reason: string) =>
  call<{ live: LiveSummary }>(`/api/admin/mp/lives/${id}/stop`, {
    method: 'POST',
    headers: admin(pin),
    body: JSON.stringify({ reason }),
  });
export const adminBoost = (pin: string, id: string, weeks: number) =>
  call<{ seller: MySeller }>(`/api/admin/mp/sellers/${id}/boost`, {
    method: 'POST',
    headers: admin(pin),
    body: JSON.stringify({ weeks }),
  });
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
  /** Livrée avec le code de la cliente */
  codeChecked: boolean;
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
export interface AdminRelay {
  id: string;
  name: string;
  zone: string;
  hours: string;
  phone: string | null;
  location: DeliveryLocation;
  active: boolean;
}
export const adminRelays = (pin: string) =>
  call<{ relays: AdminRelay[] }>('/api/admin/mp/relays', { headers: admin(pin) });
export const adminSaveRelay = (pin: string, body: Partial<AdminRelay> & { location?: DeliveryLocation }) =>
  call<{ relay: AdminRelay }>('/api/admin/mp/relays', {
    method: 'POST',
    headers: admin(pin),
    body: JSON.stringify(body),
  });

/* ---------- Sécurité : fraudes et registre ---------- */
export interface LedgerCheck {
  ok: boolean;
  count: number;
  head: string | null;
  brokenAt: number | null;
}
export interface Security {
  buyers: {
    phone: string;
    name: string;
    strikes: number;
    blocked: boolean;
    failures: { orderId: string; reason: 'absent' | 'refus'; at: string }[];
  }[];
  unpaidSellers: { orderId: string; shopName: string; amount: number; driver: PublicDriver | null; at: string }[];
  drivers: ({ id: string; name: string; phone: string } & DriverCash)[];
  lockedCodes: { orderId: string; shopName: string; status: OrderStatus }[];
  newSellers: number;
  ledger: LedgerCheck;
}
export interface LedgerEntry {
  seq: number;
  at: string;
  type: string;
  data: Record<string, unknown>;
  hash: string;
}
export const adminSecurity = (pin: string) => call<Security>('/api/admin/mp/security', { headers: admin(pin) });
export const adminForgiveBuyer = (pin: string, phone: string) =>
  call<{ forgiven: number }>('/api/admin/mp/buyers/forgive', {
    method: 'POST',
    headers: admin(pin),
    body: JSON.stringify({ phone }),
  });
export const adminUnlockOrder = (pin: string, id: string) =>
  call<{ ok: true }>(`/api/admin/mp/orders/${id}/unlock`, { method: 'POST', headers: admin(pin) });
export const adminLedger = (pin: string) =>
  call<{ check: LedgerCheck; entries: LedgerEntry[] }>('/api/admin/mp/ledger', { headers: admin(pin) });

/* ---------- Discussions et marchandage ---------- */
export interface ChatMessage {
  id: string;
  from: 'acheteur' | 'vendeur';
  at: string;
  text?: string;
  /** Message automatique (offre acceptée, refusée) */
  system?: boolean;
  offer?: { amount: number; status: 'en_attente' | 'acceptee' | 'refusee' | 'remplacee' };
}
/** Prix convenu : valable 48 h, pour un article */
export interface Deal {
  amount: number;
  qty: number;
  at: string;
  until: string;
}
export interface Chat {
  id: string;
  role: 'acheteur' | 'vendeur';
  listing: {
    id: string;
    title: string;
    photo: string | null;
    negotiable: boolean;
    price: number | null;
    priceBand: string | null;
    variantLabel: string | null;
    variants: string[];
  } | null;
  /** Nom de la boutique (pour l'acheteur) ou prénom de l'acheteur (pour le vendeur) */
  with: string;
  deal: Deal | null;
  unread: number;
  last: { text?: string; at: string; from: 'acheteur' | 'vendeur' } | null;
  updatedAt: string;
  messages?: ChatMessage[];
}
export const openChat = (listingId: string, text?: string) =>
  post<{ chat: Chat }>(`/api/mp/listings/${listingId}/chat`, text ? { text } : {});
export const fetchChats = () => call<{ chats: Chat[]; unread: number }>('/api/mp/me/chats');
export const fetchChat = (id: string) => call<{ chat: Chat }>(`/api/mp/me/chats/${id}`);
export const sendChat = (id: string, text: string) => post<{ chat: Chat }>(`/api/mp/me/chats/${id}/messages`, { text });
export const sendOffer = (id: string, amount: number) =>
  post<{ chat: Chat }>(`/api/mp/me/chats/${id}/offers`, { amount });
export const answerOffer = (id: string, msg: string, accept: boolean) =>
  post<{ chat: Chat }>(`/api/mp/me/chats/${id}/offers/${msg}`, { accept });

/* ---------- Appels par internet (voix, WebRTC) ---------- */
export interface CallInfo {
  id: string;
  chatId: string;
  status: 'sonne' | 'en_cours' | 'termine' | 'refuse' | 'manque';
  /** true : c'est moi qu'on appelle */
  incoming: boolean;
  with: string;
  listing: string;
  /** Offre (pour l'appelé) ou réponse (pour l'appelant) du téléphone d'en face */
  sdp: string | null;
  answeredAt: number | null;
}
export const fetchCallConfig = () => call<{ iceServers: RTCIceServer[]; ringSeconds: number }>('/api/mp/call-config');
export const placeCall = (chatId: string, sdp: string) =>
  post<{ call: CallInfo }>(`/api/mp/me/chats/${chatId}/call`, { sdp });
export const fetchIncomingCalls = () => call<{ calls: CallInfo[] }>('/api/mp/me/calls/incoming');
export const fetchCall = (id: string) => call<{ call: CallInfo }>(`/api/mp/me/calls/${id}`);
export const answerCall = (id: string, sdp: string) =>
  post<{ call: CallInfo }>(`/api/mp/me/calls/${id}/answer`, { sdp });
export const endCall = (id: string) => post<{ call: CallInfo }>(`/api/mp/me/calls/${id}/end`, {});

/* ---------- Ventes en direct (live) ---------- */
export interface LiveProduct extends MpListing {
  /** Prix spécial pendant le live (et 15 minutes après) */
  livePrice: number | null;
}
export type LiveStatus = 'en_direct' | 'coupure' | 'termine';
export interface LiveSummary {
  id: string;
  title: string;
  status: LiveStatus;
  startedAt: string;
  endedAt: string | null;
  viewers: number;
  likes: number;
  cover: string | null;
  seller: MpSeller | null;
}
export interface LiveView extends LiveSummary {
  /** Dernier morceau de vidéo reçu */
  seq: number;
  mime: string | null;
  pinned: string | null;
  products: LiveProduct[];
}
export interface LiveComment {
  id: number;
  name: string;
  text: string;
  at: string;
  system: boolean;
  seller: boolean;
}
export interface LiveResult {
  sales: number;
  amount: number;
  peak: number;
  likes: number;
}
export type LiveProductInput = { listingId: string; livePrice: number | null };
export const fetchLives = () => call<{ lives: LiveSummary[] }>('/api/mp/lives');
export const fetchLive = (id: string, after: number, viewer?: string) =>
  call<{ live: LiveView; comments: LiveComment[]; hidden: number[] }>(
    `/api/mp/lives/${id}?${new URLSearchParams({ after: String(after), ...(viewer ? { viewer } : {}) })}`,
  );
export const liveSegmentUrl = (id: string, seq: number) => `${API_BASE}/api/mp/lives/${id}/segments/${seq}`;
export const sendLiveComment = (id: string, text: string) =>
  post<{ comment: LiveComment }>(`/api/mp/lives/${id}/comments`, { text });
export const likeLive = (id: string, n: number) => post<{ likes: number }>(`/api/mp/lives/${id}/like`, { n });
export const reportLive = (id: string, reason: string) => post<{ ok: true }>(`/api/mp/lives/${id}/report`, { reason });
export const fetchMyLive = () => call<{ live: LiveView | null }>('/api/mp/me/lives/current');
export const startLive = (title: string, products: LiveProductInput[]) =>
  post<{ live: LiveView }>('/api/mp/me/lives', { title, products });
export const pinLive = (id: string, listingId: string | null) =>
  post<{ live: LiveView }>(`/api/mp/me/lives/${id}/pin`, { listingId });
export const muteLive = (id: string, commentId: number) =>
  post<{ ok: true }>(`/api/mp/me/lives/${id}/mute`, { commentId });
export const endLive = (id: string) => post<{ live: LiveView; result: LiveResult }>(`/api/mp/me/lives/${id}/end`, {});
/** Envoi d'un morceau de vidéo (3 s) : délai court, un morceau en retard ne sert plus à rien */
export async function uploadLiveSegment(id: string, blob: Blob): Promise<Result<{ seq: number; viewers: number }>> {
  const token = readToken();
  try {
    const res = await fetch(`${API_BASE}/api/mp/me/lives/${id}/segments`, {
      method: 'POST',
      body: blob,
      headers: { 'Content-Type': blob.type, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      signal: AbortSignal.timeout(20000),
    });
    const body = await res.json().catch(() => null);
    return res.ok
      ? { ok: true, data: body }
      : { ok: false, error: body?.error || 'Envoi impossible', status: res.status };
  } catch {
    return { ok: false, error: 'Réseau trop faible', status: 0 };
  }
}
export interface AdminLive extends LiveSummary {
  sales: number;
  amount: number;
  peak: number;
  reports: { reason: string; at: string }[];
}
