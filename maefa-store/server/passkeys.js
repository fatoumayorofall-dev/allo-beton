// ============================================================
//  CONNEXION PAR FACE ID / EMPREINTE (« passkeys », norme WebAuthn du W3C)
//  - le visage ou l'empreinte ne quittent jamais le téléphone : c'est lui qui vérifie la personne,
//    puis il signe un défi avec une clé privée qu'il garde ; le serveur ne reçoit que la signature
//    et ne garde que la clé publique (rien à voler qui permette de se connecter) ;
//  - une clé n'est valable que pour ce site : un faux site ne peut pas s'en servir (anti-hameçonnage) ;
//  - cliente : activée depuis son espace, après une première connexion (code WhatsApp ou code secret) ;
//  - gérante : activée depuis l'espace gérant ; changer ADMIN_PIN retire tous ses appareils.
// ============================================================
import crypto from 'node:crypto';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { shopSecret } from './brandSecurity.js';

const CHALLENGE_TTL = 5 * 60e3;
const MAX_DEVICES = 10;
const b64u = buf => Buffer.from(buf).toString('base64url');
const clip = (v, n) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');

/** Nom lisible de l'appareil, d'après le navigateur (modifiable par la personne). */
export function deviceName(ua = '') {
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) return 'Téléphone Android';
  if (/Macintosh/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Ordinateur Windows';
  return 'Cet appareil';
}

/** Vue publique d'un appareil : jamais la clé publique ni le compteur. */
export const publicPasskey = k => ({
  id: k.id,
  name: k.name,
  createdAt: k.createdAt,
  lastUsedAt: k.lastUsedAt ?? null,
  synced: !!k.backedUp,
});

