export const SITE_CONFIG = {
  name: 'Fabima Store',
  tagline: 'La mode qui vous ressemble',
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

/** Zones de livraison et frais (FCFA) */
export const DELIVERY_ZONES: { name: string; fee: number; delay: string }[] = [
  { name: 'Dakar Plateau', fee: 1500, delay: '24h' },
  { name: 'Médina', fee: 1500, delay: '24h' },
  { name: 'Sacré-Cœur / Mermoz', fee: 1500, delay: '24h' },
  { name: 'Almadies / Ngor', fee: 2000, delay: '24h' },
  { name: 'Parcelles Assainies', fee: 2000, delay: '24h' },
  { name: 'Pikine / Guédiawaye', fee: 2500, delay: '24–48h' },
  { name: 'Rufisque', fee: 3000, delay: '48h' },
  { name: 'Diamniadio', fee: 3000, delay: '48h' },
  { name: 'Thiès', fee: 4000, delay: '48–72h' },
  { name: 'Autres régions', fee: 5000, delay: '3–5 jours' },
];

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
