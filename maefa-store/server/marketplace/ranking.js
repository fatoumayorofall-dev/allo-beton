// ============================================================
//  FIL « POUR VOUS » — classement des articles (fonctions pures, testées seules)
//  Comme TikTok, le fil apprend ce que chaque client aime, mais il tient aussi compte de ce qui
//  compte au Sénégal : la distance (livraison moins chère et plus rapide) et le sérieux du vendeur.
//  Score d'un article =
//     goûts du client (rayons et vendeurs qu'il regarde, aime, met au panier ; gamme de prix)
//   + tendance (vues, « j'aime », paniers, commandes, avec une demi-vie de 3 jours)
//   + nouveauté + proximité du vendeur + sérieux du vendeur (ventes livrées, peu d'annulations)
//  puis : un article sur six « à découvrir » hors de ses habitudes (pour ne pas l'enfermer),
//  et pas deux articles du même vendeur à la suite.
//  Les goûts sont calculés et gardés sur le téléphone du client (aucune donnée personnelle ici).
// ============================================================
import { roadKm } from './pricing.js';

/** Poids des gestes dans la tendance d'un article */
export const SIGNALS = Object.freeze({
  view: 1,
  dwell: 1.5, // regardé plus de 5 secondes
  like: 3,
  unlike: -3,
  cart: 4,
  share: 5,
  order: 8,
  skip: -0.3, // passé en moins de 2 secondes
});
const COUNTED = { view: 'views', like: 'likes', cart: 'carts', share: 'shares', order: 'orders' };
export const HALF_LIFE_HOURS = 72;

/** Tendance d'un article à l'instant `now` : elle s'efface de moitié tous les 3 jours. */
export function heat(stats, now = Date.now()) {
  if (!stats?.hot || !stats.at) return 0;
  const hours = Math.max(0, (now - Date.parse(stats.at)) / 3.6e6);
  return stats.hot * 0.5 ** (hours / HALF_LIFE_HOURS);
}

/** Ajoute un geste aux statistiques d'un article (nouvel objet). */
export function bump(stats, kind, now = Date.now()) {
  const w = SIGNALS[kind];
  if (w === undefined) return stats ?? {};
  const next = { ...(stats ?? {}), hot: Math.max(0, heat(stats, now) + w), at: new Date(now).toISOString() };
  const k = COUNTED[kind];
  if (k) next[k] = (next[k] ?? 0) + 1;
  if (kind === 'unlike') next.likes = Math.max(0, (next.likes ?? 0) - 1);
  return next;
}

/** Goûts envoyés par le téléphone, nettoyés (le navigateur peut envoyer n'importe quoi). */
export function cleanTaste(raw, categoryIds) {
  const num = v => Math.min(100, Math.max(0, Number(v) || 0));
  const cats = {};
  for (const [k, v] of Object.entries(raw?.cats ?? {})) if (categoryIds.has(k)) cats[k] = num(v);
  const sellers = {};
  for (const [k, v] of Object.entries(raw?.sellers ?? {}).slice(0, 40))
    if (/^V-[A-Z0-9]{6}$/.test(k)) sellers[k] = num(v);
  const mean = Number(raw?.price?.mean);
  const n = Number(raw?.price?.n);
  const price = Number.isFinite(mean) && mean > 0 && mean < 20 && n > 0 ? { mean, n: Math.min(n, 1000) } : null;
  return { cats, sellers, price };
}

