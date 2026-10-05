const toCheckout = require('../tocheckout.cjs');
const { chromium } = require('playwright');
const B = 'http://localhost:4173';
const results = [];
const check = (name, ok, extra = '') => results.push(`${ok ? 'OK  ' : 'FAIL'} ${name} ${extra}`);
(async () => {
  const b = await chromium.launch();
  const errors = [];
  const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on(
    'console',
    m => m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text()) && errors.push(m.text()),
  );
  const shot = n => page.screenshot({ path: `${process.env.SP}/a-${n}.png` });
  const stockOf = slug =>
    page.evaluate(s => JSON.parse(localStorage.getItem('maefa_products')).find(p => p.slug === s).stock, slug);

  await page.goto(B + '/');
  await page.waitForTimeout(1200);
  await shot('home');
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(900);
  await shot('home2');
  // méga-menu
  await page.goto(B + '/');
  await page.waitForTimeout(300);
  await page.getByRole('link', { name: 'Sacs', exact: true }).first().hover();
  await page.waitForTimeout(500);
  await shot('mega');
  check('méga-menu', await page.getByText('Notre coup de cœur').isVisible());

  // Ajout rapide depuis la carte (taille)
  await page.goto(B + '/boutique/sacs');
  await page.waitForTimeout(600);
  await shot('catalog');
  const card = page.locator('article').first();
  await card.hover();
  await page.waitForTimeout(600);
  await card.getByRole('button', { name: /Ajouter au panier/ }).click();
  let cart = await page.evaluate(() => JSON.parse(localStorage.getItem('maefa_cart')));
  check('ajout rapide depuis la carte (sac sans taille)', cart.length === 1, JSON.stringify(cart.map(c => c.key)));

  // Aperçu rapide + Échap
  await card.getByRole('button', { name: 'Aperçu rapide' }).click();
  await page.waitForTimeout(500);
  await shot('quickview');
  check('aperçu rapide ouvert', await page.getByRole('dialog').isVisible());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check('Échap ferme aperçu', (await page.getByRole('dialog').count()) === 0);

  // Tiroir panier + Échap
  await page.getByRole('button', { name: /Ouvrir le panier/ }).click();
  await page.waitForTimeout(600);
  await shot('drawer');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check('Échap ferme panier', (await page.getByRole('dialog', { name: 'Panier' }).count()) === 0);

  // Promo avec minimum non atteint
  await page.goto(B + '/panier');
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: "J'ai un code promo" }).click();
  await page.getByLabel('Code promo').fill('MAEFA5000');
  await page.getByRole('button', { name: 'Appliquer' }).click();
  await page.waitForTimeout(300);
  check('promo appliqué (minimum atteint)', await page.getByText('MAEFA5000').first().isVisible());
  await page.reload();
  await page.waitForTimeout(400);
  check('promo conservé après rechargement', await page.getByText('MAEFA5000').first().isVisible());
  await page.getByRole('button', { name: 'Retirer le code' }).click();

  // Avis client
  await page.goto(B + '/produit/sac-ndella-noir');
  await page.waitForTimeout(500);
  await shot('product');
  await page.getByRole('button', { name: /Avis clientes/ }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Donner mon avis' }).click();
  await page.getByLabel('Votre nom').fill('Test A.');
  await page.getByLabel('Votre avis').fill('Superbes escarpins, très confortables.');
  await page.getByRole('button', { name: 'Publier' }).click();
  await page.waitForTimeout(300);
  check('avis publié', await page.getByText('Superbes escarpins').isVisible());

  // Commande avec emballage cadeau + mémorisation
  const before = await stockOf('sac-ndella-camel');
  await page.goto(B + '/panier');
  await page.waitForTimeout(300);
  await page.getByText('Emballage cadeau signature').click();
  await page.getByLabel('Message cadeau').fill('Joyeux anniversaire !');
  await toCheckout(page, B);
  await page.waitForTimeout(300);
  await page.getByLabel('Prénom *').fill('Awa');
  await page.getByLabel('Nom *', { exact: true }).fill('Diop');
  await page.getByLabel('Téléphone *').fill('77 123 45 67');
  await page.getByLabel(/Adresse écrite/).fill('Villa 12, Sacré-Cœur 3');
  await shot('checkout1');
  await page.getByRole('button', { name: 'Continuer vers le paiement' }).click();
  await page.waitForTimeout(300);
  await shot('checkout2');
  await page.getByRole('button', { name: /^Valider ma commande/ }).click();
  await page.waitForURL(/confirmation/, { timeout: 8000 });
  await page.waitForTimeout(500);
  await shot('success');
  const orderId = page.url().split('/').pop();
  check('message cadeau sur confirmation', await page.getByText('Joyeux anniversaire').isVisible());
  const after = await stockOf('sac-ndella-camel');
  check('stock décrémenté', after === before - 1, `${before}→${after}`);

  // Mes commandes + préremplissage
  await page.goto(B + '/mes-commandes');
  await page.waitForTimeout(300);
  await shot('myorders');
  check('mes commandes', await page.getByText(orderId).isVisible());
  await page.goto(B + '/produit/sac-ndella-camel');
  await page.waitForTimeout(300);
  await page
    .getByRole('button', { name: /Ajouter au panier/ })
    .first()
    .click();
  await page.waitForTimeout(400);
  await toCheckout(page, B);
  await page.waitForTimeout(400);
  check('coordonnées préremplies', (await page.getByLabel('Prénom *').inputValue()) === 'Awa');

  // Admin : annulation → restock ; changement de prix → panier réaligné
  await page.goto(B + '/admin');
  await page.getByLabel('Code PIN').fill('2026');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForTimeout(400);
  await shot('admin');
  await page
    .getByRole('button', { name: /Commandes/ })
    .first()
    .click();
  await page.waitForTimeout(200);
  await page.getByText(orderId).click();
  await page.waitForTimeout(200);
  await page.getByRole('dialog').locator('select').selectOption('annulee');
  await page.waitForTimeout(300);
  check(
    'annulation remet en stock',
    (await stockOf('sac-ndella-camel')) === before,
    `${await stockOf('sac-ndella-camel')}`,
  );
  await page.getByRole('dialog').locator('select').selectOption('confirmee');
  await page.waitForTimeout(300);
  check('réactivation retire du stock', (await stockOf('sac-ndella-camel')) === before - 1);
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const l = JSON.parse(localStorage.getItem('maefa_products'));
    l.find(p => p.slug === 'sac-ndella-camel').price = 40000;
    localStorage.setItem('maefa_products', JSON.stringify(l));
  });
  await page.reload();
  await page.waitForTimeout(400);
  cart = await page.evaluate(() => JSON.parse(localStorage.getItem('maefa_cart')));
  check(
    'prix convenu avec la gérante gardé',
    cart.find(c => c.productId === 'MAE-101')?.price === 25000,
    JSON.stringify(cart.map(c => c.price)),
  );
  await page.evaluate(() => {
    const c = JSON.parse(localStorage.getItem('maefa_cart'));
    c.forEach(i => delete i.agreed);
    localStorage.setItem('maefa_cart', JSON.stringify(c));
  });
  await page.reload();
  await page.waitForTimeout(400);
  cart = await page.evaluate(() => JSON.parse(localStorage.getItem('maefa_cart')));
  check(
    'prix panier réaligné (sans prix convenu)',
    cart.find(c => c.productId === 'MAE-101')?.price === 40000,
    JSON.stringify(cart.map(c => c.price)),
  );

  // Mobile : débordement horizontal
  const m = await b.newPage({ viewport: { width: 390, height: 844 } });
  m.on('pageerror', e => errors.push('mob ' + e.message));
  for (const path of [
    '/',
    '/boutique',
    '/boutique/sacs',
    '/produit/sac-ndella-camel',
    '/panier',
    '/faq',
    '/a-propos',
    '/favoris',
    '/mes-commandes',
    '/suivi',
    '/nimporte',
  ]) {
    await m.goto(B + path);
    await m.waitForTimeout(350);
    const o = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (o > 0) check('overflow mobile ' + path, false, o + 'px');
  }
  await m.goto(B + '/');
  await m.waitForTimeout(1000);
  await m.screenshot({ path: `${process.env.SP}/a-mob-home.png` });
  await m.goto(B + '/produit/sac-ndella-camel');
  await m.waitForTimeout(500);
  await m.mouse.wheel(0, 1600);
  await m.waitForTimeout(800);
  await m.screenshot({ path: `${process.env.SP}/a-mob-product.png` });
  check(
    'barre achat mobile',
    await m.evaluate(() => {
      const el = [...document.querySelectorAll('div')].find(d => d.className.includes('lg:hidden fixed bottom-0'));
      return (el && getComputedStyle(el).transform === 'none') || el.className.includes('translate-y-0');
    }),
  );
  await m.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await m.waitForTimeout(500);
  await m.screenshot({ path: `${process.env.SP}/a-mob-menu.png` });

  console.log(results.join('\n'));
  console.log('errors', errors);
  await b.close();
})().catch(e => {
  console.log(results.join('\n'));
  console.error(e.message);
  process.exit(1);
});
