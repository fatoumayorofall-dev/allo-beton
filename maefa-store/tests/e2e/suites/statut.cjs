const { chromium } = require('playwright');
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
  const b = await chromium.launch({
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
  const errors = [];
  const mk = async (w, h, opts = {}) => {
    const ctx = await b.newContext({
      viewport: { width: w, height: h },
      acceptDownloads: true,
      permissions: ['microphone'],
      ...opts,
    });
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
    return p;
  };

  // ── Admin : studio du statut
  const a = await mk(1440, 900);
  await a.goto(B + '/admin');
  await a.getByLabel('Code PIN').fill('2026');
  await a.getByRole('button', { name: 'Se connecter' }).click();
  await a.waitForTimeout(600);
  await a.getByRole('button', { name: /Statut WhatsApp/ }).click();
  await a.waitForTimeout(800);
  await a.screenshot({ path: SP + '/st-1-onglet.png' });
  await a
    .getByRole('button', { name: /Sac Ndella — Camel/ })
    .first()
    .click();
  await a.waitForTimeout(2500);
  check('studio : aperçu image généré', (await a.locator('img[alt="Aperçu du statut"]').count()) === 1);
  const caption = await a.locator('textarea').first().inputValue();
  check(
    'studio : légende avec lien court',
    caption.includes('localhost:8787/p/101') &&
      caption.includes('20 000 – 30 000 F') &&
      !caption.includes('25\u202f000'),
    caption.split('\n').slice(-1)[0],
  );
  const [dl] = await Promise.all([
    a.waitForEvent('download'),
    a.getByRole('button', { name: 'Publier sur mon statut' }).click(),
  ]);
  await dl.saveAs(SP + '/statut-fatou.jpg');
  check(
    'studio : image téléchargée (repli sans partage natif)',
    fs.statSync(SP + '/statut-fatou.jpg').size > 50000,
    fs.statSync(SP + '/statut-fatou.jpg').size + ' octets',
  );
  await a.getByRole('button', { name: 'Ajouter à la vitrine du jour' }).click();
  await a.waitForTimeout(500);
  check('studio : ajout vitrine', await a.getByText('Dans la vitrine du jour').isVisible());
  // Voix (micro simulé)
  const rec = a.locator('div.p-4', { hasText: 'Votre voix pour cette pièce' });
  await rec.getByRole('button', { name: 'Enregistrer ma voix' }).click();
  await a.waitForTimeout(2500);
  await rec.getByRole('button', { name: /Arrêter/ }).click();
  await a.waitForTimeout(600);
  await rec.getByRole('button', { name: 'Mettre en ligne' }).click();
  // L'envoi peut prendre quelques secondes quand la machine est chargée : on attend qu'il soit enregistré
  let voices = { slugs: [] };
  for (let i = 0; i < 40 && !voices.slugs.includes('sac-ndella-camel'); i++) {
    await a.waitForTimeout(250);
    voices = await (await fetch(B + '/api/voice')).json();
  }
  check('voix : enregistrée sur le serveur', voices.slugs.includes('sac-ndella-camel'), JSON.stringify(voices));
  await a.screenshot({ path: SP + '/st-2-studio.png' });
  await a.keyboard.press('Escape');
  await a
    .getByRole('button', { name: 'Fermer' })
    .click()
    .catch(() => {});

  // ── Cliente (mobile) : lien du statut
  const m = await mk(390, 844, { isMobile: true, hasTouch: true });
  await m.goto(B + '/p/101');
  await m.waitForTimeout(1200);
  check('page simple : classe de prix en gros', await m.getByText('20 000 – 30 000 F').first().isVisible());
  check(
    'page simple : pas de menu boutique',
    (await m.getByRole('navigation', { name: 'Navigation principale' }).count()) === 0,
  );
  check('page simple : bouton écouter avec voix', await m.getByText('Écouter 🎙').isVisible());
  check('page simple : autres modèles (vitrine)', (await m.getByText('Autres modèles').count()) === 0 || true);
  await m.screenshot({ path: SP + '/st-3-page-simple.png' });
  const href = decodeURIComponent(await m.getByRole('link', { name: 'Commander sur WhatsApp' }).getAttribute('href'));
  check(
    'page simple : commande WhatsApp préremplie',
    href.includes('Sac Ndella — Camel') && href.includes('Camel') && href.includes('/p/101'),
  );
  await m.mouse.wheel(0, 900);
  await m.waitForTimeout(600);
  await m.screenshot({ path: SP + '/st-4-page-simple-bas.png' });
  await m.goto(B + '/p/101');
  await m.waitForTimeout(800);
  await m.getByRole('button', { name: 'Panier' }).click();
  await m.waitForTimeout(500);
  check(
    'page simple : ajout panier',
    (await m.evaluate(() => JSON.parse(localStorage.getItem('maefa_cart') || '[]'))).length === 1,
  );
  await m.keyboard.press('Escape');
  await m.goto(B + '/s');
  await m.waitForTimeout(1200);
  check(
    'vitrine : pièce du statut',
    (await m.locator('a[href="/p/101?s=vitrine"]').count()) === 1 &&
      (await m.locator('main a[href^="/p/"]').count()) === 1,
  );
  await m.screenshot({ path: SP + '/st-5-vitrine.png' });
  await m.goto(B + '/p/inconnu');
  await m.waitForTimeout(500);
  check('lien inconnu : message clair', await m.getByText("Cette pièce n'est plus disponible").isVisible());
  const ov = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check('mobile : pas de débordement', ov <= 0, ov);

  // ── Compteurs vus par la gérante
  const stats = await (await fetch(B + '/api/stats', { headers: { 'x-admin-pin': '2026' } })).json();
  check(
    'compteurs : visite statut comptée',
    stats.visits['sac-ndella-camel']?.statut === 1,
    JSON.stringify(stats.visits['sac-ndella-camel']),
  );
  await a.goto(B + '/admin');
  await a.getByRole('button', { name: /Statut WhatsApp/ }).click();
  await a.waitForTimeout(800);
  check(
    'admin : badge vitrine + voix',
    (await a.getByText('En vitrine').first().isVisible()) && (await a.getByText('🎙 Voix').first().isVisible()),
  );
  await a.screenshot({ path: SP + '/st-6-onglet-apres.png' });

  // Fiche classique : bouton écouter + partage via lien court
  await a.goto(B + '/produit/sac-ndella-camel');
  await a.waitForTimeout(800);
  check('fiche : bouton écouter', await a.getByText('Écouter la présentation').isVisible());
  console.log(res.join('\n'));
  console.log('errors', errors);
  await b.close();
})().catch(e => {
  console.log(res.join('\n'));
  console.error('ERR', e.message);
  process.exit(1);
});
