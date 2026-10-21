// ============================================================
//  TABLEAU DE BORD DE LA VENDEUSE
//  Ses ventes sur une période (7, 30, 90 jours ou 12 mois), comparées à la période d'avant :
//  chiffre d'affaires, ce qu'elle garde après commission, commandes par étape, panier moyen,
//  courbe des ventes, articles les plus vendus avec leurs visites, d'où viennent les ventes
//  (live, prix négocié, prix affiché), paiements, livraisons, clientes fidèles, lives.
//  Uniquement des chiffres : aucun numéro ni nom de cliente (loi 2008-12).
// ============================================================

export const PERIODS = [7, 30, 90, 365];
const DAY = 864e5;
const ms = v => Date.parse(v ?? 0) || 0;
const dayKey = t => new Date(t).toISOString().slice(0, 10);
/** Date de livraison d'une commande (dernière étape « livrée » de son historique) */
export const deliveredAt = o =>
  ms([...(o.history ?? [])].reverse().find(h => h.status === 'livree')?.at ?? o.updatedAt ?? o.createdAt);
const IN_PROGRESS = new Set(['nouvelle', 'acceptee', 'prete', 'en_livraison', 'retour']);
const sum = (list, f) => list.reduce((t, x) => t + (f(x) || 0), 0);
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);
const count = (list, f) => {
  const out = {};
  for (const x of list) {
    const k = f(x);
    if (k) out[k] = (out[k] ?? 0) + 1;
  }
  return out;
};
/** Visites des articles entre deux dates (compteur par jour de chaque article) */
const viewsBetween = (listing, from, to) =>
  Object.entries(listing.viewDays ?? {}).reduce((t, [d, n]) => {
    const at = ms(`${d}T12:00:00Z`);
    return at >= from - DAY / 2 && at <= to + DAY / 2 ? t + n : t;
  }, 0);

/**
 * Calcule le tableau de bord. `days` : 7, 30, 90 ou 365. Données brutes en entrée (commandes et articles
 * de la boutique) : fonction pure, testée seule.
 */
export function sellerDashboard({ seller, orders, listings, days, now = Date.now() }) {
  const since = now - days * DAY;
  const prevSince = since - days * DAY;
  const mine = orders.filter(o => o.sellerId === seller.id);
  const myListings = listings.filter(l => l.sellerId === seller.id);
  const created = mine.filter(o => ms(o.createdAt) >= since);
  const delivered = mine.filter(o => o.status === 'livree' && deliveredAt(o) >= since);
  const prevDelivered = mine.filter(
    o => o.status === 'livree' && deliveredAt(o) >= prevSince && deliveredAt(o) < since,
  );

  const revenue = sum(delivered, o => o.subtotal);
  const commission = sum(delivered, o => o.commissions?.seller);
  const prevRevenue = sum(prevDelivered, o => o.subtotal);
  const failed = created.filter(o => (o.history ?? []).some(h => h.status === 'retour'));
  const cancelled = created.filter(o => o.status === 'annulee' || o.status === 'refusee');
  const finished = created.filter(o => o.status === 'livree').length + cancelled.length;

  // Courbe : un point par jour (7 à 90 jours) ou par mois (12 mois)
  const monthly = days > 90;
  const buckets = [];
  if (monthly) {
    const d = new Date(now);
    for (let i = 11; i >= 0; i--) {
      const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
      buckets.push({ key: m.toISOString().slice(0, 7), revenue: 0, orders: 0 });
    }
  } else for (let i = days - 1; i >= 0; i--) buckets.push({ key: dayKey(now - i * DAY), revenue: 0, orders: 0 });
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  for (const o of delivered) {
    const k = monthly ? dayKey(deliveredAt(o)).slice(0, 7) : dayKey(deliveredAt(o));
    const b = buckets[index.get(k)];
    if (b) {
      b.revenue += o.subtotal;
      b.orders += 1;
    }
  }

  // Articles les plus vendus (montant), avec leurs visites sur la période
  const byListing = new Map();
  for (const o of delivered)
    for (const line of o.lines ?? []) {
      const a = byListing.get(line.listingId) ?? {
        id: line.listingId,
        title: line.title,
        photo: line.photo,
        qty: 0,
        amount: 0,
      };
      a.qty += line.qty;
      a.amount += line.price * line.qty;
      byListing.set(line.listingId, a);
    }
  const views = sum(myListings, l => viewsBetween(l, since, now));
  const top = [...byListing.values()]
    .sort((a, b) => b.amount - a.amount || b.qty - a.qty)
    .slice(0, 5)
    .map(a => {
      const l = myListings.find(x => x.id === a.id);
      return { ...a, views: l ? viewsBetween(l, since, now) : 0 };
    });
  // Articles vus mais jamais vendus sur la période : à revoir (photo, prix, description)
  const toImprove = myListings
    .filter(l => l.status === 'publiee' && !byListing.has(l.id))
    .map(l => ({ id: l.id, title: l.title, photo: l.photos?.[0] ?? null, views: viewsBetween(l, since, now) }))
    .filter(l => l.views >= 5)
    .sort((a, b) => b.views - a.views)
    .slice(0, 3);

  // D'où viennent les ventes : live, prix négocié en discutant, prix affiché
  const channels = { live: 0, negocie: 0, affiche: 0 };
  for (const o of delivered)
    for (const line of o.lines ?? [])
      channels[line.liveId ? 'live' : line.agreed ? 'negocie' : 'affiche'] += line.price * line.qty;

  // Clientes : nombre, et fidèles (au moins 2 commandes livrées dans la boutique, depuis toujours)
  const buyers = new Set(created.map(o => o.buyerPhone).filter(Boolean));
  const deliveredAll = count(
    mine.filter(o => o.status === 'livree'),
    o => o.buyerPhone,
  );
  const loyal = [...buyers].filter(p => (deliveredAll[p] ?? 0) >= 2).length;

  return {
    days,
    from: new Date(since).toISOString(),
    to: new Date(now).toISOString(),
    revenue,
    commission,
    net: revenue - commission,
    prevRevenue,
    change: prevRevenue ? Math.round(((revenue - prevRevenue) / prevRevenue) * 1000) / 10 : null,
    orders: {
      created: created.length,
      delivered: delivered.length,
      inProgress: created.filter(o => IN_PROGRESS.has(o.status)).length,
      cancelled: cancelled.length,
      failed: failed.length,
    },
    successRate: pct(created.filter(o => o.status === 'livree').length, finished),
    avgBasket: delivered.length ? Math.round(revenue / delivered.length) : 0,
    series: buckets,
    monthly,
    views,
    conversion: pct(created.length, views),
    top,
    toImprove,
    channels,
    payments: count(delivered, o => o.payment),
    deliveryModes: count(delivered, o => o.delivery?.mode),
    buyers: buyers.size,
    loyal,
    followers: (seller.followers ?? []).length,
    lives: (seller.liveHistory ?? [])
      .filter(l => ms(l.startedAt) >= since)
      .slice(-10)
      .reverse(),
  };
}
