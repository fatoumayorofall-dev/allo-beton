// Paiement en ligne (mode test, versements « à verser » faits par la gérante) :
//  1. la cliente paie au panier (« Payer maintenant ») ; la vendeuse ne voit la commande qu'une fois payée ;
//  2. livraison par la vendeuse : le code de la cliente est exigé ; sa part (articles − commission + livraison)
//     part en versement, la commission et les frais restent à la plateforme ; la gérante coche « Versé » ;
//  3. commande payée puis refusée : la cliente est remboursée ;
//  4. paiement abandonné : commande annulée, article remis en vente ;
//  5. livraison par un livreur : rien à encaisser ; la vendeuse et le livreur reçoivent leur part.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const SP = process.env.SP;
const B = 'http://localhost:8787';
const A = { 'x-admin-pin': '2026', 'content-type': 'application/json' };
const PHOTO = fs.readFileSync(path.join(__dirname, '../fixtures/photos/p0.jpg'));
const TO = { lat: 14.7, lng: -17.46, address: 'Point E, Dakar', label: 'Point E' };
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
    body: JSON.stringify({ firstName, location: TO }),
  });
  return v.body.token;
};
const auth = t => ({ Authorization: `Bearer ${t}` });
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const mariama = await login('77 595 00 01', 'Mariama');
  const HM = auth(mariama);
  await j('/api/mp/me/seller', {
    method: 'POST',
    headers: HM,
    body: JSON.stringify({
      shopName: 'Mariama Sacs',
      category: 'sacs',
      location: { lat: 14.69, lng: -17.45 },
      payoutPhone: '77 595 00 09',
    }),
  });
  const ids = {};
  for (const [title, price, stock] of [
    ['Sac cabas', 20000, 5],
    ['Pochette perlée', 8000, 1],
  ]) {
    const ph = await (
      await fetch(B + '/api/mp/me/photos', {
        method: 'POST',
        headers: { ...HM, 'content-type': 'image/jpeg' },
        body: PHOTO,
      })
    ).json();
    ids[title] = (
      await j('/api/mp/me/listings', {
        method: 'POST',
        headers: HM,
        body: JSON.stringify({ title, price, stock, category: 'sacs', photos: [ph.url] }),
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
  const seller = (await j('/api/mp/me/seller', { headers: HM })).body.seller;
  check('numéro Wave de versement enregistré', seller.payoutPhone === '+221775950009', seller.payoutPhone);
  const config = (await j('/api/mp/config')).body;
  check('paiement en ligne proposé (mode test)', config.onlinePay.includes('wave') && config.payTest === true);

  const khady = await login('78 695 00 01', 'Khady');
  const b = (browser = await chromium.launch());
  const errors = [];
  const page = async (tok, device = 'Pixel 7') => {
    const ctx = await b.newContext({ ...devices[device], serviceWorkers: 'block' });
    await ctx.route(/pexels|fonts\.g|tile|openstreetmap|arcgis|wa\.me|nominatim|overpass/, r =>
      r.fulfill({ status: 204, body: '' }),
    );
    if (tok) await ctx.addInitScript(t => localStorage.setItem('maefa_token', t), tok);
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    // Code de la cliente (vendeuse qui livre) ; référence Wave du versement (gérante)
    p.on('dialog', d => {
      const m = d.message();
      d.accept(m.includes('Code de remise') ? globalThis.__code : m.includes('Référence') ? 'TX-WAVE-123' : '');
    });
    return p;
  };

  // ── 1. La cliente paie maintenant, au panier
  const c = await page(khady);
  await c.goto(`${B}/m/annonce/${ids['Sac cabas']}`);
  await c.getByTestId('mp-add').click();
  await c.goto(`${B}/m/panier`);
  await c.waitForSelector('[data-testid="mp-pay-en_ligne"]', { timeout: 15000 });
  await c.getByTestId('mp-pay-en_ligne').click();
  await c.waitForFunction(
    () => /Payer .*Wave/.test(document.querySelector('[data-testid="mp-confirm"]')?.textContent ?? ''),
    null,
    {
      timeout: 10000,
    },
  );
  check('bouton « Payer … · Wave »', true);
  await c.screenshot({ path: `${SP}/pa-1-panier.png` });
  await c.getByTestId('mp-confirm').click();
  await c.waitForSelector('[data-testid="mp-payment-test"]', { timeout: 15000 });
  const paidAmount = (await c.getByTestId('mp-payment-amount').innerText()).replace(/\D/g, '');
  check('page de paiement (test) : montant', Number(paidAmount) > 20000, paidAmount);
  await c.screenshot({ path: `${SP}/pa-2-paiement.png` });
  const before = (await j('/api/mp/me/sales', { headers: HM })).body.orders.length;
  check('vendeuse : la commande n’apparaît pas avant le paiement', before === 0);
  await c.getByTestId('mp-payment-pay').click();
  await c.waitForSelector('[data-testid="mp-payment-done"]', { timeout: 10000 });
  check('paiement reçu', true);
  await c.screenshot({ path: `${SP}/pa-3-paye.png` });

  const sale = (await j('/api/mp/me/sales', { headers: HM })).body.orders[0];
  check('vendeuse : commande payée en ligne visible', sale?.paidOnline?.status === 'payee');
  check(
    'vendeuse : sa part annoncée (articles − 7 % + livraison)',
    sale.payoutToMe?.amount === 20000 - 1400 + sale.delivery.fee && sale.payoutToMe.status === 'apres_livraison',
    JSON.stringify(sale.payoutToMe),
  );
  check('vendeuse : rien à encaisser', sale.sellerGets === null);
  const mine = (await j('/api/mp/me/orders', { headers: auth(khady) })).body.orders[0];
  check(
    'cliente : « Payée en ligne » et code de remise',
    mine.onlinePayment?.status === 'payee' && /^\d{4}$/.test(mine.handoverCode ?? ''),
  );

  // ── 2. Livraison par la vendeuse : le code de la cliente libère l'argent
  for (const status of ['acceptee', 'prete', 'en_livraison'])
    await j(`/api/mp/me/sales/${sale.id}`, { method: 'PATCH', headers: HM, body: JSON.stringify({ status }) });
  const noCode = await j(`/api/mp/me/sales/${sale.id}`, {
    method: 'PATCH',
    headers: HM,
    body: JSON.stringify({ status: 'livree' }),
  });
  check('« Livrée » sans le code de la cliente : refusé', noCode.status === 400);
  const v = await page(mariama);
  await v.goto(`${B}/m/vendre`);
  await v.waitForSelector('[data-testid="mp-seller-space"]', { timeout: 15000 });
  await v.getByRole('tab', { name: /Commandes/ }).click();
  await v.waitForSelector('[data-testid="mp-sale-paid"]', { timeout: 10000 });
  check(
    'vendeuse : bandeau « Payée en ligne »',
    /Payée en ligne/.test(await v.getByTestId('mp-sale-paid').innerText()),
  );
  await v.screenshot({ path: `${SP}/pa-4-vendeuse.png` });
  globalThis.__code = mine.handoverCode;
  await v.getByTestId('mp-sale-livree').click();
  await v.waitForFunction(
    () => /Livrée/.test(document.querySelector('[data-testid="mp-sale"]')?.textContent ?? ''),
    null,
    {
      timeout: 10000,
    },
  );
  const delivered = (await j('/api/mp/me/sales', { headers: HM })).body.orders[0];
  check('livrée avec le bon code', delivered.status === 'livree');
  check(
    'vendeuse : rien à reverser à la plateforme',
    (await j('/api/mp/me/seller', { headers: HM })).body.balance.due === 0,
  );

  const pay1 = (await j('/api/admin/mp/payments', { headers: A })).body;
  const po = pay1.payouts.find(p => p.orderId === sale.id && p.kind === 'vendeur');
  check(
    'versement vendeuse « à verser » sur son numéro Wave',
    po?.status === 'a_verser' && po.to === '+221775950009' && po.amount === sale.payoutToMe.amount,
  );
  check(
    'commission et frais gardés par la plateforme : 1 550 F',
    pay1.totals.kept === 1400 + 150,
    String(pay1.totals.kept),
  );
  const ledger = (await j('/api/admin/mp/ledger', { headers: A })).body;
  check(
    'registre : paiement en ligne et partage, chaîne intacte',
    ledger.entries.some(e => e.type === 'paiement_en_ligne') &&
      ledger.entries.some(e => e.type === 'partage') &&
      ledger.check.ok,
  );

  // La gérante verse avec son application Wave, puis coche « Versé »
  const g = await page(null, 'Desktop Chrome');
  await g.addInitScript(() => {
    sessionStorage.setItem('maefa_admin', '1');
    sessionStorage.setItem('maefa_admin_pin', '2026');
  });
  await g.goto(`${B}/admin`);
  await g.getByRole('button', { name: 'Place de marché' }).click();
  await g.getByRole('button', { name: 'Paiements en ligne' }).click();
  await g.waitForSelector('[data-testid="admin-mp-payout"]', { timeout: 10000 });
  await g.screenshot({ path: `${SP}/pa-5-gerante.png`, fullPage: true });
  await g.getByTestId('admin-mp-payout-sent').first().click();
  await sleep(1000);
  const pay2 = (await j('/api/admin/mp/payments', { headers: A })).body;
  check('gérante : versement coché « Versé »', pay2.payouts.find(p => p.id === po.id)?.status === 'versee');
  const sale2 = (await j('/api/mp/me/sales', { headers: HM })).body.orders[0];
  check('vendeuse : « vous ont été versés »', sale2.payoutToMe?.status === 'versee');

  // ── 3. Commande payée puis refusée par la vendeuse : remboursement
  const place = async (token, listingId, extra = {}) =>
    j('/api/mp/orders', {
      method: 'POST',
      headers: auth(token),
      body: JSON.stringify({
        items: [{ listingId, qty: 1 }],
        to: TO,
        name: 'Cliente',
        payment: 'wave',
        pay: 'en_ligne',
        ...extra,
      }),
    });
  const r3 = await place(khady, ids['Sac cabas']);
  check(
    'commande en ligne : lien de paiement',
    r3.status === 201 && /^\/m\/paiement\/PAY-/.test(r3.body.payment?.url ?? ''),
  );
  await j(`/api/mp/payments/${r3.body.payment.id}/simulate`, {
    method: 'POST',
    headers: auth(khady),
    body: '{"ok":true}',
  });
  const o3 = r3.body.orders[0].id;
  await j(`/api/mp/me/sales/${o3}`, {
    method: 'PATCH',
    headers: HM,
    body: JSON.stringify({ status: 'refusee', reason: 'Plus en stock' }),
  });
  const refunded = (await j('/api/mp/me/orders', { headers: auth(khady) })).body.orders.find(o => o.id === o3);
  check(
    'refusée : la cliente est remboursée (tout)',
    refunded.refund?.amount === refunded.onlinePayment.amount && refunded.onlinePayment.status === 'remboursee',
    JSON.stringify(refunded.refund),
  );

  // ── 4. Paiement abandonné : commande annulée, article remis en vente
  const r4 = await place(khady, ids['Pochette perlée']);
  const stockAfterOrder = (await j('/api/mp/me/listings', { headers: HM })).body.listings.find(
    l => l.id === ids['Pochette perlée'],
  ).stock;
  await c.goto(`${B}${r4.body.payment.url}`);
  await c.waitForSelector('[data-testid="mp-payment-cancel"]', { timeout: 10000 });
  await c.getByTestId('mp-payment-cancel').click();
  await c.waitForSelector('[data-testid="mp-payment-failed"]', { timeout: 10000 });
  const o4 = (await j('/api/mp/me/orders', { headers: auth(khady) })).body.orders.find(
    o => o.id === r4.body.orders[0].id,
  );
  const stockBack = (await j('/api/mp/me/listings', { headers: HM })).body.listings.find(
    l => l.id === ids['Pochette perlée'],
  ).stock;
  check(
    'paiement annulé : commande annulée, pochette remise en vente',
    o4.status === 'annulee' && stockAfterOrder === 0 && stockBack === 1,
  );
  const r4b = await j('/api/mp/orders', {
    method: 'POST',
    headers: auth(khady),
    body: JSON.stringify({
      items: [{ listingId: ids['Sac cabas'], qty: 1 }],
      to: TO,
      name: 'K',
      payment: 'especes',
      pay: 'en_ligne',
    }),
  });
  check('paiement en ligne en espèces : refusé', r4b.status === 400);

  // ── 5. Livraison par un livreur : rien à encaisser, chacun reçoit sa part
  await j('/api/admin/mp/settings', { method: 'PATCH', headers: A, body: JSON.stringify({ drivers: true }) });
  const moussa = await login('76 795 00 01', 'Moussa');
  const HL = auth(moussa);
  await j('/api/mp/me/driver', {
    method: 'POST',
    headers: HL,
    body: JSON.stringify({ name: 'Moussa Diop', vehicle: 'moto', zone: 'Dakar' }),
  });
  const drv = (await j('/api/admin/mp/drivers', { headers: A })).body.drivers[0];
  await j(`/api/admin/mp/drivers/${drv.id}`, {
    method: 'PATCH',
    headers: A,
    body: JSON.stringify({ status: 'active' }),
  });
  await j('/api/mp/me/driver/presence', {
    method: 'POST',
    headers: HL,
    body: JSON.stringify({ online: true, location: { lat: 14.69, lng: -17.45 } }),
  });
  const r5 = await place(khady, ids['Sac cabas'], { mode: 'express' });
  const tripsBefore = (await j('/api/mp/driver/trips', { headers: HL })).body.trips.length;
  check('livreur : pas de course avant le paiement', tripsBefore === 0);
  await j(`/api/mp/payments/${r5.body.payment.id}/simulate`, {
    method: 'POST',
    headers: auth(khady),
    body: '{"ok":true}',
  });
  const o5 = r5.body.orders[0].id;
  await j(`/api/mp/me/sales/${o5}`, { method: 'PATCH', headers: HM, body: JSON.stringify({ status: 'acceptee' }) });
  const pickup = (
    await j(`/api/mp/me/sales/${o5}`, { method: 'PATCH', headers: HM, body: JSON.stringify({ status: 'prete' }) })
  ).body.order.pickupCode;
  const trip = (await j('/api/mp/driver/trips', { headers: HL })).body.trips[0];
  await j(`/api/mp/driver/trips/${trip.id}/accept`, { method: 'POST', headers: HL });
  const driverHome = (await j('/api/mp/me/driver', { headers: HL })).body;
  const stop = driverHome.trip.stops.find(s => s.kind === 'depot' && s.orderId === o5);
  check('livreur : « déjà payé », rien à encaisser', stop.paidOnline === true && stop.money.collect === 0);
  await j(`/api/mp/driver/trips/${trip.id}/stop`, {
    method: 'POST',
    headers: HL,
    body: JSON.stringify({ orderId: o5, kind: 'enlevement', code: pickup }),
  });
  const dropoff = (await j('/api/mp/me/orders', { headers: auth(khady) })).body.orders.find(
    o => o.id === o5,
  ).handoverCode;
  await j(`/api/mp/driver/trips/${trip.id}/stop`, {
    method: 'POST',
    headers: HL,
    body: JSON.stringify({ orderId: o5, kind: 'depot', code: dropoff }),
  });
  await sleep(300);
  const pay5 = (await j('/api/admin/mp/payments', { headers: A })).body.payouts.filter(p => p.orderId === o5);
  const vend = pay5.find(p => p.kind === 'vendeur');
  const liv = pay5.find(p => p.kind === 'livreur');
  check('livrée : part de la vendeuse (20 000 − 1 400)', vend?.amount === 18600, JSON.stringify(vend));
  check(
    'livrée : part du livreur (sa course − sa commission)',
    liv?.amount > 0 && liv.to === '+221767950001',
    JSON.stringify(liv),
  );
  const bal = (await j('/api/mp/me/driver', { headers: HL })).body.balance;
  check('livreur : ne doit rien à la plateforme', bal.due === 0 && bal.payoutsToSend.length === 0, JSON.stringify(bal));

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  console.log(res.join('\n'));
  await b.close();
})().catch(async e => {
  console.log(res.join('\n'));
  console.log('ERR', e.message);
  const pages = browser ? browser.contexts().flatMap(c => c.pages()) : [];
  for (const [i, pg] of pages.entries()) await pg.screenshot({ path: `${SP}/pa-erreur-${i}.png` }).catch(() => {});
  process.exit(1);
});
