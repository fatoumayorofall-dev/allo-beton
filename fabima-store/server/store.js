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

let state = { showcase: [], visits: {}, users: {}, sessions: {}, orders: {}, shopOrders: {}, deliveries: {} };
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

/* ---------- Comptes clientes (inscription par numéro de téléphone) ---------- */
export const getUser = phone => state.users[phone] ?? null;
export const listUsers = () => Object.values(state.users);
export function saveUser(phone, patch) {
  const now = new Date().toISOString();
  state.users[phone] = { phone, createdAt: now, ...state.users[phone], ...patch, updatedAt: now };
  persist();
  return state.users[phone];
}

/** Sessions : on ne garde que l'empreinte du jeton, jamais le jeton lui-même. */
export const getSession = tokenHash => state.sessions[tokenHash] ?? null;
export function saveSession(tokenHash, phone) {
  state.sessions[tokenHash] = { phone, createdAt: new Date().toISOString() };
  persist();
}
export function deleteSession(tokenHash) {
  delete state.sessions[tokenHash];
  persist();
}

/** Commandes rattachées au compte (retrouvées sur n'importe quel téléphone). */
export const getOrders = phone => state.orders[phone] ?? [];
export function saveOrder(phone, order) {
  const list = (state.orders[phone] ?? []).filter(o => o.id !== order.id);
  state.orders[phone] = [order, ...list].slice(0, 100);
  persist();
}

/* ---------- Commandes de la boutique (toutes les clientes) ---------- */
export const getShopOrder = id => state.shopOrders[id] ?? null;
export const listShopOrders = () => Object.values(state.shopOrders).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
export function saveShopOrder(order) {
  state.shopOrders[order.id] = order;
  // met aussi à jour la copie rattachée au compte de la cliente, si elle en a un
  for (const [phone, list] of Object.entries(state.orders)) {
    if (list.some(o => o.id === order.id)) state.orders[phone] = list.map(o => (o.id === order.id ? order : o));
  }
  persist();
  return order;
}

/* ---------- Livraisons : une ou plusieurs étapes (relais), chacune avec son livreur ---------- */

/** Anciennes livraisons à un seul livreur → une livraison à une étape. */
function upgrade(d) {
  if (!d || Array.isArray(d.legs)) return d;
  const leg = d.driverToken ? [{
    driverName: d.driverName, driverPhone: d.driverPhone, driverToken: d.driverToken, vehicle: 'moto', to: null,
    assignedAt: d.assignedAt, startedAt: d.startedAt ?? null, doneAt: d.deliveredAt ?? null, position: d.position ?? null,
    nearNotified: !!d.nearNotified, customerNotified: !!d.onTheWayNotified,
  }] : [];
  return { orderId: d.orderId, legs: leg };
}

export const getDelivery = orderId => upgrade(state.deliveries[orderId]) ?? null;

/** Étape correspondant au lien secret d'un livreur : { delivery, index }. */
export function findLegByToken(token) {
  if (!token) return null;
  for (const raw of Object.values(state.deliveries)) {
    const d = upgrade(raw);
    const index = d.legs.findIndex(l => l.driverToken === token);
    if (index >= 0) return { delivery: d, index };
  }
  return null;
}

export function saveDelivery(orderId, delivery) {
  state.deliveries[orderId] = { ...delivery, orderId };
  persist();
  return state.deliveries[orderId];
}
