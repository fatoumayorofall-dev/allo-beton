// ============================================================
//  COMMANDES, LIVRAISON ET SUIVI GPS DU LIVREUR (façon Yango)
//  - la cliente commande avec un point sur la carte (plus d'adresse à expliquer)
//  - la gérante voit toutes les commandes et confie une livraison à un livreur
//  - le livreur reçoit un lien : il démarre la course, sa position est envoyée
//    toutes les quelques secondes ; la cliente le suit sur la carte
//  - relais : plusieurs livreurs à la suite (moto → car longue distance → moto…),
//    chacun avec son lien ; la cliente suit le colis de main en main
//  - WhatsApp : « en route », passage de relais, « il arrive », « livrée »
//  - mieux que Yango : vrai trajet par les rues et temps d'arrivée selon les
//    embouteillages de Dakar, code de remise à 4 chiffres (le colis n'est
//    déclaré livré que si la cliente donne son code), note du livreur
// ============================================================
import crypto from 'node:crypto';
import { distanceM, etaMinutes, reverseGeocode, roadRoute, roadTable, routeEtaMinutes, searchPlaces, trafficFactor, validPoint } from './geo.js';
import { bestOrder, pathLength } from './tourPlanner.js';
import { linkRequestToOrder } from './requests.js';
import { checkMarketItems } from './market.js';
import { applyStock, checkStock } from './catalog.js';

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

/* ---------- Trajet par la route ---------- */
const ROUTE_EVERY_MS = 30e3;   // recalcul régulier (trafic, raccourcis du livreur)…
const ROUTE_MIN_MS = 8e3;      // …ou plus tôt s'il quitte le trajet prévu, jamais plus d'une fois par 8 s
const ROUTE_OFF_M = 90;        // écart au trajet à partir duquel on recalcule
const ROUTE_MAX_AGE_MS = 5 * 60e3;

/**
 * Tronçon du tracé le plus proche du livreur : { index (début du tronçon), distance en mètres }.
 * Projection locale plate, largement assez précise à cette échelle.
 */
function nearestSegment(path, p) {
  const kx = 111320 * Math.cos((p.lat * Math.PI) / 180), ky = 110540;
  let best = { index: 0, distance: Infinity };
  for (let k = 0; k < path.length - 1; k++) {
    const ax = (path[k][1] - p.lng) * kx, ay = (path[k][0] - p.lat) * ky;
    const bx = (path[k + 1][1] - p.lng) * kx, by = (path[k + 1][0] - p.lat) * ky;
    const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len)) : 0;
    const d = Math.hypot(ax + t * dx, ay + t * dy);
    if (d < best.distance) best = { index: k, distance: d };
  }
  return best;
}

/**
 * Distance et temps restants : par la route quand l'itinéraire est connu
 * (au prorata du chemin déjà fait), sinon à vol d'oiseau.
 */
function remaining(leg, target) {
  const pos = leg.position;
  if (!pos || !target) return null;
  const straight = distanceM(pos, target);
  const r = leg.route;
  if (r && Date.now() - r.at < ROUTE_MAX_AGE_MS && r.straight > 0) {
    const ratio = Math.min(1.15, straight / r.straight);
    const route = { distanceM: r.distanceM * ratio, durationS: r.durationS * ratio };
    return { distanceM: Math.round(route.distanceM), etaMin: routeEtaMinutes(route, leg.vehicle), routed: true };
  }
  return { distanceM: Math.round(straight), etaMin: etaMinutes(pos, target, leg.vehicle), routed: false };
}

/** Chemin restant, depuis la position exacte du livreur. */
function pathLeft(leg) {
  const path = leg.route.path, pos = leg.position;
  return [[pos.lat, pos.lng], ...path.slice(nearestSegment(path, pos).index + 1)];
}

/** Recalcule l'itinéraire si besoin (sans jamais bloquer le livreur si le service ne répond pas). */
async function refreshRoute(leg, target) {
  const pos = leg.position;
  if (!pos || !target) return;
  const r = leg.route;
  const age = r ? Date.now() - r.at : Infinity;
  if (r && age < ROUTE_MIN_MS) return;
  if (r && age < ROUTE_EVERY_MS) {
    if (nearestSegment(r.path, pos).distance < ROUTE_OFF_M) return;
  }
  const got = await roadRoute(pos, target);
  if (got) leg.route = { ...got, at: Date.now(), straight: distanceM(pos, target) };
}

