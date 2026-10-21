// Place de marché : prix de la livraison, commissions et réglages de la gérante.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MP_SETTINGS,
  commissions,
  deliveryFee,
  inSenegal,
  patchSettings,
  resolveSettings,
  roadKm,
} from '../../server/marketplace/pricing.js';

const MEDINA = { lat: 14.686, lng: -17.452 };
const PARCELLES = { lat: 14.765, lng: -17.44 };
const THIES = { lat: 14.79, lng: -16.93 };

test('distance par la route : vol d’oiseau + 30 %', () => {
  assert.equal(roadKm(MEDINA, MEDINA), 0);
  const km = roadKm(MEDINA, PARCELLES);
  assert.ok(km > 10 && km < 13, `${km} km`);
});

test('livraison : prise en charge + kilomètres, arrondie, avec minimum et maximum', () => {
  assert.deepEqual(deliveryFee(MEDINA, MEDINA), { km: 0, fee: 1000 }); // minimum
  const { fee } = deliveryFee(MEDINA, PARCELLES);
  assert.equal(fee % 100, 0);
  assert.equal(fee, 3300);
  const far = deliveryFee(MEDINA, THIES, { delivery: { max: 8000 } });
  assert.equal(far.fee, 8000); // plafonnée
});

test('commissions : 7 % vendeur, 150 F acheteur, 10 % de la course', () => {
  assert.deepEqual(commissions({ subtotal: 24000, deliveryFee: 3300 }), {
    seller: 1680,
    buyer: 150,
    driver: 330,
    total: 2160,
  });
  assert.equal(commissions({ subtotal: 10000 }, { sellerRate: 0.05, buyerFee: 0 }).total, 500);
});

test('réglages : valeurs par défaut et contrôle des bornes', () => {
  assert.equal(resolveSettings(null).sellerRate, DEFAULT_MP_SETTINGS.sellerRate);
  assert.equal(resolveSettings({ delivery: { perKm: 300 } }).delivery.base, 1000);
  assert.equal(patchSettings(null, { sellerRate: 0.05 }).settings.sellerRate, 0.05);
  assert.ok(patchSettings(null, { sellerRate: 0.9 }).error);
  assert.ok(patchSettings(null, { delivery: { min: 9000, max: 2000 } }).error);
  assert.ok(patchSettings(null, { buyerFee: 'abc' }).error);
});

test('point de livraison : au Sénégal seulement', () => {
  assert.ok(inSenegal(MEDINA));
  assert.ok(!inSenegal({ lat: 48.85, lng: 2.35 }));
  assert.ok(!inSenegal({ lat: 'x', lng: 1 }));
  assert.ok(!inSenegal(null));
});

test('anti-contournement : numéros, liens, e-mails et réseaux refusés ; prix et tailles acceptés', async () => {
  const { findContact } = await import('../../server/marketplace/contact.js');
  for (const t of [
    'Appelez le 77 123 45 67',
    '+221 76.555.44.33',
    '781234567',
    'sept sept un deux trois quatre cinq six sept',
    'Écrivez sur WhatsApp',
    'mon insta @awa',
    'voir www.awa.sn',
    'awa@gmail.com',
  ])
    assert.ok(findContact(t), t);
  for (const t of ['Robe taille 38 39 40 41 42', 'Dimensions 33 x 25 cm, 12 000 F', 'Prix 70 000 F, livraison 2 500 F'])
    assert.equal(findContact(t), null, t);
});

test('méthode A : le livreur encaisse et chacun reçoit sa part, sans un franc de trop ni de moins', async () => {
  const { settlement } = await import('../../server/marketplace/pricing.js');
  // Robe à 12 000 F, livraison partagée 2 300 F, frais 150 F, commission vendeur 7 % (840 F)
  const s = settlement({ subtotal: 12000, share: 2300, buyerFee: 150, sellerCommission: 840 });
  assert.equal(s.collect, 14450);
  assert.equal(s.sellerGets, 11160);
  assert.equal(s.driverCommission, 230);
  assert.equal(s.driverKeeps, 2070);
  assert.equal(s.platformGets, 1220);
  assert.equal(s.sellerGets + s.driverKeeps + s.platformGets, s.collect);
});

test('formules : Pro tant que l’abonnement court, commission réduite', async () => {
  const { sellerPlan, sellerRateFor } = await import('../../server/marketplace/pricing.js');
  const now = Date.parse('2026-10-21T00:00:00Z');
  const pro = { plan: { id: 'pro', until: '2026-11-21T00:00:00Z' } };
  const expired = { plan: { id: 'pro', until: '2026-10-01T00:00:00Z' } };
  assert.equal(sellerPlan(pro, now), 'pro');
  assert.equal(sellerPlan(expired, now), 'decouverte');
  assert.equal(sellerPlan({}, now), 'decouverte');
  assert.equal(sellerRateFor(pro, null, now), 0.03);
  assert.equal(sellerRateFor(expired, null, now), 0.07);
});
