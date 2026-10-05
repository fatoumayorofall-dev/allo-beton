// ============================================================
//  CACHE À DEUX NIVEAUX
//  1. mémoire du processus (instantané, et une seule requête à la fois pour une même clé) ;
//  2. Redis si REDIS_URL est défini : partagé entre le serveur et le microservice, et conservé
//     au redémarrage. Si Redis ne répond pas, on continue avec la mémoire seule.
//  Utilisé pour les résultats coûteux : recherche d'adresse, itinéraires, lieux connus, recommandations.
// ============================================================
const memory = new Map();
const MAX_ENTRIES = 2000;
const stats = { hits: 0, redisHits: 0, misses: 0, errors: 0 };

let redis = null;
let redisReady = false;
if (process.env.REDIS_URL) {
  try {
    const { createClient } = await import('redis');
    redis = createClient({ url: process.env.REDIS_URL, socket: { reconnectStrategy: n => Math.min(n * 500, 5000) } });
    redis.on('ready', () => (redisReady = true));
    redis.on('end', () => (redisReady = false));
    redis.on('error', () => {
      redisReady = false;
      stats.errors++;
    });
    await redis.connect().catch(() => {});
  } catch {
    redis = null;
  }
}

export const cacheBackend = () =>
  redis ? (redisReady ? 'mémoire + Redis' : 'mémoire (Redis injoignable)') : 'mémoire';
export const cacheStats = () => ({ backend: cacheBackend(), entries: memory.size, ...stats });

function remember(key, ms, value) {
  memory.set(key, { until: Date.now() + ms, value });
  if (memory.size > MAX_ENTRIES) memory.delete(memory.keys().next().value);
}

/**
 * Valeur en cache pour `key`, sinon `fn()` (promesse) dont le résultat est gardé `ms` millisecondes.
 * En cas d'échec de `fn`, rien n'est gardé.
 */
export function cached(key, ms, fn) {
  const hit = memory.get(key);
  if (hit && hit.until > Date.now()) {
    stats.hits++;
    return hit.value;
  }
  const value = (async () => {
    if (redisReady) {
      try {
        const raw = await redis.get(`maefa:${key}`);
        if (raw !== null) {
          stats.redisHits++;
          return JSON.parse(raw);
        }
      } catch {
        stats.errors++;
      }
    }
    stats.misses++;
    const fresh = await fn();
    if (redisReady && fresh !== undefined) {
      redis.set(`maefa:${key}`, JSON.stringify(fresh), { PX: ms }).catch(() => stats.errors++);
    }
    return fresh;
  })().catch(err => {
    memory.delete(key);
    throw err;
  });
  remember(key, ms, value);
  return value;
}

/** Oublie une clé (ex. : modèle de recommandation recalculé). */
export async function forget(prefix) {
  for (const k of memory.keys()) if (k.startsWith(prefix)) memory.delete(k);
  if (redisReady) {
    try {
      for await (const keys of redis.scanIterator({ MATCH: `maefa:${prefix}*`, COUNT: 200 }))
        if (keys.length) await redis.del(keys);
    } catch {
      stats.errors++;
    }
  }
}

/** Vide la mémoire du processus seulement (tests, ou après un redéploiement). */
export const clearMemory = () => memory.clear();

export async function closeCache() {
  if (redis) await redis.quit().catch(() => {});
}
