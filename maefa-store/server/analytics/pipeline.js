// ============================================================
//  PIPELINE DE DONNÉES (collecte → nettoyage → agrégation → modèle)
//  1. Collecte : chaque action anonyme (vue, favori, panier, demande) est ajoutée à un journal
//     JSONL partitionné par jour (DATA_DIR/events/AAAA-MM-JJ.jsonl) : écriture en ajout seul,
//     aucun verrou, tient de très gros volumes.
//  2. Traitement en flux : les fichiers sont lus ligne par ligne (mémoire constante, quel que soit
//     le volume) ; lignes illisibles, types inconnus, pièces inexistantes et doublons rapprochés
//     (double clic, < 2 s) sont écartés.
//  3. Agrégation : indicateurs par jour, entonnoir de conversion, pièces les plus vues, heures de
//     visite, puis entraînement du modèle de recommandation et son évaluation.
//  Lancement : automatique (au démarrage puis toutes les heures) ou « npm run data:pipeline ».
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { WEIGHTS, evaluate, trainItemSimilarity } from './recommender.js';

export const EVENT_TYPES = new Set(Object.keys(WEIGHTS));
const DAY_RE = /^\d{4}-\d{2}-\d{2}\.jsonl$/;
const VISITOR_RE = /^[a-z0-9-]{8,40}$/;

export function eventsDir(dataDir) {
  return path.join(dataDir, 'events');
}

/** Collecte : ajoute des événements valides au journal du jour. Renvoie le nombre gardé. */
export function appendEvents(dataDir, visitor, events, now = new Date()) {
  if (!VISITOR_RE.test(String(visitor)) || !Array.isArray(events)) return 0;
  const lines = [];
  for (const e of events.slice(0, 50)) {
    if (!e || !EVENT_TYPES.has(e.t) || typeof e.p !== 'string' || !/^[\w-]{2,40}$/.test(e.p)) continue;
    lines.push(JSON.stringify({ v: visitor, t: e.t, p: e.p, at: now.toISOString() }));
  }
  if (!lines.length) return 0;
  const dir = eventsDir(dataDir);
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path.join(dir, `${now.toISOString().slice(0, 10)}.jsonl`), lines.join('\n') + '\n');
  return lines.length;
}

/**
 * Traitement complet. `knownProducts` : identifiants valides (pour écarter les pièces inconnues).
 * @returns rapport { volume, indicateurs, entonnoir, topProduits, heures, modele, evaluation }
 */
export async function runPipeline(dataDir, { knownProducts = null, days = 90 } = {}) {
  const started = Date.now();
  const dir = eventsDir(dataDir);
  const files = fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter(f => DAY_RE.test(f))
        .sort()
        .slice(-days)
    : [];

  const volume = { lignes: 0, gardees: 0, illisibles: 0, invalides: 0, doublons: 0, inconnues: 0 };
  const perDay = new Map(); // jour → { visiteuses:Set, view, wish, cart, request }
  const funnel = { view: new Set(), cart: new Set(), request: new Set() }; // visiteuses par étape
  const productViews = new Map();
  const hours = Array(24).fill(0);
  const profiles = new Map(); // visiteuse → Map pièce → intérêt
  const sequences = new Map(); // visiteuse → pièces dans l'ordre (sans répétition)
  const lastSeen = new Map(); // « visiteuse|type|pièce » → horodatage (doublons rapprochés)

  for (const file of files) {
    const rl = readline.createInterface({ input: fs.createReadStream(path.join(dir, file)), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line) continue;
      volume.lignes++;
      let e;
      try {
        e = JSON.parse(line);
      } catch {
        volume.illisibles++;
        continue;
      }
      const at = Date.parse(e?.at);
      if (!VISITOR_RE.test(e?.v) || !EVENT_TYPES.has(e?.t) || typeof e?.p !== 'string' || !Number.isFinite(at)) {
        volume.invalides++;
        continue;
      }
      if (knownProducts && !knownProducts.has(e.p)) {
        volume.inconnues++;
        continue;
      }
      const dupKey = `${e.v}|${e.t}|${e.p}`;
      if (at - (lastSeen.get(dupKey) ?? -Infinity) < 2000) {
        volume.doublons++;
        continue;
      }
      lastSeen.set(dupKey, at);
      if (lastSeen.size > 200_000) lastSeen.clear(); // mémoire bornée
      volume.gardees++;

      const day = e.at.slice(0, 10);
      const d =
        perDay.get(day) ?? perDay.set(day, { visiteuses: new Set(), view: 0, wish: 0, cart: 0, request: 0 }).get(day);
      d.visiteuses.add(e.v);
      d[e.t]++;
      if (funnel[e.t]) funnel[e.t].add(e.v);
      if (e.t === 'view') productViews.set(e.p, (productViews.get(e.p) || 0) + 1);
      hours[new Date(at).getUTCHours()]++; // Dakar = UTC toute l'année

      const prof = profiles.get(e.v) ?? profiles.set(e.v, new Map()).get(e.v);
      prof.set(e.p, Math.max(prof.get(e.p) || 0, WEIGHTS[e.t]));
      const seq = sequences.get(e.v) ?? sequences.set(e.v, []).get(e.v);
      if (seq[seq.length - 1] !== e.p && !seq.includes(e.p)) seq.push(e.p);
    }
  }

  const model = trainItemSimilarity(profiles);
  const evaluation = evaluate(sequences, profiles);
  const visitors = funnel.view.size || 1;
  return {
    genereLe: new Date().toISOString(),
    dureeMs: Date.now() - started,
    fichiers: files.length,
    volume,
    indicateurs: [...perDay]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([jour, d]) => ({
        jour,
        visiteuses: d.visiteuses.size,
        vues: d.view,
        favoris: d.wish,
        paniers: d.cart,
        demandes: d.request,
      })),
    entonnoir: {
      visiteuses: funnel.view.size,
      ajoutPanier: funnel.cart.size,
      demandes: funnel.request.size,
      tauxPanier: Math.round((funnel.cart.size / visitors) * 1000) / 10,
      tauxDemande: Math.round((funnel.request.size / visitors) * 1000) / 10,
    },
    topProduits: [...productViews]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, vues]) => ({ id, vues })),
    heures: hours,
    modele: { pieces: model.items, visiteuses: model.users },
    evaluation,
    _model: model,
  };
}
