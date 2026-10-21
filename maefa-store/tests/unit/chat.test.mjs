// Marchandage : prix convenu (valable 48 h, une commande) et montant d'une offre.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEAL_MS, cleanAmount, dealFor } from '../../server/marketplace/chat.js';
import { publicListing } from '../../server/marketplace/routes.js';

const now = Date.parse('2026-10-21T12:00:00Z');
const chat = (deal, extra = {}) => ({ id: 'D-1', listingId: 'A-1', buyerPhone: '+221780000001', deal, ...extra });

test('prix convenu : valable 48 h, pour cet acheteur et cet article seulement', () => {
  const deal = { amount: 21000, qty: 1, until: new Date(now + DEAL_MS).toISOString() };
  assert.equal(dealFor([chat(deal)], 'A-1', '+221780000001', now).amount, 21000);
  assert.equal(dealFor([chat(deal)], 'A-1', '+221780000002', now), null); // autre acheteur
  assert.equal(dealFor([chat(deal)], 'A-2', '+221780000001', now), null); // autre article
  assert.equal(dealFor([chat(deal)], 'A-1', '+221780000001', now + DEAL_MS + 1), null); // expiré
  assert.equal(dealFor([chat({ ...deal, orderId: 'C-1' })], 'A-1', '+221780000001', now), null); // déjà utilisé
  assert.equal(dealFor([chat(null)], 'A-1', '+221780000001', now), null);
});

test('offre : montant entier entre 100 F et 50 millions', () => {
  assert.equal(cleanAmount('18000'), 18000);
  assert.equal(cleanAmount(18000.4), 18000);
  assert.equal(cleanAmount(50), null);
  assert.equal(cleanAmount('abc'), null);
  assert.equal(cleanAmount(60_000_000), null);
});

test('prix « à négocier » : jamais le prix exact dans la vue publique, une classe de prix', () => {
  const l = { id: 'A-1', title: 'Sac', price: 25000, priceMode: 'negocier', photos: [], stats: {} };
  const v = publicListing(l, null);
  assert.equal(v.price, null);
  assert.equal(v.negotiable, true);
  assert.equal(v.priceBand, '20 000 – 30 000 F');
  assert.ok(!JSON.stringify(v).includes('25000'));
  const shown = publicListing({ ...l, priceMode: 'affiche' }, null);
  assert.equal(shown.price, 25000);
  assert.equal(shown.priceBand, null);
});
