// Kit d'impression Maefa : génère les pages HTML de chaque support, puis les PDF (texte vectoriel, polices intégrées)
// et des aperçus PNG. Coordonnées dans config.json.
const fs = require('fs'), path = require('path');
const QR = require('qrcode');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const D = __dirname, OUT = path.join(D, 'out'), HTML = path.join(D, 'html');
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(HTML, { recursive: true });
const cfg = JSON.parse(fs.readFileSync(path.join(D, 'config.json'), 'utf8'));

// ───────── marque ─────────
const PLUM = '#3a1f2d', IVORY = '#fdf7f5', GOLD = '#c48a82', GOLDD = '#8f544e', WINE = '#b03a64', BLUSH = '#f5dcd8';
const mono = fs.readFileSync(path.join(D, 'brand/maefa-monogramme.svg'), 'utf8');
const MP = [...mono.matchAll(/<path d="([^"]+)"/g)].map(m => m[1]); // arche, filet, losange, M, paraphe
const nom = fs.readFileSync(path.join(D, 'brand/maefa-nom.svg'), 'utf8').replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
let uid = 0;
/** Monogramme : 'full' (arche prune + or), 'line' (une couleur, pour tampon / dorure) */
function monoSvg(style = 'full', color = PLUM, w = '100%') {
  const id = 'm' + (++uid);
  if (style === 'line') return `<svg viewBox="15 3 70 94" style="width:${w};display:block"><path d="${MP[0]}" fill="none" stroke="${color}" stroke-width="1.6"/><path d="${MP[1]}" fill="none" stroke="${color}" stroke-width=".9"/><path d="${MP[2]}" fill="${color}"/><path d="${MP[3]}" fill="${color}"/><path d="${MP[4]}" fill="${color}"/></svg>`;
  return `<svg viewBox="17 5 66 90" style="width:${w};display:block"><defs><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9bcb1"/><stop offset=".48" stop-color="#f8e2da"/><stop offset="1" stop-color="#b77a6f"/></linearGradient><linearGradient id="${id}p" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#5e2d46"/><stop offset="1" stop-color="#2a1420"/></linearGradient></defs><path d="${MP[0]}" fill="url(#${id}p)"/><path d="${MP[1]}" fill="none" stroke="url(#${id}g)" stroke-width=".85"/><path d="${MP[2]}" fill="url(#${id}g)"/><path d="${MP[3]}" fill="url(#${id}g)"/><path d="${MP[4]}" fill="url(#${id}g)"/></svg>`;
}
/** Nom MAEFA + STORE ◆ DAKAR ; couleurs : nom, détails */
const nomSvg = (c1 = PLUM, c2 = GOLDD, w = '100%') => `<svg viewBox="-1 -1 271.2 60" style="width:${w};display:block">${nom.replace(/#3a1f2d/g, c1).replace(/#8f544e/g, c2)}</svg>`;
const qr = async (text, dark = PLUM) => (await QR.toString(text, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark, light: '#0000' } })).replace('<svg', '<svg style="width:100%;display:block"');
const waLink = `https://wa.me/${cfg.whatsapp}`;
const site = cfg.site ? `https://${cfg.site}` : '';

