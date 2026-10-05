// ============================================================
//  SERVEUR MAEFA STORE
//  - /api/chat      : assistant IA (Claude), réponse diffusée en direct (SSE)
//  - /api/notify/*  : notifications WhatsApp (nouvelle commande, statut, retour en stock)
//  - /api/orders, /api/driver/*, /api/geo/* : commandes, livreur suivi en direct, carte
//  - /api/admin/media, /media/* : vidéos des pièces
//  - sert aussi le site compilé (dist/) en production, avec robots.txt, sitemap.xml et aperçus de liens
// ============================================================
import express from 'express';
import compression from 'compression';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
try {
  process.loadEnvFile(path.join(here, '.env'));
} catch {
  /* pas de fichier .env : variables d'environnement du système */
}
// Hébergement Render : l'adresse publique du site est fournie automatiquement
if (!process.env.SITE_URL && process.env.RENDER_EXTERNAL_URL) process.env.SITE_URL = process.env.RENDER_EXTERNAL_URL;

const { assistantEnabled, sanitizeMessages, streamAssistant, Anthropic } = await import('./assistant.js');
const wa = await import('./whatsapp.js');
const store = await import('./store.js');
const { registerAuthRoutes } = await import('./auth.js');
const { registerOrderRoutes } = await import('./orders.js');
const { registerMarketRoutes } = await import('./market.js');
const { registerCatalogRoutes } = await import('./catalog.js');
const { registerSeoRoutes } = await import('./seo.js');
const { registerAuthenticityRoutes } = await import('./authenticity.js');
const { registerBrandSecurityRoutes } = await import('./brandSecurity.js');
const { registerMediaRoutes } = await import('./media.js');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
// Pages, code et données compressés (≈ 3 fois moins de données mobiles) ; jamais la réponse en direct de l'assistante
app.use(compression({ filter: (req, res) => req.path !== '/api/chat' && compression.filter(req, res) }));
app.use(express.json({ limit: '300kb' }));

/* ---------- En-têtes de sécurité (clickjacking, injection de scripts, fuite d'adresses) ---------- */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // styles en ligne de React et de la carte
  "img-src 'self' data: blob: https:", // photos des pièces et tuiles de la carte
  "media-src 'self' blob: https:",
  "font-src 'self'",
  "connect-src 'self' https:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ');
app.use((req, res, next) => {
  res.set({
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(self), microphone=(self), camera=(self), payment=()', // GPS de livraison, voix des statuts
    'Cross-Origin-Opener-Policy': 'same-origin',
  });
  if (req.secure) res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

/* ---------- Limiteur de débit en mémoire (protège le coût IA et les envois WhatsApp) ---------- */
const buckets = new Map();
function limit(key, max, windowMs) {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter(t => now - t < windowMs);
  if (hits.length >= max) return false;
  hits.push(now);
  buckets.set(key, hits);
  return true;
}
setInterval(() => buckets.clear(), 6 * 3600e3).unref();

const ADMIN_PIN = process.env.ADMIN_PIN || '';
const { createAdminAuth } = await import('./adminAuth.js');
const { isAdmin, registerAdminLogin } = createAdminAuth(ADMIN_PIN);
registerAdminLogin(app);

/** Validation minimale d'une commande reçue du navigateur. */
function validOrder(o) {
  return (
    o &&
    typeof o.id === 'string' &&
    /^(MAE|EFA|FB)-[A-Z0-9]{4,12}$/.test(o.id) &&
    o.customer &&
    typeof o.customer.firstName === 'string' &&
    wa.toE164(o.customer.phone) &&
    Array.isArray(o.items) &&
    o.items.length > 0 &&
    o.items.length <= 50 &&
    Number.isFinite(o.total) &&
    coherentTotals(o)
  );
}

/**
 * Les montants envoyés par le navigateur doivent se tenir : sous-total = somme des articles,
 * total = sous-total − réduction + livraison + emballage, et chaque montant dans les limites de la boutique
 * (réduction au plus 10 % ou 5 000 F, livraison toujours payante : 1 500 à 5 000 F, emballage 0 ou 2 000 F).
 * Sans ce contrôle, une commande trafiquée pourrait afficher un faux total à la gérante.
 */
function coherentTotals(o) {
  const n = v => (v === undefined || v === null ? 0 : Number(v));
  const sub = o.items.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);
  const [subtotal, discount, deliveryFee, giftFee] = [
    n(o.subtotal ?? sub),
    n(o.discount),
    n(o.deliveryFee),
    n(o.giftFee),
  ];
  if (![sub, subtotal, discount, deliveryFee, giftFee].every(Number.isFinite)) return false;
  if (o.items.some(i => !(Number(i.quantity) >= 1 && Number(i.quantity) <= 100 && Number(i.price) >= 0))) return false;
  const maxDiscount = Math.max(Math.round(sub * 0.1), sub >= 40000 ? 5000 : 0);
  return (
    Math.abs(subtotal - sub) < 1 &&
    discount >= 0 &&
    discount <= maxDiscount &&
    deliveryFee >= 1500 &&
    deliveryFee <= 5000 &&
    (giftFee === 0 || giftFee === 2000) &&
    Math.abs(o.total - Math.max(0, subtotal - discount + deliveryFee + giftFee)) < 1
  );
}

/* ---------- État des services ---------- */
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    storage: true,
    database: store.STORAGE,
    accounts: true,
    orders: true,
    maps: true,
    market: true,
    catalog: true,
    assistant: assistantEnabled(),
    whatsapp: wa.whatsappEnabled(),
    ownerNotifications: wa.whatsappEnabled() && wa.ownerConfigured(),
    adminApi: !!ADMIN_PIN,
  });
});

