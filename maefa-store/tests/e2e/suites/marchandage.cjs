const { chromium, devices } = require('playwright');
const SP = process.env.SP,
  B = 'http://localhost:8787';
const check = (n, ok, x = '') => console.log(`${ok ? 'OK  ' : 'FAIL'} ${n} ${x}`);
(async () => {
  const b = await chromium.launch();
  const errors = [];
  const gc = await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  await gc.route(/pexels|fonts\.g|tile|openstreetmap|arcgis/, r => r.fulfill({ status: 204, body: '' }));
  const g = await gc.newPage();
  g.on('pageerror', e => errors.push('admin ' + e.message));
  await g.goto(B + '/admin');
  await g.getByLabel('Code PIN').fill('2026');
  await g.getByRole('button', { name: 'Se connecter' }).click();
  await g.waitForTimeout(800);
  await g.getByRole('button', { name: 'Produits' }).first().click();
  await g.waitForTimeout(1500); // publie le catalogue
  const ndella = (await (await fetch(B + '/api/catalog')).json()).products.find(p => p.slug === 'sac-ndella-noir');
  const ref = 'DEM-NEGQA';
  await fetch(B + '/api/requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      id: ref,
      items: [
        {
          productId: ndella.id,
          name: ndella.name,
          price: ndella.price,
          image: ndella.images[0],
          color: 'Noir',
          quantity: 1,
        },
      ],
      customer: { firstName: 'Khady', phone: '77 666 55 44' },
    }),
  });
  await g.getByRole('button', { name: /Demandes/ }).click();
  await g.waitForTimeout(1200);
  const card = g.getByTestId('request-card').filter({ hasText: ref });
  check(
    'gérante : champ « prix convenu » prérempli au prix catalogue',
    (await card.getByTestId('deal-price').inputValue()) === String(ndella.price),
  );
  await card.getByTestId('deal-price').fill('22000');
  await g.waitForTimeout(200);
  check('gérante : total recalculé', /22\s000/.test(await card.getByTestId('request-total').innerText()));
  check('gérante : prix catalogue rappelé', /catalogue : 25\s000/.test(await card.innerText()));
  await card.screenshot({ path: SP + '/mc-1-gerante.png' });
  await card.getByTestId('request-available').click();
  await g.waitForTimeout(900);
  const msg = await card.getByTestId('request-message').innerText();
  check(
    'message à la cliente : prix convenu et total',
    /22\s000 FCFA/.test(msg) && /Total : \*22\s000 FCFA\*/.test(msg),
    msg.split('\n').slice(1, 3).join(' / '),
  );
  const r = await (await fetch(B + '/api/requests/' + ref)).json();
  check(
    'serveur : prix convenu enregistré',
    r.items[0].price === 22000 && r.items[0].catalogPrice === 25000 && r.total === 22000,
    JSON.stringify(r.items[0]).slice(0, 100),
  );
  // Cliente : lien de finalisation
  const HOME = { latitude: 14.7167, longitude: -17.4677, accuracy: 15 };
  const cc = await b.newContext({
    ...devices['Pixel 7'],
    serviceWorkers: 'block',
    geolocation: HOME,
    permissions: ['geolocation'],
  });
  await cc.route(/pexels|fonts\.g|tile|openstreetmap|arcgis|api\.whatsapp|wa\.me/, r =>
    r.fulfill({ status: 204, body: '' }),
  );
  const p = await cc.newPage();
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(B + '/commande?demande=' + ref);
  await p.waitForTimeout(2500);
  const body = await p.locator('main').innerText();
  check('cliente : prix convenu 22 000 sur la page de commande', /22\s000/.test(body) && !/25\s000/.test(body));
  await p.screenshot({ path: SP + '/mc-2-cliente.png' });
  await p.getByLabel('Prénom *').fill('Khady');
  await p.getByLabel('Nom *', { exact: true }).fill('Sarr');
  await p.getByLabel('Téléphone *').fill('77 666 55 44');
  await p.getByRole('button', { name: /Je suis ici/ }).click();
  await p.waitForTimeout(1000);
  await p.waitForFunction(() => !document.querySelector('[data-testid="gps-progress"]'), null, { timeout: 30000 });
  await p.getByTestId('confirm-location').click();
  await p.waitForTimeout(600);
  await p.getByRole('button', { name: 'Continuer vers le paiement' }).click();
  await p.waitForTimeout(600);
  await p
    .getByText('À la livraison')
    .first()
    .click()
    .catch(() => {});
  await p.getByRole('button', { name: /^(Valider ma commande|Confirmer la commande)/ }).click();
  await p.waitForTimeout(1500);
  await p.screenshot({ path: SP + '/mc-3-apres.png' });
  const ok = await p
    .waitForURL(/confirmation/, { timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  check(
    'commande acceptée au prix convenu',
    ok,
    ok
      ? ''
      : (await p.locator('body').innerText())
          .split('\n')
          .filter(l => /prix|erreur|impossible|invalide|réessayez|refus/i.test(l))
          .join(' | '),
  );
  const after = await (await fetch(B + '/api/admin/requests', { headers: { 'x-admin-pin': '2026' } })).json();
  const done = after.requests.find(x => x.id === ref);
  check('demande « commandée »', done?.status === 'commandee', done?.status);
  // Sans demande confirmée, le serveur refuse un prix inventé
  const { checkStock } = await import(require('path').resolve(__dirname, '../../../server/catalog.js'));
  const store = { getCatalog: () => [{ ...ndella, stock: 5 }] };
  const bad = checkStock({ items: [{ productId: ndella.id, name: 'x', price: 22000, quantity: 1 }] }, store);
  const good = checkStock(
    { items: [{ productId: ndella.id, name: 'x', price: 22000, color: 'Noir', quantity: 1 }] },
    store,
    new Map([[`${ndella.id}||Noir`, 22000]]),
  );
  check('serveur : prix inventé refusé, prix convenu accepté', !!bad.error && !good.error, bad.error);
  console.log('errors', JSON.stringify(errors));
  await b.close();
})();
