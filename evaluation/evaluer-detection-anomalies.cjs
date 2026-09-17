#!/usr/bin/env node
/**
 * ÉVALUATION DU SERVICE DE DÉTECTION D'ANOMALIES
 *
 * Protocole (test structurel, Hevner et al. 2004) : on construit un jeu de ventes
 * dont on connaît la vérité terrain — quelles lignes sont anormales et lesquelles
 * ne le sont pas — puis on mesure ce que le service retrouve.
 *
 * Indicateurs produits : précision, rappel, F1, taux de fausses alertes.
 * Ces valeurs alimentent le § 8.2 du mémoire (hypothèse H2).
 *
 * Aucune base de données n'est requise : l'accès aux données est substitué
 * en mémoire, ce qui rend l'exécution reproductible par un tiers (§ 7.6.3).
 *
 * Usage :  node evaluation/evaluer-detection-anomalies.cjs [--graine 42] [--json]
 */
const path = require('path');
const fs = require('fs');
const Module = require('module');

// ── Générateur pseudo-aléatoire déterministe (pour que le test soit reproductible) ──
function generateur(graine) {
  let e = graine >>> 0;
  return () => { e = (e * 1664525 + 1013904223) >>> 0; return e / 4294967296; };
}
function normale(rnd, moyenne, ecartType) {
  const u = Math.max(rnd(), 1e-9), v = Math.max(rnd(), 1e-9);
  return moyenne + ecartType * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ── Construction du jeu de contrôle ──
function construireJeu({ graine = 42, nNormales = 200, nAnormales = 12 } = {}) {
  const rnd = generateur(graine);
  const MOYENNE = 850000, ECART = 120000;     // ventes de béton en FCFA
  const ventes = [];
  const verite = new Map();                    // sale_number -> true si réellement anormale

  const jour = (i) => {
    const d = new Date(); d.setDate(d.getDate() - (i % 60)); return d.toISOString().slice(0, 10);
  };

  for (let i = 0; i < nNormales; i++) {
    const num = `V-N-${String(i).padStart(4, '0')}`;
    ventes.push({ id: i, sale_number: num, total_amount: Math.round(normale(rnd, MOYENNE, ECART)),
                  sale_date: jour(i), client: `Client ${i % 25}`, weight_loaded: Math.round(normale(rnd, 22, 3)),
                  type_beton: ['B25', 'B30', 'B35'][i % 3] });
    verite.set(num, false);
  }
  // anomalies délibérées : au-delà de 4 écarts-types, donc indiscutablement hors distribution
  for (let i = 0; i < nAnormales; i++) {
    const num = `V-A-${String(i).padStart(4, '0')}`;
    const signe = i % 2 === 0 ? 1 : -1;
    const ecarts = 4 + (i % 3);
    ventes.push({ id: 1000 + i, sale_number: num,
                  total_amount: Math.max(1000, Math.round(MOYENNE + signe * ecarts * ECART)),
                  sale_date: jour(i * 3), client: `Client ${i}`, weight_loaded: 22, type_beton: 'B25' });
    verite.set(num, true);
  }
  return { ventes, verite };
}

// ── Substitution de l'accès aux données ──
function installerBaseSimulee(jeu) {
  const cheminDb = require.resolve(path.join(__dirname, '..', 'backend', 'config', 'database.js'));
  const pool = {
    async execute(sql) {
      const s = sql.replace(/\s+/g, ' ').toLowerCase();
      if (s.includes('from sales s') && s.includes('customers c')) return [jeu.ventes];
      if (s.includes('date(sale_date) as jour') && s.includes('count(*)'))
        return [[...new Set(jeu.ventes.map(v => v.sale_date))].map(j => ({ jour: j, nb: 1 }))];
      if (s.includes('from cash_movements') || s.includes('from cash')) return [[]];
      if (s.includes('from customers')) return [[]];
      return [[]];
    },
    async query(sql) { return this.execute(sql); }
  };
  require.cache[cheminDb] = { id: cheminDb, filename: cheminDb, loaded: true, exports: { pool, testConnection: async () => true } };
}

// ── Mesure ──
function mesurer(anomaliesTrouvees, verite) {
  const signalees = new Set(
    anomaliesTrouvees.filter(a => a.reference).map(a => a.reference)
  );
  let vp = 0, fp = 0, fn = 0, vn = 0;
  for (const [num, estAnormale] of verite) {
    const detectee = signalees.has(num);
    if (estAnormale && detectee) vp++;
    else if (!estAnormale && detectee) fp++;
    else if (estAnormale && !detectee) fn++;
    else vn++;
  }
  const precision = vp + fp ? vp / (vp + fp) : 0;
  const rappel = vp + fn ? vp / (vp + fn) : 0;
  const f1 = precision + rappel ? (2 * precision * rappel) / (precision + rappel) : 0;
  return { vrais_positifs: vp, faux_positifs: fp, faux_negatifs: fn, vrais_negatifs: vn,
           precision, rappel, f1, taux_fausses_alertes: fp + vn ? fp / (fp + vn) : 0 };
}

(async () => {
  const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? Number(process.argv[i + 1]) : d; };
  const graine = arg('--graine', 42);

  const jeu = construireJeu({ graine });
  installerBaseSimulee(jeu);

  const t0 = Date.now();
  const { detectAnomalies } = require(path.join(__dirname, '..', 'backend', 'services', 'ai-services', 'anomalyDetectionService.js'));
  const resultat = await detectAnomalies({ days: 60 });
  const dureeMs = Date.now() - t0;

  if (!resultat.success) { console.error('Échec du service :', resultat.error); process.exit(1); }

  // le service ne renvoie que les 20 anomalies les plus graves : on le signale explicitement
  const tronque = resultat.summary.total > resultat.anomalies.length;
  const m = mesurer(resultat.anomalies, jeu.verite);

  const rapport = {
    genere_le: new Date().toISOString(),
    protocole: "Jeu de contrôle synthétique à vérité terrain connue ; accès aux données substitué en mémoire.",
    graine, jeu: { ventes_normales: 200, ventes_anormales: 12, total: 212 },
    sortie_service: { anomalies_totales: resultat.summary.total, anomalies_retournees: resultat.anomalies.length,
                      liste_tronquee: tronque, score_de_risque: resultat.riskScore, niveau: resultat.riskLevel },
    performance: m, duree_ms: dureeMs
  };

  if (process.argv.includes('--json')) { console.log(JSON.stringify(rapport, null, 2)); return; }

  const pc = (x) => (x * 100).toFixed(1).padStart(6) + ' %';
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║   ÉVALUATION — service de détection d'anomalies                  ║
╚══════════════════════════════════════════════════════════════════╝

JEU DE CONTRÔLE (graine ${graine}, reproductible)
  Ventes normales                          200
  Ventes anormales introduites              12   (écarts de 4 à 6 sigma)

MATRICE DE CONFUSION
  Vrais positifs   (anomalie détectée)   ${String(m.vrais_positifs).padStart(5)}
  Faux négatifs    (anomalie manquée)    ${String(m.faux_negatifs).padStart(5)}
  Faux positifs    (fausse alerte)       ${String(m.faux_positifs).padStart(5)}
  Vrais négatifs                         ${String(m.vrais_negatifs).padStart(5)}

PERFORMANCE
  Précision   (part des alertes justes)  ${pc(m.precision)}
  Rappel      (part des anomalies vues)  ${pc(m.rappel)}
  Score F1                               ${pc(m.f1)}
  Taux de fausses alertes                ${pc(m.taux_fausses_alertes)}

  Durée d'exécution                      ${String(dureeMs).padStart(5)} ms
`);
  if (tronque) console.log(`  ⚠  Le service plafonne sa sortie à 20 anomalies (${resultat.summary.total} détectées au total).\n     Le rappel mesuré est donc un plancher, non la capacité réelle du détecteur.\n`);
  fs.mkdirSync(path.join(__dirname, 'resultats'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'resultats', 'detection-anomalies.json'), JSON.stringify(rapport, null, 2));
  console.log(`  Rapport écrit dans evaluation/resultats/detection-anomalies.json\n`);
})();
