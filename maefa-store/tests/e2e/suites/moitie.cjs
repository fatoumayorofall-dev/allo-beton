// Livraison moitié-moitié avec un livreur de la plateforme (méthode A pour l'argent) :
// deux clientes partagent une course, chacune paie moins ; le livreur enlève, livre, encaisse,
// envoie leur part aux vendeurs ; la plateforme touche ses commissions par le livreur.
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

(async () => {
  // ── Mise en place : livreurs de la plateforme activés, deux boutiques proches (Médina, Sandaga)
  await j('/api/admin/mp/settings', { method: 'PATCH', headers: A, body: JSON.stringify({ drivers: true }) });
  const shops = [];
  for (const [phone, shopName, loc] of [
    ['77 800 00 01', 'Awa Mode', { lat: 14.686, lng: -17.452 }],
    ['77 800 00 02', 'Sandaga Style', { lat: 14.672, lng: -17.437 }],
  ]) {
    const H = await login(phone);
    await j('/api/mp/me/seller', {
      method: 'POST',
      headers: H,
      body: JSON.stringify({ shopName, category: 'mode', location: loc }),
    });
    const ph = await (
      await fetch(B + '/api/mp/me/photos', {
        method: 'POST',
        headers: { ...H, 'content-type': 'image/jpeg' },
        body: PHOTO,
      })
    ).json();
    const l = await j('/api/mp/me/listings', {
      method: 'POST',
      headers: H,
      body: JSON.stringify({ title: `Robe ${shopName}`, price: 10000, category: 'mode', photos: [ph.url] }),
    });
    shops.push({ H, listing: l.body.listing.id });
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

  const b = (browser = await chromium.launch());
  const errors = [];
  const mk = async geo => {
    const ctx = await b.newContext({
      ...devices['Pixel 7'],
      serviceWorkers: 'block',
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
  const shot = (p, n) => p.screenshot({ path: `${SP}/mm-${n}.png` });
  const uiLogin = async (p, phone, firstName) => {
    await p.getByLabel('Numéro de téléphone').fill(phone);
    await p.getByRole('button', { name: /Continuer/ }).click();
    await p.waitForTimeout(800);
    const codeTxt = (await p.locator('strong.tracking-widest').innerText()).trim();
    await p.locator('#otp').fill(codeTxt);
    await p.waitForTimeout(1200);
    await p.getByLabel('Votre prénom').fill(firstName);
    await p.getByRole('button', { name: /Entrer dans mon espace/ }).click();
    await p.waitForTimeout(1500);
  };
  const buy = async (p, listingId, phone, firstName) => {
    await p.goto(B + `/m/annonce/${listingId}`);
    await p.getByTestId('mp-buy').click();
    await p.waitForTimeout(800);
    await p.getByTestId('mp-confirm').click();
    await p.waitForTimeout(800);
    await uiLogin(p, phone, firstName);
    await p
      .getByRole('button', { name: /Je suis ici/ })
      .first()
      .click();
    await p.waitForFunction(() => !document.querySelector('[data-testid="gps-progress"]'), null, { timeout: 30000 });
    await p.getByTestId('confirm-location').click();
    await p.waitForSelector('[data-testid="mp-delivery-mode"]', { timeout: 10000 });
  };

  // ── 1. Première cliente (Parcelles) : moitié-moitié, départ au plus tard dans 1 h
  const c1 = await mk({ latitude: 14.765, longitude: -17.44 });
  await buy(c1, shops[0].listing, '78 900 00 01', 'Ndeye');
  check(
    'choix de livraison proposé : moitié-moitié par défaut',
    (await c1.getByTestId('mp-mode-partagee').getAttribute('aria-pressed')) === 'true',
  );
  await c1.getByRole('button', { name: /Départ au plus tard 1 h/ }).click();
  await c1.waitForTimeout(600);
  const fee1 = await c1.getByTestId('mp-delivery-fee').innerText();
  check('prix maximum garanti affiché', /au plus/i.test(fee1), fee1);
  await shot(c1, '1-panier-moitie');
  await c1.getByTestId('mp-confirm').click();
  await c1.waitForSelector('[data-testid="mp-order-done"]', { timeout: 10000 });

  // ── 2. Deuxième cliente (Grand Yoff), même direction : elle voit l'économie tout de suite
  const c2 = await mk({ latitude: 14.737, longitude: -17.46 });
  await buy(c2, shops[1].listing, '78 900 00 02', 'Awa');
  await c2.getByRole('button', { name: /Départ au plus tard 2 h/ }).click();
  await c2.waitForTimeout(800);
  const sharedTxt = await c2.getByTestId('mp-delivery-mode').innerText();
  check('« déjà 1 commande sur votre trajet »', /Déjà 1 commande/.test(sharedTxt), sharedTxt.slice(0, 80));
  const quoteTxt = await c2.getByTestId('mp-quote').innerText();
  check(
    'prix barré et prix partagé',
    (await c2.locator('[data-testid="mp-quote"] s').count()) === 1,
    quoteTxt.replace(/\n/g, ' ').slice(0, 120),
  );
  await shot(c2, '2-panier-economie');
  await c2.getByTestId('mp-confirm').click();
  await c2.waitForSelector('[data-testid="mp-order-done"]', { timeout: 10000 });

  // La première cliente paie maintenant moins, elle aussi
  await c1.goto(B + '/m/commandes');
  await c1.waitForSelector('[data-testid="mp-order"]');
  const o1 = await c1.getByTestId('mp-order').innerText();
  check(
    '1re cliente : sa livraison a baissé',
    (await c1.locator('[data-testid="mp-order"] s').count()) === 1,
    o1.replace(/\n/g, ' ').slice(0, 160),
  );
  check('1re cliente : « vous partagez le livreur avec 1 autre »', /partagez le livreur avec 1 autre/.test(o1));
  await shot(c1, '3-commande-baisse');

  // ── 3. Les vendeurs acceptent et préparent ; ils ne voient pas le numéro des clientes
  for (const s of shops) {
    const sale = (await j('/api/mp/me/sales', { headers: s.H })).body.orders[0];
    await j(`/api/mp/me/sales/${sale.id}`, {
      method: 'PATCH',
      headers: s.H,
      body: JSON.stringify({ status: 'acceptee' }),
    });
    await j(`/api/mp/me/sales/${sale.id}`, {
      method: 'PATCH',
      headers: s.H,
      body: JSON.stringify({ status: 'prete' }),
    });
    const seen = (await j('/api/mp/me/sales', { headers: s.H })).body.orders[0];
    check('vendeur : ni numéro ni adresse de la cliente', seen.buyer.phone === null && seen.delivery.to === null);
    check('vendeur : recevra 9 300 F (10 000 − 7 %)', seen.sellerGets === 9300, String(seen.sellerGets));
  }

  // ── 4. Le livreur s'inscrit sur son téléphone, la gérante le valide
  const L = await mk({ latitude: 14.69, longitude: -17.45 });
  await L.goto(B + '/m/livreur');
  await L.waitForTimeout(800);
  await L.getByRole('link', { name: 'Me connecter' }).click();
  await L.waitForTimeout(800);
  await uiLogin(L, '76 900 00 09', 'Moussa');
  await L.getByLabel('Nom et prénom *').fill('Moussa Diop');
  await L.getByTestId('mp-driver-save').click();
  await L.waitForSelector('[data-testid="mp-driver-pending"]', { timeout: 10000 });
  check('livreur : inscription en attente de validation', true);
  const drv = (await j('/api/admin/mp/drivers', { headers: A })).body.drivers[0];
  await j(`/api/admin/mp/drivers/${drv.id}`, {
    method: 'PATCH',
    headers: A,
    body: JSON.stringify({ status: 'active' }),
  });
  await L.reload();
  await L.waitForSelector('[data-testid="mp-driver"]', { timeout: 10000 });
  await L.getByTestId('mp-driver-online').click();
  await L.waitForTimeout(1000);
  check('livreur : groupe pas encore parti, pas de course', (await L.getByTestId('mp-offer').count()) === 0);

  // La gérante lance le groupe (sinon il part à l'heure prévue)
  const trip = (await j('/api/admin/mp/trips', { headers: A })).body.trips.find(t => t.status === 'ouverte');
  check('un seul groupe pour les deux commandes', trip?.orders.length === 2, JSON.stringify(trip?.orders?.length));
  await j(`/api/admin/mp/trips/${trip.id}/close`, { method: 'POST', headers: A });
  await L.getByRole('button', { name: 'Actualiser' }).click();
  await L.waitForSelector('[data-testid="mp-offer"]', { timeout: 10000 });
  const offer = await L.getByTestId('mp-offer').innerText();
  check(
    'course proposée : moitié-moitié, 2 colis, gain affiché',
    /Moitié-moitié · 2 colis/i.test(offer) && /\+/.test(offer),
    offer.replace(/\n/g, ' '),
  );
  await shot(L, '4-course-proposee');
  await L.getByTestId('mp-offer-accept').click();
  await L.waitForSelector('[data-testid="mp-driver-trip"]', { timeout: 10000 });
  check('4 arrêts dans l’ordre (2 enlèvements, 2 dépôts)', (await L.getByTestId('mp-stop').count()) === 4);
  await shot(L, '5-arrets');
  // Il fait chaque arrêt dans l'ordre affiché
  for (let i = 0; i < 4; i++) {
    const btn = L.locator('[data-testid="mp-stop"] button.btn-dark').first();
    await btn.click();
    await L.waitForTimeout(900);
  }
  check('course terminée', (await L.getByTestId('mp-driver-trip').count()) === 0);
  const bal = await L.getByTestId('mp-driver-balance').innerText();
  check(
    'livreur : 2 versements à faire aux vendeurs',
    (await L.getByTestId('mp-payout-sent').count()) === 2,
    bal.replace(/\n/g, ' ').slice(0, 120),
  );
  await shot(L, '6-argent-livreur');
  await L.getByTestId('mp-payout-sent').first().click();
  await L.waitForTimeout(800);
  await L.getByTestId('mp-payout-sent').first().click();
  await L.waitForTimeout(800);

  // ── 5. L'argent : chaque franc au bon endroit
  const orders = (await j('/api/admin/mp/orders', { headers: A })).body.orders;
  const exact = orders.every(
    o =>
      o.settlement &&
      o.settlement.collect === o.settlement.sellerGets + o.settlement.driverKeeps + o.settlement.platformGets,
  );
  check('partage exact (vendeur + livreur + plateforme = payé)', exact && orders.length === 2);
  check(
    'chaque cliente a payé moins que la course seule',
    orders.every(o => o.delivery.share < o.delivery.fee),
    orders.map(o => `${o.delivery.share}/${o.delivery.fee}`).join(' '),
  );
  const ov = (await j('/api/admin/mp/overview', { headers: A })).body;
  const platform = orders.reduce((t, o) => t + o.settlement.platformGets, 0);
  check('gérante : commissions gagnées = parts plateforme', ov.earned === platform, `${ov.earned} / ${platform}`);
  check('gérante : à encaisser auprès du livreur', ov.outstanding === platform, String(ov.outstanding));
  const sale = (await j('/api/mp/me/sales', { headers: shops[0].H })).body.orders[0];
  const conf = await j(`/api/mp/me/sales/${sale.id}/payout`, { method: 'PATCH', headers: shops[0].H, body: '{}' });
  check('vendeur : confirme avoir reçu son argent', conf.status === 200 && !!conf.body.order.payout.receivedAt);

  // ── 6. Les clientes voient « Livrée »
  await c2.goto(B + '/m/commandes');
  await c2.waitForSelector('[data-testid="mp-order"]');
  check('2e cliente : livrée', /Livrée/.test(await c2.getByTestId('mp-order').innerText()));

  // ── 7. Après la livraison : avis vérifié (vendeur + livreur) et signalement d'un problème
  // 5 étoiles pour le vendeur (1re rangée), 4 pour le livreur (2e rangée)
  const form = c2.getByTestId('mp-review-form');
  await form.getByRole('radio', { name: '5 étoiles' }).first().click();
  await form.getByRole('radio', { name: '4 étoiles' }).nth(1).click();
  await c2.getByLabel('Votre avis').fill('Robe conforme, livreur aimable.');
  await c2.getByTestId('mp-review-send').click();
  await c2.waitForSelector('[data-testid="mp-review-done"]', { timeout: 10000 });
  check('avis vérifié publié', /★★★★★/.test(await c2.getByTestId('mp-review-done').innerText()));
  await c2.getByTestId('mp-problem-open').click();
  await c2.getByLabel('Article abîmé').check();
  await c2.getByLabel('Explication du problème').fill('Une couture est défaite.');
  await c2.getByTestId('mp-problem-send').click();
  await c2.waitForSelector('[data-testid="mp-dispute"]', { timeout: 10000 });
  check('problème signalé, « l’équipe examine »', /examine/.test(await c2.getByTestId('mp-dispute').innerText()));
  await shot(c2, '7-avis-signalement');
  const shopSlug = (await j('/api/mp/listings')).body.listings.find(l => l.seller.shopName === 'Sandaga Style').seller
    .slug;
  const shop = (await j(`/api/mp/sellers/${shopSlug}`)).body;
  check(
    'boutique : note 5/5 (1 avis vérifié)',
    shop.seller.rating.average === 5 && shop.reviews.length === 1,
    JSON.stringify(shop.seller.rating),
  );
  const disputes = (await j('/api/admin/mp/disputes', { headers: A })).body.disputes;
  check('gérante : signalement reçu', disputes.length === 1 && disputes[0].status === 'ouvert');
  const solved = await j(`/api/admin/mp/disputes/${disputes[0].orderId}`, {
    method: 'PATCH',
    headers: A,
    body: JSON.stringify({ status: 'resolu', resolution: 'La boutique reprend la robe et la répare.' }),
  });
  check('gérante : solution notée', solved.status === 200);

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  console.log(res.join('\n'));
  await b.close();
})().catch(async e => {
  console.log(res.join('\n'));
  console.log('ERR', e.message);
  const pages = browser ? browser.contexts().flatMap(c => c.pages()) : [];
  for (const [i, pg] of pages.entries()) await pg.screenshot({ path: `${SP}/mm-erreur-${i}.png` }).catch(() => {});
  process.exit(1);
});
