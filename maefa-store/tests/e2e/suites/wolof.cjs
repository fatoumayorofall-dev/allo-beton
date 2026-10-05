const { chromium, devices } = require('playwright');
const fs = require('fs');
const SP = process.env.SP,
  B = 'http://localhost:8787',
  A = { 'x-admin-pin': '2026' };
const res = [];
const check = (n, ok, x = '') => res.push(`${ok ? 'OK  ' : 'FAIL'} ${n} ${x}`);
(async () => {
  const b = await chromium.launch({
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
  const errors = [];
  // La gérante enregistre la voix du sujet « paiement »
  const f = require('path').join(__dirname, '../fixtures/voix.wav');
  const put = await fetch(B + '/api/voice/guide-wo-fey', {
    method: 'PUT',
    headers: { ...A, 'content-type': f.endsWith('webm') ? 'audio/webm' : 'audio/wav' },
    body: fs.readFileSync(f),
  });
  check('voix du guide wolof enregistrée (gérante)', put.ok, String(put.status));
  const ctx = await b.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block', permissions: ['microphone'] });
  await ctx.route(/pexels|fonts\.g/, r => r.abort());
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(B + '/');
  await p.waitForTimeout(1200);
  await p.getByRole('button', { name: "Poser une question à l'assistante" }).click();
  await p.waitForTimeout(1500);
  await p.getByTestId('lang-wo').click();
  await p.waitForTimeout(500);
  check(
    'mode wolof : accueil en wolof',
    await p
      .getByText(/Salaam aleekum/)
      .first()
      .isVisible(),
  );
  check('mode wolof : 6 images du guide', (await p.getByTestId('wolof-guide').locator('button').count()) === 6);
  check('mode wolof : bouton micro', await p.getByTestId('voice-start').isVisible());
  await p.screenshot({ path: SP + '/wo-1-guide.png' });
  const voiceReq = p
    .waitForRequest(r => r.url().includes('/api/voice/guide-wo-fey'), { timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  await p.getByTestId('guide-fey').click();
  await p.waitForTimeout(800);
  check('sujet « paiement » : texte wolof', await p.getByText(/Mën nga fey ak Wave/).isVisible());
  const played = await voiceReq;
  check('sujet avec voix : lecture lancée', played);
  // Vocal vers WhatsApp (micro simulé)
  await p.getByTestId('voice-start').click();
  await p.waitForTimeout(2500);
  check('enregistrement en cours', await p.getByTestId('voice-stop').isVisible());
  await p.getByTestId('voice-stop').click();
  await p.waitForTimeout(800);
  check(
    'vocal prêt : écouter + envoyer',
    (await p.getByTestId('voice-ready').isVisible()) && (await p.getByTestId('voice-send').isVisible()),
  );
  await p.screenshot({ path: SP + '/wo-2-vocal.png' });
  // Langue gardée à la prochaine visite
  await p.reload();
  await p.waitForTimeout(1000);
  await p.getByRole('button', { name: "Poser une question à l'assistante" }).click();
  await p.waitForTimeout(1200);
  check(
    'langue wolof mémorisée',
    await p
      .getByText(/Salaam aleekum/)
      .first()
      .isVisible(),
  );
  // Question écrite en wolof sans IA : réponse de secours en wolof
  await p
    .getByRole('button', { name: 'Nouvelle conversation' })
    .click()
    .catch(() => {});
  await p.getByLabel('Sa laaj').fill('naka laay fey ?');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1500);
  check('réponse de secours en wolof', (await p.getByText(/Mën nga fey ak Wave/).count()) > 0);
  await p.getByTestId('lang-fr').click();
  await p.waitForTimeout(300);
  check('retour en français', await p.getByText(/Bonjour, je suis/).isVisible());
  check('mobile : pas de débordement', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  // Gérante : section guide vocal
  const a = await (await b.newContext({ viewport: { width: 1300, height: 900 }, serviceWorkers: 'block' })).newPage();
  await a.goto(B + '/admin');
  await a.getByLabel('Code PIN').fill('2026');
  await a.getByRole('button', { name: 'Se connecter' }).click();
  await a.waitForTimeout(600);
  await a.getByRole('button', { name: /Statut WhatsApp/ }).click();
  await a.waitForTimeout(1000);
  const sec = a.getByTestId('wolof-voices');
  check('gérante : section guide vocal wolof', (await sec.isVisible()) && /\(1\/6\)/.test(await sec.innerText()));
  await sec.screenshot({ path: SP + '/wo-3-admin.png' });
  console.log(res.join('\n'));
  console.log('errors', errors);
  await b.close();
})().catch(e => {
  console.log(res.join('\n'));
  console.log('ERR', e.message);
  process.exit(1);
});
