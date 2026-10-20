// ============================================================
//  LIVRAISON MOITIÉ-MOITIÉ — calculs (fonctions pures, testées seules)
//  Plusieurs commandes qui vont dans la même direction partagent un livreur :
//  - le trajet passe par chaque vendeur (enlèvement) puis chaque acheteur (dépôt), dans le meilleur ordre ;
//  - le prix de la course groupée suit le même barème que la course seule, plus un petit supplément
//    par arrêt : le livreur gagne plus qu'avec une seule course ;
//  - chacun paie une part proportionnelle à ce que lui aurait coûté sa course seule,
//    jamais plus que ce prix seul (prix plafond garanti) ;
//  - une commande ne rejoint un groupe que si personne n'y perd : la part de chacun baisse ou reste égale,
//    et le détour reste raisonnable.
// ============================================================
import { deliveryFee, resolveSettings, roadKm } from './pricing.js';

/** Réglages du partage (modifiables plus tard par la gérante). */
export const SHARING = Object.freeze({
  /** Au plus 4 commandes par course : 8 arrêts, ordre optimal calculé exactement */
  maxOrders: 4,
  /** Supplément payé au livreur par commande en plus de la première */
  perExtraStop: 300,
  /** Part minimale d'une commande (le livreur doit s'y retrouver) */
  minShare: 500,
  /** Détour accepté pour une commande : son trajet ne peut pas dépasser 1,8 fois son trajet direct */
  maxDetourRatio: 1.8,
  /** Les vendeurs d'une même course doivent être proches (km entre deux points d'enlèvement) */
  pickupRadiusKm: 4,
});

const round50 = n => Math.round(n / 50) * 50;

/** Longueur (km, par la route estimée) d'un trajet passant par les points dans l'ordre. */
export function pathKm(points) {
  let km = 0;
  for (let i = 1; i < points.length; i++) km += roadKm(points[i - 1], points[i]);
  return Math.round(km * 10) / 10;
}

/**
 * Meilleur ordre de passage : chaque enlèvement avant le dépôt correspondant.
 * orders : [{ id, from: {lat,lng}, to: {lat,lng} }] (4 au plus → 2 520 ordres possibles, calcul exact).
 * Renvoie { stops: [{ orderId, kind: 'enlevement' | 'depot', at }], km, legs: { [orderId]: km parcourus avec le colis } }.
 */
export function bestRoute(orders) {
  const all = orders.flatMap(o => [
    { orderId: o.id, kind: 'enlevement', at: o.from },
    { orderId: o.id, kind: 'depot', at: o.to },
  ]);
  let best = null;
  const used = new Array(all.length).fill(false);
  const picked = new Set();
  const seq = [];
  const walk = km => {
    if (best && km >= best.km) return; // inutile de continuer : déjà plus long
    if (seq.length === all.length) {
      best = { stops: [...seq], km };
      return;
    }
    for (let i = 0; i < all.length; i++) {
      if (used[i]) continue;
      const s = all[i];
      if (s.kind === 'depot' && !picked.has(s.orderId)) continue;
      const add = seq.length ? roadKm(seq[seq.length - 1].at, s.at) : 0;
      used[i] = true;
      seq.push(s);
      if (s.kind === 'enlevement') picked.add(s.orderId);
      walk(km + add);
      if (s.kind === 'enlevement') picked.delete(s.orderId);
      seq.pop();
      used[i] = false;
    }
  };
  walk(0);
  // Distance parcourue par chaque colis (de son enlèvement à son dépôt), pour mesurer le détour
  const legs = {};
  for (const o of orders) {
    const a = best.stops.findIndex(s => s.orderId === o.id && s.kind === 'enlevement');
    const b = best.stops.findIndex(s => s.orderId === o.id && s.kind === 'depot');
    legs[o.id] = pathKm(best.stops.slice(a, b + 1).map(s => s.at));
  }
  return { stops: best.stops, km: Math.round(best.km * 10) / 10, legs };
}

/**
 * Prix d'une course groupée et part de chacun.
 * Renvoie { km, total, driverGets, shares: { [orderId]: { solo, share, saving } }, route }.
 */
export function groupPrice(orders, settings, opts = SHARING) {
  const s = resolveSettings(settings);
  const route = bestRoute(orders);
  const solo = Object.fromEntries(orders.map(o => [o.id, deliveryFee(o.from, o.to, s).fee]));
  const { base, perKm, max } = s.delivery;
  // Barème de la course seule appliqué au trajet complet, + supplément par commande ajoutée
  const raw = base + perKm * route.km + opts.perExtraStop * (orders.length - 1);
  const sumSolo = Object.values(solo).reduce((t, v) => t + v, 0);
  const total = Math.min(round50(raw), sumSolo, max * orders.length);
  const shares = {};
  for (const o of orders) {
    const fair = (total * solo[o.id]) / sumSolo;
    const share = Math.min(solo[o.id], Math.max(opts.minShare, round50(fair)));
    shares[o.id] = { solo: solo[o.id], share, saving: solo[o.id] - share };
  }
  const collected = Object.values(shares).reduce((t, v) => t + v.share, 0);
  return { km: route.km, total: collected, driverGets: collected, shares, route };
}

/**
 * Une commande peut-elle rejoindre un groupe ? Seulement si :
 * - le groupe n'est pas plein, les vendeurs sont proches ;
 * - aucun colis ne fait un trop grand détour ;
 * - la part de chacun des membres baisse ou reste égale, et le nouveau venu paie moins que seul.
 * Renvoie { ok: true, price } ou { ok: false, reason }.
 */
export function canJoin(members, candidate, settings, opts = SHARING) {
  if (members.length >= opts.maxOrders) return { ok: false, reason: 'complet' };
  if (members.some(m => roadKm(m.from, candidate.from) > opts.pickupRadiusKm))
    return { ok: false, reason: 'vendeurs trop éloignés' };
  const before = members.length ? groupPrice(members, settings, opts) : null;
  const after = groupPrice([...members, candidate], settings, opts);
  for (const o of [...members, candidate]) {
    const direct = roadKm(o.from, o.to);
    if (direct > 0 && after.route.legs[o.id] > Math.max(direct * opts.maxDetourRatio, direct + 2))
      return { ok: false, reason: 'détour trop long' };
  }
  if (before && members.some(m => after.shares[m.id].share > before.shares[m.id].share))
    return { ok: false, reason: 'un membre paierait plus' };
  if (after.shares[candidate.id].share >= after.shares[candidate.id].solo)
    return { ok: false, reason: 'aucune économie' };
  return { ok: true, price: after };
}

/** Choisit, parmi les groupes ouverts, celui où le nouveau venu paie le moins. */
export function bestGroup(groups, candidate, settings, opts = SHARING) {
  let best = null;
  for (const g of groups) {
    const r = canJoin(g.orders, candidate, settings, opts);
    if (r.ok && (!best || r.price.shares[candidate.id].share < best.price.shares[candidate.id].share))
      best = { group: g, price: r.price };
  }
  return best;
}
