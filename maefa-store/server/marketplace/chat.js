// ============================================================
//  DISCUSSIONS ACHETEUR–VENDEUR ET MARCHANDAGE
//  - une discussion par article et par acheteur : questions, réponses, offres de prix ;
//  - l'acheteur propose un prix, le vendeur accepte, refuse ou fait une contre-offre (et inversement) ;
//  - une offre acceptée devient le « prix convenu » : valable 48 h, pour cet acheteur et cet article,
//    c'est lui que le serveur prend à la commande (le navigateur ne fait que proposer) ;
//  - un article « à négocier » ne montre au public qu'une classe de prix : on ne peut le commander
//    qu'après un accord ;
//  - anti-contournement : pas de numéro, de lien, d'e-mail ni de réseau social dans les messages ;
//    l'acheteur ne voit que le nom de la boutique, le vendeur que le prénom de l'acheteur.
// ============================================================
import crypto from 'node:crypto';
import { CONTACT_REFUSED, findContact } from './contact.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code = n => Array.from(crypto.randomBytes(n), b => ALPHABET[b % ALPHABET.length]).join('');
const clip = (v, n) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');
const F = n => `${Math.round(n).toLocaleString('fr-FR')} F`;
/** Durée de validité d'un prix convenu */
export const DEAL_MS = 48 * 3600e3;
/** Un message de notification au plus toutes les 10 minutes par discussion (pas de pluie de messages) */
const NOTIFY_EVERY_MS = 10 * 60e3;

/** Prix convenu encore valable pour cet acheteur et cet article (ou null). */
export function dealFor(chats, listingId, buyerPhone, now = Date.now()) {
  const c = chats.find(x => x.listingId === listingId && x.buyerPhone === buyerPhone && x.deal);
  if (!c || c.deal.orderId || Date.parse(c.deal.until) <= now) return null;
  return { ...c.deal, chatId: c.id };
}

/** Montant d'une offre : entier, entre 100 F et 50 millions. */
export const cleanAmount = v => {
  const n = Math.round(Number(v));
  return Number.isInteger(n) && n >= 100 && n <= 50_000_000 ? n : null;
};

