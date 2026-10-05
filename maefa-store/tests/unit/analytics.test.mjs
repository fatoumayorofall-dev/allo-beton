// Tests du pipeline de données (nettoyage, agrégation) et du modèle de recommandation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { appendEvents, runPipeline } from '../../server/analytics/pipeline.js';
import { evaluate, recommendFor, trainItemSimilarity } from '../../server/analytics/recommender.js';

test('collecte : seuls les événements valides sont gardés', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'maefa-ev-'));
  assert.equal(
    appendEvents(dir, 'visiteuse-1', [{ t: 'view', p: 'MAE-1' }, { t: 'pirate', p: 'MAE-1' }, { t: 'cart' }]),
    1,
  );
  assert.equal(appendEvents(dir, 'x', [{ t: 'view', p: 'MAE-1' }]), 0); // identifiant invalide
});

test('pipeline : nettoyage (illisible, invalide, doublon, inconnu) et entonnoir', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'maefa-pl-'));
  const day = path.join(dir, 'events');
  fs.mkdirSync(day);
  const at = s => new Date(Date.UTC(2026, 9, 1, 10, 0, s)).toISOString();
  const lines = [
    { v: 'visiteuse-a', t: 'view', p: 'MAE-1', at: at(0) },
    { v: 'visiteuse-a', t: 'view', p: 'MAE-1', at: at(1) }, // doublon (< 2 s)
    { v: 'visiteuse-a', t: 'cart', p: 'MAE-1', at: at(30) },
    { v: 'visiteuse-b', t: 'view', p: 'MAE-2', at: at(40) },
    { v: 'visiteuse-b', t: 'view', p: 'MAE-999', at: at(50) }, // pièce inconnue
    { v: 'visiteuse-b', t: 'zzz', p: 'MAE-2', at: at(60) }, // type invalide
  ].map(e => JSON.stringify(e));
  fs.writeFileSync(path.join(day, '2026-10-01.jsonl'), [...lines, '{pas du json'].join('\n') + '\n');
  const r = await runPipeline(dir, { knownProducts: new Set(['MAE-1', 'MAE-2']) });
  assert.deepEqual(r.volume, { lignes: 7, gardees: 3, illisibles: 1, invalides: 1, doublons: 1, inconnues: 1 });
  assert.equal(r.entonnoir.visiteuses, 2);
  assert.equal(r.entonnoir.ajoutPanier, 1);
  assert.equal(r.entonnoir.tauxPanier, 50);
  assert.deepEqual(r.topProduits[0], { id: 'MAE-1', vues: 1 });
});

/** Visiteuses simulées : deux groupes de goûts (A : pièces 1-4, B : pièces 5-8). */
function tastes(nUsers = 300) {
  let seed = 9;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const profiles = new Map(),
    sequences = new Map();
  for (let u = 0; u < nUsers; u++) {
    const group = u % 2 ? [1, 2, 3, 4] : [5, 6, 7, 8];
    const seq = group.filter(() => rnd() < 0.8).map(i => `MAE-${i}`);
    if (rnd() < 0.2) seq.push(`MAE-${1 + Math.floor(rnd() * 8)}`); // un peu de bruit
    const uniq = [...new Set(seq)];
    profiles.set(`u${u}`, new Map(uniq.map(id => [id, 1])));
    sequences.set(`u${u}`, uniq);
  }
  return { profiles, sequences };
}

test('modèle : les pièces du même groupe de goûts sont les plus proches', () => {
  const { profiles } = tastes();
  const model = trainItemSimilarity(profiles, { k: 3 });
  for (const n of model.similar['MAE-1']) assert.ok(['MAE-2', 'MAE-3', 'MAE-4'].includes(n.id), n.id);
  assert.deepEqual(new Set(recommendFor(model, new Set(['MAE-5', 'MAE-6']), 2)), new Set(['MAE-7', 'MAE-8']));
});

test('évaluation : le modèle bat la référence « plus populaires »', () => {
  const { profiles, sequences } = tastes();
  const e = evaluate(sequences, profiles, { k: 2 });
  assert.ok(e.users > 100);
  assert.ok(e.hitRate > e.baselineHitRate + 0.2, JSON.stringify(e));
});
