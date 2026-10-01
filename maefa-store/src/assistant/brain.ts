/**
 * Le « cerveau » de Maé, gratuit et sans service extérieur : comprend la phrase (français ou wolof),
 * se souvient de la conversation (type d'article, occasion, couleur, budget, pointure) et répond
 * comme une vendeuse : une question à la fois, puis elle apporte les pièces.
 */
import type { Order, Product } from '../data/types';
import { DELIVERY_ZONES, PROMO_CODES, SITE_CONFIG, buildWhatsAppLink } from '../config/site';
import { formatPrice } from '../utils/format';
import { daysUntil, formatDay, inDays, orderBy, upcomingFetes } from '../utils/fetes';
import { canBuy } from '../utils/stock';
import { FAQ_ITEMS } from '../data/faq';
import { QUESTIONS, colorFamilies, modelOf, recommend, type Wishes } from '../utils/shopAdvisor';
import { NaiveBayes, detectLang, features, normalize, nre } from './nlu';
import { extractSlots, type Slots } from './slots';
import { CUES, TRAINING, type Intent } from './training';

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
  /** Nombre de réponses (pour varier les tournures) */
  turn?: number;
}

export interface BrainReply { text: string; chips: string[]; state: BrainState; intent: Intent | 'inconnu' }

export const newBrainState = (lang: Lang = 'fr', size?: string): BrainState => ({ wishes: size ? { size } : {}, asked: [], shown: [], lang, turn: 0 });

export interface BrainCtx {
  products: Product[]; orders?: Order[]; lang?: Lang;
  /** Total du panier en cours (FCFA) */ cartTotal?: number;
  /** Prénom de la cliente connectée */ firstName?: string;
  /** Heure locale (0-23), pour bonjour / bonsoir */ hour?: number;
}

/** Poids des mots-indices face à l'apprentissage statistique (réglé par validation croisée). */
export const CUE_WEIGHT = 4;
const CUE_RE = Object.fromEntries(Object.entries(CUES).map(([k, words]) => [k, nre(words!)])) as Partial<Record<Intent, RegExp>>;

/**
 * Modèle hybride : bayésien naïf (appris sur les phrases) + mots-indices (expertise).
 * Renvoie les intentions classées avec une probabilité.
 */
export function makeClassifier(train: Record<string, string[]>, weight = CUE_WEIGHT) {
  const nb = new NaiveBayes<Intent>().train(train as Record<Intent, string[]>);
  return (text: string) => {
    const t = normalize(text);
    const ranked = nb.rank(text).map(r => {
      const re = CUE_RE[r.label];
      const hits = re ? (t.match(new RegExp(re.source, 'g')) ?? []).length : 0;
      return { label: r.label, s: Math.log(r.p + 1e-12) + weight * hits };
    });
    const max = Math.max(...ranked.map(r => r.s));
    const sum = ranked.reduce((a, r) => a + Math.exp(r.s - max), 0);
    return ranked.map(r => ({ label: r.label, p: Math.exp(r.s - max) / sum })).sort((a, b) => b.p - a.p);
  };
}

let model: ReturnType<typeof makeClassifier> | null = null;
export const classifier = () => (model ??= makeClassifier(TRAINING));

/** Intention reconnue (avec sa probabilité), utile aussi pour les tests. */
let exact: Map<string, Intent> | null = null;
/** Phrases apprises mot pour mot (utile pour les messages très courts : « ok », « cc », « om »). */
const exactMemory = () => {
  if (exact) return exact;
  const seen = new Map<string, Intent | null>();
  for (const [intent, list] of Object.entries(TRAINING) as [Intent, string[]][]) {
    for (const ex of list) { const k = normalize(ex); seen.set(k, seen.has(k) && seen.get(k) !== intent ? null : intent); }
  }
  exact = new Map([...seen].filter((e): e is [string, Intent] => e[1] !== null));
  return exact;
};