export function registerChatRoutes(app, { limit, store, currentUser, notify, publicListing }) {
  const now = () => new Date().toISOString();
  const tooMany = (res, key, max, ms) => {
    if (limit(key, max, ms)) return false;
    res.status(429).json({ error: 'Trop de messages, réessayez dans un moment.' });
    return true;
  };
  const sellerPhone = v => v?.contactPhone ?? v?.ownerPhone;
  /** Rôle de la personne connectée dans la discussion (ou null). */
  const roleIn = (c, user) => {
    if (c.buyerPhone === user.phone) return 'acheteur';
    const v = store.getMpSeller(c.sellerId);
    return v && (v.ownerPhone === user.phone || v.contactPhone === user.phone) ? 'vendeur' : null;
  };
  const mine = (req, res) => {
    const user = currentUser(req);
    if (!user) return void res.status(401).json({ error: 'Connectez-vous avec votre numéro' });
    const c = store.getMpChat(clip(req.params.id, 20));
    const role = c && roleIn(c, user);
    if (!role) return void res.status(404).json({ error: 'Discussion introuvable' });
    return { user, c, role };
  };

  /** Ce que chacun voit : jamais de numéro ; le prix caché seulement pour le vendeur. */
  function view(c, role, full = true) {
    const l = store.getMpListing(c.listingId);
    const v = store.getMpSeller(c.sellerId);
    const pub = l ? publicListing(l, null) : null;
    const last = c.messages.at(-1) ?? null;
    return {
      id: c.id,
      role,
      listing: pub && {
        id: pub.id,
        title: pub.title,
        photo: pub.photos[0] ?? null,
        negotiable: pub.negotiable,
        price: role === 'vendeur' ? l.price : pub.price,
        priceBand: pub.priceBand,
        variantLabel: pub.variantLabel,
        variants: pub.variants,
      },
      with: role === 'acheteur' ? (v?.shopName ?? 'Boutique') : c.buyerName,
      deal: c.deal && !c.deal.orderId && Date.parse(c.deal.until) > Date.now() ? c.deal : null,
      unread: c.unread?.[role] ?? 0,
      last: last && { text: last.offer ? `Offre : ${F(last.offer.amount)}` : last.text, at: last.at, from: last.from },
      updatedAt: c.updatedAt,
      ...(full ? { messages: c.messages } : {}),
    };
  }

  /** Ajoute un message et prévient l'autre personne (WhatsApp, au plus toutes les 10 min). */
  function post(c, from, message) {
    const other = from === 'acheteur' ? 'vendeur' : 'acheteur';
    const msg = { id: code(8), from, at: now(), ...message };
    const late = !c.notifiedAt?.[other] || Date.now() - Date.parse(c.notifiedAt[other]) > NOTIFY_EVERY_MS;
    const saved = store.saveMpChat({
      ...c,
      messages: [...c.messages, msg].slice(-300),
      unread: { ...(c.unread ?? {}), [other]: (c.unread?.[other] ?? 0) + 1, [from]: 0 },
      ...(late ? { notifiedAt: { ...(c.notifiedAt ?? {}), [other]: now() } } : {}),
    });
    if (late) {
      const l = store.getMpListing(c.listingId);
      const to = other === 'acheteur' ? c.buyerPhone : sellerPhone(store.getMpSeller(c.sellerId));
      notify(
        to,
        `💬 ${message.offer ? `Offre de prix : ${F(message.offer.amount)}` : 'Nouveau message'} au sujet de « ${l?.title ?? 'votre article'} ». Répondez dans l'application, rubrique Messages.`,
      );
    }
    return saved;
  }

  // Ouvrir (ou retrouver) la discussion sur un article, avec un premier message facultatif
  app.post('/api/mp/listings/:id/chat', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Connectez-vous pour écrire au vendeur' });
    if (tooMany(res, `mp-chat-open:${user.phone}`, 40, 3600e3)) return;
    const l = store.getMpListing(clip(req.params.id, 20));
    const v = l && store.getMpSeller(l.sellerId);
    if (!l || l.status !== 'publiee' || v?.status !== 'active')
      return res.status(404).json({ error: 'Article introuvable ou retiré' });
    if (v.ownerPhone === user.phone || v.contactPhone === user.phone)
      return res.status(400).json({ error: "C'est votre propre article" });
    let c = store.listMpChats().find(x => x.listingId === l.id && x.buyerPhone === user.phone);
    if (!c)
      c = store.saveMpChat({
        id: `D-${code(8)}`,
        listingId: l.id,
        sellerId: v.id,
        buyerPhone: user.phone,
        buyerName: clip(user.firstName, 40) || 'Client',
        messages: [],
        unread: { acheteur: 0, vendeur: 0 },
        deal: null,
        createdAt: now(),
      });
    const text = clip(req.body?.text, 500);
    if (text) {
      const contact = findContact(text);
      if (contact) return res.status(400).json({ error: CONTACT_REFUSED(contact) });
      c = post(c, 'acheteur', { text });
    }
    res.status(201).json({ chat: view(c, 'acheteur') });
  });

  // Mes discussions (comme acheteur et comme vendeur)
  app.get('/api/mp/me/chats', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Non connecté' });
    const list = store
      .listMpChats()
      .map(c => ({ c, role: roleIn(c, user) }))
      .filter(x => x.role && x.c.messages.length)
      .map(x => view(x.c, x.role, false));
    res.set('Cache-Control', 'no-store');
    res.json({ chats: list, unread: list.reduce((t, c) => t + c.unread, 0) });
  });

  app.get('/api/mp/me/chats/:id', (req, res) => {
    const me = mine(req, res);
    if (!me) return;
    const c = me.c.unread?.[me.role] ? store.saveMpChat({ ...me.c, unread: { ...me.c.unread, [me.role]: 0 } }) : me.c;
    res.set('Cache-Control', 'no-store');
    res.json({ chat: view(c, me.role) });
  });

  app.post('/api/mp/me/chats/:id/messages', (req, res) => {
    const me = mine(req, res);
    if (!me) return;
    if (tooMany(res, `mp-chat:${me.user.phone}`, 120, 3600e3)) return;
    const text = clip(req.body?.text, 500);
    if (!text) return res.status(400).json({ error: 'Message vide' });
    const contact = findContact(text);
    if (contact) return res.status(400).json({ error: CONTACT_REFUSED(contact) });
    res.status(201).json({ chat: view(post(me.c, me.role, { text }), me.role) });
  });

  // Offre de prix (l'acheteur propose, le vendeur peut répondre par une contre-offre)
  app.post('/api/mp/me/chats/:id/offers', (req, res) => {
    const me = mine(req, res);
    if (!me) return;
    if (tooMany(res, `mp-offer:${me.user.phone}`, 40, 3600e3)) return;
    const amount = cleanAmount(req.body?.amount);
    if (!amount) return res.status(400).json({ error: 'Montant invalide (100 F au moins)' });
    // Une seule offre en attente : la précédente est remplacée
    const messages = me.c.messages.map(m =>
      m.offer?.status === 'en_attente' ? { ...m, offer: { ...m.offer, status: 'remplacee' } } : m,
    );
    const saved = post({ ...me.c, messages }, me.role, { offer: { amount, status: 'en_attente' } });
    res.status(201).json({ chat: view(saved, me.role) });
  });

  // Réponse à une offre : seulement par l'autre personne. Acceptée = prix convenu pour 48 h.
  app.post('/api/mp/me/chats/:id/offers/:msg', (req, res) => {
    const me = mine(req, res);
    if (!me) return;
    const m = me.c.messages.find(x => x.id === clip(req.params.msg, 20));
    if (!m?.offer) return res.status(404).json({ error: 'Offre introuvable' });
    if (m.from === me.role) return res.status(409).json({ error: "C'est votre propre offre : attendez la réponse" });
    if (m.offer.status !== 'en_attente') return res.status(409).json({ error: 'Cette offre a déjà une réponse' });
    const accept = req.body?.accept === true;
    const status = accept ? 'acceptee' : 'refusee';
    const messages = me.c.messages.map(x => (x === m ? { ...x, offer: { ...x.offer, status, answeredAt: now() } } : x));
    const deal = accept
      ? { amount: m.offer.amount, qty: 1, at: now(), until: new Date(Date.now() + DEAL_MS).toISOString() }
      : me.c.deal;
    const saved = post({ ...me.c, messages, deal }, me.role, {
      text: accept
        ? `Offre acceptée : ${F(m.offer.amount)}. Prix valable 48 h, commandez quand vous voulez.`
        : 'Offre refusée.',
      system: true,
    });
    res.json({ chat: view(saved, me.role) });
  });

  return {
    /** Prix convenu valable (pour la commande) */
    dealFor: (listingId, buyerPhone) => dealFor(store.listMpChats(), listingId, buyerPhone),
    /** Commande passée au prix convenu : l'accord est utilisé (une commande par accord) */
    useDeal(chatId, orderId) {
      const c = store.getMpChat(chatId);
      if (c?.deal) store.saveMpChat({ ...c, deal: { ...c.deal, orderId } });
    },
  };
}
