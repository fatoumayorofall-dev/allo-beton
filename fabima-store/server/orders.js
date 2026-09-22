// ============================================================
//  COMMANDES, LIVRAISON ET SUIVI GPS DU LIVREUR (façon Yango)
//  - la cliente commande avec un point sur la carte (plus d'adresse à expliquer)
//  - la gérante voit toutes les commandes et confie une livraison à un livreur
//  - le livreur reçoit un lien : il démarre la course, sa position est envoyée
//    toutes les quelques secondes ; la cliente le suit sur la carte
//  - WhatsApp : « en route », « il arrive », « livrée »
// ============================================================
import crypto from 'node:crypto';
import { distanceM, etaMinutes, reverseGeocode, searchPlaces, validPoint } from './geo.js';

const STATUSES = new Set(['en_attente', 'confirmee', 'en_preparation', 'expediee', 'livree', 'annulee']);
const NEAR_M = 400; // distance à laquelle la cliente est prévenue que le livreur arrive
const POSITION_FRESH_MS = 2 * 60e3;

const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const last9 = s => String(s || '').replace(/\D/g, '').slice(-9);
const num = v => (Number.isFinite(Number(v)) ? Number(v) : undefined);

/** Point de livraison envoyé par la carte : { lat, lng, label, accuracy, landmark }. */
function cleanLocation(l) {
  if (!l) return undefined;
  const p = { lat: Number(l.lat), lng: Number(l.lng) };
  if (!validPoint(p)) return undefined;
  return {
    lat: Math.round(p.lat * 1e6) / 1e6,
    lng: Math.round(p.lng * 1e6) / 1e6,
    label: clip(l.label, 200),
    accuracy: num(l.accuracy) !== undefined ? Math.round(Math.min(num(l.accuracy), 50_000)) : undefined,
    landmark: clip(l.landmark, 160) || undefined,
    source: l.source === 'gps' || l.source === 'recherche' || l.source === 'carte' ? l.source : undefined,
  };
}

/** Vue « livraison » partagée avec la cliente et le livreur (jamais le jeton du livreur). */
function publicDelivery(d, order) {
  if (!d) return null;
  const fresh = d.position && Date.now() - Date.parse(d.position.at) < POSITION_FRESH_MS;
  const dest = order.customer.location;
  const out = {
    driverName: d.driverName,
    driverPhone: d.driverPhone,
    state: d.deliveredAt ? 'livree' : d.startedAt ? 'en_route' : 'assignee',
    assignedAt: d.assignedAt,
    startedAt: d.startedAt ?? null,
    deliveredAt: d.deliveredAt ?? null,
    position: null,
    distanceM: null,
    etaMin: null,
  };
  if (d.startedAt && !d.deliveredAt && d.position) {
    out.position = { ...d.position, stale: !fresh };
    if (dest) {
      out.distanceM = Math.round(distanceM(d.position, dest));
      out.etaMin = etaMinutes(d.position, dest);
    }
  }
  return out;
}

