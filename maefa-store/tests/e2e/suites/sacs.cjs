const { chromium, devices } = require('playwright');
const fs = require('fs'),
  crypto = require('crypto'),
  path = require('path');
const SP = process.env.SP,
  F = require('path').join(__dirname, '../fixtures/fonts'),
  css = fs.readFileSync(F + '/fonts.css', 'utf8');
const B = 'http://localhost:4173';
const res = [];
const check = (n, ok, x = '') => res.push(`${ok ? 'OK  ' : 'FAIL'} ${n} ${x}`);
(async () => {
  const b = await chromium.launch();
  const errors = [];
  const mk = async opts => {
    const ctx = await b.newContext({ ...opts, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
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
    return p;
  };
  const p = await mk({ viewport: { width: 1440, height: 900 } });
  await p.goto(B + '/');
  await p.waitForTimeout(1200);
  const nav = await p.locator('header nav').first().innerText();
  check('menu : chaussures et sacs', /CHAUSSURES/i.test(nav) && /SACS/i.test(nav));
  check(
    'menu : plus de bijoux / accessoires / prêt-à-porter',
    !/BIJOUX|ACCESSOIRES|PRÊT-À-PORTER/i.test(nav),
    nav.replace(/\n/g, ' | '),
  );
  check(
    'accueil : 2 grands univers',
    (await p.locator('a[href="/boutique/chaussures"] h3, a[href="/boutique/sacs"] h3').count()) === 2 &&
      (await p.locator('a[href="/boutique/bijoux"]').count()) === 0,
  );
  const products = await p.evaluate(() => JSON.parse(localStorage.getItem('maefa_products')));
  check(
    'catalogue : 50 pièces, toutes chaussures ou sacs',
    products.length === 50 && products.every(x => ['chaussures', 'sacs'].includes(x.category)),
    String(products.length),
  );
  // 2e diapositive
  await p.locator('button[aria-label="Afficher la diapositive 2"]').click();
  await p.waitForTimeout(1200);
  check('diapo 2 : tongs dorées', await p.getByTestId('hero-featured').getByText(/Tongs/).isVisible());
  await p.screenshot({ path: `${SP}/sc-hero3.jpg`, type: 'jpeg', quality: 72 });
  // Ancien lien bijoux
  await p.goto(B + '/boutique/bijoux');
  await p.waitForTimeout(900);
  check('/boutique/bijoux : « bientôt chez Maefa »', await p.getByText(/Bijoux : bientôt chez Maefa/).isVisible());
  await p.goto(B + '/produit/collier-plaque-or');
  await p.waitForTimeout(900);
  check("fiche d'un bijou : introuvable", !(await p.getByRole('heading', { name: 'Collier plaqué or Soxna' }).count()));
  // Budgets cadeaux
  for (const [id, min] of [
    ['lt20', 11],
    ['20-30', 12],
    ['30-40', 0],
    ['gt40', 0],
  ]) {
    await p.goto(`${B}/boutique?prix=${id}`);
    await p.waitForTimeout(700);
    const n = await p.locator('article').count();
    check(`budget ${id} : des pièces`, n >= min, String(n));
  }
  // Journal
  await p.goto(B + '/journal');
  await p.waitForTimeout(800);
  check(
    "journal : pas d'article foulard ni tenues de fête",
    !(await p.getByText(/foulard en soie/i).count()) && !(await p.getByText(/Tabaski & Korité : les tenues/i).count()),
  );
  // FAQ
  await p.goto(B + '/faq');
  await p.waitForTimeout(700);
  check('FAQ : plus de tableau prêt-à-porter', !(await p.getByText('Prêt-à-porter', { exact: true }).count()));
  // Assistante hors ligne
  await p.goto(B + '/');
  await p.waitForTimeout(800);
  await p.getByRole('button', { name: /Poser une question/ }).click();
  await p.waitForTimeout(500);
  const box = p.getByRole('dialog').locator('textarea, input[type="text"]').first();
  await box.fill('Avez-vous des bijoux ?');
  await box.press('Enter');
  await p.waitForTimeout(2500);
  check(
    'Éfa : « uniquement des chaussures et sacs »',
    await p
      .getByText(/uniquement des/)
      .first()
      .isVisible(),
  );
  await box.fill('Je cherche un sac pour un mariage');
  await box.press('Enter');
  await p.waitForTimeout(2500);
  check(
    'Éfa : propose un sac',
    (await p
      .getByRole('dialog')
      .getByRole('link', { name: /Ndella/ })
      .count()) > 0,
  );
  // Mobile : univers
  const m = await mk({ ...devices['Pixel 7'] });
  await m.goto(B + '/');
  await m.waitForTimeout(900);
  const y = await m.evaluate(() => {
    const h = [...document.querySelectorAll('h2')].find(e => e.textContent.includes('Chaque pas'));
    return h.getBoundingClientRect().top + scrollY;
  });
  for (let s = 0; s < y; s += 600) {
    await m.evaluate(s => scrollTo(0, s), s);
    await m.waitForTimeout(60);
  }
  await m.evaluate(v => scrollTo(0, v), y - 120);
  await m.waitForTimeout(1400);
  await m.screenshot({ path: `${SP}/sc-m-univers.jpg`, type: 'jpeg', quality: 72 });
  check('mobile : pas de débordement', await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  console.log(res.join('\n'));
  console.log('errors', errors);
  await b.close();
})().catch(e => {
  console.log(res.join('\n'));
  console.error('ERR', e.message);
  process.exit(1);
});
