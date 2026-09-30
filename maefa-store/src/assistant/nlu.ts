/**
 * Compréhension du langage de Maé, faite maison (gratuite, dans le téléphone, sans service payant).
 * - normalisation qui rapproche les orthographes (jërëjëf / jerejef / dieuredieuf…)
 * - classifieur bayésien naïf entraîné sur des phrases d'exemple (français + wolof)
 * - détection de la langue (wolof ou français)
 */

/**
 * Lexique wolof : graphies courantes (« à la française », SMS) → forme de référence.
 * Les clés et valeurs sont déjà passées par les règles d'écriture de `normalize`.
 */
const LEXICON: Record<string, string> = {
  begue: 'beg', bege: 'beg', bog: 'beg', // bëgg (vouloir)
  xonk: 'xonq', xonx: 'xonq', // xonq (rouge)
  feye: 'fey', fay: 'fey', faye: 'fey', // fey (payer)
  yonne: 'yone', yonnee: 'yone', yonee: 'yone', // yónnee (envoyer / livrer)
  rafete: 'rafet', rafett: 'rafet', // rafet (joli)
  nguir: 'ngir', ngiir: 'ngir', // ngir (pour)
  ngene: 'ngen', nguen: 'ngen', ngeen: 'ngen', // ngeen (vous)
  nyata: 'nata', nyaata: 'nata', naata: 'nata', // ñaata (combien)
  yombe: 'yomb', // yomb (pas cher)
  jefe: 'jafe', jafee: 'jafe', // jafe (cher / difficile)
  sedet: 'dedet', deydet: 'dedet', dedeet: 'dedet', // déedéet (non)
  wao: 'waw', waaw: 'waw', // waaw (oui)
  xamuma: 'xamuma', xamouma: 'xamuma',
  jerejeuf: 'jerejef', jerejefe: 'jerejef', jerejf: 'jerejef', // jërëjëf (merci)
  salamalekum: 'salam alekum', salamaleykum: 'salam alekum', salamalikum: 'salam alekum', aleykum: 'alekum', alaykum: 'alekum',
};

/** Minuscules, sans accents, graphies wolof rapprochées (jërëjëf / jerejef / dieuredieuf…). */
export function normalize(s: string): string {
  const base = s.toLowerCase()
    .replace(/ñ/g, 'n').replace(/ŋ/g, 'ng')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['’`]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    // Graphies « à la française » du wolof : kh → x, gn/ny → ñ, dieu → jë, dia → ja, ou → u, eu → e
    .replace(/kh/g, 'x').replace(/gn/g, 'n').replace(/\bny/g, 'n')
    .replace(/dieu/g, 'je').replace(/\bdia/g, 'ja').replace(/\bdio/g, 'jo')
    .replace(/ou/g, 'u').replace(/eu/g, 'e')
    .replace(/(.)\1+/g, '$1') // lettres doublées : jërr → jer, dafa ↔ daffa
    .replace(/\s+/g, ' ').trim();
  return base.split(' ').map(w => LEXICON[w] ?? w).join(' ');
}

/**
 * Expression « un de ces mots/expressions », écrite en clair et normalisée comme les phrases :
 * une nouvelle règle d'écriture ne peut plus casser une détection.
 */
export function nre(words: string[], { prefix = false, suffix = '' } = {}): RegExp {
  const alts = [...new Set(words.map(w => normalize(w)).filter(Boolean))].map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`\\b(?:${alts.join('|')})${prefix ? '' : '\\b'}${suffix}`);
}

