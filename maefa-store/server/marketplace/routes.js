// ============================================================
//  PLACE DE MARCHÉ — vendeurs indépendants, acheteurs, commissions
//  - toute personne avec un compte (numéro de téléphone) peut ouvrir sa boutique ;
//    la gérante la valide avant qu'elle n'apparaisse ;
//  - le vendeur publie ses articles (photos prises au téléphone) ; chaque article est vérifié
//    par la gérante (pas de contrefaçon, pas d'objet interdit), sauf pour les vendeurs de confiance ;
//  - l'acheteur commande chez un ou plusieurs vendeurs : une commande par vendeur, livraison
//    calculée selon la distance, paiement à la livraison ;
//  - la plateforme prend une commission sur chaque vente (vendeur), des frais de service
//    (acheteur) et une commission sur la course (livreur) ; la gérante suit ce qui lui est dû.
//  Les prix et les stocks viennent toujours du serveur : le navigateur ne fait que proposer.
// ============================================================
import crypto from 'node:crypto';
import express from 'express';
import { PHOTO_URL, sniffImage, storeMedia } from '../media.js';
import { commissions, deliveryFee, inSenegal, patchSettings, resolveSettings } from './pricing.js';

/** Rayons de la place de marché (les restaurants viendront avec la livraison rapide). */
export const MP_CATEGORIES = [
  { id: 'mode', name: 'Mode & chaussures' },
  { id: 'sacs', name: 'Sacs & accessoires' },
  { id: 'beaute', name: 'Beauté & bien-être' },
  { id: 'electronique', name: 'Téléphones & électronique' },
  { id: 'maison', name: 'Maison & cuisine' },
  { id: 'enfants', name: 'Enfants & bébé' },
  { id: 'epicerie', name: 'Épicerie & produits locaux' },
  { id: 'autres', name: 'Autres' },
];
const CATEGORY_IDS = new Set(MP_CATEGORIES.map(c => c.id));
const CONDITIONS = new Set(['neuf', 'occasion']);
export const ORDER_STATUSES = ['nouvelle', 'acceptee', 'prete', 'en_livraison', 'livree', 'refusee', 'annulee'];
const ACTIVE = new Set(['nouvelle', 'acceptee', 'prete', 'en_livraison']);
/** Ce que le vendeur peut faire à chaque étape */
const SELLER_MOVES = {
  nouvelle: ['acceptee', 'refusee'],
  acceptee: ['prete', 'annulee'],
  prete: ['en_livraison', 'annulee'],
  en_livraison: ['livree'],
};
const STATUS_TEXT = {
  acceptee: 'acceptée par le vendeur',
  prete: 'prête, elle part bientôt',
  en_livraison: 'en route vers vous',
  livree: 'livrée. Merci !',
  refusee: 'refusée par le vendeur',
  annulee: 'annulée',
};
const MAX_PHOTO_MB = 6;

