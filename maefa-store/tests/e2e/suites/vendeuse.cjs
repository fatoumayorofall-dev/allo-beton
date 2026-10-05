const { chromium, devices } = require('playwright');
const SP = process.env.SP,
  B = 'http://localhost:8787';
const res = [];
const check = (n, ok, x = '') => res.push(`${ok ? 'OK  ' : 'FAIL'} ${n} ${x}`);
(async () => {
  const b = await chromium.launch();
  const errors = [];
  const ctx = await b.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
  await ctx.route(/pexels|fonts\.g/, r => r.abort());
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(e.message));
  const open = async () => {
    await p.getByRole('button', { name: "Poser une question à l'assistante" }).click();
    await p.waitForTimeout(1200);
  };
  await p.goto(B + '/');
  await p.waitForTimeout(1000);
  await open();
  if (process.env.MOCK_AI) {
    await p.getByLabel('Votre question').fill('Des chaussures pour un mariage, je fais du 38');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(2500);
    const txt = await p.locator('div.bg-petal[aria-live="polite"]').innerText();
    check('IA : réponse affichée avec la pièce', /Pochette Coumba/.test(txt));
    check('IA : ligne technique cachée', !/\[\[pointure/.test(txt));
    check(
      'IA : pointure retenue sur le téléphone',
      (await p.evaluate(() => localStorage.getItem('maefa_pointure'))) === '38',
    );
    check(
      'IA : vignette de la pièce citée',
      (await p.locator('a[href="/produit/pochette-papillon-dore"]').count()) > 0,
    );
    console.log(res.join('\n'));
    console.log('errors', errors);
    await b.close();
    return;
  }
  // ---- Français : chaussures pour une soirée, pointure 38 ----
  await p.getByTestId('advisor-start').click();
  await p.waitForTimeout(300);
  check(
    'FR : première question',
    /Qu'est-ce qui vous ferait plaisir/.test(await p.getByTestId('advisor-question').innerText()),
  );
  await p.getByTestId('advisor-kind-chaussures').click();
  await p.getByTestId('advisor-occasion-soiree').click();
  await p.getByTestId('advisor-color-tout').click();
  await p.getByTestId('advisor-budget-x').click();
  check('FR : pointure demandée', /pointure/.test(await p.getByTestId('advisor-question').innerText()));
  await p.getByTestId('advisor-size-38').click();
  await p.waitForTimeout(400);
  const n = await p.getByTestId('advisor-item').count();
  check('FR : 1 à 3 pièces apportées', n >= 1 && n <= 3, String(n));
  check(
    'FR : présentation avec classe de prix et pointure',
    /\d – \d.* F/.test(await p.getByTestId('advisor-results').innerText()) &&
      /Disponible en 38/.test(await p.getByTestId('advisor-results').innerText()),
  );
  await p.waitForTimeout(700);
  await p.screenshot({ path: SP + '/vd-1-fr.png' });
  await p.getByTestId('advisor-add').first().click();
  await p.waitForTimeout(500);
  const cart = await p.evaluate(() => JSON.parse(localStorage.getItem('maefa_cart') || '[]'));
  check(
    'FR : ajouté au panier en 38',
    cart.length === 1 && cart[0].size === '38',
    JSON.stringify(cart.map(i => i.size)),
  );
  check('pointure retenue', (await p.evaluate(() => localStorage.getItem('maefa_pointure'))) === '38');
  // Deuxième tour : la pointure n'est plus demandée
  await p.getByTestId('advisor-again').click();
  await p.getByTestId('advisor-kind-chaussures').click();
  await p.getByTestId('advisor-occasion-tout').click();
  await p.getByTestId('advisor-color-noir').click();
  await p.getByTestId('advisor-budget-x').click();
  await p.waitForTimeout(300);
  check('2e tour : pointure déjà connue, pas redemandée', await p.getByTestId('advisor-results').isVisible());
  // ---- Wolof : sac pour un mariage, ≤ 16 000 ----
  await p.getByRole('button', { name: 'Nouvelle conversation' }).click();
  await p.getByTestId('lang-wo').click();
  await p.waitForTimeout(300);
  check('WO : bouton « Wone ma li am »', /Wone ma li am/.test(await p.getByTestId('advisor-start').innerText()));
  await p.getByTestId('advisor-start').click();
  check('WO : question en wolof', /Lan nga bëgg/.test(await p.getByTestId('advisor-question').innerText()));
  await p.getByTestId('advisor-kind-sacs').click();
  await p.getByTestId('advisor-occasion-mariage').click();
  await p.getByTestId('advisor-color-tout').click();
  await p.getByTestId('advisor-budget-16000').click();
  await p.waitForTimeout(400);
  const wo = await p.getByTestId('advisor-results').innerText();
  check(
    'WO : présentation en wolof',
    /Xoolal li ma la tànnal|Amul lu dëppoo/.test(wo) && /Yokk ci panier/.test(wo),
    wo.slice(0, 80),
  );
  check('WO : budget respecté', !/(1[7-9]|2\d)\s?\d{3} FCFA/.test(wo));
  await p.waitForTimeout(700);
  await p.screenshot({ path: SP + '/vd-2-wo.png' });
  check('mobile : pas de débordement', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  console.log(res.join('\n'));
  console.log('errors', errors);
  await b.close();
})().catch(e => {
  console.log(res.join('\n'));
  console.log('ERR', e.message);
  process.exit(1);
});
