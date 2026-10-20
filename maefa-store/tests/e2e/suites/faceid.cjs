// Connexion par Face ID / empreinte (passkeys WebAuthn) : un authentificateur virtuel de Chromium
// joue le rôle du Face ID de l'iPhone (vérification de la personne réussie).
const { chromium, devices } = require('playwright');
const SP = process.env.SP;
const B = 'http://localhost:8787';
const res = [];
const check = (n, ok, x = '') => res.push(`${ok ? 'OK  ' : 'FAIL'} ${n} ${x}`);
(async () => {
  const b = await chromium.launch();
  const errors = [];
  const mk = async (device = devices['iPhone 14']) => {
    const ctx = await b.newContext({ ...device, serviceWorkers: 'block' });
    await ctx.route(/pexels|fonts\.g|tile|openstreetmap|arcgis|wa\.me/, r => r.fulfill({ status: 204, body: '' }));
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    // « Face ID » simulé : clé gardée dans le téléphone, vérification de la personne réussie
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('WebAuthn.enable');
    const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    });
    return { ctx, p, cdp, authenticatorId };
  };
  const shot = (p, n) => p.screenshot({ path: `${SP}/fi-${n}.png` });

  // ── 1. Première connexion par code, puis activation de Face ID
  const { p, cdp, authenticatorId } = await mk();
  await p.goto(B + '/compte');
  await p.waitForTimeout(1200);
  check('écran de connexion : « Se connecter avec Face ID »', await p.getByTestId('passkey-login').isVisible());
  await shot(p, '1-connexion');
  await p.getByLabel('Numéro de téléphone').fill('77 555 66 77');
  await p.getByRole('button', { name: /Continuer/ }).click();
  await p.waitForTimeout(800);
  const devCode = (await p.locator('strong.tracking-widest').innerText()).trim();
  await p.locator('#otp').fill(devCode);
  await p.waitForTimeout(1200);
  await p.getByLabel('Votre prénom').fill('Ndeye');
  await p.getByRole('button', { name: /Entrer dans mon espace/ }).click();
  await p.waitForTimeout(1200);
  check('proposition « connectez-vous avec Face ID »', await p.getByTestId('faceid-prompt').isVisible());
  await shot(p, '2-proposition');
  await p.getByTestId('faceid-prompt-enable').click();
  await p.waitForTimeout(1500);
  const token = await p.evaluate(() => localStorage.getItem('maefa_token'));
  const mine = await (await fetch(B + '/api/me/passkeys', { headers: { Authorization: `Bearer ${token}` } })).json();
  check('Face ID activé (1 appareil « iPhone »)', mine.passkeys?.length === 1 && mine.passkeys[0].name === 'iPhone');
  check('la proposition disparaît', !(await p.getByTestId('faceid-prompt').isVisible()));
  const creds = (await cdp.send('WebAuthn.getCredentials', { authenticatorId })).credentials;
  check('clé gardée dans le téléphone (clé « résidente »)', creds.length === 1 && creds[0].isResidentCredential);
  await p.getByTestId('faceid-panel').scrollIntoViewIfNeeded();
  check('espace : appareil listé', /iPhone/.test(await p.getByTestId('faceid-devices').innerText()));
  await shot(p, '3-panneau');

  // Le serveur ne garde ni visage ni clé privée ; l'export ne montre que l'appareil
  const exp = await (await fetch(B + '/api/me/export', { headers: { Authorization: `Bearer ${token}` } })).json();
  check(
    'mes données : appareil sans clé',
    exp.appareils?.length === 1 && !JSON.stringify(exp).includes('publicKey'),
    JSON.stringify(exp.appareils),
  );

  // ── 2. Déconnexion puis connexion par Face ID, sans numéro ni code
  await p.getByRole('button', { name: /Me déconnecter/ }).click();
  await p.waitForTimeout(800);
  await p.getByTestId('passkey-login').click();
  await p.waitForTimeout(2000);
  check('connexion par Face ID : espace ouvert', await p.getByRole('heading', { name: /Ndeye/, level: 1 }).isVisible());
  const t2 = await p.evaluate(() => localStorage.getItem('maefa_token'));
  check('nouvelle session', !!t2 && t2 !== token);
  await shot(p, '4-connectee');

  // ── 3. Contrefaçons refusées
  const o = await (
    await fetch(B + '/api/auth/passkey/options', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    })
  ).json();
  const fake = await fetch(B + '/api/auth/passkey/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      challengeId: o.challengeId,
      response: {
        id: mine.passkeys[0].id,
        rawId: mine.passkeys[0].id,
        type: 'public-key',
        response: { clientDataJSON: 'e30', authenticatorData: 'AAAA', signature: 'AAAA' },
        clientExtensionResults: {},
      },
    }),
  });
  check('signature fausse refusée', fake.status === 401, String(fake.status));
  const replay = await fetch(B + '/api/auth/passkey/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ challengeId: o.challengeId, response: {} }),
  });
  check('défi à usage unique', replay.status === 400, String(replay.status));

  // ── 4. Un autre téléphone sans Face ID activé : pas d'accès
  const other = await mk(devices['Pixel 7']);
  await other.p.goto(B + '/compte');
  await other.p.waitForTimeout(1000);
  check('Android : bouton empreinte', /empreinte/i.test(await other.p.getByTestId('passkey-login').innerText()));
  await other.p.getByTestId('passkey-login').click();
  await other.p.waitForTimeout(2500);
  check('téléphone inconnu : pas connecté', await other.p.getByTestId('login-phone').isVisible());
  await shot(other.p, '5-inconnu');

  // ── 5. Retirer l'appareil : Face ID ne marche plus pour ce compte
  await p.getByTestId('faceid-panel').scrollIntoViewIfNeeded();
  p.once('dialog', d => d.accept());
  await p.getByRole('button', { name: 'Retirer iPhone' }).click();
  await p.waitForTimeout(1000);
  const after = await (await fetch(B + '/api/me/passkeys', { headers: { Authorization: `Bearer ${t2}` } })).json();
  check('appareil retiré', after.passkeys?.length === 0);
  await p.getByRole('button', { name: /Me déconnecter/ }).click();
  await p.waitForTimeout(800);
  await p.getByTestId('passkey-login').click();
  await p.waitForTimeout(2000);
  check('après retrait : message clair', await p.getByText(/pas activé pour ce compte/).isVisible());

  // ── 6. Gérante : activer Face ID, puis entrer sans le code PIN
  const g = await mk();
  await g.p.goto(B + '/admin');
  await g.p.waitForTimeout(1000);
  check(
    'gérante : pas de bouton Face ID avant activation',
    !(await g.p.getByTestId('admin-passkey-login').isVisible()),
  );
  await g.p.getByLabel('Code PIN').fill('2026');
  await g.p.getByRole('button', { name: 'Se connecter' }).click();
  await g.p.waitForTimeout(1500);
  await g.p.getByTestId('admin-faceid').scrollIntoViewIfNeeded();
  await g.p.getByTestId('admin-faceid-enable').click();
  await g.p.waitForTimeout(1500);
  check('gérante : Face ID activé', /iPhone/.test(await g.p.getByTestId('admin-faceid-devices').innerText()));
  await shot(g.p, '6-gerante-active');
  await g.p.getByRole('button', { name: /Déconnexion/ }).click();
  await g.p.waitForTimeout(1000);
  check('gérante : bouton « Entrer avec Face ID »', await g.p.getByTestId('admin-passkey-login').isVisible());
  await shot(g.p, '7-gerante-connexion');
  await g.p.getByTestId('admin-passkey-login').click();
  await g.p.waitForTimeout(2000);
  check(
    'gérante : espace ouvert sans code',
    (await g.p.getByRole('heading', { name: 'Espace gérant', level: 1 }).isVisible()) &&
      (await g.p.getByRole('navigation', { name: 'Rubriques' }).isVisible()),
  );
  const adminToken = await g.p.evaluate(
    () =>
      sessionStorage.getItem('maefa_admin_pin') || Object.values(sessionStorage).find(v => v.split('.').length === 3),
  );
  const list = await fetch(B + '/api/admin/comments', { headers: { 'x-admin-pin': adminToken || '' } });
  check('gérante : jeton accepté par le serveur', list.status === 200, String(list.status));
  // La clé de la cliente ne donne pas accès à l'espace gérant
  const ao = await (await fetch(B + '/api/admin/passkey/options', { method: 'POST' })).json();
  check('espace gérant : seuls ses appareils sont proposés', ao.options?.allowCredentials?.length === 1);

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  console.log(res.join('\n'));
  await b.close();
})().catch(e => {
  console.log(res.join('\n'));
  console.log('ERR', e.message);
  process.exit(1);
});
