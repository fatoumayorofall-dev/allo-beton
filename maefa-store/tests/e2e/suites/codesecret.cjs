const { chromium, devices } = require('playwright');
const SP = process.env.SP,
  B = 'http://localhost:8787',
  A = { 'x-admin-pin': '2026', 'content-type': 'application/json' };
const res = [];
const check = (n, ok, x = '') => res.push(`${ok ? 'OK  ' : 'FAIL'} ${n} ${x}`);
const api = async (u, o) => {
  const r = await fetch(B + u, o);
  return { status: r.status, body: await r.json().catch(() => null) };
};
(async () => {
  const b = await chromium.launch();
  const errors = [];
  const mk = async dev => {
    const ctx = await b.newContext({ ...dev, serviceWorkers: 'block' });
    await ctx.route(/pexels|fonts\.g/, r => r.abort());
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    return p;
  };
  const s = await api('/api/auth/start', { method: 'POST', headers: A, body: JSON.stringify({ phone: '775551234' }) });
  check(
    'sans WhatsApp : mode code secret, aucun code révélé',
    s.body?.mode === 'pin' && !s.body.devCode && s.body.hasPin === false,
    JSON.stringify(s.body),
  );
  // Inscription (téléphone)
  const p = await mk(devices['Pixel 7']);
  await p.goto(B + '/compte');
  await p.waitForTimeout(1200);
  await p.screenshot({ path: SP + '/cs-1-mobile.png' });
  await p.getByLabel('Numéro de téléphone').fill('77 555 12 34');
  await p.getByRole('button', { name: /Continuer/ }).click();
  await p.waitForTimeout(900);
  check('première visite : « Créez votre code secret »', await p.getByTestId('login-pin-new').isVisible());
  await p.locator('#pin').fill('1234');
  await p.waitForTimeout(300);
  check('code trop facile refusé', await p.getByText(/trop facile/).isVisible());
  await p.locator('#pin').fill('2468');
  await p.waitForTimeout(400);
  check('confirmation demandée', await p.getByTestId('login-pin-confirm').isVisible());
  await p.screenshot({ path: SP + '/cs-2-confirm.png' });
  await p.locator('#pin').fill('1357');
  await p.waitForTimeout(400);
  check(
    'codes différents : on recommence',
    (await p.getByTestId('login-pin-new').isVisible()) && (await p.getByText(/pas pareils/).isVisible()),
  );
  await p.locator('#pin').fill('2468');
  await p.waitForTimeout(400);
  await p.locator('#pin').fill('2468');
  await p.waitForTimeout(1500);
  check('compte créé : prénom demandé', await p.getByLabel('Votre prénom').isVisible());
  await p.getByLabel('Votre prénom').fill('Awa');
  await p.getByRole('button', { name: /Entrer dans mon espace/ }).click();
  await p.waitForTimeout(1000);
  check('espace cliente ouvert', await p.getByRole('heading', { name: /Awa/, level: 1 }).isVisible());
  // Reconnexion sur un autre téléphone
  const q = await mk({ viewport: { width: 1440, height: 900 } });
  await q.goto(B + '/compte');
  await q.waitForTimeout(1200);
  await q.screenshot({ path: SP + '/cs-3-desktop.png' });
  await q.getByLabel('Numéro de téléphone').fill('775551234');
  await q.getByRole('button', { name: /Continuer/ }).click();
  await q.waitForTimeout(900);
  check(
    'cliente connue : « Votre code secret »',
    (await q.getByTestId('login-pin').isVisible()) && (await q.getByRole('link', { name: /oublié/ }).isVisible()),
  );
  await q.locator('#pin').fill('9753');
  await q.waitForTimeout(900);
  check('mauvais code refusé', await q.getByText('Code secret incorrect').isVisible());
  await q.screenshot({ path: SP + '/cs-4-erreur.png' });
  await q.locator('#pin').fill('2468');
  await q.waitForTimeout(1500);
  check(
    'bon code : espace cliente, prénom retrouvé',
    await q.getByRole('heading', { name: /Awa/, level: 1 }).isVisible(),
  );
  // Gérante : remise à zéro
  const list = (await api('/api/admin/customers', { headers: A })).body.customers;
  check(
    'gérante : cliente avec code secret',
    list.some(c => c.phone === '+221775551234' && c.hasPin),
  );
  check(
    'code jamais renvoyé au navigateur',
    !JSON.stringify(list).includes('pinHash') && !JSON.stringify(list).includes('pinSalt'),
  );
  await api('/api/admin/customers/%2B221775551234/reset-pin', { method: 'POST', headers: A });
  const s2 = await api('/api/auth/start', { method: 'POST', headers: A, body: JSON.stringify({ phone: '775551234' }) });
  check('après remise à zéro : nouveau code à choisir', s2.body?.hasPin === false && s2.body?.isNew === false);
  check('mobile : pas de débordement', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  console.log(res.join('\n'));
  console.log('errors', errors);
  await b.close();
})().catch(e => {
  console.log(res.join('\n'));
  console.log('ERR', e.message);
  process.exit(1);
});
