// ============================================================
//  MARQUES SECRÈTES DES ÉTIQUETTES
//  L'écrin sécurisé public (guilloché + micro-texte) est dans dist/brand/.
//  Pour les étiquettes imprimées, le serveur y ajoute des marques secrètes :
//  une ligne du guilloché interrompue, trois micro-points, un point évidé dans la clé de voûte.
//  Leur emplacement dépend d'une clé propre à la boutique (AUTH_SECRET, ou clé tirée au hasard
//  au premier démarrage et gardée dans DATA_DIR) : elles ne figurent ni dans le code ni dans les fichiers publics.
// ============================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(here, 'data');

function secret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  const file = path.join(DATA_DIR, 'auth-secret');
  try { return fs.readFileSync(file, 'utf8').trim(); } catch { /* première fois */ }
  const s = crypto.randomBytes(32).toString('hex');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(file, s, { mode: 0o600 });
  return s;
}

/** Emplacements des marques, tirés de la clé (toujours les mêmes pour une boutique donnée). */
export function secretMarks() {
  const h = crypto.createHmac('sha256', secret()).update('fabima-marques-secretes-v1').digest();
  const deg = (b1, b2, min, max) => min + ((b1 * 256 + b2) % ((max - min) * 10)) / 10;
  const gapLine = h[0] % 14;
  const gapFrom = deg(h[1], h[2], 20, 330);
  const dots = [0, 1, 2].map(i => Math.round(deg(h[3 + i * 2], h[4 + i * 2], i * 120 + 10, i * 120 + 110)));
  const keyHole = h[9] % 3 !== 0; // deux boutiques sur trois : point évidé dans le losange
  return { gapLine, gapFrom: Math.round(gapFrom), gapTo: Math.round(gapFrom) + 6, dots, keyHole };
}
const clock = d => { const h = Math.round(((d / 30) + 3) % 12) || 12; return `${h} h`; };
/** Description en clair pour la gérante (vérification à la loupe). */
export function describeMarks(m = secretMarks()) {
  return [
    `Guilloché extérieur : une des lignes s'interrompt vers ${clock((m.gapFrom + m.gapTo) / 2)}.`,
    `Trois micro-points sur l'anneau intérieur du guilloché, vers ${m.dots.map(clock).join(', ')}.`,
    m.keyHole ? 'Clé de voûte : un point évidé au cœur du losange.' : 'Clé de voûte : losange plein, sans point.',
  ];
}

const f3 = n => n.toFixed(3);
// mêmes paramètres que le générateur du logo : anneau extérieur centré en (51, 56.5), r = 22, amplitude 2,8, 18 ondes, 14 lignes
function outerBand(gap) {
  const cx = 51, cy = 56.5, r0 = 22, a = 2.8, k = 18, m = 14; let d = '';
  for (let i = 0; i < m; i++) {
    const ph = (i * 2 * Math.PI) / m; let pen = false;
    for (let j = 0; j <= 720; j++) {
      const t = (j / 720) * Math.PI * 2, deg = t * 180 / Math.PI;
      if (i === gap.line && deg > gap.from && deg < gap.to) { pen = false; continue; }
      const r = r0 + a * Math.sin(k * t + ph);
      d += (pen ? 'L' : 'M') + f3(cx + r * Math.cos(t)) + ' ' + f3(cy + r * Math.sin(t)); pen = true;
    }
  }
  return d;
}

/** Écrin sécurisé + marques secrètes, prêt pour l'impression des étiquettes. */
export function labelMarkSvg(dist) {
  const base = fs.readFileSync(path.join(dist, 'brand', 'fabima-monogramme-securise.svg'), 'utf8');
  const m = secretMarks();
  const dots = m.dots.map(dg => { const t = dg * Math.PI / 180; return `<circle cx="${f3(51 + 13.2 * Math.cos(t))}" cy="${f3(56.5 + 13.2 * Math.sin(t))}" r=".3" fill="#f0c9c1" fill-opacity=".85"/>`; }).join('');
  return base
    .replace(/<path id="guilloche-ext" d="[^"]*"\/>/, `<path d="${outerBand({ line: m.gapLine, from: m.gapFrom, to: m.gapTo })}"/>`)
    .replace('<!--secret-->', dots)
    .replace('</svg>', `${m.keyHole ? '<circle cx="50" cy="11.2" r=".42" fill="#3d1d2d"/>' : ''}</svg>`);
}

export function registerBrandSecurityRoutes(app, { isAdmin, dist }) {
  app.get('/api/admin/marque-securisee', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    try { res.set('Cache-Control', 'no-store').json({ svg: labelMarkSvg(dist), marks: describeMarks() }); }
    catch { res.status(503).json({ error: 'Écrin sécurisé introuvable : compilez le site (npm run build)' }); }
  });
}