/** Petit générateur pseudo-aléatoire reproductible (même ordre pour une même personne le même jour). */
function seeded(seed) {
  let h = 2166136261;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const WHY = {
  interest: 'Pour vous',
  trend: 'Tendance',
  fresh: 'Nouveau',
  near: 'Près de chez vous',
  discover: 'À découvrir',
};

/**
 * Classe les articles pour une personne.
 * items : [{ id, category, sellerId, price, createdAt, stats, sellerLocation, sellerQuality (0..1) }]
 * ctx : { taste, near: {lat,lng} | null, seen: Set<id>, seed, now }
 * Renvoie [{ id, score, why }] dans l'ordre d'affichage.
 */
export function rankFeed(items, ctx = {}) {
  const now = ctx.now ?? Date.now();
  const taste = ctx.taste ?? { cats: {}, sellers: {}, price: null };
  const seen = ctx.seen ?? new Set();
  const maxCat = Math.max(0, ...Object.values(taste.cats));
  const maxSeller = Math.max(0, ...Object.values(taste.sellers));
  const knows = maxCat > 0 || maxSeller > 0;
  const heats = items.map(i => heat(i.stats, now));
  const maxHeat = Math.max(0, ...heats);

  // Sans goûts connus (nouveau client) : la tendance et la nouveauté prennent la place des goûts
  const W = knows
    ? { interest: 0.35, price: 0.08, trend: 0.2, fresh: 0.12, near: 0.15, quality: 0.1 }
    : { interest: 0, price: 0, trend: 0.38, fresh: 0.22, near: 0.25, quality: 0.15 };

  const scored = items.map((it, idx) => {
    const interest = knows
      ? 0.7 * ((taste.cats[it.category] ?? 0) / (maxCat || 1)) +
        0.3 * ((taste.sellers[it.sellerId] ?? 0) / (maxSeller || 1))
      : 0;
    const priceFit =
      taste.price && taste.price.n >= 3 && it.price > 0
        ? Math.exp(-((Math.log(it.price) - taste.price.mean) ** 2) / (2 * 0.6 ** 2))
        : 0.5;
    const trend = maxHeat > 0 ? Math.log1p(heats[idx]) / Math.log1p(maxHeat) : 0;
    const ageDays = Math.max(0, (now - Date.parse(it.createdAt)) / 864e5);
    const fresh = 0.5 ** (ageDays / 7);
    const near = ctx.near && it.sellerLocation ? 1 / (1 + roadKm(ctx.near, it.sellerLocation) / 5) : 0;
    const quality = it.sellerQuality ?? 0.5;
    const parts = {
      interest: W.interest * interest,
      trend: W.trend * trend,
      fresh: W.fresh * fresh,
      near: W.near * near,
    };
    let score = parts.interest + parts.trend + parts.fresh + parts.near + W.price * priceFit + W.quality * quality;
    if (seen.has(it.id)) score *= 0.35; // déjà vu récemment : plus loin dans le fil
    const top = Object.entries(parts).sort((a, b) => b[1] - a[1])[0];
    return { it, score, interest, why: top[1] > 0 ? top[0] : 'fresh' };
  });

  // Ordre : meilleur score d'abord, avec diversité (vendeur, rayon) et une place sur six pour la découverte
  const rand = seeded(ctx.seed ?? 'maefa');
  const pool = scored.sort((a, b) => b.score - a.score);
  const out = [];
  while (pool.length) {
    const slot = out.length;
    let pickIdx = 0;
    if (knows && slot % 6 === 5) {
      // Découverte : un article hors de ses rayons préférés, tiré parmi les mieux notés
      const outside = pool.map((p, i) => [p, i]).filter(([p]) => p.interest < 0.2);
      if (outside.length) pickIdx = outside[Math.floor(rand() * Math.min(outside.length, 8))][1];
    } else {
      // Diversité : on évite le même vendeur deux fois de suite et le même rayon trois fois de suite
      const recent = out.slice(-3);
      let best = -Infinity;
      for (let i = 0; i < Math.min(pool.length, 30); i++) {
        const p = pool[i];
        let s = p.score;
        if (recent.at(-1)?.it.sellerId === p.it.sellerId) s *= 0.5;
        if (recent.length >= 2 && recent.slice(-2).every(r => r.it.category === p.it.category)) s *= 0.8;
        if (s > best) {
          best = s;
          pickIdx = i;
        }
      }
    }
    const [p] = pool.splice(pickIdx, 1);
    out.push({ ...p, why: knows && slot % 6 === 5 && p.interest < 0.2 ? 'discover' : p.why });
  }
  return out.map(p => ({ id: p.it.id, score: Math.round(p.score * 1000) / 1000, why: WHY[p.why] }));
}
