const { chromium, devices } = require('playwright');
const SP = process.env.SP,
  B = 'http://localhost:8787';
const res = [];
const check = (n, ok, x = '') => res.push(`${ok ? 'OK  ' : 'FAIL'} ${n} ${x}`);
(async () => {
  const b = await chromium.launch();
  const errors = [];
  const HOME = { latitude: 14.7167, longitude: -17.4677, accuracy: 15 };
  const cc = await b.newContext({
    ...devices['Pixel 7'],
    serviceWorkers: 'block',
    geolocation: HOME,
    permissions: ['geolocation'],
  });
  await cc.route(/pexels|fonts\.g|tile|openstreetmap|arcgis/, r => r.fulfill({ status: 204, body: '' }));
  // WhatsApp : on intercepte l'ouverture pour lire le message
  let waUrl = '';
  await cc.route(/api\.whatsapp\.com|wa\.me/, r => {
    waUrl = r.request().url();
    r.fulfill({ status: 200, contentType: 'text/html', body: '<p>WhatsApp</p>' });
  });
  const p = await cc.newPage();
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(B + '/produit/sac-ndella-bordeaux');
  await p.waitForTimeout(800);
  check('fiche : bouton « Acheter maintenant » WhatsApp', await p.getByTestId('buy-whatsapp').isVisible());
  await p.getByTestId('buy-whatsapp').scrollIntoViewIfNeeded();
  await p.screenshot({ path: SP + '/dm-1-fiche.png' });
  await p.getByTestId('buy-whatsapp').click();
  await p.waitForTimeout(1500);
  const msg = decodeURIComponent((waUrl.split('text=')[1] || '').replace(/\+/g, ' '));
  const ref = (msg.match(/DEM-[A-Z0-9]{5}/) || [])[0];
  check('WhatsApp ouvert vers la boutique', waUrl.includes('221773093819'), waUrl.slice(0, 60));
  check(
    'message : article, lien, référence, sans prix exact',
    /Sac Ndella/.test(msg) && !/FCFA/.test(msg) && /quel prix/.test(msg) && /\/p\//.test(msg) && !!ref,
    msg.replace(/\n/g, ' / ').slice(0, 160),
  );
  // Gérante : la demande arrive
  const gc = await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  await gc.route(/pexels|fonts\.g|tile|openstreetmap|arcgis/, r => r.fulfill({ status: 204, body: '' }));
  const g = await gc.newPage();
  g.on('pageerror', e => errors.push('admin ' + e.message));
  await g.goto(B + '/admin');
  await g.getByLabel('Code PIN').fill('2026');
  await g.getByRole('button', { name: 'Se connecter' }).click();
  await g.waitForTimeout(800);
  await g.getByRole('button', { name: /Demandes/ }).click();
  await g.waitForTimeout(1200);
  const card = g.getByTestId('request-card').filter({ hasText: ref });
  check(
    'gérante : demande reçue « à vérifier »',
    (await card.count()) === 1 && (await card.getByText('À vérifier').isVisible()),
  );
  await card.getByTestId('request-available').click();
  await g.waitForTimeout(800);
  const answer = await card.getByTestId('request-message').innerText();
  const link = (answer.match(/https?:\/\/\S+demande=DEM-\S+/) || [])[0];
  check('gérante : message « disponible » avec lien', !!link, answer.slice(0, 80));
  await card.screenshot({ path: SP + '/dm-2-gerante.png' });
  // Cliente : le lien remplit le panier, elle finalise
  const p2 = await cc.newPage();
  p2.on('pageerror', e => errors.push(e.message));
  await p2.evaluate(() => localStorage.clear()).catch(() => {});
  await p2.goto(link.replace(/^https?:\/\/[^/]+/, B));
  await p2.waitForTimeout(1500);
  check('lien : disponibilité confirmée', await p2.getByTestId('request-confirmed').isVisible());
  check(
    'lien : article dans le récapitulatif',
    await p2
      .getByText(/Sac Ndella/)
      .first()
      .isVisible(),
  );
  await p2.screenshot({ path: SP + '/dm-3-finaliser.png' });
  await p2.getByLabel('Prénom *').fill('Awa');
  await p2.getByLabel('Nom *', { exact: true }).fill('Ndiaye');
  await p2.getByLabel('Téléphone *').fill('77 555 44 33');
  res.push('… étape GPS');
  await p2.getByRole('button', { name: /Je suis ici/ }).click();
  await p2.waitForTimeout(1000);
  await p2.waitForFunction(() => !document.querySelector('[data-testid="gps-progress"]'), null, { timeout: 30000 });
  res.push('… étape confirmer');
  await p2.getByTestId('confirm-location').click();
  await p2.waitForTimeout(600);
  res.push('… étape paiement');
  await p2.getByRole('button', { name: 'Continuer vers le paiement' }).click();
  await p2.waitForTimeout(600);
  await p2
    .getByText('À la livraison')
    .first()
    .click()
    .catch(() => {});
  res.push('… étape valider');
  await p2.screenshot({ path: SP + '/dm-4-paiement.png' });
  await p2.getByRole('button', { name: /^(Valider ma commande|Confirmer la commande)/ }).click();
  await p2.waitForURL(/confirmation/, { timeout: 10000 });
  await p2.waitForTimeout(1200);
  check('commande passée', /confirmation/.test(p2.url()));
  const tok = (
    await (
      await fetch(B + '/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pin: '2026' }),
      })
    ).json()
  ).token;
  const r = (await (await fetch(B + '/api/admin/requests', { headers: { 'x-admin-pin': tok } })).json()).requests.find(
    x => x.id === ref,
  );
  check(
    'demande devenue « commandée » et liée à la commande',
    r?.status === 'commandee' && /^MAE-/.test(r.orderId || ''),
    JSON.stringify({ s: r?.status, o: r?.orderId }),
  );
  // Re-ouvrir le lien : déjà commandé
  await p2.goto(link.replace(/^https?:\/\/[^/]+/, B));
  await p2.waitForTimeout(1200);
  check('lien rouvert : « commande déjà passée »', await p2.getByText('Commande déjà passée').isVisible());
  // Panier → WhatsApp
  waUrl = '';
  await p2.goto(B + '/produit/sac-ndella-camel');
  await p2.waitForTimeout(600);
  await p2
    .getByRole('button', { name: /Ajouter au panier/ })
    .first()
    .click();
  await p2.waitForTimeout(600);
  await p2.getByTestId('drawer-whatsapp').click();
  await p2.waitForTimeout(1200);
  check(
    'panier : commande envoyée sur WhatsApp',
    /Sac Ndella/.test(decodeURIComponent(waUrl)) && /DEM-/.test(decodeURIComponent(waUrl)),
  );
  check('aucune erreur de page', errors.length === 0, errors.join(' | '));
  console.log(res.join('\n'));
  await b.close();
})().catch(e => {
  console.log(res.join('\n'));
  console.log('ERR', e.message.split('\n')[0]);
  process.exit(1);
});
