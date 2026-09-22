// ============================================================
//  SERVEUR FABIMA STORE
//  - /api/chat      : assistant IA (Claude), réponse diffusée en direct (SSE)
//  - /api/notify/*  : notifications WhatsApp (nouvelle commande, statut, retour en stock)
//  - /api/orders, /api/driver/*, /api/geo/* : commandes, livreur suivi en direct, carte
//  - sert aussi le site compilé (dist/) en production
// ============================================================
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
try { process.loadEnvFile(path.join(here, '.env')); } catch { /* pas de fichier .env : variables d'environnement du système */ }

const { assistantEnabled, sanitizeMessages, streamAssistant, Anthropic } = await import('./assistant.js');
const wa = await import('./whatsapp.js');
const store = await import('./store.js');
const { registerAuthRoutes } = await import('./auth.js');
const { registerOrderRoutes } = await import('./orders.js');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '300kb' }));

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
const isAdmin = req => !!ADMIN_PIN && req.get('x-admin-pin') === ADMIN_PIN;

/** Validation minimale d'une commande reçue du navigateur. */
function validOrder(o) {
  return o && typeof o.id === 'string' && /^FB-[A-Z0-9]{4,12}$/.test(o.id)
    && o.customer && typeof o.customer.firstName === 'string' && wa.toE164(o.customer.phone)
    && Array.isArray(o.items) && o.items.length > 0 && o.items.length <= 50 && Number.isFinite(o.total);
}

/* ---------- État des services ---------- */
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, storage: true, accounts: true, orders: true, maps: true, assistant: assistantEnabled(), whatsapp: wa.whatsappEnabled(), ownerNotifications: wa.whatsappEnabled() && wa.ownerConfigured(), adminApi: !!ADMIN_PIN });
});

/* ---------- Assistant IA ---------- */
app.post('/api/chat', async (req, res) => {
  if (!assistantEnabled()) return res.status(503).json({ error: 'assistant_disabled' });
  if (!limit(`chat:${req.ip}`, 40, 10 * 60e3)) return res.status(429).json({ error: 'Trop de messages, réessayez dans quelques minutes.' });
  const messages = sanitizeMessages(req.body?.messages);
  if (!messages) return res.status(400).json({ error: 'Conversation invalide' });

  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  const send = ev => res.write(`data: ${JSON.stringify(ev)}\n\n`);
  try {
    await streamAssistant({ messages, shop: req.body.shop, products: req.body.products, visitor: req.body.visitor }, send);
  } catch (err) {
    let message = 'L\'assistante est momentanément indisponible.';
    if (err instanceof Anthropic.RateLimitError) message = 'Beaucoup de demandes en ce moment, réessayez dans un instant.';
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
  if (!limit(`order-ip:${req.ip}`, 6, 3600e3) || !limit(`order-phone:${phone}`, 4, 3600e3) || !limit(`order-id:${order.id}`, 1, 24 * 3600e3)) {
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
  if (!product?.name || !product?.slug || !Array.isArray(contacts)) return res.status(400).json({ error: 'Requête invalide' });
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
  if (action === 'remove') store.removeFromShowcase(slug); else store.addToShowcase(slug);
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
  if (!store.validSlug(req.params.slug) || !Buffer.isBuffer(req.body) || req.body.length < 500) return res.status(400).json({ error: 'Enregistrement invalide' });
  if (!store.saveVoice(req.params.slug, req.get('content-type'), req.body)) return res.status(415).json({ error: 'Format audio non pris en charge' });
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

/* ---------- Site compilé (production) ---------- */
const dist = path.join(here, '..', 'dist');
app.use(express.static(dist, { index: false, maxAge: '1h' }));
app.get(/^(?!\/api\/).*/, (_req, res, next) => res.sendFile(path.join(dist, 'index.html'), err => err && next()));

const PORT = Number(process.env.PORT) || 8787;
app.listen(PORT, () => {
  console.log(`Fabima Store — serveur sur http://localhost:${PORT}`);
  console.log(`  Assistant IA : ${assistantEnabled() ? 'activé' : 'désactivé (ANTHROPIC_API_KEY manquante → mode hors ligne côté site)'}`);
  console.log(`  WhatsApp     : ${wa.whatsappEnabled() ? 'activé' : 'simulé (identifiants Twilio manquants)'}`);
});
