// ============================================================
//  JETONS JWT (RFC 7519), signature HMAC-SHA256 (« HS256 », RFC 7515)
//  Écrit avec node:crypto, sans dépendance : en-tête.charge.signature, chacun en base64url.
//  - seul l'algorithme HS256 est accepté (refus de « none » et de tout autre algorithme)
//  - comparaison de la signature à temps constant
//  - contrôle de l'expiration (exp), de la date d'émission (iat) et de l'émetteur (iss)
// ============================================================
import crypto from 'node:crypto';

const ISSUER = 'maefa-store';
const b64url = buf => Buffer.from(buf).toString('base64url');
const json64 = obj => b64url(JSON.stringify(obj));
const HEADER = json64({ alg: 'HS256', typ: 'JWT' });

const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();

/**
 * Crée un JWT signé. `ttlSeconds` fixe l'expiration ; `claims` s'ajoute aux champs standard.
 * @returns {string} jeton « xxxxx.yyyyy.zzzzz »
 */
export function signJwt(claims, key, ttlSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const payload = json64({ iss: ISSUER, iat: now, exp: now + ttlSeconds, ...claims });
  const body = `${HEADER}.${payload}`;
  return `${body}.${b64url(hmac(key, body))}`;
}

/**
 * Vérifie un JWT et renvoie sa charge, ou null s'il est invalide, falsifié ou expiré.
 */
export function verifyJwt(token, key) {
  if (typeof token !== 'string' || token.length > 2048) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  let header, payload;
  try {
    header = JSON.parse(Buffer.from(h, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (header?.alg !== 'HS256' || header?.typ !== 'JWT') return null;
  const expected = hmac(key, `${h}.${p}`);
  const given = Buffer.from(s, 'base64url');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  const now = Math.floor(Date.now() / 1000);
  if (payload.iss !== ISSUER || typeof payload.exp !== 'number' || payload.exp <= now) return null;
  if (typeof payload.iat === 'number' && payload.iat > now + 60) return null;
  return payload;
}

/** Forme d'un JWT (trois segments base64url), pour reconnaître le type de jeton reçu. */
export const looksLikeJwt = v => /^[\w-]+\.[\w-]+\.[\w-]+$/.test(v || '');