export function registerPasskeyRoutes(app, { limit, store, currentUser, openSession, publicUser, isAdmin, adminAuth }) {
  /* Défis en attente (5 min, usage unique) */
  const challenges = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, c] of challenges) if (c.expires < now) challenges.delete(k);
  }, 60e3).unref();
  const keep = (key, data) => challenges.set(key, { ...data, expires: Date.now() + CHALLENGE_TTL });
  const take = key => {
    const c = challenges.get(key);
    challenges.delete(key);
    return c && c.expires > Date.now() ? c : null;
  };

  /** Site attendu : celui de la requête (ou PASSKEY_RP_ID / PUBLIC_ORIGIN si on veut le fixer). */
  const relyingParty = req => ({
    rpID: process.env.PASSKEY_RP_ID || req.hostname,
    origin: process.env.PUBLIC_ORIGIN || `${req.protocol}://${req.get('host')}`,
  });

  // Demandes de défi préparées à l'avance par les pages (plusieurs clientes peuvent partager une adresse IP
  // chez l'opérateur mobile) : limite large ; vérifications : plus stricte.
  const tooMany = (req, res, what) => {
    const max = /options|reg$/.test(what) ? 200 : 60;
    if (limit(`passkey-${what}:${req.ip}`, max, 10 * 60e3)) return false;
    res.status(429).json({ error: "Trop d'essais. Réessayez dans quelques minutes." });
    return true;
  };

  const optionsFor = async (req, { userID, userName, displayName, existing }) => {
    const { rpID } = relyingParty(req);
    return generateRegistrationOptions({
      rpName: 'Maefa',
      rpID,
      userID,
      userName,
      userDisplayName: displayName,
      attestationType: 'none',
      excludeCredentials: existing.map(k => ({ id: k.id, transports: k.transports })),
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
    });
  };

  /** Vérifie la réponse d'enregistrement ; renvoie la clé à garder ou un message d'erreur. */
  async function checkRegistration(req, pending) {
    if (!pending) return { error: 'Demande expirée : recommencez.' };
    const { rpID, origin } = relyingParty(req);
    try {
      const v = await verifyRegistrationResponse({
        response: req.body?.response,
        expectedChallenge: pending.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
      });
      if (!v.verified) return { error: 'Activation refusée par le téléphone.' };
      const { credential, credentialBackedUp } = v.registrationInfo;
      return {
        key: {
          id: credential.id,
          publicKey: b64u(credential.publicKey),
          counter: credential.counter,
          transports: credential.transports ?? [],
          backedUp: credentialBackedUp,
          name: clip(req.body?.name, 40) || deviceName(req.get('user-agent')),
          createdAt: new Date().toISOString(),
          lastUsedAt: null,
        },
      };
    } catch (e) {
      return { error: `Activation impossible : ${e.message}` };
    }
  }

  /** Vérifie une signature de connexion avec la clé enregistrée ; renvoie le nouveau compteur ou null. */
  async function checkLogin(req, pending, key) {
    const { rpID, origin } = relyingParty(req);
    try {
      const v = await verifyAuthenticationResponse({
        response: req.body?.response,
        expectedChallenge: pending.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: key.id,
          publicKey: Buffer.from(key.publicKey, 'base64url'),
          counter: key.counter,
          transports: key.transports,
        },
        requireUserVerification: true,
      });
      return v.verified ? v.authenticationInfo.newCounter : null;
    } catch {
      return null;
    }
  }

  const credentialIdInUse = id =>
    store.listUsers().some(u => (u.passkeys ?? []).some(k => k.id === id)) ||
    store.getAdminPasskeys().some(k => k.id === id);

  /* ==================== CLIENTES ==================== */

  // Activer Face ID sur ce téléphone (cliente déjà connectée)
  app.post('/api/me/passkeys/options', async (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Non connectée' });
    if (tooMany(req, res, 'reg')) return;
    const existing = user.passkeys ?? [];
    if (existing.length >= MAX_DEVICES)
      return res.status(409).json({ error: `${MAX_DEVICES} appareils au plus : retirez-en un d'abord.` });
    const options = await optionsFor(req, {
      userID: crypto.createHash('sha256').update(`maefa-cliente:${user.phone}`).digest(),
      userName: user.phone,
      displayName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.phone,
      existing,
    });
    const challengeId = crypto.randomBytes(16).toString('hex');
    keep(`reg:${user.phone}:${challengeId}`, { challenge: options.challenge });
    res.json({ challengeId, options });
  });

  app.post('/api/me/passkeys', async (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Non connectée' });
    const r = await checkRegistration(req, take(`reg:${user.phone}:${clip(req.body?.challengeId, 40)}`));
    if (r.error) return res.status(400).json({ error: r.error });
    if (credentialIdInUse(r.key.id)) return res.status(409).json({ error: 'Cet appareil est déjà activé.' });
    const saved = store.saveUser(user.phone, { passkeys: [...(user.passkeys ?? []), r.key].slice(-MAX_DEVICES) });
    res.status(201).json({ passkey: publicPasskey(r.key), user: publicUser(saved) });
  });

  app.get('/api/me/passkeys', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Non connectée' });
    res.json({ passkeys: (user.passkeys ?? []).map(publicPasskey) });
  });

  app.delete('/api/me/passkeys/:id', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Non connectée' });
    const saved = store.saveUser(user.phone, {
      passkeys: (user.passkeys ?? []).filter(k => k.id !== req.params.id),
    });
    res.json({ ok: true, user: publicUser(saved) });
  });

  // Se connecter avec Face ID : pas de numéro à donner, le téléphone propose lui-même son compte Maefa
  // (et le serveur ne révèle pas quels numéros ont activé Face ID).
  app.post('/api/auth/passkey/options', async (req, res) => {
    if (tooMany(req, res, 'login-options')) return;
    const options = await generateAuthenticationOptions({
      rpID: relyingParty(req).rpID,
      userVerification: 'required',
    });
    const challengeId = crypto.randomBytes(16).toString('hex');
    keep(`login:${challengeId}`, { challenge: options.challenge });
    res.json({ challengeId, options });
  });

  app.post('/api/auth/passkey/verify', async (req, res) => {
    if (tooMany(req, res, 'verify')) return;
    const pending = take(`login:${clip(req.body?.challengeId, 40)}`);
    if (!pending) return res.status(400).json({ error: 'Demande expirée : recommencez.' });
    const id = req.body?.response?.id;
    const user = typeof id === 'string' && store.listUsers().find(u => (u.passkeys ?? []).some(k => k.id === id));
    if (!user)
      return res.status(404).json({
        error: "Face ID n'est pas activé pour ce compte sur ce téléphone. Connectez-vous avec votre numéro.",
      });
    const key = user.passkeys.find(k => k.id === id);
    const counter = await checkLogin(req, pending, key);
    if (counter === null) return res.status(401).json({ error: 'Vérification refusée. Réessayez.' });
    const now = new Date().toISOString();
    const saved = store.saveUser(user.phone, {
      passkeys: user.passkeys.map(k => (k.id === id ? { ...k, counter, lastUsedAt: now } : k)),
      lastLogin: now,
      pinFails: 0,
    });
    res.json({ token: openSession(user.phone), user: publicUser(saved) });
  });

  /* ==================== GÉRANTE ==================== */
  // Chaque appareil porte une empreinte du code PIN du moment : changer ADMIN_PIN les retire tous.
  const pinTag = () =>
    adminAuth.pin
      ? crypto
          .createHmac('sha256', shopSecret())
          .update(`maefa-admin-passkey:${adminAuth.pin}`)
          .digest('hex')
          .slice(0, 16)
      : null;
  const adminKeys = () => store.getAdminPasskeys().filter(k => k.pinTag === pinTag());

  app.get('/api/admin/passkey/status', (_req, res) => {
    res.json({ enabled: !!adminAuth.pin && adminKeys().length > 0 });
  });

  app.post('/api/admin/passkeys/options', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    if (tooMany(req, res, 'admin-reg')) return;
    const existing = adminKeys();
    if (existing.length >= MAX_DEVICES)
      return res.status(409).json({ error: `${MAX_DEVICES} appareils au plus : retirez-en un d'abord.` });
    const options = await optionsFor(req, {
      userID: crypto.createHash('sha256').update('maefa-gerante').digest(),
      userName: 'Gérante Maefa',
      displayName: 'Gérante Maefa',
      existing,
    });
    const challengeId = crypto.randomBytes(16).toString('hex');
    keep(`admin-reg:${challengeId}`, { challenge: options.challenge });
    res.json({ challengeId, options });
  });

  app.post('/api/admin/passkeys', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    const r = await checkRegistration(req, take(`admin-reg:${clip(req.body?.challengeId, 40)}`));
    if (r.error) return res.status(400).json({ error: r.error });
    if (credentialIdInUse(r.key.id)) return res.status(409).json({ error: 'Cet appareil est déjà activé.' });
    store.saveAdminPasskeys([...adminKeys(), { ...r.key, pinTag: pinTag() }].slice(-MAX_DEVICES));
    res.status(201).json({ passkey: publicPasskey(r.key) });
  });

  app.get('/api/admin/passkeys', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    res.json({ passkeys: adminKeys().map(publicPasskey) });
  });

  app.delete('/api/admin/passkeys/:id', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    store.saveAdminPasskeys(adminKeys().filter(k => k.id !== req.params.id));
    res.json({ ok: true });
  });

  app.post('/api/admin/passkey/options', async (req, res) => {
    if (tooMany(req, res, 'admin-options')) return;
    const keys = adminKeys();
    if (!adminAuth.pin || !keys.length)
      return res.status(404).json({ error: "Face ID n'est pas activé pour l'espace gérant." });
    const options = await generateAuthenticationOptions({
      rpID: relyingParty(req).rpID,
      userVerification: 'required',
      allowCredentials: keys.map(k => ({ id: k.id, transports: k.transports })),
    });
    const challengeId = crypto.randomBytes(16).toString('hex');
    keep(`admin-login:${challengeId}`, { challenge: options.challenge });
    res.json({ challengeId, options });
  });

  app.post('/api/admin/passkey/verify', async (req, res) => {
    if (tooMany(req, res, 'admin-verify')) return;
    const pending = take(`admin-login:${clip(req.body?.challengeId, 40)}`);
    if (!pending) return res.status(400).json({ error: 'Demande expirée : recommencez.' });
    const keys = adminKeys();
    const key = keys.find(k => k.id === req.body?.response?.id);
    if (!key) return res.status(401).json({ error: "Cet appareil n'est pas autorisé pour l'espace gérant." });
    const counter = await checkLogin(req, pending, key);
    if (counter === null) return res.status(401).json({ error: 'Vérification refusée. Réessayez.' });
    const now = new Date().toISOString();
    store.saveAdminPasskeys(keys.map(k => (k.id === key.id ? { ...k, counter, lastUsedAt: now } : k)));
    res.json(adminAuth.issueToken());
  });
}
