// DONNÉES SYNTHÉTIQUES DE TEST (pas de vraies clientes) : génère un gros journal d'événements
// pour mesurer le pipeline sur un volume important et évaluer le modèle de recommandation.
// Usage : DATA_DIR=/tmp/maefa-demo VISITORS=50000 DAYS=30 node scripts/data/generate-events.mjs
// Les visiteuses simulées ont des goûts (catégorie, couleur) : le modèle doit les retrouver.
import fs from 'node:fs';
import path from 'node:path';

const dataDir = process.env.DATA_DIR || '/tmp/maefa-demo';
const VISITORS = Number(process.env.VISITORS) || 20000;
const DAYS = Number(process.env.DAYS) || 30;
const CATS = ['sacs', 'chaussures'];
const COLORS = ['noir', 'camel', 'bordeaux', 'blanc', 'or', 'rose'];
const products = [];
let n = 101;
for (const cat of CATS)
  for (const color of COLORS) for (let m = 0; m < 4; m++) products.push({ id: `MAE-${n++}`, cat, color });

let seed = 42;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = arr => arr[Math.floor(rnd() * arr.length)];
const dir = path.join(dataDir, 'events');
fs.mkdirSync(dir, { recursive: true });
const start = Date.now() - DAYS * 864e5;
const out = new Map();
let total = 0;
for (let v = 0; v < VISITORS; v++) {
  const visitor = `synth-${v.toString(36).padStart(6, '0')}`;
  const likesCat = pick(CATS),
    likesColor = pick(COLORS);
  const pool = products.filter(
    p => (rnd() < 0.8 ? p.cat === likesCat : true) && (rnd() < 0.7 ? p.color === likesColor : true),
  );
  let t = start + rnd() * DAYS * 864e5;
  const steps = 2 + Math.floor(rnd() * 8);
  for (let s = 0; s < steps; s++) {
    const p = pick(pool.length ? pool : products);
    t += 20e3 + rnd() * 300e3;
    const type = rnd() < 0.75 ? 'view' : rnd() < 0.5 ? 'wish' : rnd() < 0.7 ? 'cart' : 'request';
    const day = new Date(t).toISOString().slice(0, 10);
    const line = JSON.stringify({ v: visitor, t: type, p: p.id, at: new Date(t).toISOString() });
    (out.get(day) ?? out.set(day, []).get(day)).push(line);
    total++;
  }
}
for (const [day, lines] of out) fs.writeFileSync(path.join(dir, `${day}.jsonl`), lines.join('\n') + '\n');
console.log(
  `${total.toLocaleString('fr-FR')} événements synthétiques pour ${VISITORS.toLocaleString('fr-FR')} visiteuses → ${dir}`,
);
