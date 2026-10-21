// Fil « Pour vous » : tendance, goûts, découverte, diversité, proximité.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bump, cleanTaste, heat, rankFeed } from '../../server/marketplace/ranking.js';

const NOW = Date.parse('2026-10-21T12:00:00Z');
const H = 3.6e6;
const DAKAR = { lat: 14.69, lng: -17.45 };
const FAR = { lat: 14.79, lng: -16.93 }; // Thiès
const item = (id, category, sellerId, extra = {}) => ({
  id,
  category,
  sellerId,
  price: 10000,
  createdAt: new Date(NOW - 10 * 864e5).toISOString(),
  stats: null,
  sellerLocation: DAKAR,
  sellerQuality: 0.5,
  ...extra,
});

test('tendance : chaque geste compte, et s’efface de moitié en 3 jours', () => {
  let s = bump(null, 'view', NOW);
  s = bump(s, 'like', NOW);
  s = bump(s, 'cart', NOW);
  assert.equal(s.hot, 8);
  assert.deepEqual([s.views, s.likes, s.carts], [1, 1, 1]);
  assert.equal(Math.round(heat(s, NOW + 72 * H) * 100) / 100, 4);
  assert.equal(bump(s, 'unlike', NOW).likes, 0);
});

test('nouveau client : les articles tendance passent devant', () => {
  const items = [
    item('calme', 'mode', 'V-AAAAAA'),
    item('star', 'mode', 'V-BBBBBB', { stats: { hot: 40, at: new Date(NOW).toISOString() } }),
  ];
  const r = rankFeed(items, { now: NOW });
  assert.equal(r[0].id, 'star');
  assert.equal(r[0].why, 'Tendance');
});

test('goûts : quelqu’un qui regarde des téléphones voit d’abord des téléphones, avec de la découverte', () => {
  const items = [];
  for (let i = 0; i < 6; i++) items.push(item(`tel${i}`, 'electronique', `V-T0000${i}`));
  for (let i = 0; i < 6; i++) items.push(item(`robe${i}`, 'mode', `V-R0000${i}`));
  const r = rankFeed(items, { now: NOW, taste: { cats: { electronique: 10 }, sellers: {}, price: null }, seed: 'x' });
  assert.ok(
    r.slice(0, 5).every(x => x.id.startsWith('tel')),
    r.map(x => x.id).join(','),
  );
  assert.ok(r[5].id.startsWith('robe'));
  assert.equal(r[5].why, 'À découvrir');
  assert.equal(r[0].why, 'Pour vous');
});

test('diversité : pas deux fois de suite le même vendeur quand on peut faire autrement', () => {
  const items = [
    item('a1', 'mode', 'V-AAAAAA', { stats: { hot: 30, at: new Date(NOW).toISOString() } }),
    item('a2', 'mode', 'V-AAAAAA', { stats: { hot: 29, at: new Date(NOW).toISOString() } }),
    item('b1', 'mode', 'V-BBBBBB', { stats: { hot: 20, at: new Date(NOW).toISOString() } }),
  ];
  const r = rankFeed(items, { now: NOW }).map(x => x.id);
  assert.deepEqual(r, ['a1', 'b1', 'a2']);
});

test('proximité : à égalité, le vendeur proche d’abord (livraison moins chère)', () => {
  const items = [item('loin', 'mode', 'V-AAAAAA', { sellerLocation: FAR }), item('proche', 'mode', 'V-BBBBBB')];
  const r = rankFeed(items, { now: NOW, near: DAKAR });
  assert.equal(r[0].id, 'proche');
  assert.equal(r[0].why, 'Près de chez vous');
});

test('déjà vu : repoussé plus loin', () => {
  const items = [item('vu', 'mode', 'V-AAAAAA'), item('neuf', 'mode', 'V-BBBBBB')];
  assert.equal(rankFeed(items, { now: NOW, seen: new Set(['vu']) })[0].id, 'neuf');
});

test('goûts envoyés par le téléphone : nettoyés', () => {
  const t = cleanTaste(
    { cats: { mode: 500, pirate: 3 }, sellers: { 'V-ABC123': 2, '<script>': 9 }, price: { mean: 'x', n: 3 } },
    new Set(['mode']),
  );
  assert.deepEqual(t, { cats: { mode: 100 }, sellers: { 'V-ABC123': 2 }, price: null });
});