/** Code de remise : 4 chiffres, donné par la cliente au livreur (jamais montré aux livreurs). */
const newCode = () => String(crypto.randomInt(0, 10000)).padStart(4, '0');

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
    const left = remaining(active, target);
    if (left) {
      out.distanceM = left.distanceM;
      out.etaMin = left.etaMin;
      out.routed = left.routed;
    }
    // Le chemin qui reste, dessiné sur la carte
    if (left?.routed) out.route = pathLeft(active);
  }
  if (d.code) out.secured = true;
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
      ? await wa.sendWhatsApp(order.customer.phone, wa.buildOnTheWayMessage(order, legs[0]?.driverName, legs, d?.code))
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
    if (!limit(`order-ip:${req.ip}`, 40, 3600e3) || !limit(`order-phone:${phone}`, 4, 3600e3)) {
      return res.status(429).json({ error: 'Trop de commandes, réessayez plus tard.' });
    }
    // Articles du Marché (dropshipping) : prix vérifiés et suivi fournisseur préparé
    const market = checkMarketItems(o, store);
    if (market.error) return res.status(409).json({ error: market.error });
    // Pièces de la boutique : prix à jour, stock suffisant ou vente « sur commande »
    const stock = checkStock(o, store);
    if (stock.error) return res.status(409).json({ error: stock.error });
    const now = new Date().toISOString();
    const order = {
      ...o,
      supplier: market.supplier ?? undefined,
      customer: { ...o.customer, location: cleanLocation(o.customer.location) },
      items: o.items.map(i => (stock.preorder.has(i.productId) ? { ...i, preorder: { days: stock.preorder.get(i.productId) } } : i)),
      createdAt: now,
      status: 'en_attente',
      // Jamais « payé » à la création : la gérante le confirme quand l'argent est reçu
      paymentStatus: 'en_attente',
      payerPhone: clip(o.payerPhone, 30) || undefined,
      history: [{ status: 'en_attente', date: now }],
      notifications: [],
    };
    applyStock(order, store, -1);
    if (o.requestId) { order.requestId = clip(o.requestId, 12).toUpperCase(); linkRequestToOrder(store, order.requestId, order.id); }
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
    const d = store.getDelivery(order.id);
    const delivery = publicDelivery(d, order);
    // Le code de remise n'est montré qu'à la cliente (numéro de commande + son téléphone)
    if (delivery && d.code && delivery.state !== 'livree') delivery.code = d.code;
    // Commande dans une tournée, pas encore partie : combien de livraisons avant elle
    const tour = d?.tourId && store.getTour(d.tourId);
    if (delivery && tour && !d.legs[0]?.startedAt) {
      const k = tour.stops.findIndex(st => st.orderId === order.id);
      const ahead = tour.stops.slice(0, k).filter(st => !st.skipped && store.getShopOrder(st.orderId)?.status !== 'livree' && store.getShopOrder(st.orderId)?.status !== 'annulee').length;
      delivery.tour = { position: k + 1, total: tour.stops.length, ahead, started: !!tour.startedAt, driverName: tour.driverName };
    }
    res.json({ order: rest, delivery });
  });

  /* ---------- Cliente : noter la livraison ---------- */
  app.post('/api/orders/rating', (req, res) => {
    if (!limit(`rating:${req.ip}`, 20, 3600e3)) return res.status(429).json({ error: 'Trop de demandes' });
    const b = req.body || {};
    const order = store.getShopOrder(clip(b.id, 20).toUpperCase());
    if (!order || last9(order.customer.phone) !== last9(b.phone) || last9(b.phone).length < 9) return res.status(404).json({ error: 'Commande introuvable' });
    if (order.status !== 'livree') return res.status(409).json({ error: 'La commande n\'est pas encore livrée' });
    const stars = Math.round(Number(b.stars));
    if (!(stars >= 1 && stars <= 5)) return res.status(400).json({ error: 'Note entre 1 et 5' });
    const legs = store.getDelivery(order.id)?.legs ?? [];
    order.rating = { stars, comment: clip(b.comment, 500) || undefined, driverName: legs[legs.length - 1]?.driverName, at: new Date().toISOString() };
    store.saveShopOrder(order);
    res.json({ rating: order.rating });
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
      const before = order.status;
      if (setStatus(order, status)) {
        // Annulation : les pièces reviennent en stock ; réactivation : elles repartent
        if (status === 'annulee') applyStock(order, store, +1);
        if (before === 'annulee') applyStock(order, store, -1);
        if (req.body.notify !== false) sent = await notifyCustomer(order, status);
      }
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
    return { ...pub, legs, driverLink: legs[pub.current].driverLink, code: d.code, proof: d.proof };
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
    const d = store.saveDelivery(order.id, { ...(store.getDelivery(order.id) ?? {}), legs, code: store.getDelivery(order.id)?.code ?? newCode() });
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
      leg: { index: i, total: legs.length, final, vehicle: leg.vehicle, to: leg.to ?? null, state: legState(leg), target, pickup: prev?.to ?? null, needsCode: final && !!d.code },
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
      logSend(order, 'expediee', 'cliente', await wa.sendWhatsApp(order.customer.phone, wa.buildHandoverMessage(order, next, k + 1, legs.length, d.code)));
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
    if (pos) { leg.position = pos; await refreshRoute(leg, legTarget(leg, order)); }
    if (d.tourId) { const t = store.getTour(d.tourId); if (t && !t.startedAt) { t.startedAt = leg.startedAt; store.saveTour(t); } }
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
    await refreshRoute(leg, dest);
    const dist = dest ? distanceM(pos, dest) : null;
    const eta = remaining(leg, dest)?.etaMin ?? null;
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
    const left = remaining(leg, dest);
    res.json({ distanceM: left?.distanceM ?? null, etaMin: eta, route: left?.routed ? pathLeft(leg) : null });
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
        // Code de remise : la preuve que la cliente a bien reçu son colis
        if (d.code) {
          if (!limit(`code:${req.params.token}`, 6, 15 * 60e3)) return res.status(429).json({ error: 'Trop d\'essais. Appelez la boutique.' });
          if (String(req.body?.code ?? '').replace(/\D/g, '') !== d.code) return res.status(403).json({ error: 'Code incorrect. Demandez à la cliente le code reçu par WhatsApp.' });
          d.proof = { by: 'code', at: new Date().toISOString(), position: leg.position ? { lat: leg.position.lat, lng: leg.position.lng } : null };
        }
        for (let k = 0; k < i; k++) d.legs[k].doneAt ??= new Date().toISOString();
        leg.startedAt ??= new Date().toISOString();
        leg.doneAt = new Date().toISOString();
        if (setStatus(order, 'livree')) await notifyCustomer(order, 'livree');
      }
      store.saveDelivery(order.id, d);
      store.saveShopOrder(order);
      if (d.tourId && !leg.to) await startNextTourStop(store.getTour(d.tourId), leg.position);
    }
    res.json(driverView(ctx));
  });


  /* ==========================================================
   *  TOURNÉES : un livreur, toutes les commandes du jour,
   *  dans l'ordre le plus court (départ boutique, sans allers-retours)
   * ========================================================== */
  const SHOP = { lat: Number(process.env.SHOP_LAT) || 14.7195, lng: Number(process.env.SHOP_LNG) || -17.4655 };
  const MAX_STOPS = 30;
  const tourLink = t => `${SITE_URL}/livreur/tournee/${t.token}`;
  const stopState = (order, d, st) => {
    if (order?.status === 'livree') return 'livree';
    if (order?.status === 'annulee') return 'annulee';
    if (st.skipped) return 'reportee';
    const leg = d?.legs?.[0];
    return leg?.startedAt ? 'en_route' : 'attente';
  };

  /** Commandes qu'on peut mettre dans une tournée : point sur la carte, ni livrées ni annulées, pas déjà parties. */
  function tourable(ids) {
    const list = [];
    for (const id of [...new Set((Array.isArray(ids) ? ids : []).map(x => clip(x, 20).toUpperCase()))]) {
      const o = store.getShopOrder(id);
      if (!o) return { error: `Commande ${id} introuvable` };
      if (o.status === 'livree' || o.status === 'annulee') return { error: `${id} est déjà ${o.status === 'livree' ? 'livrée' : 'annulée'}` };
      if (!o.customer.location) return { error: `${id} n'a pas de point sur la carte` };
      const d = store.getDelivery(id);
      if (d?.legs?.some(l => l.startedAt)) return { error: `${id} est déjà en route` };
      list.push(o);
    }
    if (!list.length) return { error: 'Choisissez au moins une commande' };
    if (list.length > MAX_STOPS) return { error: `Au plus ${MAX_STOPS} livraisons par tournée` };
    return { list };
  }

  /** Ordre le plus court + distances et heures d'arrivée estimées. */
  async function planTour(orders, vehicle = 'moto') {
    const points = [SHOP, ...orders.map(o => o.customer.location)];
    const table = await roadTable(points);
    const m = table.distanceM;
    const order = bestOrder(m);
    const factor = trafficFactor(vehicle);
    let cumM = 0, cumS = 0, prev = 0;
    const stops = order.map(k => {
      const o = orders[k - 1];
      const legM = m[prev][k];
      cumM += legM;
      // Durée par la route (embouteillages compris) + 5 min sur place pour remettre le colis
      cumS += Math.max(table.durationS[prev][k], (m[prev][k] / 1000 / 22) * 3600) * factor + (prev ? 300 : 0);
      prev = k;
      return { orderId: o.id, firstName: o.customer.firstName, label: o.customer.location.label || '', zone: o.customer.zone, lat: o.customer.location.lat, lng: o.customer.location.lng, legM: Math.round(legM), cumM: Math.round(cumM), etaMin: Math.round(cumS / 60) };
    });
    const arrival = Array.from({ length: orders.length }, (_, k) => k + 1);
    return {
      stops,
      totalM: Math.round(pathLength(m, order)),
      arrivalOrderM: Math.round(pathLength(m, arrival)),
      // Une course par commande : boutique → cliente → boutique
      roundTripsM: Math.round(arrival.reduce((sum, k) => sum + m[0][k] + m[k][0], 0)),
      routed: table.routed,
      shop: SHOP,
    };
  }

  function adminTour(t) {
    return {
      ...t,
      link: tourLink(t),
      stops: t.stops.map(st => {
        const o = store.getShopOrder(st.orderId);
        const d = store.getDelivery(st.orderId);
        return { ...st, state: stopState(o, d, st), firstName: o?.customer.firstName, label: o?.customer.location?.label || o?.customer.zone, total: o?.total };
      }),
    };
  }

  /** La livraison suivante de la tournée démarre : sa cliente reçoit « en route » + le lien de suivi. */
  async function startNextTourStop(tour, pos) {
    if (!tour) return null;
    for (const st of tour.stops) {
      const o = store.getShopOrder(st.orderId);
      const d = store.getDelivery(st.orderId);
      if (!o || !d?.legs?.length || st.skipped || o.status === 'livree' || o.status === 'annulee') continue;
      const leg = d.legs[0];
      if (leg.doneAt) continue;
      if (!leg.startedAt) {
        leg.startedAt = new Date().toISOString();
        if (pos) { leg.position = { ...pos, at: new Date().toISOString() }; await refreshRoute(leg, legTarget(leg, o)); }
        store.saveDelivery(o.id, d);
        setStatus(o, 'expediee');
        await notifyCustomer(o, 'expediee');
        store.saveShopOrder(o);
      }
      return st.orderId;
    }
    tour.doneAt ??= new Date().toISOString();
    store.saveTour(tour);
    return null;
  }

  app.post('/api/admin/tours/plan', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    const t = tourable(req.body?.orderIds);
    if (t.error) return res.status(400).json({ error: t.error });
    res.json(await planTour(t.list, VEHICLES.has(req.body?.vehicle) ? req.body.vehicle : 'moto'));
  });

  app.post('/api/admin/tours', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    const t = tourable(req.body?.orderIds);
    if (t.error) return res.status(400).json({ error: t.error });
    const name = clip(req.body?.driver?.name, 40);
    const phone = wa.toE164(req.body?.driver?.phone);
    if (!name || !phone) return res.status(400).json({ error: 'Nom et téléphone du livreur requis' });
    const vehicle = VEHICLES.has(req.body?.driver?.vehicle) ? req.body.driver.vehicle : 'moto';
    // L'ordre est recalculé côté serveur (jamais celui d'un navigateur), sauf si la gérante l'a fixé à la main
    const plan = await planTour(t.list, vehicle);
    const ordered = req.body?.keepOrder ? t.list.map(o => o.id) : plan.stops.map(st => st.orderId);
    const now = new Date().toISOString();
    const tour = {
      id: `T${now.slice(2, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      token: crypto.randomBytes(18).toString('base64url'),
      driverName: name, driverPhone: phone, vehicle, createdAt: now, startedAt: null, doneAt: null,
      totalM: plan.totalM, roundTripsM: plan.roundTripsM,
      stops: ordered.map(orderId => ({ orderId, skipped: false })),
    };
    // Chaque commande reçoit sa livraison (même livreur) : la cliente garde son suivi et son code
    for (const id of ordered) {
      const old = store.getDelivery(id);
      store.saveDelivery(id, {
        ...(old ?? {}), tourId: tour.id, code: old?.code ?? newCode(),
        legs: [{ driverName: name, driverPhone: phone, vehicle, to: null, driverToken: crypto.randomBytes(18).toString('base64url'),
          assignedAt: now, startedAt: null, doneAt: null, position: null, nearNotified: false, customerNotified: false }],
      });
      const o = store.getShopOrder(id);
      if (o && (o.status === 'en_attente' || o.status === 'confirmee')) { setStatus(o, 'en_preparation'); store.saveShopOrder(o); }
    }
    store.saveTour(tour);
    const stops = ordered.map(id => { const o = store.getShopOrder(id); return { firstName: o.customer.firstName, label: o.customer.location?.label, zone: o.customer.zone }; });
    const text = wa.buildTourDriverMessage(tour, tourLink(tour), stops);
    const sent = req.body?.send === false ? null : await wa.sendWhatsApp(phone, text);
    res.status(201).json({ tour: adminTour(tour), message: { driverPhone: phone, text }, sent });
  });

  app.get('/api/admin/tours', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    res.json({ tours: store.listTours().slice(0, 30).map(adminTour) });
  });

  /** Annuler une tournée : les livraisons pas encore parties redeviennent libres. */
  app.delete('/api/admin/tours/:id', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    const tour = store.getTour(req.params.id);
    if (!tour) return res.status(404).json({ error: 'Tournée introuvable' });
    for (const st of tour.stops) {
      const d = store.getDelivery(st.orderId);
      if (d?.tourId === tour.id && !d.legs?.[0]?.startedAt) store.saveDelivery(st.orderId, { ...d, tourId: undefined, legs: [] });
    }
    tour.cancelledAt = new Date().toISOString();
    tour.doneAt ??= tour.cancelledAt;
    store.saveTour(tour);
    res.json({ tour: adminTour(tour) });
  });

  /* ---------- Livreur : sa tournée (lien secret) ---------- */
  function tourView(tour) {
    let current = -1;
    const stops = tour.stops.map((st, k) => {
      const o = store.getShopOrder(st.orderId);
      const d = store.getDelivery(st.orderId);
      const state = stopState(o, d, st);
      if (current < 0 && (state === 'en_route' || state === 'attente') && !tour.cancelledAt) current = k;
      const c = o?.customer ?? {};
      const leg = d?.legs?.[0];
      return {
        index: k, orderId: st.orderId, state,
        // Le lien de l'étape : le téléphone du livreur envoie sa position et le code par lui
        legToken: d?.tourId === tour.id ? leg?.driverToken ?? null : null,
        customer: { firstName: c.firstName, lastName: c.lastName, phone: c.phone, zone: c.zone, address: c.address, notes: c.notes, location: c.location ?? null },
        total: o?.total, paymentStatus: o?.paymentStatus, items: o?.items?.reduce((sum, it) => sum + it.quantity, 0) ?? 0,
        needsCode: !!d?.code,
      };
    });
    return { id: tour.id, driverName: tour.driverName, vehicle: tour.vehicle, startedAt: tour.startedAt, doneAt: tour.doneAt, cancelled: !!tour.cancelledAt, totalM: tour.totalM, roundTripsM: tour.roundTripsM, shop: SHOP, current, stops };
  }

  app.get('/api/tour/:token', (req, res) => {
    const tour = store.findTourByToken(String(req.params.token || ''));
    if (!tour) return res.status(404).json({ error: 'Lien de tournée invalide' });
    res.json(tourView(tour));
  });

  /** Cliente absente ou injoignable : la livraison est reportée, on passe à la suivante. */
  app.post('/api/tour/:token/skip', async (req, res) => {
    const tour = store.findTourByToken(String(req.params.token || ''));
    if (!tour) return res.status(404).json({ error: 'Lien de tournée invalide' });
    const st = tour.stops.find(x => x.orderId === clip(req.body?.orderId, 20).toUpperCase());
    if (!st) return res.status(404).json({ error: 'Commande hors de la tournée' });
    const o = store.getShopOrder(st.orderId);
    const d = store.getDelivery(st.orderId);
    const leg = d?.legs?.[0];
    if (o?.status === 'livree') return res.status(409).json({ error: 'Déjà livrée' });
    st.skipped = true;
    st.skippedAt = new Date().toISOString();
    const pos = leg?.position ?? null;
    if (leg) { leg.startedAt = null; leg.position = null; leg.route = null; leg.nearNotified = false; store.saveDelivery(st.orderId, d); }
    if (o) {
      setStatus(o, 'en_preparation');
      logSend(o, 'reportee', 'cliente', await wa.sendWhatsApp(o.customer.phone, wa.buildTourPostponedMessage(o)));
      store.saveShopOrder(o);
    }
    store.saveTour(tour);
    await startNextTourStop(tour, pos);
    res.json(tourView(tour));
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