const clip = (v, n) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');
const clipText = (v, n) => (typeof v === 'string' ? v.replace(/\r/g, '').trim().slice(0, n) : '');
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code = n => Array.from(crypto.randomBytes(n), b => ALPHABET[b % ALPHABET.length]).join('');
const slugify = s =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'boutique';
const fold = s => (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const now = () => new Date().toISOString();

/* ---------- Vues publiques : jamais le téléphone du vendeur ni de l'acheteur ---------- */
export const publicSeller = v => ({
  id: v.id,
  shopName: v.shopName,
  slug: v.slug,
  description: v.description,
  category: v.category,
  zone: v.zone,
  logo: v.logo ?? null,
  verified: v.status === 'active',
  since: v.createdAt,
});
const isVisible = (l, seller) => l.status === 'publiee' && seller?.status === 'active';
export const publicListing = (l, seller) => ({
  id: l.id,
  title: l.title,
  description: l.description,
  price: l.price,
  category: l.category,
  condition: l.condition,
  photos: l.photos,
  variantLabel: l.variantLabel || null,
  variants: l.variants ?? [],
  soldOut: l.stock !== null && l.stock !== undefined && l.stock <= 0,
  createdAt: l.publishedAt ?? l.createdAt,
  seller: seller ? publicSeller(seller) : null,
});

/** Contrôle d'un article envoyé par le vendeur. Renvoie { value } ou { error }. */
function cleanListing(b, existing) {
  const title = clip(b.title ?? existing?.title, 90);
  const description = clipText(b.description ?? existing?.description ?? '', 1500);
  const price = Math.round(Number(b.price ?? existing?.price));
  const category = b.category ?? existing?.category;
  const condition = b.condition ?? existing?.condition ?? 'neuf';
  const photos = Array.isArray(b.photos) ? b.photos : (existing?.photos ?? []);
  const stockRaw = b.stock !== undefined ? b.stock : existing?.stock;
  const stock = stockRaw === null || stockRaw === '' || stockRaw === undefined ? null : Math.round(Number(stockRaw));
  const variants = Array.isArray(b.variants)
    ? [...new Set(b.variants.map(v => clip(String(v ?? ''), 30)).filter(Boolean))].slice(0, 20)
    : (existing?.variants ?? []);
  const variantLabel = clip(b.variantLabel ?? existing?.variantLabel ?? '', 20);
  if (title.length < 3) return { error: "Donnez un titre à l'article (3 lettres au moins)" };
  if (!Number.isFinite(price) || price < 100 || price > 50_000_000) return { error: 'Prix invalide (100 F au moins)' };
  if (!CATEGORY_IDS.has(category)) return { error: 'Choisissez un rayon' };
  if (!CONDITIONS.has(condition)) return { error: 'État invalide' };
  if (!photos.length) return { error: 'Ajoutez au moins une photo' };
  if (photos.length > 6 || photos.some(u => typeof u !== 'string' || !PHOTO_URL.test(u)))
    return { error: 'Photos invalides (6 au maximum)' };
  if (stock !== null && (!Number.isInteger(stock) || stock < 0 || stock > 100_000))
    return { error: 'Quantité en stock invalide' };
  if (variants.length && !variantLabel) return { error: 'Précisez le choix proposé (ex. : Taille, Couleur)' };
  return { value: { title, description, price, category, condition, photos, stock, variants, variantLabel } };
}

export function registerMarketplaceRoutes(app, { limit, isAdmin, store, currentUser, wa, dataDir }) {
  const settings = () => resolveSettings(store.getMpSettings());
  const notify = (phone, text) => {
    if (phone) wa.sendWhatsApp(phone, text).catch(() => {});
  };
  const site = req => `${req.protocol}://${req.get('host')}`;
  const tooMany = (req, res, key, max, windowMs) => {
    if (limit(key, max, windowMs)) return false;
    res.status(429).json({ error: 'Trop de demandes, réessayez dans un moment.' });
    return true;
  };
  /** Vendeur connecté (sa boutique) ou réponse d'erreur. */
  const sellerOf = (req, res) => {
    const user = currentUser(req);
    if (!user) return void res.status(401).json({ error: 'Connectez-vous avec votre numéro' });
    const seller = store.findMpSellerByOwner(user.phone);
    if (!seller || seller.status === 'fermee')
      return void res.status(404).json({ error: "Vous n'avez pas encore de boutique" });
    return { user, seller };
  };
  const visibleListing = id => {
    const l = store.getMpListing(id);
    const seller = l && store.getMpSeller(l.sellerId);
    return l && isVisible(l, seller) ? { listing: l, seller } : null;
  };

  /* ==================== PUBLIC ==================== */

  app.get('/api/mp/config', (_req, res) => {
    const s = settings();
    res.json({ categories: MP_CATEGORIES, sellerRate: s.sellerRate, buyerFee: s.buyerFee, delivery: s.delivery });
  });

  app.get('/api/mp/listings', (req, res) => {
    const q = fold(clip(req.query.q, 60));
    const cat = clip(req.query.cat, 20);
    const sellerSlug = clip(req.query.vendeur, 60);
    const sort = clip(req.query.tri, 20);
    const page = Math.max(1, Math.min(200, Number(req.query.page) || 1));
    let list = store
      .listMpListings()
      .map(l => ({ l, s: store.getMpSeller(l.sellerId) }))
      .filter(({ l, s }) => isVisible(l, s));
    if (cat) list = list.filter(({ l }) => l.category === cat);
    if (sellerSlug) list = list.filter(({ s }) => s.slug === sellerSlug);
    if (q)
      list = list.filter(({ l, s }) =>
        q.split(/\s+/).every(w => fold(`${l.title} ${l.description} ${s.shopName}`).includes(w)),
      );
    const date = ({ l }) => l.publishedAt ?? l.createdAt;
    list.sort(
      sort === 'prix_asc'
        ? (a, b) => a.l.price - b.l.price
        : sort === 'prix_desc'
          ? (a, b) => b.l.price - a.l.price
          : (a, b) => (date(a) < date(b) ? 1 : -1),
    );
    const per = 24;
    res.json({
      total: list.length,
      page,
      listings: list.slice((page - 1) * per, page * per).map(({ l, s }) => publicListing(l, s)),
    });
  });

  app.get('/api/mp/listings/:id', (req, res) => {
    const found = visibleListing(clip(req.params.id, 20));
    if (!found) return res.status(404).json({ error: 'Article introuvable ou retiré' });
    if (limit(`mp-view:${req.ip}:${found.listing.id}`, 1, 3600e3)) store.countMpView(found.listing.id);
    const more = store
      .listMpListings()
      .filter(l => l.sellerId === found.seller.id && l.id !== found.listing.id && l.status === 'publiee')
      .slice(0, 8)
      .map(l => publicListing(l, null));
    res.json({ listing: publicListing(found.listing, found.seller), more });
  });

  app.get('/api/mp/sellers/:slug', (req, res) => {
    const seller = store.findMpSellerBySlug(clip(req.params.slug, 60));
    if (!seller || seller.status !== 'active') return res.status(404).json({ error: 'Boutique introuvable' });
    const listings = store
      .listMpListings()
      .filter(l => l.sellerId === seller.id && l.status === 'publiee')
      .map(l => publicListing(l, null));
    const sold = store.listMpOrders().filter(o => o.sellerId === seller.id && o.status === 'livree').length;
    res.json({ seller: { ...publicSeller(seller), sales: sold }, listings });
  });

  /**
   * Prépare une commande : vérifie chaque article (publié, en stock, choix valide), regroupe par
   * vendeur et calcule livraison, frais et commissions. Sert au devis et à la commande elle-même.
   */
  function prepare(items, to, buyerPhone) {
    if (!Array.isArray(items) || !items.length || items.length > 30) return { error: 'Panier vide ou trop grand' };
    if (!inSenegal(to)) return { error: 'Choisissez le point de livraison sur la carte' };
    const s = settings();
    const groups = new Map();
    const wanted = new Map(); // article → quantité demandée (tous choix confondus), pour le stock
    for (const it of items) {
      const found = visibleListing(clip(it?.listingId, 20));
      if (!found) return { error: "Un article n'est plus disponible : retirez-le du panier" };
      const { listing, seller } = found;
      if (buyerPhone && seller.ownerPhone === buyerPhone)
        return { error: 'Vous ne pouvez pas commander dans votre propre boutique' };
      const qty = Math.round(Number(it.qty));
      if (!Number.isInteger(qty) || qty < 1 || qty > 20) return { error: 'Quantité invalide' };
      const variant = clip(it.variant, 30) || null;
      if (listing.variants?.length && !listing.variants.includes(variant))
        return { error: `Choisissez : ${listing.variantLabel} (« ${listing.title} »)` };
      wanted.set(listing.id, (wanted.get(listing.id) ?? 0) + qty);
      if (listing.stock !== null && listing.stock !== undefined && wanted.get(listing.id) > listing.stock)
        return {
          error:
            listing.stock > 0
              ? `Plus que ${listing.stock} « ${listing.title} » disponible(s)`
              : `« ${listing.title} » est épuisé`,
        };
      const g = groups.get(seller.id) ?? { seller, lines: [] };
      g.lines.push({
        listingId: listing.id,
        title: listing.title,
        photo: listing.photos[0],
        price: listing.price,
        qty,
        variant,
        variantLabel: listing.variantLabel || null,
      });
      groups.set(seller.id, g);
    }
    const orders = [...groups.values()].map(({ seller, lines }) => {
      const subtotal = lines.reduce((t, l) => t + l.price * l.qty, 0);
      const { km, fee } = deliveryFee(seller.location, to, s);
      const c = commissions({ subtotal, deliveryFee: fee }, s);
      return {
        seller,
        lines,
        subtotal,
        delivery: { km, fee },
        buyerFee: c.buyer,
        total: subtotal + fee + c.buyer,
        commissions: c,
      };
    });
    return { orders, wanted };
  }
  const quoteView = o => ({
    seller: publicSeller(o.seller),
    lines: o.lines,
    subtotal: o.subtotal,
    delivery: o.delivery,
    buyerFee: o.buyerFee,
    total: o.total,
  });

  app.post('/api/mp/quote', (req, res) => {
    if (tooMany(req, res, `mp-quote:${req.ip}`, 300, 10 * 60e3)) return;
    const user = currentUser(req);
    const r = prepare(req.body?.items, req.body?.to, user?.phone);
    if (r.error) return res.status(400).json({ error: r.error });
    res.json({ orders: r.orders.map(quoteView), total: r.orders.reduce((t, o) => t + o.total, 0) });
  });

  /* ==================== ACHETEUR ==================== */

  app.post('/api/mp/orders', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Connectez-vous avec votre numéro pour commander' });
    if (tooMany(req, res, `mp-order:${user.phone}`, 20, 3600e3)) return;
    const b = req.body ?? {};
    const name = clip(b.name, 60) || [user.firstName, user.lastName].filter(Boolean).join(' ');
    if (name.length < 2) return res.status(400).json({ error: 'Indiquez votre prénom' });
    const to = b.to;
    const r = prepare(b.items, to, user.phone);
    if (r.error) return res.status(400).json({ error: r.error });
    const payment = ['especes', 'wave', 'orange_money'].includes(b.payment) ? b.payment : 'especes';
    const created = r.orders.map(o => {
      const order = store.saveMpOrder({
        id: `C-${code(6)}`,
        sellerId: o.seller.id,
        shopName: o.seller.shopName,
        buyerPhone: user.phone,
        buyer: { name, phone: user.phone },
        lines: o.lines,
        subtotal: o.subtotal,
        delivery: {
          ...o.delivery,
          from: { lat: o.seller.location.lat, lng: o.seller.location.lng, label: o.seller.location.label ?? '' },
          to: {
            lat: to.lat,
            lng: to.lng,
            label: clip(to.label, 200),
            landmark: clip(to.landmark, 160),
          },
        },
        buyerFee: o.buyerFee,
        total: o.total,
        payment,
        note: clip(b.note, 300),
        commissions: o.commissions,
        // Qui encaisse l'argent à la livraison (et doit donc les commissions à la plateforme)
        collector: 'vendeur',
        status: 'nouvelle',
        history: [{ status: 'nouvelle', at: now(), by: 'acheteur' }],
        createdAt: now(),
      });
      for (const line of o.lines) {
        const l = store.getMpListing(line.listingId);
        if (l.stock !== null && l.stock !== undefined) store.saveMpListing({ ...l, stock: l.stock - line.qty });
      }
      notify(
        o.seller.contactPhone ?? o.seller.ownerPhone,
        `🛍️ Nouvelle commande ${order.id} : ${o.lines.reduce((t, l) => t + l.qty, 0)} article(s), ${order.total.toLocaleString('fr-FR')} F.\nAcceptez-la ici : ${site(req)}/m/vendre`,
      );
      return order;
    });
    res.status(201).json({ orders: created.map(buyerView) });
  });

  /** Vue de l'acheteur : le téléphone du vendeur seulement une fois la commande acceptée. */
  function buyerView(o) {
    const seller = store.getMpSeller(o.sellerId);
    const accepted = ['acceptee', 'prete', 'en_livraison', 'livree'].includes(o.status);
    const { commissions: _c, collector: _k, ...rest } = o;
    return {
      ...rest,
      seller: seller ? publicSeller(seller) : null,
      sellerPhone: accepted ? (seller?.contactPhone ?? seller?.ownerPhone ?? null) : null,
    };
  }

  app.get('/api/mp/me/orders', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Non connectée' });
    res.json({
      orders: store
        .listMpOrders()
        .filter(o => o.buyerPhone === user.phone)
        .map(buyerView),
    });
  });

  /** Remet en stock les articles d'une commande refusée ou annulée. */
  function restock(order) {
    for (const line of order.lines) {
      const l = store.getMpListing(line.listingId);
      if (l && l.stock !== null && l.stock !== undefined) store.saveMpListing({ ...l, stock: l.stock + line.qty });
    }
  }
  function move(order, status, by, reason) {
    const saved = store.saveMpOrder({
      ...order,
      status,
      ...(reason ? { reason } : {}),
      history: [...(order.history ?? []), { status, at: now(), by }],
    });
    if (status === 'refusee' || status === 'annulee') restock(order);
    return saved;
  }

  app.post('/api/mp/me/orders/:id/cancel', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Non connectée' });
    const o = store.getMpOrder(clip(req.params.id, 20));
    if (!o || o.buyerPhone !== user.phone) return res.status(404).json({ error: 'Commande introuvable' });
    if (o.status !== 'nouvelle')
      return res.status(409).json({ error: 'Le vendeur a déjà accepté : contactez-le pour annuler' });
    const saved = move(o, 'annulee', 'acheteur', clip(req.body?.reason, 200));
    const seller = store.getMpSeller(o.sellerId);
    notify(seller?.contactPhone ?? seller?.ownerPhone, `Commande ${o.id} annulée par l'acheteur.`);
    res.json({ order: buyerView(saved) });
  });

  /* ==================== VENDEUR ==================== */

  /** Ce que la plateforme attend du vendeur : commissions des commandes livrées moins ce qu'il a déjà réglé. */
  function balanceOf(seller) {
    const delivered = store.listMpOrders().filter(o => o.sellerId === seller.id && o.status === 'livree');
    const due = delivered
      .filter(o => o.collector === 'vendeur')
      .reduce((t, o) => t + o.commissions.seller + o.commissions.buyer, 0);
    const paid = (seller.payments ?? []).reduce((t, p) => t + p.amount, 0);
    return {
      sales: delivered.reduce((t, o) => t + o.subtotal, 0),
      orders: delivered.length,
      due,
      paid,
      balance: due - paid,
      payments: seller.payments ?? [],
    };
  }
  const sellerView = v => ({
    ...publicSeller(v),
    status: v.status,
    trusted: !!v.trusted,
    location: v.location,
    contactPhone: v.contactPhone ?? v.ownerPhone,
  });

  app.get('/api/mp/me/seller', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Non connectée' });
    const seller = store.findMpSellerByOwner(user.phone);
    if (!seller || seller.status === 'fermee') return res.json({ seller: null });
    res.json({ seller: sellerView(seller), balance: balanceOf(seller), settings: settings() });
  });

  // Ouvrir sa boutique, ou modifier ses informations
  app.post('/api/mp/me/seller', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Connectez-vous avec votre numéro' });
    if (tooMany(req, res, `mp-seller:${user.phone}`, 30, 3600e3)) return;
    const b = req.body ?? {};
    const existing = store.findMpSellerByOwner(user.phone);
    if (existing?.status === 'suspendue')
      return res.status(423).json({ error: 'Boutique suspendue : contactez la plateforme' });
    const shopName = clip(b.shopName ?? existing?.shopName, 60);
    const description = clipText(b.description ?? existing?.description ?? '', 600);
    const category = b.category ?? existing?.category;
    const zone = clip(b.zone ?? existing?.zone, 60);
    const loc = b.location ?? existing?.location;
    if (shopName.length < 2) return res.status(400).json({ error: 'Donnez un nom à votre boutique' });
    if (!CATEGORY_IDS.has(category)) return res.status(400).json({ error: 'Choisissez votre rayon principal' });
    if (!inSenegal(loc))
      return res.status(400).json({ error: "Indiquez où se trouve la boutique (point d'enlèvement des colis)" });
    if (b.logo !== undefined && b.logo !== null && !PHOTO_URL.test(b.logo))
      return res.status(400).json({ error: 'Logo invalide' });
    const contact = b.contactPhone ? wa.toE164(b.contactPhone) : null;
    if (b.contactPhone && !/^\+221(7[05678])\d{7}$/.test(contact ?? ''))
      return res.status(400).json({ error: 'Numéro de contact invalide' });
    let slug = existing?.slug;
    if (!slug) {
      slug = slugify(shopName);
      while (store.findMpSellerBySlug(slug)) slug = `${slugify(shopName).slice(0, 44)}-${code(4).toLowerCase()}`;
    }
    const seller = store.saveMpSeller({
      ...(existing ?? {
        id: `V-${code(6)}`,
        ownerPhone: user.phone,
        status: 'en_attente',
        createdAt: now(),
        payments: [],
      }),
      ...(existing?.status === 'fermee' ? { status: 'en_attente' } : {}),
      shopName,
      slug,
      description,
      category,
      zone,
      location: {
        lat: Number(loc.lat),
        lng: Number(loc.lng),
        label: clip(loc.label, 200),
        landmark: clip(loc.landmark, 160),
      },
      logo: b.logo !== undefined ? b.logo : (existing?.logo ?? null),
      contactPhone: contact ?? existing?.contactPhone ?? null,
    });
    res.status(existing ? 200 : 201).json({ seller: sellerView(seller), balance: balanceOf(seller) });
  });

  // Photos des articles : envoyées une par une, déjà réduites par le téléphone
  app.post(
    '/api/mp/me/photos',
    express.raw({ type: () => true, limit: `${MAX_PHOTO_MB}mb` }),
    (req, res) => {
      const me = sellerOf(req, res);
      if (!me) return;
      if (tooMany(req, res, `mp-photo:${me.user.phone}`, 120, 3600e3)) return;
      const ext = sniffImage(req.body);
      if (!ext) return res.status(415).json({ error: 'Envoyez une photo (JPEG, PNG ou WebP)' });
      res.status(201).json({ url: storeMedia(dataDir, req.body, ext) });
    },
    (err, _req, res, next) => {
      if (err?.type === 'entity.too.large')
        return res.status(413).json({ error: `Photo trop lourde (${MAX_PHOTO_MB} Mo au maximum)` });
      next(err);
    },
  );

  const sellerListingView = l => ({ ...publicListing(l, null), status: l.status, stock: l.stock, reason: l.reason });

  app.get('/api/mp/me/listings', (req, res) => {
    const me = sellerOf(req, res);
    if (!me) return;
    res.json({
      listings: store
        .listMpListings()
        .filter(l => l.sellerId === me.seller.id && l.status !== 'retiree')
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .map(l => ({ ...sellerListingView(l), views: l.views ?? 0 })),
    });
  });

  app.post('/api/mp/me/listings', (req, res) => {
    const me = sellerOf(req, res);
    if (!me) return;
    if (me.seller.status === 'suspendue') return res.status(423).json({ error: 'Boutique suspendue' });
    if (tooMany(req, res, `mp-listing:${me.user.phone}`, 60, 3600e3)) return;
    const count = store.listMpListings().filter(l => l.sellerId === me.seller.id && l.status !== 'retiree').length;
    if (count >= 500) return res.status(409).json({ error: '500 articles au plus par boutique' });
    const r = cleanListing(req.body ?? {});
    if (r.error) return res.status(400).json({ error: r.error });
    const auto = me.seller.trusted && settings().autoPublishTrusted;
    const listing = store.saveMpListing({
      id: `A-${code(8)}`,
      sellerId: me.seller.id,
      ...r.value,
      status: auto ? 'publiee' : 'en_attente',
      ...(auto ? { publishedAt: now() } : {}),
      views: 0,
      createdAt: now(),
    });
    res.status(201).json({ listing: sellerListingView(listing) });
  });

  app.patch('/api/mp/me/listings/:id', (req, res) => {
    const me = sellerOf(req, res);
    if (!me) return;
    const l = store.getMpListing(clip(req.params.id, 20));
    if (!l || l.sellerId !== me.seller.id || l.status === 'retiree')
      return res.status(404).json({ error: 'Article introuvable' });
    const r = cleanListing(req.body ?? {}, l);
    if (r.error) return res.status(400).json({ error: r.error });
    // Titre, texte, photos ou rayon changés : nouvelle vérification (le prix et le stock, non)
    const content = ['title', 'description', 'photos', 'category', 'condition'].some(
      k => JSON.stringify(r.value[k]) !== JSON.stringify(l[k]),
    );
    const auto = me.seller.trusted && settings().autoPublishTrusted;
    const status = !content ? l.status : auto && l.status === 'publiee' ? 'publiee' : 'en_attente';
    const listing = store.saveMpListing({
      ...l,
      ...r.value,
      status,
      ...(status === 'en_attente' ? { reason: '' } : {}),
    });
    res.json({ listing: sellerListingView(listing) });
  });

  app.delete('/api/mp/me/listings/:id', (req, res) => {
    const me = sellerOf(req, res);
    if (!me) return;
    const l = store.getMpListing(clip(req.params.id, 20));
    if (!l || l.sellerId !== me.seller.id) return res.status(404).json({ error: 'Article introuvable' });
    store.saveMpListing({ ...l, status: 'retiree' });
    res.json({ ok: true });
  });

  const sellerOrderView = o => {
    const { commissions: c, ...rest } = o;
    return { ...rest, platformFee: c.seller, buyerFeeToPay: c.buyer };
  };

  app.get('/api/mp/me/sales', (req, res) => {
    const me = sellerOf(req, res);
    if (!me) return;
    res.json({
      orders: store
        .listMpOrders()
        .filter(o => o.sellerId === me.seller.id)
        .map(sellerOrderView),
      balance: balanceOf(me.seller),
    });
  });

  app.patch('/api/mp/me/sales/:id', (req, res) => {
    const me = sellerOf(req, res);
    if (!me) return;
    const o = store.getMpOrder(clip(req.params.id, 20));
    if (!o || o.sellerId !== me.seller.id) return res.status(404).json({ error: 'Commande introuvable' });
    const status = req.body?.status;
    if (!(SELLER_MOVES[o.status] ?? []).includes(status))
      return res.status(409).json({ error: 'Cette étape ne peut pas suivre la précédente' });
    const reason = clip(req.body?.reason, 200);
    if ((status === 'refusee' || status === 'annulee') && reason.length < 3)
      return res.status(400).json({ error: "Expliquez la raison à l'acheteur" });
    const saved = move(o, status, 'vendeur', reason);
    notify(
      o.buyerPhone,
      `Commande ${o.id} chez ${o.shopName} : ${STATUS_TEXT[status]}${reason ? ` (${reason})` : ''}\nSuivi : ${site(req)}/m/commandes`,
    );
    res.json({ order: sellerOrderView(saved), balance: balanceOf(me.seller) });
  });

  /* ==================== GÉRANTE ==================== */

  const guard = (req, res) => {
    if (isAdmin(req)) return true;
    res.status(403).json({ error: 'Accès gérante requis' });
    return false;
  };

  app.get('/api/admin/mp/overview', (req, res) => {
    if (!guard(req, res)) return;
    const orders = store.listMpOrders();
    const delivered = orders.filter(o => o.status === 'livree');
    const sellers = store.listMpSellers();
    res.json({
      sellers: Object.fromEntries(
        ['en_attente', 'active', 'suspendue', 'fermee'].map(s => [s, sellers.filter(v => v.status === s).length]),
      ),
      listingsPending: store.listMpListings().filter(l => l.status === 'en_attente').length,
      listingsPublished: store.listMpListings().filter(l => l.status === 'publiee').length,
      ordersActive: orders.filter(o => ACTIVE.has(o.status)).length,
      ordersDelivered: delivered.length,
      sales: delivered.reduce((t, o) => t + o.subtotal, 0),
      earned: delivered.reduce((t, o) => t + o.commissions.seller + o.commissions.buyer, 0),
      outstanding: sellers.reduce((t, v) => t + balanceOf(v).balance, 0),
      settings: settings(),
    });
  });

  app.get('/api/admin/mp/sellers', (req, res) => {
    if (!guard(req, res)) return;
    res.json({
      sellers: store
        .listMpSellers()
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .map(v => ({
          ...sellerView(v),
          ownerPhone: v.ownerPhone,
          listings: store.listMpListings().filter(l => l.sellerId === v.id && l.status === 'publiee').length,
          balance: balanceOf(v),
        })),
    });
  });

  app.patch('/api/admin/mp/sellers/:id', (req, res) => {
    if (!guard(req, res)) return;
    const v = store.getMpSeller(clip(req.params.id, 20));
    if (!v) return res.status(404).json({ error: 'Vendeur introuvable' });
    const { status, trusted } = req.body ?? {};
    if (status !== undefined && !['en_attente', 'active', 'suspendue'].includes(status))
      return res.status(400).json({ error: 'Statut invalide' });
    const saved = store.saveMpSeller({
      ...v,
      ...(status ? { status } : {}),
      ...(trusted !== undefined ? { trusted: !!trusted } : {}),
      ...(status === 'active' && !v.validatedAt ? { validatedAt: now() } : {}),
    });
    if (status === 'active' && v.status !== 'active')
      notify(
        v.contactPhone ?? v.ownerPhone,
        `✅ Votre boutique « ${v.shopName} » est validée ! Vos articles vérifiés sont visibles par tous : ${site(req)}/m/boutique/${v.slug}`,
      );
    res.json({ seller: sellerView(saved) });
  });

  // Paiement des commissions reçu du vendeur (Wave, Orange Money, espèces…)
  app.post('/api/admin/mp/sellers/:id/payments', (req, res) => {
    if (!guard(req, res)) return;
    const v = store.getMpSeller(clip(req.params.id, 20));
    if (!v) return res.status(404).json({ error: 'Vendeur introuvable' });
    const amount = Math.round(Number(req.body?.amount));
    if (!Number.isInteger(amount) || amount <= 0 || amount > 100_000_000)
      return res.status(400).json({ error: 'Montant invalide' });
    const payment = { id: code(6), amount, note: clip(req.body?.note, 120), at: now() };
    const saved = store.saveMpSeller({ ...v, payments: [...(v.payments ?? []), payment] });
    res.status(201).json({ payment, balance: balanceOf(saved) });
  });

  app.get('/api/admin/mp/listings', (req, res) => {
    if (!guard(req, res)) return;
    const status = clip(req.query.status, 20);
    res.json({
      listings: store
        .listMpListings()
        .filter(l => !status || l.status === status)
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
        .slice(0, 300)
        .map(l => {
          const v = store.getMpSeller(l.sellerId);
          return { ...sellerListingView(l), seller: v ? { ...publicSeller(v), status: v.status } : null };
        }),
    });
  });

  // Vérification d'un article : publié, ou refusé avec la raison (contrefaçon, photo floue…)
  app.patch('/api/admin/mp/listings/:id', (req, res) => {
    if (!guard(req, res)) return;
    const l = store.getMpListing(clip(req.params.id, 20));
    if (!l) return res.status(404).json({ error: 'Article introuvable' });
    const status = req.body?.status;
    if (!['publiee', 'refusee', 'retiree'].includes(status)) return res.status(400).json({ error: 'Statut invalide' });
    const reason = clip(req.body?.reason, 200);
    if (status === 'refusee' && reason.length < 3) return res.status(400).json({ error: 'Donnez la raison du refus' });
    const saved = store.saveMpListing({
      ...l,
      status,
      reason: status === 'refusee' ? reason : '',
      ...(status === 'publiee' && !l.publishedAt ? { publishedAt: now() } : {}),
    });
    const v = store.getMpSeller(l.sellerId);
    if (status === 'refusee')
      notify(
        v?.contactPhone ?? v?.ownerPhone,
        `Article « ${l.title} » refusé : ${reason}. Modifiez-le pour le renvoyer.`,
      );
    res.json({ listing: sellerListingView(saved) });
  });

  app.get('/api/admin/mp/orders', (req, res) => {
    if (!guard(req, res)) return;
    res.json({ orders: store.listMpOrders().slice(0, 500) });
  });

  app.patch('/api/admin/mp/settings', (req, res) => {
    if (!guard(req, res)) return;
    const r = patchSettings(store.getMpSettings(), req.body ?? {});
    if (r.error) return res.status(400).json({ error: r.error });
    store.saveMpSettings(r.settings);
    res.json({ settings: r.settings });
  });
}
