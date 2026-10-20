// Mise à jour du site pendant qu'une cliente a la page ouverte : les anciens fichiers n'existent plus.
// La page doit se recharger toute seule une fois (pas de page blanche), puis afficher les pièces.
const { chromium, devices } = require('playwright');
const SP = process.env.SP;
const B = 'http://localhost:8787';
const res = [];
const check = (n, ok, x = '') => res.push(`${ok ? 'OK  ' : 'FAIL'} ${n} ${x}`);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
  await ctx.route(/pexels|fonts\.g|tile|openstreetmap|arcgis/, r => r.fulfill({ status: 204, body: '' }));
  const p = await ctx.newPage();
  let navigations = 0;
  p.on('framenavigated', f => f === p.mainFrame() && navigations++);

  // 1. Fichier de page disparu (ancienne version) : refusé une seule fois, comme après un déploiement
  let refused = 0;
  await p.route(/\/assets\/Cart-[\w-]+\.js$/, r =>
    refused++ === 0 ? r.fulfill({ status: 404, body: '' }) : r.continue(),
  );
  await p.goto(B + '/');
  await p.waitForTimeout(800);
  const before = navigations;
  await p.evaluate(() => {
    history.pushState({}, '', '/panier');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await p.waitForTimeout(3500);
  check('fichier disparu : la page se recharge seule', navigations > before, `navigations ${before}→${navigations}`);
  check('puis le panier s’affiche', /panier/i.test(await p.locator('main').innerText()));
  await p.screenshot({ path: `${SP}/mj-1-panier.png` });

  // 2. Fichier toujours introuvable : pas de page blanche, un bouton « Recharger »
  const p2 = await ctx.newPage();
  await p2.route(/\/assets\/Account-[\w-]+\.js$/, r => r.fulfill({ status: 404, body: '' }));
  await p2.goto(B + '/');
  await p2.waitForTimeout(800);
  await p2.evaluate(() => sessionStorage.setItem('maefa_reload_at', String(Date.now())));
  await p2.evaluate(() => {
    history.pushState({}, '', '/compte');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await p2.waitForTimeout(2500);
  check('échec répété : message clair', await p2.getByText("La page n'a pas pu s'afficher").isVisible());
  check('bouton « Recharger » proposé', await p2.getByRole('button', { name: 'Recharger' }).isVisible());
  await p2.screenshot({ path: `${SP}/mj-2-recharger.png` });

  // 3. La boutique et une fiche s'affichent normalement
  await p2.goto(B + '/boutique');
  await p2.waitForTimeout(1200);
  check('boutique : pièces affichées', (await p2.locator('a[href^="/produit/"]').count()) > 5);
  console.log(res.join('\n'));
  await b.close();
})().catch(e => {
  console.log(res.join('\n'));
  console.log('ERR', e.message);
  process.exit(1);
});
