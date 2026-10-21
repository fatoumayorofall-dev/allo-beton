// ============================================================
//  DISCUSSIONS ACHETEUR–VENDEUR ET MARCHANDAGE
//  - une discussion par article et par acheteur : questions, réponses, offres de prix ;
//  - l'acheteur propose un prix, le vendeur accepte, refuse ou fait une contre-offre (et inversement) ;
//  - une offre acceptée devient le « prix convenu » : valable 48 h, pour cet acheteur et cet article,
//    c'est lui que le serveur prend à la commande (le navigateur ne fait que proposer) ;
//  - un article « à négocier » ne montre au public qu'une classe de prix : on ne peut le commander
//    qu'après un accord ;
//  - anti-contournement : pas de numéro, de lien, d'e-mail ni de réseau social dans les messages ;
//    l'acheteur ne voit que le nom de la boutique, le vendeur que le prénom de l'acheteur ;
//  - appels par internet (WebRTC, voix seulement) depuis la discussion : le serveur ne fait que mettre
//    les deux téléphones en relation (offre et réponse) ; aucun numéro n'est échangé, la voix est chiffrée
//    de bout en bout ; l'appel est noté dans la discussion (durée, manqué, refusé).
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
/** Sonnerie d'un appel avant « manqué » (secondes) */
const RING_MS = () => (Number(process.env.CALL_RING_SECONDS) || 45) * 1000;
const duration = ms => {
  const s = Math.max(1, Math.round(ms / 1000));
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
};

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

  /* ---------- Appels par internet ---------- */
  // Les appels ne vivent que le temps de la conversation : gardés en mémoire, pas dans la base
  const calls = new Map();
  const ICE = () => [
    { urls: 'stun:stun.l.google.com:19302' },
    // Relais TURN (facultatif) : nécessaire sur certains réseaux mobiles qui bloquent les appels directs
    ...(process.env.TURN_URLS
      ? [
          {
            urls: process.env.TURN_URLS.split(',').map(u => u.trim()),
            username: process.env.TURN_USERNAME,
            credential: process.env.TURN_CREDENTIAL,
          },
        ]
      : []),
  ];
  const sdpOk = v => typeof v === 'string' && v.length > 20 && v.length < 20000 && v.startsWith('v=0');
  /** Fin d'un appel : notée dans la discussion. */
  function finish(call, status) {
    if (call.status === 'termine' || call.status === 'refuse' || call.status === 'manque') return call;
    call.status = status;
    call.endedAt = Date.now();
    const c = store.getMpChat(call.chatId);
    if (c) {
      const text =
        status === 'manque'
          ? '📞 Appel manqué'
          : status === 'refuse'
            ? '📞 Appel refusé'
            : call.answeredAt
              ? `📞 Appel · ${duration(call.endedAt - call.answeredAt)}`
              : '📞 Appel annulé';
      post(c, call.from, { text, system: true });
      if (status === 'manque') {
        const l = store.getMpListing(c.listingId);
        const to = call.to === 'acheteur' ? c.buyerPhone : sellerPhone(store.getMpSeller(c.sellerId));
        notify(
          to,
          `📞 Appel manqué au sujet de « ${l?.title ?? 'un article'} ». Rappelez dans l'application, rubrique Messages.`,
        );
      }
    }
    return call;
  }
  /** Un appel qui sonne trop longtemps devient « manqué ». */
  const fresh = call => {
    if (call.status === 'sonne' && Date.now() - call.createdAt > RING_MS()) finish(call, 'manque');
    return call;
  };
  const callView = (call, role) => {
    const c = store.getMpChat(call.chatId);
    return {
      id: call.id,
      chatId: call.chatId,
      status: call.status,
      incoming: call.to === role,
      with: c ? view(c, role, false).with : '',
      listing: c ? (store.getMpListing(c.listingId)?.title ?? '') : '',
      // L'appelé reçoit l'offre ; l'appelant reçoit la réponse
      sdp: call.to === role ? call.offer : call.answer,
      answeredAt: call.answeredAt,
    };
  };
  const callOf = (req, res) => {
    const user = currentUser(req);
    if (!user) return void res.status(401).json({ error: 'Non connecté' });
    const call = calls.get(clip(req.params.id, 20));
    const c = call && store.getMpChat(call.chatId);
    const role = c && roleIn(c, user);
    if (!role) return void res.status(404).json({ error: 'Appel introuvable' });
    return { call: fresh(call), role };
  };
  setInterval(() => {
    for (const [id, call] of calls) {
      fresh(call);
      if (Date.now() - (call.endedAt ?? call.createdAt) > 3600e3) calls.delete(id);
    }
  }, 15e3).unref?.();

  app.get('/api/mp/call-config', (req, res) => {
    if (!currentUser(req)) return res.status(401).json({ error: 'Non connecté' });
    res.json({ iceServers: ICE(), ringSeconds: RING_MS() / 1000 });
  });

  // Appeler depuis une discussion (offre WebRTC du téléphone de l'appelant)
  app.post('/api/mp/me/chats/:id/call', (req, res) => {
    const me = mine(req, res);
    if (!me) return;
    if (tooMany(res, `mp-call:${me.user.phone}`, 30, 3600e3)) return;
    if (!sdpOk(req.body?.sdp)) return res.status(400).json({ error: 'Appel impossible depuis ce téléphone' });
    const busy = [...calls.values()]
      .map(fresh)
      .find(x => x.chatId === me.c.id && ['sonne', 'en_cours'].includes(x.status));
    if (busy) return res.status(409).json({ error: 'Un appel est déjà en cours' });
    const call = {
      id: code(10),
      chatId: me.c.id,
      from: me.role,
      to: me.role === 'acheteur' ? 'vendeur' : 'acheteur',
      status: 'sonne',
      offer: req.body.sdp,
      answer: null,
      createdAt: Date.now(),
      answeredAt: null,
      endedAt: null,
    };
    calls.set(call.id, call);
    // Si l'autre personne n'a pas l'application ouverte : un message pour la faire venir
    const l = store.getMpListing(me.c.listingId);
    const to = call.to === 'acheteur' ? me.c.buyerPhone : sellerPhone(store.getMpSeller(me.c.sellerId));
    notify(
      to,
      `📞 ${call.from === 'acheteur' ? me.c.buyerName : (store.getMpSeller(me.c.sellerId)?.shopName ?? 'Une boutique')} vous appelle au sujet de « ${l?.title ?? 'un article'} » : ouvrez l'application pour répondre.`,
    );
    res.status(201).json({ call: callView(call, me.role) });
  });

  // Appels qui sonnent pour moi (le téléphone vérifie toutes les quelques secondes)
  app.get('/api/mp/me/calls/incoming', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Non connecté' });
    res.set('Cache-Control', 'no-store');
    const mineRinging = [...calls.values()]
      .map(fresh)
      .filter(x => x.status === 'sonne')
      .map(x => ({ x, c: store.getMpChat(x.chatId) }))
      .filter(({ x, c }) => c && roleIn(c, user) === x.to)
      .map(({ x }) => callView(x, x.to));
    res.json({ calls: mineRinging });
  });

  app.get('/api/mp/me/calls/:id', (req, res) => {
    const me = callOf(req, res);
    if (!me) return;
    res.set('Cache-Control', 'no-store');
    res.json({ call: callView(me.call, me.role) });
  });

  // Décrocher (réponse WebRTC du téléphone de l'appelé)
  app.post('/api/mp/me/calls/:id/answer', (req, res) => {
    const me = callOf(req, res);
    if (!me) return;
    if (me.call.to !== me.role) return res.status(409).json({ error: "C'est votre propre appel" });
    if (me.call.status !== 'sonne') return res.status(409).json({ error: 'Appel terminé' });
    if (!sdpOk(req.body?.sdp)) return res.status(400).json({ error: 'Réponse invalide' });
    Object.assign(me.call, { answer: req.body.sdp, status: 'en_cours', answeredAt: Date.now() });
    res.json({ call: callView(me.call, me.role) });
  });

  // Raccrocher, refuser ou annuler
  app.post('/api/mp/me/calls/:id/end', (req, res) => {
    const me = callOf(req, res);
    if (!me) return;
    const refused = me.call.status === 'sonne' && me.call.to === me.role;
    res.json({ call: callView(finish(me.call, refused ? 'refuse' : 'termine'), me.role) });
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
