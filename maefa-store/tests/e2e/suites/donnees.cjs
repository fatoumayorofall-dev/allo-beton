// Protection des données (loi sénégalaise 2008-12) : politique de confidentialité, droit d'accès
// (téléchargement des données) et droit à l'effacement (suppression du compte).
const { chromium, devices } = require('playwright');
const SP = process.env.SP;
const B = 'http://localhost:8787';
const res = [];
const check = (n, ok, x = '') => res.push(`${ok ? 'OK  ' : 'FAIL'} ${n} ${x}`);
(async () => {
  const b = await chromium.launch();
  const errors = [];
  const ctx = await b.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block', acceptDownloads: true });
  await ctx.route(/pexels|fonts\.g/, r => r.abort());
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(e.message));

  // Page publique et lien en pied de page
  await p.goto(B + '/');
  await p.waitForTimeout(800);
  check(
    'pied de page : lien « Confidentialité »',
    (await p.locator('footer a[href="/confidentialite"]').count()) === 1,
  );
  await p.goto(B + '/confidentialite');
  await p.waitForTimeout(800);
  const text = await p.getByTestId('privacy-page').innerText();
  check('politique : loi 2008-12 et CDP citées', /2008-12/.test(text) && /CDP/.test(text));
  check(
    'politique : responsable, données, finalités, durée, droits',
    ['responsable', 'Quelles données', 'Pourquoi', 'Combien de temps', 'Vos droits'].every(t => text.includes(t)),
  );
  await p.screenshot({ path: `${SP}/cdp-1-politique.png` });

  // Connexion (code affiché en mode test)
  await p.goto(B + '/compte');
  await p.waitForTimeout(800);
  await p.getByLabel('Numéro de téléphone').fill('77 222 33 44');
  await p.getByRole('button', { name: /Continuer/ }).click();
  await p.waitForTimeout(800);
  const code = (await p.locator('strong.tracking-widest').innerText()).trim();
  await p.locator('#otp').fill(code);
  await p.waitForTimeout(1200);
  await p.getByLabel('Votre prénom').fill('Ndèye');
  await p.getByRole('button', { name: /Entrer dans mon espace/ }).click();
  await p.waitForTimeout(1000);
  const token = await p.evaluate(() => localStorage.getItem('maefa_token'));
  check('compte créé', !!token);

  // Droit d'accès : fichier téléchargé, sans le code secret
  const panel = p.getByTestId('my-data');
  await panel.scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${SP}/cdp-2-mes-donnees.png` });
  const [download] = await Promise.all([p.waitForEvent('download'), panel.getByTestId('export-data').click()]);
  const file = await download.path();
  const data = JSON.parse(require('fs').readFileSync(file, 'utf8'));
  check(
    'accès : fichier de données téléchargé',
    data.profil?.phone === '+221772223344' && data.profil.firstName === 'Ndèye',
  );
  check("accès : le code secret n'est jamais exporté", !JSON.stringify(data).includes('pinHash'));

  // Droit à l'effacement
  p.once('dialog', d => d.accept());
  await panel.getByTestId('delete-account').click();
  await p.waitForTimeout(1200);
  const me = await fetch(B + '/api/me', { headers: { Authorization: `Bearer ${token}` } });
  check('effacement : compte et session supprimés', me.status === 401, String(me.status));
  check('effacement : retour à la connexion', await p.getByLabel('Numéro de téléphone').isVisible());

  // Commande en cours : suppression refusée
  const r2 = await fetch(B + '/api/me', { method: 'DELETE' });
  check('effacement : refusé sans connexion', r2.status === 401);

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  console.log(res.join('\n'));
  await b.close();
})().catch(e => {
  console.log(res.join('\n'));
  console.log('ERR', e.message);
  process.exit(1);
});
