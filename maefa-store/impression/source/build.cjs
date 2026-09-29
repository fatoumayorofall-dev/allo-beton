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
function doc(file, title, w, h, bleed, pages, note) { DOCS.push({ file, title, w, h, bleed, pages, note }); }
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

  // 1. CARTE DE VISITE 85 × 55
  doc('01-carte-de-visite', 'Carte de visite', 85, 55, 3, [
    P(3, 'plum center', `<div style="width:14mm">${monoSvg()}</div><div style="width:44mm;margin-top:4mm">${nomSvg(IVORY, '#e9bcb1')}</div><div class="it gold" style="font-size:3.3mm;margin-top:2.6mm">Belle à chaque pas</div>`, '', { pattern: [GOLD, .07, 11], frame: 4.2 }),
    P(3, 'ivory', `<div class="abs" style="left:10.5mm;top:9.5mm;right:10.5mm;bottom:9.5mm;display:grid;grid-template-columns:1fr 17mm;gap:4mm">
        <div><div class="disp" style="font-size:4.6mm;line-height:1">${cfg.personne || cfg.nom}</div><div class="kick goldd" style="font-size:1.75mm;margin-top:1.4mm">${cfg.fonction}</div>
          <div style="height:.25mm;width:12mm;background:${GOLD};margin:2.6mm 0 1.6mm"></div>${contactRows(PLUM, GOLDD, 2.3, 1.15)}</div>
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:space-between"><div style="width:7.5mm">${monoSvg()}</div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:1.2mm"><div style="width:17mm;padding:1.4mm;background:#fff;border-radius:1.4mm;box-shadow:0 0 0 .2mm ${GOLD}">${qWa}</div><div class="kick" style="font-size:1.25mm;letter-spacing:.14em;color:${GOLDD};text-align:center;line-height:1.3">Commander<br>sur WhatsApp</div></div></div></div>`, '', { frame: 4.2 }),
  ], 'Papier couché mat 350 g, pelliculage soft-touch. Idéal : dorure à chaud or rose sur le monogramme, le nom et le filet du recto.');

  // 2. FACTURE A4 (bureau) et carnet A5 (à la main) ; 3. BON DE LIVRAISON A5
  const header = (s, title, fields) => `<div style="background:radial-gradient(120% 140% at 20% 0,#56283f,${PLUM} 70%);color:${IVORY};padding:${7 * s}mm ${14 * s}mm;display:flex;justify-content:space-between;align-items:center;position:relative;overflow:hidden">
      ${pattern(GOLD, .06, 16 * s)}
      <div style="display:flex;gap:${4 * s}mm;align-items:center;position:relative"><div style="width:${12 * s}mm">${monoSvg()}</div><div><div style="width:${46 * s}mm">${nomSvg(IVORY, '#e9bcb1')}</div><div class="it gold" style="font-size:${3 * s}mm;margin-top:${1.6 * s}mm">Belle à chaque pas</div></div></div>
      <div style="text-align:right;position:relative"><div class="disp" style="font-size:${9 * s}mm;line-height:1">${title}</div>
        <div style="display:flex;gap:${2 * s}mm;justify-content:flex-end;margin-top:${3 * s}mm">${fields.map(([l, w]) => `<div style="background:rgba(253,247,245,.1);border:.2mm solid rgba(240,201,193,.5);border-radius:${1.2 * s}mm;padding:${1.4 * s}mm ${2.2 * s}mm;text-align:left;min-width:${w * s}mm"><div class="kick" style="font-size:${1.5 * s}mm;color:#f0c9c1">${l}</div><div style="height:${4 * s}mm"></div></div>`).join('')}</div></div></div>`;
  const footer = (s) => `<div style="border-top:.25mm solid ${GOLD};padding-top:${2.5 * s}mm;display:flex;justify-content:space-between;align-items:center;font-size:${2.2 * s}mm;color:#6b4a58"><div style="display:flex;gap:${4 * s}mm;flex-wrap:wrap">${[['pin', cfg.adresse], ['phone', cfg.phone], ['mail', cfg.email], ['ig', cfg.instagram]].filter(r => r[1]).map(([k, v]) => `<span style="display:inline-flex;align-items:center;gap:${1.2 * s}mm">${ico(k, GOLDD, (2.6 * s) + 'mm')}${v}</span>`).join('')}</div><div>${[cfg.ninea && 'NINEA ' + cfg.ninea, cfg.rc && 'RC ' + cfg.rc].filter(Boolean).join(' · ') || 'NINEA ……………… · RC ………………'}</div></div>`;
  const water = (s) => `<div class="abs" style="left:50%;top:55%;width:${80 * s}mm;transform:translate(-50%,-50%);opacity:.045">${monoSvg('line', PLUM)}</div>`;
  const factureBody = (a5) => {
    const s = a5 ? .705 : 1, rows = a5 ? 10 : 14;
    return `${water(s)}<div class="abs" style="inset:0;display:flex;flex-direction:column;font-size:${3 * s}mm">${header(s, 'Facture', [['N°', 30], ['Date', 26]])}
      <div style="flex:1;display:flex;flex-direction:column;padding:${7 * s}mm ${14 * s}mm ${8 * s}mm">
      <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:${5 * s}mm">
        ${[['Facturé à', ['Nom de la cliente', 'Adresse / quartier']], ['Contact', ['Téléphone', 'Mode de livraison']]].map(([t, ls]) => `<div style="background:#fbf1ee;border-radius:${2 * s}mm;padding:${3 * s}mm ${4 * s}mm"><div class="kick goldd" style="font-size:${1.9 * s}mm">${t}</div>${ls.map(l => `<div style="display:flex;align-items:flex-end;gap:${2 * s}mm;margin-top:${2.6 * s}mm"><span style="font-size:${2.2 * s}mm;color:#8b6f7b;white-space:nowrap">${l}</span><span style="flex:1;border-bottom:.2mm solid rgba(58,31,45,.35);height:${4 * s}mm"></span></div>`).join('')}</div>`).join('')}</div>
      <table style="margin-top:${6 * s}mm"><thead><tr>${['Article', 'Réf.', 'Taille / couleur', 'Qté', 'Prix unitaire', 'Montant'].map((h, i) => `<th class="kick" style="font-size:${1.8 * s}mm;font-weight:500;color:${GOLDD};padding:${2 * s}mm ${1.5 * s}mm;border-bottom:.35mm solid ${PLUM};text-align:${i > 2 ? 'right' : 'left'}">${h}</th>`).join('')}</tr></thead>
        <tbody>${Array.from({ length: rows }, () => `<tr>${[38, 12, 20, 8, 11, 11].map(w => `<td style="width:${w}%;height:${7.2 * s}mm;border-bottom:.15mm solid rgba(58,31,45,.18)"></td>`).join('')}</tr>`).join('')}</tbody></table>
      <div style="display:grid;grid-template-columns:1fr ${70 * s}mm;gap:${8 * s}mm;margin-top:${5 * s}mm">
        <div><div class="kick goldd" style="font-size:${1.9 * s}mm;margin-bottom:${2 * s}mm">Mode de paiement</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;row-gap:${1.8 * s}mm">${['Wave', 'Orange Money', 'Espèces', 'Carte bancaire'].map(m => `<span><span class="check" style="width:${3.2 * s}mm;height:${3.2 * s}mm"></span>${m}</span>`).join('')}</div>
          <div style="margin-top:${4 * s}mm;font-size:${2.3 * s}mm;line-height:1.5;color:#6b4a58">Arrêtée la présente facture à la somme de :</div><div style="border-bottom:.2mm solid rgba(58,31,45,.35);height:${6 * s}mm"></div><div style="border-bottom:.2mm solid rgba(58,31,45,.35);height:${6 * s}mm"></div></div>
        <div>${['Sous-total', 'Livraison', 'Remise'].map(l => `<div style="display:flex;justify-content:space-between;padding:${1.7 * s}mm 0;border-bottom:.15mm solid rgba(58,31,45,.2)"><span>${l}</span><span style="color:#8b6f7b">FCFA</span></div>`).join('')}
          <div style="display:flex;justify-content:space-between;align-items:baseline;padding:${3 * s}mm ${3.5 * s}mm;margin-top:${2.5 * s}mm;background:${PLUM};color:${IVORY};border-radius:${1.6 * s}mm"><span class="kick" style="font-size:${2.1 * s}mm;color:#f0c9c1">Total à payer</span><span class="disp" style="font-size:${5 * s}mm">FCFA</span></div></div></div>
      <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;gap:${6 * s}mm;padding-top:${6 * s}mm">
        <div><div class="it goldd" style="font-size:${5 * s}mm">Jërëjëf !</div><div style="font-size:${2.2 * s}mm;color:#6b4a58;margin-top:${1 * s}mm;max-width:${95 * s}mm;line-height:1.5">Échange sous 7 jours : pièce non portée, dans son emballage d'origine, avec cette facture.</div></div>
        <div style="width:${52 * s}mm;height:${26 * s}mm;border:.25mm dashed ${GOLD};border-radius:${2 * s}mm;display:flex;align-items:flex-end;justify-content:center;padding-bottom:${2 * s}mm"><span class="kick" style="font-size:${1.7 * s}mm;color:${GOLDD}">Cachet &amp; signature</span></div></div>
      <div style="margin-top:${5 * s}mm">${footer(s)}</div></div></div>`;
  };
  doc('02-facture-A4', 'Facture A4', 210, 297, 0, [P(0, '', factureBody(false), 'background:#fff')], 'À remplir à l’ordinateur ou à la main. Papier 90 g.');
  doc('03-carnet-factures-A5', 'Carnet de factures A5', 148, 210, 0, [P(0, '', factureBody(true), 'background:#fff')], 'Carnet autocopiant (original + duplicata), 50 liasses numérotées, reliure en tête.');
  { const s = .705;
  doc('04-bon-de-livraison-A5', 'Bon de livraison A5', 148, 210, 0, [P(0, '', `${water(s)}<div class="abs" style="inset:0;display:flex;flex-direction:column;font-size:${3 * s}mm">${header(s, 'Bon de livraison', [['Commande MAE-', 30], ['Date', 22]])}
    <div style="flex:1;display:flex;flex-direction:column;padding:${7 * s}mm ${14 * s}mm ${8 * s}mm">
    <div style="background:#fbf1ee;border-radius:${2 * s}mm;padding:${3 * s}mm ${4 * s}mm;display:grid;grid-template-columns:1fr 1fr;column-gap:${6 * s}mm">${['Cliente', 'Téléphone', 'Quartier / zone', 'Point de repère'].map(l => `<div style="display:flex;align-items:flex-end;gap:${2 * s}mm;margin:${1.6 * s}mm 0"><span style="font-size:${2.2 * s}mm;color:#8b6f7b;white-space:nowrap">${l}</span><span style="flex:1;border-bottom:.2mm solid rgba(58,31,45,.35);height:${4.5 * s}mm"></span></div>`).join('')}</div>
    <table style="margin-top:${6 * s}mm"><thead><tr>${['Article', 'Taille / couleur', 'Qté'].map((h, i) => `<th class="kick" style="font-size:${1.8 * s}mm;font-weight:500;color:${GOLDD};padding:${2 * s}mm;border-bottom:.35mm solid ${PLUM};text-align:${i === 2 ? 'right' : 'left'}">${h}</th>`).join('')}</tr></thead>${Array.from({ length: 8 }, () => `<tr><td style="height:${7.2 * s}mm;width:58%;border-bottom:.15mm solid rgba(58,31,45,.18)"></td><td style="border-bottom:.15mm solid rgba(58,31,45,.18)"></td><td style="border-bottom:.15mm solid rgba(58,31,45,.18)"></td></tr>`).join('')}</table>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:${5 * s}mm;margin-top:${6 * s}mm">
      <div style="background:${PLUM};color:${IVORY};border-radius:${2 * s}mm;padding:${3.5 * s}mm ${4 * s}mm"><div class="kick" style="font-size:${1.8 * s}mm;color:#f0c9c1">À encaisser</div><div class="disp" style="font-size:${6 * s}mm;margin-top:${1.5 * s}mm">…………… FCFA</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;row-gap:${1.4 * s}mm;margin-top:${2.5 * s}mm;font-size:${2.4 * s}mm">${['Déjà payé', 'Wave', 'Orange Money', 'Espèces'].map(m => `<span><span class="check" style="border-color:#f0c9c1;width:${3 * s}mm;height:${3 * s}mm"></span>${m}</span>`).join('')}</div></div>
      <div style="border:.25mm dashed ${GOLD};border-radius:${2 * s}mm;padding:${3.5 * s}mm ${4 * s}mm"><div class="kick goldd" style="font-size:${1.8 * s}mm">Reçu en bon état</div><div style="font-size:${2.3 * s}mm;color:#8b6f7b;margin-top:${1.5 * s}mm">Nom &amp; signature de la cliente</div></div></div>
    <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:center;padding-top:${5 * s}mm"><div class="it goldd" style="font-size:${4.6 * s}mm">Jërëjëf, à très vite !</div><div style="width:${15 * s}mm;padding:${1 * s}mm;background:#fff;box-shadow:0 0 0 .2mm ${GOLD};border-radius:${1 * s}mm">${qWa}</div></div>
    <div style="margin-top:${4 * s}mm">${footer(s)}</div></div></div>`, 'background:#fff')], 'Carnet autocopiant (un exemplaire pour la cliente, un pour la boutique).'); }

  // 4. TAMPONS (une couleur, taille réelle)
  const stampRound = (c = PLUM) => `<svg viewBox="0 0 100 100" style="width:100%;display:block"><defs><path id="st" d="M50 50 m-35 0 a35 35 0 1 1 70 0"/><path id="sb" d="M50 50 m-39.5 0 a39.5 39.5 0 1 0 79 0"/></defs>
    <circle cx="50" cy="50" r="48" fill="none" stroke="${c}" stroke-width="1.8"/><circle cx="50" cy="50" r="44.5" fill="none" stroke="${c}" stroke-width=".6"/><circle cx="50" cy="50" r="27" fill="none" stroke="${c}" stroke-width=".6"/>
    <text font-family="Jost" font-weight="500" font-size="7.6" letter-spacing="2.4" fill="${c}"><textPath href="#st" startOffset="50%" text-anchor="middle">${cfg.tamponHaut}</textPath></text>
    <text font-family="Jost" font-weight="500" font-size="6.2" letter-spacing="2.4" fill="${c}"><textPath href="#sb" startOffset="50%" text-anchor="middle">${cfg.tamponBas}</textPath></text>
    <path d="M9 50l2.2-2.2 2.2 2.2-2.2 2.2z M86.6 50l2.2-2.2 2.2 2.2-2.2 2.2z" fill="${c}"/>
    <svg x="36" y="30.5" width="28" height="38" viewBox="15 3 70 94">${monoSvg('line', c).replace(/^<svg[^>]*>|<\/svg>$/g, '').replace(/stroke-width="1.6"/, 'stroke-width="2.2"').replace(/stroke-width=".9"/, 'stroke-width="1.4"')}</svg></svg>`;
  const stampRectSvg = (c = PLUM) => `<svg viewBox="0 0 120 50" style="width:100%;display:block"><rect x="1" y="1" width="118" height="48" rx="3" fill="none" stroke="${c}" stroke-width="1.4"/><rect x="3.2" y="3.2" width="113.6" height="43.6" rx="2" fill="none" stroke="${c}" stroke-width=".5"/>
    <svg x="6" y="7" width="25" height="36" viewBox="15 3 70 94">${monoSvg('line', c).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>
    <g transform="translate(34 9) scale(.27)">${nom.replace(/#3a1f2d|#8f544e/g, c)}</g>
    <text x="34" y="33" font-family="Jost" font-size="4.4" fill="${c}">${cfg.adresse}</text>
    <text x="34" y="39.5" font-family="Jost" font-size="4.4" fill="${c}">${cfg.phone}${cfg.email ? ' · ' + cfg.email : ''}</text>
    <text x="34" y="45" font-family="Jost" font-size="3.8" fill="${c}">${[cfg.ninea && 'NINEA ' + cfg.ninea, cfg.rc && 'RC ' + cfg.rc].filter(Boolean).join(' · ') || 'NINEA ………………  RC ………………'}</text></svg>`;
  const stampPaye = (c = WINE, word = 'PAYÉ') => `<svg viewBox="0 0 100 40" style="width:100%;display:block"><rect x="1.5" y="1.5" width="97" height="37" rx="4" fill="none" stroke="${c}" stroke-width="2.4"/><text x="50" y="21" text-anchor="middle" font-family="Bodoni" font-size="15" letter-spacing="3" fill="${c}">${word}</text><text x="50" y="33" text-anchor="middle" font-family="Jost" font-size="3.7" letter-spacing=".3" fill="${c}">MAEFA · LE ___ / ___ / 20___</text></svg>`;
  doc('05-tampon-rond-40mm', 'Tampon rond Ø 40 mm', 40, 40, 0, [P(0, '', stampRound(), 'background:#fff')], 'Tampon encreur Ø 40 mm (type Trodat 46040). Fichier en une couleur, taille réelle.');
  doc('06-tampon-societe-60x25', 'Tampon société 60 × 25 mm', 60, 25, 0, [P(0, '', stampRectSvg(), 'background:#fff')], 'Tampon rectangulaire 60 × 25 mm (type Trodat 4915). Pour factures et bons.');
  doc('07-tampons-paye-livre', 'Tampons PAYÉ / LIVRÉ 50 × 20 mm', 50, 20, 0, [P(0, '', stampPaye(WINE, 'PAYÉ'), 'background:#fff'), P(0, '', stampPaye(PLUM, 'LIVRÉ'), 'background:#fff')], 'Deux petits tampons dateurs 50 × 20 mm.');

  // 5. CARTE DE REMERCIEMENT 10 × 15 (glissée dans chaque colis)
  doc('08-carte-remerciement-10x15', 'Carte de remerciement 10 × 15 cm', 100, 150, 3, [
    P(3, 'plum center', `<div style="width:24mm">${monoSvg()}</div><div class="it" style="font-size:14mm;margin-top:9mm;color:${IVORY};line-height:1">Jërëjëf</div><div class="kick gold" style="font-size:2.2mm;margin-top:4mm">Merci d'avoir choisi Maefa</div><div style="width:12mm;height:.25mm;background:${GOLD};margin:9mm 0"></div><div style="width:38mm">${nomSvg(IVORY, '#e9bcb1')}</div>`, '', { pattern: [GOLD, .07, 18], frame: 6 }),
    P(3, 'ivory', `<div class="abs" style="left:13mm;right:13mm;top:14mm;bottom:13mm;display:flex;flex-direction:column">
      <div class="kick goldd" style="font-size:2.1mm">Un mot pour vous</div>
      <div class="it" style="font-size:5.6mm;line-height:1.3;margin-top:3mm;text-wrap:balance">Votre pièce a été choisie, vérifiée et emballée avec soin, à&nbsp;Dakar.</div>
      <div style="margin-top:5mm">${Array.from({ length: 4 }, () => '<div style="height:7.5mm;border-bottom:.2mm solid rgba(58,31,45,.3)"></div>').join('')}</div>
      <div style="margin-top:7mm;background:#fbf1ee;border-radius:2mm;padding:4mm 4.5mm">
        <div class="kick goldd" style="font-size:1.9mm">Prendre soin de vos pièces</div>
        <div style="font-size:2.5mm;line-height:1.6;margin-top:1.8mm;text-wrap:pretty">Rangez-les dans leur pochon, à l'abri du soleil. Essuyez le cuir avec un chiffon doux et sec. Évitez l'eau et le parfum sur les sacs.</div></div>
      <div style="margin-top:auto;display:flex;gap:5mm;align-items:center">
        <div style="width:19mm;flex:none;padding:1.3mm;background:#fff;border-radius:1.4mm;box-shadow:0 0 0 .2mm ${GOLD}">${qAuth}</div>
        <div><div style="font-size:2.6mm;font-weight:500">Vérifiez l'authenticité</div><div style="font-size:2.3mm;color:#6b4a58;margin-bottom:.8mm">de votre pièce en scannant ce code</div>${contactRows(PLUM, GOLDD, 2.25, .7).split('<div').slice(0, 4).join('<div')}</div></div></div>`, '', { frame: 6 }),
  ], 'Carte 350 g mat. Écrivez le prénom de la cliente sur les lignes : l’effet est garanti.');

  // 6. ÉTIQUETTE VOLANTE 50 × 90
  doc('09-etiquette-volante-50x90', 'Étiquette volante 50 × 90 mm', 50, 90, 3, [
    P(3, 'plum center', `<div class="abs" style="left:50%;top:9mm;width:5mm;height:5mm;margin-left:-2.5mm;border-radius:50%;background:${IVORY};box-shadow:0 0 0 .6mm ${GOLD}"></div><div style="width:18mm;margin-top:6mm">${monoSvg()}</div><div style="width:32mm;margin-top:6mm">${nomSvg(IVORY, '#e9bcb1')}</div>`),
    P(3, 'ivory', `<div class="abs" style="left:50%;top:9mm;width:5mm;height:5mm;margin-left:-2.5mm;border-radius:50%;background:#fff;box-shadow:0 0 0 .4mm ${GOLD}"></div>
      <div class="abs" style="left:8mm;right:8mm;top:20mm;font-size:2.5mm">${['Article', 'Réf.', 'Taille', 'Couleur'].map(l => `<div class="kick goldd" style="font-size:1.5mm;margin-top:2.8mm">${l}</div><div class="line" style="height:5mm"></div>`).join('')}
      <div class="kick goldd" style="font-size:1.5mm;margin-top:5mm">Prix</div><div class="disp" style="font-size:5.5mm;border-bottom:.25mm solid ${PLUM};padding:1mm 0;text-align:right">FCFA</div></div>
      <div class="abs it goldd" style="left:0;right:0;bottom:6mm;text-align:center;font-size:3mm">Belle à chaque pas</div>`),
  ], 'Carton 400 g, trou Ø 5 mm, attache en cordon or rose ou ruban prune.');

  // 7. AUTOCOLLANTS : sceau Ø 50 (planche A4) + « Merci » 70 × 30
  const seal = `<div style="width:50mm;height:50mm">${fs.readFileSync(path.join(D, 'brand/maefa-cachet-prune.svg'), 'utf8').replace('<svg ', '<svg style="width:100%;height:100%;display:block" ')}</div>`;
  doc('10-autocollant-sceau-50mm', 'Autocollant sceau Ø 50 mm', 50, 50, 2, [P(2, 'center', seal, 'background:#fff')], 'Autocollant rond Ø 50 mm, papier ou vinyle, découpe à la forme. Pour fermer le papier de soie et les pochettes.');
  doc('11-planche-sceaux-A4', 'Planche de 15 sceaux (A4)', 210, 297, 0, [P(0, '', `<div class="abs" style="left:17.5mm;top:16mm;display:grid;grid-template-columns:repeat(3,50mm);grid-auto-rows:50mm;gap:12.5mm 12.5mm">${Array(15).fill(seal).join('')}</div>`, 'background:#fff')], 'Pour imprimer vous-même sur feuilles autocollantes A4, puis découper.');
  doc('12-autocollant-merci-70x30', 'Autocollant « Jërëjëf » 70 × 30 mm', 70, 30, 2, [P(2, 'plum center', `<div style="display:flex;align-items:center;gap:4mm"><div style="width:9mm">${monoSvg()}</div><div style="text-align:left"><div class="it" style="font-size:7mm;line-height:1">Jërëjëf</div><div class="kick gold" style="font-size:1.8mm;margin-top:1.4mm">Emballé avec amour à Dakar</div></div></div>`)], 'Pour fermer les colis et les sachets.');

  // 8. ÉTIQUETTE COLIS 100 × 150 (format imprimante thermique)
  doc('13-etiquette-colis-100x150', 'Étiquette colis 100 × 150 mm', 100, 150, 0, [P(0, '', `<div class="abs" style="inset:6mm;border:.5mm solid ${PLUM};border-radius:2mm;padding:5mm;display:flex;flex-direction:column;font-size:3mm">
    <div style="display:flex;justify-content:space-between;align-items:center"><div style="width:38mm">${nomSvg()}</div><div style="width:10mm">${monoSvg('line')}</div></div>
    <div class="rule" style="margin:4mm 0;background:${PLUM}"></div>
    ${['Destinataire', 'Téléphone', 'Quartier / ville', 'Point de repère', 'N° de commande'].map(l => `<div class="kick" style="font-size:1.8mm;margin-top:3mm;color:#6b4a58">${l}</div><div class="line" style="height:7mm"></div>`).join('')}
    <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:center;border-top:.3mm dashed ${PLUM};padding-top:3mm"><div style="font-size:2.4mm;line-height:1.5"><b style="font-weight:500">Expéditeur</b><br>${cfg.nom} · ${cfg.adresse}<br>${cfg.phone}</div><div style="width:16mm">${qWa}</div></div>
    <div class="kick" style="font-size:2mm;text-align:center;margin-top:3mm;letter-spacing:.2em">Fragile · Ne pas plier</div></div>`, 'background:#fff')], 'Format des imprimantes d’étiquettes thermiques 100 × 150 mm, ou papier autocollant.');

  // 9. SAC SHOPPING PAPIER (faces 26 × 33 cm + soufflet 10 cm)
  const bagFace = `<div class="center" style="position:absolute;inset:0"><div style="width:58mm">${monoSvg()}</div><div style="width:120mm;margin-top:16mm">${nomSvg(IVORY, '#e9bcb1')}</div><div class="it gold" style="font-size:9mm;margin-top:10mm">Belle à chaque pas</div></div>`;
  doc('14-sac-shopping-face-26x33', 'Sac shopping — face (×2) 26 × 33 cm', 260, 330, 3, [P(3, 'plum', bagFace)], 'Sac papier 170 g, poignées cordon or rose ou ruban satin prune. Dimensions à caler sur le gabarit de votre fournisseur.');
  doc('15-sac-shopping-soufflet-10x33', 'Sac shopping — soufflet (×2) 10 × 33 cm', 100, 330, 3, [P(3, 'plum center', `<div style="width:26mm">${monoSvg()}</div><div class="kick gold" style="font-size:3mm;margin-top:10mm;writing-mode:vertical-rl;letter-spacing:.5em">${cfg.instagram || ''}</div>`)]);
  doc('16-sachet-bijou-pochette-15x20', 'Petit sachet 15 × 20 cm', 150, 200, 3, [P(3, 'blush center', `<div style="width:30mm">${monoSvg()}</div><div style="width:70mm;margin-top:9mm">${nomSvg()}</div><div class="it goldd" style="font-size:5mm;margin-top:6mm">Belle à chaque pas</div>`)], 'Sachet papier ou kraft pour les petites commandes.');

  // 10. BOÎTES : couvercle boîte à chaussures 33 × 20 + bande de côté ; boîte sac 35 × 28
  doc('17-boite-chaussures-couvercle-33x20', 'Boîte à chaussures — dessus du couvercle 33 × 20 cm', 330, 200, 3, [P(3, 'plum center', `<div style="display:flex;align-items:center;gap:14mm"><div style="width:40mm">${monoSvg()}</div><div style="text-align:left"><div style="width:130mm">${nomSvg(IVORY, '#e9bcb1')}</div><div class="it gold" style="font-size:9mm;margin-top:6mm">Belle à chaque pas</div></div></div>`)], 'Carton rigide recouvert, ou boîte kraft + autocollant. Prévoir la dorure sur le monogramme.');
  doc('18-boite-chaussures-cote-33x12', 'Boîte à chaussures — côté 33 × 12 cm', 330, 120, 3, [P(3, 'plum', `<div class="abs" style="left:14mm;top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:8mm"><div style="width:16mm">${monoSvg()}</div><div style="width:70mm">${nomSvg(IVORY, '#e9bcb1')}</div></div>
    <div class="abs" style="right:14mm;top:50%;transform:translateY(-50%);width:100mm;font-size:3.2mm;color:${IVORY}">${['Modèle', 'Pointure', 'Couleur'].map(l => `<div style="display:flex;gap:3mm;align-items:flex-end;margin:1.4mm 0"><span class="kick gold" style="font-size:2.2mm;width:22mm">${l}</span><span style="flex:1;border-bottom:.3mm solid rgba(253,247,245,.6);height:5mm"></span></div>`).join('')}</div>`)]);
  doc('19-boite-sac-couvercle-35x28', 'Boîte à sac — dessus du couvercle 35 × 28 cm', 350, 280, 3, [P(3, 'plum center', bagFace.replace('width:58mm', 'width:62mm'))]);

  // 11. PAPIER DE SOIE (motif 50 × 70 cm, une couleur)
  const tile = `<div style="width:40mm;height:40mm;display:flex;align-items:center;justify-content:center"><div style="width:12mm;opacity:.9">${monoSvg('line', GOLD)}</div></div>`;
  doc('20-papier-de-soie-50x70', 'Papier de soie — motif 50 × 70 cm', 500, 700, 0, [P(0, '', `<div style="display:grid;grid-template-columns:repeat(13,40mm);transform:translate(-5mm,-5mm)">${Array.from({ length: 13 * 19 }, (_, i) => `<div style="${(Math.floor(i / 13) % 2) ? 'transform:translateX(20mm)' : ''}">${tile}</div>`).join('')}</div>`, `background:${BLUSH}`)], 'Papier de soie blush imprimé une couleur (or rose), ou blanc imprimé prune.');

  // 12. CARTE CADEAU 85 × 55
  doc('21-carte-cadeau', 'Carte cadeau 85 × 55 mm', 85, 55, 3, [
    P(3, 'plum', `<div class="abs" style="left:10.5mm;top:10mm;width:9mm">${monoSvg()}</div><div class="abs" style="left:10.5mm;bottom:10.5mm"><div class="kick gold" style="font-size:2mm">Carte cadeau</div><div class="it" style="font-size:7mm;margin-top:1mm">Offrez l'élégance</div></div><div class="abs" style="right:10.5mm;top:11mm;width:24mm">${nomSvg(IVORY, '#e9bcb1')}</div>`),
    P(3, 'ivory', `<div class="abs" style="left:10.5mm;right:10.5mm;top:9.5mm;font-size:2.6mm">${['Pour', 'De la part de', 'Montant'].map((l, i) => `<div style="display:flex;gap:3mm;align-items:flex-end;margin:2.2mm 0"><span class="kick goldd" style="font-size:1.7mm;width:20mm">${l}</span><span style="flex:1;border-bottom:.25mm solid ${PLUM};height:5mm;text-align:right;font-size:2.4mm">${i === 2 ? 'FCFA' : ''}</span></div>`).join('')}
      <div style="display:flex;justify-content:space-between;margin-top:3mm;font-size:2.2mm;color:#6b4a58"><span>N° ……………</span><span>Valable jusqu'au …… / …… / ……</span></div></div>
      <div class="abs" style="left:10.5mm;right:10.5mm;bottom:9mm;font-size:1.9mm;color:#8b6f7b;text-align:center">Utilisable en boutique, sur le site et sur WhatsApp · ${cfg.phone}</div>`),
  ], 'Carte 350 g, numérotée à la main. Idéale pour Korité, Tabaski, mariages et baptêmes.');

  // 13. CARTE DE FIDÉLITÉ 85 × 55
  doc('22-carte-fidelite', 'Carte de fidélité 85 × 55 mm', 85, 55, 3, [
    P(3, 'plum center', `<div style="width:12mm">${monoSvg()}</div><div class="kick gold" style="font-size:2mm;margin-top:3mm">Le cercle Maefa</div><div class="it" style="font-size:6mm;margin-top:1.4mm">Carte de fidélité</div>`),
    P(3, 'ivory', `<div class="abs" style="left:10.5mm;right:10.5mm;top:9.5mm"><div style="display:flex;justify-content:space-between;align-items:baseline"><span class="kick goldd" style="font-size:1.8mm">Nom</span><span style="flex:1;margin-left:3mm;border-bottom:.25mm solid ${PLUM};height:4mm"></span></div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:2mm;margin-top:3.2mm">${Array.from({ length: 10 }, (_, i) => `<div style="aspect-ratio:1;border-radius:50%;border:.3mm solid ${i === 9 ? WINE : GOLD};display:flex;align-items:center;justify-content:center;font-family:Bodoni;font-size:${i === 9 ? 2.4 : 3}mm;color:${i === 9 ? WINE : GOLD}">${i === 9 ? 'Cadeau' : i + 1}</div>`).join('')}</div>
      <div style="font-size:2.1mm;text-align:center;margin-top:2.2mm;color:#6b4a58">${cfg.fideliteRegle}</div></div>`),
  ], 'À tamponner avec le tampon rond à chaque achat. Règle modifiable dans config.json.');

  // 14. FLYER A5 recto/verso
  const chip = (t, bg, fg) => `<span style="display:inline-flex;align-items:center;height:6.4mm;padding:0 3mm;border-radius:3.2mm;background:${bg};color:${fg};font-size:2.5mm;font-weight:500">${t}</span>`;
  doc('23-flyer-A5', 'Flyer A5', 148, 210, 3, [
    P(3, 'plum center', `<div style="width:28mm">${monoSvg()}</div><div style="width:88mm;margin-top:9mm">${nomSvg(IVORY, '#e9bcb1')}</div><div class="disp" style="font-size:17mm;line-height:1;margin-top:15mm">Belle</div><div class="it gold" style="font-size:13mm;line-height:1.1">à chaque pas</div><div style="width:14mm;height:.25mm;background:${GOLD};margin:10mm 0 6mm"></div><div class="kick" style="font-size:2.5mm;color:#e9bcb1">Chaussures &amp; sacs · Dakar</div>`, '', { pattern: [GOLD, .06, 22], frame: 7 }),
    P(3, 'ivory', `<div class="abs" style="left:15mm;right:15mm;top:16mm;bottom:15mm;display:flex;flex-direction:column">
      <div class="kick goldd" style="font-size:2.3mm">La boutique en ligne</div><div class="disp" style="font-size:9.5mm;line-height:1.08;margin-top:2mm">Commandez <span class="it wine">en un geste</span></div>
      <div style="margin-top:7mm;display:grid;grid-template-columns:1fr 1fr;gap:4mm">${[['pin', 'Livraison 24 h', 'à Dakar · 48 à 72 h en régions'], ['phone', 'Paiement mobile', 'Wave, Orange Money ou à la livraison'], ['web', 'Pièces authentiques', 'étiquette QR sur chaque article'], ['wa', 'Échange 7 jours', 'taille ou couleur, sans frais']].map(([k, a, b]) => `<div style="background:#fbf1ee;border-radius:2.4mm;padding:3.6mm"><div style="width:7mm;height:7mm;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 .2mm ${GOLD}">${ico(k, GOLDD, '3.8mm')}</div><div class="disp" style="font-size:4.4mm;margin-top:2.4mm">${a}</div><div style="font-size:2.4mm;color:#6b4a58;margin-top:.6mm;line-height:1.4">${b}</div></div>`).join('')}</div>
      <div style="margin-top:6mm;text-align:center"><div class="kick goldd" style="font-size:2mm">Prête pour chaque fête</div><div class="it" style="font-size:6mm;margin-top:1.5mm">Korité <span class="dia"></span> Tabaski <span class="dia"></span> Mariages <span class="dia"></span> Baptêmes</div></div>
      <div style="margin-top:5mm;display:flex;gap:2mm;justify-content:center;flex-wrap:wrap">${chip('Wave', '#1dc8ff', '#06263a')}${chip('Orange Money', '#ff7900', '#111')}${chip('Carte', PLUM, IVORY)}${chip('À la livraison', '#11694f', '#fff')}</div>
      <div style="margin-top:auto;display:flex;gap:5mm;align-items:center;padding:4.5mm 5mm;background:radial-gradient(120% 140% at 20% 0,#56283f,${PLUM} 70%);color:${IVORY};border-radius:3mm">
        <div style="width:22mm;flex:none;background:${IVORY};padding:1.8mm;border-radius:1.5mm">${qWa}</div><div><div class="kick" style="font-size:1.9mm;color:#f0c9c1">Commandez sur WhatsApp</div><div class="disp" style="font-size:6mm;margin-top:1mm">${cfg.phone}</div><div style="font-size:2.6mm;margin-top:1.2mm;opacity:.85">${[cfg.site, cfg.instagram].filter(Boolean).join('  ·  ')}</div></div></div></div>`, '', { frame: 7 }),
  ], 'Papier couché mat 170 g, ou brillant 135 g.');

  // 15. PAPIER À EN-TÊTE A4
  doc('24-papier-en-tete-A4', 'Papier à en-tête A4', 210, 297, 0, [P(0, '', `<div class="abs" style="left:18mm;right:18mm;top:14mm;display:flex;justify-content:space-between;align-items:center"><div style="display:flex;gap:4mm;align-items:center"><div style="width:12mm">${monoSvg()}</div><div style="width:48mm">${nomSvg()}</div></div><div class="it goldd" style="font-size:4.4mm">Belle à chaque pas</div></div>
    <div class="rule abs" style="left:18mm;right:18mm;top:33mm"></div>
    <div class="abs" style="left:18mm;right:18mm;bottom:12mm;text-align:center;font-size:2.4mm;color:#6b4a58;line-height:1.6"><div class="rule" style="margin-bottom:3mm"></div>${cfg.adresse}<span class="dia"></span>${contact()}${cfg.ninea ? `<br>NINEA ${cfg.ninea}` : ''}${cfg.rc ? ` · RC ${cfg.rc}` : ''}</div>`, 'background:#fff')], 'Papier 90 g. Pour devis, courriers aux fournisseurs, attestations.');

  // 16. POCHON EN TISSU (dust bag) 30 × 40 — sérigraphie une couleur
  doc('25-pochon-tissu-30x40', 'Pochon en tissu 30 × 40 cm (sérigraphie)', 300, 400, 0, [P(0, 'center', `<div style="width:70mm">${monoSvg('line', GOLD)}</div><div style="width:150mm;margin-top:16mm">${nomSvg(GOLD, GOLD)}</div>`, 'background:#e9ddd2')], 'Coton ou suédine couleur crème ou prune ; marquage une couleur or rose (sérigraphie ou transfert). Fond beige = couleur du tissu, à ne pas imprimer.');

  // finitions par défaut : motif + filet sur les fonds prune, filet sur les cartes claires
  const DEF = { '09-etiquette-volante-50x90': [3.5, 9], '12-autocollant-merci-70x30': [2.5, 0], '14-sac-shopping-face-26x33': [12, 34], '15-sac-shopping-soufflet-10x33': [7, 22], '16-sachet-bijou-pochette-15x20': [8, 0], '17-boite-chaussures-couvercle-33x20': [10, 30], '18-boite-chaussures-cote-33x12': [6, 26], '19-boite-sac-couvercle-35x28': [12, 34], '21-carte-cadeau': [2.4, 11], '22-carte-fidelite': [2.4, 11] };
  for (const d of DOCS) { const k = DEF[d.file]; if (!k) continue; d.pages.forEach(p => { if (p.deco) return; const dark = /plum/.test(p.cls); p.deco = { frame: k[0], pattern: dark && k[1] ? [GOLD, .07, k[1]] : null }; }); }
  function deco(d, p) { if (!p.deco) return ''; const b = d.bleed; let h = ''; if (p.deco.pattern) h += pattern(...p.deco.pattern); if (p.deco.frame) h += frame(p.deco.frame + b, /plum/.test(p.cls) ? GOLD : GOLD); return h; }
  // ───────── rendu
  const b = await chromium.launch(); const pg = await b.newPage();
  const previews = [];
  for (const d of DOCS) {
    const W = d.w + 2 * d.bleed, H = d.h + 2 * d.bleed;
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${d.title}</title><style>${CSS}@page{size:${W}mm ${H}mm;margin:0}.pg{width:${W}mm;height:${H}mm}</style></head><body>${d.pages.map(p => `<section class="pg ${p.cls}" style="${p.style}">${deco(d, p)}<div class="abs ${/center/.test(p.cls) ? 'center' : ''}" style="inset:0">${p.inner}</div></section>`).join('')}</body></html>`;
    const hf = path.join(HTML, d.file + '.html'); fs.writeFileSync(hf, html);
    await pg.goto('file://' + hf); await pg.evaluate(() => document.fonts.ready);
    await pg.pdf({ path: path.join(OUT, d.file + '.pdf'), width: W + 'mm', height: H + 'mm', printBackground: true, preferCSSPageSize: true });
    console.log('OK', d.file);
  }
  await b.close();
  fs.writeFileSync(path.join(OUT, 'liste.json'), JSON.stringify(DOCS.map(d => ({ file: d.file + '.pdf', title: d.title, format: `${d.w} × ${d.h} mm`, fondsPerdus: d.bleed ? d.bleed + ' mm' : 'aucun', pages: d.pages.length, note: d.note || '' })), null, 1));
})().catch(e => { console.error(e); process.exit(1); });