const CSS = `
@font-face{font-family:Bodoni;src:url(../fonts/bodoni-moda-latin.woff2)}
@font-face{font-family:Bodoni;src:url(../fonts/bodoni-moda-latin-ext.woff2);unicode-range:U+0100-024F}
@font-face{font-family:Bodoni;font-style:italic;src:url(../fonts/bodoni-moda-italic-latin.woff2)}
@font-face{font-family:Bodoni;font-style:italic;src:url(../fonts/bodoni-moda-italic-latin-ext.woff2);unicode-range:U+0100-024F}
@font-face{font-family:Jost;src:url(../fonts/jost-latin.woff2)}
@font-face{font-family:Jost;src:url(../fonts/jost-latin-ext.woff2);unicode-range:U+0100-024F}
*{margin:0;padding:0;box-sizing:border-box}
html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:Jost;color:${PLUM}}
.pg{position:relative;overflow:hidden;page-break-after:always;break-after:page}
.pg:last-child{page-break-after:auto;break-after:auto}
.abs{position:absolute}
.plum{background:radial-gradient(120% 90% at 50% 30%,#56283f 0,${PLUM} 55%,#24121c 100%);color:${IVORY}}
.ivory{background:${IVORY}}
.blush{background:linear-gradient(160deg,#fbeeea,#f3d6d2)}
.disp{font-family:Bodoni;font-weight:400}
.it{font-family:Bodoni;font-style:italic}
.kick{font-family:Jost;font-weight:500;text-transform:uppercase;letter-spacing:.32em}
.gold{color:${GOLD}}.goldd{color:${GOLDD}}.wine{color:${WINE}}
.rule{height:.25mm;background:linear-gradient(90deg,transparent,${GOLD},transparent)}
.center{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
table{border-collapse:collapse;width:100%}
.line{border-bottom:.25mm solid rgba(58,31,45,.35);height:7mm}
.box{border:.3mm solid rgba(58,31,45,.4);border-radius:1.5mm}
.check{display:inline-block;width:3.2mm;height:3.2mm;border:.3mm solid ${PLUM};border-radius:.6mm;vertical-align:-.5mm;margin-right:1.2mm}
.dia{display:inline-block;width:1.6mm;height:1.6mm;background:${GOLD};transform:rotate(45deg);margin:0 2.2mm;vertical-align:.4mm}
.pattern{background-repeat:repeat}
`;
const DOCS = [];
/** doc(fichier, titre, largeur, hauteur (mm, format fini), fonds perdus (mm), pages[]) */
let CUR = '';
function doc(file, title, w, h, bleed, pages, note) { DOCS.push({ file, title, w, h, bleed, pages, note, group: CUR }); }
const P = (bleed, cls, inner, style = '', deco) => ({ bleed, cls, inner, style, deco });
// ───────── finitions luxe ─────────
const ICON = {
  phone: '<path d="M5 4h3l1.5 4-2 1.2a11 11 0 0 0 5.3 5.3l1.2-2 4 1.5v3a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  wa: '<path d="M4 20l1.2-3.6A8 8 0 1 1 8 19.1z"/><path d="M9 8.5c0 3 2.5 5.5 5.5 5.5l1-1.4-1.6-.9-.8.8a4 4 0 0 1-2.3-2.3l.8-.8-.9-1.6z"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>',
  ig: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".9"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.4"/>',
  web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/>',
};
const ico = (k, c = GOLDD, w = '3mm') => `<svg viewBox="0 0 24 24" style="width:${w};height:${w};flex:none" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;
const monoLineURI = c => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g transform="translate(35 30) scale(.43)">${monoSvg('line', c).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g></svg>`);
/** motif de monogrammes ton sur ton, en quinconce */
const pattern = (c, op, tile) => `<div class="abs" style="inset:0;opacity:${op};background-image:url(&quot;${monoLineURI(c)}&quot;),url(&quot;${monoLineURI(c)}&quot;);background-size:${tile}mm ${tile}mm;background-position:0 0,${tile / 2}mm ${tile / 2}mm"></div>`;
/** double filet or, inset en mm depuis le bord fini */
const frame = (inset, c = GOLD, gap = .9) => `<div class="abs" style="inset:${inset}mm;border:.22mm solid ${c};pointer-events:none"></div><div class="abs" style="inset:${inset + gap}mm;border:.12mm solid ${c};opacity:.7;pointer-events:none"></div>`;
const contactRows = (c = PLUM, ic = GOLDD, size = 2.45, gap = 1.6) => [['phone', cfg.phone], ['wa', cfg.whatsappAffiche], ['mail', cfg.email], ['ig', cfg.instagram], ['web', cfg.site], ['pin', cfg.adresse]].filter(r => r[1]).map(([k, v]) => `<div style="display:flex;align-items:center;gap:2mm;margin:${gap}mm 0;font-size:${size}mm;color:${c}">${ico(k, ic, (size * 1.2) + 'mm')}<span>${v}</span></div>`).join('');
const contact = (sep = '<span class="dia"></span>') => [cfg.phone, cfg.email, cfg.instagram].filter(Boolean).join(sep);

