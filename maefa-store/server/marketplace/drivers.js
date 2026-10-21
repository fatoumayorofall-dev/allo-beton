// ============================================================
//  LIVREURS DE LA PLACE DE MARCHÉ
//  - inscription avec son numéro (compte habituel), validée par la gérante ;
//  - il voit les courses prêtes (express ou moitié-moitié), en accepte une à la fois ;
//  - il suit les arrêts dans l'ordre calculé : enlèvement chez chaque vendeur, dépôt chez chaque acheteur ;
//  - argent (méthode A) : il encaisse l'acheteur, envoie au vendeur sa part par Wave, garde la sienne
//    et doit à la plateforme ses commissions ; l'application lui affiche chaque montant ;
//  - le vendeur ne voit jamais le numéro de l'acheteur : seul le livreur l'a, pendant la course.
// ============================================================
import crypto from 'node:crypto';
import { roadKm, settlement } from './pricing.js';
import { ratingOf } from './aftersale.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code = n => Array.from(crypto.randomBytes(n), b => ALPHABET[b % ALPHABET.length]).join('');
const clip = (v, n) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');
const VEHICLES = new Set(['moto', 'voiture', 'velo', 'pied']);
const F = n => `${Math.round(n).toLocaleString('fr-FR')} F`;
const DEAD = new Set(['annulee', 'refusee']);

/** Ce que l'acheteur et le vendeur voient du livreur. */
export const publicDriver = d => (d ? { name: d.name, phone: d.phone, vehicle: d.vehicle } : null);