export function understand(text: string) {
  const key = normalize(text);
  if (!key) return { intent: 'bof' as Intent, p: 1, second: undefined };
  const known = exactMemory().get(key);
  if (known) return { intent: known, p: 1, second: undefined };
  const r = classifier()(text);
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
  // Occasion demandée si la pièce y convient ; sinon on n'en parle pas (pas de « tous les jours » pour un mariage)
  const asked = w.occasion && w.occasion !== 'tout' ? w.occasion : null;
  const occ = asked ? (p.occasions.includes(asked) ? asked : null) : p.occasions[0];
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

/* ---------- Vendre avec des arguments vrais (jamais de fausse rareté ni de fausse promo) ---------- */

const pick = <T,>(state: BrainState, list: T[]) => list[(state.turn ?? 0) % list.length];

const BENEFITS = {
  fr: [
    '💚 Zéro risque : vous pouvez **payer en espèces à la livraison**, après avoir vu la pièce.',
    '✅ Vous **vérifiez la pièce devant le livreur** avant de l\'accepter.',
    '🛵 Livrée en **24 h à Dakar**, en 2 à 5 jours en régions.',
    '💬 Une vraie équipe vous répond sur WhatsApp, avant et après la commande.',
  ],
  wo: [
    '💚 Amul benn risque : mën nga **fey bu la ko indilee**, ginnaaw bi nga ko gis.',
    '✅ Dinga ko **seet ci kanam livreur bi** balaa ngay nangu.',
    '🛵 **24 waxtu** rekk ci Dakar, 2 ba 5 fan ci diwaan yi.',
    '💬 Am na ay nit ñu lay tontu ci WhatsApp, balaa ak ginnaaw commande bi.',
  ],
};
const INTROS = {
  fr: ['Voici ce que je vous ai choisi ✨', 'J\'ai sélectionné ces pièces pour vous ✨', 'Regardez ce que j\'ai trouvé pour vous ✨'],
  wo: ['Xoolal li ma la tànnal ✨', 'Tànnal naa la yii ✨', 'Xoolal yii, dinañu la neex ✨'],
};
const CLOSES = {
  fr: ['Laquelle vous plaît ? Touchez-la pour la voir de près.', 'Un coup de cœur ? Touchez la photo, puis « Ajouter au panier ».', 'Dites-moi celle qui vous fait envie, je vous guide jusqu\'à la commande.'],
  wo: ['Ban moo la neex ? Bësal ci ngir xool ko bu baax.', 'Bu la neexee, bësal nataal bi, bësal « Ajouter au panier ».', 'Wax ma ban nga bëgg, ma won la naka ngay jënde.'],
};

/** Pour compléter le look : une pièce de l'autre univers, dans une couleur qui va avec. */
function crossSell(items: Product[], products: Product[], state: BrainState): string {
  if (!items.length || items.some(p => p.category !== items[0].category)) return '';
  const other = items[0].category === 'chaussures' ? 'sacs' : 'chaussures';
  const fam = colorFamilies(items[0]);
  const shown = new Set(state.shown);
  const match = products.find(p => p.category === other && canBuy(p) && !shown.has(p.id) && colorFamilies(p).some(f => fam.includes(f))
    && (!state.wishes.size || !p.sizes.length || p.sizes.includes(state.wishes.size)));
  if (!match) return '';
  return L(state.lang,
    `👗 Pour compléter le look : [${match.name}](/produit/${match.slug}) (${formatPrice(match.price)}) va très bien avec.`,
    `👗 Ngir mu dëppoo : [${match.name}](/produit/${match.slug}) (${formatPrice(match.price)}) dafa dëppoo ak moom.`);
}

/** Fête proche (vraies dates) : commander à temps. */
function feteNudge(state: BrainState): string {
  const occ = state.wishes.occasion;
  if (occ && !['ceremonie', 'mariage', 'tout'].includes(occ)) return '';
  const f = upcomingFetes().find(x => { const n = daysUntil(x.date); return n > 3 && n <= 30; });
  if (!f) return '';
  const n = daysUntil(f.date);
  return L(state.lang,
    `🌙 ${f.name} dans ${n} jours : commandez avant le **${formatDay(orderBy(f.date))}** pour être livrée à temps à Dakar.`,
    `🌙 ${f.name} ci ${n} fan : jëndal balaa **${formatDay(orderBy(f.date))}** ngir mu agsi ci jamono ci Dakar.`);
}

/** Livraison offerte : ce qu'il manque dans le panier. */
function shippingNudge(state: BrainState, cartTotal = 0): string {
  const gap = SITE_CONFIG.freeShippingThreshold - cartTotal;
  if (cartTotal <= 0 || gap <= 0 || gap > 30000) return '';
  return L(state.lang,
    `🚚 Avec votre panier, il ne manque que **${formatPrice(gap)}** pour la livraison offerte.`,
    `🚚 Ci sa panier, **${formatPrice(gap)}** rekk moo des ngir yónnee bi bañ a fey.`);
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

function showProducts(products: Product[], state: BrainState, lead: { fr: string; wo: string } | null, exclude: string[] = [], cartTotal = 0): Pick<BrainReply, 'text' | 'chips'> {
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
  const intro = exact ? (lead ? L(lang, lead.fr, lead.wo) : pick(state, INTROS[lang])) : L(lang, 'Je n\'ai pas exactement ça, mais regardez ces pièces qui s\'en approchent :', 'Amul lu dëppoo bu wér, waaye xoolal yii :');
  const lines = items.map(p => present(p, state.wishes, products, lang)).join('\n');
  const extras = [crossSell(items, products, state), feteNudge(state), shippingNudge(state, cartTotal), pick(state, BENEFITS[lang])].filter(Boolean).slice(0, 3).join('\n');
  const close = pick(state, CLOSES[lang]);
  return { text: `${intro}\n${lines}\n\n${extras}\n\n${close}`, chips: L(lang, '💸 Moins cher|🔄 Autres modèles|🛒 Comment commander ?', '💸 Lu gën a yomb|🔄 Yeneen|🛒 Naka laay jënde ?').split('|') };
}

function cherche(slots: Slots, products: Product[], state: BrainState, cartTotal = 0): Pick<BrainReply, 'text' | 'chips'> {
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
  return showProducts(products, state, null, [], cartTotal);
}

function livraison(slots: Slots, lang: Lang) {
  const free = formatPrice(SITE_CONFIG.freeShippingThreshold);
  const zone = slots.zone && slots.zone !== 'Dakar' ? DELIVERY_ZONES.find(z => z.name === slots.zone) : null;
  if (zone && zone.name === 'Autres régions') return L(lang,
    `Oui, nous livrons chez vous 🌸 Pour votre ville, la livraison coûte **${formatPrice(zone.fee)}** et prend **${zone.delay}**. Offerte dès ${free} d'achat 🛵`,
    `Waaw, dinañu la yónnee 🌸 Ci sa dëkk, yónnee bi **${formatPrice(zone.fee)}** la, te day am ci **${zone.delay}** 🛵`);
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

export function reply(text: string, prev: BrainState, ctx: BrainCtx): BrainReply {
  const state: BrainState = JSON.parse(JSON.stringify(prev));
  state.turn = (state.turn ?? 0) + 1;
  const cartTotal = ctx.cartTotal ?? 0;
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
  // « taille du sac » : ce sont les dimensions, pas la pointure
  if (intent === 'pointure' && slots.kind === 'sacs') intent = 'dimensions';
  // Des détails d'article sans intention claire : c'est une recherche
  if ((intent === 'inconnu' || intent === 'oui' || intent === 'salut') && (slots.kind || slots.color || slots.occasion || slots.size || slots.model)) intent = 'cherche';
  if (intent === 'prix' && !slots.model && !state.shown.length && (slots.kind || slots.budget)) intent = 'cherche';

  // « Montrez-moi tout » : on oublie les filtres (sauf la pointure)
  if (nre(['montrez-moi tout', 'montrez tout', 'tout voir', 'wone ma lépp']).test(normalize(text))) { state.wishes = { kind: 'tout', size: state.wishes.size }; state.pending = undefined; intent = 'cherche'; }
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
      const t = normalize(text);
      const name = ctx.firstName ? ` ${ctx.firstName}` : '';
      // On rend le salut comme il a été donné
      const salam = nre(['salaam aleekum', 'salam', 'aleekum', 'asalamu']).test(t);
      const nangadef = nre(['na nga def', 'nanga def', 'naka nga def', 'jàmm nga am', 'naka suba si', 'naka ngoon si']).test(t);
      const fete = upcomingFetes().find(f => ['tabaski', 'korite'].some(k => normalize(f.name).includes(k)) && daysUntil(f.date) <= 2);
      const hello = (ctx.hour ?? 12) >= 18 ? 'Bonsoir' : 'Bonjour';
      const wo = `${salam ? 'Maalekum salaam' : 'Salaam aleekum'}${name || ' soxna si'} 🌸${nangadef ? ' Maa ngi fi rekk, alxamdulilaa. Yow nag ?' : ''}${fete ? ` Dewenati, ${fete.name} bu baax !` : ''} Dalal ak jàmm ci Maefa, maa ngi tudd Maé. Lan nga bëgg tey : sac walla dàll ?`;
      const fr = `${salam ? 'Maalekum salaam' : hello}${name} 🌸${nangadef ? ' Je vais très bien, merci ! Et vous ?' : ''}${fete ? ` Bonne fête de ${fete.name} !` : ''} Bienvenue chez Maefa, je suis Maé. Qu'est-ce qui vous ferait plaisir aujourd'hui : un sac, des chaussures ?`;
      return out(L(lang, fr, wo), KIND_CHIPS);
    }
    case 'merci': return out(L(lang, 'Avec plaisir 🌸 Je reste là si vous avez une autre question.', 'Ñoo ko bokk 🌸 Maa ngi fi bu am leneen.'));
    case 'aurevoir': return out(L(lang, `Au revoir${ctx.firstName ? ` ${ctx.firstName}` : ''} et à très bientôt chez Maefa 🌸`, `Ba beneen yoon${ctx.firstName ? ` ${ctx.firstName}` : ''}, jàmm ak salaam 🌸 Jërëjëf ci Maefa.`));
    case 'qui': return out(L(lang,
      'Je suis **Maé**, la conseillère virtuelle de Maefa : un petit programme (pas une personne) qui connaît toutes nos pièces. Pour parler à l\'équipe, touchez « Parler à Maefa » 🌸',
      'Maa ngi tudd **Maé** : programme bu Maefa (du nit), xam naa sac yi ak dàll yi yépp. Ngir wax ak nit, bësal « Wax ak Maefa » 🌸'), [L(lang, '💬 Parler à Maefa', '💬 Wax ak Maefa')]);
    case 'cherche': { const r = cherche(slots, products, state, cartTotal); return out(r.text, r.chips); }
    case 'autres': {
      if (!state.wishes.kind && !state.shown.length) { const r = cherche(slots, products, state, cartTotal); return out(r.text, r.chips); }
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
        `C'est très simple 🛍️\n1. Ouvrez la pièce${last ? ` (par exemple [${last.name}](/produit/${last.slug}))` : ''} et choisissez la couleur${state.wishes.kind === 'chaussures' ? ' et la pointure' : ''}.\n2. Touchez **« Acheter maintenant »** (ou ajoutez plusieurs pièces au panier puis **« Commander sur WhatsApp »**) : WhatsApp s'ouvre avec votre commande déjà écrite.\n3. Nous vérifions la disponibilité et vous envoyons un lien : vous indiquez votre maison sur la carte et le paiement (Wave, Orange Money ou à la livraison).`,
        `Dafa yomb 🛍️\n1. Ubbil pièce bi${last ? ` ([${last.name}](/produit/${last.slug}))` : ''}, tànnal melo bi${state.wishes.kind === 'chaussures' ? ' ak sa pointure' : ''}.\n2. Bësal **« Acheter maintenant »** : WhatsApp dina ubbiku, sa commande bindu na fa ba noppi.\n3. Dinañu seet ndax am na, te yónnee la ab lien : nga wone sa kër ci kart bi te tànn naka ngay fey (Wave, Orange Money walla bu la ko indilee).`));
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
    case 'hesite': return out(L(lang,
      'Prenez votre temps 🌸 Pour ne pas perdre la pièce de vue, touchez le **♡** sur sa fiche : elle reste dans vos favoris. Et rappelez-vous : vous pouvez **payer à la livraison**, après l\'avoir vue et vérifiée.',
      'Xaaral sa bopp 🌸 Bësal **♡** ci pièce bi ngir mu des ci sa favoris. Te mën nga **fey bu la ko indilee**, ginnaaw bi nga ko seet.'),
      L(lang, '🔄 Autres modèles|💬 Parler à Maefa', '🔄 Yeneen|💬 Wax ak Maefa').split('|'));
    case 'confiance': return out(L(lang,
      `C'est une vraie question, et je vous comprends 🌸 Voici ce qui vous protège :\n- 💚 Vous pouvez **payer en espèces à la livraison** : vous ne payez qu'en ayant la pièce en main.\n- ✅ Vous **vérifiez la commande devant le livreur** avant de l'accepter.\n- 📍 Vous **suivez le livreur sur la carte**.\n- 💬 Une vraie équipe répond au **${SITE_CONFIG.phone}** (appel ou WhatsApp).`,
      `Dégg naa la 🌸 Lii moo lay aar :\n- 💚 Mën nga **fey bu la ko indilee** : doo fey te gisoo ko.\n- ✅ Dinga **seet sa commande ci kanam livreur bi**.\n- 📍 Dinga **gis livreur bi ci kart bi**.\n- 💬 Ay nit ñu dëgg ñoo lay tontu ci **${SITE_CONFIG.phone}**.`),
      L(lang, '👜 Voir les sacs|👡 Voir les chaussures', '👜 Sac|👡 Dàll').split('|'));
    case 'qualite': {
      const p = (slots.model ? products.find(x => modelOf(x) === slots.model) : null) ?? (state.shown.length ? products.find(x => x.id === state.shown[state.shown.length - 1]) : null);
      if (p) return out(L(lang,
        `**${modelOf(p)}** : ${p.material}. ${p.care ? `Entretien : ${p.care}` : ''} Chaque pièce est contrôlée par l'équipe avant l'envoi, et vous la vérifiez devant le livreur 🌸`,
        `**${modelOf(p)}** : ${p.material}. Nu ngi koy seet balaa ñuy yónnee, te yow itam dinga ko seet ci kanam livreur bi 🌸`));
      return out(L(lang,
        'Chaque pièce est **choisie et contrôlée** par notre équipe avant l\'envoi ; la matière exacte est indiquée sur chaque fiche. Et vous vérifiez tout **devant le livreur** avant d\'accepter 🌸 Quelle pièce vous intéresse ?',
        'Nu ngi seet pièce yépp **balaa ñuy yónnee** ; lu ñu ko def mu ngi ci fiche bi. Te dinga ko seet **ci kanam livreur bi** 🌸 Ban pièce nga bëgg ?'), KIND_CHIPS);
    }
    case 'dimensions': return out(L(lang,
      `Je n'ai pas les mesures exactes ici, et je préfère ne pas vous dire n'importe quoi 🌸 Demandez-les sur [WhatsApp](${wa('Bonjour Maefa 🌸 Pouvez-vous m\'envoyer les dimensions et une vidéo de cette pièce ?')}) : l'équipe vous envoie les dimensions et une vidéo de la pièce.`,
      `Amuma fii mesure yu wér yi 🌸 Laajal leen ci [WhatsApp](${wa('Salaam aleekum Maefa 🌸 Yónnee leen ma mesure bi ak video bi.')}) : dinañu la yónnee mesure yi ak video.`));
    case 'photos': return out(L(lang,
      `Chaque fiche a plusieurs photos et souvent une **vidéo** : touchez « Vidéo » sur la photo 🎬 Nos photos viennent des vraies pièces. Pour d'autres angles, demandez sur [WhatsApp](${wa('Bonjour Maefa 🌸 Pouvez-vous m\'envoyer plus de photos ?')}).`,
      `Fiche bu nekk am na ay nataal ak **video** : bësal « Vidéo » ci nataal bi 🎬 Ngir yeneen nataal, laaj ci [WhatsApp](${wa('Salaam aleekum Maefa 🌸 Yónnee leen ma yeneen nataal.')}).`));
    case 'compliment': {
      const last = state.shown.length ? products.find(x => x.id === state.shown[state.shown.length - 1]) : null;
      if (last) return out(L(lang,
        `N'est-ce pas ? 😍 Vous avez l'œil ! Touchez la pièce qui vous plaît puis **« Ajouter au panier »** : vous pouvez payer à la livraison, après l'avoir vue.`,
        `Dafa rafet, dëgg la 😍 Bësal pièce bi la neex, bësal **« Ajouter au panier »** : mën nga fey bu la ko indilee.`),
        L(lang, '🛒 Comment commander ?|🔄 Autres modèles', '🛒 Naka laay jënde ?|🔄 Yeneen').split('|'));
      return out(L(lang, 'Merci 🌸 Voulez-vous que je vous montre nos dernières arrivées ?', 'Jërëjëf 🌸 Ndax ma wone la yu bees yi ?'), L(lang, '✨ Les nouveautés|👜 Un sac|👡 Des chaussures', '✨ Yu bees yi|👜 Sac|👡 Dàll').split('|'));
    }
    case 'nouveautes': {
      const w = state.wishes;
      state.wishes = { kind: w.kind ?? 'tout', size: w.size };
      const r = showProducts(products, state, { fr: 'Nos dernières arrivées, choisies avec soin ✨', wo: 'Yu bees yi ñu indi ✨' }, [], cartTotal);
      return out(r.text, r.chips);
    }
    case 'gros': return out(L(lang,
      `Avec plaisir 🌸 Pour plusieurs pièces ou pour la revente, écrivez à l'équipe sur [WhatsApp](${wa('Bonjour Maefa 🌸 Je souhaite commander plusieurs pièces (revente). Voici les modèles et quantités :')}) avec les modèles et les quantités : elle vous répond avec les conditions.`,
      `Waaw 🌸 Ngir jënd bu bare walla jaay, bindal nu ci [WhatsApp](${wa('Salaam aleekum Maefa 🌸 Dama bëgg jënd bu bare. Modèle yi ak ñaata :')}) : dinañu la tontu.`));
    case 'modifier': return out(L(lang,
      `Pas de souci 🌸 Écrivez vite à l'équipe sur [WhatsApp](${wa('Bonjour Maefa 🌸 Je voudrais modifier / annuler ma commande n° ')}) avec votre numéro de commande : **avant l'expédition**, elle peut modifier ou annuler.`,
      `Amul solo 🌸 Bindal nu léegi ci [WhatsApp](${wa('Salaam aleekum Maefa 🌸 Dama bëgg soppi walla dindi sama commande n° ')}) ak sa nimero commande : **balaa ñu koy yónnee**, mën nañu ko soppi.`));
    case 'langue': {
      const t = normalize(text);
      if (nre(['english', 'anglais']).test(t)) return out('Sorry, I speak French and Wolof 🌸 Je parle français et wolof : écrivez-moi dans l\'une de ces langues !', KIND_CHIPS);
      const fr = nre(['français', 'francais']).test(t);
      state.lang = nre(['wolof']).test(t) && !fr ? 'wo' : fr ? 'fr' : state.lang;
      return out(L(state.lang, 'Bien sûr, je vous parle en français 🌸 Que puis-je faire pour vous : un sac, des chaussures ?', 'Waaw, dégg naa wolof 🌸 Lan nga bëgg : sac walla dàll ?'), QUESTIONS.kind.options.map(o => optionLabel(o, state.lang)));
    }
    case 'bof': {
      if (state.shown.length) return out(L(lang,
        'Je suis là 🌸 Touchez la pièce qui vous plaît pour la voir de près, ou dites-moi ce que vous aimeriez changer (couleur, prix, modèle).',
        'Maa ngi fi 🌸 Bësal pièce bi la neex ngir xool ko, walla wax ma lu nga bëgg soppi (melo, njëg, modèle).'),
        L(lang, '💸 Moins cher|🔄 Autres modèles|🛒 Comment commander ?', '💸 Lu gën a yomb|🔄 Yeneen|🛒 Naka laay jënde ?').split('|'));
      return out(L(lang, 'Je suis là pour vous 🌸 Un sac, des chaussures, ou juste envie de voir les nouveautés ?', 'Maa ngi fi 🌸 Sac, dàll, walla nga bëgg xool yu bees yi ?'),
        L(lang, '👜 Un sac|👡 Des chaussures|✨ Les nouveautés', '👜 Sac|👡 Dàll|✨ Yu bees yi').split('|'));
    }
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
