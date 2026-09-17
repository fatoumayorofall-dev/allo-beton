#!/usr/bin/env node
/**
 * AUDIT DE L'ARTEFACT — mesure du périmètre livré de la plateforme Allo Béton.
 *
 * Produit les grandeurs citées dans le mémoire (§ 8.4, annexes B à E) à partir
 * du dépôt lui-même, de façon reproductible par un tiers (§ 7.6.3).
 *
 * Usage :   node evaluation/audit-artefact.js
 *           node evaluation/audit-artefact.js --json > evaluation/resultats/audit.json
 */
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const EXCLUS = new Set(['node_modules', 'dist', '.git', 'uploads', 'build', 'coverage']);
const EXT_SOURCE = new Set(['.ts', '.tsx', '.js', '.jsx']);

function parcourir(dir, filtre, acc = []) {
  let entrees;
  try { entrees = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entrees) {
    if (EXCLUS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) parcourir(p, filtre, acc);
    else if (filtre(p)) acc.push(p);
  }
  return acc;
}

const estSource = (p) => EXT_SOURCE.has(path.extname(p)) && !p.endsWith('.bak') && !p.endsWith('.d.ts');
const lignes = (p) => { try { return fs.readFileSync(p, 'utf8').split('\n').length; } catch { return 0; } };

function compterZone(sousDossier) {
  const fichiers = parcourir(path.join(RACINE, sousDossier), estSource);
  return { fichiers: fichiers.length, lignes: fichiers.reduce((s, f) => s + lignes(f), 0) };
}

/** Familles de routes montées dans server.js — c'est le décompte qui fait foi. */
function routes() {
  const src = fs.readFileSync(path.join(RACINE, 'backend', 'server.js'), 'utf8');
  const montees = [...src.matchAll(/app\.use\(\s*['"](\/api[^'"]*)['"]/g)].map(m => m[1]);
  const uniques = [...new Set(montees)].sort();
  const fichiers = parcourir(path.join(RACINE, 'backend', 'routes'), estSource);
  const sousRoutes = parcourir(path.join(RACINE, 'backend', 'routes', 'ecommerce'), estSource);
  return {
    familles_montees: uniques.length,
    liste: uniques,
    fichiers_routes: fichiers.length,
    sous_routes_ecommerce: sousRoutes.length,
    non_montees: fichiers
      .filter(f => path.dirname(f).endsWith('routes'))
      .map(f => path.basename(f, '.js'))
      .filter(n => !new RegExp(`require\\([^)]*routes/${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`)]`).test(src))
  };
}

/** Modules d'interface = sous-dossiers de src/components. */
function modulesFrontend() {
  const base = path.join(RACINE, 'src', 'components');
  const dirs = fs.readdirSync(base, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort();
  return { nombre: dirs.length, liste: dirs };
}

/** Services backend, dont les services d'intelligence artificielle. */
function services() {
  const dirServices = path.join(RACINE, 'backend', 'services');
  const dirIA = path.join(dirServices, 'ai-services');
  const listeIA = fs.readdirSync(dirIA).filter(f => f.endsWith('.js')).sort();
  const detailIA = listeIA.map(f => ({ nom: f, lignes: lignes(path.join(dirIA, f)) }));
  const listeMetier = fs.readdirSync(dirServices, { withFileTypes: true })
    .filter(e => e.isFile() && e.name.endsWith('.js')).map(e => e.name).sort();
  return {
    services_ia: listeIA.length,
    lignes_ia: detailIA.reduce((s, d) => s + d.lignes, 0),
    detail_ia: detailIA,
    services_metier: listeMetier.length,
    total: listeIA.length + listeMetier.length
  };
}

/** Tables de la base : les CREATE TABLE sont dispersés entre migrations ET routes
 *  (certaines tables sont créées à la demande), le balayage porte donc sur tout le backend. */
function tables() {
  const fichiers = parcourir(path.join(RACINE, 'backend'), p => p.endsWith('.js') && !p.endsWith('.bak'));
  const noms = new Map();
  for (const f of fichiers) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([a-z0-9_]+)`?/gi)) {
      const t = m[1].toLowerCase();
      if (!noms.has(t)) noms.set(t, []);
      const rel = path.relative(RACINE, f);
      if (!noms.get(t).includes(rel)) noms.get(t).push(rel);
    }
  }
  const migrations = [...noms].filter(([, fs_]) => fs_.some(f => /migrat|create_|init_/i.test(f)));
  return {
    nombre: noms.size,
    dont_migrations: migrations.length,
    dont_creation_a_la_demande: noms.size - migrations.length,
    liste: [...noms.keys()].sort(),
    origine: Object.fromEntries([...noms].map(([t, f]) => [t, f]))
  };
}

