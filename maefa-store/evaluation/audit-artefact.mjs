// Mesure reproductible de l'artefact (place de marché Sama Marché et boutique Maefa) : taille du code, routes
// de l'API, tables, règles de gestion, tests. Ce sont les chiffres cités dans le mémoire ; un membre du jury
// qui dispose du dépôt obtient les mêmes. Aucune base de données ni réseau n'est nécessaire.
//
//   node evaluation/audit-artefact.mjs          rapport lisible
//   node evaluation/audit-artefact.mjs --json   sortie JSON (écrite aussi dans evaluation/resultats/)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = p => path.join(ROOT, p);
const SKIP = new Set(['node_modules', 'dist', '.out', 'resultats']);

function files(dir, exts) {
  const out = [];
  const walk = d => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (SKIP.has(e.name)) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (exts.some(x => e.name.endsWith(x))) out.push(p);
    }
  };
  walk(rel(dir));
  return out;
}
/** Lignes non vides (les commentaires comptent : ils documentent le code) */
const lines = list =>
  list.reduce(
    (t, f) =>
      t +
      fs
        .readFileSync(f, 'utf8')
        .split('\n')
        .filter(l => l.trim()).length,
    0,
  );
const count = (list, re) => list.reduce((t, f) => t + (fs.readFileSync(f, 'utf8').match(re) ?? []).length, 0);
const read = p => (fs.existsSync(rel(p)) ? fs.readFileSync(rel(p), 'utf8') : '');

const front = files('src', ['.ts', '.tsx']);
const frontMarket = files('src/marketplace', ['.ts', '.tsx']);
const server = files('server', ['.js', '.mjs']).filter(f => !f.includes(`${path.sep}data${path.sep}`));
const serverMarket = files('server/marketplace', ['.js']);
const unit = files('tests/unit', ['.test.mjs']);
const e2e = files('tests/e2e/suites', ['.cjs']);
const ROUTE = /\bapp\.(get|post|put|patch|delete)\(\s*\n?\s*['"`]\/api\//g;
const merise = read('docs/MERISE.md');
const ledger = server.map(f => fs.readFileSync(f, 'utf8')).join('\n');

const report = {
  date: new Date().toISOString().slice(0, 10),
  code: {
    lignesInterface: lines(front),
    lignesInterfacePlaceDeMarche: lines(frontMarket),
    lignesServeur: lines(server),
    lignesServeurPlaceDeMarche: lines(serverMarket),
    fichiersInterface: front.length,
    fichiersServeur: server.length,
    ecransPlaceDeMarche: frontMarket.filter(f => /\/Mp[A-Z]\w+\.tsx$/.test(f)).length,
  },
  api: {
    routes: count(server, ROUTE),
    routesPlaceDeMarche: count(serverMarket, ROUTE),
    routesDocumenteesOpenAPI: (read('docs/api/openapi.yaml').match(/^ {2}\/\S+:\s*$/gm) ?? []).length,
  },
  donnees: {
    tablesPostgreSQL: (read('server/db/schema.js').match(/pgTable\(/g) ?? []).length,
    reglesDeGestion: new Set(merise.match(/\|\s*RG\d+\s*\|/g)?.map(x => x.replace(/\W/g, '')) ?? []).size,
    typesEcrituresRegistre: [...new Set([...ledger.matchAll(/ledger\.append\(\s*'([a-z_]+)'/g)].map(m => m[1]))].sort(),
  },
  tests: {
    testsUnitaires: count(unit, /^test\(/gm),
    fichiersTestsUnitaires: unit.length,
    scenariosNavigateur: e2e.length,
    verificationsNavigateur: count(e2e, /\bcheck\(/g),
  },
  dependances: Object.keys(JSON.parse(read('package.json')).dependencies ?? {}).length,
};

if (process.argv.includes('--json')) {
  fs.mkdirSync(rel('evaluation/resultats'), { recursive: true });
  fs.writeFileSync(rel('evaluation/resultats/audit-artefact.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} else {
  const c = report.code;
  console.log(`Audit de l'artefact — ${report.date}
Code : ${c.lignesInterface + c.lignesServeur} lignes (interface ${c.lignesInterface}, serveur ${c.lignesServeur})
  dont place de marché : interface ${c.lignesInterfacePlaceDeMarche}, serveur ${c.lignesServeurPlaceDeMarche} ; ${c.ecransPlaceDeMarche} écrans
API : ${report.api.routes} routes (place de marché ${report.api.routesPlaceDeMarche}) ; ${report.api.routesDocumenteesOpenAPI} décrites dans OpenAPI
Données : ${report.donnees.tablesPostgreSQL} tables PostgreSQL ; ${report.donnees.reglesDeGestion} règles de gestion (MERISE)
Registre : ${report.donnees.typesEcrituresRegistre.length} types d'écritures (${report.donnees.typesEcrituresRegistre.join(', ')})
Tests : ${report.tests.testsUnitaires} tests unitaires ; ${report.tests.scenariosNavigateur} scénarios navigateur, ${report.tests.verificationsNavigateur} vérifications
Dépendances directes : ${report.dependances}`);
}
