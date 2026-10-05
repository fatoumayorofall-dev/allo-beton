const toCheckout = require('../tocheckout.cjs');
const { chromium, devices } = require('playwright');
const fs = require('fs'),
  crypto = require('crypto'),
  path = require('path');
const SP = process.env.SP,
  F = require('path').join(__dirname, '../fixtures/fonts'),
  css = fs.readFileSync(F + '/fonts.css', 'utf8');
const B = 'http://localhost:8787',
  A = { 'x-admin-pin': '2026', 'Content-Type': 'application/json' };
const res = [];
const check = (n, ok, x = '') => res.push(`${ok ? 'OK  ' : 'FAIL'} ${n} ${x}`);
const px = id => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?w=800`;
(async () => {
  const b = await chromium.launch();
  const errors = [];
  const mk = async opts => {
    const ctx = await b.newContext({ ...opts, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    p.on('dialog', d => d.accept());
    await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: css }));
    await p.route('https://fonts.gstatic.com/**', r => {
      const f = path.join(
        F,
        crypto
          .createHash('md5')
          .update(r.request().url() + '\n')
          .digest('hex')
          .slice(0, 12) + '.woff2',
      );
      fs.existsSync(f) ? r.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(f) }) : r.abort();
    });
    const imgs = fs
      .readdirSync(require('path').join(__dirname, '../fixtures/photos'))
      .map(f => fs.readFileSync(require('path').join(__dirname, '../fixtures/photos') + '/' + f));
    await p.route('https://images.pexels.com/**', r => {
      const h = parseInt(
        crypto.createHash('md5').update(r.request().url().split('?')[0]).digest('hex').slice(0, 6),
        16,
      );
      r.fulfill({ contentType: 'image/jpeg', body: imgs[h % imgs.length] });
    });
    await p.addInitScript(() => {
      try {
        localStorage.setItem('maefa_install_banner', String(Date.now()));
        sessionStorage.setItem('maefa_assistant_hint', '1');
      } catch {
        /* stockage indisponible */
      }
    });
    return { p, ctx };
  };
  const shot = (p, n) => p.screenshot({ path: `${SP}/ex-${n}.jpg`, type: 'jpeg', quality: 72 });
  const api = async (u, o) => {
    const r = await fetch(B + u, o);
    return { status: r.status, body: r.status === 204 ? null : await r.json().catch(() => null) };
  };
  const catalog = async () => (await api('/api/catalog')).body.products;
  const putProduct = async (slug, patch) => {
    const p = (await catalog()).find(x => x.slug === slug);
    return api(`/api/admin/catalog/products/${p.id}`, {
      method: 'PUT',
      headers: A,
      body: JSON.stringify({ ...p, ...patch }),
    });
  };
  const checkout = async (p, { cash = false } = {}) => {
    await toCheckout(p, B);
    await p.waitForTimeout(900);
    await p.getByLabel('Prénom *').fill('Binta');
    await p.getByLabel('Nom *', { exact: true }).fill('Fall');
    await p.getByLabel('Téléphone *').fill('77 444 33 22');
    await p.getByLabel(/Adresse écrite/).fill('Villa 8, Point E');
    await p.getByRole('button', { name: 'Continuer vers le paiement' }).click();
    await p.waitForTimeout(500);
    if (cash) await p.getByText('À la livraison', { exact: true }).click();
  };

  check('catalogue pas encore publié', (await api('/api/catalog')).body.products === null);

  // ── 1. La gérante ouvre « Produits » : le catalogue est publié pour toutes les clientes
  const { p: g } = await mk({ viewport: { width: 1440, height: 1000 } });
  await g.addInitScript(() => {
    sessionStorage.setItem('maefa_admin', '1');
    sessionStorage.setItem('maefa_admin_pin', '2026');
  });
  await g.goto(B + '/admin');
  await g.waitForTimeout(700);
  await g.getByRole('button', { name: 'Produits' }).click();
  await g.waitForTimeout(2000);
  check('catalogue publié (50 pièces)', (await catalog())?.length === 50);
  check('admin : « Catalogue en ligne »', /Catalogue en ligne/.test(await g.getByTestId('catalog-status').innerText()));
  // Modifier un prix + ajouter un produit depuis l'espace gérant
  await g
    .getByRole('row', { name: /Sac Ndella — Noir/ })
    .getByRole('button', { name: 'Modifier' })
    .click();
  await g.getByLabel('Prix (FCFA) *').fill('33000');
  await g.getByRole('button', { name: /Enregistrer/ }).click();
  await g.waitForTimeout(1200);
  check('prix modifié sur le serveur', (await catalog()).find(p => p.slug === 'sac-ndella-noir').price === 33000);
  await g.getByRole('button', { name: 'Nouveau produit' }).click();
  await g.getByLabel('Nom *').fill('Mocassins Adja en daim');
  await g.getByLabel('Prix (FCFA) *').fill('26000');
  await g.getByLabel('Stock').fill('5');
  await g.getByRole('button', { name: /Enregistrer/ }).click();
  await g.waitForTimeout(1200);
  check(
    'nouveau produit publié',
    (await catalog()).some(p => p.name === 'Mocassins Adja en daim'),
  );

  // ── 2. Une cliente sur un autre téléphone voit les changements
  const { p: c } = await mk({ ...devices['Pixel 7'] });
  await c.goto(B + '/boutique/chaussures');
  await c.waitForTimeout(1500);
  check('cliente : nouveau produit visible', await c.getByText('Mocassins Adja en daim').first().isVisible());
  await c.goto(B + '/produit/sac-ndella-noir');
  await c.waitForTimeout(1000);
  check(
    'cliente : nouvelle classe de prix (33 000 → 30 000 – 50 000 F), sans le prix exact',
    /30\s000 – 50\s000 F/.test(await c.locator('main').innerText()) &&
      !/33\s000/.test(await c.locator('main').innerText()),
  );

  // ── 3. Stock partagé : la dernière paire
  await putProduct('sac-ndella-chocolat', { stock: 1, preorderDays: undefined });
  await c.goto(B + '/produit/sac-ndella-chocolat');
  await c.waitForTimeout(1000);
  check('fiche : stock jamais affiché', !/Plus que|[0-9] pièce/.test(await c.getByTestId('stock-line').innerText()));
  await c
    .getByRole('button', { name: /^3[6-9]$|^40$/ })
    .first()
    .click()
    .catch(() => {});
  await c.getByRole('button', { name: 'Ajouter au panier' }).first().click();
  await c.waitForTimeout(800);
  await checkout(c, { cash: true });
  await c.getByRole('button', { name: /Confirmer la commande/ }).click();
  await c.waitForURL(/confirmation/, { timeout: 9000 });
  await c.waitForTimeout(1200);
  check('stock : 1 → 0 après la commande', (await catalog()).find(p => p.slug === 'sac-ndella-chocolat').stock === 0);
  const { p: c2 } = await mk({ ...devices['iPhone 13'] });
  await c2.goto(B + '/produit/sac-ndella-chocolat');
  await c2.waitForTimeout(1300);
  check('autre cliente : « Épuisé »', /Épuisé/.test(await c2.getByTestId('stock-line').innerText()));
  // Alerte de retour en stock → visible par la gérante
  await c2
    .getByPlaceholder(/WhatsApp|e-mail|numéro/i)
    .first()
    .fill('77 111 22 33');
  await c2
    .getByRole('button', { name: /Me prévenir|Prévenez|M'alerter/i })
    .first()
    .click();
  await c2.waitForTimeout(800);
  check(
    'alerte enregistrée sur le serveur',
    (await api('/api/admin/stock-alerts', { headers: A })).body.alerts.some(a => a.contact.includes('77 111 22 33')),
  );
  // Survente impossible
  const orders = (await api('/api/admin/orders', { headers: A })).body.orders;
  const mo = orders[0];
  const over = await api('/api/orders', {
    method: 'POST',
    headers: A,
    body: JSON.stringify({ order: { ...mo, id: 'MAE-OVER01' } }),
  });
  check('survente refusée (stock 0)', over.status === 409 && /épuisé/.test(over.body.error), over.body?.error);
  const cheap = await api('/api/orders/check', {
    method: 'POST',
    headers: A,
    body: JSON.stringify({
      items: [{ productId: 'MAE-101', name: 'Sac', price: 100, quantity: 1 }],
      paymentMethod: 'wave',
    }),
  });
  check('prix trafiqué refusé', cheap.status === 409 && /prix/.test(cheap.body.error));
  // Annulation → stock rendu
  await api(`/api/admin/orders/${mo.id}`, {
    method: 'PATCH',
    headers: A,
    body: JSON.stringify({ status: 'annulee', notify: false }),
  });
  check('annulation : stock rendu (0 → 1)', (await catalog()).find(p => p.slug === 'sac-ndella-chocolat').stock === 1);

  // ── 4. Sur commande : bottines épuisées mais commandables sous 7 jours
  await putProduct('sac-ndella-noir', { stock: 0, preorderDays: 7 });
  const { p: c3 } = await mk({ ...devices['Pixel 7'] });
  await c3.goto(B + '/boutique/sacs');
  await c3.waitForTimeout(1500);
  check('carte : badge « Sur commande · 7 j »', await c3.getByTestId('badge-preorder').first().isVisible());
  await c3.goto(B + '/produit/sac-ndella-noir');
  await c3.waitForTimeout(1000);
  check(
    'fiche : « Sur commande — livrée sous 7 jours »',
    /Sur commande — livrée sous 7 jours/.test(await c3.getByTestId('stock-line').innerText()),
  );
  await c3.getByRole('button', { name: 'Commander' }).first().click();
  await c3.waitForTimeout(800);
  check('panier : « Sur commande »', await c3.getByTestId('cart-preorder').first().isVisible());
  await checkout(c3);
  check(
    "paiement : pas d'espèces, message sur commande",
    (await c3.getByText('À la livraison', { exact: true }).count()) === 0 &&
      /sur commande/.test(await c3.getByTestId('market-notice').innerText()),
  );
  await shot(c3, '1-paiement-sur-commande');
  await c3.getByRole('button', { name: /^Valider ma commande/ }).click();
  await c3.waitForURL(/confirmation/, { timeout: 9000 });
  await c3.waitForTimeout(1200);
  check('confirmation : message sur commande', await c3.getByTestId('success-preorder').isVisible());
  const po = (await api('/api/admin/orders', { headers: A })).body.orders.find(o => o.items.some(i => i.preorder));
  check('serveur : pièce marquée sur commande (7 j)', po?.items[0].preorder?.days === 7);
  check('sur commande : stock inchangé', (await catalog()).find(p => p.slug === 'sac-ndella-noir').stock === 0);
  const cashPre = await api('/api/orders/check', {
    method: 'POST',
    headers: A,
    body: JSON.stringify({ items: po.items, paymentMethod: 'cash' }),
  });
  check('sur commande en espèces refusé', cashPre.status === 409);

  // ── 5. Avis partagé
  await c3.goto(B + '/produit/sac-ndella-camel');
  await c3.waitForTimeout(1000);
  const before = (await catalog()).find(p => p.slug === 'sac-ndella-camel').reviewCount;
  const rv = await api('/api/catalog/products/MAE-101/reviews', {
    method: 'POST',
    headers: A,
    body: JSON.stringify({ author: 'Ndeye', rating: 5, comment: 'Magnifique, livrée en 24h !' }),
  });
  check(
    'avis publié pour toutes',
    rv.status === 201 && (await catalog()).find(p => p.slug === 'sac-ndella-camel').reviewCount === before + 1,
  );

  // ── 6. Marché : seulement chaussures et sacs
  await api('/api/admin/marche/products', {
    method: 'POST',
    headers: A,
    body: JSON.stringify({ name: 'Lampe déco', category: 'Maison', images: [px(1123262)], price: 9000 }),
  });
  await api('/api/admin/marche/products', {
    method: 'POST',
    headers: A,
    body: JSON.stringify({
      name: 'Sac bandoulière matelassé',
      category: 'Sacs',
      images: [px(1152077)],
      price: 18500,
      delayMin: 10,
      delayMax: 18,
    }),
  });
  const { p: c4 } = await mk({ viewport: { width: 1440, height: 900 } });
  await c4.goto(B + '/marche');
  await c4.waitForTimeout(1300);
  check(
    'Marché éteint : /marche renvoie vers la boutique',
    /\/boutique$/.test(new URL(c4.url()).pathname) && (await c4.getByText('Sac bandoulière matelassé').count()) === 0,
  );
  await c4.goto(B + '/boutique/sacs');
  await c4.waitForTimeout(1300);
  check('page Sacs : pas de bloc Marché', (await c4.getByTestId('catalog-market').count()) === 0);
  const nav = await c4.locator('header nav').first().innerText();
  check('menu : ni Marché, ni Journal, ni Offres', !/MARCH|JOURNAL|OFFRES/i.test(nav), nav.replace(/\n/g, ' | '));

  // ── 7. Plus vivant : bulles « style », compteur panier, chiffres animés
  await c4.goto(B + '/');
  await c4.waitForTimeout(1500);
  {
    const n = await c4.getByTestId('style-stories').locator('li').count();
    check('accueil : bulles « style » (masquées sous 3 styles)', n === 0 || n >= 3, String(n));
  }
  const { p: m } = await mk({ ...devices['Pixel 7'] });
  await m.goto(B + '/');
  await m.waitForTimeout(1500);
  check('mobile : pas de débordement', await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await m.evaluate(() => scrollTo(0, 500));
  await m.waitForTimeout(900);
  await shot(m, '4-mobile-styles');

  console.log(res.join('\n'));
  console.log('errors', errors);
  await b.close();
})().catch(e => {
  console.log(res.join('\n'));
  console.error('ERR', e.message);
  process.exit(1);
});
