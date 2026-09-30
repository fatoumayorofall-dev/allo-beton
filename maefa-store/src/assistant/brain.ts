/**
 * Le « cerveau » de Maé, gratuit et sans service extérieur : comprend la phrase (français ou wolof),
 * se souvient de la conversation (type d'article, occasion, couleur, budget, pointure) et répond
 * comme une vendeuse : une question à la fois, puis elle apporte les pièces.
 */
import type { Order, Product } from '../data/types';
import { DELIVERY_ZONES, PROMO_CODES, SITE_CONFIG, buildWhatsAppLink } from '../config/site';
import { formatPrice } from '../utils/format';
import { daysUntil, formatDay, inDays, upcomingFetes } from '../utils/fetes';
import { canBuy } from '../utils/stock';
import { FAQ_ITEMS } from '../data/faq';
import { QUESTIONS, modelOf, recommend, type Wishes } from '../utils/shopAdvisor';
import { NaiveBayes, detectLang, features, normalize } from './nlu';
import { extractSlots, type Slots } from './slots';
import { TRAINING, type Intent } from './training';

export type Lang = 'fr' | 'wo';

export interface BrainState {
  wishes: Wishes & { sub?: string; model?: string };
  /** Questions déjà posées (on ne répète pas) */
  asked: (keyof Wishes)[];
  /** Question en attente de réponse */
  pending?: keyof Wishes;
  /** Pièces déjà montrées (pour « autres ») */
  shown: string[];
  lang: Lang;
}

export interface BrainReply { text: string; chips: string[]; state: BrainState; intent: Intent | 'inconnu' }

export const newBrainState = (lang: Lang = 'fr', size?: string): BrainState => ({ wishes: size ? { size } : {}, asked: [], shown: [], lang });

let model: NaiveBayes<Intent> | null = null;
export const classifier = () => (model ??= new NaiveBayes<Intent>().train(TRAINING));

/** Intention reconnue (avec sa probabilité), utile aussi pour les tests. */
export function understand(text: string) {
  const r = classifier().rank(text);
  return { intent: r[0].label, p: r[0].p, second: r[1] };
}

