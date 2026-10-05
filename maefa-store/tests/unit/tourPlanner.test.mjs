// Tests unitaires de l'optimisation des tournées (problème du voyageur de commerce).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bestOrder, pathLength } from '../../server/tourPlanner.js';

/** Matrice des distances euclidiennes entre des points (index 0 = boutique). */
const matrix = pts => pts.map(a => pts.map(b => Math.hypot(a[0] - b[0], a[1] - b[1])));

/** Toutes les permutations, pour comparer à la solution exacte. */
function bruteForce(m) {
  const stops = Array.from({ length: m.length - 1 }, (_, k) => k + 1);
  let best = Infinity;
  const go = (rest, order) => {
    if (!rest.length) return void (best = Math.min(best, pathLength(m, order)));
    rest.forEach((x, i) => go([...rest.slice(0, i), ...rest.slice(i + 1)], [...order, x]));
  };
  go(stops, []);
  return best;
}

test('chaque adresse est visitée une seule fois', () => {
  const m = matrix([
    [0, 0],
    [5, 1],
    [2, 8],
    [9, 9],
    [1, 3],
    [7, 2],
  ]);
  const o = bestOrder(m);
  assert.deepEqual(
    [...o].sort((a, b) => a - b),
    [1, 2, 3, 4, 5],
  );
});

test('points alignés : on les dessert dans l’ordre, sans aller-retour', () => {
  const m = matrix([
    [0, 0],
    [3, 0],
    [1, 0],
    [4, 0],
    [2, 0],
  ]);
  assert.deepEqual(bestOrder(m), [2, 4, 1, 3]);
  assert.equal(pathLength(m, bestOrder(m)), 4);
});

test('jusqu’à 8 adresses : solution exacte (égale à la recherche exhaustive)', () => {
  let seed = 3;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let t = 0; t < 5; t++) {
    const m = matrix(Array.from({ length: 8 }, () => [rnd() * 10, rnd() * 10]));
    assert.ok(Math.abs(pathLength(m, bestOrder(m)) - bruteForce(m)) < 1e-9);
  }
});

test('30 adresses : bien meilleur qu’un ordre au hasard, en peu de temps', () => {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const m = matrix(Array.from({ length: 31 }, () => [rnd() * 20, rnd() * 20]));
  const t0 = Date.now();
  const o = bestOrder(m);
  assert.ok(Date.now() - t0 < 3000);
  const naive = pathLength(
    m,
    Array.from({ length: 30 }, (_, k) => k + 1),
  );
  assert.ok(pathLength(m, o) < naive * 0.6);
});

test('0 ou 1 adresse', () => {
  assert.deepEqual(bestOrder(matrix([[0, 0]])), []);
  assert.deepEqual(
    bestOrder(
      matrix([
        [0, 0],
        [1, 1],
      ]),
    ),
    [1],
  );
});