(async () => {
  const qWa = await qr(waLink), qWaI = await qr(waLink, IVORY), qAuth = await qr(site ? `${site}/authentique` : waLink), qSite = await qr(site || waLink);

  const ctx = { cfg, fs, path, D, PLUM, IVORY, GOLD, GOLDD, WINE, BLUSH, MP, nom, monoSvg, nomSvg, qr, waLink, site, doc, P, contact, ICON, ico, pattern, frame, contactRows, monoLineURI, qWa, qWaI, qAuth, qSite };
  for (const g of ['A', 'B', 'C', 'D']) { CUR = g; await require('./docs/' + g + '.cjs')(ctx); }
  // finitions par défaut : motif + filet sur les fonds prune, filet sur les cartes claires
  const DEF = { '09-etiquette-volante-50x90': [3.5, 9], '12-autocollant-merci-70x30': [2.5, 0], '14-sac-shopping-face-26x33': [12, 34], '15-sac-shopping-soufflet-10x33': [7, 22], '16-sachet-bijou-pochette-15x20': [8, 0], '17-boite-chaussures-couvercle-33x20': [10, 30], '18-boite-chaussures-cote-33x12': [6, 26], '19-boite-sac-couvercle-35x28': [12, 34], '21-carte-cadeau': [2.4, 11], '22-carte-fidelite': [2.4, 11] };
  for (const d of DOCS) { const k = DEF[d.file]; if (!k) continue; d.pages.forEach(p => { if (p.deco) return; const dark = /plum/.test(p.cls); p.deco = { frame: k[0], pattern: dark && k[1] ? [GOLD, .07, k[1]] : null }; }); }
  function deco(d, p) { if (!p.deco) return ''; const b = d.bleed; let h = ''; if (p.deco.pattern) h += pattern(...p.deco.pattern); if (p.deco.frame) h += frame(p.deco.frame + b, /plum/.test(p.cls) ? GOLD : GOLD); return h; }
  // ───────── rendu
  const b = await chromium.launch(); const pg = await b.newPage();
  const previews = [];
  const ONLY = process.env.ONLY;
  for (const d of DOCS) {
    if (ONLY && d.group !== ONLY) continue;
    const W = d.w + 2 * d.bleed, H = d.h + 2 * d.bleed;
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${d.title}</title><style>${CSS}@page{size:${W}mm ${H}mm;margin:0}.pg{width:${W}mm;height:${H}mm}</style></head><body>${d.pages.map(p => `<section class="pg ${p.cls}" style="${p.style}">${deco(d, p)}<div class="abs ${/center/.test(p.cls) ? 'center' : ''}" style="inset:0">${p.inner}</div></section>`).join('')}</body></html>`;
    const hf = path.join(HTML, d.file + '.html'); fs.writeFileSync(hf, html);
    await pg.goto('file://' + hf); await pg.evaluate(() => document.fonts.ready);
    await pg.pdf({ path: path.join(OUT, d.file + '.pdf'), width: W + 'mm', height: H + 'mm', printBackground: true, preferCSSPageSize: true });
    console.log('OK', d.file);
  }
  await b.close();
  fs.writeFileSync(path.join(OUT, ONLY ? `liste-${ONLY}.json` : 'liste.json'), JSON.stringify(DOCS.filter(d => !ONLY || d.group === ONLY).map(d => ({ file: d.file + '.pdf', title: d.title, format: `${d.w} × ${d.h} mm`, fondsPerdus: d.bleed ? d.bleed + ' mm' : 'aucun', pages: d.pages.length, note: d.note || '' })), null, 1));
})().catch(e => { console.error(e); process.exit(1); });