const L = (lang: Lang, fr: string, wo: string) => (lang === 'wo' ? wo : fr);
const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? 's' : ''}`;

/* ---------- Présenter une pièce, comme la vendeuse qui la tend ---------- */

const OCC_FR: Record<string, string> = { mariage: 'un mariage ou un baptême', ceremonie: 'la Tabaski ou la Korité', soiree: 'une soirée', bureau: 'le bureau', quotidien: 'tous les jours', vacances: 'les vacances' };
const OCC_WO: Record<string, string> = { mariage: 'céet ak ngénte', ceremonie: 'Tabaski ak Kori', soiree: 'soirée', bureau: 'liggéey', quotidien: 'bés bu nekk', vacances: 'vacances' };

function otherColors(p: Product, products: Product[]) {
  return products.filter(x => modelOf(x) === modelOf(p) && x.id !== p.id && canBuy(x)).map(x => x.colors[0]?.name.toLowerCase()).filter(Boolean);
}

function present(p: Product, w: Wishes, products: Product[], lang: Lang): string {
  const occ = w.occasion && w.occasion !== 'tout' && p.occasions.includes(w.occasion) ? w.occasion : p.occasions[0];
  const others = otherColors(p, products).slice(0, 4);
  const size = w.size && p.sizes.includes(w.size) ? w.size : '';
  if (lang === 'wo') {
    return `- [${p.name}](/produit/${p.slug}) — **${formatPrice(p.price)}**. ${occ ? `Dafa baax ngir ${OCC_WO[occ]}. ` : ''}${size ? `Am na sa pointure ${size}. ` : ''}${others.length ? `Am na itam ci ${others.join(', ')}.` : ''}`.trim();
  }
  const tip = p.styleTip ? ` ${p.styleTip}` : '';
  return `- [${p.name}](/produit/${p.slug}) — **${formatPrice(p.price)}**. ${occ ? `Idéal pour ${OCC_FR[occ]}.` : ''}${tip}${size ? ` Disponible en ${size}.` : ''}${others.length ? ` Existe aussi en ${others.join(', ')}.` : ''}`.trim();
}

/* ---------- Questions de la vendeuse ---------- */

const optionLabel = (o: { emoji: string; fr: string; wo: string }, lang: Lang) => `${o.emoji} ${o[lang]}`;
function ask(key: keyof Wishes, state: BrainState, lead = ''): Pick<BrainReply, 'text' | 'chips'> {
  const q = QUESTIONS[key];
  state.pending = key;
  if (!state.asked.includes(key)) state.asked.push(key);
  return { text: `${lead}${q[state.lang]}`, chips: q.options.map(o => optionLabel(o, state.lang)) };
}

/** Réponse à une question posée : la cliente a touché un bouton ou écrit la réponse. */
function answerPending(text: string, state: BrainState): boolean {
  const key = state.pending;
  if (!key) return false;
  const t = normalize(text);
  const opt = QUESTIONS[key].options.find(o => {
    const a = normalize(o.fr), b = normalize(o.wo);
    return t === a || t === b || t.endsWith(a) || t.endsWith(b) || (key === 'size' && t === String(o.value));
  });
  if (!opt) return false;
  (state.wishes as Record<string, unknown>)[key] = opt.value;
  state.pending = undefined;
  return true;
}

/* ---------- Réponses boutique ---------- */

function productsFor(products: Product[], state: BrainState, exclude: string[] = []) {
  const w = state.wishes;
  const subRe: Record<string, RegExp> = { pochette: /pochette/i, cabas: /cabas/i, talon: /talon/i, tong: /tong/i, mule: /mule/i };
  let pool = products.filter(p => !exclude.includes(p.id));
  if (w.model) pool = pool.filter(p => modelOf(p) === w.model);
  if (w.sub && subRe[w.sub]) {
    const sub = pool.filter(p => subRe[w.sub!].test(`${p.name} ${p.subcategory}`));
    if (sub.length) pool = sub;
  }
  return recommend(pool, { kind: w.kind ?? 'tout', occasion: w.occasion ?? 'tout', color: w.color ?? 'tout', budget: w.budget ?? 0, size: w.size || undefined });
}

function showProducts(products: Product[], state: BrainState, lead: { fr: string; wo: string }, exclude: string[] = []): Pick<BrainReply, 'text' | 'chips'> {
  const lang = state.lang;
  const { items, exact } = productsFor(products, state, exclude);
  state.pending = undefined;
  if (!items.length) {
    const w = state.wishes;
    const why = w.size && w.kind === 'chaussures'
      ? L(lang, `Je n'ai pas de chaussures en ${w.size} pour le moment (nos pointures vont du 36 au 41).`, `Amul dàll ci ${w.size} léegi (pointure yi 36 ba 41 lañu).`)
      : w.budget ? L(lang, `Je n'ai rien à moins de ${formatPrice(w.budget)} pour le moment.`, `Amul dara ci suufu ${formatPrice(w.budget)} léegi.`)
        : L(lang, 'Je n\'ai rien qui corresponde exactement pour le moment.', 'Amul lu dëppoo léegi.');
    return { text: `${why} ${L(lang, 'Voulez-vous voir autre chose ?', 'Ndax nga bëgg xool leneen ?')}`, chips: L(lang, '✨ Montrez-moi tout|💬 Parler à Maefa', '✨ Wone ma lépp|💬 Wax ak Maefa').split('|') };
  }
  state.shown.push(...items.map(p => p.id));
  const intro = exact ? L(lang, lead.fr, lead.wo) : L(lang, 'Je n\'ai pas exactement ça, mais regardez ces pièces qui s\'en approchent :', 'Amul lu dëppoo bu wér, waaye xoolal yii :');
  const lines = items.map(p => present(p, state.wishes, products, lang)).join('\n');
  const close = L(lang, 'Laquelle vous plaît ? Touchez-la pour la voir de près.', 'Ban moo la neex ? Bësal ci ngir xool ko bu baax.');
  return { text: `${intro}\n${lines}\n\n${close}`, chips: L(lang, '💸 Moins cher|🔄 Autres modèles|🛒 Comment commander ?', '💸 Lu gën a yomb|🔄 Yeneen|🛒 Naka laay jënde ?').split('|') };
}

