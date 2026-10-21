// Tableau de bord de la vendeuse : chiffre d'affaires, comparaison, courbe, articles, canaux, clientes fidèles.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sellerDashboard } from '../../server/marketplace/dashboard.js';

const now = Date.parse('2026-10-21T12:00:00Z');
const daysAgo = n => new Date(now - n * 864e5).toISOString();
const order = (id, status, ago, lines, extra = {}) => ({
  id,
  sellerId: 'V-1',
  buyerPhone: extra.buyer ?? '+221780000001',
  status,
  createdAt: daysAgo(ago + 1),
  history: [
    { status: 'nouvelle', at: daysAgo(ago + 1) },
    ...(status === 'livree' ? [{ status: 'livree', at: daysAgo(ago) }] : []),
  ],
  lines,
  subtotal: lines.reduce((t, l) => t + l.price * l.qty, 0),
  commissions: { seller: Math.round(lines.reduce((t, l) => t + l.price * l.qty, 0) * 0.07) },
  payment: extra.payment ?? 'especes',
  delivery: { mode: extra.mode ?? 'vendeur' },
});
const robe = (qty, price = 10000, extra = {}) => ({
  listingId: 'A-1',
  title: 'Robe',
  photo: '/p.jpg',
  qty,
  price,
  ...extra,
});
const sac = (qty, price = 20000, extra = {}) => ({
  listingId: 'A-2',
  title: 'Sac',
  photo: '/s.jpg',
  qty,
  price,
  ...extra,
});

const orders = [
  order('C-1', 'livree', 2, [robe(1)]),
  order('C-2', 'livree', 3, [sac(1, 15000, { liveId: 'L-1' })], { payment: 'wave', mode: 'express' }),
  order('C-3', 'livree', 5, [robe(2, 9000, { agreed: true })], { buyer: '+221780000002' }),
  order('C-4', 'annulee', 4, [robe(1)]),
  order('C-5', 'nouvelle', 0, [sac(1)], { buyer: '+221780000002' }),
  order('C-6', 'livree', 10, [robe(1)]), // période d'avant (7 jours)
  { ...order('C-7', 'livree', 1, [robe(5)]), sellerId: 'V-2' }, // autre boutique
];
const listings = [
  {
    id: 'A-1',
    sellerId: 'V-1',
    status: 'publiee',
    title: 'Robe',
    photos: ['/p.jpg'],
    viewDays: { '2026-10-20': 30, '2026-10-01': 99 },
  },
  { id: 'A-2', sellerId: 'V-1', status: 'publiee', title: 'Sac', photos: ['/s.jpg'], viewDays: { '2026-10-19': 10 } },
  { id: 'A-3', sellerId: 'V-1', status: 'publiee', title: 'Pagne', photos: ['/g.jpg'], viewDays: { '2026-10-18': 8 } },
];
const seller = { id: 'V-1', followers: [{ phone: 'x' }, { phone: 'y' }] };
const d = sellerDashboard({ seller, orders, listings, days: 7, now });

test('chiffre d’affaires des commandes livrées dans la période, commission, net', () => {
  assert.equal(d.revenue, 10000 + 15000 + 18000);
  assert.equal(d.commission, 700 + 1050 + 1260);
  assert.equal(d.net, d.revenue - d.commission);
  assert.equal(d.avgBasket, Math.round(43000 / 3));
});

test('comparaison avec la période d’avant', () => {
  assert.equal(d.prevRevenue, 10000);
  assert.equal(d.change, 330);
});

test('commandes par étape et taux de réussite', () => {
  assert.deepEqual(d.orders, { created: 5, delivered: 3, inProgress: 1, cancelled: 1, failed: 0 });
  assert.equal(d.successRate, 75);
});

test('courbe : un point par jour, ventes au jour de la livraison', () => {
  assert.equal(d.series.length, 7);
  assert.equal(d.series.at(-3).revenue, 10000);
  assert.equal(
    d.series.reduce((t, b) => t + b.revenue, 0),
    d.revenue,
  );
});

test('articles les plus vendus, visites, articles à revoir', () => {
  assert.deepEqual(
    d.top.map(a => [a.title, a.qty, a.amount, a.views]),
    [
      ['Robe', 3, 28000, 30],
      ['Sac', 1, 15000, 10],
    ],
  );
  assert.equal(d.views, 48);
  assert.deepEqual(
    d.toImprove.map(a => a.title),
    ['Pagne'],
  );
});

test('canaux (live, négocié, affiché), paiements, livraisons', () => {
  assert.deepEqual(d.channels, { live: 15000, negocie: 18000, affiche: 10000 });
  assert.deepEqual(d.payments, { especes: 2, wave: 1 });
  assert.deepEqual(d.deliveryModes, { vendeur: 2, express: 1 });
});

test('clientes et fidèles, sans aucun numéro dans le résultat', () => {
  assert.equal(d.buyers, 2);
  assert.equal(d.loyal, 1);
  assert.equal(d.followers, 2);
  assert.ok(!JSON.stringify(d).includes('+221'));
});

test('12 mois : un point par mois', () => {
  const y = sellerDashboard({ seller, orders, listings, days: 365, now });
  assert.equal(y.series.length, 12);
  assert.equal(y.series.at(-1).key, '2026-10');
  assert.equal(y.monthly, true);
});
