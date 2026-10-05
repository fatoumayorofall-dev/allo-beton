// ============================================================
//  TOURNÉE DE LIVRAISON : dans quel ordre passer chez les clientes
//  Départ de la boutique, toutes les adresses une seule fois, sans revenir entre deux
//  livraisons (pas d'allers-retours). On minimise la distance par la route.
//  - jusqu'à 8 adresses : on essaie TOUS les ordres possibles (solution exacte) ;
//  - au-delà : la plus proche d'abord, puis améliorations « 2-opt » (on décroise les
//    trajets) et « déplacement » (on change une adresse de place) tant que ça raccourcit.
// ============================================================

/** Longueur d'un parcours : départ (index 0 de la matrice) puis les arrêts dans l'ordre donné. */
export function pathLength(m, order) {
  let total = 0,
    prev = 0;
  for (const k of order) {
    total += m[prev][k];
    prev = k;
  }
  return total;
}

function permutations(arr) {
  if (arr.length <= 1) return [arr.slice()];
  const out = [];
  arr.forEach((x, i) => {
    for (const p of permutations([...arr.slice(0, i), ...arr.slice(i + 1)])) out.push([x, ...p]);
  });
  return out;
}

function exact(m, stops) {
  let best = null,
    bestLen = Infinity;
  for (const p of permutations(stops)) {
    const len = pathLength(m, p);
    if (len < bestLen) {
      bestLen = len;
      best = p;
    }
  }
  return best;
}

function nearestFirst(m, stops) {
  const left = new Set(stops);
  const order = [];
  let cur = 0;
  while (left.size) {
    let pick = null;
    for (const k of left) if (pick === null || m[cur][k] < m[cur][pick]) pick = k;
    order.push(pick);
    left.delete(pick);
    cur = pick;
  }
  return order;
}

function improve(m, order) {
  let best = order.slice(),
    bestLen = pathLength(m, best),
    better = true,
    guard = 0;
  while (better && guard++ < 200) {
    better = false;
    // 2-opt : inverser un morceau du parcours
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const cand = [...best.slice(0, i), ...best.slice(i, j + 1).reverse(), ...best.slice(j + 1)];
        const len = pathLength(m, cand);
        if (len + 1e-6 < bestLen) {
          best = cand;
          bestLen = len;
          better = true;
        }
      }
    }
    // Déplacement : sortir une adresse et la remettre ailleurs
    for (let i = 0; i < best.length; i++) {
      for (let j = 0; j < best.length; j++) {
        if (i === j) continue;
        const rest = best.filter((_, k) => k !== i);
        const cand = [...rest.slice(0, j), best[i], ...rest.slice(j)];
        const len = pathLength(m, cand);
        if (len + 1e-6 < bestLen) {
          best = cand;
          bestLen = len;
          better = true;
        }
      }
    }
  }
  return best;
}

/**
 * Meilleur ordre de passage. `m` : matrice des distances (index 0 = boutique, 1..n = adresses).
 * Renvoie les index des adresses (1..n) dans l'ordre de livraison.
 */
export function bestOrder(m) {
  const stops = Array.from({ length: m.length - 1 }, (_, k) => k + 1);
  if (stops.length <= 1) return stops;
  if (stops.length <= 8) return exact(m, stops);
  // Plusieurs points de départ (la plus proche d'abord + quelques ordres mélangés), on garde le meilleur
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const starts = [nearestFirst(m, stops)];
  for (let t = 0; t < (stops.length <= 20 ? 12 : 4); t++) starts.push(stops.slice().sort(() => rnd() - 0.5));
  let best = null,
    bestLen = Infinity;
  for (const s of starts) {
    const o = improve(m, s);
    const len = pathLength(m, o);
    if (len < bestLen) {
      bestLen = len;
      best = o;
    }
  }
  return best;
}