const STOP = new Set(['le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'a', 'au', 'aux', 'en', 'pour', 'je', 'j', 'l', 'd', 'est', 'c', 'ce', 'mon', 'ma', 'mes', 'vous', 'vos', 'votre', 'il', 'elle', 'on', 's', 'qu', 'que', 'y']);

/** Caractéristiques d'une phrase : mots, paires de mots et morceaux de 4 lettres (robustes aux fautes). */
export function features(text: string): string[] {
  const words = normalize(text).split(' ').filter(Boolean);
  const out: string[] = [];
  const kept = words.filter(w => !STOP.has(w));
  for (const w of kept) {
    out.push(`w:${w}`);
    const padded = `_${w}_`;
    if (padded.length > 4) for (let i = 0; i + 4 <= padded.length; i++) out.push(`c:${padded.slice(i, i + 4)}`);
  }
  for (let i = 0; i + 1 < words.length; i++) out.push(`b:${words[i]}_${words[i + 1]}`);
  return out;
}

/** Classifieur bayésien naïf multinomial (lissage de Laplace). */
export class NaiveBayes<L extends string> {
  private counts = new Map<L, Map<string, number>>();
  private totals = new Map<L, number>();
  private docs = new Map<L, number>();
  private vocab = new Set<string>();
  private nDocs = 0;

  train(examples: Record<L, string[]>) {
    for (const label of Object.keys(examples) as L[]) {
      for (const ex of examples[label]) {
        const f = features(ex);
        const c = this.counts.get(label) ?? new Map<string, number>();
        for (const x of f) { c.set(x, (c.get(x) ?? 0) + 1); this.vocab.add(x); }
        this.counts.set(label, c);
        this.totals.set(label, (this.totals.get(label) ?? 0) + f.length);
        this.docs.set(label, (this.docs.get(label) ?? 0) + 1);
        this.nDocs++;
      }
    }
    return this;
  }

  /** Étiquettes classées, avec une probabilité (0 à 1). */
  rank(text: string): { label: L; p: number }[] {
    const f = features(text);
    const V = this.vocab.size;
    const scores = [...this.counts.keys()].map(label => {
      const c = this.counts.get(label)!;
      const total = this.totals.get(label)!;
      let s = Math.log((this.docs.get(label)! + 1) / (this.nDocs + this.counts.size));
      for (const x of f) if (this.vocab.has(x)) s += Math.log(((c.get(x) ?? 0) + 0.5) / (total + 0.5 * V));
      return { label, s };
    });
    const max = Math.max(...scores.map(x => x.s));
    const exp = scores.map(x => ({ label: x.label, e: Math.exp(x.s - max) }));
    const sum = exp.reduce((a, x) => a + x.e, 0);
    return exp.map(x => ({ label: x.label, p: x.e / sum })).sort((a, b) => b.p - a.p);
  }
}

/** Mots qui ne trompent pas : si la phrase en contient assez, elle est en wolof. */
const WOLOF_WORDS = new Set<string>(('nga naa na ngi nanu dama dafa dafay daf lan lu naka nan fan kan kanj ndax ngir ak ci ca bi yi gi mi si wi li ba '
  + 'bega beg bog am amna amul jend jendi jenda fey feyee yonee yone yonnee xol xool gis dem dikk indil indi baax bax rafet neex nex '
  + 'waw deedet jerejef jarajef salam salaam aleekum malekum maangi mangi sama sa seen suma yow man moom nun yeen ndeysan '
  + 'naata nata njeg njegam yomb jafe mbir tey suba demb leegi legi lepp dara benn naar nett nent juroom dall yu bu ngeen').split(' ').map(w => normalize(w)));
const FRENCH_WORDS = new Set<string>('je vous est avez pour des une les quel quelle combien comment bonjour merci livraison payer voudrais cherche avec pas mais'.split(' ').map(w => normalize(w)));

export function detectLang(text: string): 'fr' | 'wo' | null {
  const words = normalize(text).split(' ');
  const wo = words.filter(w => WOLOF_WORDS.has(w)).length;
  const fr = words.filter(w => FRENCH_WORDS.has(w)).length;
  if (wo >= 2 && wo > fr) return 'wo';
  if (fr >= 1 && fr >= wo) return 'fr';
  if (wo >= 1 && fr === 0) return 'wo';
  return null;
}
