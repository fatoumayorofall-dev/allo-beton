/**
 * Liens courts et textes de partage pour le statut WhatsApp.
 * Lien court d'une pièce : /p/<code>, où le code est la fin de sa référence (FAB-109 → 109).
 */
import type { Product } from '../data/types';
import { formatPrice } from './format';

export const productCode = (p: Product) => p.id.replace(/^FAB-/, '').toLowerCase();

export const findByCode = (products: Product[], code: string) => {
  const c = code.toLowerCase();
  return products.find(p => productCode(p) === c || p.slug === c);
};

/** Lien court complet, ex. https://fabimastore.sn/p/109 */
export const shortLink = (p: Product, source?: 'partage') =>
  `${window.location.origin}/p/${productCode(p)}${source ? `?s=${source}` : ''}`;

/** Même lien sans « https:// », à afficher en gros sur l'image. */
export const displayLink = (p: Product) => `${window.location.host}/p/${productCode(p)}`;

export const showcaseLink = () => `${window.location.origin}/s`;

const sizeRange = (sizes: string[]) => (sizes.length > 2 && sizes.every(s => /^\d+$/.test(s)) ? `${sizes[0]} à ${sizes[sizes.length - 1]}` : sizes.join(', '));

/** Texte à coller sous l'image du statut (le lien y est cliquable). */
export function statusCaption(p: Product): string {
  const lines = [`✨ ${p.name}`, `💰 ${formatPrice(p.price)}${p.oldPrice ? ` au lieu de ${formatPrice(p.oldPrice)}` : ''}`];
  if (p.colors.length) lines.push(`🎨 ${p.colors.length > 1 ? `${p.colors.length} couleurs` : 'Couleur'} : ${p.colors.map(c => c.name).join(', ')}`);
  if (p.sizes.length) lines.push(`📏 Tailles : ${sizeRange(p.sizes)}`);
  lines.push('', `👉 Touchez ici pour voir et commander : ${shortLink(p)}`);
  return lines.join('\n');
}

/** Réponse prête pour une cliente qui répond au statut. */
export function statusReply(p: Product): string {
  return `Bonjour 🌸 Merci pour votre message ! Voici *${p.name}* à ${formatPrice(p.price)}. Toutes les photos, couleurs et tailles sont ici : ${shortLink(p)}\nDites-moi la couleur et la taille, je vous la réserve 😊`;
}

/** Phrase lue à voix haute quand la gérante n'a pas enregistré de note vocale. */
export function spokenDescription(p: Product): string {
  const parts = [`${p.name}.`, `Prix : ${Math.round(p.price).toLocaleString('fr-FR')} francs CFA.`];
  if (p.colors.length) parts.push(`Couleurs disponibles : ${p.colors.map(c => c.name).join(', ')}.`);
  if (p.sizes.length) parts.push(`Tailles : ${sizeRange(p.sizes)}.`);
  parts.push(p.stock > 0 ? 'Disponible. Livraison en vingt-quatre heures à Dakar.' : 'Cette pièce est épuisée pour le moment.');
  parts.push('Pour commander, touchez le gros bouton vert WhatsApp.');
  return parts.join(' ');
}
