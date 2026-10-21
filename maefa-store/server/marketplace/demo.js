// ============================================================
//  DONNÉES D'EXEMPLE DE LA PLACE DE MARCHÉ (site de test seulement)
//  Au démarrage, si la place de marché est vide et que MP_DEMO=1 (ou, à défaut, NOINDEX=1, le
//  marqueur du site de test) : boutiques, points relais, articles, livreurs, clientes et commandes
//  à toutes les étapes. Tout passe par les vraies routes du serveur (codes de remise, courses,
//  partage de l'argent, registre) : si ces données se créent, le parcours complet fonctionne.
//  Aucun message ne part pendant la création (numéros fictifs en 70 000 …).
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PHOTOS = path.join(here, 'demo');
/** Photos des articles Maefa : celles du site compilé (ou du dossier public en développement) */
const PRODUITS = [
  path.join(here, '..', '..', 'dist', 'produits'),
  path.join(here, '..', '..', 'public', 'produits'),
].find(d => fs.existsSync(d));
/** Numéro de la gérante : sa boutique Maefa sur la place de marché (elle s'y connecte avec son numéro) */
const OWNER = process.env.OWNER_WHATSAPP || '+221773093819';

export const demoEnabled = () =>
  process.env.MP_DEMO !== undefined ? process.env.MP_DEMO === '1' : process.env.NOINDEX === '1';

/** Comptes d'exemple : la gérante peut s'y connecter (numéro, puis code secret choisi la première fois). */
export const DEMO_ACCOUNTS = {
  awa: { phone: '+221700000101', firstName: 'Awa', role: 'vendeuse (Chez Awa Mode)' },
  bineta: { phone: '+221700000102', firstName: 'Bineta', role: 'vendeuse sans adresse fixe' },
  thies: { phone: '+221700000103', firstName: 'Mame Diarra', role: 'vendeuse en point relais' },
  ndeye: { phone: '+221700000104', firstName: 'Ndèye', role: 'vendeuse' },
  tech: { phone: '+221700000105', firstName: 'Ousmane', role: 'vendeur formule Pro' },
  rufisque: { phone: '+221700000106', firstName: 'Coumba', role: 'boutique à valider' },
  maefa: { phone: OWNER, firstName: 'Fatoumata', role: 'boutique Maefa (vos articles, prix à négocier)' },
  khady: { phone: '+221700000201', firstName: 'Khady', role: 'cliente' },
  fatou: { phone: '+221700000202', firstName: 'Fatou', role: 'cliente' },
  mariama: { phone: '+221700000203', firstName: 'Mariama', role: 'cliente bloquée (2 livraisons ratées)' },
  rokhaya: { phone: '+221700000204', firstName: 'Rokhaya', role: 'cliente (moitié-moitié)' },
  seynabou: { phone: '+221700000205', firstName: 'Seynabou', role: 'cliente (moitié-moitié)' },
  moussa: { phone: '+221700000301', firstName: 'Moussa', role: 'livreur (course en cours)' },
  ibrahima: { phone: '+221700000302', firstName: 'Ibrahima', role: 'livreur' },
  cheikh: { phone: '+221700000303', firstName: 'Cheikh', role: 'livreur à valider' },
};

const PLACES = {
  medina: { lat: 14.6865, lng: -17.452, label: 'Médina, Dakar', landmark: 'face à la pharmacie' },
  sandaga: { lat: 14.6712, lng: -17.4366, label: 'Marché Sandaga, Dakar' },
  plateau: { lat: 14.6678, lng: -17.4381, label: 'Plateau, Dakar' },
  parcelles: { lat: 14.7642, lng: -17.4392, label: 'Parcelles Assainies U17' },
  grandYoff: { lat: 14.7372, lng: -17.4605, label: 'Grand Yoff' },
  liberte6: { lat: 14.7258, lng: -17.4633, label: 'Liberté 6' },
  pikine: { lat: 14.7545, lng: -17.3964, label: 'Pikine' },
  guediawaye: { lat: 14.7769, lng: -17.4006, label: 'Guédiawaye' },
  pattedoie: { lat: 14.7466, lng: -17.4573, label: "Patte d'Oie", landmark: 'devant la station-service' },
  rufisque: { lat: 14.7167, lng: -17.2667, label: 'Rufisque' },
  dakar: { lat: 14.7167, lng: -17.4677, label: 'Dakar' },
};

