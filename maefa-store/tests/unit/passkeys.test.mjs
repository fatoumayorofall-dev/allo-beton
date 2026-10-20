// Face ID / empreinte (passkeys) : règles de sécurité côté serveur, sans téléphone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.DATA_DIR ??= fs.mkdtempSync(path.join(os.tmpdir(), 'maefa-pk-'));
const { registerPasskeyRoutes, deviceName, publicPasskey } = await import('../../server/passkeys.js');
const { createAdminAuth } = await import('../../server/adminAuth.js');

/** Mini-application : on enregistre les routes et on appelle leurs fonctions directement. */
function mount(pin, adminPasskeys) {
  const routes = {};
  const app = {};
  for (const m of ['get', 'post', 'delete']) app[m] = (p, fn) => (routes[`${m.toUpperCase()} ${p}`] = fn);
  let saved = adminPasskeys;
  const store = {
    listUsers: () => [],
    getUser: () => null,
    getAdminPasskeys: () => saved,
    saveAdminPasskeys: l => (saved = l),
  };
  registerPasskeyRoutes(app, {
    limit: () => true,
    store,
    currentUser: () => null,
    openSession: () => 'jeton',
    publicUser: u => u,
    isAdmin: () => false,
    adminAuth: createAdminAuth(pin),
  });
  const call = async (key, req = {}) => {
    let out;
    const res = {
      status(s) {
        this.code = s;
        return this;
      },
      json(b) {
        out = { status: this.code ?? 200, body: b };
      },
    };
    await routes[key](
      { body: {}, get: () => '', hostname: 'localhost', protocol: 'http', ip: '1', params: {}, ...req },
      res,
    );
    return out;
  };
  return { call, routes };
}

test('nom d’appareil lisible', () => {
  assert.equal(deviceName('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'), 'iPhone');
  assert.equal(deviceName('Mozilla/5.0 (Linux; Android 14; Pixel 7)'), 'Téléphone Android');
  assert.equal(deviceName(''), 'Cet appareil');
});

test('vue publique : jamais la clé publique ni le compteur', () => {
  const v = publicPasskey({ id: 'a', name: 'iPhone', publicKey: 'xyz', counter: 4, createdAt: 'd', backedUp: true });
  assert.deepEqual(Object.keys(v).sort(), ['createdAt', 'id', 'lastUsedAt', 'name', 'synced']);
});

test('gérante : changer ADMIN_PIN retire tous les appareils Face ID', async () => {
  // Appareil activé avec le code « 4821 »
  const tag = await (async () => {
    // L'empreinte du code est calculée par le serveur : on la récupère en simulant un enregistrement
    const { default: crypto } = await import('node:crypto');
    const { shopSecret } = await import('../../server/brandSecurity.js');
    return crypto.createHmac('sha256', shopSecret()).update('maefa-admin-passkey:4821').digest('hex').slice(0, 16);
  })();
  const key = { id: 'cle-1', publicKey: 'AA', counter: 0, transports: [], name: 'iPhone', createdAt: 'x', pinTag: tag };
  const same = mount('4821', [key]);
  assert.equal((await same.call('GET /api/admin/passkey/status')).body.enabled, true);
  const o = await same.call('POST /api/admin/passkey/options');
  assert.equal(o.body.options.allowCredentials.length, 1);

  // Nouveau code sur Render : l'ancien appareil ne compte plus
  const changed = mount('7390', [key]);
  assert.equal((await changed.call('GET /api/admin/passkey/status')).body.enabled, false);
  assert.equal((await changed.call('POST /api/admin/passkey/options')).status, 404);
});

test('connexion : défi inconnu ou réutilisé refusé', async () => {
  const { call } = mount('4821', []);
  const r = await call('POST /api/auth/passkey/verify', { body: { challengeId: 'inconnu', response: {} } });
  assert.equal(r.status, 400);
  const o = await call('POST /api/auth/passkey/options');
  const id = o.body.challengeId;
  assert.equal(
    (await call('POST /api/auth/passkey/verify', { body: { challengeId: id, response: { id: 'x' } } })).status,
    404,
  );
  assert.equal(
    (await call('POST /api/auth/passkey/verify', { body: { challengeId: id, response: { id: 'x' } } })).status,
    400,
  );
});
