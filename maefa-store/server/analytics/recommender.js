// ============================================================
//  RECOMMANDATIONS « LES CLIENTES QUI ONT REGARDÉ CETTE PIÈCE ONT AUSSI AIMÉ… »
//  Filtrage collaboratif article-article (apprentissage non supervisé) :
//  1. chaque visiteuse anonyme = un vecteur d'intérêt par pièce (vue 1, favori 2, panier 3, demande 4) ;
//  2. similarité cosinus entre pièces, calculée sur les co-occurrences ;
//  3. pour une pièce, on propose les K plus proches.
//  Évaluation hors ligne : on cache la dernière pièce de chaque parcours et on mesure si elle figure
//  dans les recommandations faites à partir des autres (taux de réussite @K), comparé à une
//  référence naïve (les pièces les plus populaires).
// ============================================================

export const WEIGHTS = { view: 1, wish: 2, cart: 3, request: 4 };

/**
 * Entraîne le modèle. `profiles` : Map visiteuse → Map pièce → intérêt.
 * @returns {{ similar: Record<string, {id: string, score: number}[]>, popular: string[], items: number, users: number }}
 */
export function trainItemSimilarity(profiles, { k = 8, minCooc = 1 } = {}) {
  const norms = new Map();
  const dot = new Map(); // "a|b" → somme des produits
  const popularity = new Map();
  for (const items of profiles.values()) {
    const list = [...items];
    for (const [id, w] of list) {
      norms.set(id, (norms.get(id) || 0) + w * w);
      popularity.set(id, (popularity.get(id) || 0) + w);
    }
    // Parcours très longs : on limite aux 60 pièces les plus fortes (coût quadratique maîtrisé)
    const top = list.sort((a, b) => b[1] - a[1]).slice(0, 60);
    for (let i = 0; i < top.length; i++)
      for (let j = i + 1; j < top.length; j++) {
        const [a, wa] = top[i],
          [b, wb] = top[j];
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        const cur = dot.get(key) || { v: 0, n: 0 };
        cur.v += wa * wb;
        cur.n += 1;
        dot.set(key, cur);
      }
  }
  const neighbours = new Map();
  for (const [key, { v, n }] of dot) {
    if (n < minCooc) continue;
    const [a, b] = key.split('|');
    const score = v / Math.sqrt(norms.get(a) * norms.get(b));
    (neighbours.get(a) ?? neighbours.set(a, []).get(a)).push({ id: b, score });
    (neighbours.get(b) ?? neighbours.set(b, []).get(b)).push({ id: a, score });
  }
  const similar = {};
  for (const [id, list] of neighbours)
    similar[id] = list
      .sort((x, y) => y.score - x.score)
      .slice(0, k)
      .map(x => ({ id: x.id, score: Math.round(x.score * 1000) / 1000 }));
  const popular = [...popularity].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  return { similar, popular, items: norms.size, users: profiles.size };
}

/** Recommandations pour un ensemble de pièces déjà vues (somme des similarités). */
export function recommendFor(model, seen, k = 4) {
  const scores = new Map();
  for (const id of seen)
    for (const n of model.similar[id] ?? []) if (!seen.has(n.id)) scores.set(n.id, (scores.get(n.id) || 0) + n.score);
  const ranked = [...scores].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  for (const id of model.popular) if (ranked.length < k && !seen.has(id) && !ranked.includes(id)) ranked.push(id);
  return ranked.slice(0, k);
}

/**
 * Évaluation « on cache la dernière pièce » sur les parcours d'au moins 3 pièces.
 * `sequences` : Map visiteuse → liste ordonnée des pièces ; `profiles` : intérêts (voir plus haut).
 */
export function evaluate(sequences, profiles, { k = 4 } = {}) {
  const eligible = [...sequences].filter(([, seq]) => seq.length >= 3);
  if (!eligible.length) return { users: 0, k, hitRate: null, baselineHitRate: null };
  // Modèle entraîné sans la pièce cachée de chaque visiteuse (pas de triche)
  const trainSet = new Map(profiles);
  for (const [user, seq] of eligible) {
    const copy = new Map(profiles.get(user));
    copy.delete(seq[seq.length - 1]);
    trainSet.set(user, copy);
  }
  const model = trainItemSimilarity(trainSet);
  let hits = 0,
    baseHits = 0;
  for (const [, seq] of eligible) {
    const last = seq[seq.length - 1];
    const seen = new Set(seq.slice(0, -1));
    if (recommendFor(model, seen, k).includes(last)) hits++;
    if (
      model.popular
        .filter(id => !seen.has(id))
        .slice(0, k)
        .includes(last)
    )
      baseHits++;
  }
  return {
    users: eligible.length,
    k,
    hitRate: Math.round((hits / eligible.length) * 1000) / 1000,
    baselineHitRate: Math.round((baseHits / eligible.length) * 1000) / 1000,
  };
}