function dependances() {
  const lire = (p) => { try { return JSON.parse(fs.readFileSync(path.join(RACINE, p), 'utf8')); } catch { return {}; } };
  const front = lire('package.json'), back = lire('backend/package.json');
  const n = (o, k) => Object.keys(o[k] || {}).length;
  return {
    frontend_production: n(front, 'dependencies'), frontend_developpement: n(front, 'devDependencies'),
    backend_production: n(back, 'dependencies'),  backend_developpement: n(back, 'devDependencies'),
    total: n(front, 'dependencies') + n(front, 'devDependencies') + n(back, 'dependencies') + n(back, 'devDependencies')
  };
}

const frontend = compterZone('src');
const backend = compterZone('backend');
const rapport = {
  genere_le: new Date().toISOString(),
  methode: "Dénombrement direct des fichiers source du dépôt, dépendances tierces, build et téléversements exclus.",
  code: {
    frontend, backend,
    total_lignes: frontend.lignes + backend.lignes,
    total_fichiers: frontend.fichiers + backend.fichiers
  },
  modules_frontend: modulesFrontend(),
  routes: routes(),
  services: services(),
  tables: tables(),
  dependances: dependances()
};

if (process.argv.includes('--json')) { console.log(JSON.stringify(rapport, null, 2)); process.exit(0); }

const n = (x) => x.toLocaleString('fr-FR');
console.log(`
╔══════════════════════════════════════════════════════════════════╗
║   AUDIT DE L'ARTEFACT — plateforme Allo Béton                    ║
║   ${new Date().toLocaleString('fr-FR').padEnd(62)}║
╚══════════════════════════════════════════════════════════════════╝

VOLUME DE CODE                          lignes      fichiers
  Interface (src/)                   ${n(frontend.lignes).padStart(9)}   ${String(frontend.fichiers).padStart(9)}
  Serveur (backend/)                 ${n(backend.lignes).padStart(9)}   ${String(backend.fichiers).padStart(9)}
  ─────────────────────────────────────────────────────────────
  TOTAL                              ${n(rapport.code.total_lignes).padStart(9)}   ${String(rapport.code.total_fichiers).padStart(9)}

PÉRIMÈTRE FONCTIONNEL
  Modules d'interface                ${String(rapport.modules_frontend.nombre).padStart(9)}
  Familles de routes montées         ${String(rapport.routes.familles_montees).padStart(9)}
  Sous-routes e-commerce             ${String(rapport.routes.sous_routes_ecommerce).padStart(9)}
  Services d'intelligence artificielle ${String(rapport.services.services_ia).padStart(7)}   (${n(rapport.services.lignes_ia)} lignes)
  Services métier                    ${String(rapport.services.services_metier).padStart(9)}
  Tables de la base                  ${String(rapport.tables.nombre).padStart(9)}   (${rapport.tables.dont_migrations} par migration, ${rapport.tables.dont_creation_a_la_demande} à la demande)
  Bibliothèques tierces              ${String(rapport.dependances.total).padStart(9)}
`);
if (rapport.routes.non_montees.length) {
  console.log(`  Note : fichier(s) de route présent(s) mais non monté(s) dans server.js : ${rapport.routes.non_montees.join(', ')}\n`);
}
console.log(`  Détail exploitable :  node evaluation/audit-artefact.js --json\n`);
