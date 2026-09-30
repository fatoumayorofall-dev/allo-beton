/**
 * Ce que la cliente précise dans sa phrase : type d'article, occasion, couleur, budget, pointure,
 * pièce citée, ville de livraison, numéro de commande. Français et wolof.
 */
import type { OccasionId, Product } from '../data/types';
import { DELIVERY_ZONES } from '../config/site';
import type { ColorFamily, Kind } from '../utils/shopAdvisor';
import { modelOf } from '../utils/shopAdvisor';
import { normalize, nre } from './nlu';

export interface Slots {
  kind?: Exclude<Kind, 'tout'>;
  /** Type précis : pochette, mules à talon, tongs, sandales plates… (mot du sous-type) */
  sub?: string;
  occasion?: OccasionId;
  color?: Exclude<ColorFamily, 'tout'>;
  budget?: number;
  size?: string;
  /** Modèle cité (« Sac Awa à fermoir doré »…) */
  model?: string;
  zone?: string;
  orderId?: string;
}

const has = (t: string, re: RegExp) => re.test(t);
/** Expression « un de ces mots », les mots passant par la même normalisation que la phrase. */
const words = (...list: string[]) => new RegExp(`\\b(${[...new Set(list.map(w => normalize(w)))].join('|')})\\b`);

const KIND: [Exclude<Kind, 'tout'>, RegExp][] = [
  ['sacs', words('sac', 'sacs', 'pochette', 'pochettes', 'cabas', 'sacoche', 'besace', 'mbuus', 'mbus')],
  ['chaussures', words('chausure', 'chausures', 'chaussure', 'chaussures', 'sandale', 'sandales', 'mule', 'mules', 'tong', 'tongs', 'talon', 'talons', 'escarpin', 'escarpins', 'claquette', 'claquettes', 'dal', 'dall', 'dalu', 'pied', 'pieds')],
];
const SUB: [string, RegExp][] = [
  ['pochette', /\bpochet/],
  ['cabas', /\bcabas\b/],
  ['talon', /\btalon/],
  ['tong', /\btong/],
  ['mule', /\bmule/],
];
const OCC: [OccasionId, RegExp][] = [
  ['mariage', words('mariage', 'mariages', 'bapteme', 'baptemes', 'ngente', 'ngentee', 'takk', 'nikah', 'wedding')],
  ['ceremonie', words('tabaski', 'korite', 'kori', 'fete', 'fetes', 'ceremonie', 'ceremonies', 'gamu', 'gamou', 'magal', 'tamkharit', 'tamxarit')],
  ['soiree', words('soiree', 'soirees', 'gala', 'diner', 'sortie', 'anniversaire', 'boite', 'concert')],
  ['bureau', words('bureau', 'travail', 'taf', 'liger', 'ligey', 'ligeey', 'reunion', 'office')],
  ['quotidien', words('quotidien', 'tous les jours', 'tus les jurs', 'bes bu nek', 'chaque jour', 'casual')],
  ['vacances', words('vacances', 'plage', 'saly', 'voyage')],
];
const COLOR: [Exclude<ColorFamily, 'tout'>, RegExp][] = [
  ['noir', words('noir', 'noire', 'noirs', 'nul', 'nuul', 'black')],
  ['marron', words('maron', 'marron', 'camel', 'chocolat', 'cognac', 'taupe', 'bronze', 'beige fonce', 'caramel', 'brun')],
  ['clair', words('blanc', 'blanche', 'blancs', 'weex', 'wex', 'creme', 'beige', 'gris', 'grise', 'nude', 'ivoire')],
  ['rouge', words('rouge', 'rouges', 'xonq', 'xonx', 'bordeaux', 'bordo', 'rose', 'roses', 'fuchsia', 'framboise', 'prune')],
  ['dore', words('dore', 'doree', 'dores', 'or', 'gold')],
  ['vif', words('vert', 'verte', 'wert', 'bleu', 'bleue', 'bulo', 'violet', 'violette', 'orange', 'jaune', 'mbulu', 'olive', 'emeraude')],
];

