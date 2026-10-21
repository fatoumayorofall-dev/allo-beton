// Tableau de bord des ventes de chaque vendeuse : ventes livrées, ce qu'elle garde, commandes par étape,
// visites, clientes fidèles, articles les plus vendus, ventes en live, courbe, export Excel ; la gérante peut
// l'ouvrir pour l'aider ; jamais un numéro de cliente.
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

(async () => {
  const rokhaya = await login('77 593 00 01', 'Rokhaya');
  const H = auth(rokhaya);
  await j('/api/mp/me/seller', {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ shopName: 'Rokhaya Style', category: 'mode', location: { lat: 14.69, lng: -17.45 } }),
  });
  const ids = {};
  for (const [title, price] of [
    ['Robe soirée', 12000],
    ['Sac tressé', 25000],
  ]) {
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

  // Visites : 6 téléphones regardent la robe, 3 le sac
  for (let i = 1; i <= 6; i++)
    await j(`/api/mp/listings/${ids['Robe soirée']}`, { headers: { 'x-forwarded-for': `10.0.0.${i}` } });
  for (let i = 1; i <= 3; i++)
    await j(`/api/mp/listings/${ids['Sac tressé']}`, { headers: { 'x-forwarded-for': `10.0.1.${i}` } });

  // Commandes : Khady (2 livrées : fidèle), Fatou (1 refusée, 1 en attente), Awa (achat en live)
  const order = async (token, items, name) =>
    (
      await j('/api/mp/orders', {
        method: 'POST',
        headers: auth(token),
        body: JSON.stringify({ items, to: TO, name, payment: 'wave' }),
      })
    ).body.orders[0].id;
  const deliver = async id => {
    for (const status of ['acceptee', 'prete', 'en_livraison', 'livree'])
      await j(`/api/mp/me/sales/${id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ status }) });
  };
  const khady = await login('78 693 00 01', 'Khady');
  const fatou = await login('78 693 00 02', 'Fatou');
  const awa = await login('78 693 00 03', 'Awa');
  await deliver(await order(khady, [{ listingId: ids['Robe soirée'], qty: 2 }], 'Khady'));
  await deliver(await order(khady, [{ listingId: ids['Sac tressé'], qty: 1 }], 'Khady'));
  const refused = await order(fatou, [{ listingId: ids['Robe soirée'], qty: 1 }], 'Fatou');
  await j(`/api/mp/me/sales/${refused}`, {
    method: 'PATCH',
    headers: H,
    body: JSON.stringify({ status: 'refusee', reason: 'Plus de taille M' }),
  });
  await order(fatou, [{ listingId: ids['Sac tressé'], qty: 1 }], 'Fatou');
  const live = (
    await j('/api/mp/me/lives', {
      method: 'POST',
      headers: H,
      body: JSON.stringify({
        title: 'Sacs du week-end',
        products: [{ listingId: ids['Sac tressé'], livePrice: 20000 }],
      }),
    })
  ).body.live;
  await deliver(await order(awa, [{ listingId: ids['Sac tressé'], qty: 1 }], 'Awa'));
  await j(`/api/mp/me/lives/${live.id}/end`, { method: 'POST', headers: H, body: '{}' });

  // ── 1. Les chiffres (serveur)
  const d = (await j('/api/mp/me/dashboard?jours=30', { headers: H })).body.dashboard;
  check('ventes livrées : 69 000 F', d.revenue === 24000 + 25000 + 20000, String(d.revenue));
  check('je garde : 64 170 F (commission 7 %)', d.net === 64170 && d.commission === 4830, `${d.net} / ${d.commission}`);
  check(
    'commandes : 5 reçues, 3 livrées, 1 en cours, 1 refusée',
    JSON.stringify(d.orders) === JSON.stringify({ created: 5, delivered: 3, inProgress: 1, cancelled: 1, failed: 0 }),
    JSON.stringify(d.orders),
  );
  check('panier moyen : 23 000 F', d.avgBasket === 23000);
  check('visites : 9', d.views === 9, String(d.views));
  check('clientes : 3, dont 1 fidèle', d.buyers === 3 && d.loyal === 1);
  check(
    'articles les plus vendus : sac puis robe',
    d.top[0]?.title === 'Sac tressé' && d.top[0].amount === 45000 && d.top[1]?.title === 'Robe soirée',
  );
  check('ventes en live : 20 000 F', d.channels.live === 20000 && d.channels.affiche === 49000);
  check('bilan du live gardé', d.lives[0]?.title === 'Sacs du week-end' && d.lives[0].sales === 1);
  check('aucun numéro de cliente', !JSON.stringify(d).includes('+221'));
  const none = await j('/api/mp/me/dashboard', { headers: auth(khady) });
  check('sans boutique : pas de tableau de bord', none.status === 404);
  const sellerId = (await j('/api/mp/me/seller', { headers: H })).body.seller.id;
  const admin = (await j(`/api/admin/mp/sellers/${sellerId}/dashboard?jours=7`, { headers: A })).body.dashboard;
  check('gérante : même tableau de bord', admin?.revenue === 69000);
  check('gérante seulement', (await j(`/api/admin/mp/sellers/x/dashboard`)).status === 403);

  // ── 2. L'écran de la vendeuse
  const b = (browser = await chromium.launch());
  const errors = [];
  const ctx = await b.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block', acceptDownloads: true });
  await ctx.route(/pexels|fonts\.g|tile|openstreetmap|arcgis|wa\.me|nominatim|overpass/, r =>
    r.fulfill({ status: 204, body: '' }),
  );
  await ctx.addInitScript(t => localStorage.setItem('maefa_token', t), rokhaya);
  const v = await ctx.newPage();
  v.on('pageerror', e => errors.push(e.message));
  await v.goto(`${B}/m/vendre`);
  await v.waitForSelector('[data-testid="mp-seller-space"]', { timeout: 15000 });
  await v.getByRole('tab', { name: 'Tableau de bord' }).click();
  await v.waitForSelector('[data-testid="mp-dash-revenue"]', { timeout: 15000 });
  check('écran : ventes livrées', /69\s000 F/.test(await v.getByTestId('mp-dash-revenue').innerText()));
  check('écran : je garde', /64\s170 F/.test(await v.getByTestId('mp-dash-net').innerText()));
  check(
    'écran : commandes par étape',
    /3 livrée\(s\) · 1 en cours · 1 annulée\(s\)/.test(await v.getByTestId('mp-dash-orders').innerText()),
  );
  check('écran : clientes fidèles', /1 fidèle/.test(await v.getByTestId('mp-dash-buyers').innerText()));
  check('courbe : 30 jours', (await v.locator('[data-testid="mp-dash-chart"] rect').count()) === 30);
  check('écran : ventes en live', /Lives : 20\s000 F/.test(await v.getByTestId('mp-dash-channels').innerText()));
  check('écran : mes lives', /Sacs du week-end/.test(await v.getByTestId('mp-dash-lives').innerText()));
  await v.screenshot({ path: `${SP}/tb-1-tableau.png`, fullPage: true });
  await v.getByRole('tab', { name: '12 mois' }).click();
  await v.waitForFunction(() => document.querySelectorAll('[data-testid="mp-dash-chart"] rect').length === 12, null, {
    timeout: 10000,
  });
  check('12 mois : une barre par mois', true);

  // Export pour la comptabilité
  const [dl] = await Promise.all([v.waitForEvent('download'), v.getByTestId('mp-dash-export').click()]);
  const file = path.join(SP, 'tb-ventes.csv');
  await dl.saveAs(file);
  const csv = fs.readFileSync(file, 'utf8');
  const lines = csv.trim().split(/\r\n/);
  check('export : en-têtes en français', /"Date";"Commande";"Étape";"Articles";.*"Je garde \(F\)"/.test(lines[0]));
  check('export : 5 commandes', lines.length === 6, String(lines.length));
  check('export : ni numéro ni nom de cliente', !/\+221|\b7[05678]\s?\d{3}\s?\d{2}\s?\d{2}\b|Khady|Fatou/.test(csv));

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  console.log(res.join('\n'));
  await b.close();
})().catch(async e => {
  console.log(res.join('\n'));
  console.log('ERR', e.message);
  const pages = browser ? browser.contexts().flatMap(c => c.pages()) : [];
  for (const [i, pg] of pages.entries()) await pg.screenshot({ path: `${SP}/tb-erreur-${i}.png` }).catch(() => {});
  process.exit(1);
});
