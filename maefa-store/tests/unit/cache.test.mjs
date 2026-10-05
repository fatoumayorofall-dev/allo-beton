// Tests du cache à deux niveaux (mémoire + Redis). La partie Redis tourne si TEST_REDIS_URL est défini.
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.REDIS_URL = process.env.TEST_REDIS_URL || '';
const { cached, cacheStats, clearMemory, closeCache, forget } = await import('../../server/cache.js');

test('une même clé ne recalcule pas (et une seule requête à la fois)', async () => {
  let calls = 0;
  const slow = () => new Promise(r => setTimeout(() => r(++calls), 30));
  const [a, b] = await Promise.all([cached('t:x', 1000, slow), cached('t:x', 1000, slow)]);
  assert.equal(a, 1);
  assert.equal(b, 1);
  assert.equal(await cached('t:x', 1000, slow), 1);
  assert.equal(calls, 1);
});

test('un échec n’est pas gardé en cache', async () => {
  await assert.rejects(cached('t:err', 1000, () => Promise.reject(new Error('panne'))));
  assert.equal(await cached('t:err', 1000, async () => 'ok'), 'ok');
});

test(
  'Redis : la valeur revient de Redis quand la mémoire du processus est vide (cache partagé)',
  { skip: !process.env.TEST_REDIS_URL && 'TEST_REDIS_URL non défini' },
  async () => {
    assert.equal(cacheStats().backend, 'mémoire + Redis');
    await forget('t:shared');
    assert.deepEqual(await cached('t:shared', 60_000, async () => ({ n: 42 })), { n: 42 });
    await new Promise(r => setTimeout(r, 50)); // écriture Redis en arrière-plan
    clearMemory();
    const before = cacheStats().redisHits;
    assert.deepEqual(await cached('t:shared', 60_000, async () => ({ n: 0 })), { n: 42 });
    assert.equal(cacheStats().redisHits, before + 1);
  },
);

test('fermeture', async () => {
  await closeCache();
});
