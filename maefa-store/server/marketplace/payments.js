// ============================================================
//  PLACE DE MARCHÉ — PAIEMENT EN LIGNE ET PARTAGE AUTOMATIQUE DE L'ARGENT
//  La cliente paie en ligne (Wave, Orange Money) au panier ou depuis un live. L'argent arrive sur le compte
//  marchand de la plateforme et y reste tant que la cliente n'a pas son colis. Livraison confirmée (code de
//  la cliente) : la vendeuse reçoit sa part (articles moins la commission ; plus la livraison si elle livre
//  elle-même), le livreur la sienne (sa course moins sa commission) ; la commission et les frais de service
//  restent à la plateforme, sans rien avoir à réclamer. Commande annulée ou refusée : la cliente est
//  remboursée. Moitié-moitié moins cher que prévu : la différence lui est rendue.
//
//  Prestataires :
//  - Wave Business (WAVE_CHECKOUT_KEY) : encaissement (sessions de paiement), confirmation signée
//    (WAVE_WEBHOOK_SECRET) ou vérification directe auprès de Wave ; versements automatiques avec
//    WAVE_PAYOUT_KEY, sinon versements « à verser » que la gérante fait et coche dans son espace.
//  - Mode test (PAYMENTS_SIMULATION) : tout le parcours sans argent réel (site de test, essais).
//  Orange Money en ligne : se branche avec le compte marchand Orange (Max it) quand il est ouvert ;
//  en attendant, l'option n'est proposée qu'en mode test.
// ============================================================
import crypto from 'node:crypto';
import { settlement } from './pricing.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code = n => Array.from(crypto.randomBytes(n), b => ALPHABET[b % ALPHABET.length]).join('');
export const ONLINE_METHODS = ['wave', 'orange_money'];
/** Paiement non terminé au bout de 30 minutes : commande annulée, articles remis en vente */
export const PAY_EXPIRE_MS = 30 * 60e3;
/** Confirmation Wave : signature récente (5 minutes) */
const WEBHOOK_TOLERANCE_S = 300;

/**
 * Partage d'une commande payée en ligne. Renvoie ce que reçoivent la vendeuse et le livreur, ce que garde la
 * plateforme et ce qui revient à la cliente (moitié-moitié moins cher que le prix payé).
 * La vendeuse qui livre elle-même garde le prix de la livraison.
 */
export function splitOf(order, settings) {
  const paid = order.onlinePayment?.amount ?? order.total;
  const sellerCommission = order.commissions?.seller ?? 0;
  if (!order.delivery?.mode || order.delivery.mode === 'vendeur') {
    const seller = order.subtotal - sellerCommission + (order.delivery?.fee ?? 0);
    const platform = sellerCommission + (order.buyerFee ?? 0);
    return { paid, seller, driver: 0, platform, refund: Math.max(0, paid - seller - platform) };
  }
  const share = order.delivery.share ?? order.delivery.fee;
  const m = settlement({ subtotal: order.subtotal, share, buyerFee: order.buyerFee, sellerCommission }, settings);
  return {
    paid,
    seller: m.sellerGets,
    driver: m.driverKeeps,
    platform: m.platformGets,
    refund: Math.max(0, paid - m.collect),
  };
}

/** Livraison ratée (cliente absente ou refus) : on lui rend les articles ; la course du livreur reste due. */
export function failedSplitOf(order, settings) {
  const paid = order.onlinePayment?.amount ?? order.total;
  const share = order.delivery?.share ?? order.delivery?.fee ?? 0;
  const driverCommission = Math.round(share * (settings.driverRate ?? 0));
  const driver = order.delivery?.mode === 'vendeur' ? 0 : share - driverCommission;
  const refund = order.delivery?.mode === 'vendeur' ? paid : Math.min(paid, order.subtotal);
  return { paid, driver, refund, platform: paid - driver - refund };
}

/**
 * Vérifie la signature d'une confirmation Wave : en-tête « Wave-Signature: t=<horodatage>,v1=<signature> »,
 * signature = HMAC-SHA256(secret, horodatage + corps brut), en hexadécimal.
 */
export function verifyWaveSignature(raw, header, secret, now = Date.now()) {
  if (!header || !secret || !raw) return false;
  const parts = String(header)
    .split(',')
    .map(x => x.trim().split('='));
  const t = parts.find(([k]) => k === 't')?.[1];
  const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || !sigs.length || Math.abs(now / 1000 - Number(t)) > WEBHOOK_TOLERANCE_S) return false;
  const expected = Buffer.from(crypto.createHmac('sha256', secret).update(`${t}${raw}`).digest('hex'));
  return sigs.some(s => s.length === expected.length && crypto.timingSafeEqual(Buffer.from(s), expected));
}

