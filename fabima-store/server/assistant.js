// ============================================================
//  ASSISTANT IA « FABI » — conseillère virtuelle de Fabima Store
//  Claude (Anthropic) avec le catalogue et les infos boutique en contexte.
// ============================================================
import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5';
// Plafond de sortie volontairement bas : réponses de chat courtes et coût maîtrisé.
const MAX_TOKENS = 2048;

let client = null;
export const assistantEnabled = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

const INSTRUCTIONS = `Tu es « Fabi », la conseillère virtuelle de Fabima Store, boutique de mode féminine en ligne basée à Dakar (Sénégal) : chaussures, sacs, accessoires, bijoux et prêt-à-porter.

Ta façon de répondre :
- Tu réponds dans la langue de la cliente (français par défaut ; wolof ou anglais si elle écrit ainsi), avec chaleur et élégance. Tu vouvoies toujours.
- Réponses courtes : 2 à 5 phrases, ou une petite liste. Pas de titres Markdown. Emojis avec parcimonie (🌸 ✨ 🛍️).
- Quand tu recommandes une pièce, cite-la TOUJOURS sous forme de lien Markdown vers sa fiche : [Nom exact](/produit/slug). Propose 1 à 3 pièces pertinentes, avec leur prix en FCFA.
- Appuie-toi uniquement sur le catalogue et les informations fournis : n'invente jamais un produit, un prix, un stock, une taille, une couleur, une remise ou un délai. Si une pièce est épuisée (stock 0), dis-le et propose l'alerte de retour en stock sur sa fiche ou une alternative.
- Pour une question de suivi de commande, utilise les commandes de la cliente fournies dans le contexte. Sans numéro correspondant, oriente vers la page /suivi.
- Tu peux répondre brièvement à des questions générales (mode, conseils de style, entretien, culture), puis ramener gentiment vers la boutique si c'est pertinent.
- Pour une réclamation, un problème de paiement, une demande sur mesure ou si la cliente demande une personne : propose l'équipe sur WhatsApp au ${'{WHATSAPP}'}.
- Ne demande jamais de code secret, de numéro de carte ou de mot de passe. Tu ne peux pas passer commande à la place de la cliente : guide-la vers le panier.`;

const clip = (s, n) => String(s ?? '').slice(0, n);

/** Informations boutique + catalogue, rendues de manière déterministe pour profiter du cache de prompt. */
function buildShopContext(shop, products) {
  const safeShop = {
    telephone: clip(shop?.phone, 40), whatsapp: clip(shop?.whatsapp, 40), adresse: clip(shop?.address, 120), horaires: shop?.hours,
    livraison_offerte_des: shop?.freeShippingThreshold, emballage_cadeau: shop?.giftWrapFee,
    zones_livraison: (shop?.zones || []).slice(0, 20).map(z => ({ zone: clip(z.name, 60), frais: z.fee, delai: clip(z.delay, 20) })),
    codes_promo: Object.fromEntries(Object.entries(shop?.promos || {}).slice(0, 10).map(([k, v]) => [clip(k, 20), clip(v?.label, 80)])),
    politiques: (shop?.faq || []).slice(0, 15).map(f => ({ q: clip(f.q, 160), r: clip(f.a, 500) })),
    occasions: (shop?.occasions || []).slice(0, 10).map(o => clip(o, 40)),
  };
  const catalog = (products || []).slice(0, 150)
    .map(p => ({
      slug: clip(p.slug, 80), nom: clip(p.name, 80), categorie: clip(p.category, 20), type: clip(p.subcategory, 40),
      prix: p.price, ancien_prix: p.oldPrice || undefined, stock: p.stock,
      tailles: (p.sizes || []).slice(0, 12), couleurs: (p.colors || []).slice(0, 8).map(c => clip(c.name ?? c, 30)),
      occasions: (p.occasions || []).slice(0, 6), matiere: clip(p.material, 120), conseil: clip(p.styleTip, 160),
      description: clip(p.description, 240), note: p.rating, avis: p.reviewCount, nouveaute: !!p.isNew,
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  return `INFORMATIONS BOUTIQUE\n${JSON.stringify(safeShop)}\n\nCATALOGUE (${catalog.length} pièces, prix en FCFA)\n${JSON.stringify(catalog)}`;
}

function buildVisitorContext(visitor) {
  const orders = (visitor?.orders || []).slice(0, 10).map(o => ({
    numero: clip(o.id, 20), date: clip(o.createdAt, 30), statut: clip(o.status, 20), total: o.total, paiement: clip(o.paymentStatus, 20),
    articles: (o.items || []).slice(0, 10).map(i => `${i.quantity}× ${clip(i.name, 80)}`),
  }));
  const cart = (visitor?.cart || []).slice(0, 20).map(i => `${i.quantity}× ${clip(i.name, 80)}${i.size ? ` T.${clip(i.size, 6)}` : ''} — ${i.price} FCFA`);
  return `CONTEXTE DE LA VISITE\nPage consultée : ${clip(visitor?.page, 120) || '/'}\nPanier : ${cart.length ? cart.join(' ; ') : 'vide'}\nCommandes de la cliente sur cet appareil : ${orders.length ? JSON.stringify(orders) : 'aucune'}`;
}

/** Valide l'historique envoyé par le navigateur : alternance user/assistant, texte seul, tailles bornées. */
export function sanitizeMessages(raw) {
  if (!Array.isArray(raw)) return null;
  const msgs = raw.slice(-16)
    .filter(m => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map(m => ({ role: m.role, content: clip(m.content.trim(), 2000) }));
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  const merged = [];
  for (const m of msgs) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content += `\n${m.content}`; else merged.push({ ...m });
  }
  if (!merged.length || merged[merged.length - 1].role !== 'user') return null;
  return merged;
}

/**
 * Diffuse la réponse de l'assistant. `send(event)` reçoit { type: 'text', text } au fil de l'eau,
 * puis { type: 'done' } ou { type: 'error', message }.
 */
export async function streamAssistant({ messages, shop, products, visitor }, send) {
  const system = [
    { type: 'text', text: INSTRUCTIONS.replace('{WHATSAPP}', clip(shop?.phone, 40) || 'numéro de la boutique') },
    // Point de cache : consignes + boutique + catalogue restent identiques d'une question à l'autre.
    { type: 'text', text: buildShopContext(shop, products), cache_control: { type: 'ephemeral' } },
    { type: 'text', text: buildVisitorContext(visitor) },
  ];

  const stream = getClient().beta.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    // Chat de boutique : l'effort « low » suffit et garde des réponses rapides.
    output_config: { effort: 'low' },
    // Repli automatique sur un autre modèle si un classifieur de sécurité refuse la requête.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    messages,
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      send({ type: 'text', text: event.delta.text });
    }
  }
  const final = await stream.finalMessage();
  if (final.stop_reason === 'refusal') {
    send({ type: 'text', text: '\n\nJe ne peux pas vous aider sur ce point, mais notre équipe vous répond volontiers sur WhatsApp 🌸' });
  }
  send({ type: 'done', usage: { cache_read: final.usage.cache_read_input_tokens ?? 0, input: final.usage.input_tokens, output: final.usage.output_tokens } });
}

export { Anthropic };
