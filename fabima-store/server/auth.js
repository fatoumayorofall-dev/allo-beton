// ============================================================
//  COMPTES CLIENTES PAR NUMÉRO DE TÉLÉPHONE
//  1. la cliente saisit son numéro → code à 4 chiffres envoyé sur WhatsApp
//  2. elle saisit le code → session de 6 mois (jeton aléatoire)
//  Pas de mot de passe, pas d'e-mail.
// ============================================================
import crypto from 'node:crypto';

const OTP_TTL_MS = 10 * 60e3;
const OTP_MAX_TRIES = 5;
const SESSION_DAYS = 180;
const otps = new Map(); // téléphone → { hash, expires, tries }

const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
const devMode = () => process.env.OTP_DEV_MODE === '1' || (process.env.NODE_ENV !== 'production' && process.env.OTP_DEV_MODE !== '0');

function publicUser(u) {
  if (!u) return null;
  return { phone: u.phone, firstName: u.firstName ?? '', lastName: u.lastName ?? '', zone: u.zone ?? '', address: u.address ?? '', location: u.location ?? null, wishlist: u.wishlist ?? [], createdAt: u.createdAt };
}

const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : undefined);

export function registerAuthRoutes(app, { limit, wa, store, isAdmin }) {
  /** Retrouve la cliente connectée à partir de l'en-tête « Authorization: Bearer … ». */
  function currentUser(req) {
    const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!/^[a-f0-9]{64}$/.test(token)) return null;
    const session = store.getSession(sha256(token));
    if (!session) return null;
    if (Date.now() - Date.parse(session.createdAt) > SESSION_DAYS * 864e5) { store.deleteSession(sha256(token)); return null; }
    return store.getUser(session.phone);
  }

  // 1. Demande de code
  app.post('/api/auth/start', async (req, res) => {
    const phone = wa.toE164(req.body?.phone);
    if (!phone || !/^\+221(7[05678])\d{7}$/.test(phone)) return res.status(400).json({ error: 'Numéro sénégalais invalide' });
    if (!limit(`otp-ip:${req.ip}`, 8, 3600e3) || !limit(`otp-phone:${phone}`, 3, 10 * 60e3)) {
      return res.status(429).json({ error: 'Trop de demandes. Réessayez dans quelques minutes.' });
    }
    const code = String(crypto.randomInt(0, 10000)).padStart(4, '0');
    otps.set(phone, { hash: sha256(`${phone}:${code}`), expires: Date.now() + OTP_TTL_MS, tries: 0 });

    const body = `🌸 Fabima Store\n\nVotre code : *${code}*\n\nIl est valable 10 minutes. Ne le donnez à personne.`;
    const template = process.env.TWILIO_TPL_OTP ? { sid: process.env.TWILIO_TPL_OTP, variables: { 1: code } } : undefined;
    const sent = await wa.sendWhatsApp(phone, body, template);
    if (sent.ok) return res.json({ sent: true, channel: 'whatsapp', isNew: !store.getUser(phone) });
    if (devMode()) return res.json({ sent: false, devCode: code, isNew: !store.getUser(phone) });
    otps.delete(phone);
    res.status(503).json({ error: 'Envoi du code impossible pour le moment. Réessayez plus tard.' });
  });

  // 2. Vérification du code → session
  app.post('/api/auth/verify', (req, res) => {
    const phone = wa.toE164(req.body?.phone);
    const code = String(req.body?.code ?? '');
    const entry = phone && otps.get(phone);
    if (!entry || Date.now() > entry.expires) return res.status(400).json({ error: 'Code expiré. Demandez un nouveau code.' });
    if (entry.tries >= OTP_MAX_TRIES) { otps.delete(phone); return res.status(429).json({ error: 'Trop d\'essais. Demandez un nouveau code.' }); }
    entry.tries += 1;
    if (!/^\d{4}$/.test(code) || !crypto.timingSafeEqual(Buffer.from(sha256(`${phone}:${code}`)), Buffer.from(entry.hash))) {
      return res.status(400).json({ error: 'Code incorrect', triesLeft: OTP_MAX_TRIES - entry.tries });
    }
    otps.delete(phone);
    const user = store.saveUser(phone, { lastLogin: new Date().toISOString() });
    const token = crypto.randomBytes(32).toString('hex');
    store.saveSession(sha256(token), phone);
    res.json({ token, user: publicUser(user) });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (/^[a-f0-9]{64}$/.test(token)) store.deleteSession(sha256(token));
    res.status(204).end();
  });

  // Profil
  app.get('/api/me', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Non connectée' });
    res.json({ user: publicUser(user), orders: store.getOrders(user.phone) });
  });

  app.patch('/api/me', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Non connectée' });
    const b = req.body || {};
    const patch = {};
    for (const [k, n] of [['firstName', 40], ['lastName', 40], ['zone', 60], ['address', 160]]) {
      const v = clip(b[k], n);
      if (v !== undefined) patch[k] = v;
    }
    if (b.location === null) patch.location = null;
    else if (b.location && Number.isFinite(b.location.lat) && Number.isFinite(b.location.lng) && Math.abs(b.location.lat) <= 90 && Math.abs(b.location.lng) <= 180) {
      patch.location = { lat: b.location.lat, lng: b.location.lng, label: clip(b.location.label, 200) ?? '', landmark: clip(b.location.landmark, 160) ?? '' };
    }
    if (Array.isArray(b.wishlist)) patch.wishlist = b.wishlist.filter(x => typeof x === 'string' && x.length <= 40).slice(0, 200);
    res.json({ user: publicUser(store.saveUser(user.phone, patch)) });
  });

  // Commande passée par une cliente connectée : rattachée à son compte
  app.post('/api/me/orders', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Non connectée' });
    const o = req.body?.order;
    if (!o || typeof o.id !== 'string' || !/^FB-[A-Z0-9]{4,12}$/.test(o.id) || !Array.isArray(o.items) || o.items.length > 50) {
      return res.status(400).json({ error: 'Commande invalide' });
    }
    if (!limit(`me-order:${user.phone}`, 20, 3600e3)) return res.status(429).end();
    if (JSON.stringify(o).length > 60_000) return res.status(413).json({ error: 'Commande trop volumineuse' });
    store.saveOrder(user.phone, o);
    res.status(201).json({ ok: true });
  });

  // Gérante : liste des clientes inscrites
  app.get('/api/admin/customers', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    const customers = store.listUsers().map(u => {
      const orders = store.getOrders(u.phone);
      return { ...publicUser(u), lastLogin: u.lastLogin, orders: orders.length, spent: orders.filter(o => o.status !== 'annulee').reduce((s, o) => s + (Number(o.total) || 0), 0) };
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ customers });
  });
}
