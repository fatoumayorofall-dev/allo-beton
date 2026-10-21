// ============================================================
//  COURSES : livraison express ou moitié-moitié par les livreurs de la plateforme
//  - express : une commande, une course, le livreur part dès que le colis est prêt ;
//  - moitié-moitié : la commande rejoint le groupe ouvert où son acheteur paie le moins
//    (sans que personne n'y perde), sinon elle ouvre un groupe qui attend d'autres commandes
//    jusqu'à l'heure choisie par l'acheteur ; le groupe se ferme à cette heure ou quand il est complet ;
//  - le prix plafond (la course seule) est garanti : la part ne peut que baisser quand quelqu'un
//    rejoint ; si quelqu'un se retire, elle peut remonter, jamais au-dessus du prix seul.
//  Une course devient disponible pour les livreurs quand elle est fermée et que tous ses colis sont prêts.
// ============================================================
import crypto from 'node:crypto';
import { SHARING, bestGroup, bestRoute, groupPrice } from './sharing.js';

/** Attentes proposées à l'acheteur pour la livraison moitié-moitié (minutes) */
export const SHARE_WAITS = [30, 60, 120, 240];
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code = n => Array.from(crypto.randomBytes(n), b => ALPHABET[b % ALPHABET.length]).join('');
const DEAD = new Set(['annulee', 'refusee']);
const F = n => `${Math.round(n).toLocaleString('fr-FR')} F`;

/** Une commande vue par le calcul du partage : enlèvement chez le vendeur, dépôt chez l'acheteur. */
const leg = o => ({ id: o.id, from: o.delivery.from, to: o.delivery.to });