function cherche(slots: Slots, products: Product[], state: BrainState): Pick<BrainReply, 'text' | 'chips'> {
  const w = state.wishes;
  if (slots.kind && slots.kind !== w.kind) { delete w.model; delete w.sub; }
  if (slots.kind) w.kind = slots.kind;
  if (slots.sub) w.sub = slots.sub;
  if (slots.model) w.model = slots.model;
  if (slots.occasion) w.occasion = slots.occasion;
  if (slots.color) w.color = slots.color;
  if (slots.budget) w.budget = slots.budget;
  if (slots.size) w.size = slots.size;
  const lang = state.lang;

  if (w.model) {
    return showProducts(products, state, { fr: `Voici le modèle ${w.model} :`, wo: `Mii mooy ${w.model} :` });
  }
  if (!w.kind) return ask('kind', state, L(lang, 'Avec plaisir 🌸 ', 'Waaw 🌸 '));
  if (w.kind === 'chaussures' && w.size === undefined && !state.asked.includes('size')) return ask('size', state);
  // Pointure introuvable : on le dit tout de suite, sans poser d'autres questions
  if (w.kind === 'chaussures' && w.size && !products.some(p => p.category === 'chaussures' && canBuy(p) && p.sizes.includes(w.size!))) {
    return showProducts(products, state, { fr: '', wo: '' });
  }
  const known = [w.occasion, w.color, w.budget].filter(x => x !== undefined).length;
  if (!known && !state.asked.includes('occasion')) return ask('occasion', state);
  return showProducts(products, state, { fr: 'Voici ce que je vous ai choisi ✨', wo: 'Xoolal li ma la tànnal ✨' });
}

function livraison(slots: Slots, lang: Lang) {
  const free = formatPrice(SITE_CONFIG.freeShippingThreshold);
  const zone = slots.zone && slots.zone !== 'Dakar' ? DELIVERY_ZONES.find(z => z.name === slots.zone) : null;
  if (zone) return L(lang,
    `Pour **${zone.name}**, la livraison coûte **${formatPrice(zone.fee)}** et prend **${zone.delay}**. Elle est offerte dès ${free} d'achat 🛵`,
    `Ci **${zone.name}**, yónnee bi **${formatPrice(zone.fee)}** la, te day am ci **${zone.delay}**. Bu sa commande tollee ${free}, yónnee bi amul fey 🛵`);
  return L(lang,
    `Nous livrons partout au Sénégal : **24 h à Dakar** (1 500 à 2 000 FCFA selon le quartier), **48 h à 5 jours en régions**. Livraison offerte dès ${free}. Dites-moi votre ville, je vous donne le prix exact.`,
    `Dinañu yónnee fépp ci Senegaal : **24 waxtu ci Dakar** (1 500 ba 2 000 FCFA), **2 ba 5 fan ci diwaan yi**. Wax ma sa dëkk, ma wax la njëg bi.`);
}

function faqAnswer(text: string): string | null {
  const f = new Set(features(text));
  let best = { score: 0, a: '' };
  for (const item of FAQ_ITEMS) {
    const g = features(item.q);
    const inter = g.filter(x => f.has(x)).length;
    const score = inter / Math.sqrt(g.length * Math.max(1, f.size));
    if (score > best.score) best = { score, a: item.a };
  }
  return best.score >= 0.3 ? best.a : null;
}

/* ---------- Réponse ---------- */

/** Articles pas encore en vente (mots passés par la même normalisation que la phrase). */
const NOT_SOLD = new RegExp(`\\b(${['bijou', 'bijoux', 'collier', 'colliers', 'bague', 'bagues', 'bracelet', 'bracelets', 'boucle', 'boucles', 'parure', 'robe', 'robes', 'kaftan', 'boubou', 'tailleur', 'vetement', 'vetements', 'habit', 'habits', 'yére', 'lunette', 'lunettes', 'montre', 'montres', 'foulard', 'ceinture', 'chapeau', 'perruque', 'meche', 'meches'].map(normalize).join('|')})\\b`);

