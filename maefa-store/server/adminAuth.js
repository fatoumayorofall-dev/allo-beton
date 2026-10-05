// ============================================================
//  CONNEXION À L'ESPACE GÉRANT
//  - le code PIN (ADMIN_PIN) n'est vérifié que par le serveur, jamais dans le navigateur
//  - en échange, un jeton signé valable 12 h : le code ne circule plus à chaque action
//  - 10 essais ratés en 15 min depuis une même adresse → blocage (impossible de deviner le code)
//  - changer ADMIN_PIN déconnecte tous les appareils (le jeton en dépend)
// ============================================================
import crypto from 'node:crypto';
import { shopSecret } from './brandSecurity.js';

const TTL = 12 * 3600e3;
const MAX_FAILS = 10;
const WINDOW = 15 * 60e3;

/** Comparaison à temps constant (ne révèle pas, par sa durée, combien de chiffres sont justes). */
function same(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

export function createAdminAuth(pin) {
  const fails = new Map(); // adresse → { n, until }
  const locked = ip => {
    const f = fails.get(ip);
    return !!f && f.n >= MAX_FAILS && f.until > Date.now();
  };
  const failed = ip => {
    const f = fails.get(ip),
      now = Date.now();
    if (!f || f.until < now) fails.set(ip, { n: 1, until: now + WINDOW });
    else f.n++;
  };
  setInterval(() => {
    const now = Date.now();
    for (const [ip, f] of fails) if (f.until < now) fails.delete(ip);
  }, WINDOW).unref();

  // Libellé interne d'origine (antérieur au nom Maefa), conservé pour ne déconnecter personne.
  const sign = exp =>
    crypto.createHmac('sha256', shopSecret()).update(`fabima-admin:${exp}:${pin}`).digest('base64url');
  const tokenOk = v => {
    const m = /^fa1\.(\d{10,14})\.([\w-]{43})$/.exec(v);
    return !!m && Number(m[1]) > Date.now() && same(m[2], sign(m[1]));
  };

  /** Accès gérante : jeton de connexion valide (ou, pour les outils, le code lui-même, avec anti-essais). */
  function isAdmin(req) {
    const v = req.get('x-admin-pin') || '';
    if (!pin || !v) return false;
    if (v.startsWith('fa1.')) return tokenOk(v);
    if (locked(req.ip)) return false;
    if (same(v, pin)) {
      fails.delete(req.ip);
      return true;
    }
    failed(req.ip);
    return false;
  }

  function registerAdminLogin(app) {
    app.post('/api/admin/login', (req, res) => {
      if (!pin)
        return res.status(503).json({ error: 'Espace gérant non configuré sur le serveur (variable ADMIN_PIN)' });
      if (locked(req.ip)) return res.status(429).json({ error: "Trop d'essais : réessayez dans 15 minutes" });
      const given = typeof req.body?.pin === 'string' ? req.body.pin.trim() : '';
      if (!given || !same(given, pin)) {
        failed(req.ip);
        return res.status(401).json({ error: 'Code incorrect' });
      }
      fails.delete(req.ip);
      const exp = Date.now() + TTL;
      res.json({ token: `fa1.${exp}.${sign(exp)}`, expiresAt: new Date(exp).toISOString() });
    });
  }

  return { isAdmin, registerAdminLogin };
}
