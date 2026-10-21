// Vente en direct (live, comme sur TikTok) : la vendeuse filme avec son téléphone (caméra simulée par
// Chromium), ses abonnées sont prévenues sur WhatsApp, une cliente regarde la vidéo, commente, envoie des
// cœurs, voit l'article présenté et commande au prix live ; la vendeuse masque une personne, termine et voit
// son bilan ; la gérante voit les signalements et peut arrêter un live.
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
  const bineta = await login('77 592 00 01', 'Bineta');
  await j('/api/mp/me/seller', {
    method: 'POST',
    headers: auth(bineta),
    body: JSON.stringify({ shopName: 'Bineta Live', category: 'mode', location: { lat: 14.69, lng: -17.45 } }),
  });
  const ids = {};
  for (const [title, price, extra] of [
    ['Boubou brodé', 20000, {}],
    ['Robe wax', 15000, { variantLabel: 'Taille', variants: ['M', 'L'] }],
    ['Bracelet perles', 10000, { priceMode: 'negocier' }],
  ]) {
    const ph = await (
      await fetch(B + '/api/mp/me/photos', {
        method: 'POST',
        headers: { ...auth(bineta), 'content-type': 'image/jpeg' },
        body: PHOTO,
      })
    ).json();
    ids[title] = (
      await j('/api/mp/me/listings', {
        method: 'POST',
        headers: auth(bineta),
        body: JSON.stringify({ title, price, category: 'mode', photos: [ph.url], ...extra }),
      })
    ).body.listing.id;
  }
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
  const shop = (await j('/api/mp/shops')).body.shops[0];
  const khady = await login('78 692 00 01', 'Khady');
  await j(`/api/mp/sellers/${shop.slug}/follow`, { method: 'POST', headers: auth(khady), body: '{}' });
  const nobody = await login('78 692 00 09', 'Awa');
  const noShop = await j('/api/mp/me/lives', {
    method: 'POST',
    headers: auth(nobody),
    body: JSON.stringify({ title: 'Test', products: [] }),
  });
  check('live réservé aux boutiques validées', noShop.status === 403);

  const b = (browser = await chromium.launch({
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  }));
  const errors = [];
  const mk = async (tok, media) => {
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
    p.on('dialog', d => d.accept(d.type() === 'prompt' ? 'Contrefaçon possible' : undefined));
    return p;
  };

  // ── 1. La vendeuse prépare et lance son live (titre, articles, prix live)
  const v = await mk(bineta, true);
  await v.goto(`${B}/m/vendre`);
  await v.getByTestId('mp-go-live').click();
  await v.waitForSelector('[data-testid="mp-studio"]', { timeout: 15000 });
  await v.waitForFunction(() => document.querySelector('[data-testid="mp-studio-preview"]')?.srcObject, null, {
    timeout: 15000,
  });
  check('studio : la caméra s’affiche', true);
  await v.getByTestId('mp-studio-title').fill('Nouveaux boubous de Tabaski');
  await v.getByLabel('Montrer Boubou brodé').check();
  await v.getByLabel('Montrer Robe wax').check();
  await v.getByLabel('Montrer Bracelet perles').check();
  await v.getByLabel('Prix live pour Boubou brodé').fill('15000');
  await v.screenshot({ path: `${SP}/lv-1-studio.png` });
  await v.getByTestId('mp-studio-start').click();
  await v.waitForSelector('[data-testid="mp-studio-live"]', { timeout: 15000 });
  const current = (await j('/api/mp/me/lives/current', { headers: auth(bineta) })).body.live;
  check(
    'live lancé, premier article présenté',
    current?.status === 'en_direct' && current.pinned === ids['Boubou brodé'],
  );
  const L = current.id;
  await sleep(500);
  check('abonnée prévenue sur WhatsApp', /« Bineta Live » est en direct : « Nouveaux boubous de Tabaski »/.test(log()));

  // La vidéo arrive au serveur par morceaux de 3 s
  let seq = 0;
  for (let i = 0; i < 20 && seq < 2; i++) {
    await sleep(1000);
    seq = (await j(`/api/mp/lives/${L}?after=0`)).body.live.seq;
  }
  check('vidéo envoyée par morceaux', seq >= 2, `morceaux : ${seq}`);
  const live = (await j(`/api/mp/lives/${L}?after=0`)).body.live;
  check('format vidéo accepté', /^video\/(webm|mp4)/.test(live.mime ?? ''), live.mime);
  const seg = await fetch(`${B}/api/mp/lives/${L}/segments/${seq}`);
  check('morceau lisible par les spectatrices', seg.ok && (await seg.arrayBuffer()).byteLength > 1000);

  // ── 2. Une abonnée arrive par l'accueil (« En direct maintenant ») et regarde
  const c = await mk(khady, false);
  await c.goto(`${B}/m`);
  await c.waitForSelector('[data-testid="mp-live-card"]', { timeout: 15000 });
  check('accueil : « En direct maintenant »', /Bineta Live/.test(await c.getByTestId('mp-live-row').innerText()));
  await c.getByTestId('mp-live-card').first().click();
  await c.waitForSelector('[data-testid="mp-live"]', { timeout: 15000 });
  await c.waitForFunction(
    () => (document.querySelector('[data-testid="mp-live-video"]')?.currentTime ?? 0) > 0.5,
    null,
    { timeout: 40000 },
  );
  check('cliente : la vidéo du live se lit', true);
  await c.screenshot({ path: `${SP}/lv-2-cliente.png` });
  await v.waitForFunction(
    () => /\b[1-9]/.test(document.querySelector('[data-testid="mp-studio-viewers"]')?.textContent ?? ''),
    null,
    { timeout: 15000 },
  );
  check('vendeuse : 1 spectatrice', true);

  // Commentaires, numéro refusé, cœurs
  await c.getByTestId('mp-live-input').fill('Bonjour, il reste du M ?');
  await c.getByTestId('mp-live-input').press('Enter');
  await v.waitForFunction(
    () => /il reste du M/.test(document.querySelector('[data-testid="mp-studio-comments"]')?.textContent ?? ''),
    null,
    { timeout: 10000 },
  );
  check('commentaire reçu par la vendeuse', true);
  await c.getByTestId('mp-live-input').fill('Appelle-moi au 77 123 45 67');
  await c.getByTestId('mp-live-input').press('Enter');
  await c.waitForSelector('[data-testid="mp-live-message"]', { timeout: 5000 });
  check(
    'numéro de téléphone refusé dans les commentaires',
    /numéro de téléphone/.test(await c.getByTestId('mp-live-message').innerText()),
  );
  for (let i = 0; i < 3; i++) await c.getByTestId('mp-live-heart').click();
  await sleep(2500);
  check('cœurs reçus', (await j(`/api/mp/lives/${L}?after=0`)).body.live.likes >= 3);

  // La vendeuse présente la robe : la cliente la voit à l'écran
  await v.getByTestId('mp-studio-product').filter({ hasText: 'Robe wax' }).click();
  await c.waitForFunction(
    () => /Robe wax/.test(document.querySelector('[data-testid="mp-live-pinned"]')?.textContent ?? ''),
    null,
    { timeout: 10000 },
  );
  check('article présenté affiché chez la cliente', true);
  await v.screenshot({ path: `${SP}/lv-3-vendeuse.png` });

  // ── 3. Acheter sans quitter le live (prix live)
  await c.getByTestId('mp-live-bag').click();
  const sheet = c.getByTestId('mp-live-sheet');
  await sheet.waitFor();
  const boubou = sheet.getByTestId('mp-live-product').filter({ hasText: 'Boubou brodé' });
  check(
    'prix live affiché (15 000 F au lieu de 20 000 F)',
    /15\s000 F[\s\S]*20\s000 F[\s\S]*prix live/i.test(await boubou.innerText()),
  );
  check(
    'prix caché : « Faire une offre »',
    /Faire une offre/.test(await sheet.getByTestId('mp-live-product').filter({ hasText: 'Bracelet' }).innerText()),
  );
  await boubou.getByTestId('mp-live-add').click();
  const robe = sheet.getByTestId('mp-live-product').filter({ hasText: 'Robe wax' });
  await robe.getByTestId('mp-live-add').click();
  check(
    'taille exigée avant d’ajouter la robe',
    /Choisissez : Taille/.test(await c.getByTestId('mp-live-message').innerText()),
  );
  await robe.getByRole('radio', { name: 'M' }).click();
  await robe.getByTestId('mp-live-add').click();
  await c.screenshot({ path: `${SP}/lv-4-articles.png` });
  await c.getByLabel('Fermer').click();
  check('panier depuis le live : 2 articles', /Commander \(2\)/.test(await c.getByTestId('mp-live-cart').innerText()));
  const cart = await c.evaluate(() => JSON.parse(localStorage.getItem('mp_cart') || '[]'));
  const items = cart.map(i => ({ listingId: i.listingId, qty: i.qty, variant: i.variant }));
  const quote = (
    await j('/api/mp/quote', { method: 'POST', headers: auth(khady), body: JSON.stringify({ items, to: TO }) })
  ).body;
  check(
    'devis : prix live appliqué par le serveur',
    quote.orders[0].subtotal === 15000 + 15000,
    String(quote.orders?.[0]?.subtotal),
  );
  const order = await j('/api/mp/orders', {
    method: 'POST',
    headers: auth(khady),
    body: JSON.stringify({ items, to: TO, name: 'Khady', payment: 'especes' }),
  });
  const line = order.body.orders?.[0]?.lines.find(x => x.listingId === ids['Boubou brodé']);
  check('commande au prix live', order.status === 201 && line?.price === 15000);
  await c.waitForFunction(
    () =>
      /Une cliente vient de commander/.test(
        document.querySelector('[data-testid="mp-live-comments"]')?.textContent ?? '',
      ),
    null,
    { timeout: 10000 },
  );
  check(
    'annonce anonyme « une cliente vient de commander »',
    !/Khady vient/.test(await c.getByTestId('mp-live-comments').innerText()),
  );
  await v.waitForFunction(
    () => /1/.test(document.querySelector('[data-testid="mp-studio-orders"]')?.textContent ?? ''),
    null,
    {
      timeout: 10000,
    },
  );
  check('vendeuse : compteur de commandes', true);

  // Prix live invalide (plus cher que l'article) refusé
  const bad = await j(`/api/mp/me/lives/${L}/products`, {
    method: 'POST',
    headers: auth(bineta),
    body: JSON.stringify({ products: [{ listingId: ids['Boubou brodé'], livePrice: 25000 }] }),
  });
  check('prix live plus cher que l’article : refusé', bad.status === 400);

  // Boutique : bandeau « En direct » et annuaire
  const shopPage = (await j(`/api/mp/sellers/${shop.slug}`)).body;
  check('boutique : live en cours signalé', shopPage.live?.id === L);

  // ── 4. Signalement et modération
  const fatou = await login('78 692 00 02', 'Fatou');
  await j(`/api/mp/lives/${L}/comments`, {
    method: 'POST',
    headers: auth(fatou),
    body: JSON.stringify({ text: 'Arnaque !!!' }),
  });
  await j(`/api/mp/lives/${L}/report`, {
    method: 'POST',
    headers: auth(fatou),
    body: JSON.stringify({ reason: 'Je pense que c’est faux' }),
  });
  const adminLive = (await j('/api/admin/mp/lives', { headers: A })).body.lives.find(x => x.id === L);
  check('gérante : signalement visible', adminLive?.reports.length === 1);
  await v.waitForFunction(
    () => /Arnaque/.test(document.querySelector('[data-testid="mp-studio-comments"]')?.textContent ?? ''),
    null,
    { timeout: 10000 },
  );
  await v
    .getByTestId('mp-studio-comments')
    .locator('li', { hasText: 'Arnaque' })
    .getByRole('button', { name: 'Masquer' })
    .click();
  await sleep(500);
  const muted = await j(`/api/mp/lives/${L}/comments`, {
    method: 'POST',
    headers: auth(fatou),
    body: JSON.stringify({ text: 'Encore moi' }),
  });
  check('personne masquée : ne peut plus écrire', muted.status === 403);
  const visible = (await j(`/api/mp/lives/${L}?after=0`)).body.comments.map(x => x.text).join(' | ');
  check('ses commentaires ont disparu', !/Arnaque/.test(visible));

  // ── 5. La vendeuse termine : bilan ; la cliente voit « Terminé » ; le prix live reste 15 minutes
  await v.getByTestId('mp-studio-end').click();
  await v.waitForSelector('[data-testid="mp-live-result"]', { timeout: 10000 });
  const bilan = await v.getByTestId('mp-live-result').innerText();
  check(
    'bilan : 1 commande, 30 000 F',
    /Commandes\s*1/.test(bilan) && /30\s000 F/.test(bilan),
    bilan.replace(/\s+/g, ' '),
  );
  check('bilan sans message d’erreur', !/Le live est terminé/.test(bilan));
  await v.screenshot({ path: `${SP}/lv-5-bilan.png` });
  await c.waitForFunction(
    () => /Terminé/.test(document.querySelector('[data-testid="mp-live-badge"]')?.textContent ?? ''),
    null,
    { timeout: 10000 },
  );
  check('cliente : « Terminé »', true);
  const after = (
    await j('/api/mp/quote', {
      method: 'POST',
      headers: auth(khady),
      body: JSON.stringify({ items: [{ listingId: ids['Boubou brodé'], qty: 1 }], to: TO }),
    })
  ).body;
  check('prix live encore valable juste après la fin', after.orders?.[0]?.subtotal === 15000);
  check('plus de live à l’accueil', (await j('/api/mp/lives')).body.lives.length === 0);

  // ── 6. La gérante arrête un live
  const again = await j('/api/mp/me/lives', {
    method: 'POST',
    headers: auth(bineta),
    body: JSON.stringify({ title: 'Deuxième live', products: [{ listingId: ids['Robe wax'], livePrice: null }] }),
  });
  const stop = await j(`/api/admin/mp/lives/${again.body.live.id}/stop`, {
    method: 'POST',
    headers: A,
    body: JSON.stringify({ reason: 'Article contrefait' }),
  });
  check('gérante : live arrêté', stop.body?.live?.status === 'termine');
  await sleep(300);
  check('vendeuse prévenue de l’arrêt', /arrêté par la plateforme : Article contrefait/.test(log()));

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  console.log(res.join('\n'));
  await b.close();
})().catch(async e => {
  console.log(res.join('\n'));
  console.log('ERR', e.message);
  const pages = browser ? browser.contexts().flatMap(c => c.pages()) : [];
  for (const [i, pg] of pages.entries()) await pg.screenshot({ path: `${SP}/lv-erreur-${i}.png` }).catch(() => {});
  process.exit(1);
});
