// ============================================================
//  ANTI-FRAUDE (fonctions pures, testées seules)
//  - codes de remise : 4 chiffres pour l'enlèvement (vendeur ou point relais → livreur) et pour
//    le dépôt (acheteur → livreur) ; sans le bon code, le colis n'est ni « enlevé » ni « livré » ;
//  - livreur : plafond d'argent gardé (commissions dues + parts des vendeurs pas encore reçues) ;
//  - acheteur : livraisons ratées (absent, refus) → bloqué à la 2e ; commandes en cours limitées ;
//  - vendeur : montant par commande limité tant que la boutique n'a pas fait ses preuves ;
//  - registre infalsifiable : chaque mouvement d'argent est scellé avec le précédent (HMAC).
// ============================================================
import crypto from 'node:crypto';

/** Essais de code faux tolérés par commande avant de devoir appeler l'équipe */
export const MAX_CODE_TRIES = 5;
/** Livraisons ratées (absent, refus) avant que l'acheteur doive passer par le service client */
export const MAX_STRIKES = 2;
/** Commandes en cours en même temps : premier achat, puis acheteur qui a déjà été livré */
export const OPEN_ORDERS = { first: 5, known: 15 };
/** Ventes livrées avant que la limite « nouvelle boutique » ne s'applique plus */
export const PROVEN_SALES = 3;
/** Après ce délai sans « pas reçu » du vendeur, l'argent envoyé par le livreur est tenu pour reçu */
export const PAYOUT_TRUST_MS = 48 * 3600e3;
const OPEN = new Set(['nouvelle', 'acceptee', 'prete', 'en_livraison', 'retour']);

/** Code de remise à 4 chiffres (tirage cryptographique). */
export const handoverCode = () => String(crypto.randomInt(0, 10000)).padStart(4, '0');
export const newHandover = () => ({ pickup: handoverCode(), dropoff: handoverCode(), tries: 0 });

/**
 * Vérifie un code donné au livreur. Renvoie { ok } ou { error, status, handover } (essais comptés).
 * kind : 'enlevement' et 'retour' (code du vendeur ou du relais), 'depot' (code de l'acheteur).
 */
export function checkHandover(handover, kind, given) {
  if (!handover) return { ok: true }; // anciennes commandes, sans code
  if ((handover.tries ?? 0) >= MAX_CODE_TRIES)
    return { status: 423, error: "Trop d'essais : appelez l'équipe pour débloquer ce colis", handover };
  const expected = kind === 'depot' ? handover.dropoff : handover.pickup;
  const clean = String(given ?? '').replace(/\D/g, '');
  const ok = clean.length === expected.length && crypto.timingSafeEqual(Buffer.from(clean), Buffer.from(expected));
  if (ok) return { ok: true };
  const tries = (handover.tries ?? 0) + 1;
  const left = MAX_CODE_TRIES - tries;
  return {
    status: left > 0 ? 400 : 423,
    error:
      left > 0
        ? `Code faux : demandez le code ${kind === 'depot' ? 'à la cliente ou au client' : 'au vendeur ou au point relais'} (${left} essai${left > 1 ? 's' : ''} restant${left > 1 ? 's' : ''})`
        : "Trop d'essais : appelez l'équipe pour débloquer ce colis",
    handover: { ...handover, tries },
  };
}

/** Livraisons ratées d'un acheteur que la gérante n'a pas encore pardonnées. */
export const buyerStrikes = (orders, phone) =>
  orders.filter(o => o.buyerPhone === phone && o.failedDelivery && !o.failedDelivery.forgiven).length;

