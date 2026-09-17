#!/usr/bin/env node
/**
 * ÉVALUATION DU SERVICE DE PRÉDICTION DE TRÉSORERIE — rejeu sur historique.
 *
 * Protocole (backtesting) : on masque au service les N derniers jours d'un
 * historique dont on connaît la suite, on lui demande de les prédire, puis on
 * compare la valeur prédite à la valeur réellement observée.
 *
 * Indicateurs : erreur absolue moyenne (MAE), erreur relative moyenne (MAPE),
 * précision (100 − MAPE), et taux de couverture de l'intervalle annoncé.
 * Ces valeurs alimentent le § 8.2 du mémoire (hypothèse H2).
 *
 * Usage :  node evaluation/evaluer-predictions.cjs [--graine 7] [--horizon 7] [--json]
 */
const path = require('path');
const fs = require('fs');

function generateur(graine) { let e = graine >>> 0; return () => { e = (e * 1664525 + 1013904223) >>> 0; return e / 4294967296; }; }
function normale(rnd, m, s) { const u = Math.max(rnd(), 1e-9), v = Math.max(rnd(), 1e-9); return m + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

/** Série journalière réaliste : tendance + saisonnalité hebdomadaire + bruit.
 *  Le samedi est faible et le dimanche quasi nul, comme dans la filière béton. */
function construireSerie({ graine = 7, jours = 90, horizon = 7, base = 900000, penteParJour = 2500, bruit = 90000 } = {}) {
  const rnd = generateur(graine);
  const facteurJour = { 0: 0.15, 1: 1.10, 2: 1.15, 3: 1.05, 4: 1.10, 5: 1.20, 6: 0.55 };
  const serie = [];
  // La série se termine à aujourd'hui + horizon : le service prédit vers l'avant,
  // les jours masqués doivent donc être postérieurs à aujourd'hui pour que les
  // jours de la semaine coïncident.
  for (let i = 0; i < jours; i++) {
    const d = new Date(); d.setDate(d.getDate() - (jours - horizon) + i + 1);
    const valeur = Math.max(0, (base + penteParJour * i) * facteurJour[d.getDay()] + normale(rnd, 0, bruit));
    serie.push({ jour: d.toISOString().slice(0, 10), ca: Math.round(valeur), nb_ventes: Math.max(1, Math.round(valeur / 85000)), tonnes: Math.round(valeur / 40000) });
  }
  return serie;
}

function installerBaseSimulee(serie) {
  const cheminDb = require.resolve(path.join(__dirname, '..', 'backend', 'config', 'database.js'));
  const pool = {
    async execute(sql) {
      const s = sql.replace(/\s+/g, ' ').toLowerCase();
      if (s.includes('date(sale_date) as jour') && s.includes('sum(total_amount)')) return [serie];
      return [[]];
    },
    async query(sql) { return this.execute(sql); }
  };
  require.cache[cheminDb] = { id: cheminDb, filename: cheminDb, loaded: true, exports: { pool, testConnection: async () => true } };
}

(async () => {
  const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? Number(process.argv[i + 1]) : d; };
  const graine = arg('--graine', 7), horizon = arg('--horizon', 7), joursHistorique = 90;

  const complet = construireSerie({ graine, jours: joursHistorique, horizon });
  const apprentissage = complet.slice(0, joursHistorique - horizon);   // ce que le service voit
  const reel = complet.slice(joursHistorique - horizon);               // ce qu'il doit retrouver

  installerBaseSimulee(apprentissage);
  const { getSalesPredictions } = require(path.join(__dirname, '..', 'backend', 'services', 'ai-services', 'predictionService.js'));

  const t0 = Date.now();
  const res = await getSalesPredictions({ days: joursHistorique, forecastDays: horizon });
  const dureeMs = Date.now() - t0;
  if (!res.success || !res.predictions.length) { console.error('Le service n\'a produit aucune prédiction.'); process.exit(1); }

  const lignes = res.predictions.map((p, i) => {
    const attendu = reel[i] ? reel[i].ca : null;
    if (attendu === null) return null;
    const erreur = Math.abs(p.predicted_ca - attendu);
    return { date: reel[i].jour, jour: p.dayName, predit: p.predicted_ca, reel: attendu,
             erreur_absolue: erreur, erreur_relative: attendu ? erreur / attendu : null,
             dans_intervalle: attendu >= p.lower_bound && attendu <= p.upper_bound };
  }).filter(Boolean);

  const exploitables = lignes.filter(l => l.erreur_relative !== null && Number.isFinite(l.erreur_relative));
  const mae = lignes.reduce((s, l) => s + l.erreur_absolue, 0) / lignes.length;
  const mape = exploitables.reduce((s, l) => s + l.erreur_relative, 0) / exploitables.length;
  const couverture = lignes.filter(l => l.dans_intervalle).length / lignes.length;

  const rapport = {
    genere_le: new Date().toISOString(),
    protocole: `Rejeu sur historique : ${joursHistorique - horizon} jours d'apprentissage, ${horizon} jours masqués puis prédits.`,
    graine, horizon_jours: horizon, jours_apprentissage: joursHistorique - horizon,
    performance: { mae_fcfa: Math.round(mae), mape: mape, precision: 1 - mape,
                   taux_couverture_intervalle: couverture, duree_ms: dureeMs },
    tendance_detectee: res.summary.trend, detail: lignes
  };

  if (process.argv.includes('--json')) { console.log(JSON.stringify(rapport, null, 2)); return; }

  const f = (x) => Math.round(x).toLocaleString('fr-FR').padStart(11);
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║   ÉVALUATION — service de prédiction de trésorerie               ║
╚══════════════════════════════════════════════════════════════════╝

PROTOCOLE (graine ${graine}, reproductible)
  Historique d'apprentissage          ${String(joursHistorique - horizon).padStart(5)} jours
  Horizon masqué puis prédit          ${String(horizon).padStart(5)} jours

COMPARAISON JOUR PAR JOUR
  date         jour        prédit (FCFA)   réel (FCFA)   écart    intervalle`);
  for (const l of lignes)
    console.log(`  ${l.date}  ${l.jour.padEnd(6)} ${f(l.predit)} ${f(l.reel)}  ${(l.erreur_relative * 100).toFixed(1).padStart(6)} %   ${l.dans_intervalle ? '✓' : '✗'}`);
  console.log(`
PERFORMANCE
  Erreur absolue moyenne (MAE)        ${Math.round(mae).toLocaleString('fr-FR').padStart(11)} FCFA
  Erreur relative moyenne (MAPE)      ${(mape * 100).toFixed(1).padStart(11)} %
  Précision (100 − MAPE)              ${((1 - mape) * 100).toFixed(1).padStart(11)} %
  Couverture de l'intervalle annoncé  ${(couverture * 100).toFixed(1).padStart(11)} %
  Tendance détectée                   ${res.summary.trend.padStart(11)}
  Durée d'exécution                   ${String(dureeMs).padStart(11)} ms
`);
  fs.mkdirSync(path.join(__dirname, 'resultats'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'resultats', 'predictions.json'), JSON.stringify(rapport, null, 2));
  console.log(`  Rapport écrit dans evaluation/resultats/predictions.json\n`);
})();
