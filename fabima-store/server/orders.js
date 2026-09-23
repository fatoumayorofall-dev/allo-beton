// ============================================================
//  COMMANDES, LIVRAISON ET SUIVI GPS DU LIVREUR (façon Yango)
//  - la cliente commande avec un point sur la carte (plus d'adresse à expliquer)
//  - la gérante voit toutes les commandes et confie une livraison à un livreur
//  - le livreur reçoit un lien : il démarre la course, sa position est envoyée
//    toutes les quelques secondes ; la cliente le suit sur la carte
//  - relais : plusieurs livreurs à la suite (moto → car longue distance → moto…),
//    chacun avec son lien ; la cliente suit le colis de main en main
//  - WhatsApp : « en route », passage de relais, « il arrive », « livrée »
// ============================================================
import crypto from 'node:crypto';
import { distanceM, etaMinutes, reverseGeocode, searchPlaces, validPoint } from './geo.js';
import { checkMarketItems } from './market.js';

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

const VEHICLES = new Set(['moto', 'voiture', 'car']);
const RELAY_NEAR_M = 1000; // le livreur suivant est prévenu quand le colis approche du point de relais
const MAX_LEGS = 6;

/** Étape en cours : la première non terminée (-1 si tout est livré). */
const currentIndex = legs => legs.findIndex(l => !l.doneAt);
const legState = l => (l.doneAt ? 'remis' : l.startedAt ? 'en_route' : 'attente');
/** Où va le livreur de cette étape : point de relais, ou la maison de la cliente pour la dernière étape. */
const legTarget = (leg, order) => (leg.to ? (Number.isFinite(leg.to.lat) ? leg.to : null) : order.customer.location ?? null);

