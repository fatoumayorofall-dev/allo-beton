// Anonymat des vendeurs : une vendeuse dépose ses colis dans un point relais, une autre n'a pas
// d'adresse fixe et indique où elle se trouve quand le colis est prêt. La cliente ne voit jamais
// où est le vendeur ; seul le livreur voit le point de remise (le relais, ou la position du moment).
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
const publish = async (H, title) => {
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
    body: JSON.stringify({ title, price: 10000, category: 'mode', photos: [ph.url] }),
  });
  return l.body.listing.id;
};

(async () => {
  await j('/api/admin/mp/settings', { method: 'PATCH', headers: A, body: JSON.stringify({ drivers: true }) });
  const b = (browser = await chromium.launch());
  const errors = [];
  const mk = async (geo, device = 'Pixel 7') => {
    const ctx = await b.newContext({
      ...devices[device],
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
  const shot = (p, n) => p.screenshot({ path: `${SP}/an-${n}.png` });
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
  const pickHere = async p => {
    await p
      .getByRole('button', { name: /Je suis ici/ })
      .first()
      .click();
    await p.waitForFunction(() => !document.querySelector('[data-testid="gps-progress"]'), null, { timeout: 30000 });
    await p.getByTestId('confirm-location').click();
    await p.waitForTimeout(700);
  };

  // ── 1. La gérante ajoute un point relais (boutique partenaire à la Médina)
  const g = await mk({ latitude: 14.687, longitude: -17.451 }, 'Desktop Chrome');
  await g.addInitScript(() => {
    sessionStorage.setItem('maefa_admin', '1');
    sessionStorage.setItem('maefa_admin_pin', '2026');
  });
  await g.goto(B + '/admin');
  await g.waitForTimeout(800);
  await g.getByRole('button', { name: 'Place de marché' }).click();
  await g.waitForTimeout(1000);
  await g.getByRole('button', { name: /^Points relais/ }).click();
  const form = g.getByTestId('admin-mp-relay-form');
  await form.getByLabel('Nom *').fill('Boutique Fatou');
  await form.getByLabel('Quartier').fill('Médina');
  await form.getByLabel('Horaires').fill('9 h – 20 h');
  await form.getByLabel('Téléphone (pour les livreurs)').fill('77 222 33 44');
  await pickHere(g);
  await form.getByRole('button', { name: 'Ajouter' }).click();
  await g.waitForTimeout(1000);
  check('gérante : point relais ajouté', /Boutique Fatou/.test(await g.getByTestId('admin-mp-relays').innerText()));
  await shot(g, '1-gerante-relais');
  const relays = (await j('/api/mp/relays')).body.relays;
  check(
    'relais publics : sans numéro de téléphone',
    relays.length === 1 && !('phone' in relays[0]),
    JSON.stringify(relays[0]),
  );

  // ── 2. Awa (pas de boutique) ouvre sa boutique en passant par le point relais
  const v1 = await mk({ latitude: 14.69, longitude: -17.46 });
  await v1.goto(B + '/m/vendre');
  await v1.waitForTimeout(1000);
  await v1.getByRole('link', { name: /Me connecter pour commencer/ }).click();
  await v1.waitForTimeout(1000);
  await uiLogin(v1, '77 510 00 01', 'Awa');
  await v1.getByLabel('Nom de la boutique *').fill('Awa Discrète');
  await v1.getByLabel('Ce que vous vendez *').selectOption('mode');
  check(
    'trois façons de remettre les colis',
    (await v1.locator('[data-testid^="mp-pickup-"]:not([data-testid="mp-pickup-mode"])').count()) === 3,
  );
  await v1.getByTestId('mp-pickup-variable').click();
  check(
    'sans adresse fixe : on demande le quartier',
    await v1.getByText('Votre quartier (approximatif) *').isVisible(),
  );
  await v1.getByTestId('mp-pickup-relais').click();
  check(
    'point relais : plus de carte à remplir',
    (await v1.getByRole('button', { name: /Je suis ici/ }).count()) === 0,
  );
  await v1.getByTestId('mp-relay-select').selectOption({ index: 1 });
  await v1.getByTestId('mp-shop-form').scrollIntoViewIfNeeded();
  await shot(v1, '2-vendeuse-relais');
  await v1.getByTestId('mp-shop-save').click();
  await v1.waitForTimeout(1500);
  check('boutique « point relais » ouverte', await v1.getByTestId('mp-seller-pending').isVisible());

  // ── 3. Bineta vend depuis chez elle mais ne veut pas d'adresse : seulement son quartier
  const v2 = await mk({ latitude: 14.6812, longitude: -17.4413 });
  await v2.goto(B + '/m/vendre');
  await v2.waitForTimeout(1000);
  await v2.getByRole('link', { name: /Me connecter pour commencer/ }).click();
  await v2.waitForTimeout(1000);
  await uiLogin(v2, '77 510 00 02', 'Bineta');
  await v2.getByLabel('Nom de la boutique *').fill('Bineta Sans Adresse');
  await v2.getByLabel('Ce que vous vendez *').selectOption('mode');
  await v2.getByTestId('mp-pickup-variable').click();
  await pickHere(v2);
  await v2.getByTestId('mp-shop-save').click();
  await v2.waitForTimeout(1500);
  check('boutique « sans adresse fixe » ouverte', await v2.getByTestId('mp-seller-pending').isVisible());

  const HA = await login('77 510 00 01');
  const HB = await login('77 510 00 02');
  const ids = [await publish(HA, 'Robe wax bleue'), await publish(HB, 'Robe brodée')];
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

  // ── 4. Ce que voit le public et la cliente : jamais la position ni le numéro du vendeur
  const pub = JSON.stringify((await j('/api/mp/listings')).body);
  check(
    'annonces publiques : ni position ni numéro',
    !/14\.68|14\.69|-17\.4|\+221|Boutique Fatou/.test(pub),
    pub.match(/14\.68|14\.69|\+221/)?.[0] ?? '',
  );
  // Le prix part d'un point arrondi (~500 m) : on ne peut pas retrouver le domicile en essayant des adresses
  const q = await j('/api/mp/quote', {
    method: 'POST',
    body: JSON.stringify({ items: [{ listingId: ids[1], qty: 1 }], to: { lat: 14.68, lng: -17.44 } }),
  });
  check(
    'devis : distance calculée depuis le quartier, pas le domicile',
    q.body.orders[0].delivery.km === 0,
    String(q.body.orders[0].delivery.km),
  );

  const X = await login('78 610 00 01');
  const made = await j('/api/mp/orders', {
    method: 'POST',
    headers: X,
    body: JSON.stringify({
      items: ids.map(id => ({ listingId: id, qty: 1 })),
      to: { lat: 14.765, lng: -17.44 },
      name: 'Khady',
      mode: 'express',
    }),
  });
  check('commande chez les deux vendeuses', made.status === 201 && made.body.orders.length === 2);
  const seenByBuyer = async () => (await j('/api/mp/me/orders', { headers: X })).body.orders;
  const leaks = list => list.filter(o => o.delivery.from || o.delivery.relay || o.sellerPhone).length;
  check('cliente : aucune position ni point relais du vendeur', leaks(await seenByBuyer()) === 0);

  // ── 5. Les vendeuses acceptent ; Awa dépose au relais, Bineta dit où elle est (seulement au livreur)
  const saleA = (await j('/api/mp/me/sales', { headers: HA })).body.orders[0];
  check('vendeuse relais : rappel du dépôt au relais', saleA.delivery.relay?.name === 'Boutique Fatou');
  for (const s of ['acceptee', 'prete'])
    await j(`/api/mp/me/sales/${saleA.id}`, { method: 'PATCH', headers: HA, body: JSON.stringify({ status: s }) });

  const saleB = (await j('/api/mp/me/sales', { headers: HB })).body.orders[0];
  await v2.goto(B + '/m/vendre');
  await v2.waitForTimeout(1200);
  await v2.getByRole('tab', { name: /Commandes/ }).click();
  await v2.waitForSelector('[data-testid="mp-sale"]', { timeout: 10000 });
  await v2.getByTestId('mp-sale-acceptee').click();
  await v2.waitForTimeout(1000);
  check(
    'vendeuse sans adresse : « position envoyée au livreur seulement »',
    /au livreur seulement/.test(await v2.getByTestId('mp-sale').innerText()),
  );
  const noPoint = await j(`/api/mp/me/sales/${saleB.id}`, {
    method: 'PATCH',
    headers: HB,
    body: JSON.stringify({ status: 'prete' }),
  });
  check('« Colis prêt » sans point de remise : refusé', noPoint.status === 400, noPoint.body?.error ?? '');
  // Elle est maintenant au marché : le livreur viendra là
  await v2.context().setGeolocation({ latitude: 14.705, longitude: -17.455, accuracy: 10 });
  v2.once('dialog', d => d.accept('devant la station Shell'));
  await v2.getByTestId('mp-sale-prete').click();
  await v2.waitForTimeout(1500);
  await shot(v2, '3-vendeuse-colis-pret');
  const orderB = (await j('/api/admin/mp/orders', { headers: A })).body.orders.find(o => o.id === saleB.id);
  check(
    'point de remise = position du moment + repère',
    orderB.status === 'prete' &&
      Math.abs(orderB.delivery.from.lat - 14.705) < 1e-6 &&
      orderB.delivery.from.landmark === 'devant la station Shell',
    JSON.stringify(orderB.delivery.from),
  );
  check('cliente : toujours rien sur le vendeur', leaks(await seenByBuyer()) === 0);

  // ── 6. Le livreur : au relais il voit le relais (nom, numéro, horaires), jamais la vendeuse
  const L = await login('76 710 00 01');
  const d = (
    await j('/api/mp/me/driver', {
      method: 'POST',
      headers: L,
      body: JSON.stringify({ name: 'Ibou', vehicle: 'moto' }),
    })
  ).body.driver;
  await j(`/api/admin/mp/drivers/${d.id}`, { method: 'PATCH', headers: A, body: JSON.stringify({ status: 'active' }) });
  await j('/api/mp/me/driver/presence', {
    method: 'POST',
    headers: L,
    body: JSON.stringify({ online: true, location: { lat: 14.69, lng: -17.45 } }),
  });
  const offers = (await j('/api/mp/driver/trips', { headers: L })).body.trips;
  check('2 courses proposées', offers.length === 2, String(offers.length));
  const tripIdOf = async orderId =>
    (await j('/api/admin/mp/orders', { headers: A })).body.orders.find(o => o.id === orderId).delivery.tripId;

  const tA = await tripIdOf(saleA.id);
  const accA = await j(`/api/mp/driver/trips/${tA}/accept`, { method: 'POST', headers: L });
  const pickA = accA.body.trip.stops.find(s => s.kind === 'enlevement');
  check(
    'livreur : enlèvement au point relais',
    pickA.shopName === `Point relais Boutique Fatou (colis ${saleA.id})` && pickA.phone === '+221772223344',
    `${pickA.shopName} · ${pickA.phone}`,
  );
  check('livreur : horaires du relais affichés', /9 h – 20 h/.test(pickA.at.landmark), pickA.at.landmark);
  check('livreur : ni le nom ni le numéro de la vendeuse', !/Awa|\+22177510/.test(JSON.stringify(pickA)));

  // Suivi de la cliente : pas de position tant que le colis n'est pas enlevé (sinon on verrait le relais)
  const track = async id => (await j(`/api/mp/me/orders/${id}/driver`, { headers: X })).body.tracking;
  const before = await track(saleA.id);
  check(
    'suivi : livreur annoncé, position cachée avant l’enlèvement',
    before?.phase === 'chez_vendeur' && before.position === null,
  );
  await j(`/api/mp/driver/trips/${tA}/stop`, {
    method: 'POST',
    headers: L,
    body: JSON.stringify({ orderId: saleA.id, kind: 'enlevement' }),
  });
  await j('/api/mp/me/driver/presence', {
    method: 'POST',
    headers: L,
    body: JSON.stringify({ online: true, location: { lat: 14.72, lng: -17.45 } }),
  });
  const after = await track(saleA.id);
  check('suivi : position visible une fois le colis en route', after?.phase === 'vers_vous' && !!after.position);
  check('suivi : jamais le point d’enlèvement', !('to' in (after ?? {})));
  await j(`/api/mp/driver/trips/${tA}/stop`, {
    method: 'POST',
    headers: L,
    body: JSON.stringify({ orderId: saleA.id, kind: 'depot' }),
  });

  // ── 7. Le livreur chez Bineta : il va au point donné quand le colis était prêt
  const tB = await tripIdOf(saleB.id);
  const accB = await j(`/api/mp/driver/trips/${tB}/accept`, { method: 'POST', headers: L });
  const pickB = accB.body.trip.stops.find(s => s.kind === 'enlevement');
  check(
    'livreur : point de remise du moment (station Shell)',
    Math.abs(pickB.at.lat - 14.705) < 1e-6 && pickB.at.landmark === 'devant la station Shell',
    JSON.stringify(pickB.at),
  );
  check('cliente : rien sur le vendeur jusqu’au bout', leaks(await seenByBuyer()) === 0);

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  console.log(res.join('\n'));
  await b.close();
})().catch(async e => {
  console.log(res.join('\n'));
  console.log('ERR', e.message);
  const pages = browser ? browser.contexts().flatMap(c => c.pages()) : [];
  for (const [i, pg] of pages.entries()) await pg.screenshot({ path: `${SP}/an-erreur-${i}.png` }).catch(() => {});
  process.exit(1);
});
