// ============================================================
//  PLACE DE MARCHÉ — VENTES EN DIRECT (LIVE)
//  La vendeuse filme ses articles avec son téléphone ; ses abonnées sont prévenues sur WhatsApp et
//  regardent, commentent, envoient des cœurs et commandent sans quitter le live.
//  - Vidéo : le téléphone de la vendeuse enregistre des morceaux de 3 s (chacun lisible seul) et les
//    envoie au serveur ; les spectatrices les lisent à la suite. Simple HTTPS : passe partout, même
//    là où les appels directs sont bloqués ; seuls les derniers morceaux sont gardés, en mémoire.
//  - Articles du live : la vendeuse en présente un à l'écran (épinglé) et peut fixer un « prix live »,
//    valable pendant le live et 15 minutes après (le serveur l'applique à la commande).
//  - Commentaires : connectée, prénom seulement ; pas de numéro, lien ni réseau social (les ventes
//    restent dans l'application) ; la vendeuse peut masquer une personne ; signalement à la gérante.
//  - La gérante voit les lives en cours et peut en arrêter un (contrefaçon, contenu interdit).
//  - Live programmé : la vendeuse annonce la date ; les clientes touchent « Me prévenir » et reçoivent un
//    message 15 minutes avant, puis au début. Offre flash : un prix pendant quelques minutes, en quantité
//    limitée (compte à rebours à l'écran, le serveur décompte les pièces). Bandeau d'annonce de la vendeuse.
// ============================================================
import crypto from 'node:crypto';
import express from 'express';
import { CONTACT_REFUSED, findContact } from './contact.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code = n => Array.from(crypto.randomBytes(n), b => ALPHABET[b % ALPHABET.length]).join('');
const clip = (v, n) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');

/** Morceaux gardés par live (≈ 30 s de vidéo) */
const KEEP_SEGMENTS = 10;
/** Taille d'un morceau (3 s de vidéo en qualité téléphone ≈ 200 Ko) */
const MAX_SEGMENT_BYTES = 3 * 1024 * 1024;
/** Lives en même temps sur la plateforme */
const MAX_LIVES = 30;
/** Prix live encore valable après la fin (le temps de finir sa commande) */
export const LIVE_PRICE_GRACE_MS = 15 * 60e3;
/** Sans vidéo depuis 20 s : coupure (réseau de la vendeuse) ; 5 min : live terminé */
const STALL_MS = 20e3;
const DROP_MS = 5 * 60e3;
/** Spectatrice comptée si elle a donné signe de vie depuis 12 s */
const VIEWER_MS = 12e3;
/** Abonnées prévenues au plus une fois toutes les 3 h par boutique */
const NOTICE_EVERY_MS = 3 * 3600e3;
const MIME = /^video\/(webm|mp4)(;\s*codecs="?[\w.,\s]+"?)?$/i;
/** Offre flash : durées proposées (minutes) ; quelques minutes de plus pour finir la commande */
export const FLASH_MINUTES = [2, 5, 10, 15];
const FLASH_GRACE_MS = 3 * 60e3;
/** Live programmé : de 5 minutes à 14 jours à l'avance ; rappel 15 minutes avant */
const SCHEDULE_MIN_MS = 5 * 60e3;
const SCHEDULE_MAX_MS = 14 * 864e5;
const SOON_MS = 15 * 60e3;
const fmtDate = iso =>
  new Date(iso).toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Dakar',
  });

/** Prix live autorisé : entre 100 F et le prix de l'article (une vraie remise, jamais plus cher). */
export const cleanLivePrice = (v, price) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Math.round(Number(v));
  return Number.isInteger(n) && n >= 100 && n <= price ? n : undefined;
};

