const toCheckout = require('../tocheckout.cjs');
const { chromium, devices } = require('playwright');
const fs = require('fs'),
  crypto = require('crypto'),
  path = require('path');
const SP = process.env.SP,
  F = require('path').join(__dirname, '../fixtures/fonts');
const css = fs.readFileSync(F + '/fonts.css', 'utf8');
const B = 'http://localhost:8787';
const res = [];
const check = (n, ok, x = '') => res.push(`${ok ? 'OK  ' : 'FAIL'} ${n} ${x}`);
(async () => {
  const b = await chromium.launch();
  const errors = [];
  const mk = async device => {
    const ctx = await b.newContext({ ...device });
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
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    return { ctx, p };
  };
  const shot = (p, n) => p.screenshot({ path: `${SP}/cp-${n}.png` });

  // ── Téléphone 1 (Android)
  const { p } = await mk(devices['Pixel 7']);
  await p.goto(B + '/compte');
  await p.waitForTimeout(1000);
  await shot(p, '1-numero');
  await p.getByLabel('Numéro de téléphone').fill('12 34');
  await p.getByRole('button', { name: /Continuer/ }).click();
  await p.waitForTimeout(300);
  check('numéro invalide refusé', await p.getByText(/Écrivez un numéro sénégalais/).isVisible());
  await p.getByLabel('Numéro de téléphone').fill('+221 77 123 45 67');
  check(
    'numéro mis en forme',
    (await p.getByLabel('Numéro de téléphone').inputValue()) === '77 123 45 67',
    await p.getByLabel('Numéro de téléphone').inputValue(),
  );
  await p.getByRole('button', { name: /Continuer/ }).click();
  await p.waitForTimeout(800);
  check('étape code + mode test', await p.getByText(/Mode test/).isVisible());
  await shot(p, '2-code');
  const devCode = (await p.locator('strong.tracking-widest').innerText()).trim();
  const wrong = devCode === '0000' ? '1111' : '0000';
  await p.locator('#otp').fill(wrong);
  await p.waitForTimeout(800);
  check('mauvais code refusé', await p.getByText('Code incorrect').isVisible());
  await p.locator('#otp').fill(devCode);
  await p.waitForTimeout(1200);
  check('prénom demandé (nouvelle cliente)', await p.getByLabel('Votre prénom').isVisible());
  await shot(p, '3-prenom');
  await p.getByLabel('Votre prénom').fill('Awa');
  await p.getByRole('button', { name: /Entrer dans mon espace/ }).click();
  await p.waitForTimeout(800);
  check('espace cliente', await p.getByRole('heading', { name: /Awa/, level: 1 }).isVisible());
  await shot(p, '4-espace');
  const token = await p.evaluate(() => localStorage.getItem('maefa_token'));
  check('jeton de session', /^[a-f0-9]{64}$/.test(token || ''));
  // favoris → compte
  await p.goto(B + '/produit/sac-ndella-camel');
  await p.waitForTimeout(600);
  await p.getByRole('button', { name: 'Ajouter aux favoris' }).first().click();
  await p.waitForTimeout(1500);
  let me = await (await fetch(B + '/api/me', { headers: { Authorization: `Bearer ${token}` } })).json();
  check('favori envoyé au compte', me.user.wishlist.includes('MAE-101'), JSON.stringify(me.user.wishlist));
  // commande : coordonnées préremplies depuis le compte
  await p
    .getByRole('button', { name: /Ajouter au panier/ })
    .first()
    .click();
  await p.waitForTimeout(400);
  await toCheckout(p, B);
  await p.waitForTimeout(600);
  check('prénom prérempli depuis le compte', (await p.getByLabel('Prénom *').inputValue()) === 'Awa');
  check('téléphone prérempli', (await p.getByLabel('Téléphone *').inputValue()).replace(/\D/g, '') === '771234567');
  await p.getByLabel('Nom *', { exact: true }).fill('Diop');
  await p.getByLabel(/Adresse écrite/).fill('Villa 12, Sacré-Cœur 3');
  await p.getByRole('button', { name: 'Continuer vers le paiement' }).click();
  await p.waitForTimeout(400);
  await p.getByRole('button', { name: /^Valider ma commande/ }).click();
  await p.waitForURL(/confirmation/, { timeout: 8000 });
  await p.waitForTimeout(1200);
  me = await (await fetch(B + '/api/me', { headers: { Authorization: `Bearer ${token}` } })).json();
  check(
    'commande rattachée au compte',
    me.orders.length === 1 && me.user.lastName === 'Diop' && me.user.address.includes('Sacré'),
    `${me.orders.length} commande, ${me.user.lastName}`,
  );

  // ── Téléphone 2 (iPhone) : même numéro
  const { p: q } = await mk(devices['iPhone 13']);
  await q.goto(B + '/mes-commandes');
  await q.waitForTimeout(800);
  check('tél. 2 : invitation à se connecter', await q.getByText(/Retrouver toutes mes commandes/).isVisible());
  await q.goto(B + '/compte');
  await q.waitForTimeout(800);
  await q.getByLabel('Numéro de téléphone').fill('771234567');
  await q.getByRole('button', { name: /Continuer/ }).click();
  await q.waitForTimeout(800);
  await q.getByRole('button', { name: 'Remplir' }).click();
  await q.waitForTimeout(1500);
  check('tél. 2 : pas de prénom redemandé', await q.getByRole('heading', { name: /Awa/, level: 1 }).isVisible());
  await q.goto(B + '/mes-commandes');
  await q.waitForTimeout(800);
  check(
    'tél. 2 : commande du tél. 1 visible',
    (await q.locator('main a[href^="/suivi"]').count()) === 1 || (await q.getByText(/MAE-/).count()) > 0,
  );
  await q.goto(B + '/favoris');
  await q.waitForTimeout(600);
  check('tél. 2 : favori retrouvé', (await q.getByTestId('wishlist-grid').locator('article').count()) === 1);
  // installation iPhone : guide en 3 gestes
  await q.goto(B + '/compte');
  await q.waitForTimeout(800);
  await q.getByRole('button', { name: /Mettre Maefa sur mon téléphone/ }).click();
  await q.waitForTimeout(500);
  check('iPhone : guide Safari', await q.getByText(/Sur l'écran d'accueil/).isVisible());
  await shot(q, '5-guide-iphone');

  // ── Bandeau d'installation (Android, nouvelle visiteuse)
  const { p: r } = await mk(devices['Pixel 7']);
  await r.goto(B + '/');
  await r.waitForTimeout(13500);
  check('bandeau installer (mobile)', await r.getByText('Mettre Maefa sur mon téléphone').isVisible());
  await shot(r, '6-bandeau');
  await r.getByText('Mettre Maefa sur mon téléphone').click();
  await r.waitForTimeout(500);
  check('Android : guide Chrome', await r.getByText(/3 points/).isVisible());
  await shot(r, '7-guide-android');
  // service worker + hors ligne
  const swOk = await r.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return !!reg;
  });
  check('service worker enregistré', swOk);
  await r.reload();
  await r.waitForTimeout(1500);
  await r.context().setOffline(true);
  await r.goto(B + '/boutique').catch(() => {});
  await r.waitForTimeout(1500);
  check(
    "hors ligne : la boutique s'ouvre",
    await r
      .getByRole('link', { name: /Maefa/ })
      .first()
      .isVisible()
      .catch(() => false),
  );
  await r.context().setOffline(false);

  // ── Gérante : liste des clientes
  const { p: a } = await mk({ viewport: { width: 1440, height: 900 } });
  await a.goto(B + '/admin');
  await a.getByLabel('Code PIN').fill('2026');
  await a.getByRole('button', { name: 'Se connecter' }).click();
  await a.waitForTimeout(600);
  await a.getByRole('button', { name: /Clientes/ }).click();
  await a.waitForTimeout(800);
  check(
    'admin : cliente listée',
    (await a.getByText('Awa Diop').isVisible()) && (await a.getByText('77 123 45 67').isVisible()),
  );
  await a.screenshot({ path: `${SP}/cp-8-admin-clientes.png` });

  console.log(res.join('\n'));
  console.log('errors', errors);
  await b.close();
})().catch(e => {
  console.log(res.join('\n'));
  console.error('ERR', e.message);
  process.exit(1);
});
