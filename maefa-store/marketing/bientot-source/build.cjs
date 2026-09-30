// Remplit template.html (logo, plans du montage, mosaïque, icônes) → index.html
const fs = require('fs'); const D = __dirname;
const mono = fs.readFileSync(D + '/maefa-monogramme.svg', 'utf8');
const nom = fs.readFileSync(D + '/maefa-nom.svg', 'utf8');
const P = [...mono.matchAll(/<path d="([^"]+)"/g)].map(m => m[1]);
const defs = mono.match(/<defs>.*<\/defs>/)[0];
const nomClair = nom.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/#3a1f2d/g, '#fdf7f5').replace(/#8f544e/g, '#e9bcb1');
const brand = fs.readFileSync('/home/user/allo-beton/maefa-store/src/components/BrandLogos.tsx', 'utf8');
const wa = JSON.parse(brand.match(/export const WhatsAppLogo = svg\('0 0 256 258', ("(?:[^"\\]|\\.)*")\)/)[1]);
const ic = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

// Les 8 plans du montage : fond, couleur du grand mot, image ou séquence vidéo, légende
const SHOTS = [
  { bg: '#2a1420', big: 'Ndella', bc: 'rgba(240,201,193,.16)', stroke: '#f0c9c1', fg: '#fdf7f5', sub: '#f0c9c1', seq: 'sac-ndella-camel', kind: 'Sac à rabat', name: 'Sac Ndella' },
  { bg: '#fbf3ef', big: 'Mules', bc: 'rgba(176,58,100,.12)', stroke: '#b77a6f', fg: '#3a1f2d', sub: '#8f544e', img: 'mules-talon-bordeaux-1', kind: 'Mules à talon', name: 'Bordeaux profond' },
  { bg: '#5e2d46', big: 'Coumba', bc: 'rgba(253,247,245,.13)', stroke: '#f0c9c1', fg: '#fdf7f5', sub: '#f0c9c1', seq: 'pochette-papillon-dore', kind: 'Pochette de soirée', name: 'Pochette Coumba' },
  { bg: '#f6ddd6', big: 'Awa', bc: 'rgba(58,31,45,.10)', stroke: '#8f544e', fg: '#3a1f2d', sub: '#8f544e', img: 'sac-awa-taupe-1', kind: 'Sac à fermoir doré', name: 'Sac Awa' },
  { bg: '#1c0a14', big: 'Tongs', bc: 'rgba(240,201,193,.14)', stroke: '#e9bcb1', fg: '#fdf7f5', sub: '#f0c9c1', seq: 'tongs-anneau-dore-dore', kind: 'Anneau doré', name: 'Tongs dorées' },
  { bg: '#fbf3ef', big: 'Soxna', bc: 'rgba(17,105,79,.12)', stroke: '#b77a6f', fg: '#3a1f2d', sub: '#8f544e', img: 'sac-soxna-vert-emeraude-1', kind: 'Effet croco', name: 'Sac Soxna' },
  { bg: '#7a1f3a', big: 'Diarra', bc: 'rgba(253,247,245,.13)', stroke: '#f0c9c1', fg: '#fdf7f5', sub: '#f6ddd6', img: 'sac-diarra-bordeaux-1', kind: 'Breloque cœur', name: 'Sac Diarra' },
  { bg: '#140910', big: 'Strass', bc: 'rgba(233,188,177,.15)', stroke: '#e9bcb1', fg: '#fdf7f5', sub: '#f0c9c1', seq: 'mules-croisees-strass-noir-dore', kind: 'Mules croisées', name: 'Noir & doré' },
];
const shotsHtml = SHOTS.map((s, i) => `
    <div class="shot" id="s${i}" style="background:${s.bg};color:${s.fg}">
      <div class="top" style="color:${s.sub}"><span>Maefa</span><span>Bientôt</span></div>
      <div class="big" style="color:${s.bc}">${s.big}</div>
      <div class="frame"><img src="${s.seq ? `seq/${s.seq}/001.jpg` : `img/${s.img}.jpg`}"></div>
      <svg class="ring" viewBox="0 0 100 136" preserveAspectRatio="none"><path d="M1 135V50A49 49 0 0 1 99 50V135" fill="none" stroke="${s.stroke}" stroke-width=".35" vector-effect="non-scaling-stroke" style="stroke-width:2px"/></svg>
      <div class="cap"><span class="kick" style="color:${s.sub}">${String(i + 1).padStart(2, '0')} — ${s.kind}</span><b>${s.name}</b></div>
    </div>`).join('');

const MOS = ['sac-soxna-rouge-1', 'sac-awa-noir-1', 'mules-talon-vert-sapin-1', 'sac-aminata-taupe-1', 'pochette-papillon-fuchsia-1', 'tongs-zara-orteil-cognac-1', 'sac-ndella-noir-1', 'tongs-adja-blanc-1',
  'sac-diarra-rose-1', 'sac-soxna-bleu-roi-1', 'sac-awa-creme-cognac-1', 'mules-croisees-strass-dore-1', 'sac-ndella-camel-1', 'pochette-papillon-dore-1', 'sac-awa-taupe-1', 'mules-talon-bordeaux-1',
  'sac-soxna-vert-emeraude-1', 'tongs-anneau-dore-dore-1', 'sac-diarra-bordeaux-1', 'mules-croisees-strass-noir-dore-1'];
let mos = '';
for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) {
  const k = (r * 4 + c) % MOS.length;
  mos += `<img src="img/${MOS[k]}.jpg" style="left:${c * 400 + (r % 2) * 200}px;top:${r * 470}px">`;
}
const map = {
  MONO_DEFS: defs, MONO_DEFS5: defs.replace(/id="(mg|mp)"/g, 'id="$15"'),
  ARCH: P[0], ARCH_OPEN: 'M18 94V38A32 32 0 0 1 82 38V94', RING: P[1], DIAM: P[2], M: P[3], PAR: P[4], NOM_CLAIR: nomClair, WA: `<svg viewBox="0 0 256 258">${wa}</svg>`,
  SHOTS: shotsHtml, MOSAIC: mos,
  ICON_SPARK: `<span class="ico">${ic('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>')}</span>`,
  ICON_TRUCK: ic('<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>'),
  ICON_CASH: ic('<rect x="3" y="6.5" width="18" height="11" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6.5 9.5v5M17.5 9.5v5"/>'),
  ICON_CHAT: ic('<path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.1A8 8 0 1 1 20 12z"/><path d="M9 11h.01M12 11h.01M15 11h.01"/>'),
};
let html = fs.readFileSync(D + '/template.html', 'utf8');
html = html.replace(/\{\{(\w+)\}\}/g, (_, k) => { if (!(k in map)) throw new Error('manque ' + k); return map[k]; });
fs.writeFileSync(D + '/index.html', html);
fs.writeFileSync(D + '/shots.json', JSON.stringify(SHOTS));
console.log('index.html', html.length);
