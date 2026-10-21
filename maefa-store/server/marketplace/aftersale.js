// ============================================================
//  APRÈS LA LIVRAISON : avis vérifiés, signalement d'un problème, position du livreur
//  - avis : seule une cliente qui a reçu sa commande dans l'application peut noter le vendeur
//    (et le livreur) ; les avis font la réputation et le classement : vendre « en bas » n'en rapporte pas ;
//  - problème : article non conforme, abîmé, incomplet ou pas reçu, signalé sous 72 h ;
//    la gérante examine, contacte le vendeur et note la solution ;
//  - suivi : pendant la livraison, la cliente voit à quelle distance est son livreur.
// ============================================================
import { roadKm } from './pricing.js';
import { CONTACT_REFUSED, findContact } from './contact.js';

const clip = (v, n) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');
export const PROBLEMS = {
  non_conforme: "L'article ne correspond pas à l'annonce",
  abime: 'Article abîmé',
  incomplet: 'Il manque quelque chose',
  non_recu: "Je n'ai pas reçu ma commande",
};
const PROBLEM_WINDOW_MS = 72 * 3600e3;
const REVIEW_WINDOW_MS = 30 * 864e5;
/** Vitesse moyenne d'un livreur dans Dakar (km/h), pour l'heure d'arrivée estimée */
const CITY_SPEED = { moto: 22, velo: 14, voiture: 18, pied: 5 };

/** Note moyenne d'un vendeur (ou d'un livreur) à partir des avis des commandes livrées. */
export function ratingOf(orders, key) {
  const stars = orders
    .filter(o => !o.review?.hidden)
    .map(o => o.review?.[key]?.stars)
    .filter(n => Number.isInteger(n));
  if (!stars.length) return { average: null, count: 0 };
  return { average: Math.round((stars.reduce((t, n) => t + n, 0) / stars.length) * 10) / 10, count: stars.length };
}

/** Avis publics d'un vendeur : prénom, note, texte, date (jamais de numéro). */
export const publicReviews = orders =>
  orders
    .filter(o => o.review?.seller && !o.review.hidden)
    .sort((a, b) => (a.review.at < b.review.at ? 1 : -1))
    .slice(0, 30)
    .map(o => ({
      name: o.buyer.name.split(' ')[0],
      stars: o.review.seller.stars,
      text: o.review.seller.text,
      at: o.review.at,
    }));

/** Estimation de l'arrivée du livreur : distance par la route et minutes. */
export function eta(from, to, vehicle = 'moto') {
  const km = roadKm(from, to);
  return { km, minutes: Math.max(1, Math.round((km / (CITY_SPEED[vehicle] ?? 20)) * 60)) };
}

