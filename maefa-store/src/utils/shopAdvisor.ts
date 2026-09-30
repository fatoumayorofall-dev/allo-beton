/**
 * « Comme en boutique » : la vendeuse pose les questions qu'on pose au comptoir
 * (sac ou chaussures, occasion, couleur, budget, pointure), puis apporte 3 pièces.
 * Fonctionne sans IA, en français et en wolof.
 */
import type { OccasionId, Product } from '../data/types';
import { canBuy } from './stock';

export type Lang = 'fr' | 'wo';
export type Kind = 'sacs' | 'chaussures' | 'tout';
export type ColorFamily = 'noir' | 'marron' | 'clair' | 'rouge' | 'dore' | 'vif' | 'tout';
export type Budget = 16000 | 20000 | 0;

export interface Wishes {
  kind?: Kind;
  occasion?: OccasionId | 'tout';
  color?: ColorFamily;
  budget?: Budget;
  /** Pointure, ou '' si la cliente ne la connaît pas */
  size?: string;
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const COLOR_RE: Record<Exclude<ColorFamily, 'tout'>, RegExp> = {
  noir: /noir/,
  marron: /camel|chocolat|cognac|taupe|bronze|marron|caramel/,
  clair: /blanc|creme|beige|gris|nude|ivoire/,
  rouge: /rouge|bordeaux|framboise|fuchsia|rose|prune/,
  dore: /dore|\bor\b/,
  vif: /vert|bleu|violet|orange|jaune/,
};

export const colorFamilies = (p: Product): ColorFamily[] =>
  (Object.keys(COLOR_RE) as (keyof typeof COLOR_RE)[]).filter(f => p.colors.some(c => COLOR_RE[f].test(norm(c.name))));

/** Modèle d'une pièce : son nom sans la couleur (« Sac Awa à fermoir doré — Taupe » → « Sac Awa à fermoir doré »). */
export const modelOf = (p: Product) => p.name.split(' — ')[0];

/** Les pièces qui répondent aux souhaits, les plus proches d'abord (au plus `max`). */
export function recommend(products: Product[], w: Wishes, max = 3): { items: Product[]; exact: boolean } {
  const buyable = products.filter(canBuy);
  const score = (p: Product) =>
    (w.occasion && w.occasion !== 'tout' && p.occasions.includes(w.occasion) ? 3 : 0)
    + (w.color && w.color !== 'tout' && colorFamilies(p).includes(w.color) ? 2 : 0)
    + (p.isNew ? 0.5 : 0) + (p.isBestseller ? 0.5 : 0);
  const fits = (p: Product, strict: boolean) =>
    (!w.kind || w.kind === 'tout' || p.category === w.kind)
    && (!w.budget || p.price <= w.budget)
    && (!w.size || !p.sizes.length || p.sizes.includes(w.size))
    && (!strict || !w.color || w.color === 'tout' || colorFamilies(p).includes(w.color))
    && (!strict || !w.occasion || w.occasion === 'tout' || p.occasions.includes(w.occasion));
  // Un modèle par famille (pas trois fois le même sac dans trois couleurs)
  const oneByModel = (list: Product[]) => {
    const seen = new Set<string>();
    return list.filter(p => { const m = modelOf(p); if (seen.has(m)) return false; seen.add(m); return true; });
  };
  const sorted = (list: Product[]) => [...list].sort((a, b) => score(b) - score(a) || b.createdAt.localeCompare(a.createdAt));
  const strict = oneByModel(sorted(buyable.filter(p => fits(p, true))));
  if (strict.length) return { items: strict.slice(0, max), exact: true };
  // Rien d'exact : on garde le type, le budget et la pointure, on relâche couleur et occasion
  return { items: oneByModel(sorted(buyable.filter(p => fits(p, false)))).slice(0, max), exact: false };
}

/* ---------- Questions, comme au comptoir ---------- */

type Option<V> = { value: V; emoji: string; fr: string; wo: string };
export interface Question<K extends keyof Wishes = keyof Wishes> {
  key: K;
  fr: string;
  wo: string;
  options: Option<NonNullable<Wishes[K]>>[];
}

export const QUESTIONS: { [K in keyof Wishes]-?: Question<K> } = {
  kind: {
    key: 'kind',
    fr: 'Qu\'est-ce qui vous ferait plaisir aujourd\'hui ?',
    wo: 'Lan nga bëgg tey ?',
    options: [
      { value: 'sacs', emoji: '👜', fr: 'Un sac', wo: 'Sac' },
      { value: 'chaussures', emoji: '👡', fr: 'Des chaussures', wo: 'Dàll' },
      { value: 'tout', emoji: '✨', fr: 'Montrez-moi tout', wo: 'Wone ma lépp' },
    ],
  },
  occasion: {
    key: 'occasion',
    fr: 'C\'est pour quelle occasion ?',
    wo: 'Ngir lan la ?',
    options: [
      { value: 'mariage', emoji: '💍', fr: 'Mariage, baptême', wo: 'Céet, ngénte' },
      { value: 'ceremonie', emoji: '🌙', fr: 'Tabaski, Korité', wo: 'Tabaski, Kori' },
      { value: 'soiree', emoji: '🎉', fr: 'Soirée', wo: 'Soirée' },
      { value: 'bureau', emoji: '💼', fr: 'Bureau', wo: 'Liggéey' },
      { value: 'quotidien', emoji: '☀️', fr: 'Tous les jours', wo: 'Bés bu nekk' },
      { value: 'tout', emoji: '🤍', fr: 'Peu importe', wo: 'Lépp baax na' },
    ],
  },
  color: {
    key: 'color',
    fr: 'Quelle couleur vous plaît ?',
    wo: 'Ban melo moo la neex ?',
    options: [
      { value: 'noir', emoji: '⚫', fr: 'Noir', wo: 'Ñuul' },
      { value: 'marron', emoji: '🟤', fr: 'Marron, camel', wo: 'Marron' },
      { value: 'clair', emoji: '⚪', fr: 'Blanc, crème, gris', wo: 'Weex, crème' },
      { value: 'rouge', emoji: '🔴', fr: 'Rouge, rose, bordeaux', wo: 'Xonq, rose' },
      { value: 'dore', emoji: '🟡', fr: 'Doré', wo: 'Doré' },
      { value: 'vif', emoji: '🟢', fr: 'Vert, bleu, violet, orange', wo: 'Wert, bulo, yeneen' },
      { value: 'tout', emoji: '🌈', fr: 'Toutes', wo: 'Lépp' },
    ],
  },
  budget: {
    key: 'budget',
    fr: 'Quel budget voulez-vous mettre ?',
    wo: 'Ñaata nga bëgg a joxe ?',
    options: [
      { value: 16000, emoji: '💵', fr: 'Jusqu\'à 16 000 F', wo: 'Ba 16 000 F' },
      { value: 20000, emoji: '💵', fr: 'Jusqu\'à 20 000 F', wo: 'Ba 20 000 F' },
      { value: 0, emoji: '👌', fr: 'Peu importe', wo: 'Lépp baax na' },
    ],
  },
  size: {
    key: 'size',
    fr: 'Quelle est votre pointure ?',
    wo: 'Ban pointure nga ?',
    options: [
      ...['36', '37', '38', '39', '40', '41'].map(s => ({ value: s, emoji: '👣', fr: s, wo: s })),
      { value: '', emoji: '🤷🏾‍♀️', fr: 'Je ne sais pas', wo: 'Xamuma' },
    ],
  },
};

/** Prochaine question à poser (la pointure seulement si des chaussures peuvent être proposées). */
export function nextQuestion(w: Wishes): Question | null {
  if (!w.kind) return QUESTIONS.kind;
  if (!w.occasion) return QUESTIONS.occasion;
  if (!w.color) return QUESTIONS.color;
  if (w.budget === undefined) return QUESTIONS.budget;
  if (w.kind === 'chaussures' && w.size === undefined) return QUESTIONS.size;
  return null;
}

/* ---------- Présentation des pièces, à voix de vendeuse ---------- */

const OCC_WO: Record<OccasionId, string> = { mariage: 'céet ak ngénte', ceremonie: 'Tabaski ak Kori', soiree: 'soirée', bureau: 'liggéey', quotidien: 'bés bu nekk', vacances: 'vacances' };
const OCC_FR: Record<OccasionId, string> = { mariage: 'un mariage ou un baptême', ceremonie: 'la Tabaski ou la Korité', soiree: 'une soirée', bureau: 'le bureau', quotidien: 'tous les jours', vacances: 'les vacances' };

const price = (n: number) => `${n.toLocaleString('fr-FR').replace(/\s/g, ' ')} FCFA`;

/** Une phrase de présentation, comme la vendeuse qui tend la pièce. */
export function pitch(p: Product, w: Wishes, lang: Lang): string {
  const occ = (w.occasion && w.occasion !== 'tout' && p.occasions.includes(w.occasion) ? w.occasion : p.occasions[0]) as OccasionId | undefined;
  const colors = p.colors.map(c => c.name.toLowerCase()).join(', ');
  if (lang === 'wo') {
    return `**${p.name}**, ${price(p.price)}. ${occ ? `Dafa baax ngir ${OCC_WO[occ]}. ` : ''}${w.size && p.sizes.includes(w.size) ? `Am na sa pointure ${w.size}. ` : ''}Melo : ${colors}.`;
  }
  return `**${p.name}**, ${price(p.price)}. ${occ ? `Idéal pour ${OCC_FR[occ]}. ` : ''}${p.styleTip ? `${p.styleTip} ` : ''}${w.size && p.sizes.includes(w.size) ? `Disponible en ${w.size}.` : ''}`.trim();
}

export const ADVISOR_TEXT = {
  start: { fr: '🛍️ Conseil comme en boutique', wo: '🛍️ Wone ma li am' },
  startHint: { fr: 'Je vous pose 4 petites questions et je vous apporte les pièces', wo: 'Dama lay laaj ñeenti laaj, ma indil la li dëppoo' },
  results: { fr: 'Voici ce que je vous ai choisi 👇', wo: 'Xoolal li ma la tànnal 👇' },
  near: { fr: 'Je n\'ai pas exactement ça en ce moment, mais regardez ces pièces 👇', wo: 'Amul lu dëppoo bu wér léegi, waaye xoolal yii 👇' },
  none: { fr: 'Je n\'ai rien dans ce budget pour le moment. Écrivez-nous sur WhatsApp : nous vous prévenons des arrivages.', wo: 'Amul dara ci njëg jooju léegi. Bindal nu walla yónnee vocal ci WhatsApp.' },
  add: { fr: 'Ajouter au panier', wo: 'Yokk ci panier' },
  see: { fr: 'Voir', wo: 'Xool' },
  again: { fr: 'Autre chose', wo: 'Leneen' },
  added: { fr: 'Ajouté à votre panier', wo: 'Yokk nañu ko ci sa panier' },
};
