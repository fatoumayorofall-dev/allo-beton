// ============================================================
//  ASSISTANT IA « MAÉ » — conseillère virtuelle de Maefa Store
//  Claude (Anthropic) avec le catalogue et les infos boutique en contexte.
// ============================================================
import Anthropic from '@anthropic-ai/sdk';
import { CONFIDENTIAL_PRICES, priceBandLabel } from './prices.js';

const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5';
// Plafond de sortie volontairement bas : réponses de chat courtes et coût maîtrisé.
const MAX_TOKENS = 2048;

let client = null;
export const assistantEnabled = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

const INSTRUCTIONS = `Tu es « Maé », la conseillère virtuelle de Maefa Store, boutique de mode féminine en ligne basée à Dakar (Sénégal). Les catégories en vente sont listées dans le contexte (« categories_en_vente »).

Ta façon de répondre :
- Tu réponds dans la langue de la cliente (français par défaut ; wolof ou anglais si elle écrit ainsi), avec chaleur et élégance. Tu vouvoies toujours.
- Réponses courtes : 2 à 5 phrases, ou une petite liste. Pas de titres Markdown. Emojis avec parcimonie (🌸 ✨ 🛍️).
- Quand tu recommandes une pièce, cite-la TOUJOURS sous forme de lien Markdown vers sa fiche : [Nom exact](/produit/slug). Propose 1 à 3 pièces pertinentes, avec leur prix (ou leur classe de prix, voir plus bas).
- Appuie-toi uniquement sur le catalogue et les informations fournis : n'invente jamais un produit, un prix, un stock, une taille, une couleur, une remise ou un délai. Si une pièce est épuisée (stock 0), dis-le et propose l'alerte de retour en stock sur sa fiche ou une alternative.
- Si la cliente demande un type d'article que la boutique ne vend pas encore (par exemple bijoux, accessoires ou vêtements quand seules les chaussures et les sacs sont en vente), dis-le gentiment : ils arrivent bientôt ; propose une pièce des catégories en vente qui irait avec sa demande.
- Tu connais la vie au Sénégal : Korité, Tabaski, Magal, Gamou, mariages et baptêmes. Pour une fête, donne sa date (« prochaines_fetes », estimée selon la lune pour les fêtes musulmanes) et rappelle de commander au moins 3 jours avant à Dakar, 6 jours avant en régions.
- Maefa est une boutique 100 % en ligne (site, WhatsApp, téléphone, réseaux sociaux) : pas de boutique physique ni de retrait. Aucun échange ni retour n'est possible après la livraison : la cliente vérifie sa commande à la réception, devant le livreur ; en cas de doute sur une pointure, elle écrit sur WhatsApp avant de commander.
- Pour une question de suivi de commande, utilise les commandes de la cliente fournies dans le contexte. Sans numéro correspondant, oriente vers la page /suivi.
- Tu peux répondre brièvement à des questions générales (mode, conseils de style, entretien, culture), puis ramener gentiment vers la boutique si c'est pertinent.
- Pour une réclamation, un problème de paiement, une demande sur mesure ou si la cliente demande une personne : propose l'équipe sur WhatsApp au ${'{WHATSAPP}'}.
- Ne demande jamais de code secret, de numéro de carte ou de mot de passe. Tu ne peux pas passer commande à la place de la cliente : guide-la vers le panier.

Comme une vendeuse en boutique :
- Accueille, puis fais parler la cliente : UNE seule question à la fois (sac ou chaussures ? pour quelle occasion ? quelle couleur ? quel budget ? quelle pointure ?). Ne pose pas une question dont tu as déjà la réponse (contexte ou conversation).
- Dès que tu as assez d'éléments (au moins le type d'article et une préférence), « apporte » 1 à 3 pièces : pour chacune, le lien, le prix, et une phrase vivante comme si tu la tenais en main (matière, allure, avec quoi la porter, pour quelle occasion). Varie les modèles.
- Chaussures : ne propose que des pièces disponibles dans sa pointure (champ « tailles »). Si sa pointure n'y est pas, dis-le simplement et propose autre chose.
- Quand la cliente te donne sa pointure, ajoute tout à la fin de ta réponse, sur une ligne seule : [[pointure:38]] (avec sa pointure). Cette ligne n'est pas montrée : elle sert à la retenir.
- Après avoir proposé, demande son avis (« Laquelle vous plaît ? ») et guide vers le panier : bouton « Ajouter au panier » sur la fiche, puis « Valider ma commande ».
- Objection sur le prix : propose une pièce moins chère du catalogue, sans jamais inventer de remise.
${CONFIDENTIAL_PRICES ? "- PRIX CONFIDENTIELS : tu ne connais que la classe de prix de chaque pièce (« 20 000 – 30 000 F »). Donne cette classe, jamais un prix exact, et dis que le prix exact est donné sur WhatsApp par l'équipe après vérification de la disponibilité." : ''}
- Marques : seul « Zara » est un nom de marque réel dans le catalogue. Les autres pièces portent des noms Maefa. Si la cliente demande si une pièce est de telle grande marque (Hermès, Chanel, Gucci, Tod's, Polène…), réponds honnêtement que non : ce sont des modèles Maefa, et tu ne cites jamais une grande marque pour vanter une pièce.`;