export function createTripService({ store, settings, notify }) {
  const now = () => new Date().toISOString();
  const ordersOf = trip => trip.orderIds.map(id => store.getMpOrder(id)).filter(Boolean);
  const live = trip => ordersOf(trip).filter(o => !DEAD.has(o.status));

  /**
   * Recalcule le trajet, le prix de la course et la part de chacun (jamais plus que son prix seul).
   * Prévient les acheteurs dont la part baisse.
   */
  function reprice(trip, { announce = true } = {}) {
    const orders = live(trip);
    if (!orders.length)
      return store.saveMpTrip({ ...trip, status: trip.status === 'terminee' ? 'terminee' : 'annulee', price: null });
    let shares;
    let km;
    let stops;
    if (trip.mode === 'partagee' && orders.length > 1) {
      const p = groupPrice(orders.map(leg), settings());
      shares = Object.fromEntries(orders.map(o => [o.id, Math.min(o.delivery.fee, p.shares[o.id].share)]));
      km = p.km;
      stops = p.route.stops;
    } else {
      shares = Object.fromEntries(orders.map(o => [o.id, o.delivery.fee]));
      const r = bestRoute(orders.map(leg));
      km = r.km;
      stops = r.stops;
    }
    // Garder ce qui est déjà fait (colis enlevé, déposé) quand le trajet est recalculé
    const done = new Set((trip.stops ?? []).filter(s => s.done).map(s => `${s.orderId}|${s.kind}`));
    const newStops = stops.map(s => ({
      orderId: s.orderId,
      kind: s.kind,
      done: done.has(`${s.orderId}|${s.kind}`),
    }));
    for (const o of orders) {
      const before = o.delivery.share ?? o.delivery.fee;
      const share = shares[o.id];
      if (share === before && o.delivery.tripId === trip.id) continue;
      store.saveMpOrder({
        ...o,
        delivery: { ...o.delivery, share, tripId: trip.id },
        total: o.subtotal + share + o.buyerFee,
      });
      if (announce && share < before)
        notify(
          o.buyerPhone,
          `🛵 Bonne nouvelle : une autre commande va dans votre direction. Livraison ${F(share)} au lieu de ${F(before)} (commande ${o.id}).`,
        );
    }
    const total = Object.values(shares).reduce((t, v) => t + v, 0);
    return store.saveMpTrip({ ...trip, stops: newStops, price: { total, km, shares } });
  }

  /** Ferme les groupes moitié-moitié dont l'heure est passée ou qui sont complets. */
  function sweep() {
    const t = Date.now();
    for (const trip of store.listMpTrips())
      if (trip.status === 'ouverte' && (Date.parse(trip.deadline) <= t || live(trip).length >= SHARING.maxOrders))
        close(trip, 'heure atteinte');
  }
  function close(trip, why = 'lancée') {
    if (trip.status !== 'ouverte') return trip;
    return store.saveMpTrip({
      ...reprice(trip, { announce: false }),
      status: 'fermee',
      closedAt: now(),
      history: [...(trip.history ?? []), { status: 'fermee', at: now(), why }],
    });
  }

  /** Groupes moitié-moitié encore ouverts qui partent au plus tard à `before` (ms). */
  const openGroups = before =>
    store
      .listMpTrips()
      .filter(t => t.mode === 'partagee' && t.status === 'ouverte' && Date.parse(t.deadline) <= before)
      .map(t => ({ trip: t, orders: live(t).map(leg) }))
      .filter(g => g.orders.length);

  /**
   * Rattache une commande à une course. Renvoie la commande à jour.
   * mode : 'express' | 'partagee' ; waitMin : attente acceptée (moitié-moitié).
   */
  function attach(order, mode, waitMin) {
    sweep();
    const at = now();
    if (mode === 'partagee') {
      const until = Date.now() + waitMin * 60e3;
      const best = bestGroup(openGroups(until), leg(order), settings());
      if (best) {
        const trip = best.group.trip;
        store.saveMpOrder({
          ...order,
          delivery: { ...order.delivery, tripId: trip.id, deadline: trip.deadline },
        });
        const saved = reprice(
          store.saveMpTrip({
            ...trip,
            orderIds: [...trip.orderIds, order.id],
            history: [...(trip.history ?? []), { status: 'rejointe', at, orderId: order.id }],
          }),
        );
        if (live(saved).length >= SHARING.maxOrders) close(saved, 'complète');
        return store.getMpOrder(order.id);
      }
    }
    const trip = store.saveMpTrip({
      id: `T-${code(6)}`,
      mode,
      status: mode === 'partagee' ? 'ouverte' : 'fermee',
      orderIds: [order.id],
      deadline: mode === 'partagee' ? new Date(Date.now() + waitMin * 60e3).toISOString() : null,
      driverId: null,
      stops: [],
      createdAt: at,
      history: [{ status: mode === 'partagee' ? 'ouverte' : 'fermee', at }],
    });
    store.saveMpOrder({
      ...order,
      delivery: { ...order.delivery, tripId: trip.id, deadline: trip.deadline },
    });
    reprice(trip, { announce: false });
    return store.getMpOrder(order.id);
  }

  /** Commande refusée ou annulée : retirée de sa course (les autres parts sont recalculées). */
  function detach(order) {
    const trip = order.delivery?.tripId && store.getMpTrip(order.delivery.tripId);
    if (!trip) return;
    const saved = reprice(trip, { announce: false });
    if (saved.driverId && saved.status === 'annulee')
      notify(store.getMpDriver(saved.driverId)?.phone, `Course ${trip.id} annulée : les commandes ont été retirées.`);
  }

  /** Estimation pour le devis : part si la commande rejoignait un groupe ouvert maintenant. */
  function preview(candidate, waitMin) {
    sweep();
    const best = bestGroup(openGroups(Date.now() + waitMin * 60e3), candidate, settings());
    return best
      ? {
          share: best.price.shares[candidate.id].share,
          with: best.group.orders.length,
          deadline: best.group.trip.deadline,
        }
      : null;
  }

  /** Courses que les livreurs peuvent prendre : fermées, sans livreur, tous les colis prêts. */
  function available() {
    sweep();
    return store.listMpTrips().filter(t => {
      if (t.status !== 'fermee' || t.driverId) return false;
      const orders = live(t);
      return orders.length > 0 && orders.every(o => o.status === 'prete');
    });
  }

  const timer = setInterval(sweep, 30e3);
  timer.unref?.();

  return { attach, detach, reprice, sweep, close, preview, available, ordersOf, live };
}