/**
 * Crée les données d'exemple. deps : { base, store, openSession, adminPin, wa, log }.
 * Renvoie un résumé, ou null si rien n'a été fait (place de marché déjà remplie, pas de code gérante).
 */
export async function seedDemo({ base, store, openSession, adminPin, wa, log = console.log }) {
  if (store.listMpSellers().length) return null;
  if (!adminPin) {
    log('  Données d’exemple : ADMIN_PIN manquant, rien n’a été créé');
    return null;
  }
  return wa.silently(() => run({ base, store, openSession, adminPin }));
}

async function run({ base, store, openSession, adminPin }) {
  const A = { 'x-admin-pin': adminPin };
  const call = async (method, url, body, headers = {}) => {
    const r = await fetch(base + url, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await r.json().catch(() => null);
    if (!r.ok) throw new Error(`${method} ${url} → ${r.status} ${data?.error ?? ''}`);
    return data;
  };
  // Un compte par personne : session ouverte directement (pas de code par message pour des numéros fictifs)
  const H = {};
  for (const [key, a] of Object.entries(DEMO_ACCOUNTS)) {
    store.saveUser(a.phone, { firstName: a.firstName, lastName: '', ...(a.phone === OWNER ? {} : { demo: true }) });
    H[key] = { Authorization: `Bearer ${openSession(a.phone)}` };
  }
  const upload = async (who, file) => {
    const r = await fetch(`${base}/api/mp/me/photos`, {
      method: 'POST',
      headers: { ...H[who], 'content-type': file.endsWith('.png') ? 'image/png' : 'image/jpeg' },
      body: fs.readFileSync(file),
    });
    return (await r.json()).url;
  };
  const photo = (who, name) => upload(who, path.join(PHOTOS, `${name}.jpg`));
  const DEMO = '\n\n(Boutique de démonstration)';

  // ── Réglages : livreurs de la plateforme activés (codes de remise, moitié-moitié, plafond)
  await call('PATCH', '/api/admin/mp/settings', { drivers: true }, A);

  // ── Points relais
  const relayMedina = (
    await call(
      'POST',
      '/api/admin/mp/relays',
      {
        name: 'Boutique Fatou',
        zone: 'Médina',
        hours: '9 h – 21 h',
        phone: '70 000 09 01',
        location: { ...PLACES.medina, label: 'Rue 11 x 22, Médina' },
      },
      A,
    )
  ).relay;
  await call(
    'POST',
    '/api/admin/mp/relays',
    {
      name: 'Kiosque Ndiaye',
      zone: 'Parcelles Assainies',
      hours: '8 h – 22 h',
      phone: '70 000 09 02',
      location: { ...PLACES.parcelles, landmark: 'à côté de la boulangerie' },
    },
    A,
  );

  // ── Boutiques : à une adresse, sans adresse fixe, en point relais ; une formule Pro, une à valider
  const shops = [
    [
      'awa',
      'Chez Awa Mode',
      'mode',
      'Médina',
      'Robes et ensembles en wax cousus à Dakar.',
      { location: PLACES.medina },
    ],
    [
      'bineta',
      'Bineta Beauté',
      'beaute',
      'Parcelles Assainies',
      'Karité, savon noir et thiouraye faits maison. Vente en ligne, sans boutique.',
      { pickupMode: 'variable', location: PLACES.parcelles },
    ],
    [
      'thies',
      'Saveurs de Thiès',
      'epicerie',
      'Thiès',
      'Bissap, bouye et café Touba : produits du terroir.',
      { pickupMode: 'relais', relayId: relayMedina.id },
    ],
    [
      'ndeye',
      'Ndèye Chaussures',
      'mode',
      'Sandaga',
      'Sandales en cuir et sacs en raphia.',
      { location: PLACES.sandaga },
    ],
    [
      'tech',
      'Tech Plateau',
      'electronique',
      'Plateau',
      'Téléphones reconditionnés et accessoires.',
      { location: PLACES.plateau },
    ],
    [
      'rufisque',
      'Ustensiles Rufisque',
      'maison',
      'Rufisque',
      'Marmites et ustensiles de cuisine.',
      { location: PLACES.rufisque },
    ],
  ];
  for (const [who, shopName, category, zone, description, extra] of shops)
    await call(
      'POST',
      '/api/mp/me/seller',
      { shopName, category, zone, description: description + DEMO, ...extra },
      H[who],
    );
  // Vitrines : couleur et bannière de chaque boutique en ligne
  for (const [who, accent, img] of [
    ['awa', 'corail', 'robe-wax'],
    ['bineta', 'emeraude', 'karite'],
    ['thies', 'terracotta', 'bissap'],
    ['ndeye', 'or', 'sandales-cuir'],
    ['tech', 'indigo', 'telephone'],
  ])
    await call('POST', '/api/mp/me/seller', { accent, cover: await photo(who, img) }, H[who]);

  // ── Articles (images d'exemple)
  const L = {};
  const articles = [
    [
      'robe',
      'awa',
      'robe-wax',
      'Robe wax longue',
      15000,
      'mode',
      { variantLabel: 'Taille', variants: ['S', 'M', 'L', 'XL'], stock: 12 },
    ],
    ['boubou', 'awa', 'boubou-brode', 'Ensemble boubou brodé', 35000, 'mode', { stock: 4 }],
    [
      'chemise',
      'awa',
      'chemise-wax',
      'Chemise wax homme',
      9000,
      'mode',
      { variantLabel: 'Taille', variants: ['M', 'L', 'XL'] },
    ],
    [
      'enfant',
      'awa',
      'boubou-enfant',
      'Boubou enfant',
      7500,
      'enfants',
      { variantLabel: 'Âge', variants: ['2 ans', '4 ans', '6 ans'] },
    ],
    ['karite', 'bineta', 'karite', 'Beurre de karité pur (250 g)', 3500, 'beaute', { stock: 40 }],
    ['thiouraye', 'bineta', 'thiouraye', 'Thiouraye parfumé', 5000, 'beaute', {}],
    ['savon', 'bineta', 'savon-noir', 'Savon noir artisanal', 2000, 'beaute', { stock: 60 }],
    ['bissap', 'thies', 'bissap', 'Bissap séché (1 kg)', 2500, 'epicerie', { stock: 50 }],
    ['bouye', 'thies', 'bouye', 'Jus de bouye (1 L)', 1500, 'epicerie', { stock: 30 }],
    ['cafe', 'thies', 'cafe-touba', 'Café Touba (500 g)', 2000, 'epicerie', {}],
    [
      'sandales',
      'ndeye',
      'sandales-cuir',
      'Sandales en cuir artisanales',
      12000,
      'mode',
      { variantLabel: 'Pointure', variants: ['37', '38', '39', '40', '41'] },
    ],
    ['sac', 'ndeye', 'sac-raphia', 'Sac en raphia tressé', 18000, 'sacs', { stock: 6 }],
    [
      'telephone',
      'tech',
      'telephone',
      'Téléphone Android reconditionné',
      65000,
      'electronique',
      { condition: 'occasion', stock: 3 },
    ],
    ['ecouteurs', 'tech', 'ecouteurs', 'Écouteurs sans fil', 8000, 'electronique', { stock: 15 }],
    ['chargeur', 'tech', 'chargeur', 'Chargeur rapide', 3000, 'electronique', {}],
    ['marmite', 'rufisque', 'marmite', 'Marmite en aluminium (10 L)', 14000, 'maison', {}],
  ];
  for (const [key, who, img, title, price, category, extra] of articles)
    L[key] = (
      await call(
        'POST',
        '/api/mp/me/listings',
        {
          title,
          price,
          category,
          photos: [await photo(who, img)],
          description: `${title}. Article d'exemple pour essayer la place de marché.`,
          ...extra,
        },
        H[who],
      )
    ).listing.id;

  // ── La gérante valide les boutiques (sauf Rufisque, laissée « à valider ») et publie les articles
  const sellerOf = who => store.findMpSellerByOwner(DEMO_ACCOUNTS[who].phone);
  for (const who of ['awa', 'bineta', 'thies', 'ndeye', 'tech'])
    await call('PATCH', `/api/admin/mp/sellers/${sellerOf(who).id}`, { status: 'active' }, A);
  for (const key of Object.keys(L).filter(k => k !== 'marmite'))
    await call('PATCH', `/api/admin/mp/listings/${L[key]}`, { status: 'publiee' }, A);
  await call('PATCH', `/api/admin/mp/sellers/${sellerOf('tech').id}`, { trusted: true }, A);
  await call('POST', `/api/admin/mp/sellers/${sellerOf('tech').id}/plan`, { months: 1 }, A);

  // ── Maefa : les sacs et chaussures de la boutique, avec leurs photos ; prix cachés, à négocier
  //    (comme sur la boutique, où les prix sont confidentiels)
  const M = [];
  if (PRODUITS) {
    await call(
      'POST',
      '/api/mp/me/seller',
      {
        shopName: 'Maefa',
        category: 'mode',
        zone: 'Dakar',
        description:
          'Chaussures et sacs pour femmes, 100 % en ligne. Paiement à la livraison : Wave, Orange Money ou espèces. Ni échange ni retour : vérifiez bien votre pointure. Prix à négocier : faites votre offre dans la messagerie.',
        pickupMode: 'variable',
        location: PLACES.dakar,
      },
      H.maefa,
    );
    await call('PATCH', `/api/admin/mp/sellers/${sellerOf('maefa').id}`, { status: 'active', trusted: true }, A);
    // Vitrine Maefa : son logo et l'image de la marque en bannière
    const site = path.dirname(PRODUITS);
    const logoFile = path.join(site, 'icons', 'icon-512.png');
    const coverFile = path.join(site, 'og-image.jpg');
    await call(
      'POST',
      '/api/mp/me/seller',
      {
        accent: 'prune',
        ...(fs.existsSync(logoFile) ? { logo: await upload('maefa', logoFile) } : {}),
        ...(fs.existsSync(coverFile) ? { cover: await upload('maefa', coverFile) } : {}),
      },
      H.maefa,
    );
    for (const a of JSON.parse(fs.readFileSync(path.join(PHOTOS, 'maefa.json'), 'utf8'))) {
      const photos = [];
      for (const f of a.photos) photos.push(await upload('maefa', path.join(PRODUITS, f)));
      const l = (
        await call(
          'POST',
          '/api/mp/me/listings',
          {
            title: a.title,
            price: a.price,
            priceMode: 'negocier',
            category: a.category,
            photos,
            description: a.description,
            variantLabel: a.variantLabel,
            variants: a.variants,
          },
          H.maefa,
        )
      ).listing;
      if (l.status !== 'publiee') await call('PATCH', `/api/admin/mp/listings/${l.id}`, { status: 'publiee' }, A);
      M.push(l);
    }
  }

  // ── Livreurs : deux validés et disponibles, un à valider
  const drivers = {};
  for (const [who, name, vehicle, zone, place] of [
    ['moussa', 'Moussa Diop', 'moto', 'Médina', PLACES.medina],
    ['ibrahima', 'Ibrahima Fall', 'voiture', 'Parcelles Assainies', PLACES.parcelles],
    ['cheikh', 'Cheikh Sow', 'velo', 'Pikine', PLACES.pikine],
  ]) {
    drivers[who] = (await call('POST', '/api/mp/me/driver', { name, vehicle, zone }, H[who])).driver;
    if (who === 'cheikh') continue;
    await call('PATCH', `/api/admin/mp/drivers/${drivers[who].id}`, { status: 'active' }, A);
    await call('POST', '/api/mp/me/driver/presence', { online: true, location: place }, H[who]);
  }

  // ── Outils : commander, préparer, livrer (avec les vrais codes de remise)
  const order = async (who, items, to, mode = 'express', wait) =>
    (
      await call(
        'POST',
        '/api/mp/orders',
        {
          items: items.map(([key, variant]) => ({ listingId: L[key], qty: 1, ...(variant ? { variant } : {}) })),
          to,
          name: DEMO_ACCOUNTS[who].firstName,
          mode,
          ...(wait ? { wait } : {}),
          payment: 'wave',
        },
        H[who],
      )
    ).orders[0];
  const sellerKeyOf = o => Object.keys(DEMO_ACCOUNTS).find(k => sellerOf(k)?.id === o.sellerId);
  const prepare = async (o, pickup) => {
    const who = sellerKeyOf(o);
    await call('PATCH', `/api/mp/me/sales/${o.id}`, { status: 'acceptee' }, H[who]);
    await call('PATCH', `/api/mp/me/sales/${o.id}`, { status: 'prete', ...(pickup ? { pickup } : {}) }, H[who]);
  };
  const codes = id => store.getMpOrder(id).handover;
  const take = async (driver, o) => {
    const tripId = store.getMpOrder(o.id).delivery.tripId;
    await call('POST', `/api/mp/driver/trips/${tripId}/accept`, undefined, H[driver]);
    return tripId;
  };
  const stop = (driver, tripId, id, kind) =>
    call(
      'POST',
      `/api/mp/driver/trips/${tripId}/stop`,
      { orderId: id, kind, code: kind === 'depot' ? codes(id).dropoff : codes(id).pickup },
      H[driver],
    );
  const deliver = async (driver, o, pickup) => {
    await prepare(o, pickup);
    const tripId = await take(driver, o);
    await stop(driver, tripId, o.id, 'enlevement');
    await stop(driver, tripId, o.id, 'depot');
  };
  const fail = async (driver, o, reason) => {
    await prepare(o);
    const tripId = await take(driver, o);
    await stop(driver, tripId, o.id, 'enlevement');
    await call('POST', `/api/mp/driver/trips/${tripId}/fail`, { orderId: o.id, reason }, H[driver]);
    await stop(driver, tripId, o.id, 'retour');
  };

  // 1. Khady : robe livrée par Moussa, 5 étoiles ; Moussa envoie la part d'Awa, qui confirme
  const o1 = await order('khady', [['robe', 'M']], PLACES.parcelles);
  await deliver('moussa', o1);
  await call(
    'POST',
    `/api/mp/me/orders/${o1.id}/review`,
    { sellerStars: 5, driverStars: 5, text: 'Très belle robe, bien cousue. Livrée le jour même.' },
    H.khady,
  );
  await call('POST', `/api/mp/driver/orders/${o1.id}/payout`, undefined, H.moussa);
  await call('PATCH', `/api/mp/me/sales/${o1.id}/payout`, { received: true }, H.awa);

  // 2. Fatou : karité de Bineta (sans adresse fixe : point de remise donné à « Colis prêt »), livré par
  //    Ibrahima ; 4 étoiles, puis un problème signalé ; Bineta n'a pas reçu son argent
  const o2 = await order('fatou', [['karite'], ['savon']], PLACES.grandYoff);
  await deliver('ibrahima', o2, { ...PLACES.pattedoie });
  await call(
    'POST',
    `/api/mp/me/orders/${o2.id}/review`,
    { sellerStars: 4, driverStars: 5, text: 'Bon karité.' },
    H.fatou,
  );
  await call(
    'POST',
    `/api/mp/me/orders/${o2.id}/problem`,
    { kind: 'abime', text: 'Le pot de karité était fissuré.' },
    H.fatou,
  );
  await call('POST', `/api/mp/driver/orders/${o2.id}/payout`, undefined, H.ibrahima);
  await call('PATCH', `/api/mp/me/sales/${o2.id}/payout`, { missing: true }, H.bineta);

  // 3. Mariama : deux livraisons ratées (absente, puis refus) → bloquée jusqu'à la décision de la gérante
  await fail('moussa', await order('mariama', [['bissap']], PLACES.guediawaye), 'absent');
  await fail('ibrahima', await order('mariama', [['cafe']], PLACES.guediawaye), 'refus');

  // 4. Moussa verse ses commissions ; la gérante l'enregistre
  const due = (await call('GET', '/api/admin/mp/drivers', undefined, A)).drivers.find(d => d.id === drivers.moussa.id)
    .balance.balance;
  if (due > 0) await call('POST', `/api/admin/mp/drivers/${drivers.moussa.id}/payments`, { amount: due }, A);

  // 5. Commandes en cours : en route (Moussa), prête (course proposée aux livreurs), nouvelle, moitié-moitié
  const o5 = await order('khady', [['sac']], PLACES.liberte6);
  await prepare(o5);
  const t5 = await take('moussa', o5);
  await stop('moussa', t5, o5.id, 'enlevement');
  await call('POST', '/api/mp/me/driver/presence', { online: true, location: PLACES.grandYoff }, H.moussa);

  await prepare(await order('fatou', [['ecouteurs']], PLACES.grandYoff));
  await order('khady', [['telephone']], PLACES.parcelles);
  await order('rokhaya', [['chemise', 'L']], PLACES.pikine, 'partagee', 240);
  await order('seynabou', [['sandales', '39']], PLACES.guediawaye, 'partagee', 240);

  // 6. Discussions : une question sans réponse, un marchandage conclu (prix convenu), une offre en attente
  const chatOn = async (who, listingId, text) =>
    (await call('POST', `/api/mp/listings/${listingId}/chat`, { text }, H[who])).chat;
  const say = (who, id, text) => call('POST', `/api/mp/me/chats/${id}/messages`, { text }, H[who]);
  const offer = async (who, id, amount) =>
    (await call('POST', `/api/mp/me/chats/${id}/offers`, { amount }, H[who])).chat.messages.at(-1).id;
  const answer = (who, id, msg, accept) => call('POST', `/api/mp/me/chats/${id}/offers/${msg}`, { accept }, H[who]);
  await chatOn('fatou', L.boubou, 'Bonjour, vous faites la taille XL ?');
  const soxna = M.find(l => l.title.startsWith('Sac Soxna'));
  if (soxna) {
    const c = await chatOn('khady', soxna.id, 'Bonjour, le sac Soxna existe en rouge ?');
    await say('maefa', c.id, 'Bonjour Khady, oui, il est disponible en rouge.');
    await offer('khady', c.id, 18000);
    const counter = await offer('maefa', c.id, 20000);
    await answer('khady', c.id, counter, true);
  }
  const mules = M.find(l => l.title.startsWith('Mules Zara à talon'));
  if (mules) {
    const c = await chatOn('seynabou', mules.id, 'Bonsoir, je peux les avoir en 39 ?');
    await offer('seynabou', c.id, 12000);
  }

  // 7. Un peu d'intérêt pour le fil « Pour vous » (vues et « j'aime » anonymes)
  const events = [];
  for (const [key, views, likes] of [
    ['robe', 9, 4],
    ['boubou', 6, 3],
    ['telephone', 8, 2],
    ['sandales', 5, 3],
    ['bissap', 4, 1],
    ['karite', 3, 1],
  ])
    for (let i = 0; i < views; i++)
      events.push(
        { v: `demo-visite-${i}`, t: 'view', id: L[key] },
        ...(i < likes ? [{ v: `demo-visite-${i}`, t: 'like', id: L[key] }] : []),
      );
  for (const [i, l] of M.slice(0, 6).entries())
    for (let k = 0; k < 7 - i; k++)
      events.push(
        { v: `demo-visite-${k}`, t: 'view', id: l.id },
        ...(k < 3 ? [{ v: `demo-visite-${k}`, t: 'like', id: l.id }] : []),
      );
  for (const v of [...new Set(events.map(e => e.v))])
    await call('POST', '/api/mp/events', { v, events: events.filter(e => e.v === v).map(({ t, id }) => ({ t, id })) });

  return {
    sellers: store.listMpSellers().length,
    listings: store.listMpListings().length,
    orders: store.listMpOrders().length,
    drivers: store.listMpDrivers().length,
    chats: store.listMpChats().length,
  };
}
