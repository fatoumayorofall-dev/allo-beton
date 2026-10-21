// Boutique en ligne d'une abonnée : elle personnalise sa vitrine (logo, bannière, couleur), récupère son lien
// court et son QR code ; le lien mène à sa boutique (aperçu WhatsApp avec son nom) ; l'annuaire des boutiques
// ne montre aucun prix ; dans la boutique, les prix et la recherche.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const SP = process.env.SP;
const B = 'http://localhost:8787';
const A = { 'x-admin-pin': '2026', 'content-type': 'application/json' };
const PHOTO = path.join(__dirname, '../fixtures/photos/p0.jpg');
const PHOTO2 = path.join(__dirname, '../fixtures/photos/p1.jpg');
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
  const token = await login('77 570 00 01');
  const H = { Authorization: `Bearer ${token}` };
  await j('/api/mp/me/seller', {
    method: 'POST',
    headers: H,
    body: JSON.stringify({
      shopName: 'Chez Awa Mode',
      category: 'mode',
      zone: 'Médina',
      description: 'Robes wax cousues à Dakar.',
      location: { lat: 14.686, lng: -17.452 },
    }),
  });
  for (const [title, price] of [
    ['Robe wax longue', 15000],
    ['Chemise wax homme', 9000],
  ]) {
    const ph = await (
      await fetch(B + '/api/mp/me/photos', {
        method: 'POST',
        headers: { ...H, 'content-type': 'image/jpeg' },
        body: fs.readFileSync(PHOTO),
      })
    ).json();
    await j('/api/mp/me/listings', {
      method: 'POST',
      headers: H,
      body: JSON.stringify({ title, price, category: 'mode', photos: [ph.url] }),
    });
  }

  const b = (browser = await chromium.launch());
  const errors = [];
  const mk = async (tok, device = 'Pixel 7') => {
    const ctx = await b.newContext({ ...devices[device], serviceWorkers: 'block' });
    await ctx.route(/pexels|fonts\.g|tile|openstreetmap|arcgis|wa\.me|nominatim|overpass/, r =>
      r.fulfill({ status: 204, body: '' }),
    );
    if (tok) await ctx.addInitScript(t => localStorage.setItem('maefa_token', t), tok);
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    return p;
  };

  // ── 1. La vendeuse personnalise sa vitrine
  const v = await mk(token);
  await v.goto(B + '/m/vendre');
  await v.waitForSelector('[data-testid="mp-seller-space"]', { timeout: 15000 });
  // Le lien de la boutique et son QR code sont dans « Attirer des clientes »
  await v.getByRole('tab', { name: 'Attirer des clientes' }).click();
  await v.waitForSelector('[data-testid="mp-shop-link"]', { timeout: 15000 });
  const url = (await v.getByTestId('mp-shop-link-url').innerText()).trim();
  check('lien court de la boutique', /\/b\/chez-awa-mode$/.test(url), url);
  await v.waitForSelector('[data-testid="mp-shop-qr"]', { timeout: 10000 });
  check('QR code à imprimer', /^data:image\/png/.test(await v.getByTestId('mp-shop-qr').getAttribute('src')));
  await v.getByRole('tab', { name: 'Infos boutique' }).click();
  await v.getByTestId('mp-shop-logo').setInputFiles(PHOTO2);
  await v.getByTestId('mp-shop-cover').setInputFiles(PHOTO);
  await v.waitForFunction(() => document.querySelectorAll('[data-testid="mp-shop-look"] img').length === 2, null, {
    timeout: 20000,
  });
  await v.getByRole('radio', { name: 'Émeraude' }).click();
  await v.screenshot({ path: `${SP}/vt-1-vitrine.png` });
  await v.getByTestId('mp-shop-save').click();
  await v.waitForTimeout(1500);
  const mine = (await j('/api/mp/me/seller', { headers: H })).body.seller;
  check('vitrine enregistrée (logo, bannière, couleur)', !!mine.logo && !!mine.cover && mine.accent === 'emeraude');

  for (const s of (await j('/api/admin/mp/sellers', { headers: A })).body.sellers)
    await j(`/api/admin/mp/sellers/${s.id}`, {
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

  // ── 2. Le lien court et l'aperçu du lien (WhatsApp, Facebook)
  const r = await fetch(`${B}/b/chez-awa-mode`, { redirect: 'manual' });
  check('lien court → boutique', r.status === 302 && r.headers.get('location') === '/m/boutique/chez-awa-mode');
  const html = await (await fetch(`${B}/m/boutique/chez-awa-mode`)).text();
  check(
    'aperçu du lien : nom de la boutique et bannière',
    /og:title" content="Chez Awa Mode — boutique en ligne/.test(html) && /og:image" content="[^"]*\/media\//.test(html),
  );

  // ── 3. L'annuaire : aucune donnée de prix
  const shops = (await j('/api/mp/shops')).body.shops;
  check(
    'annuaire : la boutique, sans aucun prix',
    shops.length === 1 && !/price|15000|9000/i.test(JSON.stringify(shops)),
  );
  const order = async tri => (await j(`/api/mp/listings?tri=${tri}`)).body.listings.map(l => l.title).join(',');
  check('tri par prix désactivé', (await order('prix_asc')) === (await order('prix_desc')));

  // ── 4. La cliente ouvre le lien partagé
  const c = await mk(null);
  await c.goto(`${B}/b/chez-awa-mode`);
  await c.waitForSelector('[data-testid="mp-shop"]', { timeout: 15000 });
  check(
    'vitrine : bannière et couleur de la boutique',
    (await c.locator('[data-testid="mp-shop-cover"] img').count()) === 1 &&
      /rgb\(17, 105, 79\)/.test(
        await c.getByTestId('mp-shop-share').evaluate(e => getComputedStyle(e).backgroundColor),
      ),
  );
  check('vitrine : prix visibles dans la boutique', /15\s000 F/.test(await c.getByTestId('mp-shop-grid').innerText()));
  await c.screenshot({ path: `${SP}/vt-2-boutique.png` });
  await c.getByTestId('mp-shop-search').fill('chemise');
  check('recherche dans la boutique', (await c.getByTestId('mp-shop-grid').getByTestId('mp-card').count()) === 1);
  await c.goto(`${B}/m`);
  await c.waitForSelector('[data-testid="mp-shop-card"]', { timeout: 10000 });
  check(
    'accueil : la boutique dans l’annuaire, sans prix',
    !/\d\s?\d{3} F/.test(await c.locator('[data-testid="marketplace"] main').innerText()),
  );
  await c.screenshot({ path: `${SP}/vt-3-annuaire.png` });

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  console.log(res.join('\n'));
  await b.close();
})().catch(async e => {
  console.log(res.join('\n'));
  console.log('ERR', e.message);
  const pages = browser ? browser.contexts().flatMap(c => c.pages()) : [];
  for (const [i, pg] of pages.entries()) await pg.screenshot({ path: `${SP}/vt-erreur-${i}.png` }).catch(() => {});
  process.exit(1);
});
