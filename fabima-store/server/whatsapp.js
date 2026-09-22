// ============================================================
//  NOTIFICATIONS WHATSAPP (Twilio) — même fournisseur qu'Allô Béton
//  Sans configuration, les envois sont simulés (journalisés) et la
//  boutique propose à la gérante l'envoi manuel en un clic.
// ============================================================
import twilio from 'twilio';

const {
  TWILIO_ACCOUNT_SID = '',
  TWILIO_AUTH_TOKEN = '',
  TWILIO_WHATSAPP_FROM = '',          // ex : whatsapp:+14155238886 (bac à sable) ou votre numéro WhatsApp Business
  OWNER_WHATSAPP = '',                // numéro de la gérante, ex : +221770000000
  SITE_URL = 'http://localhost:5174',
  // Modèles de messages approuvés par Meta (obligatoires hors fenêtre de 24 h en production)
  TWILIO_TPL_NEW_ORDER = '',
  TWILIO_TPL_ORDER_RECEIVED = '',
  TWILIO_TPL_STATUS = '',
} = process.env;

const client = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) : null;

export const whatsappEnabled = () => !!(client && TWILIO_WHATSAPP_FROM);
export const ownerConfigured = () => !!OWNER_WHATSAPP;

/** Numéro sénégalais « 77 123 45 67 » → « +221771234567 ». */
export function toE164(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('221') && digits.length === 12) return `+${digits}`;
  if (digits.length === 9 && digits.startsWith('7')) return `+221${digits}`;
  if (String(phone).trim().startsWith('+') && digits.length >= 8) return `+${digits}`;
  return null;
}

const fcfa = n => `${Math.round(Number(n) || 0).toLocaleString('fr-FR').replace(/ /g, ' ')} FCFA`;

const PAYMENT = { wave: 'Wave', orange_money: 'Orange Money', free_money: 'Free Money', card: 'Carte bancaire', cash: 'À la livraison' };

export const STATUS_MESSAGES = {
  confirmee: 'est confirmée ✅ Nous la préparons avec soin.',
  en_preparation: 'est en cours de préparation 🎀 Elle sera bientôt prête à partir.',
  expediee: 'est en route 🛵 Notre livreur vous appellera avant de passer.',
  livree: 'a bien été livrée 🌸 Merci pour votre confiance ! Un avis sur votre pièce nous ferait très plaisir.',
  annulee: 'a été annulée. Si c\'est une erreur, répondez simplement à ce message.',
};

export function trackingUrl(order) {
  return `${SITE_URL}/suivi?commande=${encodeURIComponent(order.id)}&tel=${encodeURIComponent(order.customer.phone)}`;
}

export function buildOwnerMessage(order) {
  const c = order.customer;
  const lines = [
    `🛍️ *Nouvelle commande ${order.id}*`,
    ``,
    `👤 ${c.firstName} ${c.lastName} — ${c.phone}`,
    `📍 ${c.zone} — ${c.address}`,
    ``,
    ...order.items.map(i => `• ${i.quantity}× ${i.name}${[i.color, i.size && `T.${i.size}`].filter(Boolean).length ? ` (${[i.color, i.size && `T.${i.size}`].filter(Boolean).join(', ')})` : ''} — ${fcfa(i.price * i.quantity)}`),
    ``,
    `💰 *Total : ${fcfa(order.total)}* — ${PAYMENT[order.paymentMethod] || order.paymentMethod} (${order.paymentStatus === 'paye' ? 'payé' : 'à encaisser'})`,
  ];
  if (order.giftFee) lines.push(`🎁 Emballage cadeau${order.giftMessage ? ` : « ${order.giftMessage} »` : ''}`);
  if (c.notes) lines.push(`📝 ${c.notes}`);
  lines.push('', `Gérer : ${SITE_URL}/admin`);
  return lines.join('\n');
}

export function buildCustomerReceivedMessage(order) {
  return [
    `Bonjour ${order.customer.firstName} 🌸`,
    ``,
    `Merci pour votre commande *${order.id}* (${fcfa(order.total)}) chez Fabima Store !`,
    `Nous vous appelons très vite pour confirmer la livraison à ${order.customer.zone}.`,
    ``,
    `Suivre ma commande : ${trackingUrl(order)}`,
  ].join('\n');
}

export function buildStatusMessage(order, status) {
  const text = STATUS_MESSAGES[status];
  if (!text) return null;
  return [`Bonjour ${order.customer.firstName} 🌸`, ``, `Votre commande *${order.id}* ${text}`, ``, `Suivi : ${trackingUrl(order)}`].join('\n');
}

/**
 * Envoie un message WhatsApp. `template` = { sid, variables } si un modèle approuvé est configuré
 * (requis par WhatsApp pour écrire à quelqu'un qui ne vous a pas écrit dans les dernières 24 h).
 */
export async function sendWhatsApp(to, body, template) {
  const dest = toE164(to);
  if (!dest) return { ok: false, error: 'numéro invalide' };
  if (!whatsappEnabled()) {
    console.log(`📱 [WHATSAPP SIMULÉ] → ${dest}\n${body}\n`);
    return { ok: false, simulated: true };
  }
  try {
    const params = template?.sid
      ? { from: TWILIO_WHATSAPP_FROM, to: `whatsapp:${dest}`, contentSid: template.sid, contentVariables: JSON.stringify(template.variables) }
      : { from: TWILIO_WHATSAPP_FROM, to: `whatsapp:${dest}`, body };
    const msg = await client.messages.create(params);
    return { ok: true, sid: msg.sid };
  } catch (err) {
    console.error('WhatsApp : échec de l\'envoi', err.message);
    return { ok: false, error: err.message };
  }
}

export async function notifyNewOrder(order) {
  const owner = OWNER_WHATSAPP
    ? await sendWhatsApp(OWNER_WHATSAPP, buildOwnerMessage(order),
      TWILIO_TPL_NEW_ORDER && { sid: TWILIO_TPL_NEW_ORDER, variables: { 1: order.id, 2: `${order.customer.firstName} ${order.customer.lastName}`, 3: fcfa(order.total) } })
    : (console.log(`📱 [WHATSAPP SIMULÉ] → gérante (OWNER_WHATSAPP non configuré)\n${buildOwnerMessage(order)}\n`), { ok: false, simulated: true });
  const customer = await sendWhatsApp(order.customer.phone, buildCustomerReceivedMessage(order),
    TWILIO_TPL_ORDER_RECEIVED && { sid: TWILIO_TPL_ORDER_RECEIVED, variables: { 1: order.customer.firstName, 2: order.id, 3: fcfa(order.total) } });
  return { owner, customer };
}

export async function notifyStatus(order, status) {
  const body = buildStatusMessage(order, status);
  if (!body) return { ok: false, error: 'statut sans message' };
  return sendWhatsApp(order.customer.phone, body,
    TWILIO_TPL_STATUS && { sid: TWILIO_TPL_STATUS, variables: { 1: order.customer.firstName, 2: order.id, 3: STATUS_MESSAGES[status] } });
}

export function buildRestockMessage(product) {
  return [`Bonjour 🌸`, ``, `Bonne nouvelle : *${product.name}* est de retour chez Fabima Store !`, `Les pièces partent vite : ${SITE_URL}/produit/${product.slug}`].join('\n');
}