/* ---------- Nombres et argent en wolof ---------- */

const W_UNITS: Record<string, number> = {};
[['benn', 1], ['ñaar', 2], ['ñaari', 2], ['ñett', 3], ['ñetti', 3], ['ñeent', 4], ['ñeenti', 4], ['juróom', 5], ['juróomi', 5]]
  .forEach(([w, n]) => { W_UNITS[normalize(w as string)] = n as number; });
const W_TEN = new Set(['fukk', 'fukki'].map(normalize));
const W_HUNDRED = new Set(['téeméer', 'téeméeri', 'teemeer'].map(normalize));
/** Unités de monnaie : junni = 1 000 dërëm = 5 000 F ; dërëm = 5 F ; mille = 1 000 F. */
const W_MONEY: Record<string, number> = { [normalize('junni')]: 5000, [normalize('dërëm')]: 5, [normalize('mille')]: 1000, mil: 1000 };

/** « ñetti junni » → 15 000 ; « fukk ak juróom mille » → 15 000 ; « ñaar fukk mille » → 20 000. */
export function wolofAmount(t: string): number | undefined {
  const words = t.split(' ');
  const i = words.findIndex(w => W_MONEY[w] !== undefined);
  if (i < 1) return undefined;
  let j = i - 1;
  while (j >= 0 && (W_UNITS[words[j]] !== undefined || W_TEN.has(words[j]) || W_HUNDRED.has(words[j]) || words[j] === 'ak')) j--;
  const nums = words.slice(j + 1, i);
  if (!nums.length) return undefined;
  let total = 0, cur = 0;
  for (const w of nums) {
    if (w === 'ak') { total += cur; cur = 0; }
    else if (W_TEN.has(w)) cur = (cur || 1) * 10; // ñaar fukk = 20
    else if (W_HUNDRED.has(w)) cur = (cur || 1) * 100;
    else cur += W_UNITS[w]; // juróom ñaar = 7
  }
  const n = total + cur;
  return n ? n * W_MONEY[words[i]] : undefined;
}

/** Montant : « 16 000 », « 16000f », « 16k », « 16 mille », « ba 16 000 ». */
function budget(t: string, raw: string): number | undefined {
  const wo = wolofAmount(t);
  if (wo && wo >= 1000) return wo;
  const m = raw.replace(/ | /g, ' ').match(/(\d{1,3}(?:[ .]\d{3})+|\d{4,6}|\d{1,3})\s*(k|mille|mil|000|f\b|fcfa|francs?)?/i);
  if (!m) return undefined;
  let n = Number(m[1].replace(/[ .]/g, ''));
  const unit = (m[2] || '').toLowerCase();
  if (unit === 'k' || unit === 'mille' || unit === 'mil') n *= 1000;
  if (n < 1000) return undefined; // « 38 » est une pointure, pas un prix
  if (!BUDGET_WORDS.test(t) && !unit) return undefined;
  return n;
}

const BUDGET_WORDS = nre(['moins', 'moins de', 'max', 'maximum', 'budget', 'jusqu', 'jusque', 'pas plus', 'à peu près', 'environ', 'autour', 'njëg', 'njëgam', 'prix', 'coûte', 'coût', 'fcfa', 'f', 'francs', 'mille', 'yomb', 'ba', 'dërëm', 'junni']);
const SIZE_BEFORE = nre(['pointure', 'taille', 'je fais du', 'je chausse du', 'chausse', 'fais du', 'sama pointure', 'du', 'en'], { suffix: '\\s*(3[5-9]|4[0-4])\\b' });

function size(t: string, kindShoes: boolean): string | undefined {
  const m = t.match(SIZE_BEFORE) || (kindShoes ? t.match(/\b(3[5-9]|4[0-4])\b/) : null);
  return m?.[1];
}

