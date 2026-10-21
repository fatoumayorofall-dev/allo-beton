// Ventes en direct : le « prix live » est une vraie remise (jamais plus cher que l'article).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIVE_PRICE_GRACE_MS, cleanLivePrice } from '../../server/marketplace/live.js';

test('prix live : facultatif, entre 100 F et le prix de l’article', () => {
  assert.equal(cleanLivePrice(null, 20000), null);
  assert.equal(cleanLivePrice('', 20000), null);
  assert.equal(cleanLivePrice(15000, 20000), 15000);
  assert.equal(cleanLivePrice('14999.6', 20000), 15000);
  assert.equal(cleanLivePrice(20000, 20000), 20000);
  assert.equal(cleanLivePrice(25000, 20000), undefined, 'plus cher que l’article : refusé');
  assert.equal(cleanLivePrice(50, 20000), undefined);
  assert.equal(cleanLivePrice('abc', 20000), undefined);
});

test('prix live encore valable 15 minutes après la fin du live', () => {
  assert.equal(LIVE_PRICE_GRACE_MS, 15 * 60e3);
});