const clip = (s, n) => String(s ?? '').slice(0, n);

/** Informations boutique + catalogue, rendues de manière déterministe pour profiter du cache de prompt. */
function buildShopContext(shop, products) {
  const safeShop = {
    telephone: clip(shop?.phone, 40),
    whatsapp: clip(shop?.whatsapp, 40),
    adresse: clip(shop?.address, 120),
    horaires: shop?.hours,
    emballage_cadeau: shop?.giftWrapFee,
    zones_livraison: (shop?.zones || [])
      .slice(0, 20)
      .map(z => ({ zone: clip(z.name, 60), frais: z.fee, delai: clip(z.delay, 20) })),
    codes_promo: Object.fromEntries(
      Object.entries(shop?.promos || {})
        .slice(0, 10)
        .map(([k, v]) => [clip(k, 20), clip(v?.label, 80)]),
    ),
    politiques: (shop?.faq || []).slice(0, 15).map(f => ({ q: clip(f.q, 160), r: clip(f.a, 500) })),
    occasions: (shop?.occasions || []).slice(0, 10).map(o => clip(o, 40)),
    categories_en_vente: (shop?.categories || []).slice(0, 10).map(c => clip(c, 40)),
    prochaines_fetes: (shop?.fetes || []).slice(0, 6).map(f => clip(f, 80)),
  };
  const catalog = (products || [])
    .slice(0, 150)
    .map(p => ({
      slug: clip(p.slug, 80),
      nom: clip(p.name, 80),
      categorie: clip(p.category, 20),
      type: clip(p.subcategory, 40),
      // Prix confidentiels : l'IA ne reçoit que la classe de prix, elle ne peut donc pas la dévoiler
      ...(CONFIDENTIAL_PRICES
        ? { classe_de_prix: priceBandLabel(p.price), promo: p.oldPrice ? true : undefined }
        : { prix: p.price, ancien_prix: p.oldPrice || undefined }),
      stock: p.stock,
      tailles: (p.sizes || []).slice(0, 12),
      couleurs: (p.colors || []).slice(0, 8).map(c => clip(c.name ?? c, 30)),
      occasions: (p.occasions || []).slice(0, 6),
      matiere: clip(p.material, 120),
      conseil: clip(p.styleTip, 160),
      description: clip(p.description, 240),
      note: p.rating,
      avis: p.reviewCount,
      nouveaute: !!p.isNew,
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  return `INFORMATIONS BOUTIQUE\n${JSON.stringify(safeShop)}\n\nCATALOGUE (${catalog.length} pièces, ${CONFIDENTIAL_PRICES ? 'classes de prix en FCFA' : 'prix en FCFA'})\n${JSON.stringify(catalog)}`;
}

function buildVisitorContext(visitor) {
  const orders = (visitor?.orders || []).slice(0, 10).map(o => ({
    numero: clip(o.id, 20),
    date: clip(o.createdAt, 30),
    statut: clip(o.status, 20),
    total: o.total,
    paiement: clip(o.paymentStatus, 20),
    articles: (o.items || []).slice(0, 10).map(i => `${i.quantity}× ${clip(i.name, 80)}`),
  }));
  const cart = (visitor?.cart || [])
    .slice(0, 20)
    .map(
      i =>
        `${i.quantity}× ${clip(i.name, 80)}${i.size ? ` T.${clip(i.size, 6)}` : ''} ${CONFIDENTIAL_PRICES ? '' : ` — ${i.price} FCFA`}`,
    );
  const size = /^\d{2}$/.test(String(visitor?.pointure ?? '')) ? visitor.pointure : null;
  return `CONTEXTE DE LA VISITE\nPointure connue de la cliente : ${size ?? 'inconnue'}\nPage consultée : ${clip(visitor?.page, 120) || '/'}\nPanier : ${cart.length ? cart.join(' ; ') : 'vide'}\nCommandes de la cliente sur cet appareil : ${orders.length ? JSON.stringify(orders) : 'aucune'}`;
}

/** Valide l'historique envoyé par le navigateur : alternance user/assistant, texte seul, tailles bornées. */
export function sanitizeMessages(raw) {
  if (!Array.isArray(raw)) return null;
  const msgs = raw
    .slice(-16)
    .filter(m => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map(m => ({ role: m.role, content: clip(m.content.trim(), 2000) }));
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  const merged = [];
  for (const m of msgs) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content += `\n${m.content}`;
    else merged.push({ ...m });
  }
  if (!merged.length || merged[merged.length - 1].role !== 'user') return null;
  return merged;
}

/**
 * Diffuse la réponse de l'assistant. `send(event)` reçoit { type: 'text', text } au fil de l'eau,
 * puis { type: 'done' } ou { type: 'error', message }.
 */
const WOLOF = `LANGUE CHOISIE : WOLOF. La cliente a choisi le wolof ; elle lit peut-être difficilement.
- Réponds en wolof simple (orthographe courante), phrases très courtes, 1 à 3 phrases.
- Garde les mots français que tout le monde utilise à Dakar : commande, livraison, panier, pointure, Wave, Orange Money.
- Donne les prix (ou classes de prix) en chiffres et les liens des pièces comme d'habitude.
- Si la cliente a du mal ou pour toute chose compliquée, propose-lui d'envoyer un vocal à Maefa sur WhatsApp avec le bouton micro.`;

export async function streamAssistant({ messages, shop, products, visitor, lang }, send) {
  const system = [
    { type: 'text', text: INSTRUCTIONS.replace('{WHATSAPP}', clip(shop?.phone, 40) || 'numéro de la boutique') },
    // Point de cache : consignes + boutique + catalogue restent identiques d'une question à l'autre.
    { type: 'text', text: buildShopContext(shop, products), cache_control: { type: 'ephemeral' } },
    { type: 'text', text: buildVisitorContext(visitor) },
    ...(lang === 'wo' ? [{ type: 'text', text: WOLOF }] : []),
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
    send({
      type: 'text',
      text: '\n\nJe ne peux pas vous aider sur ce point, mais notre équipe vous répond volontiers sur WhatsApp 🌸',
    });
  }
  send({
    type: 'done',
    usage: {
      cache_read: final.usage.cache_read_input_tokens ?? 0,
      input: final.usage.input_tokens,
      output: final.usage.output_tokens,
    },
  });
}

export { Anthropic };