/** Vue « livraison » partagée avec la cliente et les livreurs (jamais les liens secrets). */
function publicDelivery(d, order) {
  const legs = d?.legs ?? [];
  if (!legs.length) return null;
  const cur = currentIndex(legs);
  const i = cur === -1 ? legs.length - 1 : cur;
  const active = legs[i];
  const target = legTarget(active, order);
  const state = cur === -1 ? 'livree' : active.startedAt ? 'en_route' : 'assignee';
  const out = {
    driverName: active.driverName,
    driverPhone: active.driverPhone,
    vehicle: active.vehicle,
    state,
    assignedAt: active.assignedAt,
    startedAt: legs[0].startedAt ?? null,
    deliveredAt: cur === -1 ? active.doneAt : null,
    position: null,
    distanceM: null,
    etaMin: null,
    relay: legs.length > 1,
    current: i,
    final: !active.to,
    target: active.to ? { label: active.to.label, lat: active.to.lat, lng: active.to.lng } : null,
    legs: legs.map(l => ({ driverName: l.driverName, driverPhone: l.driverPhone, vehicle: l.vehicle, to: l.to ?? null, state: legState(l), startedAt: l.startedAt ?? null, doneAt: l.doneAt ?? null })),
  };
  if (state === 'en_route' && active.position) {
    out.position = { ...active.position, stale: Date.now() - Date.parse(active.position.at) >= POSITION_FRESH_MS };
    if (target) {
      out.distanceM = Math.round(distanceM(active.position, target));
      out.etaMin = etaMinutes(active.position, target, active.vehicle);
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
    const legs = d?.legs ?? [];
    const r = status === 'expediee'
      ? await wa.sendWhatsApp(order.customer.phone, wa.buildOnTheWayMessage(order, legs[0]?.driverName, legs))
      : await wa.notifyStatus(order, status);
    logSend(order, status, 'cliente', r);
    if (status === 'expediee' && legs.length) { legs[0].customerNotified = true; store.saveDelivery(order.id, d); }
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
    // Articles du Marché (dropshipping) : prix vérifiés et suivi fournisseur préparé
    const market = checkMarketItems(o, store);
    if (market.error) return res.status(409).json({ error: market.error });
    const now = new Date().toISOString();
    const order = {
      ...o,
      supplier: market.supplier ?? undefined,
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
    const { notifications: _n, supplier, ...rest } = order;
    // La cliente voit l'étape chez le fournisseur et le suivi, jamais le coût ni les liens fournisseurs
    if (supplier) rest.supplier = { status: supplier.status, history: supplier.history, tracking: supplier.tracking, trackingUrl: supplier.trackingUrl };
    res.json({ order: rest, delivery: publicDelivery(store.getDelivery(order.id), order) });
  });

  /* ---------- Gérante : toutes les commandes ---------- */
  app.get('/api/admin/orders', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    res.json({
      orders: store.listShopOrders().slice(0, 500).map(o => {
        const d = store.getDelivery(o.id);
        return { ...o, delivery: d ? adminDelivery(d, o) : null };
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

  const driverLink = leg => `${SITE_URL}/livreur/${leg.driverToken}`;
  const adminDelivery = (d, order) => {
    const pub = publicDelivery(d, order);
    if (!pub) return null;
    const legs = d.legs.map((l, k) => ({ ...pub.legs[k], driverLink: driverLink(l) }));
    return { ...pub, legs, driverLink: legs[pub.current].driverLink };
  };
  const driverMessage = (order, legs, k) => wa.buildDriverMessage(order, driverLink(legs[k]), { index: k, total: legs.length, leg: legs[k], prev: legs[k - 1], next: legs[k + 1] });

  /** Point de relais choisi par la gérante : un nom (obligatoire) et, si possible, un point sur la carte. */
  function cleanPlace(p) {
    const label = clip(p?.label, 120);
    if (!label) return null;
    const pt = { lat: Number(p.lat), lng: Number(p.lng) };
    return validPoint(pt) ? { label, lat: Math.round(pt.lat * 1e6) / 1e6, lng: Math.round(pt.lng * 1e6) / 1e6 } : { label };
  }

  /**
   * Plan de livraison : une étape (livraison directe) ou plusieurs (relais).
   * Les étapes déjà commencées ne changent pas ; chaque nouveau livreur reçoit son lien.
   */
  async function savePlan(req, res) {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    const order = store.getShopOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    if (order.status === 'annulee' || order.status === 'livree') return res.status(409).json({ error: 'Commande terminée' });
    const body = Array.isArray(req.body?.legs) ? req.body.legs : [req.body];
    if (!body.length || body.length > MAX_LEGS) return res.status(400).json({ error: `Entre 1 et ${MAX_LEGS} étapes` });
    const old = store.getDelivery(order.id)?.legs ?? [];
    const locked = old.filter(l => l.startedAt).length;
    if (body.length < locked) return res.status(409).json({ error: 'Les étapes déjà commencées ne peuvent pas être retirées' });
    if (locked && !old[locked - 1].to && body.length > locked) return res.status(409).json({ error: 'Le dernier livreur est déjà en route vers la cliente' });
    const now = new Date().toISOString();
    const legs = [];
    const fresh = [];
    for (let k = 0; k < body.length; k++) {
      if (k < locked) {
        legs.push(old[k]);
        continue;
      }
      const b = body[k] || {};
      const name = clip(b.name, 40);
      const phone = wa.toE164(b.phone);
      if (!name || !phone) return res.status(400).json({ error: `Étape ${k + 1} : nom et téléphone du livreur requis` });
      const last = k === body.length - 1;
      const to = last ? null : cleanPlace(b.to);
      if (!last && !to) return res.status(400).json({ error: `Étape ${k + 1} : indiquez le point de relais` });
      const vehicle = VEHICLES.has(b.vehicle) ? b.vehicle : 'moto';
      const prev = old[k];
      // Même livreur, même trajet : il garde son lien ; sinon nouveau lien (l'ancien ne marche plus)
      const same = prev && !prev.startedAt && prev.driverPhone === phone && JSON.stringify(prev.to ?? null) === JSON.stringify(to);
      const leg = same ? { ...prev, driverName: name, vehicle } : {
        driverName: name, driverPhone: phone, vehicle, to, driverToken: crypto.randomBytes(18).toString('base64url'),
        assignedAt: now, startedAt: null, doneAt: null, position: null, nearNotified: false, customerNotified: false,
      };
      if (!same) fresh.push(k);
      legs.push(leg);
    }
    if (legs[legs.length - 1].to) return res.status(400).json({ error: 'La dernière étape doit aller jusqu\'à la cliente' });
    const d = store.saveDelivery(order.id, { legs });
    const send = req.body?.send !== false;
    const sent = [];
    for (const k of fresh) {
      const text = driverMessage(order, legs, k);
      sent.push({ leg: k, result: send ? await wa.sendWhatsApp(legs[k].driverPhone, text) : null });
    }
    res.json({ delivery: adminDelivery(d, order), messages: fresh.map(k => ({ leg: k, driverPhone: legs[k].driverPhone, text: driverMessage(order, legs, k) })), sent: sent[0]?.result ?? null, sentAll: sent });
  }
  app.put('/api/admin/orders/:id/relay', savePlan);
  // Livraison directe par un seul livreur (raccourci)
  app.post('/api/admin/orders/:id/driver', (req, res) => {
    req.body = { legs: [{ name: req.body?.name, phone: req.body?.phone, vehicle: req.body?.vehicle }], send: req.body?.send };
    return savePlan(req, res);
  });

  /* ---------- Livreur (lien secret reçu par WhatsApp) ---------- */
  function driverContext(req, res) {
    const found = store.findLegByToken(String(req.params.token || ''));
    const order = found && store.getShopOrder(found.delivery.orderId);
    if (!found || !order) { res.status(404).json({ error: 'Lien de livraison invalide ou remplacé' }); return null; }
    return { d: found.delivery, i: found.index, leg: found.delivery.legs[found.index], order };
  }

  const driverView = ({ d, i, leg, order }) => {
    const c = order.customer;
    const final = !leg.to;
    const legs = d.legs;
    const prev = legs[i - 1];
    const next = legs[i + 1];
    const target = legTarget(leg, order);
    const summary = l => ({ driverName: l.driverName, driverPhone: l.driverPhone, vehicle: l.vehicle, to: l.to ?? null, state: legState(l) });
    const prevInfo = prev && {
      ...summary(prev),
      position: prev.startedAt && !prev.doneAt ? prev.position : null,
      etaMin: prev.startedAt && !prev.doneAt && prev.position && legTarget(prev, order) ? etaMinutes(prev.position, legTarget(prev, order), prev.vehicle) : null,
    };
    return {
      order: {
        id: order.id, status: order.status, total: order.total, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus,
        items: order.items.reduce((sum, it) => sum + it.quantity, 0),
        // Les livreurs de relais n'ont pas besoin du téléphone de la cliente ni du montant
        customer: final
          ? { firstName: c.firstName, lastName: c.lastName, phone: c.phone, zone: c.zone, address: c.address, notes: c.notes, location: c.location ?? null }
          : { firstName: c.firstName, lastName: '', phone: '', zone: c.zone, address: '', location: c.location ? { lat: c.location.lat, lng: c.location.lng, label: c.location.label } : null },
      },
      leg: { index: i, total: legs.length, final, vehicle: leg.vehicle, to: leg.to ?? null, state: legState(leg), target, pickup: prev?.to ?? null },
      prev: prevInfo || null,
      next: next ? summary(next) : null,
      delivery: publicDelivery(d, order),
    };
  };

  /** Passage de relais : l'étape `k` est terminée, l'étape suivante commence (cliente et livreur suivant prévenus). */
  async function handover(order, d, k, by) {
    const legs = d.legs;
    const now = new Date().toISOString();
    legs[k].doneAt ??= now;
    const next = legs[k + 1];
    if (!next) return;
    next.startedAt ??= now;
    if (!next.customerNotified) {
      next.customerNotified = true;
      logSend(order, 'expediee', 'cliente', await wa.sendWhatsApp(order.customer.phone, wa.buildHandoverMessage(order, next, k + 1, legs.length)));
    }
    // Remis par le livreur précédent : le suivant est invité à ouvrir son lien
    if (by === 'giver') await wa.sendWhatsApp(next.driverPhone, wa.buildRelayMessage('remis', order, legs[k], driverLink(next)));
  }

  app.get('/api/driver/:token', (req, res) => {
    const ctx = driverContext(req, res);
    if (ctx) res.json(driverView(ctx));
  });

  /** « Démarrer la course » (1re étape) ou « J'ai reçu le colis » (relais suivants). */
  app.post('/api/driver/:token/start', async (req, res) => {
    const ctx = driverContext(req, res);
    if (!ctx) return;
    const { d, i, leg, order } = ctx;
    if (leg.doneAt) return res.status(409).json({ error: 'Votre étape est déjà terminée' });
    if (order.status === 'annulee') return res.status(409).json({ error: 'Commande annulée' });
    for (let k = 0; k < i; k++) if (!d.legs[k].doneAt) await handover(order, d, k, 'receiver');
    leg.startedAt ??= new Date().toISOString();
    const pos = cleanPosition(req.body);
    if (pos) leg.position = pos;
    store.saveDelivery(order.id, d);
    setStatus(order, 'expediee');
    if (i === 0 && !leg.customerNotified) await notifyCustomer(order, 'expediee');
    // Le livreur suivant sait que le colis arrive et peut le suivre
    const next = d.legs[i + 1];
    if (next && !leg.nextNotified) {
      leg.nextNotified = true;
      await wa.sendWhatsApp(next.driverPhone, wa.buildRelayMessage('depart', order, leg, driverLink(next)));
    }
    store.saveDelivery(order.id, d);
    store.saveShopOrder(order);
    res.json(driverView(ctx));
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
    const { d, i, leg, order } = ctx;
    if (!leg.startedAt || leg.doneAt) return res.status(409).json({ error: 'Course non démarrée' });
    const pos = cleanPosition(req.body);
    if (!pos) return res.status(400).json({ error: 'Position invalide' });
    leg.position = pos;
    const dest = legTarget(leg, order);
    const dist = dest ? distanceM(pos, dest) : null;
    const eta = dest ? etaMinutes(pos, dest, leg.vehicle) : null;
    if (dist !== null && !leg.nearNotified) {
      if (!leg.to && dist < NEAR_M) {
        leg.nearNotified = true;
        logSend(order, 'expediee', 'cliente', await wa.sendWhatsApp(order.customer.phone, wa.buildArrivingMessage(order, eta)));
        store.saveShopOrder(order);
      } else if (leg.to && dist < RELAY_NEAR_M && d.legs[i + 1]) {
        leg.nearNotified = true;
        await wa.sendWhatsApp(d.legs[i + 1].driverPhone, wa.buildRelayMessage('proche', order, leg, driverLink(d.legs[i + 1]), eta));
      }
    }
    store.saveDelivery(order.id, d);
    res.json({ distanceM: dist === null ? null : Math.round(dist), etaMin: eta });
  });

  /** « Colis remis » : à la cliente (dernière étape) ou au livreur suivant (relais). */
  app.post('/api/driver/:token/delivered', async (req, res) => {
    const ctx = driverContext(req, res);
    if (!ctx) return;
    const { d, i, leg, order } = ctx;
    if (!leg.doneAt) {
      if (leg.to) {
        await handover(order, d, i, 'giver');
      } else {
        for (let k = 0; k < i; k++) d.legs[k].doneAt ??= new Date().toISOString();
        leg.startedAt ??= new Date().toISOString();
        leg.doneAt = new Date().toISOString();
        if (setStatus(order, 'livree')) await notifyCustomer(order, 'livree');
      }
      store.saveDelivery(order.id, d);
      store.saveShopOrder(order);
    }
    res.json(driverView(ctx));
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
