// ============================================================
//  PETIT STOCKAGE SERVEUR (fichier JSON + dossier audio)
//  Partagé par toutes les visiteuses : vitrine du statut, compteurs
//  de visites, notes vocales des produits.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(here, 'data');
const VOICE_DIR = path.join(DATA_DIR, 'voice');
const FILE = path.join(DATA_DIR, 'store.json');
fs.mkdirSync(VOICE_DIR, { recursive: true });

const SLUG_RE = /^[a-z0-9-]{2,80}$/;
export const validSlug = s => typeof s === 'string' && SLUG_RE.test(s);

let state = { showcase: [], visits: {} };
try { state = { ...state, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; } catch { /* premier démarrage */ }

let timer = null;
function persist() {
  clearTimeout(timer);
  timer = setTimeout(() => fs.writeFile(FILE, JSON.stringify(state), () => {}), 300);
}

/* ---------- Vitrine du statut ---------- */
export const getShowcase = () => state.showcase;
export function addToShowcase(slug) {
  state.showcase = [{ slug, addedAt: new Date().toISOString() }, ...state.showcase.filter(s => s.slug !== slug)].slice(0, 40);
  persist();
}
export function removeFromShowcase(slug) {
  state.showcase = state.showcase.filter(s => s.slug !== slug);
  persist();
}

/* ---------- Compteurs de visites par source (statut, lien partagé…) ---------- */
const SOURCES = new Set(['statut', 'partage', 'vitrine']);
export function recordVisit(slug, source) {
  const src = SOURCES.has(source) ? source : 'partage';
  const entry = (state.visits[slug] ??= { statut: 0, partage: 0, vitrine: 0, last: null });
  entry[src] += 1;
  entry.last = new Date().toISOString();
  persist();
}
export const getVisits = () => state.visits;

/* ---------- Notes vocales ---------- */
const EXT = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/aac': 'aac', 'audio/wav': 'wav' };
export const CONTENT_TYPES = Object.fromEntries(Object.entries(EXT).map(([k, v]) => [v, k]));

export function listVoices() {
  return fs.readdirSync(VOICE_DIR).map(f => f.replace(/\.[a-z0-9]+$/, '')).filter(validSlug);
}
export function findVoice(slug) {
  const f = fs.readdirSync(VOICE_DIR).find(x => x.startsWith(`${slug}.`));
  return f ? { path: path.join(VOICE_DIR, f), type: CONTENT_TYPES[f.split('.').pop()] || 'application/octet-stream' } : null;
}
export function saveVoice(slug, contentType, buffer) {
  const ext = EXT[String(contentType).split(';')[0].trim()];
  if (!ext) return false;
  deleteVoice(slug);
  fs.writeFileSync(path.join(VOICE_DIR, `${slug}.${ext}`), buffer);
  return true;
}
export function deleteVoice(slug) {
  const v = findVoice(slug);
  if (v) fs.unlinkSync(v.path);
}
