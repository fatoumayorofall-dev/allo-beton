// ============================================================
//  PLACE DE MARCHÉ — CALCULS D'ARGENT (fonctions pures, testées seules)
//  - prix de la livraison selon la distance entre le vendeur et l'acheteur ;
//  - commissions de la plateforme : vendeur (% de la vente), acheteur (frais de service),
//    livreur (% de la course).
//  Tous les montants sont en francs CFA entiers.
// ============================================================

/** Réglages par défaut : modifiables par la gérante depuis l'espace gérant. */
export const DEFAULT_MP_SETTINGS = Object.freeze({
  /** Commission sur la vente, payée par le vendeur (7 %) */
  sellerRate: 0.07,
  /** Frais de service payés par l'acheteur, par commande */
  buyerFee: 150,
  /** Commission sur la course, payée par le livreur (10 %) */
  driverRate: 0.1,
  /** Prix de la livraison : prise en charge + prix au kilomètre, arrondi à 100 F */
  delivery: Object.freeze({ base: 1000, perKm: 200, min: 1000, max: 15000 }),
  /** Vendeurs de confiance : leurs nouveaux articles sont publiés sans attendre la vérification */
  autoPublishTrusted: true,
});

/** Bornes acceptées pour chaque réglage (contrôle des modifications de la gérante). */
const BOUNDS = {
  sellerRate: [0, 0.3],
  buyerFee: [0, 2000],
  driverRate: [0, 0.3],
  'delivery.base': [0, 10000],
  'delivery.perKm': [0, 2000],
  'delivery.min': [0, 10000],
  'delivery.max': [1000, 50000],
};

/** Réglages complets à partir de ceux enregistrés (les champs manquants prennent la valeur par défaut). */
export function resolveSettings(saved) {
  const s = saved ?? {};
  return {
    ...DEFAULT_MP_SETTINGS,
    ...s,
    delivery: { ...DEFAULT_MP_SETTINGS.delivery, ...(s.delivery ?? {}) },
  };
}

/** Applique une modification en refusant les valeurs hors bornes. Renvoie { settings } ou { error }. */
export function patchSettings(current, patch) {
  const next = resolveSettings(current);
  for (const [path, [min, max]] of Object.entries(BOUNDS)) {
    const [a, b] = path.split('.');
    const v = b ? patch?.[a]?.[b] : patch?.[a];
    if (v === undefined) continue;
    const n = Number(v);
    if (!Number.isFinite(n) || n < min || n > max) return { error: `Valeur invalide pour ${path} (${min} à ${max})` };
    if (b) next[a] = { ...next[a], [b]: n };
    else next[a] = n;
  }
  if (patch?.autoPublishTrusted !== undefined) next.autoPublishTrusted = !!patch.autoPublishTrusted;
  if (next.delivery.min > next.delivery.max) return { error: 'Le minimum dépasse le maximum' };
  return { settings: next };
}

const R = 6371e3;
const rad = d => (d * Math.PI) / 180;
/** Distance à vol d'oiseau en mètres. */
export function distanceM(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
/** Distance par la route, estimée : à Dakar les rues font environ 30 % de détour. */
export const roadKm = (a, b) => Math.round((distanceM(a, b) * 1.3) / 100) / 10;

const round100 = n => Math.round(n / 100) * 100;

/** Prix de la livraison d'un vendeur jusqu'à l'acheteur. */
export function deliveryFee(from, to, settings) {
  const { base, perKm, min, max } = resolveSettings(settings).delivery;
  const km = roadKm(from, to);
  return { km, fee: Math.min(max, Math.max(min, round100(base + perKm * km))) };
}

/**
 * Commissions de la plateforme sur une commande.
 * deliveryFee : prix total de la course (le livreur paie sa commission dessus).
 */
export function commissions({ subtotal, deliveryFee: fee = 0 }, settings) {
  const s = resolveSettings(settings);
  const seller = Math.round(subtotal * s.sellerRate);
  const buyer = s.buyerFee;
  const driver = Math.round(fee * s.driverRate);
  return { seller, buyer, driver, total: seller + buyer + driver };
}

/** Le point est-il au Sénégal (cadre large) ? Évite les positions absurdes. */
export const inSenegal = p =>
  !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat > 12 && p.lat < 17 && p.lng > -18 && p.lng < -11;
