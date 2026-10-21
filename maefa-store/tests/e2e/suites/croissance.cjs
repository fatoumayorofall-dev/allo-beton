// Attirer des clientes sans publicité, et les revenus de la plateforme :
//  - parrainage : une vendeuse ouvre sa boutique avec le lien d'une autre ; à sa première vente livrée,
//    la marraine gagne 1 mois de formule Pro (noté au registre) ;
//  - « Suivre » une boutique : la cliente est prévenue sur WhatsApp des nouveautés (une fois par jour au plus) ;
//  - image prête pour le statut WhatsApp (1080 × 1920, lien et QR code) ;
//  - « À la une » (payé à la semaine) : en tête de l'annuaire, badge, recette au tableau de bord ;
//  - moitié-moitié : inviter ses voisines ; Google : boutiques et articles dans le plan du site, sans prix.
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
  if (firstName)
    await j('/api/me', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${v.body.token}` },
      body: JSON.stringify({ firstName }),
    });
  return v.body.token;
};
const auth = t => ({ Authorization: `Bearer ${t}` });
/** Largeur et hauteur d'une image JPEG (lues dans l'en-tête) */
const jpegSize = buf => {
  for (let i = 2; i < buf.length - 9;) {
    if (buf[i] !== 0xff) return null;
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xc2) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
};
const log = () => fs.readFileSync(path.join(SP, 'server.log'), 'utf8');
const publishAll = async () => {
  for (const v of (await j('/api/admin/mp/sellers', { headers: A })).body.sellers)
    if (v.status !== 'active')
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
};
const addListing = async (token, title, price) => {
  const ph = await (
    await fetch(B + '/api/mp/me/photos', {
      method: 'POST',
      headers: { ...auth(token), 'content-type': 'image/jpeg' },
      body: PHOTO,
    })
  ).json();
  return (
    await j('/api/mp/me/listings', {
      method: 'POST',
      headers: auth(token),
      body: JSON.stringify({ title, price, category: 'mode', photos: [ph.url] }),
    })
  ).body.listing;
};

(async () => {
  // La marraine : Awa a déjà sa boutique
  const awa = await login('77 591 00 01', 'Awa');
  await j('/api/mp/me/seller', {
    method: 'POST',
    headers: auth(awa),
    body: JSON.stringify({ shopName: 'Awa Couture', category: 'mode', location: { lat: 14.69, lng: -17.45 } }),
  });
  await addListing(awa, 'Robe brodée', 18000);
  const code = (await j('/api/mp/me/seller', { headers: auth(awa) })).body.seller.referralCode;
  check('code de parrainage créé', /^[A-Z0-9]{6}$/.test(code ?? ''), code);

  const b = (browser = await chromium.launch());
  const errors = [];
  const mk = async (tok, geolocation) => {
    const ctx = await b.newContext({
      ...devices['Pixel 7'],
      serviceWorkers: 'block',
      acceptDownloads: true,
      ...(geolocation ? { geolocation: { ...geolocation, accuracy: 12 }, permissions: ['geolocation'] } : {}),
    });
    await ctx.route(/pexels|fonts\.g|tile|openstreetmap|arcgis|wa\.me|nominatim|overpass/, r =>
      r.fulfill({ status: 204, body: '' }),
    );
    if (tok) await ctx.addInitScript(t => localStorage.setItem('maefa_token', t), tok);
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    return p;
  };

  // ── 1. Bineta ouvre sa boutique avec le lien d'Awa (elle se connecte après avoir cliqué le lien)
  const bineta = await login('77 591 00 02', 'Bineta');
  const v = await mk(null, { latitude: 14.716, longitude: -17.467 });
  await v.goto(`${B}/m/vendre?parrain=${code}`);
  await v.waitForSelector('[data-testid="mp-sell-guest"]', { timeout: 15000 });
  check(
    'lien de parrainage gardé sur le téléphone',
    (await v.evaluate(() => localStorage.getItem('mp_parrain'))) === code,
  );
  await v.evaluate(t => localStorage.setItem('maefa_token', t), bineta);
  await v.goto(`${B}/m/vendre`);
  await v.getByLabel('Nom de la boutique *').fill('Bineta Wax');
  await v.getByLabel('Ce que vous vendez *').selectOption('mode');
  await v.getByLabel('Quartier / ville').fill('Liberté 6');
  await v
    .getByRole('button', { name: /Je suis ici/ })
    .first()
    .click();
  await v.waitForFunction(() => !document.querySelector('[data-testid="gps-progress"]'), null, { timeout: 30000 });
  await v.getByTestId('confirm-location').click();
  await v.waitForTimeout(700);
  await v.getByTestId('mp-shop-save').click();
  await v.waitForSelector('[data-testid="mp-seller-space"]', { timeout: 15000 });
  const sellers = (await j('/api/admin/mp/sellers', { headers: A })).body.sellers;
  const sA = sellers.find(x => x.shopName === 'Awa Couture');
  const sB = sellers.find(x => x.shopName === 'Bineta Wax');
  check('boutique ouverte avec le parrainage d’Awa', sA.referrals === 1, JSON.stringify({ r: sA.referrals }));
  check('code utilisé, retiré du téléphone', (await v.evaluate(() => localStorage.getItem('mp_parrain'))) === null);

  const boubou = await addListing(bineta, 'Boubou brodé', 20000);
  await publishAll();

  // ── 2. Une cliente suit la boutique de Bineta
  const khady = await login('78 691 00 01', 'Khady');
  const c = await mk(khady);
  await c.goto(`${B}/m/boutique/${sB.slug}`);
  await c.waitForSelector('[data-testid="mp-shop-follow"]', { timeout: 15000 });
  await c.getByTestId('mp-shop-follow').click();
  await c.waitForFunction(
    () => /Abonnée\s*·\s*1/.test(document.querySelector('[data-testid="mp-shop-follow"]')?.textContent ?? ''),
    null,
    { timeout: 10000 },
  );
  check('cliente : « Abonnée · 1 »', true);
  await c.screenshot({ path: `${SP}/cr-1-suivre.png` });
  await c.reload();
  await c.waitForSelector('[data-testid="mp-shop-follow"][aria-pressed="true"]', { timeout: 10000 });
  check('abonnement gardé après rechargement', true);
  const own = await j(`/api/mp/sellers/${sB.slug}/follow`, { method: 'POST', headers: auth(bineta), body: '{}' });
  check('suivre sa propre boutique : refusé', own.status === 400);

  // Nouveaux articles : la cliente abonnée est prévenue, une seule fois dans la journée
  await addListing(bineta, 'Ensemble wax', 15000);
  await publishAll();
  await addListing(bineta, 'Pagne tissé', 9000);
  await publishAll();
  await new Promise(r => setTimeout(r, 500));
  const news = log().match(/Nouveautés chez « Bineta Wax »/g) ?? [];
  check('abonnée prévenue des nouveautés (WhatsApp)', news.length === 1, `${news.length} message(s)`);
  check('le message contient le lien de la boutique', new RegExp(`/b/${sB.slug}`).test(log()));

  // ── 3. Première vente livrée de Bineta : Awa gagne 1 mois de formule Pro
  const order = (
    await j('/api/mp/orders', {
      method: 'POST',
      headers: auth(khady),
      body: JSON.stringify({ items: [{ listingId: boubou.id, qty: 1 }], to: TO, name: 'Khady', payment: 'especes' }),
    })
  ).body;
  const oid = order.orders?.[0]?.id;
  for (const status of ['acceptee', 'prete', 'en_livraison', 'livree'])
    await j(`/api/mp/me/sales/${oid}`, { method: 'PATCH', headers: auth(bineta), body: JSON.stringify({ status }) });
  const awaNow = (await j('/api/mp/me/seller', { headers: auth(awa) })).body.seller;
  check(
    'marraine : formule Pro offerte (1 mois)',
    awaNow.plan === 'pro' && awaNow.referralMonths === 1,
    JSON.stringify({ plan: awaNow.plan, m: awaNow.referralMonths }),
  );
  const ledger = (await j('/api/admin/mp/ledger', { headers: A })).body;
  check(
    'registre : mois offert noté (montant 0), chaîne intacte',
    ledger.entries.some(e => e.type === 'parrainage' && e.data.amount === 0 && e.data.sellerId === sA.id) &&
      ledger.check.ok,
  );
  check('marraine prévenue sur WhatsApp', /1 mois de formule Pro offert/.test(log()));
  // Une deuxième vente ne redonne rien
  const o2 = (
    await j('/api/mp/orders', {
      method: 'POST',
      headers: auth(khady),
      body: JSON.stringify({ items: [{ listingId: boubou.id, qty: 1 }], to: TO, name: 'Khady', payment: 'especes' }),
    })
  ).body.orders?.[0]?.id;
  for (const status of ['acceptee', 'prete', 'en_livraison', 'livree'])
    await j(`/api/mp/me/sales/${o2}`, { method: 'PATCH', headers: auth(bineta), body: JSON.stringify({ status }) });
  check(
    'une seule récompense par boutique parrainée',
    (await j('/api/mp/me/seller', { headers: auth(awa) })).body.seller.referralMonths === 1,
  );

  // Awa voit son parrainage dans son espace
  const a = await mk(awa);
  await a.goto(`${B}/m/vendre`);
  await a.waitForSelector('[data-testid="mp-seller-space"]', { timeout: 15000 });
  await a.getByRole('tab', { name: 'Attirer des clientes' }).click();
  const stats = await a.getByTestId('mp-referral-stats').innerText();
  check(
    'espace vendeuse : 1 boutique venue, 1 mois gagné',
    /1 boutique venue[\s\S]*1 mois Pro gagné/.test(stats),
    stats,
  );
  check(
    'lien de parrainage affiché',
    (await a.getByTestId('mp-referral-link').innerText()).includes(`/m/vendre?parrain=${code}`),
  );

  // ── 4. Image pour le statut WhatsApp (boutique et article)
  const [dl] = await Promise.all([a.waitForEvent('download'), a.getByTestId('mp-shop-status').click()]);
  const file = path.join(SP, 'cr-statut-boutique.jpg');
  await dl.saveAs(file);
  const size = jpegSize(fs.readFileSync(file));
  check('image de statut 1080 × 1920', size?.w === 1080 && size?.h === 1920, JSON.stringify(size));
  await a.screenshot({ path: `${SP}/cr-2-attirer.png`, fullPage: true });
  await c.goto(`${B}/m/annonce/${boubou.id}`);
  await c.waitForSelector('[data-testid="mp-listing-status"]', { timeout: 15000 });
  const [dl2] = await Promise.all([c.waitForEvent('download'), c.getByTestId('mp-listing-status').click()]);
  const file2 = path.join(SP, 'cr-statut-article.jpg');
  await dl2.saveAs(file2);
  check('cliente : image de l’article pour son statut', jpegSize(fs.readFileSync(file2))?.h === 1920);

  // ── 5. « À la une » : Bineta demande, la gérante active après le paiement Wave
  await v.goto(`${B}/m/vendre`);
  await v.waitForSelector('[data-testid="mp-seller-space"]', { timeout: 15000 });
  await v.getByRole('tab', { name: 'Attirer des clientes' }).click();
  await v.getByTestId('mp-request-boost').click();
  await v.waitForSelector('[data-testid="mp-boost-sent"]', { timeout: 10000 });
  check(
    'vendeuse : demande « À la une » envoyée (prix par Wave)',
    /2\s000 F/.test(await v.getByTestId('mp-boost-sent').innerText()),
  );
  const before = (await j('/api/mp/shops')).body.shops.map(s => s.shopName);
  check('avant : la boutique Pro (Awa) en tête', before[0] === 'Awa Couture', before.join(','));
  const bad = await j(`/api/admin/mp/sellers/${sB.id}/boost`, { method: 'POST', headers: A, body: '{"weeks":13}' });
  check('« À la une » : 1 à 12 semaines', bad.status === 400);
  await j(`/api/admin/mp/sellers/${sB.id}/boost`, { method: 'POST', headers: A, body: '{"weeks":1}' });
  const after = (await j('/api/mp/shops')).body.shops;
  check('après : Bineta « À la une » en tête', after[0].shopName === 'Bineta Wax' && after[0].featured === true);
  const ov = (await j('/api/admin/mp/overview', { headers: A })).body;
  check('tableau de bord : recette « À la une » 2 000 F', ov.boosts === 2000, String(ov.boosts));
  check(
    'registre : mise en avant notée',
    (await j('/api/admin/mp/ledger', { headers: A })).body.entries.some(
      e => e.type === 'mise_en_avant' && e.data.amount === 2000,
    ),
  );
  await c.goto(`${B}/m`);
  await c.waitForSelector('[data-testid="mp-shop-card"]', { timeout: 15000 });
  check(
    'accueil : badge « À la une » sur la première boutique',
    (await c.getByTestId('mp-shop-card').first().getByTestId('mp-featured').count()) === 1,
  );
  await c.screenshot({ path: `${SP}/cr-3-a-la-une.png` });

  // ── 6. Moitié-moitié : inviter ses voisines
  await j('/api/admin/mp/settings', { method: 'PATCH', headers: A, body: JSON.stringify({ drivers: true }) });
  const fatou = await login('78 691 00 02', 'Fatou');
  const shared = await j('/api/mp/orders', {
    method: 'POST',
    headers: auth(fatou),
    body: JSON.stringify({
      items: [{ listingId: boubou.id, qty: 1 }],
      to: TO,
      name: 'Fatou',
      mode: 'partagee',
      payment: 'especes',
    }),
  });
  check('commande moitié-moitié passée', shared.status === 201 || shared.status === 200, String(shared.status));
  const f = await mk(fatou);
  await f.goto(`${B}/m/commandes`);
  await f.waitForSelector('[data-testid="mp-order-invite"]', { timeout: 15000 });
  check(
    'bouton « Inviter mes voisines » (WhatsApp)',
    /wa\.me/.test(await f.getByTestId('mp-order-invite').getAttribute('href')),
  );
  await f.screenshot({ path: `${SP}/cr-4-voisines.png` });

  // ── 7. Google : boutiques et articles dans le plan du site ; aperçu d'un article sans prix
  const sitemap = await (await fetch(`${B}/sitemap.xml`)).text();
  check(
    'plan du site : boutiques et articles',
    sitemap.includes(`/m/boutique/${sB.slug}`) && sitemap.includes(`/m/annonce/${boubou.id}`),
  );
  const html = await (await fetch(`${B}/m/annonce/${boubou.id}`)).text();
  const og = (html.match(/<meta property="og:[^>]+>/g) ?? []).join('\n');
  check('aperçu du lien : article et boutique', /og:title" content="Boubou brodé — Bineta Wax/.test(og));
  check('aperçu du lien : aucun prix', !/20\s?000/.test(og));

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  console.log(res.join('\n'));
  await b.close();
})().catch(async e => {
  console.log(res.join('\n'));
  console.log('ERR', e.message);
  const pages = browser ? browser.contexts().flatMap(c => c.pages()) : [];
  for (const [i, pg] of pages.entries()) await pg.screenshot({ path: `${SP}/cr-erreur-${i}.png` }).catch(() => {});
  process.exit(1);
});
