// Tests unitaires des jetons JWT (RFC 7519, HS256).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { looksLikeJwt, signJwt, verifyJwt } from '../../server/jwt.js';

const key = crypto.randomBytes(32);

test('un jeton signé est relu avec ses informations', () => {
  const t = signJwt({ sub: '+221771234567', role: 'admin' }, key, 60);
  assert.ok(looksLikeJwt(t));
  const p = verifyJwt(t, key);
  assert.equal(p.sub, '+221771234567');
  assert.equal(p.role, 'admin');
  assert.equal(p.iss, 'maefa-store');
  assert.equal(p.exp - p.iat, 60);
});

test("l'en-tête annonce HS256 et JWT", () => {
  const [h] = signJwt({}, key, 60).split('.');
  assert.deepEqual(JSON.parse(Buffer.from(h, 'base64url')), { alg: 'HS256', typ: 'JWT' });
});

test('une charge modifiée est refusée (signature invalide)', () => {
  const [h, , s] = signJwt({ role: 'cliente' }, key, 60).split('.');
  const forged = Buffer.from(JSON.stringify({ iss: 'maefa-store', exp: 9e9, role: 'admin' })).toString('base64url');
  assert.equal(verifyJwt(`${h}.${forged}.${s}`, key), null);
});

test('une autre clé est refusée', () => {
  assert.equal(verifyJwt(signJwt({}, key, 60), crypto.randomBytes(32)), null);
});

test('un jeton expiré est refusé', () => {
  assert.equal(verifyJwt(signJwt({}, key, -1), key), null);
});

test("l'algorithme « none » est refusé", () => {
  const h = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const p = Buffer.from(JSON.stringify({ iss: 'maefa-store', exp: 9e9 })).toString('base64url');
  assert.equal(verifyJwt(`${h}.${p}.`, key), null);
});

test('les formats invalides sont refusés sans erreur', () => {
  for (const v of ['', 'abc', 'a.b', 'a.b.c.d', null, undefined, 'x'.repeat(5000)])
    assert.equal(verifyJwt(v, key), null);
});
