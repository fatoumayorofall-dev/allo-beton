const toCheckout = require('../tocheckout.cjs');
const { chromium, devices } = require('playwright');
const SP = process.env.SP,
  B = 'http://localhost:8787';
const res = [];
const check = (n, ok, x = '') => res.push(`${ok ? 'OK  ' : 'FAIL'} ${n} ${x}`);
(async () => {
  const b = await chromium.launch();
  const errors = [];
  const tp = await (await b.newContext({ viewport: { width: 256, height: 256 } })).newPage();
  await tp.setContent(
    `<body style="margin:0"><svg width="256" height="256" xmlns="http://www.w3.org/2000/svg"><rect width="256" height="256" fill="#f2efe9"/><rect x="20" y="30" width="90" height="70" fill="#e3e0d8"/><rect x="140" y="140" width="96" height="96" fill="#d6ead0"/><rect x="150" y="20" width="80" height="90" fill="#e3e0d8"/><path d="M0 120 H256 M128 0 V256" stroke="#fff" stroke-width="10"/><path d="M0 200 L256 180" stroke="#fde6a6" stroke-width="7"/></svg></body>`,
  );
  const TILE = await tp.screenshot();
  const c = await b.newContext({
    ...devices['Pixel 7'],
    serviceWorkers: 'block',
    geolocation: { latitude: 14.7236, longitude: -17.4686, accuracy: 12 },
    permissions: ['geolocation'],
  });
  await c.route(/pexels|fonts\.g|arcgis/, r => r.fulfill({ status: 204, body: '' }));
  await c.route(/tile\.openstreetmap\.org/, r => r.fulfill({ contentType: 'image/png', body: TILE }));
  const p = await c.newPage();
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(B + '/produit/sac-ndella-bordeaux');
  await p
    .getByRole('button', { name: /Ajouter au panier/ })
    .first()
    .click();
  await p.waitForTimeout(400);
  await toCheckout(p, B);
  await p.waitForTimeout(800);
  await p.getByRole('button', { name: /Je suis ici/ }).click();
  await p.waitForTimeout(800);
  await p.waitForFunction(() => !document.querySelector('[data-testid="gps-progress"]'), null, { timeout: 30000 });
  await p.waitForTimeout(1500);
  const chips = p.getByTestId('nearby-places').getByRole('button');
  check("lieux connus autour de l'épingle", (await chips.count()) >= 5, String(await chips.count()));
  check('lieux connus aussi sur la carte', (await p.locator('.maefa-poi').count()) >= 5);
  await p.screenshot({ path: SP + '/ad-1-lieux.png' });
  await chips.filter({ hasText: 'Mosquée Omarienne' }).click();
  await p.waitForTimeout(300);
  const lm = await p.getByLabel('Un repère pour le livreur').inputValue();
  check("repère rempli d'un geste", /^À côté de Mosquée Omarienne, à \d+ m$/.test(lm), lm);
  await p
    .getByTestId('save-address')
    .getByRole('button', { name: /Maison/ })
    .click();
  check(
    'bouton « Confirmer et enregistrer Maison »',
    await p
      .getByTestId('confirm-location')
      .innerText()
      .then(t => /Maison/i.test(t)),
  );
  await p.screenshot({ path: SP + '/ad-2-enregistrer.png' });
  await p.getByTestId('confirm-location').click();
  await p.waitForTimeout(600);
  check(
    'résumé : repère visible',
    await p
      .getByTestId('location-summary')
      .getByText(/Mosquée Omarienne/)
      .isVisible(),
  );
  check('« Mes adresses » : Maison', await p.getByTestId('saved-addresses').getByText('🏠 Maison').isVisible());
  // Deuxième adresse : le bureau, ailleurs
  await p
    .getByTestId('location-summary')
    .getByRole('button', { name: /Modifier/ })
    .click();
  await p.waitForTimeout(800);
  await p.getByLabel('Rechercher un lieu').fill('mosquée');
  await p.waitForTimeout(900);
  await p.getByRole('button', { name: /Almadies, Dakar/ }).click();
  await p.waitForTimeout(1200);
  await p
    .getByTestId('save-address')
    .getByRole('button', { name: /Bureau/ })
    .click();
  await p.getByTestId('confirm-location').click();
  await p.waitForTimeout(600);
  check('2 adresses enregistrées', (await p.getByTestId('saved-addresses').getByRole('button').count()) === 2);
  // Plus tard : un geste suffit
  await p.reload();
  await p.waitForTimeout(1200);
  await p.getByTestId('saved-addresses').getByText('🏠 Maison').click();
  await p.waitForTimeout(500);
  check(
    'un geste sur « Maison » : adresse et repère',
    (await p
      .getByTestId('location-summary')
      .getByText(/Mosquée Omarienne/)
      .isVisible()) && (await p.getByText('Sacré-Cœur / Mermoz').first().isVisible()),
  );
  await p.getByTestId('location-picker').scrollIntoViewIfNeeded();
  await p.screenshot({ path: SP + '/ad-3-mes-adresses.png' });
  await p.getByTestId('saved-addresses').getByText('💼 Bureau').click();
  await p.waitForTimeout(500);
  check('un geste sur « Bureau » : zone Almadies', await p.getByText('Almadies / Ngor').first().isVisible());
  check(
    'Bureau ne garde pas le repère de la Maison',
    !(await p
      .getByTestId('location-summary')
      .getByText(/Mosquée Omarienne/)
      .count()),
  );
  check('aucune erreur', errors.length === 0, errors.join(' | '));
  console.log(res.join('\n'));
  await b.close();
})().catch(e => {
  console.log(res.join('\n'));
  console.log('ERR', e.message.split('\n')[0]);
  process.exit(1);
});
