import type { CategoryId } from '../data/types';

/**
 * Catégories en vente. Les autres (bijoux, accessoires, prêt-à-port) restent dans le catalogue
 * mais sont masquées partout : pour les ouvrir, ajoutez simplement leur identifiant ici.
 * Ex. : ['chaussures', 'sacs', 'bijoux']
 */
export const SHOP_CATEGORIES: CategoryId[] = ['chaussures', 'sacs'];
export const isOnSale = (category: CategoryId) => SHOP_CATEGORIES.includes(category);

/**
 * Rubriques du site. Éteintes pour le lancement (rien à y montrer pour l'instant) ;
 * passer à true pour les rallumer : menus, pied de page, accueil et pages reviennent.
 */
export const FEATURES = {
  /** Le Marché · monde : articles commandés chez des fournisseurs étrangers */
  marche: false,
  /** Le journal : articles de conseils */
  journal: false,
  /** Lien « Offres » (pièces en promotion) */
  offres: false,
};

export const SITE_CONFIG = {
  name: 'Maefa Store',
  tagline: 'La mode au féminin',
  phone: '+221 77 309 38 19',
  phoneRaw: '+221773093819',
  whatsappRaw: '221773093819', // format wa.me
  email: 'contact@maefastore.sn',
  address: 'Boutique en ligne · Livraison partout au Sénégal',
  hours: {
    weekdays: '9h00 — 20h00',
    saturday: '10h00 — 20h00',
    sunday: '15h00 — 19h00',
  },
  social: {
    instagram: 'https://instagram.com/maefastore',
    facebook: 'https://facebook.com/maefastore',
    tiktok: 'https://tiktok.com/@maefastore',
    snapchat: 'https://www.snapchat.com/add/maefastore',
    x: 'https://x.com/maefastore',
  },
  // Logos officiels des moyens de paiement : déposer le fichier dans public/brand/ puis indiquer son chemin
  // (ex. '/brand/wave.png'). Tant qu'un chemin est vide, le nom s'affiche en toutes lettres.
  paymentLogos: { wave: '', orangeMoney: '', paydunya: '' },
  /**
   * Paiement : la cliente envoie l'argent directement sur le numéro de la boutique
   * (Wave / Orange Money), puis envoie sa commande sur WhatsApp. La gérante coche « payé » dans l'admin.
   */
  paymentNumber: '77 309 38 19',
  /** Lien de paiement Wave Business (ex. 'https://pay.wave.com/m/M_xxxx') : ajoute un bouton « Payer avec Wave » */
  waveLink: '',
  /** Carte bancaire : à activer seulement une fois une passerelle (PayDunya…) branchée */
  cardPayments: false,
  giftWrapFee: 2000,
  /**
   * Prix confidentiels : les clientes (et les autres revendeurs) ne voient qu'une classe de prix
   * (« 20 000 – 30 000 F »). Le prix exact se donne sur WhatsApp, puis s'affiche seulement sur la page
   * de commande envoyée par la gérante et dans l'espace gérant. Mettre false pour réafficher les prix.
   */
  confidentialPrices: true,
};

/** Classes de prix (FCFA) : une pièce appartient à la classe dont elle est sous le plafond `max`. */
export const PRICE_BANDS: { id: string; max: number; label: string }[] = [
  { id: 'a', max: 10000, label: 'Moins de 10 000 F' },
  { id: 'b', max: 20000, label: '10 000 – 20 000 F' },
  { id: 'c', max: 30000, label: '20 000 – 30 000 F' },
  { id: 'd', max: 50000, label: '30 000 – 50 000 F' },
  { id: 'e', max: Infinity, label: 'Plus de 50 000 F' },
];

/** Point de départ des livraisons (boutique) et centre de la carte par défaut */
export const SHOP_LOCATION = { lat: 14.7195, lng: -17.4655 };

/**
 * Zones de livraison et frais (FCFA). `center` et `radiusKm` servent à reconnaître la zone
 * automatiquement à partir du point choisi sur la carte.
 */
