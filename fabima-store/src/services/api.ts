/**
 * Appels au serveur Fabima (assistant IA + notifications WhatsApp).
 * Le site reste pleinement utilisable sans serveur : chaque fonction échoue proprement
 * et l'interface bascule sur le mode manuel ou hors ligne.
 */
import type { DeliveryInfo, DeliveryLocation, Order, OrderStatus, Product } from '../data/types';

const API = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export interface ServerStatus {
  ok: boolean;
  /** Stockage partagé disponible (vitrine du statut, notes vocales, compteurs) */
  storage?: boolean;
  /** Comptes clientes par numéro de téléphone disponibles */
  accounts?: boolean;
  assistant: boolean;
  whatsapp: boolean;
  ownerNotifications: boolean;
  adminApi: boolean;
  /** Commandes enregistrées sur le serveur (suivi du livreur en direct) */
  orders?: boolean;
}

const OFFLINE: ServerStatus = { ok: false, assistant: false, whatsapp: false, ownerNotifications: false, adminApi: false };
let statusPromise: Promise<ServerStatus> | null = null;

/** État du serveur, mis en cache pour la durée de la visite. */
export function getServerStatus(): Promise<ServerStatus> {
  statusPromise ??= fetch(`${API}/api/health`, { signal: AbortSignal.timeout(4000) })
    .then(r => (r.ok ? r.json() : OFFLINE))
    .then(s => (s && typeof s === 'object' && 'assistant' in s ? s as ServerStatus : OFFLINE))
    .catch(() => OFFLINE);
  return statusPromise;
}

export interface ChatTurn { role: 'user' | 'assistant'; content: string }

export interface ChatPayload {
  messages: ChatTurn[];
  shop: unknown;
  products: Product[];
  visitor: unknown;
}

/**
 * Envoie la conversation à l'assistante et appelle `onText` à chaque fragment reçu.
 * Rejette l'erreur si le serveur est injoignable ou refuse la requête.
 */
export async function streamChat(payload: ChatPayload, onText: (chunk: string) => void, signal?: AbortSignal): Promise<void> {
  const res = await fetch(`${API}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 2);
      if (!line.startsWith('data:')) continue;
      const event = JSON.parse(line.slice(5));
      if (event.type === 'text') onText(event.text);
      if (event.type === 'error') throw new Error(event.message);
    }
  }
}

async function post<T>(path: string, body: unknown, pin?: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(pin ? { 'x-admin-pin': pin } : {}) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    return res.ok ? (await res.json()) as T : null;
  } catch {
    return null;
  }
}

interface SendResult { ok: boolean; simulated?: boolean; error?: string }

/** Nouvelle commande : message à la gérante + accusé de réception à la cliente. */
export const notifyOrder = (order: Order) => post<{ owner: SendResult; customer: SendResult }>('/api/notify/order', { order });

/** Changement de statut : message à la cliente (PIN gérante exigé par le serveur). */
export const notifyStatus = (order: Order, status: OrderStatus, pin: string) => post<SendResult>('/api/notify/status', { order, status }, pin);

/** Retour en stock : message aux clientes qui ont demandé une alerte. */
export const notifyRestock = (product: Product, contacts: string[], pin: string) =>
  post<{ sent: number; total: number }>('/api/notify/restock', { product: { name: product.name, slug: product.slug }, contacts }, pin);

/* ---------- Statut WhatsApp : vitrine, visites, notes vocales ---------- */

export interface ShowcaseItem { slug: string; addedAt: string }
export type VisitSource = 'statut' | 'partage' | 'vitrine';
export type VisitStats = Record<string, { statut: number; partage: number; vitrine: number; last: string | null }>;

async function getJson<T>(path: string, pin?: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { headers: pin ? { 'x-admin-pin': pin } : {}, signal: AbortSignal.timeout(6000) });
    return res.ok ? (await res.json()) as T : null;
  } catch {
    return null;
  }
}

/** Pièces mises en statut (vitrine du jour), partagées par toutes les visiteuses. */
export const getShowcase = () => getJson<{ items: ShowcaseItem[] }>('/api/showcase').then(r => r?.items ?? null);
export const setShowcase = (slug: string, action: 'add' | 'remove', pin: string) =>
  post<{ items: ShowcaseItem[] }>('/api/showcase', { slug, action }, pin).then(r => r?.items ?? null);

/** Compte une visite arrivée depuis un statut ou un lien partagé (sans bloquer l'affichage). */
export function trackVisit(slug: string, source: VisitSource) {
  fetch(`${API}/api/track`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, source }), keepalive: true }).catch(() => {});
}
export const getVisitStats = (pin: string) => getJson<{ visits: VisitStats }>('/api/stats', pin).then(r => r?.visits ?? null);

/** Notes vocales enregistrées par la gérante. */
export const listVoices = () => getJson<{ slugs: string[] }>('/api/voice').then(r => r?.slugs ?? []);
export const voiceUrl = (slug: string) => `${API}/api/voice/${encodeURIComponent(slug)}`;
export async function uploadVoice(slug: string, blob: Blob, pin: string): Promise<boolean> {
  try {
    const res = await fetch(voiceUrl(slug), { method: 'PUT', headers: { 'Content-Type': blob.type.split(';')[0] || 'audio/webm', 'x-admin-pin': pin }, body: blob });
    return res.ok;
  } catch {
    return false;
  }
}
export async function deleteVoice(slug: string, pin: string): Promise<boolean> {
  try {
    return (await fetch(voiceUrl(slug), { method: 'DELETE', headers: { 'x-admin-pin': pin } })).ok;
  } catch {
    return false;
  }
}

/* ---------- Comptes clientes (numéro de téléphone + code WhatsApp) ---------- */

export interface Account {
  phone: string;
  firstName: string;
  lastName: string;
  zone: string;
  address: string;
  /** Dernier point de livraison choisi sur la carte */
  location?: DeliveryLocation | null;
  wishlist: string[];
  createdAt: string;
}

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

async function call<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<ApiResult<T>> {
  const { token, headers, ...rest } = init;
  try {
    const res = await fetch(`${API}${path}`, {
      ...rest,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      signal: AbortSignal.timeout(15000),
    });
    const body = res.status === 204 ? null : await res.json().catch(() => null);
    return res.ok ? { ok: true, data: body as T } : { ok: false, error: body?.error || 'Une erreur est survenue', status: res.status };
  } catch {
    return { ok: false, error: 'Pas de connexion. Vérifiez votre internet et réessayez.', status: 0 };
  }
}

export const authStart = (phone: string) =>
  call<{ sent: boolean; channel?: 'whatsapp'; devCode?: string; isNew: boolean }>('/api/auth/start', { method: 'POST', body: JSON.stringify({ phone }) });
export const authVerify = (phone: string, code: string) =>
  call<{ token: string; user: Account }>('/api/auth/verify', { method: 'POST', body: JSON.stringify({ phone, code }) });
export const authLogout = (token: string) => call<null>('/api/auth/logout', { method: 'POST', token });
export const fetchMe = (token: string) => call<{ user: Account; orders: Order[] }>('/api/me', { token });
export const updateMe = (token: string, patch: Partial<Omit<Account, 'phone' | 'createdAt'>>) =>
  call<{ user: Account }>('/api/me', { method: 'PATCH', token, body: JSON.stringify(patch) });
export const saveMyOrder = (token: string, order: Order) => call<{ ok: true }>('/api/me/orders', { method: 'POST', token, body: JSON.stringify({ order }) });

export interface CustomerRow extends Account { lastLogin?: string; orders: number; spent: number }
export const fetchCustomers = (pin: string) => getJson<{ customers: CustomerRow[] }>('/api/admin/customers', pin).then(r => r?.customers ?? null);

/* ---------- Commandes enregistrées sur le serveur + livraison suivie en direct ---------- */

/** Enregistre la commande sur le serveur (visible par la gérante) et envoie les messages WhatsApp. */
export const createOrder = (order: Order) => post<{ order: Order; owner: SendResult; customer: SendResult }>('/api/orders', { order });

export type TrackingResult = { order: Order; delivery: DeliveryInfo | null };
/** Suivi d'une commande (numéro + téléphone). `null` si introuvable ou serveur absent. */
export const lookupOrder = (id: string, phone: string) =>
  getJson<TrackingResult>(`/api/orders/lookup?id=${encodeURIComponent(id.trim())}&phone=${encodeURIComponent(phone)}`);

/* Gérante */
export const fetchAdminOrders = (pin: string) => getJson<{ orders: Order[] }>('/api/admin/orders', pin).then(r => r?.orders ?? null);
export const patchAdminOrder = (id: string, patch: { status?: OrderStatus; paymentStatus?: 'paye' | 'en_attente' }, pin: string) =>
  call<{ order: Order; sent: SendResult | null }>(`/api/admin/orders/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch), headers: { 'x-admin-pin': pin } });