export function registerDriverRoutes(app, { limit, isAdmin, store, currentUser, trips, settings, notify }) {
  const now = () => new Date().toISOString();
  const tooMany = (req, res, key, max, ms) => {
    if (limit(key, max, ms)) return false;
    res.status(429).json({ error: 'Trop de demandes, réessayez dans un moment.' });
    return true;
  };
  /** Livreur connecté et validé, ou réponse d'erreur. */
  const driverOf = (req, res, { active = true } = {}) => {
    const user = currentUser(req);
    if (!user) return void res.status(401).json({ error: 'Connectez-vous avec votre numéro' });
    const d = store.findMpDriverByOwner(user.phone);
    if (!d || d.status === 'fermee')
      return void res.status(404).json({ error: "Vous n'êtes pas inscrit comme livreur" });
    if (active && d.status !== 'active')
      return void res.status(423).json({ error: "Votre inscription n'est pas encore validée" });
    return d;
  };
  const currentTrip = d => store.listMpTrips().find(t => t.driverId === d.id && t.status === 'acceptee') ?? null;

  /** Ce que le livreur doit à la plateforme : commissions des commandes livrées moins ses versements. */
  function balanceOf(d) {
    const done = store.listMpOrders().filter(o => o.driverId === d.id && o.status === 'livree' && o.settlement);
    const due = done.reduce((t, o) => t + o.settlement.platformGets, 0);
    const paid = (d.payments ?? []).reduce((t, p) => t + p.amount, 0);
    return {
      deliveries: done.length,
      earned: done.reduce((t, o) => t + o.settlement.driverKeeps, 0),
      due,
      paid,
      balance: due - paid,
      payments: d.payments ?? [],
      payoutsToSend: done
        .filter(o => !o.payout?.sentAt)
        .map(o => ({ orderId: o.id, shopName: o.shopName, amount: o.settlement.sellerGets })),
    };
  }

  /** Course proposée (avant acceptation) : pas d'adresse exacte ni de numéro, la distance et le gain. */
  function offerView(t, d) {
    const orders = trips.live(t);
    const s = settings();
    const earn = orders.reduce((sum, o) => {
      const share = t.price?.shares?.[o.id] ?? o.delivery.fee;
      return sum + share - Math.round(share * s.driverRate);
    }, 0);
    const first = orders[0];
    return {
      id: t.id,
      mode: t.mode,
      orders: orders.length,
      km: t.price?.km ?? 0,
      earn,
      shops: [...new Set(orders.map(o => o.shopName))],
      toFirstKm: d.location && first ? roadKm(d.location, first.delivery.from) : null,
    };
  }

  /** Course acceptée : chaque arrêt avec ce qu'il faut faire, dire et encaisser. */
  function tripView(t) {
    const s = settings();
    const orders = new Map(trips.live(t).map(o => [o.id, o]));
    const stops = (t.stops ?? [])
      .filter(st => orders.has(st.orderId))
      .map(st => {
        const o = orders.get(st.orderId);
        const seller = store.getMpSeller(o.sellerId);
        if (st.kind === 'enlevement')
          return {
            ...st,
            shopName: o.shopName,
            phone: seller?.contactPhone ?? seller?.ownerPhone ?? null,
            at: o.delivery.from,
            items: o.lines.map(l => `${l.qty} × ${l.title}${l.variant ? ` (${l.variant})` : ''}`),
          };
        const share = o.delivery.share ?? o.delivery.fee;
        const money = settlement(
          { subtotal: o.subtotal, share, buyerFee: o.buyerFee, sellerCommission: o.commissions.seller },
          s,
        );
        return {
          ...st,
          buyerName: o.buyer.name,
          phone: o.buyer.phone,
          at: o.delivery.to,
          payment: o.payment,
          note: o.note,
          money,
          sellerPhone: seller?.contactPhone ?? seller?.ownerPhone ?? null,
          payoutSent: !!o.payout?.sentAt,
        };
      });
    return { id: t.id, mode: t.mode, status: t.status, km: t.price?.km ?? 0, stops };
  }

  /* ---------- Inscription et présence ---------- */

  app.get('/api/mp/me/driver', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Non connecté' });
    const d = store.findMpDriverByOwner(user.phone);
    if (!d || d.status === 'fermee') return res.json({ driver: null });
    const t = currentTrip(d);
    res.json({ driver: d, balance: balanceOf(d), trip: t ? tripView(t) : null, driverRate: settings().driverRate });
  });

  app.post('/api/mp/me/driver', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Connectez-vous avec votre numéro' });
    if (tooMany(req, res, `mp-driver:${user.phone}`, 20, 3600e3)) return;
    const b = req.body ?? {};
    const existing = store.findMpDriverByOwner(user.phone);
    if (existing?.status === 'suspendue') return res.status(423).json({ error: 'Compte livreur suspendu' });
    const name = clip(b.name ?? existing?.name, 60);
    const vehicle = b.vehicle ?? existing?.vehicle;
    const zone = clip(b.zone ?? existing?.zone, 60);
    if (name.length < 2) return res.status(400).json({ error: 'Indiquez votre nom' });
    if (!VEHICLES.has(vehicle)) return res.status(400).json({ error: 'Choisissez votre moyen de transport' });
    const d = store.saveMpDriver({
      ...(existing ?? {
        id: `L-${code(6)}`,
        ownerPhone: user.phone,
        phone: user.phone,
        status: 'en_attente',
        online: false,
        location: null,
        payments: [],
        createdAt: now(),
      }),
      name,
      vehicle,
      zone,
    });
    res.status(existing ? 200 : 201).json({ driver: d, balance: balanceOf(d) });
  });

  // « Je suis disponible » + position (pour proposer les courses les plus proches)
  app.post('/api/mp/me/driver/presence', (req, res) => {
    const d = driverOf(req, res);
    if (!d) return;
    const loc = req.body?.location;
    const ok = loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng);
    const saved = store.saveMpDriver({
      ...d,
      online: !!req.body?.online,
      ...(ok ? { location: { lat: loc.lat, lng: loc.lng, at: now() } } : {}),
    });
    res.json({ driver: saved });
  });

  /* ---------- Courses ---------- */

  app.get('/api/mp/driver/trips', (req, res) => {
    const d = driverOf(req, res);
    if (!d) return;
    const list = trips
      .available()
      .map(t => offerView(t, d))
      .sort((a, b) => (a.toFirstKm ?? 99) - (b.toFirstKm ?? 99));
    const t = currentTrip(d);
    res.json({ trips: list, current: t ? tripView(t) : null });
  });

  app.post('/api/mp/driver/trips/:id/accept', (req, res) => {
    const d = driverOf(req, res);
    if (!d) return;
    if (currentTrip(d)) return res.status(409).json({ error: "Terminez d'abord votre course en cours" });
    const t = trips.available().find(x => x.id === clip(req.params.id, 20));
    if (!t) return res.status(409).json({ error: 'Course déjà prise ou plus disponible' });
    const saved = store.saveMpTrip({
      ...t,
      driverId: d.id,
      status: 'acceptee',
      acceptedAt: now(),
      history: [...(t.history ?? []), { status: 'acceptee', at: now(), by: d.id }],
    });
    for (const o of trips.live(saved)) {
      const seller = store.getMpSeller(o.sellerId);
      notify(seller?.contactPhone ?? seller?.ownerPhone, `🛵 ${d.name} vient chercher la commande ${o.id}.`);
      notify(o.buyerPhone, `🛵 ${d.name} livrera votre commande ${o.id}. Il vous appellera en arrivant.`);
    }
    res.json({ trip: tripView(saved) });
  });

  // Arrêt fait : colis enlevé chez le vendeur, ou déposé (et encaissé) chez l'acheteur
  app.post('/api/mp/driver/trips/:id/stop', (req, res) => {
    const d = driverOf(req, res);
    if (!d) return;
    const t = store.getMpTrip(clip(req.params.id, 20));
    if (!t || t.driverId !== d.id || t.status !== 'acceptee')
      return res.status(404).json({ error: 'Course introuvable' });
    const orderId = clip(req.body?.orderId, 20);
    const kind = req.body?.kind;
    const stop = (t.stops ?? []).find(s => s.orderId === orderId && s.kind === kind);
    const o = store.getMpOrder(orderId);
    if (!stop || !o || DEAD.has(o.status)) return res.status(404).json({ error: 'Arrêt introuvable' });
    if (stop.done) return res.status(409).json({ error: 'Déjà fait' });
    const history = s => [...(o.history ?? []), { status: s, at: now(), by: 'livreur' }];
    if (kind === 'enlevement') {
      if (o.status !== 'prete') return res.status(409).json({ error: "Le vendeur n'a pas encore préparé ce colis" });
      store.saveMpOrder({ ...o, status: 'en_livraison', driverId: d.id, history: history('en_livraison') });
      notify(o.buyerPhone, `📦 Votre commande ${o.id} est en route avec ${d.name}.`);
    } else {
      const picked = t.stops.find(s => s.orderId === orderId && s.kind === 'enlevement')?.done;
      if (!picked || o.status !== 'en_livraison') return res.status(409).json({ error: "Récupérez d'abord le colis" });
      const money = settlement(
        {
          subtotal: o.subtotal,
          share: o.delivery.share ?? o.delivery.fee,
          buyerFee: o.buyerFee,
          sellerCommission: o.commissions.seller,
        },
        settings(),
      );
      store.saveMpOrder({
        ...o,
        status: 'livree',
        driverId: d.id,
        collector: 'livreur',
        settlement: money,
        deliveredAt: now(),
        history: history('livree'),
      });
      const seller = store.getMpSeller(o.sellerId);
      notify(
        seller?.contactPhone ?? seller?.ownerPhone,
        `✅ Commande ${o.id} livrée. ${d.name} vous envoie ${F(money.sellerGets)} par Wave.`,
      );
      notify(o.buyerPhone, `✅ Commande ${o.id} livrée. Merci et à bientôt !`);
    }
    const stops = t.stops.map(s => (s === stop ? { ...s, done: true, at: now() } : s));
    const left = trips.live({ ...t }).filter(x => x.status !== 'livree');
    const saved = store.saveMpTrip({
      ...t,
      stops,
      ...(left.length ? {} : { status: 'terminee', doneAt: now() }),
    });
    res.json({ trip: tripView(saved), balance: balanceOf(d) });
  });

  // Part du vendeur envoyée (Wave, Orange Money…) : le vendeur confirme ensuite la réception
  app.post('/api/mp/driver/orders/:id/payout', (req, res) => {
    const d = driverOf(req, res);
    if (!d) return;
    const o = store.getMpOrder(clip(req.params.id, 20));
    if (!o || o.driverId !== d.id || o.status !== 'livree')
      return res.status(404).json({ error: 'Commande introuvable' });
    const saved = store.saveMpOrder({
      ...o,
      payout: { ...(o.payout ?? {}), sentAt: o.payout?.sentAt ?? now(), amount: o.settlement.sellerGets },
    });
    const seller = store.getMpSeller(o.sellerId);
    notify(
      seller?.contactPhone ?? seller?.ownerPhone,
      `💸 ${d.name} indique vous avoir envoyé ${F(o.settlement.sellerGets)} (commande ${o.id}). Confirmez la réception dans votre espace.`,
    );
    res.json({ order: { id: saved.id, payout: saved.payout }, balance: balanceOf(d) });
  });

  /* ---------- Gérante ---------- */
  const guard = (req, res) => {
    if (isAdmin(req)) return true;
    res.status(403).json({ error: 'Accès gérante requis' });
    return false;
  };

  app.get('/api/admin/mp/drivers', (req, res) => {
    if (!guard(req, res)) return;
    res.json({
      drivers: store
        .listMpDrivers()
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .map(d => ({
          ...d,
          balance: balanceOf(d),
          current: currentTrip(d)?.id ?? null,
          rating: ratingOf(
            store.listMpOrders().filter(o => o.driverId === d.id),
            'driver',
          ),
        })),
    });
  });

  app.patch('/api/admin/mp/drivers/:id', (req, res) => {
    if (!guard(req, res)) return;
    const d = store.getMpDriver(clip(req.params.id, 20));
    if (!d) return res.status(404).json({ error: 'Livreur introuvable' });
    const status = req.body?.status;
    if (!['en_attente', 'active', 'suspendue'].includes(status))
      return res.status(400).json({ error: 'Statut invalide' });
    const saved = store.saveMpDriver({ ...d, status, ...(status !== 'active' ? { online: false } : {}) });
    if (status === 'active' && d.status !== 'active')
      notify(d.phone, '✅ Votre inscription de livreur est validée : ouvrez votre espace pour voir les courses.');
    res.json({ driver: saved });
  });

  app.post('/api/admin/mp/drivers/:id/payments', (req, res) => {
    if (!guard(req, res)) return;
    const d = store.getMpDriver(clip(req.params.id, 20));
    if (!d) return res.status(404).json({ error: 'Livreur introuvable' });
    const amount = Math.round(Number(req.body?.amount));
    if (!Number.isInteger(amount) || amount <= 0 || amount > 100_000_000)
      return res.status(400).json({ error: 'Montant invalide' });
    const payment = { id: code(6), amount, note: clip(req.body?.note, 120), at: now() };
    const saved = store.saveMpDriver({ ...d, payments: [...(d.payments ?? []), payment] });
    res.status(201).json({ payment, balance: balanceOf(saved) });
  });

  app.get('/api/admin/mp/trips', (req, res) => {
    if (!guard(req, res)) return;
    trips.sweep();
    res.json({
      trips: store
        .listMpTrips()
        .slice(0, 300)
        .map(t => ({
          ...t,
          orders: trips.ordersOf(t).map(o => ({ id: o.id, status: o.status, shopName: o.shopName })),
          driver: publicDriver(t.driverId ? store.getMpDriver(t.driverId) : null),
        })),
    });
  });

  // Lancer un groupe moitié-moitié tout de suite (sans attendre l'heure prévue)
  app.post('/api/admin/mp/trips/:id/close', (req, res) => {
    if (!guard(req, res)) return;
    const t = store.getMpTrip(clip(req.params.id, 20));
    if (!t) return res.status(404).json({ error: 'Course introuvable' });
    res.json({ trip: trips.close(t, 'lancée par la gérante') });
  });

  return { balanceOf, currentTrip };
}
