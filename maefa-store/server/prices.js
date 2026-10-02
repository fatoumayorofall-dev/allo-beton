// ============================================================
//  PRIX CONFIDENTIELS (même règle que SITE_CONFIG.confidentialPrices et PRICE_BANDS dans src/config/site.ts)
//  Les aperçus de liens (WhatsApp, Facebook, Google) montrent la classe de prix, jamais le prix exact.
// ============================================================
export const CONFIDENTIAL_PRICES = true;

const BANDS = [
  [10000, 'Moins de 10 000 F'],
  [20000, '10 000 – 20 000 F'],
  [30000, '20 000 – 30 000 F'],
  [50000, '30 000 – 50 000 F'],
  [Infinity, 'Plus de 50 000 F'],
];
export const priceBandLabel = n => (BANDS.find(([max]) => Number(n) < max) ?? BANDS[BANDS.length - 1])[1];
const fcfa = n => `${Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ')} FCFA`;

/** Prix montré au public : la classe de prix si les prix sont confidentiels. */
export const publicPrice = p => (CONFIDENTIAL_PRICES ? p.priceLabel ?? priceBandLabel(p.price) : fcfa(p.price));
