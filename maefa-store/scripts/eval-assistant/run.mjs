/**
 * Tests de l'assistante Maé (« entraînement » par les conversations types).
 *
 *   npm run eval:assistant            → tests hors ligne (vendeuse sans IA) + conversations IA si la clé est là
 *   npm run eval:assistant -- --offline   → seulement les tests hors ligne
 *
 * Les conversations IA demandent ANTHROPIC_API_KEY (comme le serveur). Chaque réponse est vérifiée
 * automatiquement et un rapport lisible est écrit dans scripts/eval-assistant/rapport.md.
 */
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCENARIOS } from './scenarios.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '.bundle.mjs');
await build({ entryPoints: [path.join(here, 'entry.ts')], bundle: true, format: 'esm', platform: 'node', outfile: OUT, logLevel: 'error' });
const M = await import(OUT + `?t=${Date.now()}`);
const products = M.products;
const bySlug = new Map(products.map(p => [p.slug, p]));

let pass = 0, fail = 0;
const lines = [];
const ok = (name, cond, extra = '') => { cond ? pass++ : fail++; lines.push(`${cond ? 'OK  ' : 'FAIL'} ${name}${extra ? ` — ${extra}` : ''}`); };

/* ================================================================== */
/*  1. Vendeuse hors ligne (sans IA) sur le vrai catalogue             */
/* ================================================================== */
{
  const { recommend, nextQuestion, pitch, modelOf } = M;
  const shoes = recommend(products, { kind: 'chaussures', occasion: 'soiree', color: 'tout', budget: 0, size: '38' });
  ok('chaussures soirée 38 : des pièces', shoes.items.length > 0);
  ok('chaussures : toutes en 38', shoes.items.every(p => p.sizes.includes('38')));
  ok('chaussures : que des chaussures', shoes.items.every(p => p.category === 'chaussures'));
  const bags = recommend(products, { kind: 'sacs', occasion: 'mariage', color: 'tout', budget: 16000 });
  ok('sacs mariage ≤ 16 000 : des pièces', bags.items.length > 0);
  ok('sacs : budget respecté', bags.items.every(p => p.price <= 16000), bags.items.map(p => p.price).join(', '));
  ok('sacs : un seul par modèle', new Set(bags.items.map(modelOf)).size === bags.items.length);
  const noir = recommend(products, { kind: 'sacs', occasion: 'tout', color: 'noir', budget: 0 });
  ok('sacs noirs : couleur respectée', noir.exact && noir.items.every(p => p.colors.some(c => /noir/i.test(c.name))));
  const none = recommend(products, { kind: 'chaussures', occasion: 'tout', color: 'tout', budget: 0, size: '44' });
  ok('pointure 44 introuvable : rien proposé à tort', none.items.every(p => p.sizes.includes('44')));
  const cheap = recommend(products, { kind: 'tout', occasion: 'tout', color: 'tout', budget: 1000 });
  ok('budget impossible : aucune pièce hors budget', cheap.items.length === 0);
  ok('ordre des questions : type d\'abord', nextQuestion({})?.key === 'kind');
  ok('pointure demandée pour les chaussures', nextQuestion({ kind: 'chaussures', occasion: 'soiree', color: 'noir', budget: 0 })?.key === 'size');
  ok('pas de pointure pour un sac', nextQuestion({ kind: 'sacs', occasion: 'soiree', color: 'noir', budget: 0 }) === null);
  const p = shoes.items[0];
  ok('présentation wolof : prix et pointure', /FCFA/.test(pitch(p, { size: '38', occasion: 'soiree' }, 'wo')) && /pointure 38/.test(pitch(p, { size: '38', occasion: 'soiree' }, 'wo')));
  ok('présentation français : prix', /FCFA/.test(pitch(p, { occasion: 'soiree' }, 'fr')));
  ok('secours wolof : paiement', /Wave/.test(M.wolofLocalAnswer('naka laay fey')));
  ok('secours wolof : livraison', /24 waxtu/.test(M.wolofLocalAnswer('yónnee ci Dakar')));
  // Aucune grande marque de copie dans les noms du catalogue
  ok('catalogue : aucune grande marque de copie', !products.some(x => /herm[eè]s|chanel|gucci|tod'?s|pol[eè]ne|loewe/i.test(`${x.name} ${x.description}`)));
}

/* ================================================================== */
/*  2. Conversations avec l'IA                                         */
/* ================================================================== */
const report = [`# Rapport des tests de Maé\n\n_${new Date().toLocaleString('fr-FR')}_\n`];
const offline = process.argv.includes('--offline');
const hasKey = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

if (!offline && hasKey) {
  const { streamAssistant } = await import('../../server/assistant.js');
  const shop = {
    phone: M.SITE_CONFIG.phone, whatsapp: M.SITE_CONFIG.whatsappRaw, address: M.SITE_CONFIG.address, hours: M.SITE_CONFIG.hours,
    freeShippingThreshold: M.SITE_CONFIG.freeShippingThreshold, giftWrapFee: M.SITE_CONFIG.giftWrapFee,
    zones: M.DELIVERY_ZONES, promos: M.PROMO_CODES, faq: M.FAQ_ITEMS, occasions: M.OCCASIONS.map(o => `${o.id} = ${o.name}`),
    categories: M.CATEGORIES.map(c => c.name),
    fetes: M.upcomingFetes().slice(0, 6).map(f => `${f.name} : ${f.lunar ? 'vers le ' : ''}${M.formatDay(f.date)} ${f.date.getFullYear()}`),
  };
  const ask = async (messages, sc) => {
    let text = '';
    await streamAssistant({ messages, shop, products, visitor: { page: '/', cart: [], orders: [], pointure: sc.pointure }, lang: sc.lang }, ev => { if (ev.type === 'text') text += ev.text; });
    return text;
  };
  const BRANDS = /herm[eè]s|chanel|gucci|tod'?s|pol[eè]ne|loewe|dior|louis vuitton/i;
  const WOLOF = /\b(nga|ngi|dafa|am na|ak|ci|la|yi|bi|dinañu|mën|jërëjëf|waaw|déedéet|xool|bëgg|tànn)\b/gi;

  for (const sc of SCENARIOS) {
    const messages = [];
    let answer = '';
    try {
      for (const said of sc.say) {
        messages.push({ role: 'user', content: said });
        answer = await ask(messages, sc);
        messages.push({ role: 'assistant', content: answer });
      }
    } catch (e) {
      ok(`[${sc.id}] réponse`, false, e.message);
      continue;
    }
    const e = sc.expect, name = `[${sc.id}]`;
    const shown = answer.replace(/\[\[pointure:\d+\]\]/g, '');
    const slugs = [...shown.matchAll(/\(\/produit\/([a-z0-9-]+)\)/g)].map(m => m[1]);
    const linked = slugs.map(s => bySlug.get(s));
    ok(`${name} liens vers de vraies pièces`, linked.every(Boolean), slugs.filter(s => !bySlug.has(s)).join(', '));
    const real = linked.filter(Boolean);
    // Prix cités = prix du catalogue
    for (const pr of real) {
      const near = shown.slice(shown.indexOf(pr.slug), shown.indexOf(pr.slug) + 160);
      const m = near.match(/(\d{1,3}(?:[\s  .]\d{3})+|\d{4,6})\s*(?:F|FCFA)/);
      if (m) ok(`${name} prix exact de ${pr.slug}`, Number(m[1].replace(/\D/g, '')) === pr.price, `${m[1]} (catalogue ${pr.price})`);
    }
    if (e.links) ok(`${name} propose des pièces`, real.length > 0);
    if (e.maxPrice) ok(`${name} budget ≤ ${e.maxPrice}`, real.every(p => p.price <= e.maxPrice), real.map(p => p.price).join(', '));
    if (e.category) ok(`${name} bonne catégorie`, real.every(p => p.category === e.category));
    if (e.size) ok(`${name} pointure ${e.size} disponible`, real.filter(p => p.sizes.length).every(p => p.sizes.includes(e.size)));
    if (e.noSizeLinks) ok(`${name} pas de pièce sans la pointure ${e.noSizeLinks}`, real.filter(p => p.sizes.length).every(p => p.sizes.includes(e.noSizeLinks)));
    if (e.sizeTag) ok(`${name} pointure retenue`, new RegExp(`\\[\\[pointure:${e.sizeTag}\\]\\]`).test(answer));
    if (e.colorRe) ok(`${name} couleur demandée`, real.every(p => p.colors.some(c => e.colorRe.test(c.name))));
    const questions = (shown.match(/\?/g) || []).length;
    if (e.maxQuestions) ok(`${name} une question à la fois`, questions <= e.maxQuestions, `${questions} questions`);
    if (e.maxQuestionsIfNoLinks && !real.length) ok(`${name} une question à la fois`, questions <= e.maxQuestionsIfNoLinks);
    if (e.noBrands !== false) ok(`${name} aucune grande marque pour vanter`, !BRANDS.test(shown) || /\bnon\b|pas /i.test(shown));
    if (e.noInventedDiscount) ok(`${name} aucune remise inventée`, !/-\s?\d+\s?%|\d+\s?%\s?de (remise|réduction)/i.test(shown));
    for (const re of e.mentions || []) ok(`${name} mentionne ${re}`, re.test(shown));
    for (const re of e.forbid || []) ok(`${name} n'écrit pas ${re}`, !re.test(shown));
    if (e.wolof) ok(`${name} répond en wolof`, (shown.match(WOLOF) || []).length >= 3);
    report.push(`## ${sc.id} (${sc.lang})\n\n${sc.say.map(s => `> **Cliente :** ${s}`).join('\n>\n')}\n\n**Maé :** ${shown.trim()}\n`);
  }
} else {
  lines.push(offline ? '(conversations IA ignorées : --offline)' : '(conversations IA ignorées : ANTHROPIC_API_KEY absente — à lancer sur le serveur ou avec la clé)');
}

fs.rmSync(OUT, { force: true });
report.push(`\n---\n\n## Résultat : ${pass} OK, ${fail} échec(s)\n\n\`\`\`\n${lines.join('\n')}\n\`\`\`\n`);
fs.writeFileSync(path.join(here, 'rapport.md'), report.join('\n'));
console.log(lines.join('\n'));
console.log(`\n${pass} OK, ${fail} échec(s) — rapport : scripts/eval-assistant/rapport.md`);
process.exit(fail ? 1 : 0);
