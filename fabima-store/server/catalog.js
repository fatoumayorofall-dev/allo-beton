// ============================================================
//  CATALOGUE PARTAGÉ (chaussures, sacs…)
//  - la gérante modifie les produits depuis l'espace gérant : toutes les clientes
//    voient les mêmes pièces, prix et stocks
//  - le stock baisse à chaque commande (et remonte si elle est annulée)
//  - « sur commande » : une pièce épuisée reste commandable avec un délai
//  - avis clientes et alertes de retour en stock gardés par le serveur
// ============================================================
const CATEGORY_IDS = new Set(['chaussures', 'sacs', 'accessoires', 'bijoux', 'vetements']);
const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const int = (v, min, max, dflt = min) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt; };
const isMarketId = id => typeof id === 'string' && id.startsWith('MK-');
const strList = (a, n, len) => (Array.isArray(a) ? a.map(x => clip(x, len)).filter(Boolean).slice(0, n) : []);

/** Produit envoyé par l'espace gérant, nettoyé. Les avis restent ceux du serveur. */
export function cleanCatalogProduct(p, existing) {
  if (!p || typeof p !== 'object') return { error: 'Produit invalide' };
  const id = clip(p.id, 40);
  if (!/^[A-Za-z0-9_-]{2,40}$/.test(id) || isMarketId(id)) return { error: 'Identifiant invalide' };
  const name = clip(p.name, 120);
  if (!name) return { error: 'Nom requis' };
  if (!CATEGORY_IDS.has(p.category)) return { error: 'Catégorie invalide' };
  const price = int(p.price, 0, 50_000_000, 0);
  if (!price) return { error: 'Prix requis' };
  const product = {
    id,
    slug: clip(p.slug, 90).toLowerCase().replace(/[^a-z0-9-]/g, '-') || id.toLowerCase(),
    name,
    category: p.category,
    subcategory: clip(p.subcategory, 60),
    occasions: strList(p.occasions, 6, 20),
    material: clip(p.material, 300),
    care: clip(p.care, 400),
    styleTip: clip(p.styleTip, 400),
    price,
    oldPrice: Number(p.oldPrice) > price ? int(p.oldPrice, 0, 50_000_000) : undefined,
    images: strList(p.images, 8, 600).filter(u => /^(https?:)?\/\//.test(u) || u.startsWith('/')),
    colors: (Array.isArray(p.colors) ? p.colors : []).slice(0, 12).map(c => ({ name: clip(c?.name, 30), hex: /^#[0-9a-f]{3,8}$/i.test(c?.hex || '') ? c.hex : '#999999' })).filter(c => c.name),
    sizes: strList(p.sizes, 20, 12),
    stock: int(p.stock, 0, 100_000, 0),
    preorderDays: int(p.preorderDays, 0, 90, 0) || undefined,
    description: clip(p.description, 2000),
    details: strList(p.details, 12, 200),
    rating: existing ? existing.rating : Math.min(5, Math.max(0, Number(p.rating) || 0)),
    reviewCount: existing ? existing.reviewCount : int(p.reviewCount, 0, 100_000, 0),
    reviews: existing ? existing.reviews : (Array.isArray(p.reviews) ? p.reviews.slice(0, 50) : undefined),
    isNew: !!p.isNew || undefined,
    isBestseller: !!p.isBestseller || undefined,
    createdAt: clip(p.createdAt, 40) || new Date().toISOString(),
  };
  if (JSON.stringify(product).length > 40_000) return { error: 'Produit trop volumineux' };
  return { product };
}

/**
 * Vérifie les pièces de la boutique d'une commande : produit en ligne, prix à jour, stock suffisant
 * (ou vente « sur commande »). Renvoie { error } ou { preorder: Map<productId, jours> }.
 */
export function checkStock(order, store) {
  const catalog = store.getCatalog();
  const preorder = new Map();
  if (!catalog) return { preorder }; // catalogue pas encore publié : pas de contrôle (mode démo)
  const qty = new Map();
  for (const it of order.items) {
    if (isMarketId(it.productId)) continue;
    const p = catalog.find(x => x.id === it.productId);
    if (!p) return { error: `« ${it.name} » n'est plus disponible` };
    if (Math.round(it.price) !== p.price) return { error: `Le prix de « ${p.name} » a changé : rechargez la page` };
    qty.set(p.id, (qty.get(p.id) || 0) + (Number(it.quantity) || 0));
  }
  for (const [id, n] of qty) {
    const p = catalog.find(x => x.id === id);
    if (n <= p.stock) continue;
    if (p.preorderDays) { preorder.set(id, p.preorderDays); continue; }
    return { error: p.stock > 0 ? `Il ne reste que ${p.stock} « ${p.name} » en stock` : `« ${p.name} » vient d'être épuisé` };
  }
  if (preorder.size && order.paymentMethod === 'cash') return { error: 'Les pièces sur commande se règlent à la commande (Wave, Orange Money, Free Money ou carte)' };
  return { preorder };
}

/** Retire (direction -1) ou remet (+1) en stock les pièces d'une commande. */
export function applyStock(order, store, direction) {
  const catalog = store.getCatalog();
  if (!catalog) return;
  let changed = false;
  for (const it of order.items) {
    // Pièces du Marché et pièces « sur commande » : pas de stock à la boutique
    if (isMarketId(it.productId) || it.preorder) continue;
    const p = catalog.find(x => x.id === it.productId);
    if (!p) continue;
    p.stock = Math.max(0, p.stock + direction * (Number(it.quantity) || 0));
    changed = true;
  }
  if (changed) store.saveCatalog(catalog);
}

export function registerCatalogRoutes(app, { limit, isAdmin, store }) {
  app.get('/api/catalog', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ products: store.getCatalog(), updatedAt: store.getCatalogUpdatedAt() });
  });

  /* Gérante : publier tout le catalogue (première fois, ou « restaurer le catalogue ») */
  app.put('/api/admin/catalog', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    const list = Array.isArray(req.body?.products) ? req.body.products.slice(0, 1000) : null;
    if (!list) return res.status(400).json({ error: 'Liste de produits requise' });
    const old = store.getCatalog() || [];
    const out = [];
    for (const p of list) {
      const r = cleanCatalogProduct(p, old.find(x => x.id === p?.id));
      if (r.error) return res.status(400).json({ error: `${p?.name || p?.id || 'Produit'} : ${r.error}` });
      out.push(r.product);
    }
    res.json({ products: store.saveCatalog(out) });
  });

  app.put('/api/admin/catalog/products/:id', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    const catalog = store.getCatalog();
    if (!catalog) return res.status(409).json({ error: 'Catalogue pas encore publié' });
    const existing = catalog.find(p => p.id === req.params.id);
    const r = cleanCatalogProduct({ ...req.body, id: req.params.id }, existing);
    if (r.error) return res.status(400).json({ error: r.error });
    if (catalog.some(p => p.slug === r.product.slug && p.id !== r.product.id)) r.product.slug = `${r.product.slug}-${r.product.id.toLowerCase()}`;
    const next = existing ? catalog.map(p => (p.id === r.product.id ? r.product : p)) : [r.product, ...catalog];
    store.saveCatalog(next);
    res.json({ product: r.product });
  });

  app.delete('/api/admin/catalog/products/:id', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    const catalog = store.getCatalog();
    if (catalog) store.saveCatalog(catalog.filter(p => p.id !== req.params.id));
    res.status(204).end();
  });

  /* Avis clientes (publiés tout de suite, nombre limité par visiteuse) */
  app.post('/api/catalog/products/:id/reviews', (req, res) => {
    const catalog = store.getCatalog();
    const p = catalog?.find(x => x.id === req.params.id);
    if (!p) return res.status(404).json({ error: 'Produit introuvable' });
    if (!limit(`review:${req.ip}`, 5, 3600e3) || !limit(`review:${req.ip}:${p.id}`, 1, 24 * 3600e3)) return res.status(429).json({ error: 'Merci, votre avis est déjà enregistré' });
    const author = clip(req.body?.author, 40);
    const comment = clip(req.body?.comment, 600);
    const rating = int(req.body?.rating, 1, 5, 5);
    if (author.length < 2 || comment.length < 3) return res.status(400).json({ error: 'Prénom et avis requis' });
    const reviewCount = p.reviewCount + 1;
    p.rating = Math.round(((p.rating * p.reviewCount + rating) / reviewCount) * 10) / 10;
    p.reviewCount = reviewCount;
    p.reviews = [{ author, rating, comment, date: new Date().toISOString().slice(0, 10) }, ...(p.reviews || [])].slice(0, 50);
    store.saveCatalog(catalog);
    res.status(201).json({ product: p });
  });

  /* Alertes « prévenez-moi du retour en stock » */
  app.post('/api/stock-alerts', (req, res) => {
    const productId = clip(req.body?.productId, 40);
    const contact = clip(req.body?.contact, 80);
    if (!productId || contact.length < 6) return res.status(400).json({ error: 'Contact invalide' });
    if (!limit(`alert:${req.ip}`, 10, 3600e3)) return res.status(429).end();
    store.addStockAlert(productId, contact);
    res.status(201).json({ ok: true });
  });
  app.get('/api/admin/stock-alerts', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    res.json({ alerts: store.listStockAlerts() });
  });
  app.delete('/api/admin/stock-alerts/:productId', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    store.removeStockAlerts(req.params.productId);
    res.status(204).end();
  });

}
