// Anti-fraude : codes de remise, limites acheteurs et vendeurs, argent gardé par le livreur, registre.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_CODE_TRIES,
  buyerLimit,
  buyerStrikes,
  canonical,
  cashHeld,
  checkHandover,
  createLedger,
  handoverCode,
  newHandover,
  sellerLimit,
} from '../../server/marketplace/fraud.js';

test('code de remise : 4 chiffres, tirés au hasard', () => {
  const codes = new Set(Array.from({ length: 200 }, handoverCode));
  for (const c of codes) assert.match(c, /^\d{4}$/);
  assert.ok(codes.size > 150);
  const h = newHandover();
  assert.equal(h.tries, 0);
});

test('code de remise : bon code, code faux compté, blocage après 5 essais', () => {
  const h = { pickup: '1234', dropoff: '9876', tries: 0 };
  assert.ok(checkHandover(h, 'enlevement', '1234').ok);
  assert.ok(checkHandover(h, 'retour', ' 12 34 ').ok); // espaces tolérés
  assert.ok(checkHandover(h, 'depot', '9876').ok);
  // Le code de l'acheteur ne sert pas à l'enlèvement, et inversement
  assert.equal(checkHandover(h, 'enlevement', '9876').status, 400);
  assert.equal(checkHandover(h, 'depot', '1234').status, 400);
  let cur = h;
  let r;
  for (let i = 0; i < MAX_CODE_TRIES; i++) {
    r = checkHandover(cur, 'depot', '0000');
    cur = r.handover;
  }
  assert.equal(r.status, 423);
  assert.equal(cur.tries, MAX_CODE_TRIES);
  // Bloqué : même le bon code est refusé jusqu'au déblocage par la gérante
  assert.equal(checkHandover(cur, 'depot', '9876').status, 423);
  // Ancienne commande sans code
  assert.ok(checkHandover(undefined, 'depot', '').ok);
});

test('acheteur : bloqué à la 2e livraison ratée, sauf si la gérante pardonne', () => {
  const failed = (id, forgiven) => ({
    id,
    buyerPhone: '+221780000001',
    status: 'annulee',
    failedDelivery: { reason: 'absent', ...(forgiven ? { forgiven: 'x' } : {}) },
  });
  assert.equal(buyerLimit([failed('a')], '+221780000001', 1), null);
  const two = [failed('a'), failed('b')];
  assert.equal(buyerStrikes(two, '+221780000001'), 2);
  assert.match(buyerLimit(two, '+221780000001', 1), /service client/);
  assert.equal(buyerLimit([failed('a', true), failed('b')], '+221780000001', 1), null);
  assert.equal(buyerLimit(two, '+221780000002', 1), null); // un autre acheteur n'est pas concerné
});

test('acheteur : commandes en cours limitées (premier achat 5, ensuite 15)', () => {
  const open = n => Array.from({ length: n }, (_, i) => ({ id: `o${i}`, buyerPhone: 'p', status: 'nouvelle' }));
  assert.equal(buyerLimit(open(4), 'p', 1), null);
  assert.match(buyerLimit(open(4), 'p', 2), /premiers achats/);
  const known = [...open(10), { id: 'd', buyerPhone: 'p', status: 'livree' }];
  assert.equal(buyerLimit(known, 'p', 5), null);
  assert.match(buyerLimit(known, 'p', 6), /déjà 10 commandes/);
});

test('nouvelle boutique : montant limité jusqu’à 3 ventes livrées (ou boutique de confiance)', () => {
  const v = { shopName: 'Awa', trusted: false };
  assert.match(sellerLimit(v, 0, 150000, 100000), /nouvelle boutique/);
  assert.equal(sellerLimit(v, 0, 100000, 100000), null);
  assert.equal(sellerLimit(v, 3, 150000, 100000), null);
  assert.equal(sellerLimit({ ...v, trusted: true }, 0, 150000, 100000), null);
});

test('argent gardé par le livreur : commissions dues + parts des vendeurs non reçues', () => {
  const now = Date.parse('2026-10-21T12:00:00Z');
  const o = (sellerGets, payout) => ({ settlement: { sellerGets }, payout });
  const orders = [
    o(10000), // pas encore envoyée
    o(5000, { sentAt: '2026-10-21T10:00:00Z' }), // envoyée il y a 2 h : compte encore
    o(7000, { sentAt: '2026-10-18T10:00:00Z' }), // envoyée il y a 3 jours, pas de réclamation
    o(3000, { sentAt: '2026-10-18T10:00:00Z', missing: '2026-10-19T10:00:00Z' }), // « pas reçu »
    o(9000, { sentAt: '2026-10-21T10:00:00Z', receivedAt: '2026-10-21T11:00:00Z' }), // confirmée
  ];
  assert.equal(cashHeld(2000, orders, now), 2000 + 10000 + 5000 + 3000);
  assert.equal(cashHeld(-500, [], now), 0); // trop versé : rien à garder
});

test('JSON canonique : même empreinte quel que soit l’ordre des champs', () => {
  assert.equal(canonical({ b: 1, a: [{ d: 2, c: null }] }), canonical({ a: [{ c: null, d: 2 }], b: 1 }));
  assert.equal(canonical({ a: undefined, b: 2 }), '{"b":2}');
});

test('registre : chaîne intacte, puis modification, suppression et insertion détectées', () => {
  const rows = [];
  const store = { listMpLedger: () => rows, appendMpLedger: e => (rows.push(e), e) };
  let t = 0;
  const ledger = createLedger({ store, secret: 'cle-test', now: () => `2026-10-21T00:00:0${t++}Z` });
  ledger.append('livraison', { orderId: 'C-1', platformGets: 1150 });
  ledger.append('versement_livreur', { driverId: 'L-1', amount: 1150 });
  ledger.append('livraison', { orderId: 'C-2', platformGets: 900 });
  assert.deepEqual(
    { ok: ledger.verify().ok, count: ledger.verify().count, brokenAt: ledger.verify().brokenAt },
    { ok: true, count: 3, brokenAt: null },
  );

  // Champs réordonnés (comme après un passage par PostgreSQL) : toujours valide
  rows[0] = JSON.parse(JSON.stringify({ hash: rows[0].hash, data: rows[0].data, ...rows[0] }));
  assert.equal(ledger.verify().ok, true);

  // Montant modifié
  const saved = rows[1];
  rows[1] = { ...saved, data: { ...saved.data, amount: 0 } };
  assert.equal(ledger.verify().brokenAt, 2);
  rows[1] = saved;

  // Ligne supprimée
  const removed = rows.splice(1, 1)[0];
  assert.equal(ledger.verify().brokenAt, 2);
  rows.splice(1, 0, removed);
  assert.equal(ledger.verify().ok, true);

  // Ligne recalculée sans la clé du serveur : refusée
  const forger = createLedger({
    store: { listMpLedger: () => rows.slice(0, 2), appendMpLedger: e => e },
    secret: 'autre',
  });
  rows[2] = forger.append('livraison', { orderId: 'C-2', platformGets: 0 });
  assert.equal(ledger.verify().brokenAt, 3);
});
