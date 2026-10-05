const toCheckout = require('../tocheckout.cjs');
const { chromium, devices } = require('playwright');
const fs = require('fs'),
  crypto = require('crypto'),
  path = require('path');
const SP = process.env.SP,
  F = require('path').join(__dirname, '../fixtures/fonts');
const css = fs.readFileSync(F + '/fonts.css', 'utf8');
const B = 'http://localhost:8787',
  A = { 'x-admin-pin': '2026' };
const res = [];
const check = (n, ok, x = '') => res.push(`${ok ? 'OK  ' : 'FAIL'} ${n} ${x}`);
const HOME = { latitude: 14.7236, longitude: -17.4686, accuracy: 15 };
(async () => {
  const b = await chromium.launch();
  const errors = [];
  // Tuile de carte factice (les serveurs de cartes sont bloqués dans le bac à sable)
  const tp = await (await b.newContext({ viewport: { width: 256, height: 256 } })).newPage();
  await tp.setContent(`<body style="margin:0"><svg width="256" height="256" xmlns="http://www.w3.org/2000/svg"><rect width="256" height="256" fill="#f2efe9"/>
    <rect x="20" y="30" width="90" height="70" fill="#e3e0d8"/><rect x="140" y="140" width="96" height="96" fill="#d6ead0"/><rect x="150" y="20" width="80" height="90" fill="#e3e0d8"/>
    <path d="M0 120 H256 M128 0 V256" stroke="#fff" stroke-width="10"/><path d="M0 200 L256 180" stroke="#fde6a6" stroke-width="7"/></svg></body>`);
  const TILE = await tp.screenshot();
  const mk = async (device, extra = {}) => {
    const ctx = await b.newContext({ ...device, ...extra });
    await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: css }));
    await ctx.route('https://fonts.gstatic.com/**', r => {
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
    await ctx.route(/tile\.openstreetmap\.org/, r => r.fulfill({ contentType: 'image/png', body: TILE }));
    await ctx.route('https://images.pexels.com/**', r => r.abort());
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    return { ctx, p };
  };
  const shot = (p, n) => p.screenshot({ path: `${SP}/lv-${n}.png` });

  // ── 1. La cliente commande : « Je suis ici »
  const { p } = await mk(devices['Pixel 7'], { geolocation: HOME, permissions: ['geolocation'] });
  await p.goto(B + '/produit/sac-ndella-camel');
  await p.waitForTimeout(500);
  await p
    .getByRole('button', { name: /Ajouter au panier/ })
    .first()
    .click();
  await p.waitForTimeout(400);
  await toCheckout(p, B);
  await p.waitForTimeout(800);
  await p.getByLabel('Prénom *').fill('Awa');
  await p.getByLabel('Nom *', { exact: true }).fill('Ndiaye');
  await p.getByLabel('Téléphone *').fill('77 555 44 33');
  // sans point ni adresse : refus
  await p.getByRole('button', { name: 'Continuer vers le paiement' }).click();
  await p.waitForTimeout(300);
  check(
    'sans point ni adresse : message clair',
    await p
      .getByText(/Touchez « Je suis ici »/)
      .first()
      .isVisible(),
  );
  await p.getByTestId('location-picker').scrollIntoViewIfNeeded();
  await shot(p, '1-carte-vide');
  // Carte plein écran façon Yango : « Je suis ici » ouvre la carte et lance le GPS
  await p.getByRole('button', { name: /Je suis ici/ }).click();
  await p.waitForTimeout(1500);
  const sheet = p.getByTestId('map-sheet');
  check('carte plein écran ouverte', await sheet.isVisible());
  await p.waitForFunction(() => !document.querySelector('[data-testid="gps-progress"]'), null, { timeout: 30000 });
  check('GPS : adresse trouvée', await sheet.getByText('Rue SC-110, Sacré-Cœur 3, Dakar').isVisible());
  check('GPS : précision affichée', await sheet.getByText(/précision ± 15 m/).isVisible());
  check(
    'mobile : pas de débordement horizontal',
    await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    String(await p.evaluate(() => document.documentElement.scrollWidth)),
  );
  await shot(p, '2-gps');
  await p.getByTestId('confirm-location').click();
  await p.waitForTimeout(600);
  check(
    'zone reconnue automatiquement',
    (await p.getByText('Zone reconnue :').isVisible()) &&
      (await p.getByText('Sacré-Cœur / Mermoz').first().isVisible()),
  );
  check(
    'résumé : adresse et précision',
    await p
      .getByTestId('location-summary')
      .getByText(/précision ± 15 m/)
      .isVisible(),
  );
  // recherche d'un lieu connu (depuis « Modifier »)
  await p
    .getByTestId('location-summary')
    .getByRole('button', { name: /Modifier/ })
    .click();
  await p.waitForTimeout(800);
  await p.getByLabel('Rechercher un lieu').fill('mosquée');
  await p.waitForTimeout(900);
  check('recherche : suggestions', (await p.getByRole('listbox').getByRole('button').count()) === 3);
  await shot(p, '3-recherche');
  await p.getByRole('button', { name: /Almadies, Dakar/ }).click();
  await p.waitForTimeout(800);
  // glisser la carte → épingle soulevée, puis nouveau point et adresse recalculée
  const map = p.locator('[data-testid="map-sheet"] .leaflet-container');
  const box = await map.boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.mouse.down();
  await p.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 30, { steps: 8 });
  check('épingle soulevée pendant le glissement', (await p.locator('.maefa-cpin.is-lifted').count()) === 1);
  await p.mouse.up();
  await p.waitForTimeout(1200);
  check('carte glissée : point placé à la main', await sheet.getByText(/Point placé à la main/).isVisible());
  await p.getByTestId('confirm-location').click();
  await p.waitForTimeout(600);
  check('recherche : zone Almadies reconnue', await p.getByText('Almadies / Ngor').first().isVisible());
  // retour au GPS (bouton « me localiser ») + repère
  await p
    .getByTestId('location-summary')
    .getByRole('button', { name: /Modifier/ })
    .click();
  await p.waitForTimeout(600);
  await p.getByTestId('locate-me').click();
  await p.waitForTimeout(500);
  await p.waitForFunction(() => !document.querySelector('[data-testid="gps-progress"]'), null, { timeout: 30000 });
  await p.getByPlaceholder(/portail vert/).fill('Portail vert, en face de la boutique Wave');
  await p.getByTestId('confirm-location').click();
  await p.waitForTimeout(600);
  await p.getByRole('button', { name: 'Continuer vers le paiement' }).click();
  await p.waitForTimeout(500);
  check('récap : point GPS enregistré', await p.getByText(/Point de livraison enregistré sur la carte/).isVisible());
  await p.getByRole('button', { name: /^Valider ma commande/ }).click();
  await p.waitForURL(/confirmation/, { timeout: 8000 });
  await p.waitForTimeout(1200);
  check('confirmation : annonce du suivi en direct', await p.getByText(/suivre en direct sur la carte/).isVisible());
  await shot(p, '4-confirmation');
  const orders = (await (await fetch(B + '/api/admin/orders', { headers: A })).json()).orders;
  const o = orders[0];
  check(
    'serveur : commande enregistrée avec le point',
    o &&
      o.customer.location?.lat === HOME.latitude &&
      o.customer.location.landmark?.startsWith('Portail vert') &&
      o.customer.location.source === 'gps',
    JSON.stringify(o?.customer.location),
  );
  check('serveur : zone', o?.customer.zone === 'Sacré-Cœur / Mermoz');
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('maefa_customer') || 'null'));
  check(
    'point mémorisé pour la prochaine commande',
    saved?.location?.lat === HOME.latitude,
    JSON.stringify(saved?.location),
  );

  // ── 2. GPS refusé : message d'aide
  const { p: d0 } = await mk(devices['iPhone 13']);
  await d0.goto(B + '/produit/sac-ndella-camel');
  await d0
    .getByRole('button', { name: /Ajouter au panier/ })
    .first()
    .click();
  await d0.waitForTimeout(400);
  await toCheckout(d0, B);
  await d0.waitForTimeout(800);
  await d0.getByRole('button', { name: /Je suis ici/ }).click();
  await d0.waitForTimeout(1200);
  check('GPS refusé : explication', await d0.getByText(/Localisation bloquée/).isVisible());

  // ── 3. La gérante confie la livraison
  const { p: g } = await mk({ viewport: { width: 1440, height: 900 } });
  await g.addInitScript(() => {
    sessionStorage.setItem('maefa_admin', '1');
    sessionStorage.setItem('maefa_admin_pin', '2026');
  });
  await g.goto(B + '/admin');
  await g.waitForTimeout(800);
  await g
    .getByRole('button', { name: /Commandes/ })
    .first()
    .click();
  await g.waitForTimeout(1500);
  check('admin : commande du serveur visible', await g.getByText(o.id).first().isVisible());
  await g.getByText(o.id).first().click();
  await g.waitForTimeout(800);
  await g.getByRole('dialog').locator('select').selectOption('confirmee');
  await g.waitForTimeout(1000);
  let srv = (await (await fetch(B + '/api/admin/orders', { headers: A })).json()).orders[0];
  check('admin : statut enregistré sur le serveur', srv.status === 'confirmee');
  check(
    'admin : lien Google Maps',
    (await g.getByRole('link', { name: 'Ouvrir dans Google Maps' }).getAttribute('href')) ===
      `https://www.google.com/maps/dir/?api=1&destination=${HOME.latitude},${HOME.longitude}`,
  );
  await g.getByRole('button', { name: /Un livreur/ }).click();
  await g.getByLabel('Nom du livreur').fill('Modou');
  await g.getByLabel('Téléphone du livreur').fill('78 111 22 33');
  await g.getByRole('button', { name: 'Confier la livraison' }).click();
  await g.waitForTimeout(1500);
  check('admin : lien livreur prêt', await g.getByRole('link', { name: /Envoyer le lien au livreur/ }).isVisible());
  await g.getByTestId('delivery-panel').scrollIntoViewIfNeeded();
  await shot(g, '5-admin');
  srv = (await (await fetch(B + '/api/admin/orders', { headers: A })).json()).orders[0];
  const link = srv.delivery.driverLink.replace(/^https?:\/\/[^/]+/, B);

  // ── 4. Le livreur démarre
  let pos = { latitude: 14.705, longitude: -17.448, accuracy: 10 };
  const { ctx: dc, p: d } = await mk(devices['Pixel 7'], { geolocation: pos, permissions: ['geolocation'] });
  d.on('dialog', x => x.accept());
  await d.goto(link);
  await d.waitForTimeout(1200);
  check(
    'livreur : fiche cliente',
    (await d.getByText('Awa Ndiaye').isVisible()) && (await d.getByText(/Repère : Portail vert/).isVisible()),
  );
  check(
    'livreur : lien Waze',
    (await d.getByRole('link', { name: 'Waze' }).getAttribute('href')).includes('14.7236,-17.4686'),
  );
  await shot(d, '6-livreur');
  await d.getByRole('button', { name: /Démarrer la course/ }).click();
  await d.waitForTimeout(1500);
  check('livreur : course démarrée', await d.getByRole('button', { name: /Colis remis/ }).isVisible());
  srv = (await (await fetch(B + '/api/admin/orders', { headers: A })).json()).orders[0];
  check('commande passée « en route »', srv.status === 'expediee' && srv.delivery.state === 'en_route');

  // ── 5. La cliente suit le livreur
  await p.goto(`${B}/suivi?commande=${o.id}&tel=775554433`);
  await p.waitForTimeout(2000);
  check('suivi : carte en direct', await p.getByTestId('live-tracking').isVisible());
  check('suivi : livreur sur la carte', (await p.locator('.maefa-pin-scooter').count()) === 1);
  const eta1 = await p.getByText(/Arrive dans/).innerText();
  await p.getByTestId('live-tracking').scrollIntoViewIfNeeded();
  await shot(p, '7-suivi');
  const before = await p.locator('.maefa-pin-scooter').boundingBox();
  for (const [lat, lng] of [
    [14.712, -17.456],
    [14.718, -17.462],
    [14.7222, -17.4672],
  ]) {
    await dc.setGeolocation({ latitude: lat, longitude: lng, accuracy: 8 });
    await d.waitForTimeout(4600);
  }
  check('livreur : « la cliente vous voit »', await d.getByText('La cliente vous voit sur la carte').isVisible());
  await shot(d, '8-livreur-en-route');
  await p.waitForTimeout(6000);
  const after = await p.locator('.maefa-pin-scooter').boundingBox();
  const eta2 = await p.getByText(/Arrive dans/).innerText();
  check(
    'suivi : le livreur avance sur la carte',
    before && after && Math.abs(before.x - after.x) + Math.abs(before.y - after.y) > 5,
    `${JSON.stringify(before)} → ${JSON.stringify(after)}`,
  );
  check('suivi : trajet par les rues dessiné', (await p.locator('path.maefa-route').count()) === 1);
  check('suivi : ETA par la route', await p.getByTestId('eta-routed').isVisible());
  const srvCode = (await (await fetch(B + '/api/admin/orders', { headers: A })).json()).orders[0].delivery.code;
  check(
    'suivi : code de remise affiché à la cliente',
    /^\d{4}$/.test(srvCode) && (await p.getByTestId('delivery-code').innerText()).includes(srvCode),
  );
  const pub = await (await fetch(link.replace('/livreur/', '/api/driver/'))).json();
  check('livreur : le code ne lui est jamais envoyé', !JSON.stringify(pub).includes('"code"'));
  check('livreur : trajet dessiné', (await d.locator('path.maefa-route').count()) === 1);
  check("suivi : temps d'arrivée mis à jour", eta1 !== eta2 || /1 minute/.test(eta2), `${eta1} → ${eta2}`);
  await shot(p, '9-suivi-proche');
  const log = fs.readFileSync(SP + '/server.log', 'utf8');
  check('WhatsApp « en route » avec lien de suivi', /est en route 🛵 avec Modou/.test(log));
  check('WhatsApp « en route » avec le code de remise', log.includes('code de remise : *' + srvCode));
  check(
    'itinéraire demandé au service de routes',
    (await (await fetch('http://localhost:9922/route-hits')).json()).hits > 0,
  );
  check('WhatsApp « il arrive » (moins de 400 m)', /votre livreur Maefa arrive/.test(log));
  check('WhatsApp au livreur avec son lien', /Démarrer la course/.test(log) && log.includes('/livreur/'));

  // ── 6. Colis remis
  await d.getByLabel(/Code de remise/).fill(srvCode === '0000' ? '1111' : '0000');
  await d.getByRole('button', { name: /Colis remis/ }).click();
  await d.waitForTimeout(1000);
  check(
    'livreur : mauvais code refusé',
    (await d.getByText(/Code incorrect/).isVisible()) &&
      (await (await fetch(B + '/api/admin/orders', { headers: A })).json()).orders[0].status !== 'livree',
  );
  await d.getByTestId('driver-code').scrollIntoViewIfNeeded();
  await shot(d, '10-code');
  await d.getByLabel(/Code de remise/).fill(srvCode);
  await d.getByRole('button', { name: /Colis remis/ }).click();
  await d.waitForTimeout(1200);
  check('livreur : livraison terminée', await d.getByText('Livraison terminée').isVisible());
  srv = (await (await fetch(B + '/api/admin/orders', { headers: A })).json()).orders[0];
  check('commande livrée et payée', srv.status === 'livree' && srv.paymentStatus === 'paye');
  await p.reload();
  await p.waitForTimeout(1500);
  check('suivi : plus de carte après livraison', (await p.getByTestId('live-tracking').count()) === 0);
  check('preuve de remise enregistrée', srv.delivery.proof?.by === 'code');
  await p.getByTestId('rate-delivery').scrollIntoViewIfNeeded();
  await p.getByRole('radio', { name: '5 étoiles' }).click();
  await p.getByLabel(/Un mot sur la livraison/).fill('Livreur très poli, rapide');
  await shot(p, '11-note');
  await p.getByRole('button', { name: 'Envoyer mon avis' }).click();
  await p.waitForTimeout(800);
  check('suivi : note envoyée', await p.getByText('Merci pour votre avis').isVisible());
  const rated = (await (await fetch(B + '/api/admin/orders', { headers: A })).json()).orders[0];
  check('serveur : note enregistrée', rated.rating?.stars === 5 && rated.rating.driverName === 'Modou');
  const bad = await fetch(`${B}/api/orders/lookup?id=${o.id}&phone=770000000`);
  check('suivi : mauvais numéro refusé', bad.status === 404);
  const old = await fetch(B + '/api/driver/xxxxxxxxxxxxxxxxxxxxxxxx');
  check('lien livreur inconnu refusé', old.status === 404);

  console.log(res.join('\n'));
  console.log('errors', errors);
  await b.close();
})().catch(e => {
  console.log(res.join('\n'));
  console.error('ERR', e.message);
  process.exit(1);
});
