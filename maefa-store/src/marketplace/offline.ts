/**
 * Sans réseau (coupure, délestage, zone sans couverture) : le téléphone garde les dernières informations
 * reçues (commandes, codes de remise, course du livreur) et les actions du livreur attendent le retour
 * du réseau pour partir. Le serveur revérifie tout à l'arrivée (codes, étapes) : rien n'est validé sur
 * le téléphone seul.
 */
import { useEffect, useState } from 'react';
import { readToken } from '../context/AccountContext';
import type { Result, TripStop } from './api';

const KEY = 'mp_off_';
/** Lié à la connexion : une autre personne connectée sur ce téléphone ne voit pas ces informations */
const scope = () => (readToken() ?? '').slice(-16);

export function remember<T>(name: string, data: T) {
  try {
    localStorage.setItem(KEY + name, JSON.stringify({ scope: scope(), at: Date.now(), data }));
  } catch {
    /* mémoire pleine ou désactivée : tant pis, on reste en direct */
  }
}
export function recall<T>(name: string): { data: T; at: number } | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY + name) ?? 'null');
    return v && v.scope === scope() ? { data: v.data as T, at: v.at as number } : null;
  } catch {
    return null;
  }
}

/** En ligne ou non (le navigateur prévient quand le réseau tombe ou revient). */
export function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/* ---------- Actions du livreur en attente de réseau ---------- */
export interface QueuedStop {
  id: string;
  tripId: string;
  orderId: string;
  kind: TripStop['kind'];
  code?: string;
  /** Livraison ratée (au lieu d'un arrêt fait) */
  fail?: 'absent' | 'refus';
  /** Heure réelle de l'action, envoyée au serveur pour l'historique */
  at: string;
}
const QUEUE = `${KEY}file`;
/** La file n'est pas liée à la connexion : une reconnexion ne doit pas perdre des livraisons faites */
export function queued(): QueuedStop[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE) ?? '[]');
  } catch {
    return [];
  }
}
const save = (q: QueuedStop[]) => {
  try {
    localStorage.setItem(QUEUE, JSON.stringify(q));
  } catch {
    /* ignore */
  }
};
export function enqueue(item: Omit<QueuedStop, 'id' | 'at'>) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  save([...queued(), { ...item, id, at: new Date().toISOString() }]);
}

/**
 * Envoie les actions en attente, dans l'ordre. S'arrête si le réseau manque encore.
 * Renvoie les refus du serveur (ex. : code faux) pour les montrer au livreur.
 */
export async function flushQueue(send: (q: QueuedStop) => Promise<Result<unknown>>): Promise<string[]> {
  const problems: string[] = [];
  for (const q of queued()) {
    const r = await send(q);
    if (!r.ok && r.status === 0) break;
    save(queued().filter(x => x.id !== q.id));
    if (!r.ok && r.error !== 'Déjà fait') problems.push(`Commande ${q.orderId} : ${r.error}`);
  }
  return problems;
}

/**
 * La course telle que le livreur la voit, avec ses actions pas encore envoyées : arrêts faits « en attente »,
 * et pour une livraison ratée, l'arrêt de retour chez le vendeur.
 */
export function withPending<T extends { id: string; stops: (TripStop & { pending?: boolean })[] }>(trip: T): T {
  const mine = queued().filter(q => q.tripId === trip.id);
  if (!mine.length) return trip;
  const stops = trip.stops.map(s => {
    const q = mine.find(x => x.orderId === s.orderId && (x.kind === s.kind || (x.fail && s.kind === 'depot')));
    return q && !s.done ? { ...s, done: true, pending: true, ...(q.fail ? { failed: q.fail } : {}) } : s;
  });
  for (const q of mine.filter(x => x.fail))
    if (!stops.some(s => s.orderId === q.orderId && s.kind === 'retour')) {
      const pickup = stops.find(s => s.orderId === q.orderId && s.kind === 'enlevement');
      if (pickup) stops.push({ ...pickup, kind: 'retour', done: false, pending: false });
    }
  return { ...trip, stops };
}
