// Coupure de réseau (ou de courant chez l'opérateur) : les codes de remise partent aussi par SMS ;
// la cliente et le vendeur retrouvent leurs commandes et leurs codes sans réseau ; le livreur rouvre
// l'application hors ligne (service worker), livre avec le code de la cliente, et l'arrêt part tout seul
// au retour du réseau, avec l'heure réelle de la remise.
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
const login = async phone => {
  const s = await j('/api/auth/start', { method: 'POST', body: JSON.stringify({ phone }) });
  const v = await j('/api/auth/verify', { method: 'POST', body: JSON.stringify({ phone, code: s.body.devCode }) });
  return { Authorization: `Bearer ${v.body.token}` };
};
const serverLog = () => fs.readFileSync(path.join(SP, 'server.log'), 'utf8');
const smsTo = (phone, text) => serverLog().includes(`[SMS SIMULÉ] → ${phone}\n`) && serverLog().includes(text);

(async () => {
  await j('/api/admin/mp/settings', { method: 'PATCH', headers: A, body: JSON.stringify({ drivers: true }) });
  const HS = await login('77 540 00 01');
  await j('/api/mp/me/seller', {
    method: 'POST',
    headers: HS,
    body: JSON.stringify({ shopName: 'Awa Mode', category: 'mode', location: { lat: 14.686, lng: -17.452 } }),
  });
  const ph = await (
    await fetch(B + '/api/mp/me/photos', {
      method: 'POST',
      headers: { ...HS, 'content-type': 'image/jpeg' },
      body: PHOTO,
    })
  ).json();
  const robe = (
    await j('/api/mp/me/listings', {
      method: 'POST',
      headers: HS,
      body: JSON.stringify({ title: 'Robe wax', price: 12000, category: 'mode', photos: [ph.url] }),
    })
  ).body.listing.id;
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

  // ── 1. Commande : le code de remise de la cliente part aussi par SMS (arrive sans internet)
  const X = await login('78 640 00 01');
  const order = (
    await j('/api/mp/orders', {
      method: 'POST',
      headers: X,
      body: JSON.stringify({
        items: [{ listingId: robe, qty: 1 }],
        to: { lat: 14.765, lng: -17.44 },
        name: 'Khady',
        mode: 'express',
      }),
    })
  ).body.orders[0];
  const buyerCode = order.handoverCode;
  check('SMS à la cliente avec son code de remise', smsTo('+221786400001', `code de remise est ${buyerCode}`));

  const b = (browser = await chromium.launch());
  const errors = [];
  const mk = async (geo, sw = 'block') => {
    const ctx = await b.newContext({
      ...devices['Pixel 7'],
      serviceWorkers: sw,
      geolocation: { ...geo, accuracy: 12 },
      permissions: ['geolocation'],
    });
    await ctx.route(/pexels|fonts\.g|tile|openstreetmap|arcgis|wa\.me|nominatim|overpass/, r =>
      r.fulfill({ status: 204, body: '' }),
    );
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    return p;
  };
  const shot = (p, n) => p.screenshot({ path: `${SP}/hl-${n}.png` });
  const uiLogin = async (p, phone, firstName) => {
    await p.getByLabel('Numéro de téléphone').fill(phone);
    await p.getByRole('button', { name: /Continuer/ }).click();
    await p.waitForTimeout(800);
    const code = (await p.locator('strong.tracking-widest').innerText()).trim();
    await p.locator('#otp').fill(code);
    await p.waitForTimeout(1200);
    await p.getByLabel('Votre prénom').fill(firstName);
    await p.getByRole('button', { name: /Entrer dans mon espace/ }).click();
    await p.waitForTimeout(1500);
  };
  // Le téléphone garde l'application (service worker) : on la recharge une fois en ligne pour tout mettre en mémoire
  const install = async p => {
    await p.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await p.reload();
    await p.waitForTimeout(1500);
  };

  // ── 2. La cliente voit ses commandes et son code même sans réseau
  const c = await mk({ latitude: 14.765, longitude: -17.44 }, 'allow');
  await c.goto(B + '/m/commandes');
  await c.waitForTimeout(800);
  await c.getByRole('link', { name: 'Me connecter' }).click();
  await c.waitForTimeout(800);
  await uiLogin(c, '78 640 00 01', 'Khady');
  await c.waitForSelector('[data-testid="mp-handover-code"]', { timeout: 10000 });
  await install(c);
  await c.context().setOffline(true);
  await c.reload();
  await c.waitForSelector('[data-testid="mp-orders-offline"]', { timeout: 15000 });
  check('cliente hors ligne : bandeau « Pas de réseau »', await c.getByTestId('mp-offline').isVisible());
  check(
    'cliente hors ligne : application rouverte, toujours connectée, code visible',
    (await c.locator('[data-testid="mp-handover-code"] strong').innerText()).trim() === buyerCode,
  );
  await shot(c, '1-cliente-hors-ligne');
  await c.context().setOffline(false);

  // ── 3. Le vendeur prépare ; au départ du livreur, il reçoit son code par SMS
  await j(`/api/mp/me/sales/${order.id}`, {
    method: 'PATCH',
    headers: HS,
    body: JSON.stringify({ status: 'acceptee' }),
  });
  const sellerCode = (
    await j(`/api/mp/me/sales/${order.id}`, { method: 'PATCH', headers: HS, body: JSON.stringify({ status: 'prete' }) })
  ).body.order.pickupCode;

  const L = await mk({ latitude: 14.69, longitude: -17.45 }, 'allow');
  await L.goto(B + '/m/livreur');
  await L.waitForTimeout(800);
  await L.getByRole('link', { name: 'Me connecter' }).click();
  await L.waitForTimeout(800);
  await uiLogin(L, '76 740 00 01', 'Moussa');
  await L.getByLabel('Nom et prénom *').fill('Moussa Diop');
  await L.getByTestId('mp-driver-save').click();
  await L.waitForSelector('[data-testid="mp-driver-pending"]', { timeout: 10000 });
  const drv = (await j('/api/admin/mp/drivers', { headers: A })).body.drivers[0];
  await j(`/api/admin/mp/drivers/${drv.id}`, {
    method: 'PATCH',
    headers: A,
    body: JSON.stringify({ status: 'active' }),
  });
  await L.reload();
  await L.waitForSelector('[data-testid="mp-driver"]', { timeout: 10000 });
  await L.getByTestId('mp-driver-online').click();
  await L.waitForSelector('[data-testid="mp-offer"]', { timeout: 10000 });
  await L.getByTestId('mp-offer-accept').click();
  await L.waitForSelector('[data-testid="mp-driver-trip"]', { timeout: 10000 });
  check(
    'SMS au vendeur avec son code quand le livreur part',
    smsTo('+221775400001', `ce code de remise : ${sellerCode}`),
  );
  const card = () => L.locator('[data-testid="mp-stop"]:has([data-testid="mp-stop-code"])').first();
  await card().getByTestId('mp-stop-code').fill(sellerCode);
  await card().getByTestId('mp-stop-enlevement').click();
  await L.waitForTimeout(1000);

  // ── 4. Coupure : le livreur rouvre l'application sans réseau et livre avec le code de la cliente
  await install(L);
  await L.context().setOffline(true);
  await L.reload();
  await L.waitForSelector('[data-testid="mp-driver-offline"]', { timeout: 15000 });
  check('livreur hors ligne : la course enregistrée s’affiche', (await L.getByTestId('mp-stop').count()) === 2);
  L.once('dialog', d => d.accept());
  await card().getByTestId('mp-stop-code').fill(buyerCode);
  await card().getByTestId('mp-stop-depot').click();
  await L.waitForSelector('[data-testid="mp-stop-pending"]', { timeout: 10000 });
  check('arrêt gardé sur le téléphone, « envoi dès le retour du réseau »', true);
  await shot(L, '2-livreur-hors-ligne');
  const before = (await j('/api/admin/mp/orders', { headers: A })).body.orders.find(o => o.id === order.id);
  check('serveur : pas encore livrée (rien n’est parti)', before.status === 'en_livraison');

  // ── 5. Le réseau revient : l'arrêt part tout seul, le serveur vérifie le code
  await L.context().setOffline(false);
  await L.waitForFunction(() => !document.querySelector('[data-testid="mp-stop-pending"]'), null, { timeout: 30000 });
  const after = (await j('/api/admin/mp/orders', { headers: A })).body.orders.find(o => o.id === order.id);
  check('au retour du réseau : commande livrée', after.status === 'livree', after.status);
  const trip = (await j('/api/admin/mp/trips', { headers: A })).body.trips.find(t => t.id === after.delivery.tripId);
  const depot = trip.stops.find(s => s.kind === 'depot');
  check(
    'heure réelle de la remise gardée (hors ligne)',
    !!depot.offlineAt && Date.parse(depot.offlineAt) <= Date.parse(depot.at),
    `${depot.offlineAt} / ${depot.at}`,
  );
  check(
    'registre : livraison enregistrée',
    (await j('/api/admin/mp/ledger', { headers: A })).body.entries.some(
      e => e.type === 'livraison' && e.data.orderId === order.id,
    ),
  );

  // ── 6. Le vendeur, sans réseau, retrouve sa boutique (pas le formulaire « Ouvrir ma boutique »)
  const v = await mk({ latitude: 14.686, longitude: -17.452 }, 'allow');
  await v.goto(B + '/m/vendre');
  await v.waitForTimeout(800);
  await v.getByRole('link', { name: /Me connecter pour commencer/ }).click();
  await v.waitForTimeout(800);
  await uiLogin(v, '77 540 00 01', 'Awa');
  await v.waitForSelector('[data-testid="mp-seller-space"]', { timeout: 10000 });
  await install(v);
  await v.context().setOffline(true);
  await v.reload();
  await v.waitForSelector('[data-testid="mp-seller-space"]', { timeout: 15000 });
  check(
    'vendeur hors ligne : sa boutique s’affiche',
    (await v.getByTestId('mp-shop-form').count()) === 0 && /Pas de réseau/.test(await v.locator('body').innerText()),
  );
  await v.context().setOffline(false);

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  console.log(res.join('\n'));
  await b.close();
})().catch(async e => {
  console.log(res.join('\n'));
  console.log('ERR', e.message);
  const pages = browser ? browser.contexts().flatMap(c => c.pages()) : [];
  for (const [i, pg] of pages.entries()) await pg.screenshot({ path: `${SP}/hl-erreur-${i}.png` }).catch(() => {});
  process.exit(1);
});
