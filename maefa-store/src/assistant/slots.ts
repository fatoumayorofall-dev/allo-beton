/**
 * Ce que la cliente précise dans sa phrase : type d'article, occasion, couleur, budget, pointure,
 * pièce citée, ville de livraison, numéro de commande. Français et wolof.
 */
import type { OccasionId, Product } from '../data/types';
import { DELIVERY_ZONES } from '../config/site';
import type { ColorFamily, Kind } from '../utils/shopAdvisor';
import { modelOf } from '../utils/shopAdvisor';
import { normalize } from './nlu';

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

/** Montant : « 16 000 », « 16000f », « 16k », « 16 mille », « ba 16 000 ». */
function budget(t: string, raw: string): number | undefined {
  const m = raw.replace(/ | /g, ' ').match(/(\d{1,3}(?:[ .]\d{3})+|\d{4,6}|\d{1,3})\s*(k|mille|000|f\b|fcfa|francs?)?/i);
  if (!m) return undefined;
  let n = Number(m[1].replace(/[ .]/g, ''));
  const unit = (m[2] || '').toLowerCase();
  if (unit === 'k' || unit === 'mille') n *= 1000;
  if (n < 1000) return undefined; // « 38 » est une pointure, pas un prix
  if (!/moins|max|budget|jusq|pas plus|ba |a peu pres|environ|autur|njeg|prix|cute|cut|fcfa|\bf\b|francs|mille|yomb/.test(t) && !unit) return undefined;
  return n;
}

function size(t: string, kindShoes: boolean): string | undefined {
  const m = t.match(/\b(?:pointure|taille|je fais du|je chause du|chause|fais du|pointur|sama pointure|du)\s*(3[5-9]|4[0-4])\b/) || (kindShoes ? t.match(/\b(3[5-9]|4[0-4])\b/) : null);
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
  if (!s.zone && /\b(ziguinchor|kolda|tambacunda|tamba|matam|luga|louga|fatick|kedugu|kedougou|sedhiu|sedhiou|kafrine|kaffrine|diurbel|diourbel|podor|richard tol|dagana|casamance|bignona|velingara|linguere|mbacke|tivaoune|tivauane|joal|nioro)\b/.test(t)) s.zone = 'Autres régions';
  if (!s.zone && /\bties\b|\bthies\b|\bcees\b/.test(t)) s.zone = 'Thiès';
  if (!s.zone && /\bdakar\b|\bndakaaru\b|\bndakaru\b/.test(t)) s.zone = 'Dakar';
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
