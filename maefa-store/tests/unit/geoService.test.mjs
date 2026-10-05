// Tests du microservice « geo » et de la passerelle qui l'appelle (avec repli local).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createGeoService } from '../../services/geo/server.js';
import { localGeo, remoteGeo } from '../../server/geoGateway.js';

let server, base;
before(async () => {
  server = createGeoService().listen(0);
  await new Promise(r => server.once('listening', r));
  base = `http://localhost:${server.address().port}`;
});
after(() => server.close());

const silent = { warn: () => {} };
const m = [
  [0, 3, 1, 4],
  [3, 0, 2, 1],
  [1, 2, 0, 3],
  [4, 1, 3, 0],
];

test('le service répond à /health', async () => {
  assert.deepEqual(await (await fetch(base + '/health')).json(), { ok: true, service: 'geo' });
});

test('optimisation de tournée par HTTP = calcul local', async () => {
  const geo = remoteGeo(base, { log: silent });
  assert.deepEqual(await geo.bestOrder(m), await localGeo.bestOrder(m));
});

test('les entrées invalides sont refusées (400)', async () => {
  const r = await fetch(base + '/optimize', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{"matrix":[[0,"x"]]}',
  });
  assert.equal(r.status, 400);
  assert.equal((await fetch(base + '/reverse?lat=999&lng=0')).status, 400);
});

test('service arrêté : la passerelle calcule localement (pas de panne du site)', async () => {
  const geo = remoteGeo('http://localhost:1', { log: silent, timeoutMs: 1000 });
  assert.deepEqual(await geo.bestOrder(m), await localGeo.bestOrder(m));
});
