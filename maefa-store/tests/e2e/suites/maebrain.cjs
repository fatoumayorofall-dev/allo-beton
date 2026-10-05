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
  const conv = () => p.locator('div.bg-petal[aria-live="polite"]');
  const say = async t => {
    await p.getByLabel(/Votre question|Sa laaj/).fill(t);
    await p.keyboard.press('Enter');
    await p.waitForTimeout(700);
  };
  const chip = async t => {
    await p.getByTestId('chips').getByRole('button', { name: t }).click();
    await p.waitForTimeout(700);
  };
  await p.goto(B + '/');
  await p.waitForTimeout(1000);
  await p.getByRole('button', { name: "Poser une question à l'assistante" }).click();
  await p.waitForTimeout(1200);
  check('statut : conseillère sans IA payante', await p.getByText(/Répond tout de suite/).isVisible());
  await say('Bonjour');
  check(
    'salut + boutons',
    (await p.getByTestId('chips').isVisible()) && /Qu'est-ce qui vous ferait plaisir/.test(await conv().innerText()),
  );
  check('bouton « Écouter » sous la réponse en français', await p.getByTestId('listen').first().isVisible());
  await chip('👡 Des chaussures');
  check('demande la pointure', /pointure/.test(await conv().innerText()));
  await chip('👣 38');
  await chip('🎉 Soirée');
  const txt = await conv().innerText();
  check(
    'apporte des chaussures en 38',
    /Disponible en 38/.test(txt) && /10\s000 – 20\s000 F/.test(txt) && !/15\s000 FCFA/.test(txt),
  );
  check('vignettes des pièces', (await p.locator('div.bg-petal a[href^="/produit/"] img').count()) >= 1);
  check('pointure retenue', (await p.evaluate(() => localStorage.getItem('maefa_pointure'))) === '38');
  await p.waitForTimeout(300);
  await p.screenshot({ path: SP + '/mb-1-fr.png' });
  await chip('🛒 Comment commander ?');
  check('explique comment commander', /Ajouter au panier/.test(await conv().innerText()));
  // Mémoire : nouvelle question libre qui garde la pointure
  await say('Et en noir ?');
  check(
    'se souvient (chaussures noires en 38)',
    /Disponible en 38/.test((await conv().innerText()).split('Et en noir ?').pop()),
  );
  // Wolof écrit librement
  await p.getByRole('button', { name: 'Nouvelle conversation' }).click();
  await p.getByTestId('lang-wo').click();
  await p.waitForTimeout(300);
  await say('Salaam aleekum, na nga def ?');
  check(
    'wolof : rend le salut',
    /Maalekum salaam/.test(await conv().innerText()) && /alxamdulilaa/.test(await conv().innerText()),
  );
  check('wolof : pas de bouton Écouter (pas de voix wolof)', (await p.getByTestId('listen').count()) === 0);
  await p.getByRole('button', { name: 'Nouvelle conversation' }).click();
  await say('Salaam aleekum, dama bëgg sac ngir céet ba 20 000');
  const wo = await conv().innerText();
  check(
    'wolof : pièces présentées en wolof',
    /Xoolal li ma la tànnal|Tànnal naa la yii|Xoolal yii, dinañu la neex/.test(wo) && /Dafa baax ngir céet/.test(wo),
    wo.slice(-200),
  );
  check('wolof : budget respecté', !/2[1-9]\s000 FCFA|25\s000 FCFA/.test(wo.split('dama bëgg').pop()));
  await chip('🔄 Yeneen');
  await say('Ci Thiès yónnee bi ñaata la ?');
  check(
    'wolof : livraison Thiès',
    /Thiès/.test(await conv().innerText()) && /4\s000 FCFA/.test(await conv().innerText()),
  );
  await p.waitForTimeout(300);
  await p.screenshot({ path: SP + '/mb-2-wo.png' });
  await say('Sac Hermès dëgg la ?');
  check('wolof : honnête sur les marques', /du Hermès/.test(await conv().innerText()));
  check('mobile : pas de débordement', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  console.log(res.join('\n'));
  console.log('errors', errors);
  await b.close();
})().catch(e => {
  console.log(res.join('\n'));
  console.log('ERR', e.message);
  process.exit(1);
});
