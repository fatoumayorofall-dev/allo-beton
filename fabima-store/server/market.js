// ============================================================
//  LE MARCHÉ FABIMA — DROPSHIPPING
//  - la gérante ajoute n'importe quel produit d'un fournisseur (AliExpress, Alibaba,
//    CJ Dropshipping, boutique en ligne, grossiste…) avec son coût et sa marge
//  - les clientes voient le produit, son prix en FCFA et le délai de livraison
//  - à la commande, la gérante commande chez le fournisseur et suit l'envoi
//    (commandée → en route → arrivée à Dakar), la cliente est prévenue à chaque étape
// ============================================================
import crypto from 'node:crypto';
import net from 'node:net';

const CURRENCIES = new Set(['XOF', 'EUR', 'USD', 'CNY']);
export const SUPPLIER_STATUSES = ['a_commander', 'commandee', 'expediee', 'arrivee'];

const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const num = (v, min = 0, max = 1e9) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : undefined; };
const slugify = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'produit';
const isMarketId = id => typeof id === 'string' && id.startsWith('MK-');

/** Vue publique : jamais le fournisseur, son lien ni le coût d'achat. */
export function publicMarketProduct(p) {
  const { supplier: _s, ...rest } = p;
  return rest;
}

function cleanProduct(b, existing, store) {
  const name = clip(b.name, 120);
  if (!name) return { error: 'Nom du produit requis' };
  const price = num(b.price, 0, 50_000_000);
  if (!price) return { error: 'Prix de vente requis' };
  const images = (Array.isArray(b.images) ? b.images : []).map(u => clip(u, 600)).filter(u => /^https?:\/\//.test(u)).slice(0, 8);
  if (!images.length) return { error: 'Au moins une photo (lien https) est requise' };
  const options = (Array.isArray(b.options) ? b.options : []).slice(0, 3).map(o => ({
    name: clip(o?.name, 30),
    values: (Array.isArray(o?.values) ? o.values : []).map(v => clip(v, 40)).filter(Boolean).slice(0, 30),
  })).filter(o => o.name && o.values.length);
  const delayMin = Math.round(num(b.delayMin, 1, 120) ?? 10);
  const delayMax = Math.max(delayMin, Math.round(num(b.delayMax, 1, 180) ?? 20));
  const s = b.supplier || {};
  const supplier = {
    name: clip(s.name, 60),
    url: /^https?:\/\//.test(s.url || '') ? clip(s.url, 800) : '',
    cost: num(s.cost, 0, 1e9) ?? 0,
    currency: CURRENCIES.has(s.currency) ? s.currency : 'XOF',
    shipping: num(s.shipping, 0, 1e9) ?? 0,
    note: clip(s.note, 300),
  };
  // Adresse lisible unique
  let slug = existing?.slug || slugify(name);
  const clash = store.findMarketProductBySlug(slug);
  if (!existing && clash) slug = `${slug}-${crypto.randomBytes(2).toString('hex')}`;
  const now = new Date().toISOString();
  return {
    product: {
      id: existing?.id || `MK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      slug,
      name,
      description: clip(b.description, 2000),
      category: clip(b.category, 40) || 'Divers',
      images,
      price: Math.round(price),
      oldPrice: num(b.oldPrice, 0, 50_000_000) > price ? Math.round(b.oldPrice) : undefined,
      options,
      delayMin, delayMax,
      active: b.active !== false,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      supplier,
    },
  };
}

/* ---------- Import depuis un lien fournisseur (titre, photos, prix lus dans la page) ---------- */

/** Refuse les adresses internes (le serveur ne doit pas servir de relais vers le réseau local). */
function publicHost(hostname) {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return false;
  if (net.isIP(h)) {
    return !(/^(10|127|0)\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || /^169\.254\./.test(h) || h === '::1' || /^f[cd]/i.test(h) || /^fe80/i.test(h));
  }
  return true;
}

const decode = s => String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).trim();

function metaAll(html, key) {
  const out = [];
  const re = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${key}["'][^>]*>`, 'gi');
  for (const tag of html.match(re) || []) {
    const m = tag.match(/content=["']([^"']*)["']/i);
    if (m) out.push(decode(m[1]));
  }
  return out;
}

/** Cherche un objet « Product » dans les données structurées JSON-LD de la page. */
function jsonLdProduct(html) {
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1].trim());
      const stack = Array.isArray(data) ? [...data] : [data];
      while (stack.length) {
        const n = stack.shift();
        if (!n || typeof n !== 'object') continue;
        if (Array.isArray(n['@graph'])) stack.push(...n['@graph']);
        const type = [].concat(n['@type'] || []);
        if (type.includes('Product')) return n;
      }
    } catch { /* bloc JSON-LD invalide : ignoré */ }
  }
  return null;
}