/* ---------- Assistant IA ---------- */
app.post('/api/chat', async (req, res) => {
  if (!assistantEnabled()) return res.status(503).json({ error: 'assistant_disabled' });
  if (!limit(`chat:${req.ip}`, 120, 10 * 60e3))
    return res.status(429).json({ error: 'Trop de messages, réessayez dans quelques minutes.' });
  const messages = sanitizeMessages(req.body?.messages);
  if (!messages) return res.status(400).json({ error: 'Conversation invalide' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  const send = ev => res.write(`data: ${JSON.stringify(ev)}\n\n`);
  try {
    await streamAssistant(
      {
        messages,
        shop: req.body.shop,
        products: req.body.products,
        visitor: req.body.visitor,
        lang: req.body.lang === 'wo' ? 'wo' : 'fr',
      },
      send,
    );
  } catch (err) {
    let message = "L'assistante est momentanément indisponible.";
    if (err instanceof Anthropic.RateLimitError)
      message = 'Beaucoup de demandes en ce moment, réessayez dans un instant.';
    else if (err instanceof Anthropic.AuthenticationError) message = 'Assistant mal configuré (clé API).';
    else if (err instanceof Anthropic.APIError) console.error('Claude API', err.status ?? '(connexion)', err.message);
    else console.error('Assistant :', err);
    send({ type: 'error', message });
  }
  res.end();
});

/* ---------- WhatsApp : nouvelle commande (gérante + accusé de réception cliente) ---------- */
app.post('/api/notify/order', async (req, res) => {
  const order = req.body?.order;
  if (!validOrder(order)) return res.status(400).json({ error: 'Commande invalide' });
  const phone = wa.toE164(order.customer.phone);
  if (
    !limit(`order-ip:${req.ip}`, 40, 3600e3) ||
    !limit(`order-phone:${phone}`, 4, 3600e3) ||
    !limit(`order-id:${order.id}`, 1, 24 * 3600e3)
  ) {
    return res.status(429).json({ error: 'Trop de notifications' });
  }
  res.json(await wa.notifyNewOrder(order));
});

/* ---------- WhatsApp : changement de statut (réservé à la gérante) ---------- */
app.post('/api/notify/status', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
  const { order, status } = req.body || {};
  if (!validOrder(order) || !wa.STATUS_MESSAGES[status]) return res.status(400).json({ error: 'Requête invalide' });
  res.json(await wa.notifyStatus(order, status));
});

/* ---------- WhatsApp : retour en stock (réservé à la gérante) ---------- */
app.post('/api/notify/restock', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
  const { product, contacts } = req.body || {};
  if (!product?.name || !product?.slug || !Array.isArray(contacts))
    return res.status(400).json({ error: 'Requête invalide' });
  const phones = [...new Set(contacts.map(wa.toE164).filter(Boolean))].slice(0, 50);
  const results = await Promise.all(phones.map(p => wa.sendWhatsApp(p, wa.buildRestockMessage(product))));
  res.json({ sent: results.filter(r => r.ok).length, total: phones.length });
});

/* ---------- Statut WhatsApp : vitrine du jour ---------- */
app.get('/api/showcase', (_req, res) => res.json({ items: store.getShowcase() }));
app.post('/api/showcase', (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
  const { slug, action } = req.body || {};
  if (!store.validSlug(slug)) return res.status(400).json({ error: 'Produit invalide' });
  if (action === 'remove') store.removeFromShowcase(slug);
  else store.addToShowcase(slug);
  res.json({ items: store.getShowcase() });
});

