/**
 * Messages WhatsApp pré-remplis, utilisés quand l'envoi automatique n'est pas configuré :
 * la gérante (ou la cliente) les envoie en un clic depuis WhatsApp.
 * Les textes reprennent ceux du serveur (server/whatsapp.js).
 */
import type { Order, OrderStatus } from '../data/types';
import { buildWhatsAppLink } from '../config/site';
import { formatPrice } from './format';

export const STATUS_MESSAGES: Partial<Record<OrderStatus, string>> = {
  confirmee: 'est confirmée ✅ Nous la préparons avec soin.',
  en_preparation: 'est en cours de préparation 🎀 Elle sera bientôt prête à partir.',
  expediee: 'est en route 🛵 Notre livreur vous appellera avant de passer.',
  livree: 'a bien été livrée 🌸 Merci pour votre confiance ! Un avis sur votre pièce nous ferait très plaisir.',
  annulee: 'a été annulée. Si c\'est une erreur, répondez simplement à ce message.',
};

const trackingUrl = (o: Order) =>
  `${window.location.origin}/suivi?commande=${encodeURIComponent(o.id)}&tel=${encodeURIComponent(o.customer.phone)}`;

/** Numéro de la cliente au format wa.me (221XXXXXXXXX). */
export const waNumber = (phone: string) => {
  const d = phone.replace(/\D/g, '');
  return d.length === 9 ? `221${d}` : d;
};

/** Récapitulatif complet envoyé par la cliente à la boutique après sa commande. */
export function customerOrderSummaryLink(o: Order): string {
  const lines = [
    `Bonjour Fabima Store 🌸 Je viens de passer la commande *${o.id}* :`,
    ...o.items.map(i => `• ${i.quantity}× ${i.name}${[i.color, i.size && `T.${i.size}`].filter(Boolean).length ? ` (${[i.color, i.size && `T.${i.size}`].filter(Boolean).join(', ')})` : ''}`),
    `Total : *${formatPrice(o.total)}*`,
    `Livraison : ${o.customer.zone} — ${o.customer.address}`,
    `Merci de me confirmer 🙏`,
  ];
  return buildWhatsAppLink(lines.join('\n'));
}

/** Message de statut que la gérante envoie à la cliente. */
export function statusLink(o: Order, status: OrderStatus): string | null {
  const text = STATUS_MESSAGES[status];
  if (!text) return null;
  return buildWhatsAppLink(`Bonjour ${o.customer.firstName} 🌸\n\nVotre commande *${o.id}* ${text}\n\nSuivi : ${trackingUrl(o)}`, waNumber(o.customer.phone));
}

/** Message « retour en stock » pour une cliente en attente. */
export function restockLink(productName: string, slug: string, contact: string): string | null {
  if (contact.includes('@')) return null;
  return buildWhatsAppLink(`Bonjour 🌸 Bonne nouvelle : *${productName}* est de retour chez Fabima Store ! ${window.location.origin}/produit/${slug}`, waNumber(contact));
}
