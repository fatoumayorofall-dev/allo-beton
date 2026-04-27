export const SITE_CONFIG = {
  name: 'Allô Béton',
  legal: {
    ninea: '0051234567',
    rccm: 'SN DKR 2020 B 12345',
    tva: 'SN-12345678',
  },
  phone: '+221 33 860 12 34',
  phoneRaw: '+221338601234',
  whatsapp: '+221773093819',
  whatsappRaw: '221773093819', // format pour wa.me
  email: 'contact@allobeton.sn',
  address: 'Zone industrielle, Dakar, Sénégal',
  hours: {
    weekdays: '7h30 — 18h30',
    saturday: '8h00 — 16h00',
    sunday: 'Fermé',
  },
  social: {
    facebook: 'https://facebook.com/allobeton',
    instagram: 'https://instagram.com/allobeton',
    linkedin: 'https://linkedin.com/company/allobeton',
  },
  zones: [
    'Dakar Plateau',
    'Almadies',
    'Médina',
    'Parcelles Assainies',
    'Pikine',
    'Guédiawaye',
    'Rufisque',
    'Thiès',
    'Diamniadio',
  ],
};

/**
 * Construit un lien WhatsApp avec message pré-rempli
 * Ex: buildWhatsAppLink('Bonjour, je veux commander du béton')
 */
export function buildWhatsAppLink(message: string, phone = SITE_CONFIG.whatsappRaw): string {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encoded}`;
}

/**
 * Message de devis pré-rempli pour un produit
 */
export function buildProductInquiryMessage(opts: {
  productName: string;
  sku?: string;
  quantity?: number;
  unit?: string;
  price?: number;
  url?: string;
}): string {
  const { productName, sku, quantity, unit, price, url } = opts;
  const lines = [
    `Bonjour Allô Béton 👋`,
    ``,
    `Je souhaite un devis pour :`,
    `▸ *${productName}*${sku ? ` (${sku})` : ''}`,
  ];
  if (quantity) {
    lines.push(`▸ Quantité : ${quantity} ${unit || ''}`.trim());
  }
  if (price && quantity) {
    const total = price * quantity;
    lines.push(`▸ Estimation : ${total.toLocaleString('fr-FR')} FCFA`);
  }
  if (url) {
    lines.push(``, `Lien produit : ${url}`);
  }
  lines.push(``, `Merci !`);
  return lines.join('\n');
}

/**
 * Message de devis béton calculé
 */
export function buildQuoteMessage(opts: {
  length: number;
  width: number;
  depth: number;
  volume: number;
  estimatedPrice?: number;
}): string {
  const { length, width, depth, volume, estimatedPrice } = opts;
  const lines = [
    `Bonjour Allô Béton 👋`,
    ``,
    `Je souhaite un devis pour une dalle béton :`,
    `▸ Longueur : ${length} m`,
    `▸ Largeur : ${width} m`,
    `▸ Épaisseur : ${depth} m`,
    `▸ Volume : *${volume.toFixed(2)} m³*`,
  ];
  if (estimatedPrice) {
    lines.push(`▸ Estimation : ${estimatedPrice.toLocaleString('fr-FR')} FCFA`);
  }
  lines.push(``, `Pouvez-vous me confirmer le prix et la disponibilité ?`, ``, `Merci !`);
  return lines.join('\n');
}