export function registerLiveRoutes(
  app,
  { limit, store, currentUser, isAdmin, notify, publicSeller, publicListing, visibleListing, siteUrl },
) {
  const lives = new Map();
  const now = () => new Date().toISOString();
  const tooMany = (res, key, max, ms) => {
    if (limit(key, max, ms)) return false;
    res.status(429).json({ error: 'Trop de demandes, réessayez dans un moment.' });
    return true;
  };
  const sellerPhone = v => v?.contactPhone ?? v?.ownerPhone;
  const isOn = l => l.status === 'en_direct';
  const stateOf = l => (isOn(l) && Date.now() - l.lastSegmentAt > STALL_MS ? 'coupure' : l.status);
  const viewersOf = l => {
    const t = Date.now() - VIEWER_MS;
    let n = 0;
    for (const [k, at] of l.viewers)
      if (at > t) n++;
      else l.viewers.delete(k);
    return n;
  };
  /** Live en cours d'une boutique (ou null) */
  const currentFor = sellerId => [...lives.values()].find(l => l.sellerId === sellerId && isOn(l)) ?? null;
  const system = (l, text) => {
    l.comments.push({ id: l.nextComment++, name: '', text, at: now(), system: true });
    l.comments = l.comments.slice(-200);
  };

  /** Offre flash en cours (compte à rebours, pièces restantes) ; `grace` : encore commandable */
  const flashOn = (p, grace = 0) => !!p.flash && Date.now() <= p.flash.until + grace && p.flash.left > 0;
  const flashView = p =>
    flashOn(p)
      ? { price: p.flash.price, until: new Date(p.flash.until).toISOString(), left: p.flash.left, qty: p.flash.qty }
      : null;
  /** Articles du live encore en vente, avec leur prix live et leur offre flash */
  const productsOf = l =>
    l.products
      .map(p => {
        const found = visibleListing(p.listingId);
        return found
          ? { ...publicListing(found.listing, found.seller), livePrice: p.livePrice, flash: flashView(p) }
          : null;
      })
      .filter(Boolean);
  const cover = (l, v) => {
    const first = l.products.map(p => store.getMpListing(p.listingId)).find(Boolean);
    return first?.photos?.[0] ?? v?.cover ?? v?.logo ?? null;
  };
  const summary = l => {
    const v = store.getMpSeller(l.sellerId);
    return {
      id: l.id,
      title: l.title,
      status: stateOf(l),
      startedAt: l.startedAt,
      endedAt: l.endedAt,
      viewers: viewersOf(l),
      likes: l.likes,
      cover: cover(l, v),
      seller: v ? publicSeller(v) : null,
    };
  };
  const fullView = l => ({
    ...summary(l),
    seq: l.seq,
    mime: l.mime,
    pinned: l.pinned,
    banner: l.banner ?? null,
    products: productsOf(l),
  });

  /**
   * Prix d'un article pour une commande : offre flash en cours (et 3 minutes après, s'il reste des pièces),
   * sinon prix live (pendant le live et 15 minutes après), sinon null. `flashLeft` : pièces au prix flash.
   */
  function priceFor(listing) {
    let found = null;
    for (const l of lives.values()) {
      if (l.sellerId !== listing.sellerId) continue;
      if (!isOn(l) && Date.now() - Date.parse(l.endedAt) > LIVE_PRICE_GRACE_MS) continue;
      const p = l.products.find(x => x.listingId === listing.id);
      if (p && flashOn(p, FLASH_GRACE_MS)) return { price: p.flash.price, liveId: l.id, flashLeft: p.flash.left };
      if (p?.livePrice && !found) found = { price: p.livePrice, liveId: l.id };
    }
    return found;
  }
  /** Commande passée : annonce anonyme dans le live, compteur des ventes, pièces flash décomptées */
  function onOrder(order) {
    for (const x of order.lines.filter(line => line.flash)) {
      const l = lives.get(x.liveId);
      const p = l?.products.find(y => y.listingId === x.listingId);
      if (!p?.flash) continue;
      p.flash.left = Math.max(0, p.flash.left - x.qty);
      if (isOn(l))
        system(
          l,
          p.flash.left
            ? `⚡ Plus que ${p.flash.left} « ${x.title} » au prix flash !`
            : `⚡ Offre flash épuisée : « ${x.title} »`,
        );
    }
    const l = currentFor(order.sellerId);
    if (!l) return;
    const lines = order.lines.filter(x => l.products.some(p => p.listingId === x.listingId));
    if (!lines.length) return;
    l.sales += 1;
    l.amount += lines.reduce((t, x) => t + x.price * x.qty, 0);
    system(l, `🛍️ Une cliente vient de commander « ${lines[0].title} »`);
  }

  /* ---------- Lives programmés (gardés dans la boutique : ils survivent à un redémarrage) ---------- */
  const scheduleOf = v =>
    v?.liveSchedule && Date.parse(v.liveSchedule.at) > Date.now() - 30 * 60e3 ? v.liveSchedule : null;
  /** Prochain live d'une boutique, pour sa vitrine (`phone` : la cliente a-t-elle demandé un rappel ?) */
  const upcomingFor = (v, phone) => {
    const s = scheduleOf(v);
    return s
      ? { title: s.title, at: s.at, reminders: s.reminders.length, reminded: !!phone && s.reminders.includes(phone) }
      : null;
  };
  const shopLink = v => `${siteUrl()}/m/boutique/${v.slug}`;
  function end(l, by, reason = '') {
    if (!isOn(l)) return l;
    l.status = 'termine';
    l.endedAt = now();
    l.endedBy = by;
    l.segments = [];
    system(
      l,
      by === 'gerante' ? `Live arrêté par la plateforme${reason ? ` : ${reason}` : ''}` : 'Le live est terminé',
    );
    const v = store.getMpSeller(l.sellerId);
    // Bilan gardé dans la boutique (tableau de bord) : les 30 derniers lives
    if (v)
      store.saveMpSeller({
        ...v,
        liveHistory: [
          ...(v.liveHistory ?? []),
          {
            id: l.id,
            title: l.title,
            startedAt: l.startedAt,
            endedAt: l.endedAt,
            sales: l.sales,
            amount: l.amount,
            peak: l.peak,
            likes: l.likes,
            endedBy: by,
          },
        ].slice(-30),
      });
    if (by !== 'vendeur')
      notify(
        sellerPhone(v),
        by === 'gerante'
          ? `⛔ Votre live « ${l.title} » a été arrêté par la plateforme${reason ? ` : ${reason}` : ''}.`
          : `Votre live « ${l.title} » s'est arrêté (plus de vidéo depuis 5 minutes).`,
      );
    return l;
  }

  // Coupures : plus de vidéo → « coupure » puis fin ; les lives terminés sont oubliés au bout d'une heure ;
  // lives programmés : rappel 15 minutes avant, oubliés 2 h après l'heure prévue s'ils n'ont pas eu lieu
  let ticks = 0;
  const sweep = setInterval(() => {
    for (const l of lives.values()) {
      if (isOn(l) && Date.now() - l.lastSegmentAt > DROP_MS) end(l, 'coupure');
      if (!isOn(l) && Date.now() - Date.parse(l.endedAt) > 3600e3) lives.delete(l.id);
    }
    if (ticks++ % 4) return;
    for (const v of store.listMpSellers()) {
      const s = v.liveSchedule;
      if (!s) continue;
      const left = Date.parse(s.at) - Date.now();
      if (left < -2 * 3600e3) store.saveMpSeller({ ...v, liveSchedule: null });
      else if (left <= SOON_MS && left > 0 && !s.soonAt) {
        store.saveMpSeller({ ...v, liveSchedule: { ...s, soonAt: now() } });
        for (const phone of s.reminders)
          notify(phone, `⏰ Dans 15 minutes : live de « ${v.shopName} » : « ${s.title} ». ${shopLink(v)}`);
      }
    }
  }, 15e3);
  sweep.unref?.();

  const findLive = (req, res) => {
    const l = lives.get(clip(req.params.id, 20));
    if (!l) return void res.status(404).json({ error: 'Live introuvable ou terminé' });
    return l;
  };
  /** Live de la vendeuse connectée */
  const myLive = (req, res) => {
    const user = currentUser(req);
    if (!user) return void res.status(401).json({ error: 'Connectez-vous' });
    const l = findLive(req, res);
    if (!l) return;
    const v = store.getMpSeller(l.sellerId);
    if (v?.ownerPhone !== user.phone) return void res.status(403).json({ error: "Ce n'est pas votre live" });
    return { user, live: l, seller: v };
  };
  /** Articles choisis pour le live : les siens, en vente, 30 au plus, avec un prix live facultatif */
  const cleanProducts = (list, sellerId) => {
    if (!Array.isArray(list)) return { error: 'Choisissez les articles du live' };
    const out = [];
    for (const p of list.slice(0, 30)) {
      const found = visibleListing(clip(p?.listingId, 20));
      if (!found || found.listing.sellerId !== sellerId) return { error: 'Un article choisi n’est pas en vente' };
      const livePrice = cleanLivePrice(p.livePrice, found.listing.price);
      if (livePrice === undefined)
        return { error: `« ${found.listing.title} » : le prix live doit être plus bas que le prix de l'article` };
      if (!out.some(x => x.listingId === found.listing.id)) out.push({ listingId: found.listing.id, livePrice });
    }
    return { value: out };
  };

  /* ---------- Public ---------- */
  app.get('/api/mp/lives', (_req, res) => {
    res.json({
      lives: [...lives.values()]
        .filter(isOn)
        .map(summary)
        .sort((a, b) => Number(b.seller?.featured) - Number(a.seller?.featured) || b.viewers - a.viewers),
    });
  });
  // Lives à venir sur la plateforme (accueil)
  app.get('/api/mp/lives/upcoming', (req, res) => {
    const phone = currentUser(req)?.phone;
    res.json({
      upcoming: store
        .listMpSellers()
        .filter(v => v.status === 'active' && scheduleOf(v) && !currentFor(v.id))
        .map(v => ({ ...upcomingFor(v, phone), seller: publicSeller(v) }))
        .sort((a, b) => (a.at < b.at ? -1 : 1))
        .slice(0, 20),
    });
  });
  // État du live, nouveaux commentaires (après « after ») ; « viewer » : compte la spectatrice
  app.get('/api/mp/lives/:id', (req, res) => {
    const l = findLive(req, res);
    if (!l) return;
    const viewer = clip(req.query.viewer, 40);
    if (viewer && isOn(l) && (l.viewers.size < 5000 || l.viewers.has(viewer))) {
      l.viewers.set(viewer, Date.now());
      l.peak = Math.max(l.peak, viewersOf(l));
    }
    const after = Number(req.query.after) || 0;
    res.set('Cache-Control', 'no-store').json({
      live: fullView(l),
      comments: l.comments
        .filter(c => c.id > after && !l.hidden.has(c.id))
        .slice(-50)
        .map(publicComment),
      hidden: [...l.hidden].slice(-50),
    });
  });
  const publicComment = c => ({
    id: c.id,
    name: c.name,
    text: c.text,
    at: c.at,
    system: !!c.system,
    seller: !!c.seller,
  });
  app.get('/api/mp/lives/:id/segments/:seq', (req, res) => {
    const l = findLive(req, res);
    if (!l) return;
    const s = l.segments.find(x => x.seq === Number(req.params.seq));
    if (!s) return res.status(404).json({ error: 'Morceau indisponible' });
    res.set({ 'Content-Type': s.mime, 'Cache-Control': 'public, max-age=60' }).send(s.data);
  });
  app.post('/api/mp/lives/:id/comments', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Connectez-vous pour commenter' });
    const l = findLive(req, res);
    if (!l) return;
    if (!isOn(l)) return res.status(409).json({ error: 'Le live est terminé' });
    if (tooMany(res, `mp-live-c:${user.phone}`, 10, 60e3)) return;
    if (l.muted.has(user.phone)) return res.status(403).json({ error: 'La vendeuse a masqué vos commentaires' });
    const text = clip(req.body?.text, 200);
    if (!text) return res.status(400).json({ error: 'Écrivez un commentaire' });
    const contact = findContact(text);
    if (contact) return res.status(400).json({ error: CONTACT_REFUSED(contact) });
    const v = store.getMpSeller(l.sellerId);
    const seller = v?.ownerPhone === user.phone;
    const c = {
      id: l.nextComment++,
      name: seller ? v.shopName : clip(user.firstName, 30) || 'Cliente',
      text,
      at: now(),
      phone: user.phone,
      ...(seller ? { seller: true } : {}),
    };
    l.comments = [...l.comments, c].slice(-200);
    res.status(201).json({ comment: publicComment(c) });
  });
  app.post('/api/mp/lives/:id/like', (req, res) => {
    const l = findLive(req, res);
    if (!l) return;
    if (tooMany(res, `mp-live-l:${req.ip}`, 60, 60e3)) return;
    if (isOn(l)) l.likes += Math.min(10, Math.max(1, Math.round(Number(req.body?.n) || 1)));
    res.json({ likes: l.likes });
  });
  app.post('/api/mp/lives/:id/report', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Connectez-vous pour signaler' });
    const l = findLive(req, res);
    if (!l) return;
    if (tooMany(res, `mp-live-r:${user.phone}`, 3, 3600e3)) return;
    if (!l.reports.some(r => r.phone === user.phone))
      l.reports.push({ phone: user.phone, reason: clip(req.body?.reason, 200), at: now() });
    const v = store.getMpSeller(l.sellerId);
    if (process.env.OWNER_WHATSAPP)
      notify(
        process.env.OWNER_WHATSAPP,
        `🚩 Live signalé : « ${l.title} » (${v?.shopName}). ${clip(req.body?.reason, 200)}\nVoir : ${siteUrl()}/m/live/${l.id}`,
      );
    res.json({ ok: true });
  });

  // « Me prévenir » : rappel 15 minutes avant et au début du live
  app.post('/api/mp/sellers/:slug/live-reminder', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Connectez-vous pour être prévenue' });
    if (tooMany(res, `mp-live-rem:${user.phone}`, 30, 3600e3)) return;
    const v = store.findMpSellerBySlug(clip(req.params.slug, 60));
    const s = scheduleOf(v);
    if (!s) return res.status(404).json({ error: 'Pas de live programmé' });
    const on = req.body?.on !== false;
    const others = s.reminders.filter(p => p !== user.phone);
    const reminders = on ? [...others, user.phone].slice(-2000) : others;
    store.saveMpSeller({ ...v, liveSchedule: { ...s, reminders } });
    res.json({ on, reminders: reminders.length });
  });

  /* ---------- Vendeuse ---------- */
  // Programmer un live : la date est annoncée aux abonnées, les clientes demandent un rappel
  app.post('/api/mp/me/lives/schedule', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Connectez-vous' });
    const v = store.findMpSellerByOwner(user.phone);
    if (!v || v.status !== 'active')
      return res.status(403).json({ error: 'Le live est ouvert aux boutiques validées' });
    if (tooMany(res, `mp-live-plan:${user.phone}`, 10, 3600e3)) return;
    const at = Date.parse(req.body?.at);
    if (!Number.isFinite(at) || at < Date.now() + SCHEDULE_MIN_MS || at > Date.now() + SCHEDULE_MAX_MS)
      return res.status(400).json({ error: 'Choisissez une date entre 5 minutes et 14 jours à partir de maintenant' });
    const title = clip(req.body?.title, 80) || `Live de ${v.shopName}`;
    const contact = findContact(title);
    if (contact) return res.status(400).json({ error: CONTACT_REFUSED(contact) });
    const previous = scheduleOf(v);
    const schedule = {
      id: previous?.id ?? `P-${code(6)}`,
      title,
      at: new Date(at).toISOString(),
      reminders: previous?.reminders ?? [],
      createdAt: now(),
      soonAt: null,
    };
    const announce =
      (v.followers ?? []).length &&
      !(v.scheduleNoticeAt && Date.now() - Date.parse(v.scheduleNoticeAt) < NOTICE_EVERY_MS);
    store.saveMpSeller({ ...v, liveSchedule: schedule, ...(announce ? { scheduleNoticeAt: now() } : {}) });
    if (announce)
      for (const f of v.followers.slice(0, 300))
        notify(
          f.phone,
          `📅 « ${v.shopName} » fera un live ${fmtDate(schedule.at)} : « ${title} ». Touchez « Me prévenir » : ${shopLink(v)}`,
        );
    res.status(201).json({ schedule: upcomingFor(store.getMpSeller(v.id)) });
  });
  app.delete('/api/mp/me/lives/schedule', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Connectez-vous' });
    const v = store.findMpSellerByOwner(user.phone);
    const s = scheduleOf(v);
    if (!s) return res.status(404).json({ error: 'Pas de live programmé' });
    store.saveMpSeller({ ...v, liveSchedule: null });
    for (const phone of s.reminders) notify(phone, `Le live « ${s.title} » de « ${v.shopName} » est annulé.`);
    res.json({ ok: true });
  });
  app.get('/api/mp/me/lives/schedule', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Connectez-vous' });
    res.json({ schedule: upcomingFor(store.findMpSellerByOwner(user.phone)) });
  });
  app.get('/api/mp/me/lives/current', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Connectez-vous' });
    const v = store.findMpSellerByOwner(user.phone);
    const l = v && currentFor(v.id);
    res.json({ live: l ? { ...fullView(l), sales: l.sales, amount: l.amount, peak: l.peak } : null });
  });
  app.post('/api/mp/me/lives', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Connectez-vous' });
    const v = store.findMpSellerByOwner(user.phone);
    if (!v || v.status !== 'active')
      return res.status(403).json({ error: 'Le live est ouvert aux boutiques validées' });
    if (tooMany(res, `mp-live-start:${user.phone}`, 6, 3600e3)) return;
    const title = clip(req.body?.title, 80) || `Live de ${v.shopName}`;
    const contact = findContact(title);
    if (contact) return res.status(400).json({ error: CONTACT_REFUSED(contact) });
    const p = cleanProducts(req.body?.products ?? [], v.id);
    if (p.error) return res.status(400).json({ error: p.error });
    if (!p.value.length) return res.status(400).json({ error: 'Choisissez au moins un article à présenter' });
    const previous = currentFor(v.id);
    if (previous) end(previous, 'vendeur');
    if ([...lives.values()].filter(isOn).length >= MAX_LIVES)
      return res.status(503).json({ error: 'Trop de lives en ce moment : réessayez dans quelques minutes' });
    const l = {
      id: `L-${code(8)}`,
      sellerId: v.id,
      title,
      status: 'en_direct',
      startedAt: now(),
      endedAt: null,
      endedBy: null,
      products: p.value,
      pinned: p.value[0].listingId,
      segments: [],
      seq: 0,
      mime: null,
      lastSegmentAt: Date.now(),
      comments: [],
      nextComment: 1,
      hidden: new Set(),
      muted: new Set(),
      viewers: new Map(),
      reports: [],
      peak: 0,
      likes: 0,
      sales: 0,
      amount: 0,
    };
    lives.set(l.id, l);
    system(l, `Bienvenue dans le live de ${v.shopName} ! Touchez un article pour le commander.`);
    // La communauté de la boutique est prévenue (au plus une fois toutes les 3 h) ; les clientes qui ont
    // demandé un rappel pour le live programmé le sont toujours
    const text = `🔴 « ${v.shopName} » est en direct : « ${title} ». Regardez et commandez : ${siteUrl()}/m/live/${l.id}`;
    const reminders = scheduleOf(v)?.reminders ?? [];
    const followers = (v.followers ?? []).map(f => f.phone);
    const throttled = v.liveNoticeAt && Date.now() - Date.parse(v.liveNoticeAt) < NOTICE_EVERY_MS;
    const to = new Set([...reminders, ...(throttled ? [] : followers.slice(0, 300))]);
    store.saveMpSeller({
      ...v,
      liveSchedule: null,
      ...(throttled || !followers.length ? {} : { liveNoticeAt: now() }),
    });
    for (const phone of to) notify(phone, text);
    res.status(201).json({ live: fullView(l) });
  });
  app.post('/api/mp/me/lives/:id/segments', express.raw({ type: () => true, limit: MAX_SEGMENT_BYTES }), (req, res) => {
    const me = myLive(req, res);
    if (!me) return;
    const l = me.live;
    if (!isOn(l)) return res.status(409).json({ error: 'Le live est terminé' });
    if (tooMany(res, `mp-live-s:${l.id}`, 90, 60e3)) return;
    const mime = clip(req.get('content-type'), 80);
    if (!MIME.test(mime) || !Buffer.isBuffer(req.body) || req.body.length < 100)
      return res.status(400).json({ error: 'Vidéo invalide' });
    l.seq += 1;
    l.mime = mime;
    l.lastSegmentAt = Date.now();
    l.segments = [...l.segments, { seq: l.seq, mime, data: req.body, at: Date.now() }].slice(-KEEP_SEGMENTS);
    res.status(201).json({ seq: l.seq, viewers: viewersOf(l) });
  });
  app.post('/api/mp/me/lives/:id/pin', (req, res) => {
    const me = myLive(req, res);
    if (!me) return;
    const id = clip(req.body?.listingId, 20) || null;
    if (id && !me.live.products.some(p => p.listingId === id))
      return res.status(400).json({ error: "Cet article n'est pas dans le live" });
    me.live.pinned = id;
    const l = id && store.getMpListing(id);
    if (l) system(me.live, `📌 Article présenté : « ${l.title} »`);
    res.json({ live: fullView(me.live) });
  });
  // Offre flash sur un article : prix, durée (minutes), quantité facultative ; l'article est présenté
  app.post('/api/mp/me/lives/:id/flash', (req, res) => {
    const me = myLive(req, res);
    if (!me) return;
    if (!isOn(me.live)) return res.status(409).json({ error: 'Le live est terminé' });
    const p = me.live.products.find(x => x.listingId === clip(req.body?.listingId, 20));
    const listing = p && store.getMpListing(p.listingId);
    if (!listing) return res.status(400).json({ error: "Cet article n'est pas dans le live" });
    if (req.body?.stop) {
      p.flash = null;
      return res.json({ live: fullView(me.live) });
    }
    const price = cleanLivePrice(req.body?.price, listing.price);
    if (!price) return res.status(400).json({ error: "Le prix flash doit être plus bas que le prix de l'article" });
    const minutes = Number(req.body?.minutes);
    if (!FLASH_MINUTES.includes(minutes)) return res.status(400).json({ error: 'Durée : 2, 5, 10 ou 15 minutes' });
    const qtyRaw = req.body?.qty;
    const qty = qtyRaw === null || qtyRaw === undefined || qtyRaw === '' ? null : Math.round(Number(qtyRaw));
    if (qty !== null && (!Number.isInteger(qty) || qty < 1 || qty > 500))
      return res.status(400).json({ error: 'Quantité : de 1 à 500 pièces' });
    p.flash = { price, until: Date.now() + minutes * 60e3, qty, left: qty ?? 1e9 };
    me.live.pinned = p.listingId;
    system(
      me.live,
      `⚡ Offre flash : « ${listing.title} » à ${price.toLocaleString('fr-FR')} F pendant ${minutes} min${qty ? ` (${qty} pièce${qty > 1 ? 's' : ''})` : ''} !`,
    );
    res.json({ live: fullView(me.live) });
  });
  // Bandeau d'annonce au-dessus de la vidéo (« -20 % sur tout ce soir »)
  app.post('/api/mp/me/lives/:id/banner', (req, res) => {
    const me = myLive(req, res);
    if (!me) return;
    const text = clip(req.body?.text, 80);
    const contact = text && findContact(text);
    if (contact) return res.status(400).json({ error: CONTACT_REFUSED(contact) });
    me.live.banner = text || null;
    res.json({ live: fullView(me.live) });
  });
  app.post('/api/mp/me/lives/:id/products', (req, res) => {
    const me = myLive(req, res);
    if (!me) return;
    const p = cleanProducts(req.body?.products, me.seller.id);
    if (p.error) return res.status(400).json({ error: p.error });
    if (!p.value.length) return res.status(400).json({ error: 'Gardez au moins un article' });
    me.live.products = p.value.map(x => ({
      ...x,
      flash: me.live.products.find(y => y.listingId === x.listingId)?.flash ?? null,
    }));
    if (!p.value.some(x => x.listingId === me.live.pinned)) me.live.pinned = p.value[0].listingId;
    res.json({ live: fullView(me.live) });
  });
  // Masquer une personne : ses commentaires disparaissent et elle ne peut plus écrire dans ce live
  app.post('/api/mp/me/lives/:id/mute', (req, res) => {
    const me = myLive(req, res);
    if (!me) return;
    const c = me.live.comments.find(x => x.id === Number(req.body?.commentId));
    if (!c || c.system || c.seller) return res.status(404).json({ error: 'Commentaire introuvable' });
    me.live.muted.add(c.phone);
    for (const x of me.live.comments) if (x.phone === c.phone) me.live.hidden.add(x.id);
    res.json({ ok: true });
  });
  app.post('/api/mp/me/lives/:id/end', (req, res) => {
    const me = myLive(req, res);
    if (!me) return;
    end(me.live, 'vendeur');
    res.json({
      live: fullView(me.live),
      result: { sales: me.live.sales, amount: me.live.amount, peak: me.live.peak, likes: me.live.likes },
    });
  });

  /* ---------- Gérante ---------- */
  const guard = (req, res) => {
    if (isAdmin(req)) return true;
    res.status(403).json({ error: 'Accès gérante requis' });
    return false;
  };
  app.get('/api/admin/mp/lives', (req, res) => {
    if (!guard(req, res)) return;
    res.json({
      lives: [...lives.values()]
        .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
        .map(l => ({
          ...summary(l),
          sales: l.sales,
          amount: l.amount,
          peak: l.peak,
          reports: l.reports.map(r => ({ reason: r.reason, at: r.at })),
        })),
    });
  });
  app.post('/api/admin/mp/lives/:id/stop', (req, res) => {
    if (!guard(req, res)) return;
    const l = findLive(req, res);
    if (!l) return;
    end(l, 'gerante', clip(req.body?.reason, 200));
    res.json({ live: summary(l) });
  });

  return { priceFor, onOrder, currentFor, upcomingFor };
}
