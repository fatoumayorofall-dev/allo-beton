// ============================================================
//  AUTHENTICITÉ : une étiquette numérotée par pièce vendue
//  - la gérante génère des codes (un par pièce) et imprime les étiquettes (QR + code)
//  - la cliente scanne le QR ou tape le code sur /authentique : le serveur confirme
//    que la pièce vient bien de Fabima et compte les vérifications
//  - un code vérifié de nombreuses fois signale une étiquette recopiée (contrefaçon)
//  Codes : 10 caractères aléatoires (alphabet de Crockford, sans I L O U) + 1 caractère de contrôle,
//  soit plus d'un million de milliards de combinaisons : impossible à deviner.
// ============================================================
import crypto from 'node:crypto';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const SUSPICIOUS_AFTER = 5; // au-delà, l'étiquette a probablement été photocopiée

const checkChar = body => ALPHABET[[...body].reduce((s, ch, i) => s + ALPHABET.indexOf(ch) * (i + 1), 0) % 32];
/** Code lisible : XXXX-XXXX-XXX (le dernier caractère est la clé de contrôle). */
export function newCode() {
  const bytes = crypto.randomBytes(10);
  const body = [...bytes].map(b => ALPHABET[b % 32]).join('');
  const full = body + checkChar(body);
  return `${full.slice(0, 4)}-${full.slice(4, 8)}-${full.slice(8)}`;
}
/** Normalise ce que tape la cliente (minuscules, O→0, I/L→1, espaces) et vérifie la clé. */
export function normalizeCode(input) {
  const raw = String(input || '').toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1').replace(/U/g, 'V');
  if (raw.length !== 11 || [...raw].some(ch => !ALPHABET.includes(ch))) return null;
  if (checkChar(raw.slice(0, 10)) !== raw[10]) return null;
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
}

const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

export function registerAuthenticityRoutes(app, { limit, isAdmin, store }) {
  /* Gérante : créer des étiquettes pour une pièce */
  app.post('/api/admin/authenticite', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    const quantity = Math.round(Number(req.body?.quantity));
    const productName = clip(req.body?.productName, 120);
    if (!productName) return res.status(400).json({ error: 'Choisissez une pièce' });
    if (!(quantity >= 1 && quantity <= 100)) return res.status(400).json({ error: 'Entre 1 et 100 étiquettes à la fois' });
    const now = new Date().toISOString();
    const codes = [];
    while (codes.length < quantity) {
      const code = newCode();
      if (store.getAuthCode(code)) continue;
      codes.push({ code, productId: clip(req.body?.productId, 40) || undefined, productSlug: clip(req.body?.productSlug, 90) || undefined, productName, orderId: clip(req.body?.orderId, 20) || undefined, createdAt: now, scans: 0 });
    }
    res.status(201).json({ codes: store.saveAuthCodes(codes) });
  });
  app.get('/api/admin/authenticite', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    res.json({ codes: store.listAuthCodes().slice(0, 500) });
  });

  /* Cliente : vérifier une étiquette */
  app.get('/api/authentique/:code', (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!limit(`auth:${req.ip}`, 30, 3600e3)) return res.status(429).json({ error: 'Trop de vérifications, réessayez dans une heure' });
    const code = normalizeCode(req.params.code);
    if (!code) return res.json({ status: 'invalide' });
    const c = store.recordAuthScan(code);
    if (!c) return res.json({ status: 'inconnu', code });
    res.json({
      status: c.scans > SUSPICIOUS_AFTER ? 'suspect' : c.scans > 1 ? 'deja-verifie' : 'authentique',
      code, productName: c.productName, productSlug: c.productSlug, issuedAt: c.createdAt.slice(0, 10),
      scans: c.scans, firstScanAt: c.firstScanAt,
    });
  });
}
