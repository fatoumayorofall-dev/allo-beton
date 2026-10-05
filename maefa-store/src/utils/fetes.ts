import type { OccasionId } from '../data/types';

/**
 * Calendrier des grandes fêtes au Sénégal. Les fêtes musulmanes sont calculées avec le calendrier
 * hégirien du navigateur (Umm al-Qura) : la date réelle, fixée à l'observation de la lune,
 * peut arriver un jour plus tard au Sénégal — d'où le « vers le » affiché.
 */
export interface Fete {
  id: string;
  name: string;
  /** Ce qu'on prépare pour cette fête (affiché sous le nom) */
  hint: string;
  date: Date;
  /** Date estimée (lune) : on affiche « vers le » */
  lunar: boolean;
  occasion: OccasionId;
}

/** Fêtes du calendrier hégirien : [mois, jour] */
const LUNAR: { id: string; name: string; hint: string; m: number; d: number; occasion: OccasionId }[] = [
  {
    id: 'korite',
    name: 'Korité',
    hint: 'Escarpins et sacs pour la fin du ramadan',
    m: 10,
    d: 1,
    occasion: 'ceremonie',
  },
  {
    id: 'tabaski',
    name: 'Tabaski',
    hint: 'La grande fête : chaussures et pochettes assorties',
    m: 12,
    d: 10,
    occasion: 'ceremonie',
  },
  {
    id: 'magal',
    name: 'Magal de Touba',
    hint: 'Élégance sobre pour le grand pèlerinage',
    m: 2,
    d: 18,
    occasion: 'ceremonie',
  },
  { id: 'gamou', name: 'Gamou', hint: 'Tenues de cérémonie pour le Maouloud', m: 3, d: 12, occasion: 'ceremonie' },
];

/** Fêtes à date fixe : [mois (1–12), jour] */
const FIXED: { id: string; name: string; hint: string; m: number; d: number; occasion: OccasionId }[] = [
  {
    id: 'saint-valentin',
    name: 'Saint-Valentin',
    hint: "Le sac qu'on offre, la sandale qu'on porte",
    m: 2,
    d: 14,
    occasion: 'soiree',
  },
  {
    id: 'independance',
    name: "Fête de l'Indépendance",
    hint: 'Le 4 avril, en vert, jaune et rouge',
    m: 4,
    d: 4,
    occasion: 'quotidien',
  },
  { id: 'noel', name: 'Noël', hint: 'Idées cadeaux, écrin offert', m: 12, d: 25, occasion: 'soiree' },
  { id: 'reveillon', name: 'Réveillon', hint: 'Talons et paillettes pour le 31', m: 12, d: 31, occasion: 'soiree' },
];

const DAY = 86400000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

let hijri: Intl.DateTimeFormat | null | undefined;
function hijriParts(d: Date): { m: number; d: number } | null {
  if (hijri === undefined) {
    try {
      hijri = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'numeric',
        timeZone: 'Africa/Dakar',
      });
    } catch {
      hijri = null;
    }
  }
  if (!hijri) return null;
  const parts = hijri.formatToParts(d);
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
  return { m: get('month'), d: get('day') };
}

/** Prochaines fêtes à partir d'aujourd'hui (incluse), triées par date. */
export function upcomingFetes(now = new Date(), horizonDays = 400): Fete[] {
  const today = startOfDay(now);
  const out: Fete[] = [];
  const seen = new Set<string>();
  for (let i = 0; i <= horizonDays; i++) {
    const day = new Date(today.getTime() + i * DAY + 12 * 3600000); // midi : évite les décalages d'heure
    const h = hijriParts(day);
    for (const f of LUNAR)
      if (h && h.m === f.m && h.d === f.d && !seen.has(f.id)) {
        seen.add(f.id);
        out.push({ id: f.id, name: f.name, hint: f.hint, date: startOfDay(day), lunar: true, occasion: f.occasion });
      }
    for (const f of FIXED)
      if (day.getMonth() + 1 === f.m && day.getDate() === f.d && !seen.has(f.id)) {
        seen.add(f.id);
        out.push({ id: f.id, name: f.name, hint: f.hint, date: startOfDay(day), lunar: false, occasion: f.occasion });
      }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export const daysUntil = (d: Date, now = new Date()) =>
  Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / DAY);

/** Dernier jour pour commander et être livrée à temps (Dakar : 3 jours avant, régions : 6 jours). */
export const orderBy = (d: Date, region = false) => new Date(d.getTime() - (region ? 6 : 3) * DAY);

export const formatDay = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

/** « dans 12 jours », « demain », « aujourd'hui » */
export function inDays(n: number): string {
  if (n <= 0) return "aujourd'hui";
  if (n === 1) return 'demain';
  return `dans ${n} jours`;
}