export function registerOrderRoutes(app, { limit, wa, store, isAdmin, validOrder }) {
  const SITE_URL = process.env.SITE_URL || 'http://localhost:5174';

  /** Journalise un envoi WhatsApp dans la commande (visible par la gérante). */
  function logSend(order, event, to, result) {
    if (result?.simulated) return;
    order.notifications = [...(order.notifications ?? []), { date: new Date().toISOString(), event, to, channel: result?.ok ? 'auto' : 'echec' }];
  }

  function setStatus(order, status) {
    if (order.status === status) return false;
    order.status = status;
    order.history = [...(order.history ?? []), { status, date: new Date().toISOString() }];
    if (status === 'livree') order.paymentStatus = 'paye';
    return true;
  }

  /** Message de statut à la cliente ; « en route » devient le message avec le suivi en direct. */
  async function notifyCustomer(order, status) {
    if (status === 'en_attente') return null;
    const d = store.getDelivery(order.id);
    const r = status === 'expediee'
      ? await wa.sendWhatsApp(order.customer.phone, wa.buildOnTheWayMessage(order, d?.driverName))
      : await wa.notifyStatus(order, status);
    logSend(order, status, 'cliente', r);
    if (status === 'expediee' && d) store.saveDelivery(order.id, { onTheWayNotified: true });
    return r;
  }

  /* ---------- Cliente : passer commande ---------- */
  app.post('/api/orders', async (req, res) => {
    const o = req.body?.order;
    if (!validOrder(o)) return res.status(400).json({ error: 'Commande invalide' });
    if (JSON.stringify(o).length > 60_000) return res.status(413).json({ error: 'Commande trop volumineuse' });
    if (store.getShopOrder(o.id)) return res.status(409).json({ error: 'Commande déjà enregistrée' });
    const phone = wa.toE164(o.customer.phone);
    if (!limit(`order-ip:${req.ip}`, 6, 3600e3) || !limit(`order-phone:${phone}`, 4, 3600e3)) {
      return res.status(429).json({ error: 'Trop de commandes, réessayez plus tard.' });
    }
    const now = new Date().toISOString();
    const order = {
      ...o,
      customer: { ...o.customer, location: cleanLocation(o.customer.location) },
      createdAt: now,
      status: 'en_attente',
      history: [{ status: 'en_attente', date: now }],
      notifications: [],
    };
    const sent = await wa.notifyNewOrder(order);
    logSend(order, 'nouvelle', 'gerante', sent.owner);
    logSend(order, 'nouvelle', 'cliente', sent.customer);
    store.saveShopOrder(order);
    res.status(201).json({ order, ...sent });
  });

  /* ---------- Cliente : suivi (numéro de commande + téléphone) ---------- */
  app.get('/api/orders/lookup', (req, res) => {
    if (!limit(`lookup:${req.ip}`, 120, 10 * 60e3)) return res.status(429).json({ error: 'Trop de demandes' });
    const id = clip(req.query.id, 20).toUpperCase();
    const order = store.getShopOrder(id);
    if (!order || last9(order.customer.phone) !== last9(req.query.phone) || last9(req.query.phone).length < 9) {
      return res.status(404).json({ error: 'Commande introuvable' });
    }
    const { notifications: _n, ...rest } = order;
    res.json({ order: rest, delivery: publicDelivery(store.getDelivery(order.id), order) });
  });

  /* ---------- Gérante : toutes les commandes ---------- */
  app.get('/api/admin/orders', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    res.json({
      orders: store.listShopOrders().slice(0, 500).map(o => {
        const d = store.getDelivery(o.id);
        return { ...o, delivery: d ? { ...publicDelivery(d, o), driverLink: `${SITE_URL}/livreur/${d.driverToken}` } : null };
      }),
    });
  });

  app.patch('/api/admin/orders/:id', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    const order = store.getShopOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    const { status, paymentStatus } = req.body || {};
    let sent = null;
    if (status !== undefined) {
      if (!STATUSES.has(status)) return res.status(400).json({ error: 'Statut invalide' });
      if (setStatus(order, status) && req.body.notify !== false) sent = await notifyCustomer(order, status);
    }
    if (paymentStatus === 'paye' || paymentStatus === 'en_attente') order.paymentStatus = paymentStatus;
    store.saveShopOrder(order);
    res.json({ order, sent });
  });

  /* ---------- Gérante : confier la livraison à un livreur ---------- */
  app.post('/api/admin/orders/:id/driver', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    const order = store.getShopOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    const name = clip(req.body?.name, 40);
    const phone = wa.toE164(req.body?.phone);
    if (!name || !phone) return res.status(400).json({ error: 'Nom et téléphone du livreur requis' });
    // Nouveau lien à chaque attribution : l'ancien livreur n'a plus accès
    const driverToken = crypto.randomBytes(18).toString('base64url');
    const d = store.saveDelivery(order.id, {
      driverName: name, driverPhone: phone, driverToken, assignedAt: new Date().toISOString(),
      startedAt: null, deliveredAt: null, position: null, nearNotified: false, onTheWayNotified: false,
    });
    const driverLink = `${SITE_URL}/livreur/${driverToken}`;
    const sent = req.body?.send === false ? null : await wa.sendWhatsApp(phone, wa.buildDriverMessage(order, driverLink));
    res.json({ delivery: { ...publicDelivery(d, order), driverLink }, driverMessage: wa.buildDriverMessage(order, driverLink), sent });
  });

  /* ---------- Livreur (lien secret reçu par WhatsApp) ---------- */
  function driverContext(req, res) {
    const d = store.findDeliveryByToken(String(req.params.token || ''));
    const order = d && store.getShopOrder(d.orderId);
    if (!d || !order) { res.status(404).json({ error: 'Lien de livraison invalide ou remplacé' }); return null; }
    return { d, order };
  }
  const driverView = (d, order) => {
    const c = order.customer;
    return {
      order: {
        id: order.id, status: order.status, total: order.total, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus,
        items: order.items.reduce((s, i) => s + i.quantity, 0),
        customer: { firstName: c.firstName, lastName: c.lastName, phone: c.phone, zone: c.zone, address: c.address, notes: c.notes, location: c.location ?? null },
      },
      delivery: publicDelivery(d, order),
    };
  };

  app.get('/api/driver/:token', (req, res) => {
    const ctx = driverContext(req, res);
    if (ctx) res.json(driverView(ctx.d, ctx.order));
  });

  app.post('/api/driver/:token/start', async (req, res) => {
    const ctx = driverContext(req, res);
    if (!ctx) return;
    let { d, order } = ctx;
    if (d.deliveredAt) return res.status(409).json({ error: 'Livraison déjà terminée' });
    if (order.status === 'annulee') return res.status(409).json({ error: 'Commande annulée' });
    const patch = { startedAt: d.startedAt ?? new Date().toISOString() };
    const pos = cleanPosition(req.body);
    if (pos) patch.position = pos;
    d = store.saveDelivery(order.id, patch);
    // La cliente est prévenue une seule fois, avec le lien pour suivre le livreur
    setStatus(order, 'expediee');
    if (!d.onTheWayNotified) {
      await notifyCustomer(order, 'expediee');
      d = store.getDelivery(order.id);
    }
    store.saveShopOrder(order);
    res.json(driverView(d, order));
  });

  function cleanPosition(b) {
    const p = { lat: Number(b?.lat), lng: Number(b?.lng) };
    if (!validPoint(p)) return null;
    return {
      lat: Math.round(p.lat * 1e6) / 1e6, lng: Math.round(p.lng * 1e6) / 1e6,
      accuracy: num(b.accuracy) !== undefined ? Math.round(num(b.accuracy)) : null,
      heading: num(b.heading) ?? null,
      speed: num(b.speed) ?? null,
      at: new Date().toISOString(),
    };
  }

  app.post('/api/driver/:token/position', async (req, res) => {
    const ctx = driverContext(req, res);
    if (!ctx) return;
    if (!limit(`pos:${req.params.token}`, 60, 60e3)) return res.status(429).end();
    let { d, order } = ctx;
    if (!d.startedAt || d.deliveredAt) return res.status(409).json({ error: 'Course non démarrée' });
    const pos = cleanPosition(req.body);
    if (!pos) return res.status(400).json({ error: 'Position invalide' });
    d = store.saveDelivery(order.id, { position: pos });
    const dest = order.customer.location;
    const dist = dest ? distanceM(pos, dest) : null;
    if (dist !== null && dist < NEAR_M && !d.nearNotified) {
      store.saveDelivery(order.id, { nearNotified: true });
      logSend(order, 'expediee', 'cliente', await wa.sendWhatsApp(order.customer.phone, wa.buildArrivingMessage(order, etaMinutes(pos, dest))));
      store.saveShopOrder(order);
    }
    res.json({ distanceM: dist === null ? null : Math.round(dist), etaMin: dest ? etaMinutes(pos, dest) : null });
  });

  app.post('/api/driver/:token/delivered', async (req, res) => {
    const ctx = driverContext(req, res);
    if (!ctx) return;
    let { d, order } = ctx;
    if (!d.deliveredAt) {
      d = store.saveDelivery(order.id, { deliveredAt: new Date().toISOString() });
      if (setStatus(order, 'livree')) await notifyCustomer(order, 'livree');
      store.saveShopOrder(order);
    }
    res.json(driverView(d, order));
  });

  /* ---------- Carte : recherche d'adresse et adresse d'un point ---------- */
  app.get('/api/geo/search', async (req, res) => {
    if (!limit(`geo:${req.ip}`, 90, 60e3)) return res.status(429).json({ error: 'Trop de recherches' });
    const near = { lat: Number(req.query.lat), lng: Number(req.query.lng) };
    try {
      res.json({ results: await searchPlaces(req.query.q, validPoint(near) ? near : undefined) });
    } catch (err) {
      console.error('Recherche d\'adresse :', err.message);
      res.status(502).json({ error: 'Recherche indisponible', results: [] });
    }
  });

  app.get('/api/geo/reverse', async (req, res) => {
    if (!limit(`geo:${req.ip}`, 90, 60e3)) return res.status(429).json({ error: 'Trop de recherches' });
    const p = { lat: Number(req.query.lat), lng: Number(req.query.lng) };
    if (!validPoint(p)) return res.status(400).json({ error: 'Point invalide' });
    try {
      res.json(await reverseGeocode(p.lat, p.lng));
    } catch (err) {
      console.error('Adresse du point :', err.message);
      res.status(502).json({ error: 'Adresse indisponible' });
    }
  });
}
