// Prix caché et marchandage : la vendeuse publie un article « à négocier » ; le public ne voit qu'une
// fourchette ; la cliente fait une offre dans la messagerie (un numéro de téléphone est refusé), la
// vendeuse répond par une contre-offre, la cliente accepte et commande au prix convenu.
const { chromium, devices } = require('playwright');
const path = require('path');
const SP = process.env.SP;
const B = 'http://localhost:8787';
const A = { 'x-admin-pin': '2026', 'content-type': 'application/json' };
const PHOTO = path.join(__dirname, '../fixtures/photos/p0.jpg');
const res = [];
let browser;
const check = (n, ok, x = '') => res.push(`${ok ? 'OK  ' : 'FAIL'} ${n} ${x}`);
const j = async (p, opts = {}) => {
  const r = await fetch(B + p, { ...opts, headers: { 'content-type': 'application/json', ...(opts.headers || {}) } });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const login = async phone => {
  const s = await j('/api/auth/start', { method: 'POST', body: JSON.stringify({ phone }) });
  const v = await j('/api/auth/verify', { method: 'POST', body: JSON.stringify({ phone, code: s.body.devCode }) });
  return v.body.token;
};

(async () => {
  // Boutique de la vendeuse (validée), puis tout se fait dans le navigateur
  const sellerToken = await login('77 560 00 01');
  await j('/api/mp/me/seller', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sellerToken}` },
    body: JSON.stringify({ shopName: 'Maefa', category: 'mode', location: { lat: 14.69, lng: -17.45 } }),
  });
  await j('/api/me', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${sellerToken}` },
    body: JSON.stringify({ firstName: 'Fatoumata' }),
  });
  for (const v of (await j('/api/admin/mp/sellers', { headers: A })).body.sellers)
    await j(`/api/admin/mp/sellers/${v.id}`, {
      method: 'PATCH',
      headers: A,
      body: JSON.stringify({ status: 'active' }),
    });

  const b = (browser = await chromium.launch());
  const errors = [];
  const mk = async (geo, token) => {
    const ctx = await b.newContext({
      ...devices['Pixel 7'],
      serviceWorkers: 'block',
      geolocation: { ...geo, accuracy: 12 },
      permissions: ['geolocation'],
    });
    await ctx.route(/pexels|fonts\.g|tile|openstreetmap|arcgis|wa\.me|nominatim|overpass/, r =>
      r.fulfill({ status: 204, body: '' }),
    );
    if (token) await ctx.addInitScript(t => localStorage.setItem('maefa_token', t), token);
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    return p;
  };
  const shot = (p, n) => p.screenshot({ path: `${SP}/di-${n}.png` });

  // ── 1. La vendeuse publie un sac « prix caché, à négocier » (25 000 F)
  const v = await mk({ latitude: 14.69, longitude: -17.45 }, sellerToken);
  await v.goto(B + '/m/vendre');
  await v.waitForSelector('[data-testid="mp-seller-space"]', { timeout: 15000 });
  await v.getByTestId('mp-add-listing').click();
  await v.getByTestId('mp-photo-input').setInputFiles([PHOTO]);
  await v.waitForFunction(() => document.querySelectorAll('[data-testid="mp-listing-form"] img').length === 1, null, {
    timeout: 20000,
  });
  await v.getByLabel('Titre *').fill('Sac Ndella');
  await v.getByLabel('Prix (F CFA) *').fill('25000');
  await v.getByLabel('Rayon *').selectOption('sacs');
  await v.getByTestId('mp-price-negocier').click();
  await shot(v, '1-prix-cache');
  await v.getByTestId('mp-listing-save').click();
  await v.waitForTimeout(1200);
  check(
    'vendeuse : son prix visible pour elle',
    /25\s000 F.*à négocier/.test(await v.getByTestId('mp-my-listing').innerText()),
  );
  for (const l of (await j('/api/admin/mp/listings?status=en_attente', { headers: A })).body.listings)
    await j(`/api/admin/mp/listings/${l.id}`, {
      method: 'PATCH',
      headers: A,
      body: JSON.stringify({ status: 'publiee' }),
    });
  const pub = (await j('/api/mp/listings')).body;
  check(
    'public : pas de prix exact, une fourchette',
    pub.listings[0].price === null && !JSON.stringify(pub).includes('25000'),
    pub.listings[0].priceBand,
  );

  // ── 2. La cliente voit la fourchette et fait une offre
  const buyerToken = await login('78 660 00 01');
  await j('/api/me', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${buyerToken}` },
    body: JSON.stringify({ firstName: 'Khady' }),
  });
  const c = await mk({ latitude: 14.765, longitude: -17.44 }, buyerToken);
  await c.goto(B + '/m');
  await c.waitForSelector('[data-testid="mp-card"]', { timeout: 15000 });
  check(
    'carte : « 20 000 – 30 000 F » et « Prix à négocier »',
    /20\s000 – 30\s000 F[\s\S]*Prix à négocier/.test(await c.getByTestId('mp-card').first().innerText()),
  );
  await c.getByTestId('mp-card').first().click();
  await c.waitForSelector('[data-testid="mp-make-offer"]', { timeout: 10000 });
  check('fiche : pas de bouton « Commander » sans accord', (await c.getByTestId('mp-buy').count()) === 0);
  await shot(c, '2-fiche-a-negocier');
  await c.getByTestId('mp-make-offer').click();
  await c.waitForSelector('[data-testid="mp-offer-amount"]', { timeout: 10000 });
  await c.getByTestId('mp-offer-amount').fill('18000');
  await c.getByTestId('mp-offer-send').click();
  await c.waitForSelector('[data-testid="mp-chat-offer"]', { timeout: 10000 });
  check(
    'offre envoyée, en attente',
    /18\s000 F[\s\S]*En attente/.test(await c.getByTestId('mp-chat-offer').innerText()),
  );
  await c.getByTestId('mp-chat-input').fill('Appelez-moi au 77 123 45 67');
  await c.getByTestId('mp-chat-send').click();
  await c.waitForTimeout(800);
  check('numéro de téléphone refusé', /Pas de numéro/.test(await c.getByRole('alert').innerText()));
  await c.getByTestId('mp-chat-input').fill('Il est disponible en camel ?');
  await c.getByTestId('mp-chat-send').click();
  await c.waitForTimeout(800);
  check('question envoyée', (await c.getByTestId('mp-chat-message').count()) === 1);
  await shot(c, '3-offre');

  // ── 3. La vendeuse : message non lu, contre-offre à 21 000 F
  await v.goto(B + '/m');
  await v.waitForTimeout(1500);
  check('vendeuse : badge « 2 » sur les messages', /2/.test(await v.getByTestId('mp-chats-link').innerText()));
  await v.getByTestId('mp-chats-link').click();
  await v.waitForSelector('[data-testid="mp-chat-item"]', { timeout: 10000 });
  check(
    'vendeuse : la cliente n’apparaît que par son prénom',
    /Khady/.test(await v.getByTestId('mp-chat-item').innerText()),
  );
  await v.getByTestId('mp-chat-item').click();
  await v.waitForSelector('[data-testid="mp-offer-yes"]', { timeout: 10000 });
  check('vendeuse : son vrai prix rappelé', /Votre prix : 25\s000 F/.test(await v.getByTestId('mp-chat').innerText()));
  await v.getByRole('button', { name: 'Contre-offre' }).click();
  await v.getByTestId('mp-offer-amount').fill('21000');
  await v.getByTestId('mp-offer-send').click();
  await v.waitForTimeout(800);
  await shot(v, '4-contre-offre');

  // ── 4. La cliente accepte et commande au prix convenu
  await c.waitForSelector('[data-testid="mp-offer-yes"]', { timeout: 15000 });
  check('cliente : sa 1re offre remplacée', /Remplacée/.test(await c.getByTestId('mp-chat').innerText()));
  await c.getByTestId('mp-offer-yes').click();
  await c.waitForSelector('[data-testid="mp-chat-deal"]', { timeout: 10000 });
  check('prix convenu : 21 000 F, valable 48 h', /21\s000 F/.test(await c.getByTestId('mp-chat-deal').innerText()));
  await c.getByTestId('mp-chat-buy').click();
  await c.waitForSelector('[data-testid="mp-deal"]', { timeout: 10000 });
  check('fiche : prix convenu affiché', /21\s000 F/.test(await c.getByTestId('mp-price').innerText()));
  await c.getByTestId('mp-buy').click();
  await c.waitForTimeout(1000);
  await c
    .getByRole('button', { name: /Je suis ici/ })
    .first()
    .click();
  await c.waitForFunction(() => !document.querySelector('[data-testid="gps-progress"]'), null, { timeout: 30000 });
  await c.getByTestId('confirm-location').click();
  await c.waitForSelector('[data-testid="mp-quote"]', { timeout: 10000 });
  await shot(c, '5-panier-prix-convenu');
  await c.getByTestId('mp-confirm').click();
  await c.waitForSelector('[data-testid="mp-order-done"]', { timeout: 10000 });
  const order = (await j('/api/admin/mp/orders', { headers: A })).body.orders[0];
  check(
    'commande au prix convenu (21 000 F)',
    order.subtotal === 21000 && order.lines[0].agreed === true,
    String(order.subtotal),
  );
  const again = await j('/api/mp/quote', {
    method: 'POST',
    headers: { Authorization: `Bearer ${buyerToken}` },
    body: JSON.stringify({
      items: [{ listingId: order.lines[0].listingId, qty: 1 }],
      to: { lat: 14.765, lng: -17.44 },
    }),
  });
  check('accord utilisé : une seule commande par accord', again.status === 400);

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  console.log(res.join('\n'));
  await b.close();
})().catch(async e => {
  console.log(res.join('\n'));
  console.log('ERR', e.message);
  const pages = browser ? browser.contexts().flatMap(c => c.pages()) : [];
  for (const [i, pg] of pages.entries()) await pg.screenshot({ path: `${SP}/di-erreur-${i}.png` }).catch(() => {});
  process.exit(1);
});
