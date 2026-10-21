// Live, version 2 : live programmé (les abonnées sont prévenues, « Me prévenir » à l'accueil et dans la
// boutique, rappel au début), studio plein écran avec qualité vidéo, bandeau d'annonce, offre flash
// (compte à rebours, quantité limitée décomptée par le serveur), questions rapides, double tap = cœur,
// passer au live suivant.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const SP = process.env.SP;
const B = 'http://localhost:8787';
const A = { 'x-admin-pin': '2026', 'content-type': 'application/json' };
const PHOTO = fs.readFileSync(path.join(__dirname, '../fixtures/photos/p0.jpg'));
const TO = { lat: 14.7, lng: -17.46, address: 'Point E, Dakar' };
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
const auth = t => ({ Authorization: `Bearer ${t}` });
const log = () => fs.readFileSync(path.join(SP, 'server.log'), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const mk = async token => {
    const H = auth(token);
    return H;
  };
  const awa = await login('77 594 00 01', 'Awa');
  const HA = await mk(awa);
  await j('/api/mp/me/seller', {
    method: 'POST',
    headers: HA,
    body: JSON.stringify({ shopName: 'Awa Wax Live', category: 'mode', location: { lat: 14.69, lng: -17.45 } }),
  });
  const ids = {};
  const addListing = async (H, title, price) => {
    const ph = await (
      await fetch(B + '/api/mp/me/photos', {
        method: 'POST',
        headers: { ...H, 'content-type': 'image/jpeg' },
        body: PHOTO,
      })
    ).json();
    ids[title] = (
      await j('/api/mp/me/listings', {
        method: 'POST',
        headers: H,
        body: JSON.stringify({ title, price, category: 'mode', photos: [ph.url] }),
      })
    ).body.listing.id;
  };
  await addListing(HA, 'Boubou bazin', 30000);
  await addListing(HA, 'Foulard soie', 8000);
  // Une deuxième boutique, pour passer d'un live à l'autre
  const ndeye = await login('77 594 00 02', 'Ndèye');
  const HN = auth(ndeye);
  await j('/api/mp/me/seller', {
    method: 'POST',
    headers: HN,
    body: JSON.stringify({ shopName: 'Ndèye Bijoux', category: 'mode', location: { lat: 14.7, lng: -17.44 } }),
  });
  await addListing(HN, 'Collier perles', 6000);
  for (const v of (await j('/api/admin/mp/sellers', { headers: A })).body.sellers)
    await j(`/api/admin/mp/sellers/${v.id}`, {
      method: 'PATCH',
      headers: A,
      body: JSON.stringify({ status: 'active' }),
    });
  for (const l of (await j('/api/admin/mp/listings?status=en_attente', { headers: A })).body.listings)
    await j(`/api/admin/mp/listings/${l.id}`, {
      method: 'PATCH',
      headers: A,
      body: JSON.stringify({ status: 'publiee' }),
    });
  const khady = await login('78 694 00 01', 'Khady');
  await j('/api/mp/sellers/awa-wax-live/follow', { method: 'POST', headers: auth(khady), body: '{}' });
  const fatou = await login('78 694 00 02', 'Fatou');

  const b = (browser = await chromium.launch({
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  }));
  const errors = [];
  const page = async (tok, media) => {
    const ctx = await b.newContext({
      ...devices['Pixel 7'],
      serviceWorkers: 'block',
      ...(media ? { permissions: ['camera', 'microphone'] } : {}),
    });
    await ctx.route(/pexels|fonts\.g|tile|openstreetmap|arcgis|wa\.me|nominatim|overpass/, r =>
      r.fulfill({ status: 204, body: '' }),
    );
    await ctx.addInitScript(t => localStorage.setItem('maefa_token', t), tok);
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    p.on('dialog', d => d.accept(d.type() === 'prompt' ? '-20 % sur tout ce soir' : undefined));
    return p;
  };

  // ── 1. Programmer le live depuis le studio plein écran
  const v = await page(awa, true);
  await v.goto(`${B}/m/vendre`);
  await v.waitForSelector('[data-testid="mp-seller-today"]', { timeout: 15000 });
  check(
    'espace vendeuse : chiffres du jour',
    /Nouvelles commandes/.test(await v.getByTestId('mp-seller-today').innerText()),
  );
  await v.getByTestId('mp-go-live').click();
  await v.waitForSelector('[data-testid="mp-studio"]', { timeout: 15000 });
  check('studio : choix de la qualité vidéo', (await v.getByRole('radio', { name: 'Économie' }).count()) === 1);
  await v.getByRole('radio', { name: 'Économie' }).click();
  check('qualité gardée sur le téléphone', (await v.evaluate(() => localStorage.getItem('mp_live_quality'))) === 'eco');
  await v.getByTestId('mp-studio-title').fill('Grand déstockage bazin');
  await v.getByRole('tab', { name: 'Programmer' }).click();
  const at = new Date(Date.now() + 2 * 864e5);
  at.setHours(20, 0, 0, 0);
  const pad = n => String(n).padStart(2, '0');
  await v.getByTestId('mp-studio-at').fill(`${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T20:00`);
  await v.getByTestId('mp-studio-schedule').click();
  await v.waitForSelector('[data-testid="mp-studio-scheduled"]', { timeout: 10000 });
  check('live programmé', /Grand déstockage bazin/.test(await v.getByTestId('mp-studio-scheduled').innerText()));
  await v.screenshot({ path: `${SP}/l2-1-programme.png` });
  await sleep(300);
  check('abonnée prévenue de la date', /« Awa Wax Live » fera un live .* : « Grand déstockage bazin »/.test(log()));
  const tooSoon = await j('/api/mp/me/lives/schedule', {
    method: 'POST',
    headers: HA,
    body: JSON.stringify({ title: 'x', at: new Date(Date.now() + 60e3).toISOString() }),
  });
  check('date trop proche refusée', tooSoon.status === 400);

  // ── 2. Une cliente demande un rappel depuis l'accueil
  const c = await page(fatou, false);
  await c.goto(`${B}/m`);
  await c.waitForSelector('[data-testid="mp-upcoming-card"]', { timeout: 15000 });
  check('accueil : « Lives à venir »', /Awa Wax Live/.test(await c.getByTestId('mp-live-row').innerText()));
  await c.getByTestId('mp-upcoming-card').getByTestId('mp-live-remind').click();
  await c.waitForFunction(
    () => /Rappel activé/.test(document.querySelector('[data-testid="mp-live-remind"]')?.textContent ?? ''),
    null,
    { timeout: 10000 },
  );
  check('« Me prévenir » → « Rappel activé »', true);
  await c.screenshot({ path: `${SP}/l2-2-a-venir.png` });
  const shop = (await j('/api/mp/sellers/awa-wax-live', { headers: auth(fatou) })).body;
  check('boutique : prochain live et rappel', shop.upcoming?.reminders === 1 && shop.upcoming.reminded === true);
  await c.goto(`${B}/m/boutique/awa-wax-live`);
  await c.waitForSelector('[data-testid="mp-shop-upcoming"]', { timeout: 10000 });
  check(
    'vitrine : carte du prochain live',
    /Grand déstockage bazin/.test(await c.getByTestId('mp-shop-upcoming').innerText()),
  );

  // ── 3. Le live commence : abonnée et cliente au rappel prévenues ; la date programmée disparaît
  await v.getByRole('tab', { name: 'Maintenant' }).click();
  await v.getByLabel('Montrer Boubou bazin').check();
  await v.getByLabel('Montrer Foulard soie').check();
  await v.getByLabel('Prix live pour Boubou bazin').fill('25000');
  await v.getByTestId('mp-studio-start').click();
  await v.waitForSelector('[data-testid="mp-studio-live"]', { timeout: 15000 });
  await sleep(500);
  const started = (log().match(/« Awa Wax Live » est en direct/g) ?? []).length;
  check('début du live : 2 personnes prévenues (abonnée + rappel)', started === 2, String(started));
  check('plus de live programmé', (await j('/api/mp/me/lives/schedule', { headers: HA })).body.schedule === null);
  const L = (await j('/api/mp/me/lives/current', { headers: HA })).body.live.id;

  // ── 4. Bandeau d'annonce, offre flash
  await v.getByTestId('mp-studio-banner').click();
  await v.getByTestId('mp-studio-flash').click();
  await v.getByLabel('Prix flash').fill('20000');
  await v.getByLabel('Nombre de pièces').fill('2');
  await v.getByRole('radio', { name: '5 min', exact: true }).click();
  await v.getByTestId('mp-studio-flash-go').click();
  await sleep(500);
  const lv = (await j(`/api/mp/lives/${L}?after=0`)).body.live;
  const boubou = lv.products.find(p => p.title === 'Boubou bazin');
  check('bandeau enregistré', lv.banner === '-20 % sur tout ce soir');
  check(
    'offre flash : 20 000 F, 2 pièces, ≈ 5 min',
    boubou.flash?.price === 20000 && boubou.flash.left === 2 && Date.parse(boubou.flash.until) - Date.now() > 4 * 60e3,
  );
  const badFlash = await j(`/api/mp/me/lives/${L}/flash`, {
    method: 'POST',
    headers: HA,
    body: JSON.stringify({ listingId: ids['Boubou bazin'], price: 40000, minutes: 5 }),
  });
  check('prix flash plus cher que l’article : refusé', badFlash.status === 400);

  // La cliente arrive dans le live : bandeau, compte à rebours, pièces restantes
  // (une petite vidéo est déjà arrivée ?)
  for (let i = 0; i < 15; i++) {
    if ((await j(`/api/mp/lives/${L}?after=0`)).body.live.seq >= 2) break;
    await sleep(1000);
  }
  await c.goto(`${B}/m/live/${L}`);
  await c.waitForSelector('[data-testid="mp-live-flash"]', { timeout: 15000 });
  check(
    'cliente : bandeau d’annonce',
    /-20 % sur tout ce soir/.test(await c.getByTestId('mp-live-banner').innerText()),
  );
  const flashText = await c.getByTestId('mp-live-flash').innerText();
  check(
    'cliente : offre flash, compte à rebours, plus que 2',
    /Offre flash/i.test(flashText) && /0[45]:\d\d/.test(flashText) && /plus que 2/i.test(flashText),
    flashText,
  );
  check(
    'cliente : prix flash affiché',
    /20\s000 F[\s\S]*30\s000 F[\s\S]*offre flash/i.test(await c.getByTestId('mp-live-pinned').innerText()),
  );
  await c.waitForFunction(
    () => (document.querySelector('[data-testid="mp-live-video"]')?.currentTime ?? 0) > 0.3,
    null,
    {
      timeout: 40000,
    },
  );
  await c.screenshot({ path: `${SP}/l2-3-flash.png` });

  // Questions rapides, double tap = cœur
  await c.getByTestId('mp-live-quick').filter({ hasText: "C'est combien ?" }).click();
  await v.waitForFunction(
    () => /C'est combien/.test(document.querySelector('[data-testid="mp-studio-comments"]')?.textContent ?? ''),
    null,
    { timeout: 10000 },
  );
  check('question rapide reçue par la vendeuse', true);
  const likes0 = (await j(`/api/mp/lives/${L}?after=0`)).body.live.likes;
  const box = await c.getByTestId('mp-live-video').boundingBox();
  await c.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 3);
  await sleep(2500);
  check('double tap : un cœur envoyé', (await j(`/api/mp/lives/${L}?after=0`)).body.live.likes > likes0);

  // ── 5. Offre flash : quantité limitée, décomptée à la commande
  const order = (token, qty) =>
    j('/api/mp/orders', {
      method: 'POST',
      headers: auth(token),
      body: JSON.stringify({
        items: [{ listingId: ids['Boubou bazin'], qty }],
        to: TO,
        name: 'Cliente',
        payment: 'wave',
      }),
    });
  const tooMany = await order(fatou, 3);
  check(
    'plus de pièces que l’offre : refusé',
    tooMany.status === 400 && /Plus que 2/.test(tooMany.body.error),
    tooMany.body?.error,
  );
  const o1 = await order(fatou, 1);
  check('commande au prix flash', o1.status === 201 && o1.body.orders[0].lines[0].price === 20000);
  await c.waitForFunction(
    () => /plus que 1/i.test(document.querySelector('[data-testid="mp-live-flash"]')?.textContent ?? ''),
    null,
    { timeout: 10000 },
  );
  check('compteur des pièces : plus que 1', true);
  const o2 = await order(khady, 1);
  check('dernière pièce au prix flash', o2.body.orders?.[0]?.lines[0].price === 20000);
  await sleep(2500);
  const comments = (await j(`/api/mp/lives/${L}?after=0`)).body.comments.map(x => x.text).join(' | ');
  check('« Offre flash épuisée » annoncé', /Offre flash épuisée/.test(comments));
  const after = (
    await j('/api/mp/quote', {
      method: 'POST',
      headers: auth(fatou),
      body: JSON.stringify({ items: [{ listingId: ids['Boubou bazin'], qty: 1 }], to: TO }),
    })
  ).body;
  check(
    'après l’offre flash : retour au prix live (25 000 F)',
    after.orders?.[0]?.subtotal === 25000,
    String(after.orders?.[0]?.subtotal),
  );

  // ── 6. Passer au live suivant
  await j('/api/mp/me/lives', {
    method: 'POST',
    headers: HN,
    body: JSON.stringify({
      title: 'Bijoux du soir',
      products: [{ listingId: ids['Collier perles'], livePrice: null }],
    }),
  });
  await c.reload();
  await c.waitForSelector('[data-testid="mp-live-next"]', { timeout: 15000 });
  await c.getByTestId('mp-live-next').click();
  await c.waitForFunction(id => !location.pathname.endsWith(id), L, { timeout: 10000 });
  await c.waitForFunction(
    () => /Ndèye Bijoux/.test(document.querySelector('[data-testid="mp-live"]')?.textContent ?? ''),
    null,
    {
      timeout: 10000,
    },
  );
  check('flèche : live suivant (autre boutique)', true);

  await v.getByTestId('mp-studio-end').click();
  await v.waitForSelector('[data-testid="mp-live-result"]', { timeout: 10000 });
  check('bilan : 2 commandes', /Commandes\s*2/.test(await v.getByTestId('mp-live-result').innerText()));

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  console.log(res.join('\n'));
  await b.close();
})().catch(async e => {
  console.log(res.join('\n'));
  console.log('ERR', e.message);
  const pages = browser ? browser.contexts().flatMap(c => c.pages()) : [];
  for (const [i, pg] of pages.entries()) await pg.screenshot({ path: `${SP}/l2-erreur-${i}.png` }).catch(() => {});
  process.exit(1);
});
