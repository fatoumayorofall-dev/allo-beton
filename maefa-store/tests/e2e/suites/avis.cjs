// Avis et questions : visibles par toutes, refus des liens et numéros, réponse et modération de la
// gérante, badge « Cliente vérifiée » après une commande livrée.
const toCheckout = require('../tocheckout.cjs');
const { chromium, devices } = require('playwright');
const SP = process.env.SP;
const B = 'http://localhost:8787';
const A = { 'x-admin-pin': '2026', 'content-type': 'application/json' };
const res = [];
const check = (n, ok, x = '') => res.push(`${ok ? 'OK  ' : 'FAIL'} ${n} ${x}`);
(async () => {
  const b = await chromium.launch();
  const errors = [];
  const HOME = { latitude: 14.7167, longitude: -17.4677, accuracy: 15 };
  const mk = async () => {
    const ctx = await b.newContext({
      ...devices['Pixel 7'],
      serviceWorkers: 'block',
      geolocation: HOME,
      permissions: ['geolocation'],
    });
    await ctx.route(/pexels|fonts\.g|tile|openstreetmap|arcgis|api\.whatsapp|wa\.me/, r =>
      r.fulfill({ status: 204, body: '' }),
    );
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    return p;
  };
  const openAvis = async p => {
    await p.goto(B + '/produit/sac-ndella-noir');
    await p.waitForTimeout(1200);
    const acc = p.locator('#avis button').first();
    await acc.scrollIntoViewIfNeeded();
    await acc.click();
    await p.waitForTimeout(500);
  };

  // Visiteuse 1 : un avis avec note
  const p1 = await mk();
  await openAvis(p1);
  check(
    'fiche : « Avis et questions », aucun avis au départ',
    /Avis et questions \(0\)/i.test(await p1.locator('#avis').innerText()),
  );
  await p1.getByTestId('comment-open').click();
  const form = p1.getByTestId('comment-form');
  await form
    .locator('button[aria-label*="4"]')
    .first()
    .click()
    .catch(() => {});
  await form.getByLabel('Votre prénom').fill('Awa D.');
  await form.getByLabel('Votre message').fill('Très beau sac, la couleur est exactement comme sur la vidéo.');
  await form.getByTestId('comment-submit').click();
  await p1.waitForTimeout(800);
  check('avis publié tout de suite', (await p1.getByTestId('comment').count()) === 1);

  // Message avec numéro de téléphone : refusé
  await p1.getByTestId('comment-open').click();
  await p1.getByTestId('comment-form').getByLabel('Votre prénom').fill('Spam');
  await p1.getByTestId('comment-form').getByLabel('Votre message').fill('Moins cher chez moi, appelez le 77 000 11 22');
  await p1.getByTestId('comment-submit').click();
  await p1.waitForTimeout(600);
  check('numéro de téléphone refusé', await p1.getByText(/numéros de téléphone ne sont pas autorisés/).isVisible());
  await p1.screenshot({ path: `${SP}/av-1-fiche.png` });

  // Une question, par API
  const q = await fetch(`${B}/api/products/${await idOf('sac-ndella-noir')}/comments`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ author: 'Mariama', text: 'Est-ce que le sac ferme bien ?' }),
  });
  check('question publiée (sans note)', q.status === 201);
  const qid = (await q.json()).comment.id;

  // La gérante répond et masque l'avis
  const list = (await (await fetch(B + '/api/admin/comments', { headers: A })).json()).comments;
  const avis = list.find(c => c.author === 'Awa D.');
  await fetch(`${B}/api/admin/comments/${qid}`, {
    method: 'PATCH',
    headers: A,
    body: JSON.stringify({ reply: 'Oui, fermeture aimantée solide.' }),
  });
  await fetch(`${B}/api/admin/comments/${avis.id}`, {
    method: 'PATCH',
    headers: A,
    body: JSON.stringify({ status: 'masque' }),
  });

  // Visiteuse 2 : voit la question et la réponse, plus l'avis masqué
  const p2 = await mk();
  await openAvis(p2);
  const txt = await p2.getByTestId('product-comments').innerText();
  check('autre visiteuse : question visible', txt.includes('Est-ce que le sac ferme bien'));
  check(
    'autre visiteuse : réponse de Maefa visible',
    txt.includes('Réponse de Maefa') && txt.includes('fermeture aimantée'),
  );
  check('avis masqué par la gérante invisible', !txt.includes('Très beau sac'));
  await p2.screenshot({ path: `${SP}/av-2-reponse.png` });

  // Cliente vérifiée : connexion, commande livrée, puis avis
  const phone = '77 333 44 55';
  const start = await (
    await fetch(B + '/api/auth/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
  ).json();
  const login = await (
    await fetch(B + '/api/auth/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone, code: start.devCode }),
    })
  ).json();
  const p3 = await mk();
  await p3.goto(B + '/produit/sac-ndella-noir');
  await p3
    .getByRole('button', { name: /Ajouter au panier/ })
    .first()
    .click();
  await p3.waitForTimeout(400);
  await toCheckout(p3, B);
  await p3.waitForTimeout(1500);
  await p3.getByLabel('Prénom *').fill('Khady');
  await p3.getByLabel('Nom *', { exact: true }).fill('Sarr');
  await p3.getByLabel('Téléphone *').fill(phone);
  await p3.getByRole('button', { name: /Je suis ici/ }).click();
  await p3.waitForFunction(() => !document.querySelector('[data-testid="gps-progress"]'), null, { timeout: 30000 });
  await p3.getByTestId('confirm-location').click();
  await p3.waitForTimeout(600);
  await p3.getByRole('button', { name: 'Continuer vers le paiement' }).click();
  await p3.waitForTimeout(600);
  await p3
    .getByText('À la livraison')
    .first()
    .click()
    .catch(() => {});
  await p3.getByRole('button', { name: /^(Valider ma commande|Confirmer la commande)/ }).click();
  await p3.waitForURL(/confirmation/, { timeout: 10000 });
  const orderId = p3.url().split('/confirmation/')[1];
  await fetch(`${B}/api/admin/orders/${orderId}`, {
    method: 'PATCH',
    headers: A,
    body: JSON.stringify({ status: 'livree' }),
  });
  const v = await (
    await fetch(`${B}/api/products/${await idOf('sac-ndella-noir')}/comments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${login.token}` },
      body: JSON.stringify({ author: 'Khady S.', text: 'Reçu hier, conforme et bien emballé.', rating: 5 }),
    })
  ).json();
  check(
    'cliente ayant reçu la pièce : « Cliente vérifiée »',
    v.comment?.verified === true,
    JSON.stringify(v).slice(0, 120),
  );
  const anon = await (
    await fetch(`${B}/api/products/${await idOf('sac-ndella-noir')}/comments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ author: 'Inconnue', text: 'Je pense que c’est joli.' }),
    })
  ).json();
  check('sans commande : pas de badge', anon.comment?.verified === false);

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  console.log(res.join('\n'));
  await b.close();
})().catch(e => {
  console.log(res.join('\n'));
  console.log('ERR', e.message);
  process.exit(1);
});

async function idOf(slug) {
  const cat = (await (await fetch(B + '/api/catalog')).json()).products;
  if (cat) return cat.find(p => p.slug === slug).id;
  return 'MAE-103';
}