export function registerAfterSaleRoutes(app, { limit, isAdmin, store, currentUser, notify }) {
  const now = () => new Date().toISOString();
  const mine = (req, res) => {
    const user = currentUser(req);
    if (!user) return void res.status(401).json({ error: 'Non connectée' });
    const o = store.getMpOrder(clip(req.params.id, 20));
    if (!o || o.buyerPhone !== user.phone) return void res.status(404).json({ error: 'Commande introuvable' });
    return { user, o };
  };

  // Avis vérifié : vendeur (1 à 5 étoiles + texte facultatif), livreur (étoiles)
  app.post('/api/mp/me/orders/:id/review', (req, res) => {
    const me = mine(req, res);
    if (!me) return;
    const { o } = me;
    if (o.status !== 'livree')
      return res.status(409).json({ error: 'Vous pourrez donner votre avis après la livraison' });
    if (o.review) return res.status(409).json({ error: 'Vous avez déjà donné votre avis' });
    const deliveredAt = Date.parse(o.deliveredAt ?? o.updatedAt ?? o.createdAt);
    if (Date.now() - deliveredAt > REVIEW_WINDOW_MS)
      return res.status(409).json({ error: 'Délai de 30 jours dépassé' });
    const stars = Number(req.body?.sellerStars);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5)
      return res.status(400).json({ error: 'Choisissez une note de 1 à 5' });
    const text = clip(req.body?.text, 400);
    const contact = findContact(text);
    if (contact) return res.status(400).json({ error: CONTACT_REFUSED(contact) });
    const driverStars = Number(req.body?.driverStars);
    const review = {
      seller: { stars, text },
      ...(o.driverId && Number.isInteger(driverStars) && driverStars >= 1 && driverStars <= 5
        ? { driver: { stars: driverStars } }
        : {}),
      at: now(),
    };
    const saved = store.saveMpOrder({ ...o, review });
    const seller = store.getMpSeller(o.sellerId);
    notify(
      seller?.contactPhone ?? seller?.ownerPhone,
      `⭐ Nouvel avis sur votre boutique : ${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}${text ? ` « ${text} »` : ''}`,
    );
    res.status(201).json({ review: saved.review });
  });

  // Signaler un problème (sous 72 h après la livraison, ou à tout moment si rien n'est arrivé)
  app.post('/api/mp/me/orders/:id/problem', (req, res) => {
    const me = mine(req, res);
    if (!me) return;
    const { o } = me;
    if (!limit(`mp-problem:${me.user.phone}`, 10, 3600e3)) return res.status(429).json({ error: 'Trop de demandes' });
    const kind = req.body?.kind;
    if (!(kind in PROBLEMS)) return res.status(400).json({ error: 'Choisissez le problème' });
    if (o.dispute && o.dispute.status === 'ouvert')
      return res.status(409).json({ error: 'Un signalement est déjà en cours' });
    if (kind === 'non_recu') {
      if (['annulee', 'refusee'].includes(o.status)) return res.status(409).json({ error: 'Commande annulée' });
    } else {
      if (o.status !== 'livree') return res.status(409).json({ error: 'Disponible après la livraison' });
      const deliveredAt = Date.parse(o.deliveredAt ?? o.updatedAt ?? o.createdAt);
      if (Date.now() - deliveredAt > PROBLEM_WINDOW_MS)
        return res.status(409).json({ error: 'Délai de 72 heures dépassé après la livraison' });
    }
    const text = clip(req.body?.text, 600);
    const contact = findContact(text);
    if (contact) return res.status(400).json({ error: CONTACT_REFUSED(contact) });
    const dispute = { kind, text, status: 'ouvert', at: now(), resolution: '', resolvedAt: null };
    const saved = store.saveMpOrder({ ...o, dispute });
    const seller = store.getMpSeller(o.sellerId);
    notify(
      seller?.contactPhone ?? seller?.ownerPhone,
      `⚠️ Problème signalé sur la commande ${o.id} : ${PROBLEMS[kind]}. L'équipe va vous contacter.`,
    );
    if (process.env.OWNER_WHATSAPP)
      notify(
        process.env.OWNER_WHATSAPP,
        `⚠️ Signalement ${o.id} (${o.shopName}) : ${PROBLEMS[kind]}${text ? ` — ${text}` : ''}`,
      );
    res.status(201).json({ dispute: saved.dispute });
  });

  // Où est mon livreur ? (seulement pour la cliente, pendant la livraison)
  app.get('/api/mp/me/orders/:id/driver', (req, res) => {
    const me = mine(req, res);
    if (!me) return;
    const { o } = me;
    const trip = o.delivery?.tripId ? store.getMpTrip(o.delivery.tripId) : null;
    const d = trip?.driverId ? store.getMpDriver(trip.driverId) : null;
    if (!d || !['prete', 'en_livraison'].includes(o.status) || trip.status !== 'acceptee')
      return res.json({ tracking: null });
    const fresh = d.location && Date.now() - Date.parse(d.location.at) < 10 * 60e3;
    const target = o.status === 'en_livraison' ? o.delivery.to : o.delivery.from;
    res.set('Cache-Control', 'no-store');
    res.json({
      tracking: {
        name: d.name,
        vehicle: d.vehicle,
        phase: o.status === 'en_livraison' ? 'vers_vous' : 'chez_vendeur',
        position: fresh ? { lat: d.location.lat, lng: d.location.lng, at: d.location.at } : null,
        ...(fresh ? eta(d.location, o.delivery.to, d.vehicle) : {}),
        to: target ? { lat: target.lat, lng: target.lng } : null,
      },
    });
  });

  /* ---------- Gérante ---------- */
  const guard = (req, res) => {
    if (isAdmin(req)) return true;
    res.status(403).json({ error: 'Accès gérante requis' });
    return false;
  };

  app.get('/api/admin/mp/disputes', (req, res) => {
    if (!guard(req, res)) return;
    res.json({
      disputes: store
        .listMpOrders()
        .filter(o => o.dispute)
        .sort((a, b) => (a.dispute.at < b.dispute.at ? 1 : -1))
        .map(o => ({
          orderId: o.id,
          shopName: o.shopName,
          buyer: o.buyer,
          total: o.total,
          orderStatus: o.status,
          driverId: o.driverId ?? null,
          problem: PROBLEMS[o.dispute.kind],
          ...o.dispute,
        })),
    });
  });

  app.patch('/api/admin/mp/disputes/:id', (req, res) => {
    if (!guard(req, res)) return;
    const o = store.getMpOrder(clip(req.params.id, 20));
    if (!o?.dispute) return res.status(404).json({ error: 'Signalement introuvable' });
    const status = req.body?.status;
    if (!['ouvert', 'resolu', 'rejete'].includes(status)) return res.status(400).json({ error: 'Statut invalide' });
    const resolution = clip(req.body?.resolution, 400);
    if (status !== 'ouvert' && resolution.length < 3)
      return res.status(400).json({ error: 'Notez la solution trouvée' });
    const saved = store.saveMpOrder({
      ...o,
      dispute: { ...o.dispute, status, resolution, resolvedAt: status === 'ouvert' ? null : now() },
    });
    if (status !== 'ouvert') notify(o.buyerPhone, `Votre signalement sur la commande ${o.id} : ${resolution}`);
    res.json({ dispute: saved.dispute });
  });

  // Masquer un avis déplacé (insulte, hors sujet) : il ne compte plus dans la note
  app.patch('/api/admin/mp/reviews/:id', (req, res) => {
    if (!guard(req, res)) return;
    const o = store.getMpOrder(clip(req.params.id, 20));
    if (!o?.review) return res.status(404).json({ error: 'Avis introuvable' });
    const saved = store.saveMpOrder({ ...o, review: { ...o.review, hidden: !!req.body?.hidden } });
    res.json({ review: saved.review });
  });
}