export const DELIVERY_ZONES: {
  name: string;
  fee: number;
  delay: string;
  center?: { lat: number; lng: number };
  radiusKm?: number;
}[] = [
  { name: 'Dakar Plateau', fee: 1500, delay: '24h', center: { lat: 14.6675, lng: -17.4365 }, radiusKm: 2.2 },
  { name: 'Médina', fee: 1500, delay: '24h', center: { lat: 14.686, lng: -17.452 }, radiusKm: 2.2 },
  { name: 'Sacré-Cœur / Mermoz', fee: 1500, delay: '24h', center: { lat: 14.716, lng: -17.47 }, radiusKm: 3.5 },
  { name: 'Almadies / Ngor', fee: 2000, delay: '24h', center: { lat: 14.745, lng: -17.508 }, radiusKm: 4 },
  { name: 'Parcelles Assainies', fee: 2000, delay: '24h', center: { lat: 14.765, lng: -17.44 }, radiusKm: 3.5 },
  { name: 'Pikine / Guédiawaye', fee: 2500, delay: '24–48h', center: { lat: 14.76, lng: -17.39 }, radiusKm: 5 },
  { name: 'Rufisque', fee: 3000, delay: '48h', center: { lat: 14.72, lng: -17.275 }, radiusKm: 6 },
  { name: 'Keur Massar', fee: 3000, delay: '48h', center: { lat: 14.782, lng: -17.316 }, radiusKm: 4 },
  { name: 'Diamniadio', fee: 3000, delay: '48h', center: { lat: 14.723, lng: -17.183 }, radiusKm: 7 },
  { name: 'Thiès', fee: 4000, delay: '48–72h', center: { lat: 14.79, lng: -16.93 }, radiusKm: 12 },
  { name: 'Mbour / Saly', fee: 4500, delay: '48–72h', center: { lat: 14.43, lng: -16.99 }, radiusKm: 12 },
  { name: 'Touba', fee: 5000, delay: '48–72h', center: { lat: 14.86, lng: -15.88 }, radiusKm: 10 },
  { name: 'Kaolack', fee: 5000, delay: '48–72h', center: { lat: 14.15, lng: -16.07 }, radiusKm: 10 },
  { name: 'Saint-Louis', fee: 5000, delay: '48–72h', center: { lat: 16.03, lng: -16.49 }, radiusKm: 10 },
  { name: 'Autres régions', fee: 5000, delay: '3–5 jours' },
];

/** Distance en km entre deux points GPS. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const h =
    Math.sin(toRad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(toRad(b.lng - a.lng) / 2) ** 2;
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
export const googleMapsDirections = (p: { lat: number; lng: number }) =>
  `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
/** Itinéraire vers un point dans Waze. */
export const wazeDirections = (p: { lat: number; lng: number }) =>
  `https://waze.com/ul?ll=${p.lat},${p.lng}&navigate=yes`;

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
  MAEFA5000: { label: '-5 000 FCFA dès 40 000 FCFA', amount: 5000, minSubtotal: 40000 },
};

/**
 * Lien WhatsApp avec message pré-rempli. api.whatsapp.com plutôt que wa.me : la redirection de wa.me
 * abîme certains émojis sur WhatsApp pour ordinateur (ils s'affichent « � »).
 */
export function buildWhatsAppLink(message: string, phone = SITE_CONFIG.whatsappRaw): string {
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
}

export function buildProductWhatsAppMessage(opts: {
  name: string;
  price: number;
  size?: string;
  color?: string;
  url?: string;
}): string {
  const lines = [
    `Bonjour Maefa Store 👋`,
    ``,
    `Je suis intéressé(e) par :`,
    `▸ *${opts.name}*`,
    ...(SITE_CONFIG.confidentialPrices ? [] : [`▸ Prix : ${opts.price.toLocaleString('fr-FR')} FCFA`]),
  ];
  if (opts.size) lines.push(`▸ Taille : ${opts.size}`);
  if (opts.color) lines.push(`▸ Couleur : ${opts.color}`);
  if (opts.url) lines.push(``, `Lien : ${opts.url}`);
  lines.push(
    ``,
    SITE_CONFIG.confidentialPrices ? `Est-il disponible, et à quel prix ? Merci !` : `Est-il disponible ? Merci !`,
  );
  return lines.join('\n');
}
