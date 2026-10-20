// Livraison moitié-moitié : trajet optimal, partage du prix, « personne n'y perd ».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bestGroup, bestRoute, canJoin, groupPrice, pathKm } from '../../server/marketplace/sharing.js';
import { deliveryFee } from '../../server/marketplace/pricing.js';

const MEDINA = { lat: 14.686, lng: -17.452 };
const SANDAGA = { lat: 14.672, lng: -17.437 };
const PARCELLES = { lat: 14.765, lng: -17.44 };
const GRAND_YOFF = { lat: 14.737, lng: -17.46 };
const GUEDIAWAYE = { lat: 14.776, lng: -17.395 };
const NGOR = { lat: 14.745, lng: -17.508 };
const RUFISQUE = { lat: 14.72, lng: -17.275 };
const THIES = { lat: 14.79, lng: -16.93 };

const A = { id: 'A', from: MEDINA, to: PARCELLES };
const B = { id: 'B', from: SANDAGA, to: GRAND_YOFF };
const C = { id: 'C', from: MEDINA, to: GUEDIAWAYE };

test('trajet : chaque colis est enlevé avant d’être déposé, ordre le plus court', () => {
  const r = bestRoute([A, B]);
  for (const id of ['A', 'B']) {
    const pick = r.stops.findIndex(s => s.orderId === id && s.kind === 'enlevement');
    const drop = r.stops.findIndex(s => s.orderId === id && s.kind === 'depot');
    assert.ok(pick < drop);
  }
  assert.equal(r.stops.length, 4);
  assert.equal(r.km, pathKm(r.stops.map(s => s.at)));
  // Plus court que les deux courses séparées mises bout à bout
  assert.ok(r.km < pathKm([MEDINA, PARCELLES]) + pathKm([SANDAGA, GRAND_YOFF]));
});

test('à deux dans la même direction : chacun paie moins, le livreur gagne plus', () => {
  const p = groupPrice([A, B]);
  const soloA = deliveryFee(MEDINA, PARCELLES).fee;
  const soloB = deliveryFee(SANDAGA, GRAND_YOFF).fee;
  assert.equal(p.shares.A.solo, soloA);
  assert.ok(p.shares.A.share < soloA && p.shares.B.share < soloB, JSON.stringify(p.shares));
  assert.ok(p.driverGets > Math.max(soloA, soloB), `${p.driverGets}`);
  assert.equal(p.shares.A.share % 50, 0);
});

test('rejoindre : accepté seulement si personne ne paie plus', () => {
  const r = canJoin([A], B);
  assert.ok(r.ok, r.reason);
  const three = canJoin([A, B], C);
  if (three.ok) {
    const before = groupPrice([A, B]);
    for (const id of ['A', 'B']) assert.ok(three.price.shares[id].share <= before.shares[id].share);
  }
});

test('refusé : direction opposée, vendeur trop loin, groupe complet', () => {
  assert.equal(canJoin([{ id: 'E', from: MEDINA, to: RUFISQUE }], { id: 'W', from: MEDINA, to: NGOR }).ok, false);
  assert.equal(canJoin([A], { id: 'T', from: THIES, to: PARCELLES }).reason, 'vendeurs trop éloignés');
  const four = ['1', '2', '3', '4'].map(id => ({ id, from: MEDINA, to: PARCELLES }));
  assert.equal(canJoin(four, { id: '5', from: MEDINA, to: PARCELLES }).reason, 'complet');
});

test('choix du groupe : celui où le nouveau venu paie le moins', () => {
  const groups = [
    { id: 'g-ouest', orders: [{ id: 'N', from: MEDINA, to: NGOR }] },
    { id: 'g-nord', orders: [A] },
  ];
  const best = bestGroup(groups, B);
  assert.ok(best);
  assert.equal(best.group.id, 'g-nord');
});
