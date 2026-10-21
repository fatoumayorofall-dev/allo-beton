// Place de marché : une vendeuse ouvre sa boutique et publie un article, la gérante valide,
// une acheteuse commande (livraison calculée selon la distance), la vendeuse livre,
// la commission due apparaît puis est réglée.
const { chromium, devices } = require('playwright');
const path = require('path');
const SP = process.env.SP;
const B = 'http://localhost:8787';
const A = { 'x-admin-pin': '2026', 'content-type': 'application/json' };
const PHOTOS = [0, 1].map(i => path.join(__dirname, `../fixtures/photos/p${i}.jpg`));
const res = [];
let browser;
const check = (n, ok, x = '') => res.push(`${ok ? 'OK  ' : 'FAIL'} ${n} ${x}`);
(async () => {
  const b = (browser = await chromium.launch());
  const errors = [];
  const mk = async geolocation => {
    const ctx = await b.newContext({
      ...devices['Pixel 7'],
      serviceWorkers: 'block',
      geolocation: { ...geolocation, accuracy: 12 },
      permissions: ['geolocation'],
    });
    await ctx.route(/pexels|fonts\.g|tile|openstreetmap|arcgis|wa\.me|nominatim|overpass/, r =>
      r.fulfill({ status: 204, body: '' }),
    );
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    return p;
  };
  const shot = (p, n) => p.screenshot({ path: `${SP}/pm-${n}.png` });
  const login = async (p, phone, firstName) => {
    await p.getByLabel('Numéro de téléphone').fill(phone);
    await p.getByRole('button', { name: /Continuer/ }).click();
    await p.waitForTimeout(800);
    const code = (await p.locator('strong.tracking-widest').innerText()).trim();
    await p.locator('#otp').fill(code);
    await p.waitForTimeout(1200);
    await p.getByLabel('Votre prénom').fill(firstName);
    await p.getByRole('button', { name: /Entrer dans mon espace/ }).click();
    // Retour à la page demandée (« retour=… ») : attendre la fin de la connexion, même sur une machine lente
    await p.waitForURL(u => !u.pathname.startsWith('/m/compte'), { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(800);
  };
  const pickHere = async p => {
    await p
      .getByRole('button', { name: /Je suis ici/ })
      .first()
      .click();
    await p.waitForFunction(() => !document.querySelector('[data-testid="gps-progress"]'), null, { timeout: 30000 });
    await p.getByTestId('confirm-location').click();
    await p.waitForTimeout(700);
  };

  // ── 1. La vendeuse (Médina) ouvre sa boutique
  const v = await mk({ latitude: 14.686, longitude: -17.452 });
  await v.goto(B + '/m/vendre');
  await v.waitForTimeout(1200);
  check('vendre : invitation à se connecter', await v.getByTestId('mp-sell-guest').isVisible());
  await v.getByRole('link', { name: /Me connecter pour commencer/ }).click();
  await v.waitForTimeout(1000);
  await login(v, '77 600 11 22', 'Awa');
  check('après connexion : retour sur « vendre »', /\/m\/vendre/.test(v.url()), v.url());
  await v.getByLabel('Nom de la boutique *').fill('Chez Awa Mode');
  await v.getByLabel('Ce que vous vendez *').selectOption('mode');
  await v.getByLabel('Quartier / ville').fill('Médina');
  await v.getByLabel('Présentation').fill('Robes wax et ensembles faits à Dakar.');
  await pickHere(v);
  await v.getByTestId('mp-shop-save').click();
  await v.waitForTimeout(1500);
  check('boutique ouverte, en vérification', await v.getByTestId('mp-seller-pending').isVisible());
  await shot(v, '1-boutique');

  // ── 2. Elle publie un article avec deux photos
  await v.getByTestId('mp-add-listing').click();
  await v.getByTestId('mp-photo-input').setInputFiles(PHOTOS);
  await v.waitForFunction(() => document.querySelectorAll('[data-testid="mp-listing-form"] img').length === 2, null, {
    timeout: 20000,
  });
  check('photos réduites et envoyées', true);
  await v.getByLabel('Titre *').fill('Robe wax longue');
  await v.getByLabel('Prix (F CFA) *').fill('12000');
  await v.getByLabel('Quantité en stock').fill('3');
  await v.getByLabel('Rayon *').selectOption('mode');
  await v.getByLabel('Choix').fill('Taille');
  await v.getByLabel('Possibilités (séparées par des virgules)').fill('M, L');
  await v.getByLabel('Description').fill('Coton wax, longueur cheville.');
  await shot(v, '2-article');
  await v.getByTestId('mp-listing-save').click();
  await v.waitForTimeout(1200);
  check(
    'article envoyé : « En vérification »',
    /En vérification/.test(await v.getByTestId('mp-my-listing').innerText()),
  );
  const before = await (await fetch(B + '/api/mp/listings')).json();
  check('pas visible avant la validation', before.total === 0);

  // ── 3. La gérante valide la boutique et l'article (onglet « Place de marché »)
  const g = await mk({ latitude: 14.69, longitude: -17.45 });
  await g.setViewportSize({ width: 1280, height: 900 });
  await g.addInitScript(() => {
    sessionStorage.setItem('maefa_admin', '1');
    sessionStorage.setItem('maefa_admin_pin', '2026');
  });
  await g.goto(B + '/admin');
  await g.waitForTimeout(800);
  await g.getByRole('button', { name: 'Place de marché' }).click();
  await g.waitForTimeout(1200);
  check('gérante : 1 article à vérifier', (await g.getByTestId('admin-mp-pending').count()) === 1);
  await shot(g, '3-gerante-verifier');
  await g.getByTestId('admin-mp-publish').click();
  await g.waitForTimeout(800);
  await g.getByRole('button', { name: /^Vendeurs/ }).click();
  await g.getByTestId('admin-mp-validate').click();
  await g.waitForTimeout(800);
  const after = await (await fetch(B + '/api/mp/listings')).json();
  check('article en ligne après validation', after.total === 1);
  const listingId = after.listings[0]?.id;
  check('aucun numéro de téléphone public', !JSON.stringify(after).includes('+221'));

  // ── 4. L'acheteuse (Parcelles) trouve l'article et commande
  const a = await mk({ latitude: 14.765, longitude: -17.44 });
  await a.goto(B + '/m');
  await a.waitForTimeout(1200);
  check('accueil : la boutique affichée', (await a.getByTestId('mp-shops').getByTestId('mp-shop-card').count()) === 1);
  check(
    'accueil : aucun prix (on ne compare pas les vendeurs)',
    !/\d\s?\d{3} F/.test(await a.locator('[data-testid="marketplace"] main').innerText()),
  );
  await shot(a, '4-accueil');
  await a.getByPlaceholder(/Une boutique, un quartier/).fill('robe');
  await a.getByRole('button', { name: 'Chercher' }).click();
  await a.waitForTimeout(800);
  check('recherche « robe » : la boutique qui en vend', (await a.getByTestId('mp-shop-card').count()) === 1);
  await a.getByTestId('mp-shop-card').first().click();
  await a.waitForSelector('[data-testid="mp-shop-grid"]', { timeout: 10000 });
  check('vitrine : prix visibles dans la boutique', /12\s000 F/.test(await a.getByTestId('mp-shop-grid').innerText()));
  await a.getByTestId('mp-shop-grid').getByTestId('mp-card').first().click();
  await a.waitForTimeout(1000);
  await a.getByTestId('mp-buy').click();
  check('choix de la taille exigé', await a.getByText('Choisissez : Taille').isVisible());
  await a.getByRole('radio', { name: 'M' }).click();
  await shot(a, '5-fiche');
  await a.getByTestId('mp-buy').click();
  await a.waitForTimeout(1000);
  check('panier : 1 article', /Robe wax longue/.test(await a.getByTestId('mp-cart').innerText()));
  await a.getByTestId('mp-confirm').click();
  await a.waitForTimeout(1000);
  await login(a, '78 700 33 44', 'Fatou');
  check('après connexion : retour au panier', /\/m\/panier/.test(a.url()), a.url());
  check('panier conservé', /Robe wax longue/.test(await a.getByTestId('mp-cart').innerText()));
  await pickHere(a);
  await a.waitForSelector('[data-testid="mp-quote"]', { timeout: 10000 });
  const fee = await a.getByTestId('mp-delivery-fee').innerText();
  check('livraison calculée selon la distance', /^[\d\s ]+F$/.test(fee) && fee !== '0 F', fee);
  await shot(a, '6-panier');
  await a.getByTestId('mp-confirm').click();
  await a.waitForSelector('[data-testid="mp-order-done"]', { timeout: 10000 });
  check('commande envoyée', true);
  await shot(a, '7-envoyee');

  // ── 5. Sécurité (serveur)
  const token = await a.evaluate(() => localStorage.getItem('maefa_token'));
  const H = { 'content-type': 'application/json', Authorization: `Bearer ${token}` };
  const q = await (
    await fetch(B + '/api/mp/quote', {
      method: 'POST',
      headers: H,
      body: JSON.stringify({
        items: [{ listingId, qty: 1, variant: 'L', price: 1 }],
        to: { lat: 14.765, lng: -17.44 },
      }),
    })
  ).json();
  check('prix imposé par le serveur (pas le navigateur)', q.orders?.[0]?.subtotal === 12000);
  const tooMany = await fetch(B + '/api/mp/orders', {
    method: 'POST',
    headers: H,
    body: JSON.stringify({
      items: [{ listingId, qty: 5, variant: 'L' }],
      to: { lat: 14.765, lng: -17.44 },
      name: 'Fatou',
    }),
  });
  check('stock respecté (2 restants)', tooMany.status === 400);
  const hack = await fetch(B + `/api/mp/me/listings/${listingId}`, {
    method: 'PATCH',
    headers: H,
    body: JSON.stringify({ price: 100 }),
  });
  check("l'acheteuse ne peut pas modifier l'article d'une autre", hack.status === 404);
  const notImage = await fetch(B + '/api/mp/me/photos', {
    method: 'POST',
    headers: { Authorization: H.Authorization, 'content-type': 'image/jpeg' },
    body: Buffer.from('ceci n’est pas une photo, juste du texte'),
  });
  check(
    'envoi de photo : boutique exigée / format contrôlé',
    [404, 415].includes(notImage.status),
    String(notImage.status),
  );

  // ── 5 bis. Anti-contournement : pas de numéro avant l'acceptation, pas de contact dans les textes
  const vToken = await v.evaluate(() => localStorage.getItem('maefa_token'));
  const VH = { 'content-type': 'application/json', Authorization: `Bearer ${vToken}` };
  const early = await (await fetch(B + '/api/mp/me/sales', { headers: VH })).json();
  check(
    'vendeuse : ni numéro ni adresse avant d’accepter',
    early.orders[0].buyer.phone === null && early.orders[0].delivery.to === null,
    JSON.stringify(early.orders[0].buyer),
  );
  const sneaky = await fetch(B + '/api/mp/me/listings', {
    method: 'POST',
    headers: VH,
    body: JSON.stringify({
      title: 'Robe wax',
      description: 'Moins cher sur WhatsApp : 77 123 45 67',
      price: 9000,
      category: 'mode',
      photos: after.listings[0].photos,
    }),
  });
  check('article avec numéro refusé', sneaky.status === 400);
  const noteHack = await fetch(B + '/api/mp/orders', {
    method: 'POST',
    headers: H,
    body: JSON.stringify({
      items: [{ listingId, qty: 1, variant: 'L' }],
      to: { lat: 14.765, lng: -17.44 },
      name: 'Fatou',
      note: 'appelle-moi au 78 700 33 44',
    }),
  });
  check('message avec numéro refusé', noteHack.status === 400);

  // ── 6. La vendeuse traite la commande jusqu'à la livraison
  await v.reload();
  await v.waitForTimeout(1200);
  await v.getByRole('tab', { name: /Commandes/ }).click();
  check('vendeuse : nouvelle commande', (await v.getByTestId('mp-sale').count()) === 1);
  await shot(v, '8-commande-recue');
  for (const st of ['acceptee', 'prete', 'en_livraison', 'livree']) {
    await v.getByTestId(`mp-sale-${st}`).click();
    await v.waitForTimeout(700);
  }
  check('commande livrée', /Livrée/.test(await v.getByTestId('mp-sale').innerText()));
  const late = await (await fetch(B + '/api/mp/me/sales', { headers: VH })).json();
  check('après la livraison : numéro de nouveau masqué', late.orders[0].buyer.phone === null);
  await v.getByRole('tab', { name: 'Mon solde' }).click();
  const due = await v.getByTestId('mp-balance-due').innerText();
  // 7 % de 12 000 F + 150 F de frais de service = 990 F
  check('commission due : 990 F', /990/.test(due), due);
  await shot(v, '9-solde');

  // ── 7. L'acheteuse suit sa commande
  await a.goto(B + '/m/commandes');
  await a.waitForTimeout(1200);
  const txt = await a.getByTestId('mp-order').innerText();
  check('acheteuse : commande livrée', /Livrée/.test(txt));
  check('acheteuse : peut appeler la vendeuse', await a.getByRole('link', { name: /Appeler le vendeur/ }).isVisible());

  // ── 8. La gérante enregistre le paiement de la commission
  await g.reload();
  await g.waitForTimeout(800);
  await g.getByRole('button', { name: 'Place de marché' }).click();
  await g.waitForTimeout(1000);
  await g.getByRole('button', { name: /^Vendeurs/ }).click();
  g.once('dialog', d => d.accept(d.defaultValue()));
  await g.getByRole('button', { name: 'Paiement reçu' }).click();
  await g.waitForTimeout(1000);
  const ov = await (await fetch(B + '/api/admin/mp/overview', { headers: A })).json();
  check('commission encaissée : reste 0', ov.outstanding === 0 && ov.earned === 990, JSON.stringify(ov.earned));
  await shot(g, '10-gerante-vendeurs');

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  console.log(res.join('\n'));
  await b.close();
})().catch(async e => {
  console.log(res.join('\n'));
  console.log('ERR', e.message);
  // Capture de chaque page ouverte, pour comprendre l'échec
  const pages = browser ? browser.contexts().flatMap(c => c.pages()) : [];
  for (const [i, pg] of pages.entries()) await pg.screenshot({ path: `${SP}/pm-erreur-${i}.png` }).catch(() => {});
  process.exit(1);
});
