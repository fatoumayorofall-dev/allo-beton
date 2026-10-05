/**
 * Collecte anonyme du parcours (vue, favori, panier, demande) pour les recommandations et les
 * statistiques. Identifiant de visite tiré au hasard et gardé sur le téléphone : aucune donnée
 * personnelle (ni nom, ni numéro). Envoi groupé, sans ralentir la page.
 */
import { API_BASE } from '../services/api';

export type TrackType = 'view' | 'wish' | 'cart' | 'request';

const KEY = 'maefa_visitor';
let visitor: string | null = null;
const queue: { t: TrackType; p: string }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function visitorId(): string {
  if (visitor) return visitor;
  try {
    visitor = localStorage.getItem(KEY);
    if (!visitor) {
      visitor = crypto.randomUUID();
      localStorage.setItem(KEY, visitor);
    }
  } catch {
    visitor = crypto.randomUUID();
  }
  return visitor;
}

function flush() {
  timer = null;
  if (!queue.length) return;
  const body = JSON.stringify({ visitor: visitorId(), events: queue.splice(0, 50) });
  try {
    const blob = new Blob([body], { type: 'application/json' });
    if (!navigator.sendBeacon?.(`${API_BASE}/api/events`, blob)) throw new Error('beacon');
  } catch {
    fetch(`${API_BASE}/api/events`, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {});
  }
}

export function track(t: TrackType, productId: string) {
  if (!productId || productId.startsWith('MK-')) return;
  queue.push({ t, p: productId });
  if (!timer) timer = setTimeout(flush, 2000);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
}
