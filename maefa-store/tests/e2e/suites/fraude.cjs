// Anti-fraude : codes de remise (vendeur → livreur → cliente), code faux refusé, livraison ratée avec
// retour du colis, acheteur bloqué à la 2e livraison ratée puis débloqué par la gérante, plafond d'argent
// du livreur, vendeur « pas reçu », achat dans sa propre boutique, nouvelle boutique limitée, registre intact.
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
const TO = { lat: 14.765, lng: -17.44 };

(async () => {
  // ── Mise en place : livreurs activés, une boutique (Médina) avec une robe et un boubou de luxe
  await j('/api/admin/mp/settings', { method: 'PATCH', headers: A, body: JSON.stringify({ drivers: true }) });
  const HS = await login('77 530 00 01');
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
  const listing = async (title, price) =>
    (
      await j('/api/mp/me/listings', {
        method: 'POST',
        headers: HS,
        body: JSON.stringify({ title, price, category: 'mode', photos: [ph.url], stock: 30 }),
      })
    ).body.listing.id;
  const robe = await listing('Robe wax', 12000);
  const luxe = await listing('Boubou brodé main', 150000);
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
  const order = (H, id = robe) =>
    j('/api/mp/orders', {
      method: 'POST',
      headers: H,
      body: JSON.stringify({ items: [{ listingId: id, qty: 1 }], to: TO, name: 'Cliente', mode: 'express' }),
    });
  const ready = async id => {
    await j(`/api/mp/me/sales/${id}`, { method: 'PATCH', headers: HS, body: JSON.stringify({ status: 'acceptee' }) });
    return (
      await j(`/api/mp/me/sales/${id}`, { method: 'PATCH', headers: HS, body: JSON.stringify({ status: 'prete' }) })
    ).body.order;
  };

  // ── 1. Fraudes simples refusées par le serveur
  const self = await order(HS);
  check('acheter dans sa propre boutique : refusé', self.status === 400, self.body?.error);
  const X0 = await login('78 630 00 09');
  const big = await order(X0, luxe);
  check('nouvelle boutique : 150 000 F refusés (100 000 F au plus)', big.status === 400, big.body?.error);

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
  const shot = (p, n) => p.screenshot({ path: `${SP}/fr-${n}.png` });
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

  // ── 2. La cliente commande dans le navigateur et voit son code de remise
  const c = await mk({ latitude: 14.765, longitude: -17.44 });
  await c.goto(B + `/m/annonce/${robe}`);
  await c.getByTestId('mp-buy').click();
  await c.waitForTimeout(800);
  await c.getByTestId('mp-confirm').click();
  await c.waitForTimeout(800);
  await uiLogin(c, '78 630 00 01', 'Ndeye');
  await c
    .getByRole('button', { name: /Je suis ici/ })
    .first()
    .click();
  await c.waitForFunction(() => !document.querySelector('[data-testid="gps-progress"]'), null, { timeout: 30000 });
  await c.getByTestId('confirm-location').click();
  await c.waitForSelector('[data-testid="mp-delivery-mode"]', { timeout: 10000 });
  await c.getByTestId('mp-mode-express').click();
  await c.getByTestId('mp-confirm').click();
  await c.waitForSelector('[data-testid="mp-order-done"]', { timeout: 10000 });
  await c.goto(B + '/m/commandes');
  await c.waitForSelector('[data-testid="mp-handover-code"]', { timeout: 10000 });
  const buyerCode = (await c.locator('[data-testid="mp-handover-code"] strong').innerText()).trim();
  check('cliente : code de remise à 4 chiffres affiché', /^\d{4}$/.test(buyerCode), buyerCode);
  await shot(c, '1-cliente-code');

  const o1 = (await j('/api/mp/me/sales', { headers: HS })).body.orders[0];
  check('vendeur : ne voit pas le code de la cliente', !JSON.stringify(o1).includes(`"${buyerCode}"`));
  const sellerCode = (await ready(o1.id)).pickupCode;
  check('vendeur : son propre code pour remettre le colis', /^\d{4}$/.test(sellerCode ?? ''), sellerCode);

  // ── 3. Le livreur : code faux refusé, bons codes acceptés
  const L = await mk({ latitude: 14.69, longitude: -17.45 });
  await L.goto(B + '/m/livreur');
  await L.waitForTimeout(800);
  await L.getByRole('link', { name: 'Me connecter' }).click();
  await L.waitForTimeout(800);
  await uiLogin(L, '76 730 00 01', 'Moussa');
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
  const stopCard = () => L.locator('[data-testid="mp-stop"]:has([data-testid="mp-stop-code"])').first();
  check(
    'livreur : bouton bloqué tant que le code n’est pas saisi',
    await stopCard().getByTestId('mp-stop-enlevement').isDisabled(),
  );
  await stopCard()
    .getByTestId('mp-stop-code')
    .fill(sellerCode === '0000' ? '1111' : '0000');
  await stopCard().getByTestId('mp-stop-enlevement').click();
  await L.waitForTimeout(900);
  const wrong = await L.getByRole('alert').innerText();
  check('code faux : refusé, essais restants affichés', /Code faux.*4 essais/.test(wrong), wrong);
  await shot(L, '2-code-faux');
  await stopCard().getByTestId('mp-stop-code').fill(sellerCode);
  await stopCard().getByTestId('mp-stop-enlevement').click();
  await L.waitForTimeout(900);
  await stopCard().getByTestId('mp-stop-code').fill(buyerCode);
  await stopCard().getByTestId('mp-stop-depot').click();
  await L.waitForTimeout(1200);
  check('livrée avec le code de la cliente', (await L.getByTestId('mp-driver-trip').count()) === 0);
  await c.reload();
  await c.waitForSelector('[data-testid="mp-order"]');
  check(
    'cliente : « Livrée », plus de code affiché',
    /Livrée/.test(await c.getByTestId('mp-order').innerText()) &&
      (await c.getByTestId('mp-handover-code').count()) === 0,
  );

  // ── 4. Le livreur dit avoir envoyé l'argent ; le vendeur ne l'a pas reçu
  await L.getByTestId('mp-payout-sent').click();
  await L.waitForTimeout(800);
  const miss = await j(`/api/mp/me/sales/${o1.id}/payout`, {
    method: 'PATCH',
    headers: HS,
    body: JSON.stringify({ missing: true }),
  });
  check('vendeur : « pas reçu » signalé', miss.status === 200 && !!miss.body.order.payout.missing);

  // ── 5. Livraison ratée : cliente absente, le colis retourne au vendeur avec son code
  const X2 = await login('78 630 00 02');
  const o2 = (await order(X2)).body.orders[0];
  const code2 = (await ready(o2.id)).pickupCode;
  await L.getByRole('button', { name: 'Actualiser' }).click();
  await L.waitForSelector('[data-testid="mp-offer"]', { timeout: 10000 });
  await L.getByTestId('mp-offer-accept').click();
  await L.waitForSelector('[data-testid="mp-driver-trip"]', { timeout: 10000 });
  await stopCard().getByTestId('mp-stop-code').fill(code2);
  await stopCard().getByTestId('mp-stop-enlevement').click();
  await L.waitForTimeout(900);
  L.once('dialog', d => d.accept());
  await L.getByTestId('mp-stop-absent').click();
  await L.waitForTimeout(1200);
  const tripTxt = await L.getByTestId('mp-driver-trip').innerText();
  check(
    'arrêt « Rapporter au vendeur » ajouté',
    /Non livré \(client absent\)/i.test(tripTxt) && /Rapporter au vendeur/i.test(tripTxt),
  );
  await shot(L, '3-retour');
  const sale2 = (await j('/api/mp/me/sales', { headers: HS })).body.orders.find(o => o.id === o2.id);
  check(
    'vendeur : « Retour au vendeur », son code pour reprendre le colis',
    sale2.status === 'retour' && sale2.pickupCode === code2,
  );
  await stopCard().getByTestId('mp-stop-code').fill(code2);
  await stopCard().getByTestId('mp-stop-retour').click();
  await L.waitForTimeout(1200);
  const back = (await j('/api/admin/mp/orders', { headers: A })).body.orders.find(o => o.id === o2.id);
  check(
    'colis rendu : commande annulée, course terminée',
    back.status === 'annulee' && (await L.getByTestId('mp-driver-trip').count()) === 0,
  );

  // ── 6. Deuxième livraison ratée (refus) : l'acheteur est bloqué
  const LH = await login('76 730 00 01');
  const o3 = (await order(X2)).body.orders[0];
  const code3 = (await ready(o3.id)).pickupCode;
  const t3 = (await j('/api/mp/driver/trips', { headers: LH })).body.trips[0].id;
  await j(`/api/mp/driver/trips/${t3}/accept`, { method: 'POST', headers: LH });
  await j(`/api/mp/driver/trips/${t3}/stop`, {
    method: 'POST',
    headers: LH,
    body: JSON.stringify({ orderId: o3.id, kind: 'enlevement', code: code3 }),
  });
  await j(`/api/mp/driver/trips/${t3}/fail`, {
    method: 'POST',
    headers: LH,
    body: JSON.stringify({ orderId: o3.id, reason: 'refus' }),
  });
  await j(`/api/mp/driver/trips/${t3}/stop`, {
    method: 'POST',
    headers: LH,
    body: JSON.stringify({ orderId: o3.id, kind: 'retour', code: code3 }),
  });
  const blocked = await order(X2);
  check('2 livraisons ratées : l’acheteur ne peut plus commander', blocked.status === 403, blocked.body?.error);

  // ── 7. Plafond d'argent : la gérante le baisse, le livreur ne reçoit plus de course
  const g = await mk({ latitude: 14.69, longitude: -17.45 }, 'Desktop Chrome');
  await g.addInitScript(() => {
    sessionStorage.setItem('maefa_admin', '1');
    sessionStorage.setItem('maefa_admin_pin', '2026');
  });
  await g.goto(B + '/admin');
  await g.waitForTimeout(800);
  await g.getByRole('button', { name: 'Place de marché' }).click();
  await g.waitForTimeout(1000);
  await g.getByRole('button', { name: /^Livreurs/ }).click();
  g.once('dialog', d => d.accept('5000'));
  await g.getByRole('button', { name: 'Plafond' }).click();
  await g.waitForTimeout(1000);
  check(
    'gérante : plafond propre au livreur',
    /plafond de 5\s000 F \(plafond propre/.test(await g.getByTestId('admin-mp-driver').innerText()),
  );
  const X3 = await login('78 630 00 03');
  await ready((await order(X3)).body.orders[0].id);
  await L.reload();
  await L.waitForSelector('[data-testid="mp-driver-blocked"]', { timeout: 10000 });
  check('livreur : « plus de nouvelle course » au-delà du plafond', true);
  const refused = await j(
    `/api/mp/driver/trips/${(await j('/api/mp/driver/trips', { headers: LH })).body.trips[0].id}/accept`,
    {
      method: 'POST',
      headers: LH,
    },
  );
  check('course refusée au-delà du plafond', refused.status === 409, refused.body?.error);
  await shot(L, '4-plafond');

  // ── 8. Onglet « Sécurité » : registre intact, acheteur bloqué, vendeur pas payé ; la gérante débloque
  await g.getByRole('button', { name: 'Sécurité' }).click();
  await g.waitForSelector('[data-testid="admin-mp-ledger"]', { timeout: 10000 });
  const ledgerTxt = await g.getByTestId('admin-mp-ledger').innerText();
  check('registre intact', /Registre intact : \d+ opération/.test(ledgerTxt), ledgerTxt.split('\n')[0]);
  check('acheteur bloqué listé', /bloqué/.test(await g.getByTestId('admin-mp-buyer-strikes').innerText()));
  check('vendeur pas payé listé', (await g.getByTestId('admin-mp-unpaid').count()) === 1);
  await shot(g, '5-securite');
  await g.getByTestId('admin-mp-forgive').click();
  await g.waitForTimeout(1000);
  const again = await order(X2);
  check('débloqué par la gérante : il peut recommander', again.status === 201, again.body?.error ?? '');
  const ledger = (await j('/api/admin/mp/ledger', { headers: A })).body;
  const types = ledger.entries.map(e => e.type);
  check(
    'registre : livraison, envoi, pas reçu, 2 échecs, retours, déblocage',
    ['livraison', 'envoi_vendeur', 'vendeur_non_paye', 'livraison_ratee', 'colis_rendu', 'acheteur_debloque'].every(t =>
      types.includes(t),
    ) && types.filter(t => t === 'livraison_ratee').length === 2,
    types.slice().reverse().join(','),
  );

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  console.log(res.join('\n'));
  await b.close();
})().catch(async e => {
  console.log(res.join('\n'));
  console.log('ERR', e.message);
  const pages = browser ? browser.contexts().flatMap(c => c.pages()) : [];
  for (const [i, pg] of pages.entries()) await pg.screenshot({ path: `${SP}/fr-erreur-${i}.png` }).catch(() => {});
  process.exit(1);
});
