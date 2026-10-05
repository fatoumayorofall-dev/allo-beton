const { chromium, devices } = require('playwright');
const B = 'http://localhost:8787',
  SP = process.env.SP;
const check = (n, ok, extra = '') => console.log(`${ok ? 'OK  ' : 'FAIL'} ${n} ${extra}`);
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
  const p = await c.newPage();
  await p.goto(B + '/boutique');
  await p.waitForTimeout(1500);
  const shop = await p.locator('main').innerText();
  check('boutique : classes de prix affichées', /20\s000 – 30\s000 F/.test(shop) && /10\s000 – 20\s000 F/.test(shop));
  check('boutique : aucun prix exact', !/\d[\d\s ]*\s?FCFA/.test(shop), (shop.match(/\d[\d\s ]*\s?FCFA/) || [''])[0]);
  await p.screenshot({ path: SP + '/pc-1-boutique.png' });
  await p.goto(B + '/produit/sac-ndella-noir');
  await p.waitForTimeout(1200);
  const dp = await p.getByTestId('detail-price').innerText();
  check('fiche : classe de prix', dp === '20 000 – 30 000 F', dp);
  check('fiche : 25 000 nulle part', !/25[\s ]000/.test(await p.locator('body').innerText()));
  await p.screenshot({ path: SP + '/pc-2-fiche.png' });
  await p
    .getByRole('button', { name: /Ajouter au panier/ })
    .first()
    .click();
  await p.waitForTimeout(500);
  await p.goto(B + '/panier');
  await p.waitForTimeout(1000);
  const cart = await p.locator('main').innerText();
  check(
    'panier : classe de prix, pas de total exact',
    /20\s000 – 30\s000 F/.test(cart) && !/25[\s ]000/.test(cart) && /Prix exact sur WhatsApp/.test(cart),
  );
  await p.screenshot({ path: SP + '/pc-3-panier.png', fullPage: false });
  await p.goto(B + '/commande');
  await p.waitForTimeout(800);
  check('commande sans lien de la gérante : renvoyée au panier', /\/panier$/.test(p.url()), p.url());
  // demande pas encore confirmée : pas de prix exact
  await fetch(B + '/api/requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'DEM-PRXAB', items: [{ productId: 'MAE-101', name: 'x', price: 25000, quantity: 1 }] }),
  });
  const r = await (await fetch(B + '/api/requests/DEM-PRXAB')).json();
  check(
    'demande non confirmée : ni prix ni total',
    r.items?.length && r.items.every(i => i.price === undefined) && r.total === undefined,
    JSON.stringify(r).slice(0, 120),
  );
  // aperçu de lien (WhatsApp, Facebook)
  const html = await (await fetch(B + '/produit/sac-ndella-noir')).text();
  const og = (html.match(/<meta property="og:description" content="([^"]*)"/) || [])[1] || '';
  check(
    'aperçu de lien : classe de prix',
    /20 000 – 30 000 F/.test(og) && !/25 000/.test(html.match(/<head>[\s\S]*<\/head>/)?.[0] || ''),
    og.slice(0, 90),
  );
  const seo = await (await fetch(B + '/seo-data.json')).text();
  check('seo-data.json : aucun prix exact', !/"price"/.test(seo));
  // la gérante voit toujours le vrai prix
  const tok = (
    await (
      await fetch(B + '/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pin: '2026' }),
      })
    ).json()
  ).token;
  const g = await c.newPage();
  await g.goto(B + '/admin');
  await g.getByLabel('Code PIN').fill('2026');
  await g.getByRole('button', { name: 'Se connecter' }).click();
  await g.waitForTimeout(1200);
  await g.getByRole('button', { name: 'Produits' }).first().click();
  await g.waitForTimeout(1000);
  await g.screenshot({ path: SP + '/pc-4-gerante.png' });
  const adm = await g.locator('body').innerText();
  check('espace gérante : prix exacts visibles', /\d{2}[\s ]000 FCFA/.test(adm), tok ? '' : 'pas de jeton');
  await b.close();
})();
