// Données d'exemple (MP_DEMO=1) : au démarrage, la place de marché se remplit par les vraies routes du
// serveur ; on vérifie que chaque étape a fonctionné (commandes, codes, courses, avis, signalement,
// livraisons ratées, registre) et que les écrans de la cliente, du livreur et de la gérante s'affichent.
const { chromium, devices } = require('playwright');
const SP = process.env.SP;
const B = 'http://localhost:8787';
const A = { 'x-admin-pin': '2026', 'content-type': 'application/json' };
const res = [];
let browser;
const check = (n, ok, x = '') => res.push(`${ok ? 'OK  ' : 'FAIL'} ${n} ${x}`);
const j = async (p, opts = {}) => {
  const r = await fetch(B + p, { ...opts, headers: { 'content-type': 'application/json', ...(opts.headers || {}) } });
  return { status: r.status, body: await r.json().catch(() => null) };
};
// Comptes d'exemple : code secret choisi à la première connexion (WhatsApp non relié)
const pinLogin = async (phone, pin) =>
  (await j('/api/auth/pin', { method: 'POST', body: JSON.stringify({ phone, pin }) })).body.token;

(async () => {
  // La création se fait juste après le démarrage : on attend qu'elle soit finie
  let listings = [];
  for (let i = 0; i < 60 && listings.length < 15; i++) {
    listings = (await j('/api/mp/listings')).body?.listings ?? [];
    if (listings.length < 15) await new Promise(r => setTimeout(r, 500));
  }
  check('15 articles publiés, avec photo', listings.length === 15 && listings.every(l => l.photos.length));
  await new Promise(r => setTimeout(r, 1500));
  const ov = (await j('/api/admin/mp/overview', { headers: A })).body;
  check(
    '5 boutiques validées, 1 à valider, 1 article à vérifier',
    ov.sellers.active === 5 && ov.sellers.en_attente === 1 && ov.listingsPending === 1,
    JSON.stringify(ov.sellers),
  );
  check('2 livreurs disponibles, 1 à valider', ov.drivers.online === 2 && ov.drivers.en_attente === 1);
  check('livreurs de la plateforme activés', ov.settings.drivers === true);

  const orders = (await j('/api/admin/mp/orders', { headers: A })).body.orders;
  const count = s => orders.filter(o => o.status === s).length;
  check(
    'commandes à toutes les étapes',
    count('livree') === 2 &&
      count('annulee') === 2 &&
      count('en_livraison') === 1 &&
      count('prete') === 1 &&
      count('nouvelle') === 3,
    orders.map(o => o.status).join(','),
  );
  check(
    'chaque commande a ses codes de remise',
    orders.every(o => /^\d{4}$/.test(o.handover?.pickup ?? '')),
  );
  check(
    'avis 5 et 4 étoiles',
    orders
      .filter(o => o.review)
      .map(o => o.review.seller.stars)
      .sort()
      .join() === '4,5',
  );
  const trips = (await j('/api/admin/mp/trips', { headers: A })).body.trips;
  check(
    'groupe moitié-moitié ouvert avec 2 commandes',
    trips.some(t => t.mode === 'partagee' && t.status === 'ouverte' && t.orders.length === 2),
  );
  const disputes = (await j('/api/admin/mp/disputes', { headers: A })).body.disputes;
  check('un signalement ouvert, remise prouvée par le code', disputes.length === 1 && disputes[0].codeChecked === true);

  const sec = (await j('/api/admin/mp/security', { headers: A })).body;
  check(
    'Mariama bloquée (2 livraisons ratées)',
    sec.buyers.some(b => b.name === 'Mariama' && b.blocked),
  );
  check('vendeuse pas payée signalée', sec.unpaidSellers.length === 1);
  check('registre intact', sec.ledger.ok && sec.ledger.count >= 10, JSON.stringify(sec.ledger));

  // Comptes d'exemple utilisables
  const ibrahima = await pinLogin('70 000 03 02', '4682');
  const offers = (await j('/api/mp/driver/trips', { headers: { Authorization: `Bearer ${ibrahima}` } })).body.trips;
  check('Ibrahima : une course proposée', offers.length === 1);
  const khady = await pinLogin('70 000 02 01', '9137');
  const mine = (await j('/api/mp/me/orders', { headers: { Authorization: `Bearer ${khady}` } })).body.orders;
  const enRoute = mine.find(o => o.status === 'en_livraison');
  const track = (await j(`/api/mp/me/orders/${enRoute.id}/driver`, { headers: { Authorization: `Bearer ${khady}` } }))
    .body.tracking;
  check('Khady : colis en route, livreur visible sur la carte', track?.phase === 'vers_vous' && !!track.position);

  // Écrans
  const b = (browser = await chromium.launch());
  const errors = [];
  const mk = async (device, token) => {
    const ctx = await b.newContext({ ...devices[device], serviceWorkers: 'block' });
    await ctx.route(/pexels|fonts\.g|tile|openstreetmap|arcgis|wa\.me|nominatim|overpass/, r =>
      r.fulfill({ status: 204, body: '' }),
    );
    if (token) await ctx.addInitScript(t => localStorage.setItem('maefa_token', t), token);
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    return p;
  };
  const home = await mk('Pixel 7');
  await home.goto(B + '/m');
  await home.waitForTimeout(2000);
  check('accueil : articles affichés', (await home.locator('a[href*="/m/annonce/"]').count()) >= 8);
  await home.screenshot({ path: `${SP}/demo-1-accueil.png` });

  const moussa = await mk('Pixel 7', await pinLogin('70 000 03 01', '5739'));
  await moussa.goto(B + '/m/livreur');
  await moussa.waitForSelector('[data-testid="mp-driver-trip"]', { timeout: 15000 });
  check('Moussa : course en cours avec le dépôt à faire', (await moussa.getByTestId('mp-stop-code').count()) === 1);
  await moussa.screenshot({ path: `${SP}/demo-2-livreur.png` });

  const g = await mk('Desktop Chrome');
  await g.addInitScript(() => {
    sessionStorage.setItem('maefa_admin', '1');
    sessionStorage.setItem('maefa_admin_pin', '2026');
  });
  await g.goto(B + '/admin');
  await g.waitForTimeout(800);
  await g.getByRole('button', { name: 'Place de marché' }).click();
  await g.waitForTimeout(1000);
  await g.getByRole('button', { name: 'Sécurité' }).click();
  await g.waitForSelector('[data-testid="admin-mp-ledger"]', { timeout: 10000 });
  check(
    'gérante : registre intact affiché',
    /Registre intact/.test(await g.getByTestId('admin-mp-ledger').innerText()),
  );
  await g.screenshot({ path: `${SP}/demo-3-gerante.png`, fullPage: true });

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  console.log(res.join('\n'));
  await b.close();
})().catch(async e => {
  console.log(res.join('\n'));
  console.log('ERR', e.message);
  const pages = browser ? browser.contexts().flatMap(c => c.pages()) : [];
  for (const [i, pg] of pages.entries()) await pg.screenshot({ path: `${SP}/demo-erreur-${i}.png` }).catch(() => {});
  process.exit(1);
});
