/**
 * Appels au serveur Fabima (assistant IA + notifications WhatsApp).
 * Le site reste pleinement utilisable sans serveur : chaque fonction échoue proprement
 * et l'interface bascule sur le mode manuel ou hors ligne.
 */
import type { Order, OrderStatus, Product } from '../data/types';

const API = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export interface ServerStatus {
  ok: boolean;
  assistant: boolean;
  whatsapp: boolean;
  ownerNotifications: boolean;
  adminApi: boolean;
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