/* ---------- Statut WhatsApp : compteurs de visites ---------- */
app.post('/api/track', (req, res) => {
  const { slug, source } = req.body || {};
  if (!store.validSlug(slug)) return res.status(400).end();
  // Une visite comptée par personne et par pièce toutes les 30 minutes
  if (limit(`visit:${req.ip}:${slug}`, 1, 30 * 60e3)) store.recordVisit(slug, source);
  res.status(204).end();
});
app.get('/api/stats', (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
  res.json({ visits: store.getVisits() });
});

/* ---------- Notes vocales des produits ---------- */
app.get('/api/voice', (_req, res) => res.json({ slugs: store.listVoices() }));
app.get('/api/voice/:slug', (req, res) => {
  const v = store.validSlug(req.params.slug) && store.findVoice(req.params.slug);
  if (!v) return res.status(404).end();
  res.type(v.type).sendFile(v.path, { maxAge: '5m' });
});
app.put('/api/voice/:slug', express.raw({ type: 'audio/*', limit: '4mb' }), (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
  if (!store.validSlug(req.params.slug) || !Buffer.isBuffer(req.body) || req.body.length < 500)
    return res.status(400).json({ error: 'Enregistrement invalide' });
  if (!store.saveVoice(req.params.slug, req.get('content-type'), req.body))
    return res.status(415).json({ error: 'Format audio non pris en charge' });
  res.json({ ok: true });
});
app.delete('/api/voice/:slug', (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
  if (store.validSlug(req.params.slug)) store.deleteVoice(req.params.slug);
  res.json({ ok: true });
});

/* ---------- Comptes clientes (numéro de téléphone + code WhatsApp) ---------- */
registerAuthRoutes(app, { limit, wa, store, isAdmin });

/* ---------- Commandes, livraison et suivi GPS du livreur ---------- */
registerOrderRoutes(app, { limit, wa, store, isAdmin, validOrder });

/* ---------- Catalogue partagé, avis et alertes de retour en stock ---------- */
registerCatalogRoutes(app, { limit, isAdmin, store });

/* ---------- Étiquettes d'authenticité (anti-contrefaçon) ---------- */
registerAuthenticityRoutes(app, { limit, isAdmin, store });

/* ---------- Vidéos des pièces (envoyées depuis l'espace gérant) ---------- */
registerMediaRoutes(app, { limit, isAdmin, dataDir: store.DATA_DIR });

/* ---------- Demandes WhatsApp (vérification chez le fournisseur avant confirmation) ---------- */
const { registerRequestRoutes } = await import('./requests.js');
registerRequestRoutes(app, { limit, isAdmin, store });

/* ---------- Le Marché (dropshipping) ---------- */
registerMarketRoutes(app, { limit, isAdmin, store, wa });

/* ---------- Site compilé (production) : robots.txt, sitemap.xml, fichiers, puis pages avec leurs balises de partage ---------- */
const dist = path.join(here, '..', 'dist');
const sendPage = registerSeoRoutes(app, { store, dist });
registerBrandSecurityRoutes(app, { isAdmin, dist });
// Fichiers au nom versionné (assets/…-hash.js) : gardés un an par le navigateur
app.use('/assets', express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y' }), (_req, res) =>
  res.status(404).end(),
);
app.use('/fonts', express.static(path.join(dist, 'fonts'), { immutable: true, maxAge: '30d' }));
app.use(express.static(dist, { index: false, maxAge: '1h' }));
app.get(/^(?!\/api\/).*/, sendPage);

const PORT = Number(process.env.PORT) || 8787;
app.listen(PORT, () => {
  console.log(`Maefa Store — serveur sur http://localhost:${PORT}`);
  console.log(
    `  Assistant IA : ${assistantEnabled() ? 'activé' : 'désactivé (ANTHROPIC_API_KEY manquante → mode hors ligne côté site)'}`,
  );
  console.log(`  WhatsApp     : ${wa.whatsappEnabled() ? 'activé' : 'simulé (identifiants Twilio manquants)'}`);
  console.log(`  Données      : ${store.STORAGE === 'postgresql' ? 'PostgreSQL (ORM Drizzle)' : 'fichier JSON'}`);
});

// Arrêt demandé (mise à jour ou redémarrage sur Render) : dernières données écrites avant de quitter
for (const sig of ['SIGTERM', 'SIGINT'])
  process.once(sig, async () => {
    await store.flush().catch(e => console.error('Sauvegarde :', e.message));
    process.exit(0);
  });