export function reply(text: string, prev: BrainState, ctx: { products: Product[]; orders?: Order[]; lang?: Lang }): BrainReply {
  const state: BrainState = JSON.parse(JSON.stringify(prev));
  const products = ctx.products;
  state.lang = detectLang(text) ?? ctx.lang ?? state.lang;
  const lang = state.lang;
  const slots = extractSlots(text, products);
  const { intent: guessed, p } = understand(text);
  let intent: Intent | 'inconnu' = p >= 0.3 ? guessed : 'inconnu';

  // Réponse à la question en cours (bouton touché ou réponse courte)
  const pendingKey = state.pending;
  if (pendingKey && (answerPending(text, state) || (slots[pendingKey as keyof Slots] !== undefined && !['prix', 'livraison', 'paiement', 'suivi'].includes(guessed)))) {
    intent = 'cherche';
  }
  if (slots.orderId) intent = 'suivi';
  // Des détails d'article sans intention claire : c'est une recherche
  if ((intent === 'inconnu' || intent === 'oui' || intent === 'salut') && (slots.kind || slots.color || slots.occasion || slots.size || slots.model)) intent = 'cherche';
  if (intent === 'prix' && !slots.model && !state.shown.length && (slots.kind || slots.budget)) intent = 'cherche';

  // « Montrez-moi tout » : on oublie les filtres (sauf la pointure)
  if (/\b(montrez moi tout|wone ma lepp|tout voir)\b/.test(normalize(text))) { state.wishes = { kind: 'tout', size: state.wishes.size }; state.pending = undefined; intent = 'cherche'; }
  const KIND_CHIPS = QUESTIONS.kind.options.map(o => optionLabel(o, lang));
  const out = (t: string, chips: string[] = []): BrainReply => ({ text: t, chips, state, intent });
  // Articles pas encore vendus (bijoux, vêtements, accessoires) : on le dit simplement
  if (!slots.kind && NOT_SOLD.test(normalize(text))) {
    return out(L(lang,
      'Pour le moment, Maefa propose **uniquement des sacs et des chaussures** 🌸 Le reste arrive bientôt ! Je vous montre nos sacs ou nos chaussures ?',
      'Léegi, Maefa **sac ak dàll rekk** la jaay 🌸 Yeneen yi dinañu ñëw. Ndax ma wone la sac yi walla dàll yi ?'), KIND_CHIPS);
  }
  const wa = (msg: string) => buildWhatsAppLink(msg);

  switch (intent) {
    case 'salut': {
      state.pending = 'kind';
      return out(L(lang, 'Bonjour et bienvenue chez Maefa 🌸 Je suis Maé. Qu\'est-ce qui vous ferait plaisir aujourd\'hui : un sac, des chaussures ?', 'Salaam aleekum, dalal ak jàmm ci Maefa 🌸 Maa ngi tudd Maé. Lan nga bëgg tey : sac walla dàll ?'), KIND_CHIPS);
    }
    case 'merci': return out(L(lang, 'Avec plaisir 🌸 Je reste là si vous avez une autre question.', 'Ñoo ko bokk 🌸 Maa ngi fi bu am leneen.'));
    case 'aurevoir': return out(L(lang, 'Au revoir et à très bientôt chez Maefa 🌸', 'Ba beneen yoon, jërëjëf ci Maefa 🌸'));
    case 'qui': return out(L(lang,
      'Je suis **Maé**, la conseillère virtuelle de Maefa : un petit programme (pas une personne) qui connaît toutes nos pièces. Pour parler à l\'équipe, touchez « Parler à Maefa » 🌸',
      'Maa ngi tudd **Maé** : programme bu Maefa (du nit), xam naa sac yi ak dàll yi yépp. Ngir wax ak nit, bësal « Wax ak Maefa » 🌸'), [L(lang, '💬 Parler à Maefa', '💬 Wax ak Maefa')]);
    case 'cherche': { const r = cherche(slots, products, state); return out(r.text, r.chips); }
    case 'autres': {
      if (!state.wishes.kind && !state.shown.length) { const r = cherche(slots, products, state); return out(r.text, r.chips); }
      delete state.wishes.model;
      // D'autres modèles (pas seulement d'autres couleurs des mêmes)
      const seenModels = new Set(state.shown.map(id => products.find(x => x.id === id)).filter((x): x is Product => !!x).map(modelOf));
      const otherModels = products.filter(x => seenModels.has(modelOf(x))).map(x => x.id);
      const exclude = productsFor(products, state, otherModels).items.length ? otherModels : state.shown;
      const r = showProducts(products, state, { fr: 'Voici d\'autres modèles pour vous :', wo: 'Xoolal yeneen yii :' }, exclude);
      return out(r.text, r.chips);
    }
    case 'moins_cher': {
      const shown = state.shown.map(id => products.find(x => x.id === id)).filter((x): x is Product => !!x);
      const min = shown.length ? Math.min(...shown.map(x => x.price)) : 0;
      delete state.wishes.model;
      state.wishes.budget = min ? min - 1 : 16000;
      if (min && !productsFor(products, state).items.length) {
        state.wishes.budget = min;
        return out(L(lang,
          `Ce sont déjà nos prix les plus doux 🌸 : à partir de **${formatPrice(min)}**. Je vous montre d'autres modèles à ce prix ?`,
          `Njëg yii ñoo gën a yomb 🌸 : **${formatPrice(min)}**. Ndax ma wone la yeneen ci njëg jooju ?`), L(lang, '🔄 Autres modèles|🛒 Comment commander ?', '🔄 Yeneen|🛒 Naka laay jënde ?').split('|'));
      }
      const r = showProducts(products, state, { fr: 'Voici des pièces plus douces pour le budget 💸', wo: 'Yii ñoo gën a yomb 💸' });
      return out(r.text, r.chips);
    }
    case 'prix': {
      const m = slots.model ? products.filter(x => modelOf(x) === slots.model && canBuy(x)) : state.shown.map(id => products.find(x => x.id === id)).filter((x): x is Product => !!x);
      if (!m.length) return out(L(lang, 'De quelle pièce voulez-vous le prix ? Nos sacs et chaussures vont de 15 000 à 25 000 FCFA.', 'Ban la nga bëgg xam njëgam ? Sac yi ak dàll yi, 15 000 ba 25 000 FCFA lañu.'), KIND_CHIPS);
      const first = m[0];
      const colors = m.map(x => x.colors[0]?.name.toLowerCase()).filter(Boolean);
      if (slots.model) {
        return out(L(lang,
          `Le **${slots.model}** est à **${formatPrice(first.price)}**, en ${plural(colors.length, 'couleur')} : ${colors.join(', ')}. [Voir la pièce](/produit/${first.slug}) 🌸`,
          `**${slots.model}**, **${formatPrice(first.price)}** la. Am na ci ${colors.join(', ')}. [Xool ko](/produit/${first.slug}) 🌸`), L(lang, '🛒 Comment commander ?|🔄 Autres modèles', '🛒 Naka laay jënde ?|🔄 Yeneen').split('|'));
      }
      return out(m.map(x => `- [${x.name}](/produit/${x.slug}) — **${formatPrice(x.price)}**`).join('\n'));
    }
    case 'livraison': return out(livraison(slots, lang));
    case 'paiement': return out(L(lang,
      `Vous payez par **Wave** ou **Orange Money** au **${SITE_CONFIG.phone}** (Maefa Store), ou **en espèces à la livraison**. Envoyez-nous la capture du paiement sur WhatsApp, nous confirmons tout de suite ✨`,
      `Mën nga fey ak **Wave** walla **Orange Money** ci **${SITE_CONFIG.phone}** (Maefa Store), walla nga fey **xaalis bi bu livreur bi indilee sa commande**. Yónnee nu capture bi ci WhatsApp ✨`));
    case 'suivi': {
      const order = slots.orderId ? ctx.orders?.find(o => o.id === slots.orderId) : ctx.orders?.[0];
      if (order) {
        const link = `/suivi?commande=${order.id}&tel=${encodeURIComponent(order.customer.phone)}`;
        return out(L(lang, `Votre commande **${order.id}** (${formatPrice(order.total)}) : [suivez-la ici](${link}), vous verrez chaque étape et le livreur sur la carte 🛵`, `Sa commande **${order.id}** (${formatPrice(order.total)}) : [bësal fii](${link}) ngir gis fi mu nekk ak livreur bi ci kart bi 🛵`));
      }
      return out(L(lang, 'Rendez-vous sur [Suivre ma commande](/suivi) avec votre numéro de commande (MAE-…) et votre téléphone : vous verrez le livreur sur la carte 🛵', 'Demal ci [Topp sama commande](/suivi), bindal sa nimero commande (MAE-…) ak sa telefon : dinga gis livreur bi ci kart bi 🛵'));
    }
    case 'retour': return out(L(lang,
      'Chaque pièce est contrôlée avant l\'envoi. Vérifiez votre commande **à la réception, devant le livreur** : une fois la livraison acceptée, **aucun échange ni retour** n\'est possible. Un doute sur la pointure ? Demandez-moi **avant** de commander 🌸',
      'Seetal sa commande **bu livreur bi nekkee fi**. Ginnaaw livraison bi, **du ñu mën soppi walla delloo**. Bu la pointure bi jafe, laaj ma **balaa ngay jënd** 🌸'));
    case 'pointure': {
      const shoes = products.filter(x => x.category === 'chaussures' && canBuy(x));
      const all = [...new Set(shoes.flatMap(x => x.sizes))].sort();
      const m = normalize(text).match(/\b(3\d|4\d)\b/);
      if (m) {
        const n = shoes.filter(x => x.sizes.includes(m[1])).length;
        if (!n) return out(L(lang, `Nous n'avons pas de ${m[1]} pour le moment : nos pointures vont du ${all[0]} au ${all[all.length - 1]}.`, `Amunu ${m[1]} léegi : pointure yi ${all[0]} ba ${all[all.length - 1]} lañu.`));
        state.wishes.size = m[1]; state.wishes.kind = 'chaussures';
        return out(L(lang, `Oui 🌸 ${plural(n, 'modèle')} existe${n > 1 ? 'nt' : ''} en ${m[1]}. Je vous les montre ?`, `Waaw 🌸 Am na ${n} ci ${m[1]}. Ndax ma wone la ?`), L(lang, `👡 Oui, montrez-moi|🙏 Non merci`, `👡 Waaw, wone ma|🙏 Déedéet`).split('|'));
      }
      return out(L(lang,
        `Nos chaussures vont du **${all[0]} au ${all[all.length - 1]}**. Entre deux pointures, prenez la plus grande. Le [guide des tailles](/faq#tailles) vous aide. Quelle est votre pointure ?`,
        `Pointure yi **${all[0]} ba ${all[all.length - 1]}** lañu. Su fekkee diggante ñaar nga, jëlal bi gën a mag. Ban pointure nga ?`), QUESTIONS.size.options.map(o => optionLabel(o, lang)));
    }
    case 'boutique': return out(L(lang,
      `Maefa est une **boutique 100 % en ligne** : pas de magasin, mais nous livrons partout au Sénégal. Commandez ici, sur WhatsApp ou au ${SITE_CONFIG.phone}. L'équipe répond de ${SITE_CONFIG.hours.weekdays} en semaine.`,
      `Maefa, **boutique en ligne** la : amunu magasin, waaye dinañu yónnee fépp ci Senegaal. Jëndal fii, ci WhatsApp walla ci ${SITE_CONFIG.phone}.`));
    case 'marque': return out(L(lang,
      'Je vous réponds franchement 🌸 Nos pièces portent des **noms Maefa** : ce ne sont pas des articles de grandes marques (Hermès, Chanel, Gucci…). Seules nos pièces **Zara** sont de la marque Zara. Chaque pièce est choisie et contrôlée par notre équipe avant l\'envoi.',
      'Dama lay wax dëgg 🌸 Sac yi ak dàll yi, **modèle Maefa** lañu : du Hermès, du Chanel, du Gucci. **Zara** yi rekk ñoo di Zara. Nu ngi leen seet bu baax balaa ñuy yónnee.'));
    case 'promo': return out(L(lang,
      `Nos codes du moment : ${Object.entries(PROMO_CODES).map(([k, v]) => `**${k}** (${v.label})`).join(', ')}. À saisir dans le panier ✨`,
      `Am na ay code : ${Object.entries(PROMO_CODES).map(([k, v]) => `**${k}** (${v.label})`).join(', ')}. Bindal ko ci panier bi ✨`));
    case 'cadeau': {
      state.wishes.budget ??= 20000;
      const r = showProducts(products, state, {
        fr: `Bonne idée 🎁 Pensez à l'**emballage cadeau** (${formatPrice(SITE_CONFIG.giftWrapFee)}), à cocher dans le panier. Quelques idées :`,
        wo: `Mbir mu baax 🎁 Am na **emballage cadeau** (${formatPrice(SITE_CONFIG.giftWrapFee)}) ci panier bi. Xoolal yii :`,
      });
      return out(r.text, r.chips);
    }
    case 'commander': {
      const last = state.shown.length ? products.find(x => x.id === state.shown[state.shown.length - 1]) : null;
      return out(L(lang,
        `C'est très simple 🛍️\n1. Ouvrez la pièce${last ? ` (par exemple [${last.name}](/produit/${last.slug}))` : ''} et choisissez la couleur${state.wishes.kind === 'chaussures' ? ' et la pointure' : ''}.\n2. Touchez **« Ajouter au panier »**.\n3. Ouvrez le panier, écrivez votre nom, votre numéro et votre adresse, puis **« Valider ma commande »**.\nNous vous appelons ou vous écrivons sur WhatsApp pour confirmer.`,
        `Dafa yomb 🛍️\n1. Ubbil pièce bi${last ? ` ([${last.name}](/produit/${last.slug}))` : ''}, tànnal melo bi${state.wishes.kind === 'chaussures' ? ' ak sa pointure' : ''}.\n2. Bësal **« Ajouter au panier »**.\n3. Ubbil panier bi, bindal sa tur, sa nimero ak fi ngay dëkk, bësal **« Valider ma commande »**.\nDinañu la woo walla bind ci WhatsApp.`));
    }
    case 'humain': return out(L(lang,
      `Bien sûr 🌸 Écrivez ou envoyez un vocal à l'équipe sur [WhatsApp](${wa('Bonjour Maefa Store 🌸 J\'ai une question.')}) ou appelez le **${SITE_CONFIG.phone}**.`,
      `Waaw 🌸 Bindal walla yónnee vocal ci [WhatsApp](${wa('Salaam aleekum Maefa 🌸')}) walla woo **${SITE_CONFIG.phone}**.`));
    case 'plainte': return out(L(lang,
      `Je suis désolée 🙏 Écrivez tout de suite à l'équipe sur [WhatsApp](${wa('Bonjour Maefa Store, j\'ai un problème avec ma commande.')}) avec votre numéro de commande : elle s'en occupe en priorité.`,
      `Baal ma 🙏 Bindal nu léegi ci [WhatsApp](${wa('Salaam aleekum Maefa, am naa jafe-jafe ak sama commande.')}) ak sa nimero commande : dinañu ko topp ci teel.`));
    case 'fete': {
      const t = normalize(text);
      const f = upcomingFetes().find(x => t.includes(normalize(x.name).split(' ')[0])) ?? upcomingFetes()[0];
      if (!f) break;
      const n = daysUntil(f.date);
      return out(L(lang,
        `La prochaine **${f.name}** tombe ${f.lunar ? 'vers le' : 'le'} **${formatDay(f.date)}** (${inDays(n)}). Commandez au moins 3 jours avant à Dakar, 6 jours avant en régions ✨`,
        `**${f.name}** bi di ñëw, ${f.lunar ? 'ci wetu' : ''} **${formatDay(f.date)}** la. Jëndal 3 fan balaa ci Dakar, 6 fan ci diwaan yi ✨`), KIND_CHIPS);
    }
    case 'oui': {
      if (state.wishes.kind || state.wishes.size) { const r = showProducts(products, state, { fr: 'Voici ✨', wo: 'Xoolal ✨' }); return out(r.text, r.chips); }
      return out(L(lang, 'Avec plaisir ! Vous cherchez un sac ou des chaussures ?', 'Waaw ! Sac walla dàll nga bëgg ?'), KIND_CHIPS);
    }
    case 'non': state.pending = undefined; return out(L(lang, 'D\'accord 🌸 Je reste là si vous avez besoin.', 'Waaw 🌸 Maa ngi fi bu la soxlaa.'));
    default: break;
  }

  const faq = lang === 'fr' ? faqAnswer(text) : null;
  if (faq) return { text: faq, chips: [], state, intent: 'inconnu' };
  return {
    text: L(lang,
      'Je n\'ai pas bien compris 🙏 Je peux vous montrer nos sacs et chaussures, ou vous répondre sur la livraison, le paiement ou votre commande.',
      'Dégguma bu baax 🙏 Mën naa la wone sac yi ak dàll yi, walla tontu la ci yónnee, fey walla sa commande. Mën nga itam yónnee nu vocal.'),
    chips: L(lang, '👜 Un sac|👡 Des chaussures|🛵 Livraison|💬 Parler à Maefa', '👜 Sac|👡 Dàll|🛵 Yónnee|💬 Wax ak Maefa').split('|'),
    state, intent: 'inconnu',
  };
}