export function parseProductPage(html, url) {
  const ld = jsonLdProduct(html);
  const offer = ld && [].concat(ld.offers || [])[0];
  const title = decode(ld?.name) || metaAll(html, 'og:title')[0] || decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]);
  const description = decode(ld?.description) || metaAll(html, 'og:description')[0] || metaAll(html, 'description')[0] || '';
  const ldImages = [].concat(ld?.image || []).map(i => (typeof i === 'string' ? i : i?.url)).filter(Boolean);
  const images = [...new Set([...ldImages, ...metaAll(html, 'og:image'), ...metaAll(html, 'og:image:secure_url')])]
    .map(u => { try { return new URL(u, url).href; } catch { return ''; } })
    .filter(u => u.startsWith('https://') || u.startsWith('http://')).slice(0, 8);
  const priceRaw = offer?.price ?? offer?.lowPrice ?? metaAll(html, 'product:price:amount')[0] ?? metaAll(html, 'og:price:amount')[0];
  const currency = (offer?.priceCurrency || metaAll(html, 'product:price:currency')[0] || metaAll(html, 'og:price:currency')[0] || '').toUpperCase();
  const price = priceRaw != null ? Number(String(priceRaw).replace(/[^\d.,]/g, '').replace(',', '.')) : undefined;
  const siteName = metaAll(html, 'og:site_name')[0] || new URL(url).hostname.replace(/^www\./, '');
  return {
    name: (title || '').slice(0, 120),
    description: description.slice(0, 1200),
    images,
    cost: Number.isFinite(price) ? price : undefined,
    currency: CURRENCIES.has(currency) ? currency : undefined,
    supplierName: siteName.slice(0, 60),
  };
}

async function importFromUrl(raw) {
  let url;
  try { url = new URL(String(raw || '').trim()); } catch { return { error: 'Lien invalide' }; }
  if (!/^https?:$/.test(url.protocol) || !publicHost(url.hostname)) return { error: 'Lien non autorisé' };
  const res = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(9000),
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FabimaStore/1.0)', 'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8' },
  });
  if (!res.ok) return { error: `Le site du fournisseur a répondu ${res.status}` };
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let html = '', size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    html += decoder.decode(value, { stream: true });
    if (size > 2_500_000) { reader.cancel(); break; }
  }
  const draft = parseProductPage(html, res.url || url.href);
  if (!draft.name && !draft.images.length) return { error: 'Informations introuvables sur cette page : remplissez la fiche à la main.' };
  return { draft: { ...draft, url: url.href } };
}

