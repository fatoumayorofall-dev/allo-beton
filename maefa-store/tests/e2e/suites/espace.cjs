const { chromium, devices } = require('playwright');
const SP = process.env.SP,
  B = 'http://localhost:8787';
const res = [];
const check = (n, ok, x = '') => res.push(`${ok ? 'OK  ' : 'FAIL'} ${n} ${x}`);
(async () => {
  const b = await chromium.launch();
  const errors = [];
  const mk = async dev => {
    const ctx = await b.newContext({
      ...dev,
      serviceWorkers: 'block',
      geolocation: { latitude: 14.7165, longitude: -17.469 },
      permissions: ['geolocation'],
    });
    await ctx.route(/pexels|fonts\.g|tile|openstreetmap|carto/, r => r.abort());
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    return p;
  };
  const p = await mk(devices['Pixel 7']);
  await p.goto(B + '/compte');
  await p.waitForTimeout(1000);
  await p.getByLabel('Numéro de téléphone').fill('77 666 12 34');
  await p.getByRole('button', { name: /Continuer/ }).click();
  await p.waitForTimeout(800);
  await p.locator('#pin').fill('2468');
  await p.waitForTimeout(400);
  await p.locator('#pin').fill('2468');
  await p.waitForTimeout(1500);
  check(
    'prénom demandé (même mise en page que la connexion)',
    (await p.getByTestId('name-step').isVisible()) && (await p.getByTestId('account-welcome').isVisible()),
  );
  await p.screenshot({ path: SP + '/es-1-prenom.png' });
  await p.getByLabel('Votre prénom').fill('Awa');
  await p.getByRole('button', { name: /Entrer dans mon espace/ }).click();
  await p.waitForTimeout(1200);
  check('espace ouvert', await p.getByRole('heading', { name: /Awa/, level: 1 }).isVisible());
  check(
    'profil à compléter affiché',
    (await p.getByTestId('account-todo').isVisible()) && (await p.getByText(/prêt à 25/).isVisible()),
  );
  await p.screenshot({ path: SP + '/es-2-vide.png', fullPage: true });
  // Modifier mes informations + point GPS
  await p.getByTestId('edit-profile').click();
  await p.waitForTimeout(600);
  check('éditeur : carte et champs', await p.getByTestId('profile-editor').isVisible());
  await p.getByLabel('Nom de famille').fill('Diop');
  const here = p.getByRole('button', { name: /Je suis ici/ });
  if (await here.count()) {
    await here.first().click();
    await p.waitForTimeout(1000);
    await p.waitForFunction(() => !document.querySelector('[data-testid="gps-progress"]'), null, { timeout: 30000 });
    await p.getByTestId('confirm-location').click();
    await p.waitForTimeout(600);
  }
  await p.getByLabel('Précisions').fill('Villa 12, près de la pharmacie');
  await p.screenshot({ path: SP + '/es-3-edition.png', fullPage: true });
  await p.getByRole('button', { name: /Enregistrer/ }).click();
  await p.waitForTimeout(1200);
  check('nom complet affiché', await p.getByText('Awa Diop').isVisible());
  check(
    'adresse + GPS enregistrés',
    (await p.getByText(/Villa 12/).isVisible()) && (await p.getByText(/Point GPS enregistré/).isVisible()),
  );
  check(
    'zone déduite du GPS',
    await p
      .getByText(/Sacré-Cœur/)
      .first()
      .isVisible(),
  );
  // Changer le code secret
  await p.getByTestId('change-pin').click();
  await p.waitForTimeout(300);
  await p.locator('#new-pin').fill('1111');
  await p.waitForTimeout(300);
  await p.locator('#new-pin').fill('9573');
  await p.waitForTimeout(300);
  await p.locator('#new-pin').fill('9573');
  await p.waitForTimeout(1200);
  check('ancien code faux → message', await p.getByText('Code actuel incorrect').isVisible());
  await p.locator('#new-pin').fill('2468');
  await p.waitForTimeout(300);
  await p.locator('#new-pin').fill('1234');
  await p.waitForTimeout(300);
  check('code faible refusé', await p.getByText(/trop facile/).isVisible());
  await p.locator('#new-pin').fill('8642');
  await p.waitForTimeout(300);
  await p.locator('#new-pin').fill('8642');
  await p.waitForTimeout(1300);
  check('nouveau code enregistré', await p.getByText('Nouveau code secret enregistré').isVisible());
  // Commande rattachée
  const token = await p.evaluate(() => localStorage.getItem('maefa_token'));
  const order = {
    id: 'MAE-ESP001',
    createdAt: new Date().toISOString(),
    status: 'expediee',
    total: 27000,
    items: [
      { key: 'k1', productId: 'x', name: 'Sac Awa', image: '/produits/sac-awa-taupe-1.jpg', price: 18500, quantity: 1 },
    ],
    customer: {},
  };
  await fetch(B + '/api/me/orders', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + token.replace(/"/g, ''), 'content-type': 'application/json' },
    body: JSON.stringify({ order }),
  });
  await p.reload();
  await p.waitForTimeout(1500);
  check(
    'dernière commande : étape « En route »',
    (await p.getByTestId('last-order').isVisible()) &&
      (await p.locator('[aria-current=step]').innerText()).includes('En route'),
  );
  check('mobile : pas de débordement', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await p.screenshot({ path: SP + '/es-4-mobile.png', fullPage: true });
  // Reconnexion avec le nouveau code sur ordinateur
  const q = await mk({ viewport: { width: 1440, height: 900 } });
  await q.goto(B + '/compte');
  await q.waitForTimeout(900);
  await q.getByLabel('Numéro de téléphone').fill('776661234');
  await q.getByRole('button', { name: /Continuer/ }).click();
  await q.waitForTimeout(800);
  await q.locator('#pin').fill('8642');
  await q.waitForTimeout(1500);
  check('reconnexion avec le nouveau code', await q.getByRole('heading', { name: /Awa/, level: 1 }).isVisible());
  await q.screenshot({ path: SP + '/es-5-desktop.png', fullPage: true });
  console.log(res.join('\n'));
  console.log('errors', errors);
  await b.close();
})().catch(e => {
  console.log(res.join('\n'));
  console.log('ERR', e.message);
  process.exit(1);
});