/** Peut-il commander `count` commandes de plus ? Renvoie un message d'erreur ou null. */
export function buyerLimit(orders, phone, count) {
  const mine = orders.filter(o => o.buyerPhone === phone);
  if (buyerStrikes(orders, phone) >= MAX_STRIKES)
    return "Deux livraisons n'ont pas pu vous être remises (absence ou refus). Pour commander à nouveau, contactez le service client.";
  const known = mine.some(o => o.status === 'livree');
  const max = known ? OPEN_ORDERS.known : OPEN_ORDERS.first;
  const open = mine.filter(o => OPEN.has(o.status)).length;
  if (open + count > max)
    return known
      ? `Vous avez déjà ${open} commandes en cours : attendez d'en recevoir avant d'en passer d'autres.`
      : `Pour vos premiers achats, ${max} commandes en cours au plus : attendez d'en recevoir une.`;
  return null;
}

/** Nouvelle boutique (moins de PROVEN_SALES ventes livrées, pas « de confiance ») : montant limité. */
export function sellerLimit(seller, delivered, subtotal, max) {
  if (seller.trusted || delivered >= PROVEN_SALES || subtotal <= max) return null;
  return `« ${seller.shopName} » est une nouvelle boutique : ${max.toLocaleString('fr-FR')} F d'articles au plus par commande pour le moment.`;
}

/**
 * Argent que le livreur garde : commissions dues à la plateforme + parts des vendeurs pas encore reçues
 * (une part envoyée compte jusqu'à la confirmation du vendeur, ou 48 h sans « pas reçu »).
 */
export function cashHeld(balance, deliveredOrders, now = Date.now()) {
  const owedToSellers = deliveredOrders
    .filter(o => o.settlement && !o.payout?.receivedAt)
    .filter(o => !o.payout?.sentAt || o.payout.missing || now - Date.parse(o.payout.sentAt) < PAYOUT_TRUST_MS)
    .reduce((t, o) => t + o.settlement.sellerGets, 0);
  return Math.max(0, balance) + owedToSellers;
}

/* ---------- Registre infalsifiable ---------- */

/** JSON aux clés triées : la même empreinte quel que soit l'ordre des champs (PostgreSQL les réordonne). */
export const canonical = v =>
  Array.isArray(v)
    ? `[${v.map(canonical).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v)
          .filter(k => v[k] !== undefined)
          .sort()
          .map(k => `${JSON.stringify(k)}:${canonical(v[k])}`)
          .join(',')}}`
      : JSON.stringify(v ?? null);

/**
 * Registre des mouvements d'argent : chaque ligne contient l'empreinte de la précédente, scellée avec
 * une clé gardée hors de la base. Modifier, supprimer ou insérer une ligne casse la chaîne.
 * store : { listMpLedger(), appendMpLedger(entry) } ; secret : clé du serveur.
 */
export function createLedger({ store, secret, now = () => new Date().toISOString() }) {
  const key = crypto.createHmac('sha256', secret).update('sama-registre-v1').digest();
  const seal = (prev, e) =>
    crypto
      .createHmac('sha256', key)
      .update(`${prev}|${canonical({ seq: e.seq, at: e.at, type: e.type, data: e.data })}`)
      .digest('hex');
  const GENESIS = '0'.repeat(64);

  function append(type, data) {
    const list = store.listMpLedger();
    const last = list.at(-1);
    const entry = { seq: (last?.seq ?? 0) + 1, at: now(), type, data };
    const prev = last?.hash ?? GENESIS;
    return store.appendMpLedger({ ...entry, prev, hash: seal(prev, entry) });
  }

  /** Vérifie toute la chaîne. { ok, count, head, brokenAt } : brokenAt = numéro de la première ligne fausse. */
  function verify() {
    const list = store.listMpLedger();
    let prev = GENESIS;
    for (const [i, e] of list.entries()) {
      if (e.seq !== i + 1 || e.prev !== prev || e.hash !== seal(prev, e))
        return { ok: false, count: list.length, head: list.at(-1)?.hash ?? null, brokenAt: i + 1 };
      prev = e.hash;
    }
    return { ok: true, count: list.length, head: list.at(-1)?.hash ?? null, brokenAt: null };
  }

  return { append, verify };
}
