const { chromium, devices } = require('playwright');
const fs = require('fs');
const SP = process.env.SP,
  B = 'http://localhost:8787';
const res = [];
const check = (n, ok, x = '') => res.push(`${ok ? 'OK  ' : 'FAIL'} ${n} ${x}`);
const j = async (path, opt = {}) => {
  const r = await fetch(B + path, { ...opt, headers: { 'content-type': 'application/json', ...(opt.headers || {}) } });
  return { status: r.status, body: await r.json().catch(() => null) };
};
(async () => {
  const b = await chromium.launch();
  const errors = [];
  // Tuile de carte dessinée (les serveurs de cartes sont bloqués dans le bac à sable)
  const tp = await (await b.newContext({ viewport: { width: 256, height: 256 } })).newPage();
  await tp.setContent(`<body style="margin:0"><svg width="256" height="256" xmlns="http://www.w3.org/2000/svg"><rect width="256" height="256" fill="#f2efe9"/>
    <rect x="20" y="30" width="90" height="70" fill="#e3e0d8"/><rect x="140" y="140" width="96" height="96" fill="#d6ead0"/><rect x="150" y="20" width="80" height="90" fill="#e3e0d8"/>
    <path d="M0 120 H256 M128 0 V256" stroke="#fff" stroke-width="10"/><path d="M0 200 L256 180" stroke="#fde6a6" stroke-width="7"/></svg></body>`);
  const TILE = await tp.screenshot();
  const block = async ctx => {
    await ctx.route(/pexels|fonts\.g|arcgis|carto/, r => r.fulfill({ status: 204, body: '' }));
    await ctx.route(/tile\.openstreetmap\.org/, r => r.fulfill({ contentType: 'image/png', body: TILE }));
  };
  // 10 commandes dans Dakar
  const spots = [
    ['Awa', 14.745, -17.508],
    ['Bintou', 14.686, -17.452],
    ['Coumba', 14.765, -17.44],
    ['Dieynaba', 14.6675, -17.4365],
    ['Fatou', 14.716, -17.47],
    ['Khady', 14.75, -17.515],
    ['Mariama', 14.693, -17.464],
    ['Ndeye', 14.733, -17.456],
    ['Oumou', 14.724, -17.49],
    ['Rokhaya', 14.701, -17.459],
  ];
  for (const [k, [name, lat, lng]] of spots.entries()) {
    const order = {
      id: `MAE-TR${k}00`,
      customer: {
        firstName: name,
        lastName: 'Diop',
        phone: `7710000${String(k).padStart(2, '0')}`,
        zone: 'Dakar',
        address: '',
        location: { lat, lng, label: `Rue ${k + 1}, Dakar`, source: 'gps' },
      },
      items: [{ productId: 'x', name: 'Sac', price: 20000, quantity: 1 }],
      subtotal: 20000,
      discount: 0,
      deliveryFee: 1500,
      giftFee: 0,
      total: 21500,
      paymentMethod: 'cash',
    };
    await j('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ order }),
      headers: { 'x-forwarded-for': `10.9.0.${k}` },
    });
  }
  // ── Gérante
  const gc = await b.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block' });
  await block(gc);
  const g = await gc.newPage();
  g.on('pageerror', e => errors.push('gérante: ' + e.message));
  await g.goto(B + '/admin');
  await g.getByLabel('Code PIN').fill('2026');
  await g.getByRole('button', { name: 'Se connecter' }).click();
  await g.waitForTimeout(800);
  await g.getByRole('button', { name: /Tournées/ }).click();
  await g.waitForTimeout(1200);
  check('gérante : onglet Tournées', await g.getByTestId('tours-tab').isVisible());
  const n = await g.getByTestId('tour-orders').locator('input[type=checkbox]:checked').count();
  check('10 commandes cochées par défaut', n === 10, String(n));
  await g.getByLabel('Nom du livreur').fill('Modou');
  await g.getByLabel('Téléphone du livreur').fill('77 111 22 33');
  await g.getByTestId('tour-organise').click();
  await g.waitForTimeout(1500);
  check('ordre de passage calculé', (await g.getByTestId('tour-stops').locator('li').count()) === 11);
  const saved = await g
    .getByTestId('tour-saved')
    .innerText()
    .catch(() => '');
  check('gain affiché vs allers-retours', /−\d+ %/.test(saved), saved);
  await g.addStyleTag({ content: '.sticky{position:static!important} header{position:static!important}' });
  await g.getByTestId('tour-plan').screenshot({ path: SP + '/tr-1-plan.png' });
  await g.getByTestId('tour-send').click();
  await g.waitForTimeout(1500);
  check('tournée créée', await g.getByTestId('tour-created').isVisible());
  check('tournée listée', (await g.getByTestId('tour-card').count()) >= 1);
  const tok = (await j('/api/admin/login', { method: 'POST', body: JSON.stringify({ pin: '2026' }) })).body.token;
  const tour = (await j('/api/admin/tours', { headers: { 'x-admin-pin': tok } })).body.tours[0];
  const token = tour.link.split('/').pop();
  // ── Cliente n°3 : sa place dans la file
  const third = tour.stops[2];
  const tView = (await j(`/api/tour/${token}`)).body;
  const thirdPhone = tView.stops[2].customer.phone;
  const cc = await b.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
  await block(cc);
  const p = await cc.newPage();
  p.on('pageerror', e => errors.push('cliente: ' + e.message));
  await p.goto(`${B}/suivi?commande=${third.orderId}&tel=${thirdPhone}`);
  await p.waitForTimeout(2000);
  check(
    'cliente : place dans la tournée',
    (await p.getByTestId('tour-queue').isVisible()) && (await p.getByText(/livraison n° 3 sur 10/).isVisible()),
  );
  await p.getByTestId('tour-queue').scrollIntoViewIfNeeded();
  await p.evaluate(() => window.scrollBy(0, 220));
  await p.waitForTimeout(400);
  await p.screenshot({ path: SP + '/tr-3-cliente-file.png' });
  // ── Livreur
  const dc = await b.newContext({
    ...devices['Pixel 7'],
    serviceWorkers: 'block',
    geolocation: { latitude: 14.7195, longitude: -17.4655, accuracy: 10 },
    permissions: ['geolocation'],
  });
  await block(dc);
  const d = await dc.newPage();
  d.on('pageerror', e => errors.push('livreur: ' + e.message));
  await d.goto(`${B}/livreur/tournee/${token}`);
  await d.waitForTimeout(1500);
  check('livreur : tournée prête avec la liste', await d.getByText('Votre tournée est prête').isVisible());
  await d.screenshot({ path: SP + '/tr-2-livreur-pret.png' });
  await d.getByTestId('tour-start').click();
  await d.waitForTimeout(1500);
  check(
    'livreur : livraison 1 en cours',
    await d
      .getByTestId('tour-current')
      .getByText(/Livraison 1 sur 10/)
      .isVisible(),
  );
  const log1 = fs.readFileSync(SP + '/server.log', 'utf8');
  check('cliente 1 prévenue « en route »', (log1.match(/est en route/g) || []).length === 1);
  // Livrer 2 colis avec le code
  for (let k = 0; k < 2; k++) {
    const v = (await j(`/api/tour/${token}`)).body;
    const s = v.stops[v.current];
    const code = (await j(`/api/orders/lookup?id=${s.orderId}&phone=${s.customer.phone}`)).body.delivery.code;
    await d.locator('#tour-code').fill(code);
    await d.getByRole('button', { name: /Colis remis/ }).click();
    await d.waitForTimeout(1500);
  }
  check(
    'après 2 colis : livraison 3 en cours',
    await d
      .getByTestId('tour-current')
      .getByText(/Livraison 3 sur 10/)
      .isVisible(),
  );
  check('message « livrée, en route vers la suivante »', await d.getByTestId('tour-flash').isVisible());
  check(
    'progression 2/10',
    await d
      .getByTestId('tour-progress')
      .innerText()
      .then(t => t.startsWith('2 livrées sur 10')),
  );
  await d.screenshot({ path: SP + '/tr-4-livreur-en-route.png' });
  const log2 = fs.readFileSync(SP + '/server.log', 'utf8');
  check(
    '3 clientes prévenues « en route » (une à la fois)',
    (log2.match(/est en route/g) || []).length === 3,
    String((log2.match(/est en route/g) || []).length),
  );
  // La cliente n°3 voit maintenant le livreur arriver
  await p.reload();
  await p.waitForTimeout(2500);
  check(
    'cliente 3 : suivi en direct',
    (await p.getByTestId('live-tracking').isVisible()) && !(await p.getByTestId('tour-queue').count()),
  );
  await p.getByTestId('live-tracking').scrollIntoViewIfNeeded();
  await p.waitForTimeout(600);
  await p.screenshot({ path: SP + '/tr-5-cliente-suivi.png' });
  // Cliente 3 absente : reporter
  d.once('dialog', dl => dl.accept());
  await d.getByTestId('tour-skip').click();
  await d.waitForTimeout(1500);
  check(
    'report : livraison 4 en cours',
    await d
      .getByTestId('tour-current')
      .getByText(/Livraison 4 sur 10/)
      .isVisible(),
  );
  // Finir la tournée
  for (let k = 0; k < 7; k++) {
    const v = (await j(`/api/tour/${token}`)).body;
    if (v.current < 0) break;
    const s = v.stops[v.current];
    const code = (await j(`/api/orders/lookup?id=${s.orderId}&phone=${s.customer.phone}`)).body.delivery.code;
    await d.locator('#tour-code').fill(code);
    await d.getByRole('button', { name: /Colis remis/ }).click();
    await d.waitForTimeout(1200);
  }
  check(
    'tournée terminée',
    (await d.getByTestId('tour-finished').isVisible()) &&
      (await d.getByText(/9 livraisons faites, 1 reportée/).isVisible()),
  );
  await d.screenshot({ path: SP + '/tr-6-fin.png' });
  await g.reload();
  await g.getByRole('button', { name: /Tournées/ }).click();
  await g.waitForTimeout(1200);
  check('gérante : tournée terminée', await g.getByTestId('tour-card').first().getByText('Terminée').isVisible());
  check('aucune erreur de page', errors.length === 0, errors.join(' | '));
  console.log(res.join('\n'));
  await b.close();
})().catch(e => {
  console.log(res.join('\n'));
  console.log('ERR', e.message.split('\n')[0]);
  process.exit(1);
});
