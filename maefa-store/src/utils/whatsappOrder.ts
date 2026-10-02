/**
 * « Acheter » = demande sur WhatsApp. La boutique est revendeuse : la gérante vérifie chez son
 * fournisseur avant de confirmer. La cliente arrive sur WhatsApp avec tout le détail (articles,
 * couleur, pointure, quantité, prix, lien photo) et une référence DEM-XXXX ; la demande est notée
 * sur le serveur pour que la gérante puisse répondre « disponible » en un geste.
 */
import { SITE_CONFIG, buildWhatsAppLink } from '../config/site';
import type { CustomerInfo, RequestItem } from '../data/types';
import { createRequest } from '../services/api';
import { formatPrice, pricesHidden } from './format';

// Sans I, O, 0, 1 : impossible à confondre en le lisant au téléphone
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newRequestId(): string {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  return `DEM-${Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('')}`;
}

const productLink = (productId: string) => `${window.location.origin}/p/${productId.replace(/^(MAE|EFA|FAB)-/, '').toLowerCase()}`;

export function buildOrderMessage(items: RequestItem[], id: string, customer?: CustomerInfo | null): string {
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const lines = [`Bonjour ${SITE_CONFIG.name} 👋`, ``, `Je voudrais commander :`];
  for (const it of items) {
    const details = [it.color && `couleur ${it.color}`, it.size && `pointure ${it.size}`, `quantité ${it.quantity}`].filter(Boolean).join(' · ');
    // Prix confidentiels : la cliente ne voit pas le prix exact dans son message, la gérante le donne en réponse
    lines.push(``, `▸ *${it.name}*`, `   ${details}`, ...(pricesHidden() ? [] : [`   ${formatPrice(it.price * it.quantity)}`]), `   ${productLink(it.productId)}`);
  }
  if (!pricesHidden()) lines.push(``, `Total : *${formatPrice(total)}* (livraison en plus)`);
  if (customer?.firstName) lines.push(``, `Je suis ${customer.firstName}${customer.zone ? `, quartier ${customer.zone}` : ''}.`);
  lines.push(``, `Réf. ${id}`, pricesHidden() ? `Est-ce disponible, et à quel prix ? Merci 🙏` : `Est-ce disponible ? Merci 🙏`);
  return lines.join('\n');
}

/** Note la demande et ouvre WhatsApp tout de suite (dans le même geste : jamais bloqué par le téléphone). */
export function startWhatsAppOrder(items: RequestItem[], customer?: CustomerInfo | null): string {
  const id = newRequestId();
  createRequest({ id, items, customer: customer ? { firstName: customer.firstName, phone: customer.phone, zone: customer.zone } : undefined });
  const link = buildWhatsAppLink(buildOrderMessage(items, id, customer));
  const mobile = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  if (mobile) window.location.href = link;
  else window.open(link, '_blank', 'noopener');
  return id;
}