export const assignDriver = (id: string, driver: { name: string; phone: string }, pin: string) =>
  call<{ delivery: DeliveryInfo; driverMessage: string; sent: SendResult | null }>(`/api/admin/orders/${encodeURIComponent(id)}/driver`, { method: 'POST', body: JSON.stringify(driver), headers: { 'x-admin-pin': pin } });

/* Livreur (lien secret) */
export interface DriverJob {
  order: {
    id: string; status: OrderStatus; total: number; paymentMethod: Order['paymentMethod']; paymentStatus: Order['paymentStatus']; items: number;
    customer: { firstName: string; lastName: string; phone: string; zone: string; address: string; notes?: string; location: DeliveryLocation | null };
  };
  delivery: DeliveryInfo;
}
export interface GpsFix { lat: number; lng: number; accuracy?: number; heading?: number | null; speed?: number | null }
const driverPath = (token: string, action = '') => `/api/driver/${encodeURIComponent(token)}${action}`;
export const fetchDriverJob = (token: string) => call<DriverJob>(driverPath(token));
export const driverStart = (token: string, fix?: GpsFix) => call<DriverJob>(driverPath(token, '/start'), { method: 'POST', body: JSON.stringify(fix ?? {}) });
export const driverPosition = (token: string, fix: GpsFix) =>
  call<{ distanceM: number | null; etaMin: number | null }>(driverPath(token, '/position'), { method: 'POST', body: JSON.stringify(fix) });
export const driverDelivered = (token: string) => call<DriverJob>(driverPath(token, '/delivered'), { method: 'POST' });

/* Carte : recherche d'adresse (OpenStreetMap via le serveur) */
export interface PlaceResult { label: string; kind: string; lat: number; lng: number }
export async function searchPlaces(q: string, near?: { lat: number; lng: number }, signal?: AbortSignal): Promise<PlaceResult[] | null> {
  try {
    const bias = near ? `&lat=${near.lat}&lng=${near.lng}` : '';
    const res = await fetch(`${API}/api/geo/search?q=${encodeURIComponent(q)}${bias}`, { signal });
    return res.ok ? ((await res.json()).results as PlaceResult[]) : null;
  } catch {
    return null;
  }
}
export const reverseGeocode = (p: { lat: number; lng: number }) =>
  getJson<{ label: string; area: string; city: string }>(`/api/geo/reverse?lat=${p.lat.toFixed(6)}&lng=${p.lng.toFixed(6)}`);
