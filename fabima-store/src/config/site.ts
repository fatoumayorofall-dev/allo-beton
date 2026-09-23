import type { CategoryId } from '../data/types';

/**
 * Catégories en vente. Les autres (bijoux, accessoires, prêt-à-port) restent dans le catalogue
 * mais sont masquées partout : pour les ouvrir, ajoutez simplement leur identifiant ici.
 * Ex. : ['chaussures', 'sacs', 'bijoux']
 */
export const SHOP_CATEGORIES: CategoryId[] = ['chaussures', 'sacs'];
export const isOnSale = (category: CategoryId) => SHOP_CATEGORIES.includes(category);

export const SITE_CONFIG = {
  name: 'Fabima Store',
  tagline: 'La mode au féminin',
  phone: '+221 77 000 00 00',
  phoneRaw: '+221770000000',
  whatsappRaw: '221770000000', // format wa.me
  email: 'contact@fabimastore.sn',
  address: 'Sacré-Cœur 3, Dakar, Sénégal',
  hours: {
    weekdays: '9h00 — 20h00',
    saturday: '10h00 — 20h00',
    sunday: '15h00 — 19h00',
  },
  social: {
    instagram: 'https://instagram.com/fabimastore',
    facebook: 'https://facebook.com/fabimastore',
    tiktok: 'https://tiktok.com/@fabimastore',
  },
  freeShippingThreshold: 50000,
  giftWrapFee: 2000,
  adminPin: '2026',
};

/** Point de départ des livraisons (boutique) et centre de la carte par défaut */
export const SHOP_LOCATION = { lat: 14.7195, lng: -17.4655 };

/**
 * Zones de livraison et frais (FCFA). `center` et `radiusKm` servent à reconnaître la zone
 * automatiquement à partir du point choisi sur la carte.
 */
export const DELIVERY_ZONES: { name: string; fee: number; delay: string; center?: { lat: number; lng: number }; radiusKm?: number }[] = [
  { name: 'Dakar Plateau', fee: 1500, delay: '24h', center: { lat: 14.6675, lng: -17.4365 }, radiusKm: 2.2 },
  { name: 'Médina', fee: 1500, delay: '24h', center: { lat: 14.6860, lng: -17.4520 }, radiusKm: 2.2 },
  { name: 'Sacré-Cœur / Mermoz', fee: 1500, delay: '24h', center: { lat: 14.7160, lng: -17.4700 }, radiusKm: 3.5 },
  { name: 'Almadies / Ngor', fee: 2000, delay: '24h', center: { lat: 14.7450, lng: -17.5080 }, radiusKm: 4 },
  { name: 'Parcelles Assainies', fee: 2000, delay: '24h', center: { lat: 14.7650, lng: -17.4400 }, radiusKm: 3.5 },
  { name: 'Pikine / Guédiawaye', fee: 2500, delay: '24–48h', center: { lat: 14.7600, lng: -17.3900 }, radiusKm: 5 },
  { name: 'Rufisque', fee: 3000, delay: '48h', center: { lat: 14.7200, lng: -17.2750 }, radiusKm: 6 },
  { name: 'Diamniadio', fee: 3000, delay: '48h', center: { lat: 14.7230, lng: -17.1830 }, radiusKm: 7 },
  { name: 'Thiès', fee: 4000, delay: '48–72h', center: { lat: 14.7900, lng: -16.9300 }, radiusKm: 12 },
  { name: 'Autres régions', fee: 5000, delay: '3–5 jours' },
];

/** Distance en km entre deux points GPS. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(toRad(b.lat - a.lat) / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(toRad(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** Zone de livraison correspondant à un point de la carte (la plus proche, sinon « Autres régions »). */
export function zoneForPoint(p: { lat: number; lng: number }): string {
  let best: { name: string; score: number } | null = null;
  for (const z of DELIVERY_ZONES) {
    if (!z.center || !z.radiusKm) continue;
    const score = distanceKm(p, z.center) / z.radiusKm;
    if (!best || score < best.score) best = { name: z.name, score };
  }
  // Au-delà d'environ 2 rayons de la zone la plus proche : hors des zones listées
  return best && best.score <= 2 ? best.name : DELIVERY_ZONES[DELIVERY_ZONES.length - 1].name;
}

/** Itinéraire vers un point dans Google Maps (ouvre l'application sur téléphone). */
export const googleMapsDirections = (p: { lat: number; lng: number }) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
/** Itinéraire vers un point dans Waze. */
export const wazeDirections = (p: { lat: number; lng: number }) => `https://waze.com/ul?ll=${p.lat},${p.lng}&navigate=yes`;

/** Codes promo disponibles */
export interface PromoCode {
  label: string;
  percent?: number;
  amount?: number;
  freeShipping?: boolean;
  /** Montant minimum du sous-total pour que le code s'applique */
  minSubtotal?: number;
}

export const PROMO_CODES: Record<string, PromoCode> = {
  BIENVENUE: { label: '-10 % sur votre 1re commande', percent: 10 },
  FABIMA5000: { label: '-5 000 FCFA dès 40 000 FCFA', amount: 5000, minSubtotal: 40000 },
  LIVRAISON: { label: 'Livraison offerte', freeShipping: true },
};

export function buildWhatsAppLink(message: string, phone = SITE_CONFIG.whatsappRaw): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function buildProductWhatsAppMessage(opts: { name: string; price: number; size?: string; color?: string; url?: string }): string {
  const lines = [
    `Bonjour Fabima Store 👋`,
    ``,
    `Je suis intéressé(e) par :`,
    `▸ *${opts.name}*`,
    `▸ Prix : ${opts.price.toLocaleString('fr-FR')} FCFA`,
  ];
  if (opts.size) lines.push(`▸ Taille : ${opts.size}`);
  if (opts.color) lines.push(`▸ Couleur : ${opts.color}`);
  if (opts.url) lines.push(``, `Lien : ${opts.url}`);
  lines.push(``, `Est-il disponible ? Merci !`);
  return lines.join('\n');
}