/* ---------- Prestataires ---------- */

/** Wave Business : sessions de paiement, et versements si la clé « payout » est donnée */
function waveProvider({ checkoutKey, payoutKey, webhookSecret, fetchImpl }) {
  const api = async (key, path, { method = 'GET', body, idem } = {}) => {
    const r = await fetchImpl(`https://api.wave.com${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...(idem ? { 'idempotency-key': idem } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000),
    });
    const data = await r.json().catch(() => null);
    if (!r.ok) throw new Error(data?.message || data?.code || `Wave : erreur ${r.status}`);
    return data;
  };
  return {
    name: 'wave',
    methods: ['wave'],
    automaticPayouts: !!payoutKey,
    async checkout(p, urls) {
      const s = await api(checkoutKey, '/v1/checkout/sessions', {
        method: 'POST',
        idem: p.id,
        body: {
          amount: String(p.amount),
          currency: 'XOF',
          client_reference: p.id,
          success_url: urls.success,
          error_url: urls.error,
        },
      });
      return { sessionId: s.id, url: s.wave_launch_url };
    },
    /** État d'une session : 'payee', 'expiree' ou null (pas encore) */
    async status(p) {
      if (!p.sessionId) return null;
      const s = await api(checkoutKey, `/v1/checkout/sessions/${encodeURIComponent(p.sessionId)}`);
      if (s.payment_status === 'succeeded') return 'payee';
      return s.checkout_status === 'expired' ? 'expiree' : null;
    },
    payout: payoutKey
      ? async po => {
          const r = await api(payoutKey, '/v1/payout', {
            method: 'POST',
            idem: po.id,
            body: {
              currency: 'XOF',
              receive_amount: String(po.amount),
              mobile: po.to,
              name: po.name,
              client_reference: po.id,
              payment_reason: po.reason.slice(0, 40),
            },
          });
          return {
            status: r.status === 'succeeded' ? 'versee' : r.status === 'failed' ? 'echec' : 'en_cours',
            providerId: r.id ?? null,
            error: r.payout_error?.error_message ?? null,
          };
        }
      : null,
    verify: (raw, headers) => verifyWaveSignature(raw, headers['wave-signature'], webhookSecret),
    /** Événement Wave → { ref, status } */
    event(body) {
      const d = body?.data ?? {};
      if (body?.type === 'checkout.session.completed' && d.payment_status === 'succeeded')
        return { ref: d.client_reference, status: 'payee' };
      if (body?.type === 'checkout.session.payment_failed') return { ref: d.client_reference, status: 'echec' };
      return null;
    },
  };
}

/** Mode test : page de paiement simulée sur le site ; versements simulés (« auto ») ou faits à la main */
function simulationProvider(manual) {
  return {
    name: 'simulation',
    methods: ONLINE_METHODS,
    automaticPayouts: !manual,
    async checkout(p) {
      return { sessionId: `SIM-${p.id}`, url: `/m/paiement/${p.id}` };
    },
    async status() {
      return null;
    },
    payout: manual ? null : async po => ({ status: 'versee', providerId: `SIM-${po.id}`, error: null }),
    verify: () => false,
    event: () => null,
  };
}

/**
 * Service de paiement. `store` : commandes ; `ledger` : registre ; `hooks` : ce que fait la place de marché
 * quand un paiement arrive (prévenir, lancer la livraison) ou n'arrive pas (annuler).
 */
export function createPayments({ store, settings, ledger, notify, siteUrl, env = process.env, fetchImpl = fetch }) {
  const now = () => new Date().toISOString();
  const sim = (env.PAYMENTS_SIMULATION ?? '').trim();
  const provider = env.WAVE_CHECKOUT_KEY
    ? waveProvider({
        checkoutKey: env.WAVE_CHECKOUT_KEY,
        payoutKey: env.WAVE_PAYOUT_KEY,
        webhookSecret: env.WAVE_WEBHOOK_SECRET,
        fetchImpl,
      })
    : sim && sim !== '0'
      ? simulationProvider(sim === 'manuel')
      : null;
  const hooks = { onPaid: () => {}, onUnpaid: () => {} };

  const ordersOf = id => store.listMpOrders().filter(o => o.onlinePayment?.id === id);
  const methods = () => provider?.methods ?? [];
  const sellerPayTo = v => ({
    to: v?.payout?.phone ?? v?.contactPhone ?? v?.ownerPhone,
    name: v?.shopName ?? 'Vendeuse',
  });

  /** Résumé d'un paiement (plusieurs commandes d'un même panier) */
  function summary(id) {
    const orders = ordersOf(id);
    if (!orders.length) return null;
    const p = orders[0].onlinePayment;
    return {
      id,
      method: p.method,
      provider: p.provider,
      status: p.status,
      amount: orders.reduce((t, o) => t + o.onlinePayment.amount, 0),
      url: p.status === 'en_attente' ? p.url : null,
      createdAt: p.createdAt,
      paidAt: p.paidAt ?? null,
      buyerPhone: orders[0].buyerPhone,
      orders: orders.map(o => o.id),
      test: p.provider === 'simulation',
    };
  }
  const setPayment = (id, patch) => {
    for (const o of ordersOf(id)) store.saveMpOrder({ ...o, onlinePayment: { ...o.onlinePayment, ...patch } });
  };

  /** Lance le paiement des commandes d'un panier ; renvoie { id, url } */
  async function start(orders, method) {
    if (!provider || !provider.methods.includes(method)) throw new Error('Paiement en ligne indisponible');
    const id = orders[0].onlinePayment.id;
    const amount = orders.reduce((t, o) => t + o.onlinePayment.amount, 0);
    const base = siteUrl();
    const s = await provider.checkout(
      { id, amount, method },
      { success: `${base}/m/paiement/${id}?retour=ok`, error: `${base}/m/paiement/${id}?retour=erreur` },
    );
    setPayment(id, { sessionId: s.sessionId, url: s.url, provider: provider.name });
    return { id, url: s.url };
  }

  /** Paiement reçu : une seule fois, même si Wave le confirme plusieurs fois */
  function markPaid(id, by) {
    const orders = ordersOf(id).filter(o => o.onlinePayment.status === 'en_attente');
    // Confirmé après l'annulation (paiement fini juste après les 30 minutes) : la cliente est remboursée
    const late = ordersOf(id).filter(o => ['expiree', 'annulee', 'echec'].includes(o.onlinePayment.status));
    if (!orders.length && late.length && by !== 'test') {
      setPayment(id, { status: 'payee', paidAt: now(), confirmedBy: by, late: true });
      const s = summary(id);
      ledger.append('paiement_en_ligne', {
        paymentId: id,
        method: s.method,
        amount: s.amount,
        orders: s.orders,
        late: true,
      });
      for (const o of ordersOf(id)) refund(o);
      return summary(id);
    }
    if (!orders.length) return summary(id);
    setPayment(id, { status: 'payee', paidAt: now(), confirmedBy: by });
    const s = summary(id);
    ledger.append('paiement_en_ligne', { paymentId: id, method: s.method, amount: s.amount, orders: s.orders });
    hooks.onPaid(ordersOf(id));
    return summary(id);
  }
  function markUnpaid(id, status) {
    const orders = ordersOf(id).filter(o => o.onlinePayment.status === 'en_attente');
    if (!orders.length) return summary(id);
    setPayment(id, { status });
    for (const o of ordersOf(id)) hooks.onUnpaid(o, status);
    return summary(id);
  }

  /** Vérifie un paiement auprès du prestataire (retour de la cliente, ou confirmation manquée) */
  async function refresh(id) {
    const s = summary(id);
    if (!s || s.status !== 'en_attente' || !provider) return s;
    const o = ordersOf(id)[0];
    const st = await provider.status(o.onlinePayment).catch(() => null);
    if (st === 'payee') return markPaid(id, 'verification');
    if (st === 'expiree' || Date.now() - Date.parse(s.createdAt) > PAY_EXPIRE_MS) return markUnpaid(id, 'expiree');
    return s;
  }

  /* ---------- Versements (vendeuse, livreur, remboursements) ---------- */
  async function execute(orderId, payoutId) {
    const o = store.getMpOrder(orderId);
    const po = o?.payouts?.find(x => x.id === payoutId);
    if (!po || po.status === 'versee') return po;
    let patch;
    if (!provider?.payout) patch = { status: 'a_verser' };
    else
      try {
        const r = await provider.payout(po);
        patch = {
          status: r.status,
          providerId: r.providerId,
          error: r.error,
          ...(r.status === 'versee' ? { sentAt: now() } : {}),
        };
      } catch (e) {
        patch = { status: 'echec', error: String(e.message).slice(0, 200) };
      }
    const fresh = store.getMpOrder(orderId);
    store.saveMpOrder({ ...fresh, payouts: fresh.payouts.map(x => (x.id === payoutId ? { ...x, ...patch } : x)) });
    ledger.append('versement', { payoutId, orderId, kind: po.kind, amount: po.amount, status: patch.status });
    if (patch.status === 'versee')
      notify(
        po.to,
        po.kind === 'remboursement'
          ? `💸 Remboursement de ${po.amount.toLocaleString('fr-FR')} F envoyé sur votre Wave (commande ${orderId}).`
          : `💸 ${po.amount.toLocaleString('fr-FR')} F envoyés sur votre Wave pour la commande ${orderId}.`,
      );
    return { ...po, ...patch };
  }
  function addPayouts(order, list) {
    const items = list
      .filter(x => x.amount > 0 && x.to)
      .map(x => ({ id: `V-${code(8)}`, status: 'a_faire', createdAt: now(), ...x }));
    if (!items.length) return [];
    const fresh = store.getMpOrder(order.id);
    store.saveMpOrder({ ...fresh, payouts: [...(fresh.payouts ?? []), ...items] });
    for (const po of items) execute(order.id, po.id).catch(() => {});
    return items;
  }

  /** Livraison confirmée : la vendeuse, le livreur (et la cliente pour une différence) reçoivent leur part */
  function release(order) {
    if (order.onlinePayment?.status !== 'payee' || order.payouts?.some(p => p.kind === 'vendeur')) return [];
    const s = splitOf(order, settings());
    const v = store.getMpSeller(order.sellerId);
    const d = order.driverId ? store.getMpDriver(order.driverId) : null;
    ledger.append('partage', {
      orderId: order.id,
      paid: s.paid,
      seller: s.seller,
      driver: s.driver,
      platform: s.platform,
      refund: s.refund,
    });
    return addPayouts(order, [
      { kind: 'vendeur', amount: s.seller, ...sellerPayTo(v), reason: `Vente ${order.id}` },
      ...(d
        ? [
            {
              kind: 'livreur',
              amount: s.driver,
              to: d.payoutPhone ?? d.ownerPhone,
              name: d.name,
              reason: `Course ${order.id}`,
            },
          ]
        : []),
      {
        kind: 'remboursement',
        amount: s.refund,
        to: order.buyerPhone,
        name: order.buyer?.name ?? 'Cliente',
        reason: `Moitié-moitié ${order.id}`,
      },
    ]);
  }
  /** Commande annulée ou refusée après paiement : la cliente est remboursée (tout, ou les articles si livraison ratée) */
  function refund(order, failed = false) {
    if (order.onlinePayment?.status !== 'payee' || order.payouts?.some(p => p.kind === 'remboursement')) return [];
    const st = settings();
    const s = failed ? failedSplitOf(order, st) : { refund: order.onlinePayment.amount, driver: 0 };
    const d = failed && order.driverId ? store.getMpDriver(order.driverId) : null;
    ledger.append('remboursement', { orderId: order.id, amount: s.refund, failed });
    const fresh = store.getMpOrder(order.id);
    store.saveMpOrder({ ...fresh, onlinePayment: { ...fresh.onlinePayment, status: 'remboursee' } });
    return addPayouts(order, [
      {
        kind: 'remboursement',
        amount: s.refund,
        to: order.buyerPhone,
        name: order.buyer?.name ?? 'Cliente',
        reason: `Remboursement ${order.id}`,
      },
      ...(d
        ? [
            {
              kind: 'livreur',
              amount: s.driver,
              to: d.payoutPhone ?? d.ownerPhone,
              name: d.name,
              reason: `Course ${order.id}`,
            },
          ]
        : []),
    ]);
  }

  // Paiements abandonnés : vérifiés auprès du prestataire, puis annulés au bout de 30 minutes
  const sweep = setInterval(() => {
    const seen = new Set();
    for (const o of store.listMpOrders()) {
      const p = o.onlinePayment;
      if (p?.status === 'en_attente' && !seen.has(p.id) && Date.now() - Date.parse(p.createdAt) > PAY_EXPIRE_MS) {
        seen.add(p.id);
        refresh(p.id).catch(() => {});
      }
    }
  }, 60e3);
  sweep.unref?.();

  return {
    get enabled() {
      return !!provider;
    },
    get test() {
      return provider?.name === 'simulation';
    },
    get automaticPayouts() {
      return !!provider?.automaticPayouts;
    },
    providerName: () => provider?.name ?? null,
    /** Partage prévu d'une commande (avant la livraison) */
    splitPreview: order => splitOf(order, settings()),
    methods,
    hooks,
    start,
    summary,
    refresh,
    markPaid,
    markUnpaid,
    release,
    refund,
    execute,
    provider: () => provider,
    /** Paiement simulé (mode test seulement) */
    simulate(id, ok) {
      if (provider?.name !== 'simulation') return null;
      return ok ? markPaid(id, 'test') : markUnpaid(id, 'annulee');
    },
  };
}
