/**
 * Goûts du client pour le fil « Pour vous », calculés et gardés sur SON téléphone :
 * rayons et vendeurs qu'il regarde, aime ou met au panier, et sa gamme de prix.
 * Les goûts s'effacent doucement (3 % par jour) pour suivre ses envies du moment.
 * Le serveur ne reçoit que des gestes anonymes (identifiant de visite tiré au hasard).
 */
import { API_BASE } from '../services/api';
import { visitorId } from '../utils/track';

export type Gesture = 'view' | 'dwell' | 'like' | 'unlike' | 'cart' | 'share' | 'order' | 'skip';
interface Taste {
  cats: Record<string, number>;
  sellers: Record<string, number>;
  price: { mean: number; n: number } | null;
  at: number;
}
interface Item {
  id: string;
  category: string;
  price: number;
  seller: { id: string } | null;
}

const KEY = 'mp_taste';
const LIKES = 'mp_likes';
const SEEN = 'mp_seen';
const WEIGHT: Record<Gesture, number> = {
  view: 1,
  dwell: 2,
  like: 4,
  unlike: -4,
  cart: 5,
  share: 4,
  order: 8,
  skip: -1,
};
/** Gestes qui disent « ça me plaît » : ils comptent pour la gamme de prix */
const POSITIVE = new Set<Gesture>(['dwell', 'like', 'cart', 'share', 'order']);

const load = <T>(k: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};
const save = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* stockage indisponible : les goûts restent le temps de la visite */
  }
};

export function getTaste(): Omit<Taste, 'at'> {
  const t = load<Taste>(KEY, { cats: {}, sellers: {}, price: null, at: Date.now() });
  const fade = 0.97 ** Math.max(0, (Date.now() - t.at) / 864e5);
  const scale = (o: Record<string, number>) =>
    Object.fromEntries(
      Object.entries(o)
        .map(([k, v]) => [k, Math.round(v * fade * 100) / 100])
        .filter(([, v]) => +v > 0.05),
    );
  return { cats: scale(t.cats), sellers: scale(t.sellers), price: t.price };
}

/** Articles vus récemment (pour ne pas les remontrer tout de suite) */
export const getSeen = (): string[] => load<string[]>(SEEN, []);
export const isLiked = (id: string) => load<string[]>(LIKES, []).includes(id);

/* ---------- Envoi groupé des gestes anonymes ---------- */
const queue: { t: Gesture; id: string }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
function flush() {
  timer = null;
  if (!queue.length) return;
  const body = JSON.stringify({ v: visitorId(), events: queue.splice(0, 40) });
  try {
    if (!navigator.sendBeacon?.(`${API_BASE}/api/mp/events`, new Blob([body], { type: 'application/json' })))
      throw new Error('beacon');
  } catch {
    fetch(`${API_BASE}/api/mp/events`, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {});
  }
}
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
}

/** Note un geste : met à jour les goûts sur le téléphone et prévient le serveur (anonymement). */
export function note(item: Item, g: Gesture) {
  const old = load<Taste>(KEY, { cats: {}, sellers: {}, price: null, at: Date.now() });
  const t = { ...getTaste(), at: Date.now() };
  const w = WEIGHT[g];
  const add = (o: Record<string, number>, k: string | undefined) => {
    if (!k) return;
    o[k] = Math.min(100, Math.max(0, (o[k] ?? 0) + w));
  };
  add(t.cats, item.category);
  add(t.sellers, item.seller?.id);
  // On garde les 40 vendeurs les plus regardés
  t.sellers = Object.fromEntries(
    Object.entries(t.sellers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40),
  );
  if (POSITIVE.has(g) && item.price > 0) {
    const n = Math.min((old.price?.n ?? 0) + 1, 50);
    const mean = old.price ? old.price.mean + (Math.log(item.price) - old.price.mean) / n : Math.log(item.price);
    t.price = { mean, n };
  }
  save(KEY, t);
  if (g === 'view') save(SEEN, [item.id, ...getSeen().filter(x => x !== item.id)].slice(0, 200));
  if (g === 'like' || g === 'unlike') {
    const likes = load<string[]>(LIKES, []).filter(x => x !== item.id);
    save(LIKES, g === 'like' ? [item.id, ...likes].slice(0, 500) : likes);
  }
  if (g !== 'order') {
    queue.push({ t: g, id: item.id });
    // Gestes forts (j'aime, panier, partage) : envoyés tout de suite ; les autres sont groupés
    if (g === 'like' || g === 'unlike' || g === 'cart' || g === 'share') flush();
    else if (!timer) timer = setTimeout(flush, 1500);
  }
}
