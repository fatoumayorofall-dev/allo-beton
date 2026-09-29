// Remplit template.html avec les tracés du logo Maefa, le logo WhatsApp et les icônes → index.html
const fs = require('fs');
const D = __dirname;
const mono = fs.readFileSync(D + '/maefa-monogramme.svg', 'utf8');
const nom = fs.readFileSync(D + '/maefa-nom.svg', 'utf8');
const P = [...mono.matchAll(/<path d="([^"]+)"/g)].map(m => m[1]);
const defs = mono.match(/<defs>.*<\/defs>/)[0];
const nomClair = nom.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/#3a1f2d/g, '#fdf7f5').replace(/#8f544e/g, '#e9bcb1');
const brand = fs.readFileSync('/home/user/allo-beton/maefa-store/src/components/BrandLogos.tsx', 'utf8');
const wa = JSON.parse(brand.match(/export const WhatsAppLogo = svg\('0 0 256 258', ("(?:[^"\\]|\\.)*")\)/)[1]);
const ic = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const map = {
  MONO_DEFS: defs, MONO_DEFS6: defs.replace(/id="(mg|mp)"/g, 'id="e$1"'),
  ARCH: P[0], RING: P[1], DIAM: P[2], M: P[3], PAR: P[4], NOM_CLAIR: nomClair, WA: wa,
  ICON_SPARK: `<span class="ico">${ic('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>')}</span>`,
  ICON_BAG: ic('<path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>'),
};
let html = fs.readFileSync(D + '/template.html', 'utf8');
html = html.replace(/\{\{(\w+)\}\}/g, (_, k) => { if (!(k in map)) throw new Error('manque ' + k); return map[k]; });
fs.writeFileSync(D + '/index.html', html);
console.log('index.html', html.length);