export function registerMarketRoutes(app, { limit, isAdmin, store, wa }) {
  /* Public : catalogue du Marché */
  app.get('/api/marche', (_req, res) => {
    const s = store.getMarketSettings();
    res.json({ products: store.listMarketProducts().filter(p => p.active).map(publicMarketProduct), delay: { min: s.delayMin, max: s.delayMax } });
  });

  /* Vérification avant paiement : produits encore en ligne, prix à jour, paiement accepté */
  app.post('/api/marche/check', (req, res) => {
    const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 50) : [];
    const r = checkMarketItems({ items, paymentMethod: req.body?.paymentMethod }, store);
    if (r.error) return res.status(409).json({ error: r.error });
    res.json({ ok: true });
  });

  /* Gérante */
  app.get('/api/admin/marche', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    res.json({ products: store.listMarketProducts(), settings: store.getMarketSettings() });
  });

  app.put('/api/admin/marche/settings', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    const b = req.body || {};
    const cur = store.getMarketSettings();
    const rates = { ...cur.rates };
    for (const c of ['EUR', 'USD', 'CNY']) { const v = num(b.rates?.[c], 0.01, 100000); if (v) rates[c] = v; }
    const delayMin = Math.round(num(b.delayMin, 1, 120) ?? cur.delayMin);
    res.json({
      settings: store.saveMarketSettings({
        margin: num(b.margin, 0, 1000) ?? cur.margin,
        roundTo: [1, 5, 10, 25, 50, 100, 250, 500, 1000].includes(Number(b.roundTo)) ? Number(b.roundTo) : cur.roundTo,
        rates, delayMin, delayMax: Math.max(delayMin, Math.round(num(b.delayMax, 1, 180) ?? cur.delayMax)),
      }),
    });
  });

  app.post('/api/admin/marche/products', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    const existing = req.body?.id ? store.getMarketProduct(req.body.id) : null;
    if (req.body?.id && !existing) return res.status(404).json({ error: 'Produit introuvable' });
    if (!existing && store.listMarketProducts().length >= 2000) return res.status(409).json({ error: 'Nombre maximal de produits atteint' });
    const r = cleanProduct(req.body || {}, existing, store);
    if (r.error) return res.status(400).json({ error: r.error });
    res.status(existing ? 200 : 201).json({ product: store.saveMarketProduct(r.product) });
  });

  app.delete('/api/admin/marche/products/:id', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    store.deleteMarketProduct(req.params.id);
    res.status(204).end();
  });

  app.post('/api/admin/marche/import', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    if (!limit(`import:${req.ip}`, 30, 10 * 60e3)) return res.status(429).json({ error: 'Trop d\'imports, patientez quelques minutes' });
    try {
      const r = await importFromUrl(req.body?.url);
      if (r.error) return res.status(422).json({ error: r.error });
      res.json(r);
    } catch (err) {
      console.error('Import fournisseur :', err.message);
      res.status(502).json({ error: 'Le site du fournisseur ne répond pas. Remplissez la fiche à la main.' });
    }
  });

  /* Suivi de la commande chez le fournisseur */
  app.patch('/api/admin/orders/:id/supplier', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    const order = store.getShopOrder(req.params.id);
    if (!order?.supplier) return res.status(404).json({ error: 'Commande sans article du Marché' });
    const b = req.body || {};
    const sup = order.supplier;
    if (b.ref !== undefined) sup.ref = clip(b.ref, 80);
    if (b.tracking !== undefined) sup.tracking = clip(b.tracking, 80);
    if (b.trackingUrl !== undefined) sup.trackingUrl = /^https?:\/\//.test(b.trackingUrl || '') ? clip(b.trackingUrl, 500) : '';
    if (b.cost !== undefined) sup.cost = num(b.cost, 0, 1e10) ?? sup.cost;
    let sent = null;
    if (b.status !== undefined && b.status !== sup.status) {
      if (!SUPPLIER_STATUSES.includes(b.status)) return res.status(400).json({ error: 'Étape invalide' });
      sup.status = b.status;
      sup.history = [...(sup.history || []), { status: b.status, date: new Date().toISOString() }];
      const text = wa.buildSupplierMessage(order, b.status);
      if (text && b.notify !== false) {
        sent = await wa.sendWhatsApp(order.customer.phone, text);
        if (!sent.simulated) order.notifications = [...(order.notifications || []), { date: new Date().toISOString(), event: 'expediee', to: 'cliente', channel: sent.ok ? 'auto' : 'echec' }];
      }
    }
    store.saveShopOrder(order);
    res.json({ order, sent });
  });
}

/**
 * Vérifie les articles du Marché d'une commande (prix à jour, produit en ligne) et prépare
 * le suivi fournisseur. Renvoie { error } ou { supplier } (null si aucun article du Marché).
 */
export function checkMarketItems(order, store) {
  const items = order.items.filter(i => isMarketId(i.productId));
  if (!items.length) return { supplier: null };
  for (const it of items) {
    const p = store.getMarketProduct(it.productId);
    if (!p || !p.active) return { error: `« ${it.name} » n'est plus disponible au Marché` };
    if (Math.round(it.price) !== p.price) return { error: `Le prix de « ${p.name} » a changé : rechargez la page` };
  }
  if (order.paymentMethod === 'cash') return { error: 'Les articles du Marché se règlent à la commande (Wave, Orange Money, Free Money ou carte)' };
  // Ce qu'il faut commander chez chaque fournisseur, avec le coût estimé en FCFA
  const { rates } = store.getMarketSettings();
  const toXof = (v, cur) => (cur === 'XOF' ? v : v * (rates[cur] || 0));
  const lines = items.map(it => {
    const s = store.getMarketProduct(it.productId).supplier || {};
    const unitCost = Math.round(toXof((s.cost || 0) + (s.shipping || 0), s.currency || 'XOF'));
    return { productId: it.productId, name: it.name, variant: it.color || '', quantity: it.quantity, supplierName: s.name || '', supplierUrl: s.url || '', unitCost };
  });
  const now = new Date().toISOString();
  return { supplier: {
    status: 'a_commander', history: [{ status: 'a_commander', date: now }], ref: '', tracking: '', trackingUrl: '',
    lines, cost: lines.reduce((sum, l) => sum + l.unitCost * l.quantity, 0),
  } };
}
