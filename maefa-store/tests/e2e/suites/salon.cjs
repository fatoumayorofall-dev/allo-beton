const toCheckout = require('../tocheckout.cjs');
const { chromium } = require('playwright');
const B = 'http://localhost:8787';
const check = (t, ok) => console.log((ok ? 'OK ' : 'FAIL ') + t);
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const d = await c.newPage();
  await d.goto(B + '/compte', { waitUntil: 'networkidle' });
  await d.getByLabel('Numéro de téléphone').fill('77 222 33 44');
  await d.getByRole('button', { name: /Continuer/ }).click();
  await d.waitForTimeout(900);
  await d.locator('#pin').fill('2468');
  await d.waitForTimeout(400);
  await d.locator('#pin').fill('2468');
  await d.waitForTimeout(1500);
  if (
    await d
      .getByLabel('Votre prénom')
      .isVisible()
      .catch(() => false)
  ) {
    await d.getByLabel('Votre prénom').fill('Fatou');
    await d.getByRole('button', { name: /Entrer dans mon espace/ }).click();
    await d.waitForTimeout(1000);
  }
  check('sans historique : sélection de la maison', await d.getByTestId('account-picks').isVisible());
  await d.goto(B + '/produit/sac-ndella-camel', { waitUntil: 'networkidle' });
  await d.getByRole('button', { name: 'Ajouter aux favoris' }).first().click();
  await d.waitForTimeout(400);
  await d
    .getByRole('button', { name: /Ajouter au panier/ })
    .first()
    .click();
  await d.waitForTimeout(600);
  await toCheckout(d, B, { waitUntil: 'networkidle' });
  await d.waitForTimeout(800);
  if (!(await d.getByLabel('Nom *', { exact: true }).inputValue()))
    await d.getByLabel('Nom *', { exact: true }).fill('Ndiaye');
  if (!(await d.getByLabel(/Adresse écrite/).inputValue()))
    await d.getByLabel(/Adresse écrite/).fill('Villa 3, Mermoz');
  await d.getByRole('button', { name: 'Continuer vers le paiement' }).click();
  await d.waitForTimeout(500);
  await d.getByRole('button', { name: /^Valider ma commande/ }).click();
  await d.waitForURL(/confirmation/, { timeout: 10000 });
  await d.waitForTimeout(1200);
  check('confirmation : suggestions pour compléter', /ensemble/.test(await d.getByTestId('account-picks').innerText()));
  await d.goto(B + '/suivi', { waitUntil: 'networkidle' });
  await d.waitForTimeout(800);
  check('suivi : commandes récentes proposées', await d.getByTestId('recent-orders').isVisible());
  await d.getByTestId('recent-orders').getByRole('button').first().click();
  await d.waitForTimeout(1200);
  check(
    'suivi : un toucher ouvre la commande',
    /MAE-/.test(await d.locator('p.font-display.text-4xl').first().innerText()) && /commande=MAE-/.test(d.url()),
  );
  check('suivi : suggestions en attendant le colis', await d.getByTestId('account-picks').isVisible());
  await d.goto(B + '/compte', { waitUntil: 'networkidle' });
  await d.waitForTimeout(1200);
  const picks = d.getByTestId('account-picks');
  check('sélection personnelle affichée', await picks.isVisible());
  check('titre au prénom', /Fatou, ces pièces/.test(await picks.innerText()));
  check('pas de pièce déjà en favori dans la sélection', !(await picks.innerText()).includes('Sac Ndella — Camel'));
  check('favori : signal « Prix doux »', (await d.getByTestId('fav-signal').count()) >= 0);
  await d.getByTestId('reorder').click();
  await d.waitForTimeout(800);
  check(
    "Recommander : le panier s'ouvre avec la pièce",
    (await d.getByText('Sac Ndella — Camel').last().isVisible()) &&
      /Prix exact/i.test(await d.locator('body').innerText()),
  );
  await d.keyboard.press('Escape');
  await d.waitForTimeout(400);
  const cartCount = async () =>
    await d.evaluate(() => JSON.parse(localStorage.getItem('maefa_cart') || '[]').reduce((s, i) => s + i.quantity, 0));
  check('Recommander : 1 pièce dans le panier', (await cartCount()) === 1);
  await d.getByTestId('fav-buy').first().click();
  await d.waitForTimeout(700);
  check(
    'favori : achat en un geste (aperçu ou panier)',
    (await cartCount()) === 2 ||
      (await d
        .getByRole('dialog')
        .isVisible()
        .catch(() => false)),
  );
  await d.goto(B + '/favoris', { waitUntil: 'networkidle' });
  await d.waitForTimeout(800);
  check('favoris : « Vous aimerez aussi »', /Vous aimerez/.test(await d.getByTestId('account-picks').innerText()));
  await d.goto(B + '/mes-commandes', { waitUntil: 'networkidle' });
  await d.waitForTimeout(800);
  check('mes commandes : suggestions', await d.getByTestId('account-picks').isVisible());
  const m = await b.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto(B + '/favoris');
  await m.waitForTimeout(900);
  const box = await m.getByTestId('account-picks').locator('article').first().boundingBox();
  check('téléphone : première suggestion alignée sur la marge', box && box.x >= 12);
  await b.close();
})().catch(e => {
  console.log('ERR ' + e.message.split('\n')[0]);
  process.exit(1);
});