/** Index des modèles du catalogue : mots distinctifs → nom du modèle. */
export function modelIndex(products: Product[]) {
  const generic = new Set<string>(['sac', 'sacs', 'a', 'de', 'en', 'et', 'la', 'le', 'dore', 'tongs', 'mules', 'zara', 'pochette', 'fermoir', 'breloque', 'coeur', 'anneau', 'talon', 'croisees', 'strass', 'papillon', 'orteil', 'anse'].map(normalize));
  const idx = new Map<string, string>();
  for (const p of products) {
    const model = modelOf(p);
    const words = normalize(model).split(' ');
    const key = words.filter(w => w.length > 2 && !generic.has(w));
    for (const w of key) if (!idx.has(w)) idx.set(w, model);
  }
  // Modèles Zara sans prénom : mots clés dédiés
  for (const p of products) {
    const m = modelOf(p), n = normalize(m);
    if (/orteil/.test(n)) idx.set('orteil', m);
    if (/talon/.test(n)) idx.set('talon', m);
    if (/strass|croise/.test(n)) { idx.set('strass', m); idx.set('croisees', m); }
    if (/anneau dore/.test(n) && !/orteil/.test(n)) idx.set('anneau', m);
    if (/papillon/.test(n)) idx.set('papillon', m);
    if (/breloque|coeur/.test(n)) { idx.set('breloque', m); idx.set('coeur', m); }
  }
  return idx;
}

const OTHER_TOWNS = nre(['ziguinchor', 'kolda', 'tambacounda', 'tamba', 'matam', 'louga', 'fatick', 'kédougou', 'sédhiou', 'kaffrine', 'diourbel', 'podor', 'richard toll', 'dagana', 'casamance', 'bignona', 'vélingara', 'linguère', 'mbacké', 'tivaouane', 'joal', 'nioro']);

export function extractSlots(raw: string, products: Product[] = []): Slots {
  const t = normalize(raw);
  const s: Slots = {};
  for (const [k, re] of KIND) if (has(t, re)) { s.kind = k; break; }
  for (const [k, re] of SUB) if (has(t, re)) { s.sub = k; break; }
  for (const [k, re] of OCC) if (has(t, re)) { s.occasion = k; break; }
  // « céet » (mariage) : repéré avant normalisation, qui le confondrait avec « cet »
  if (!s.occasion && /\bc[ée]{2}t\b/i.test(raw)) s.occasion = 'mariage';
  for (const [k, re] of COLOR) if (has(t, re)) { s.color = k; break; }
  s.budget = budget(t, raw);
  s.size = size(t, s.kind === 'chaussures');
  if (s.size && !s.kind) s.kind = 'chaussures';
  const id = raw.toUpperCase().match(/\b(?:MAE|EFA|FB)-[A-Z0-9]{4,12}\b/);
  if (id) s.orderId = id[0];
  for (const z of DELIVERY_ZONES) {
    const full = normalize(z.name).replace(/ \/ .*/, '');
    const first = full.split(' ')[0];
    if (new RegExp(`\\b${full}\\b`).test(t) || (first.length > 3 && new RegExp(`\\b${first}`).test(t))) { s.zone = z.name; break; }
  }
  // Villes hors des zones listées : tarif « Autres régions »
  if (!s.zone && OTHER_TOWNS.test(t)) s.zone = 'Autres régions';
  if (!s.zone && nre(['thiès', 'tiès', 'cees']).test(t)) s.zone = 'Thiès';
  if (!s.zone && nre(['dakar', 'ndakaaru']).test(t)) s.zone = 'Dakar';
  if (products.length) {
    const idx = modelIndex(products);
    for (const w of t.split(' ')) if (idx.has(w)) { s.model = idx.get(w); break; }
    if (s.model) {
      const p = products.find(x => modelOf(x) === s.model);
      if (p && !s.kind) s.kind = p.category as Slots['kind'];
    }
  }
  (Object.keys(s) as (keyof Slots)[]).forEach(k => s[k] === undefined && delete s[k]);
  return s;
}
