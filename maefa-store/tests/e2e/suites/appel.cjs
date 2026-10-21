// Appel par internet (voix, WebRTC) depuis la discussion : la cliente appelle la boutique, le téléphone de la
// vendeuse sonne, elle décroche, les deux sont en ligne, la cliente raccroche ; l'appel est noté dans la
// discussion. Puis un appel sans réponse devient « manqué » (message WhatsApp à la vendeuse).
// Micro simulé par Chromium (--use-fake-device-for-media-stream).
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const SP = process.env.SP;
const B = 'http://localhost:8787';
const A = { 'x-admin-pin': '2026', 'content-type': 'application/json' };
const PHOTO = fs.readFileSync(path.join(__dirname, '../fixtures/photos/p0.jpg'));
const res = [];
let browser;
const check = (n, ok, x = '') => res.push(`${ok ? 'OK  ' : 'FAIL'} ${n} ${x}`);
const j = async (p, opts = {}) => {
  const r = await fetch(B + p, { ...opts, headers: { 'content-type': 'application/json', ...(opts.headers || {}) } });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const login = async (phone, firstName) => {
  const s = await j('/api/auth/start', { method: 'POST', body: JSON.stringify({ phone }) });
  const v = await j('/api/auth/verify', { method: 'POST', body: JSON.stringify({ phone, code: s.body.devCode }) });
  await j('/api/me', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${v.body.token}` },
    body: JSON.stringify({ firstName }),
  });
  return v.body.token;
};

(async () => {
  const seller = await login('77 580 00 01', 'Fatoumata');
  const SH = { Authorization: `Bearer ${seller}` };
  await j('/api/mp/me/seller', {
    method: 'POST',
    headers: SH,
    body: JSON.stringify({ shopName: 'Maefa', category: 'mode', location: { lat: 14.69, lng: -17.45 } }),
  });
  const ph = await (
    await fetch(B + '/api/mp/me/photos', {
      method: 'POST',
      headers: { ...SH, 'content-type': 'image/jpeg' },
      body: PHOTO,
    })
  ).json();
  const listing = (
    await j('/api/mp/me/listings', {
      method: 'POST',
      headers: SH,
      body: JSON.stringify({
        title: 'Sac Ndella',
        price: 25000,
        priceMode: 'negocier',
        category: 'sacs',
        photos: [ph.url],
      }),
    })
  ).body.listing;
  for (const v of (await j('/api/admin/mp/sellers', { headers: A })).body.sellers)
    await j(`/api/admin/mp/sellers/${v.id}`, {
      method: 'PATCH',
      headers: A,
      body: JSON.stringify({ status: 'active' }),
    });
  await j(`/api/admin/mp/listings/${listing.id}`, {
    method: 'PATCH',
    headers: A,
    body: JSON.stringify({ status: 'publiee' }),
  });
  const buyer = await login('78 680 00 01', 'Khady');
  const chat = (
    await j(`/api/mp/listings/${listing.id}/chat`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${buyer}` },
      body: JSON.stringify({ text: 'Bonjour, je peux vous appeler pour le prix ?' }),
    })
  ).body.chat;

  const b = (browser = await chromium.launch({
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      // Adresses locales réelles (et non .local) : les deux « téléphones » sont sur la même machine
      '--disable-features=WebRtcHideLocalIpsWithMdns',
    ],
  }));
  const errors = [];
  const mk = async token => {
    const ctx = await b.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block', permissions: ['microphone'] });
    await ctx.route(/pexels|fonts\.g|tile|openstreetmap|arcgis|wa\.me|nominatim|overpass|stun\./, r =>
      r.fulfill({ status: 204, body: '' }),
    );
    await ctx.addInitScript(t => localStorage.setItem('maefa_token', t), token);
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    return p;
  };

  // La vendeuse a l'application ouverte (n'importe quelle page) ; la cliente est dans la discussion
  const v = await mk(seller);
  await v.goto(B + '/m/vendre');
  await v.waitForSelector('[data-testid="mp-seller-space"]', { timeout: 15000 });
  const c = await mk(buyer);
  await c.goto(B + `/m/discussions/${chat.id}`);
  await c.waitForSelector('[data-testid="mp-chat-call"]', { timeout: 15000 });

  // ── 1. Appel décroché
  await c.getByTestId('mp-chat-call').click();
  await c.waitForSelector('[data-testid="mp-call"]', { timeout: 10000 });
  check('cliente : « Appel en cours… »', /Appel en cours/.test(await c.getByTestId('mp-call-status').innerText()));
  await v.waitForSelector('[data-testid="mp-call-accept"]', { timeout: 15000 });
  check(
    'vendeuse : le téléphone sonne (« Khady vous appelle »)',
    /Khady[\s\S]*vous appelle/.test(await v.getByTestId('mp-call').innerText()),
  );
  await v.screenshot({ path: `${SP}/ap-1-sonnerie.png` });
  await v.getByTestId('mp-call-accept').click();
  await c.waitForFunction(
    () => /En ligne/.test(document.querySelector('[data-testid="mp-call-status"]')?.textContent ?? ''),
    null,
    { timeout: 30000 },
  );
  await v.waitForFunction(
    () => /En ligne/.test(document.querySelector('[data-testid="mp-call-status"]')?.textContent ?? ''),
    null,
    { timeout: 30000 },
  );
  check('les deux téléphones sont en ligne (voix directe, chiffrée)', true);
  await c.screenshot({ path: `${SP}/ap-2-en-ligne.png` });
  await c.waitForTimeout(2500);
  await c.getByTestId('mp-call-hangup').click();
  await v.waitForFunction(
    () => /Appel terminé/.test(document.querySelector('[data-testid="mp-call-status"]')?.textContent ?? ''),
    null,
    { timeout: 15000 },
  );
  check('vendeuse : « Appel terminé » quand la cliente raccroche', true);
  const after = (await j(`/api/mp/me/chats/${chat.id}`, { headers: { Authorization: `Bearer ${buyer}` } })).body.chat;
  check(
    'appel noté dans la discussion (durée)',
    after.messages.some(m => m.system && /📞 Appel · \d+ s/.test(m.text)),
  );
  check('aucun numéro échangé', !JSON.stringify(after).includes('+221'));

  // ── 2. Appel manqué (sonnerie de 6 s dans ce scénario)
  await v.goto(B + '/m/discussions');
  await c.waitForTimeout(4000);
  await c.getByTestId('mp-chat-call').click();
  await c.waitForFunction(
    () => /Pas de réponse/.test(document.querySelector('[data-testid="mp-call-status"]')?.textContent ?? ''),
    null,
    { timeout: 30000 },
  );
  check('cliente : « Pas de réponse » après la sonnerie', true);
  const log = fs.readFileSync(path.join(SP, 'server.log'), 'utf8');
  check('vendeuse prévenue sur WhatsApp de l’appel manqué', /Appel manqué au sujet de « Sac Ndella »/.test(log));
  const last = (await j(`/api/mp/me/chats/${chat.id}`, { headers: SH })).body.chat.messages.at(-1);
  check('« Appel manqué » dans la discussion', last.system && /Appel manqué/.test(last.text));

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  console.log(res.join('\n'));
  await b.close();
})().catch(async e => {
  console.log(res.join('\n'));
  console.log('ERR', e.message);
  const pages = browser ? browser.contexts().flatMap(c => c.pages()) : [];
  for (const [i, pg] of pages.entries()) await pg.screenshot({ path: `${SP}/ap-erreur-${i}.png` }).catch(() => {});
  process.exit(1);
});
