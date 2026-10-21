// Fil « Pour vous » façon TikTok : il apprend les goûts (sur le téléphone), garde de la découverte,
// lit les vidéos des vendeurs ; les gestes anonymes font monter la tendance côté serveur.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const SP = process.env.SP;
const B = 'http://localhost:8787';
const A = { 'x-admin-pin': '2026', 'content-type': 'application/json' };
const PHOTO = fs.readFileSync(path.join(__dirname, '../fixtures/photos/p0.jpg'));
// WebM : lisible par le Chromium des tests (le MP4/H.264 n'y est pas inclus)
const VIDEO = fs.readFileSync(path.join(__dirname, '../../../public/videos/sac-ndella-camel.webm'));
const res = [];
let browser;
const check = (n, ok, x = '') => res.push(`${ok ? 'OK  ' : 'FAIL'} ${n} ${x}`);
const j = async (p, opts = {}) => {
  const r = await fetch(B + p, { ...opts, headers: { 'content-type': 'application/json', ...(opts.headers || {}) } });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const login = async phone => {
  const s = await j('/api/auth/start', { method: 'POST', body: JSON.stringify({ phone }) });
  const v = await j('/api/auth/verify', { method: 'POST', body: JSON.stringify({ phone, code: s.body.devCode }) });
  return { Authorization: `Bearer ${v.body.token}` };
};

(async () => {
  // ── Mise en place : 3 boutiques (2 de téléphones, 1 de mode), 8 articles, dont un avec vidéo
  const shops = [
    { phone: '77 410 00 01', shopName: 'Tech Sandaga', category: 'electronique', n: 2, title: 'Téléphone' },
    { phone: '77 410 00 02', shopName: 'Phone Center HLM', category: 'electronique', n: 2, title: 'Écouteurs' },
    { phone: '77 410 00 03', shopName: 'Wax et Mode', category: 'mode', n: 4, title: 'Robe' },
  ];
  let videoUrl = null;
  for (const [si, s] of shops.entries()) {
    const H = await login(s.phone);
    await j('/api/mp/me/seller', {
      method: 'POST',
      headers: H,
      body: JSON.stringify({
        shopName: s.shopName,
        category: s.category,
        zone: 'Dakar',
        location: { lat: 14.68 + si * 0.01, lng: -17.45 },
      }),
    });
    const ph = await (
      await fetch(B + '/api/mp/me/photos', {
        method: 'POST',
        headers: { ...H, 'content-type': 'image/jpeg' },
        body: PHOTO,
      })
    ).json();
    if (si === 2) {
      const bad = await fetch(B + '/api/mp/me/videos', {
        method: 'POST',
        headers: { ...H, 'content-type': 'video/mp4' },
        body: PHOTO,
      });
      check('vidéo : une photo déguisée est refusée', bad.status === 415, String(bad.status));
      const v = await fetch(B + '/api/mp/me/videos', {
        method: 'POST',
        headers: { ...H, 'content-type': 'video/webm' },
        body: VIDEO,
      });
      videoUrl = (await v.json()).url;
      check('vidéo du vendeur envoyée', v.status === 201 && /\.webm$/.test(videoUrl || ''), videoUrl);
    }
    for (let i = 0; i < s.n; i++)
      await j('/api/mp/me/listings', {
        method: 'POST',
        headers: H,
        body: JSON.stringify({
          title: `${s.title} ${i + 1}`,
          price: s.category === 'mode' ? 12000 + i * 1000 : 60000 + i * 5000,
          category: s.category,
          photos: [ph.url],
          ...(si === 2 && i === 0 ? { video: videoUrl } : {}),
        }),
      });
  }
  for (const v of (await j('/api/admin/mp/sellers', { headers: A })).body.sellers)
    await j(`/api/admin/mp/sellers/${v.id}`, {
      method: 'PATCH',
      headers: A,
      body: JSON.stringify({ status: 'active' }),
    });
  for (const l of (await j('/api/admin/mp/listings?status=en_attente', { headers: A })).body.listings)
    await j(`/api/admin/mp/listings/${l.id}`, {
      method: 'PATCH',
      headers: A,
      body: JSON.stringify({ status: 'publiee' }),
    });
  const all = (await j('/api/mp/listings')).body.listings;
  check('8 articles en ligne', all.length === 8, String(all.length));
  const tels = all.filter(l => l.category === 'electronique');

  // ── Gestes anonymes : contrôlés et comptés une fois
  check(
    'identifiant de visite invalide refusé',
    (await j('/api/mp/events', { method: 'POST', body: JSON.stringify({ v: '<x>', events: [] }) })).status === 400,
  );
  const ev = {
    v: 'visite-test-123',
    events: [
      { t: 'like', id: tels[0].id },
      { t: 'like', id: tels[0].id },
    ],
  };
  await j('/api/mp/events', { method: 'POST', body: JSON.stringify(ev) });
  await j('/api/mp/events', { method: 'POST', body: JSON.stringify(ev) });
  const liked = (await j(`/api/mp/listings/${tels[0].id}`)).body.listing;
  check('« j’aime » compté une seule fois par visite', liked.likes === 1, String(liked.likes));

  // ── Le téléphone d'une visiteuse
  const b = (browser = await chromium.launch());
  const ctx = await b.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
  await ctx.route(/pexels|fonts\.g|tile|openstreetmap|arcgis|wa\.me/, r => r.fulfill({ status: 204, body: '' }));
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(B + '/m/pour-vous');
  await p.waitForSelector('[data-testid="mp-feed-item"]', { timeout: 15000 });
  check('fil « Pour vous » : plein écran, un article par écran', (await p.getByTestId('mp-feed-item').count()) >= 4);
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${SP}/pv-1-fil.png` });
  // Faire défiler jusqu'à la vidéo et vérifier qu'elle joue
  const hasVideo = await p.evaluate(async () => {
    const feed = document.querySelector('[data-testid="mp-feed"]');
    for (let i = 0; i < 10; i++) {
      const v = [...document.querySelectorAll('[data-testid="mp-feed-item"] video')][0];
      if (v) {
        v.scrollIntoView();
        await new Promise(r => setTimeout(r, 1500));
        return !v.paused || v.currentTime > 0;
      }
      feed.scrollBy(0, feed.clientHeight);
      await new Promise(r => setTimeout(r, 400));
    }
    return false;
  });
  check('la vidéo se lance toute seule à l’écran', hasVideo);
  await p.screenshot({ path: `${SP}/pv-2-video.png` });

  // Elle s'intéresse aux téléphones : deux fiches regardées, une aimée, une au panier
  for (const t of tels.slice(0, 2)) {
    await p.goto(B + `/m/annonce/${t.id}`);
    await p.waitForTimeout(5600);
  }
  await p.getByRole('button', { name: 'J’aime' }).click();
  await p.getByTestId('mp-add').click();
  await p.waitForTimeout(1200);
  const taste = await p.evaluate(() => JSON.parse(localStorage.getItem('mp_taste') || '{}'));
  check(
    'goûts gardés sur le téléphone : téléphones > mode',
    (taste.cats?.electronique ?? 0) > (taste.cats?.mode ?? 0),
    JSON.stringify(taste.cats),
  );

  // Le fil a appris
  await p.goto(B + '/m/pour-vous');
  await p.waitForSelector('[data-testid="mp-feed-item"]', { timeout: 15000 });
  await p.waitForTimeout(600);
  const order = await p.evaluate(() =>
    [...document.querySelectorAll('[data-testid="mp-feed-item"]')].map(el => ({
      title: el.querySelector('h2')?.textContent,
      why: el.querySelector('[data-testid="mp-why"]')?.textContent?.trim(),
    })),
  );
  const firstTwo = order
    .slice(0, 2)
    .map(o => o.title)
    .join(' | ');
  check(
    'le fil a appris : des téléphones en premier',
    order.slice(0, 2).every(o => /Téléphone|Écouteurs/.test(o.title)),
    firstTwo,
  );
  check('raison affichée : « Pour vous »', order[0].why === 'Pour vous', order[0].why);
  check(
    'de la découverte quand même (« À découvrir »)',
    order.some(o => o.why === 'À découvrir'),
    order.map(o => o.why).join(','),
  );
  await p.screenshot({ path: `${SP}/pv-3-appris.png` });

  // Accueil : la rangée « Pour vous »
  await p.goto(B + '/m');
  await p.waitForSelector('[data-testid="mp-for-you"]', { timeout: 10000 });
  const firstCard = await p.getByTestId('mp-for-you').getByTestId('mp-card').first().innerText();
  check('accueil : rangée « Pour vous » personnalisée', /Téléphone|Écouteurs/.test(firstCard), firstCard.slice(0, 40));
  await p.screenshot({ path: `${SP}/pv-4-accueil.png`, fullPage: false });

  // Côté serveur : la tendance a monté pour les articles regardés
  // (la visiteuse a aimé la 2e fiche regardée)
  const hot = (await j(`/api/mp/listings/${tels[1].id}`)).body.listing;
  check('tendance : « j’aime » de la visiteuse compté', hot.likes === 1, String(hot.likes));

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  console.log(res.join('\n'));
  await b.close();
})().catch(async e => {
  console.log(res.join('\n'));
  console.log('ERR', e.message);
  const pages = browser ? browser.contexts().flatMap(c => c.pages()) : [];
  for (const [i, pg] of pages.entries()) await pg.screenshot({ path: `${SP}/pv-erreur-${i}.png` }).catch(() => {});
  process.exit(1);
});
