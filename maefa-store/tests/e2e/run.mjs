// ============================================================
//  TESTS DE BOUT EN BOUT (Playwright)
//  Chaque scénario joue un vrai parcours dans un navigateur (cliente, gérante, livreur) contre
//  le site compilé et un serveur neuf (données vides). Les services de carte (recherche
//  d'adresse, itinéraires, lieux connus) sont simulés par geomock.cjs : aucun appel extérieur.
//
//  Usage :  npm run build && npm run test:e2e            (tous les scénarios)
//           npm run test:e2e -- livraison demande        (quelques scénarios)
//  Captures d'écran et journal du serveur : tests/e2e/.out/
// ============================================================
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const OUT = path.join(here, '.out');
const SUITES = fs
  .readdirSync(path.join(here, 'suites'))
  .filter(f => f.endsWith('.cjs'))
  .map(f => f.replace(/\.cjs$/, ''))
  .sort();
/** Réglages propres à un scénario (ex. : code SMS affiché à l'écran pour la connexion). */
const EXTRA_ENV = { compte: { OTP_DEV_MODE: '1' } };
const GEO = 'http://localhost:9922';

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(url, ms = 20000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      const r = await fetch(url);
      if (r.status < 500) return true;
    } catch {
      /* pas encore prêt */
    }
    await sleep(250);
  }
  throw new Error(`Service injoignable : ${url}`);
}

const children = [];
const launch = (cmd, args, env = {}, logFile) => {
  const out = logFile ? fs.openSync(logFile, 'w') : 'ignore';
  const c = spawn(cmd, args, { cwd: root, env: { ...process.env, ...env }, stdio: ['ignore', out, out] });
  children.push(c);
  return c;
};
const stopAll = () => {
  for (const c of children) if (c.exitCode === null) c.kill('SIGTERM');
};
process.on('exit', stopAll);
process.on('SIGINT', () => {
  stopAll();
  process.exit(130);
});

const wanted = process.argv.slice(2).length ? process.argv.slice(2) : SUITES;
const unknown = wanted.filter(n => !SUITES.includes(n));
if (unknown.length) {
  console.error(`Scénario inconnu : ${unknown.join(', ')}\nDisponibles : ${SUITES.join(', ')}`);
  process.exit(2);
}
if (!fs.existsSync(path.join(root, 'dist/index.html'))) {
  console.error("Site non compilé : lancez « npm run build » d'abord.");
  process.exit(2);
}
fs.mkdirSync(OUT, { recursive: true });

// Services communs : cartes simulées et site compilé (vite preview, utilisé par certains scénarios)
launch('node', [path.join(here, 'geomock.cjs')]);
launch('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], {}, path.join(OUT, 'preview.log'));
await waitFor(GEO + '/');
await waitFor('http://localhost:4173/');

let failures = 0;
const summary = [];
for (const name of wanted) {
  // Un serveur neuf par scénario : données vides, mêmes réglages qu'en production
  const dataDir = path.join(OUT, 'data');
  fs.rmSync(dataDir, { recursive: true, force: true });
  const server = launch(
    'node',
    ['server/index.js'],
    {
      DATA_DIR: dataDir,
      ADMIN_PIN: '2026',
      SITE_URL: 'http://localhost:8787',
      PHOTON_URL: GEO,
      NOMINATIM_URL: GEO,
      OSRM_URL: GEO,
      OVERPASS_URL: GEO + '/api/interpreter',
      ...(EXTRA_ENV[name] ?? {}),
    },
    path.join(OUT, 'server.log'),
  );
  await waitFor('http://localhost:8787/');

  const started = Date.now();
  const res = await new Promise(resolve => {
    let text = '';
    const t = spawn('node', [path.join(here, 'suites', name + '.cjs')], {
      cwd: root,
      env: { ...process.env, SP: OUT },
    });
    t.stdout.on('data', d => {
      text += d;
    });
    t.stderr.on('data', d => {
      text += d;
    });
    const timer = setTimeout(() => t.kill('SIGKILL'), 500_000);
    t.on('exit', code => {
      clearTimeout(timer);
      resolve({ code, text });
    });
  });
  server.kill('SIGTERM');
  await new Promise(r => (server.exitCode !== null ? r() : server.on('exit', r)));

  const lines = res.text.split('\n');
  const ok = lines.filter(l => /^OK/.test(l)).length;
  const bad = lines.filter(l => /^(FAIL|ERR)/.test(l) || /^\s*at .*\.cjs|Error:/.test(l));
  const failed = bad.length > 0 || ok === 0 || res.code !== 0;
  if (failed) failures++;
  const secs = ((Date.now() - started) / 1000).toFixed(0);
  summary.push(
    `${failed ? '✗' : '✓'} ${name.padEnd(12)} ${String(ok).padStart(3)} vérifications réussies${failed ? `, échecs :\n    ${(bad.length ? bad : lines.slice(-5)).slice(0, 6).join('\n    ')}` : ''}  (${secs} s)`,
  );
  console.log(summary[summary.length - 1]);
  // Sur GitHub Actions : chaque échec devient une annotation visible dans le contrôle
  if (failed && process.env.GITHUB_ACTIONS) {
    const detail = (bad.length ? bad : lines.slice(-8))
      .slice(0, 8)
      .join(' | ')
      .replace(/%/g, '%25')
      .replace(/\r?\n/g, ' ');
    console.log(`::error title=Scénario ${name}::${detail.slice(0, 900)}`);
  }
}

stopAll();
console.log(`\n${wanted.length - failures}/${wanted.length} scénarios réussis`);
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `## Tests de bout en bout\n\n\`\`\`\n${summary.join('\n')}\n\`\`\`\n`,
  );
}
process.exit(failures ? 1 : 0);
