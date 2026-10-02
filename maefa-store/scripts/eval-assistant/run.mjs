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
import { INTENT_EXAM, SLOT_EXAM, CONVERSATIONS, ORTHO_PAIRS, LANG_EXAM, AMOUNTS } from './examen.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '.bundle.mjs');
await build({ entryPoints: [path.join(here, 'entry.ts')], bundle: true, format: 'esm', platform: 'node', outfile: OUT, logLevel: 'error' });
const M = await import(OUT + `?t=${Date.now()}`);
const products = M.products;
const bySlug = new Map(products.map(p => [p.slug, p]));

let pass = 0, fail = 0;
const report = [`# Rapport des tests de Maé\n\n_${new Date().toLocaleString('fr-FR')}_\n\n## Conversations de Maé (gratuite, sans IA payante)\n`];
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
  ok('présentation wolof : classe de prix et pointure', /\d – \d.* F/.test(pitch(p, { size: '38', occasion: 'soiree' }, 'wo')) && /pointure 38/.test(pitch(p, { size: '38', occasion: 'soiree' }, 'wo')));
  ok('présentation français : classe de prix, jamais le prix exact', /\d – \d.* F/.test(pitch(p, { occasion: 'soiree' }, 'fr')) && !pitch(p, { occasion: 'soiree' }, 'fr').includes(p.price.toLocaleString('fr-FR')));
  ok('secours wolof : paiement', /Wave/.test(M.wolofLocalAnswer('naka laay fey')));
  ok('secours wolof : livraison', /24 waxtu/.test(M.wolofLocalAnswer('yónnee ci Dakar')));
  // Aucune grande marque de copie dans les noms du catalogue
  ok('catalogue : aucune grande marque de copie', !products.some(x => /herm[eè]s|chanel|gucci|tod'?s|pol[eè]ne|loewe/i.test(`${x.name} ${x.description}`)));
}

/* ================================================================== */
/*  1 bis. Maé gratuite : examen de compréhension et conversations      */
/* ================================================================== */
{
  // Intentions sur des phrases jamais apprises
  let good = 0; const missed = [];
  for (const [text, want] of INTENT_EXAM) {
    const got = M.understand(text).intent;
    if (got === want) good++; else missed.push(`« ${text} » → ${got} (attendu ${want})`);
  }
  const score = Math.round((good / INTENT_EXAM.length) * 100);
  ok(`examen : ${good}/${INTENT_EXAM.length} phrases comprises (${score} %)`, score >= 90, missed.slice(0, 8).join(' ; '));
  // Détails repérés
  for (const [text, want] of SLOT_EXAM) {
    const got = M.extractSlots(text, products);
    const bad = Object.entries(want).filter(([k, v]) => got[k] !== v);
    ok(`détails : « ${text} »`, !bad.length, bad.map(([k, v]) => `${k}=${got[k]} au lieu de ${v}`).join(', '));
  }
  // Langue
  ok('langue : wolof reconnu', M.detectLang('dama bëgg sac bu rafet') === 'wo' && M.detectLang('naka laay fey') === 'wo');
  ok('langue : français reconnu', M.detectLang('je cherche un sac pour le bureau') === 'fr');
  // Conversations complètes
  const WOLOF = /\b(nga|ngi|dafa|am na|ak|ci|la|yi|bi|dinañu|mën|xoolal|tànnal|ban|bësal|lañu)\b/gi;
  for (const conv of CONVERSATIONS) {
    let state = M.newBrainState(conv.lang);
    let prevPrices = [], prevIds = [], prevText = '';
    conv.turns.forEach(([said, e], i) => {
      const r = M.reply(said, state, { products, orders: [], lang: conv.lang, cartTotal: conv.cartTotal ?? 0 });
      state = r.state;
      const name = `conversation ${conv.id} · ${i + 1} « ${said} »`;
      const slugs = [...r.text.matchAll(/\(\/produit\/([a-z0-9-]+)\)/g)].map(m => m[1]);
      // Pièces présentées (lignes « - [..] ») ; la suggestion « pour compléter le look » est à part
      const items = [...r.text.matchAll(/^- \[[^\]]+\]\(\/produit\/([a-z0-9-]+)\)/gm)].map(m => bySlug.get(m[1])).filter(Boolean);
      const bad = [];
      if (e.intent && r.intent !== e.intent) bad.push(`intention ${r.intent}`);
      if (e.chips && !r.chips.length) bad.push('pas de boutons');
      if (e.ask && state.pending !== e.ask) bad.push(`question ${state.pending ?? 'aucune'} au lieu de ${e.ask}`);
      if (e.products && !items.length) bad.push('aucune pièce');
      if (e.noProducts && items.length) bad.push('pièces proposées à tort');
      if (e.category && items.some(p => p.category !== e.category)) bad.push('mauvaise catégorie');
      if (e.size && items.some(p => !p.sizes.includes(e.size))) bad.push(`pas en ${e.size}`);
      if (e.maxPrice && items.some(p => p.price > e.maxPrice)) bad.push('budget dépassé');
      if (e.cheaper && !(items.length ? Math.max(...items.map(p => p.price)) < Math.min(...prevPrices) : /plus doux|gën a yomb/.test(r.text))) bad.push('pas moins cher');
      if (e.fresh && items.some(p => prevIds.includes(p.id))) bad.push('mêmes pièces');
      if (e.mentions && !e.mentions.test(r.text)) bad.push(`ne dit pas ${e.mentions}`);
      if (e.wolof && (r.text.match(WOLOF) || []).length < 3) bad.push('pas en wolof');
      if (e.mentions2 && !e.mentions2.test(r.text)) bad.push(`ne dit pas ${e.mentions2}`);
      if (e.benefit && !/payer en espèces à la livraison|vérifiez la pièce|24 h à Dakar|vraie équipe|fey bu la ko indilee|seet ci kanam|24 waxtu|nit ñu lay tontu/i.test(r.text)) bad.push('aucun argument de vente');
      if (e.crossSell && !/compléter le look|Ngir mu dëppoo/.test(r.text)) bad.push('pas de pièce pour compléter le look');
      if (e.varied && prevText && r.text.split('\n')[0] === prevText.split('\n')[0]) bad.push('même phrase d\'intro que la réponse d\'avant');
      // Marketing honnête : jamais de fausse rareté, de fausse promo ou de faux avis
      if (/derni[eè]res? pi[eè]ces?|plus que \d|stock limité|il n'en reste|-\s?\d+\s?%|\d+ (clientes|avis)|best-seller n°/i.test(r.text.replace(/BIENVENUE\**\s?\(-10 %[^)]*\)/, ''))) bad.push('argument trompeur');
      if (slugs.some(sl => !bySlug.has(sl))) bad.push('lien vers une pièce inexistante');
      ok(name, !bad.length, bad.join(', '));
      report.push(`**Cliente :** ${said}\n\n**Maé :** ${r.text}${r.chips.length ? `\n\n_Boutons : ${r.chips.join(' · ')}_` : ''}\n`);
      if (items.length) { prevPrices = items.map(p => p.price); prevIds = items.map(p => p.id); prevText = r.text; }
    });
  }
}

/* ================================================================== */
/*  1 ter. Évaluation approfondie (fiche d'évaluation)                  */
/* ================================================================== */
{
  const sheet = ['\n## Fiche d\'évaluation\n'];
  // Validation croisée à 5 plis sur les phrases d'entraînement
  const all = Object.entries(M.TRAINING).flatMap(([intent, list]) => list.map((t, i) => ({ t, intent, fold: i % 5 })));
  const perIntent = {};
  let good = 0;
  for (let f = 0; f < 5; f++) {
    const train = {};
    for (const x of all) if (x.fold !== f) (train[x.intent] ??= []).push(x.t);
    const clf = M.makeClassifier(train);
    for (const x of all.filter(y => y.fold === f)) {
      const got = clf(x.t)[0].label;
      perIntent[x.intent] ??= { n: 0, ok: 0 };
      perIntent[x.intent].n++;
      if (got === x.intent) { perIntent[x.intent].ok++; good++; }
    }
  }
  const cv = Math.round((good / all.length) * 1000) / 10;
  ok(`validation croisée (5 plis, ${all.length} phrases) : ${cv} %`, cv >= 70);
  const weakest = Object.entries(perIntent).map(([k, v]) => [k, Math.round((v.ok / v.n) * 100)]).sort((a, b) => a[1] - b[1]);
  sheet.push(`| Mesure | Résultat |\n|---|---|\n| Phrases d'entraînement | ${all.length} (${Object.keys(M.TRAINING).length} intentions) |\n| Validation croisée (5 plis, modèle hybride) | **${cv} %** |`);
  // Orthographes
  let same = 0; const diff = [];
  for (const [a, b] of ORTHO_PAIRS) {
    const ia = M.understand(a).intent, ib = M.understand(b).intent;
    const sa = JSON.stringify(M.extractSlots(a, products)), sb = JSON.stringify(M.extractSlots(b, products));
    if (ia === ib && sa === sb) same++; else diff.push(`« ${b} » (${ib} ${sb}) ≠ « ${a} » (${ia} ${sa})`);
  }
  ok(`orthographes wolof : ${same}/${ORTHO_PAIRS.length} paires comprises pareil`, same === ORTHO_PAIRS.length, diff.join(' ; '));
  // Langue
  const langOk = LANG_EXAM.filter(([t, l]) => M.detectLang(t) === l).length;
  ok(`détection de la langue : ${langOk}/${LANG_EXAM.length}`, langOk >= LANG_EXAM.length - 1, LANG_EXAM.filter(([t, l]) => M.detectLang(t) !== l).map(([t]) => t).join(' ; '));
  // Argent en wolof
  const amtOk = AMOUNTS.filter(([t, v]) => M.wolofAmount(M.normalize(t)) === v).length;
  ok(`argent en wolof : ${amtOk}/${AMOUNTS.length}`, amtOk === AMOUNTS.length, AMOUNTS.filter(([t, v]) => M.wolofAmount(M.normalize(t)) !== v).map(([t, v]) => `${t} → ${M.wolofAmount(M.normalize(t))} au lieu de ${v}`).join(' ; '));
  // Vitesse
  const t0 = performance.now();
  let st = M.newBrainState('fr');
  const texts = [...INTENT_EXAM.map(x => x[0]), ...LANG_EXAM.map(x => x[0])];
  for (let k = 0; k < 400; k++) st = M.reply(texts[k % texts.length], k % 20 ? st : M.newBrainState('fr'), { products, orders: [] }).state;
  const ms = (performance.now() - t0) / 400;
  ok(`vitesse : ${ms.toFixed(2)} ms par réponse`, ms < 30);
  sheet.push(`| Examen (phrases jamais apprises) | voir ci-dessous |\n| Orthographes wolof (paires) | ${same}/${ORTHO_PAIRS.length} |\n| Détection de la langue | ${langOk}/${LANG_EXAM.length} |\n| Argent en wolof | ${amtOk}/${AMOUNTS.length} |\n| Temps de réponse moyen | ${ms.toFixed(2)} ms (dans le téléphone, sans internet) |`);
  sheet.push(`\n**Intentions les moins sûres (validation croisée)** : ${weakest.slice(0, 6).map(([k, v]) => `${k} ${v} %`).join(' · ')}\n`);
  report.splice(1, 0, sheet.join('\n'));
}

/* ================================================================== */
/*  2. Conversations avec l'IA                                         */
/* ================================================================== */
const offline = process.argv.includes('--offline');
const hasKey = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

if (!offline && hasKey) {
  const { streamAssistant } = await import('../../server/assistant.js');
  const shop = {
    phone: M.SITE_CONFIG.phone, whatsapp: M.SITE_CONFIG.whatsappRaw, address: M.SITE_CONFIG.address, hours: M.SITE_CONFIG.hours,
    giftWrapFee: M.SITE_CONFIG.giftWrapFee,
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
