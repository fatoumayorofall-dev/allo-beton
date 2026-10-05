// Tests unitaires des prix confidentiels (classes de prix) et de la vérification des prix convenus.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priceBandLabel, publicPrice } from '../../server/prices.js';
import { checkStock } from '../../server/catalog.js';

test('classe de prix selon le montant', () => {
  assert.equal(priceBandLabel(5000), 'Moins de 10 000 F');
  assert.equal(priceBandLabel(15000), '10 000 – 20 000 F');
  assert.equal(priceBandLabel(20000), '20 000 – 30 000 F');
  assert.equal(priceBandLabel(25000), '20 000 – 30 000 F');
  assert.equal(priceBandLabel(80000), 'Plus de 50 000 F');
});

test('le public ne voit jamais le prix exact', () => {
  assert.equal(publicPrice({ price: 25000 }), '20 000 – 30 000 F');
});

const store = { getCatalog: () => [{ id: 'MAE-1', name: 'Sac', price: 25000, stock: 3 }] };

test('prix du catalogue accepté', () => {
  assert.equal(
    checkStock({ items: [{ productId: 'MAE-1', name: 'Sac', price: 25000, quantity: 1 }] }, store).error,
    undefined,
  );
});

test('prix inventé refusé', () => {
  assert.match(
    checkStock({ items: [{ productId: 'MAE-1', name: 'Sac', price: 1000, quantity: 1 }] }, store).error,
    /prix/,
  );
});

test('prix convenu par la gérante accepté', () => {
  const agreed = new Map([['MAE-1|38|Noir', 22000]]);
  const order = { items: [{ productId: 'MAE-1', name: 'Sac', price: 22000, size: '38', color: 'Noir', quantity: 1 }] };
  assert.equal(checkStock(order, store, agreed).error, undefined);
});

test('quantité supérieure au stock refusée', () => {
  assert.ok(checkStock({ items: [{ productId: 'MAE-1', name: 'Sac', price: 25000, quantity: 9 }] }, store).error);
});
