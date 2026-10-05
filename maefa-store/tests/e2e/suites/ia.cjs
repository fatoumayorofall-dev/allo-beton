// Données & IA : collecte anonyme du parcours, pipeline, recommandations, tableau de la gérante.
const { chromium, devices } = require('playwright');
const SP = process.env.SP;
const B = 'http://localhost:8787';
const res = [];
const check = (n, ok, x = '') => res.push(`${ok ? 'OK  ' : 'FAIL'} ${n} ${x}`);
(async () => {
  const b = await chromium.launch();
  const errors = [];
  const mk = async opts => {
    const ctx = await b.newContext({ serviceWorkers: 'block', ...opts });
    await ctx.route(/pexels|fonts\.g/, r => r.abort());
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    return p;
  };

  // La gérante publie le catalogue (onglet Produits)
  const g = await mk({ viewport: { width: 1280, height: 900 } });
  await g.goto(B + '/admin');
  await g.getByLabel('Code PIN').fill('2026');
  await g.getByRole('button', { name: 'Se connecter' }).click();
  await g.waitForTimeout(800);
  await g.getByRole('button', { name: 'Produits' }).first().click();
  await g.waitForTimeout(1500);

  // Trois visiteuses aux goûts proches : Ndella noir puis Ndella camel
  const sent = [];
  for (let i = 0; i < 3; i++) {
    const p = await mk({ ...devices['Pixel 7'] });
    p.on('request', r => r.url().endsWith('/api/events') && sent.push(r.postData() || ''));
    await p.goto(B + '/produit/sac-ndella-noir');
    await p.waitForTimeout(500);
    await p.goto(B + '/produit/sac-ndella-camel');
    await p.waitForTimeout(500);
    await p
      .getByRole('button', { name: /Ajouter au panier/ })
      .first()
      .click();
    await p.waitForTimeout(2600); // envoi groupé toutes les 2 s
    await p.close();
  }
  check('collecte : événements envoyés', sent.length >= 3, String(sent.length));
  check(
    'collecte : aucune donnée personnelle (ni nom ni numéro)',
    sent.every(s => !/firstName|phone|\+221|77 /.test(s)),
  );

  // Pipeline recalculé, puis recommandations
  const tok = (
    await (
      await fetch(B + '/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pin: '2026' }),
      })
    ).json()
  ).token;
  const a = await (await fetch(B + '/api/admin/analytics?refresh=1', { headers: { 'x-admin-pin': tok } })).json();
  check(
    'pipeline : 3 visiteuses, 3 paniers',
    a.report?.entonnoir?.visiteuses === 3 && a.report.entonnoir.ajoutPanier === 3,
    JSON.stringify(a.report?.entonnoir),
  );
  const cat = (await (await fetch(B + '/api/catalog')).json()).products;
  const noir = cat.find(p => p.slug === 'sac-ndella-noir').id;
  const camel = cat.find(p => p.slug === 'sac-ndella-camel').id;
  const reco = await (await fetch(`${B}/api/reco/${noir}?k=4`)).json();
  check(
    'recommandation : appris du parcours (camel proposé pour noir)',
    reco.ids?.[0] === camel && reco.source === 'collaboratif',
    JSON.stringify(reco),
  );
  const cold = await (await fetch(`${B}/api/reco/${cat.find(p => p.slug.startsWith('sac-soxna')).id}?k=4`)).json();
  check(
    'recommandation : pièce sans historique → proches par le contenu',
    cold.ids?.length === 4 && cold.source === 'contenu',
    JSON.stringify(cold),
  );

  // Fiche produit : « Vous aimerez aussi » suit le modèle
  const c = await mk({ ...devices['Pixel 7'] });
  await c.goto(B + '/produit/sac-ndella-noir');
  await c.waitForTimeout(1500);
  const related = c.locator('section', { hasText: 'Vous aimerez aussi' });
  check(
    'fiche : « Vous aimerez aussi » commence par la pièce recommandée',
    /Camel/.test((await related.locator('article').first().innerText()) || ''),
  );

  // Tableau de la gérante
  await g.getByRole('button', { name: /Données & IA/ }).click();
  await g.waitForTimeout(1200);
  check('gérante : onglet Données & IA', await g.getByTestId('analytics-tab').isVisible());
  check(
    'gérante : entonnoir et modèle affichés',
    (await g.getByTestId('analytics-funnel').innerText()).includes('3') &&
      (await g.getByTestId('analytics-model').isVisible()),
  );
  await g.screenshot({ path: `${SP}/ia-1-gerante.png`, fullPage: true });

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  console.log(res.join('\n'));
  await b.close();
})().catch(e => {
  console.log(res.join('\n'));
  console.log('ERR', e.message);
  process.exit(1);
});
