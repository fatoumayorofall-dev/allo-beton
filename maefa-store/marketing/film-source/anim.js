// Maefa — film 30 s, 1080×1920, calé sur la musique (100 BPM : 1 temps = 0,6 s, 1 mesure = 2,4 s).
// render(t) est déterministe : chaque image est calculée à partir du temps seul.
'use strict';
const $ = id => document.getElementById(id);
const C = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const P = (t, a, b) => C((t - a) / (b - a));
const L = (a, b, x) => a + (b - a) * x;
const E = {
  o3: x => 1 - Math.pow(1 - x, 3), o5: x => 1 - Math.pow(1 - x, 5),
  oX: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x), iX: x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10),
  io3: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  io5: x => x < .5 ? 16 * Math.pow(x, 5) : 1 - Math.pow(-2 * x + 2, 5) / 2,
  ioX: x => x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
  back: x => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
  io3inv: y => y < .5 ? Math.cbrt(y / 4) : 1 - Math.cbrt((1 - y) * 2) / 2,
  spring: x => x <= 0 ? 0 : 1 - Math.exp(-5.5 * x) * Math.cos(11 * x),
};
const bell = (t, c, w) => Math.exp(-Math.pow((t - c) / w, 2));
function tf(el, o) {
  const tr = `translate3d(${(o.x || 0).toFixed(2)}px,${(o.y || 0).toFixed(2)}px,${(o.z || 0).toFixed(2)}px)` + (o.rx ? ` rotateX(${o.rx}deg)` : '') + (o.ry ? ` rotateY(${o.ry}deg)` : '') + (o.r ? ` rotate(${o.r}deg)` : '') + ` scale(${o.s === undefined ? 1 : o.s})`;
  el.style.transform = tr;
  if (o.o !== undefined) el.style.opacity = C(o.o);
  if (o.b !== undefined) el.style.filter = o.b > .05 ? `blur(${o.b.toFixed(2)}px)` : 'none';
}
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const K = 600 / 780; // capture 780 px → écran de téléphone 600 px

// ───────── construction du texte ─────────
function chars(el, text) { el.innerHTML = [...text].map(c => `<span class="c">${c === ' ' ? '&nbsp;' : c}</span>`).join(''); return [...el.querySelectorAll('.c')]; }
function letterMasks(el, text, extraPad = '.22em') {
  el.innerHTML = [...text].map(c => `<span class="ln" style="display:inline-block;padding-bottom:${extraPad};margin-bottom:-${extraPad}"><span class="in">${c === ' ' ? '&nbsp;' : c}</span></span>`).join('');
  return [...el.querySelectorAll('.in')];
}
function wordMasks(el, html) {
  el.innerHTML = html.split(' ').map(w => `<span class="ln"><span class="in">${w}</span></span>`).join(' ');
  return [...el.querySelectorAll('.in')];
}
function headline(el, kick, lines) {
  el.innerHTML = `<div class="kick"></div><div class="ttl">${lines.map(l => `<span class="ln"><span class="in">${l}</span></span>`).join('')}</div>`;
  return { k: chars(el.querySelector('.kick'), kick), l: [...el.querySelectorAll('.ttl .in')], el };
}
function hlAnim(h, t, tin, tout) {
  const vis = t > tin - .05 && t < tout + .05; h.el.style.display = vis ? 'block' : 'none'; if (!vis) return;
  h.k.forEach((c, i) => { const a = E.o3(P(t, tin + i * .012, tin + .4 + i * .012)), o = E.iX(P(t, tout - .45 + i * .006, tout - .1 + i * .006)); tf(c, { y: (1 - a) * 22 - o * 16, o: a * (1 - o) }); });
  h.l.forEach((l, i) => { const a = E.oX(P(t, tin + .1 + i * .09, tin + .95 + i * .09)), o = E.iX(P(t, tout - .5 + i * .06, tout - .05 + i * .06)); l.style.transform = `translateY(${((1 - a) * 110 - o * 110).toFixed(2)}%) rotate(${((1 - a) * 3).toFixed(2)}deg)`; });
}

// ───────── acte 1 ─────────
const logo1 = $('logo1'), m1 = $('m1');
const VB = { x: 17, y: 5, k: 380 / 66, left: 350, top: 470 };
const v2s = (x, y) => [VB.left + (x - VB.x) * VB.k, VB.top + (y - VB.y) * VB.k];
const [ia0x, ia0y] = v2s(23.2, 11.2), [ia1x, ia1y] = v2s(76.8, 94);
const DOOR = { x: ia0x, y: ia0y, w: ia1x - ia0x, h: ia1y - ia0y, ox: 540, oy: 700 };
const tag1 = chars($('tag1'), 'Chaussures & sacs · Dakar');

// ───────── acte 2 ─────────
const WIN = { x: 170, y: 600, w: 740, h: 1143, ox: 540, oy: 1150 };
const belle = letterMasks($('belle'), 'Belle', '.05em');
const chaque = wordMasks($('chaque'), 'à chaque pas');
const a2kick = chars($('a2kick'), 'Collection automne 2026');
const a2coord = chars($('a2coord'), '14°41′ N · 17°26′ O');
const noirKick = chars($('noirKick'), 'La pièce du moment');
$('noir').innerHTML = `<span class="ln"><span class="in">Noir</span></span> <span class="ln"><span class="in"><i>&amp; or</i></span></span>`;
const noir = [...$('noir').querySelectorAll('.in')];
const foot1 = $('foot1'), footWrap = $('footWrap'), archLine = $('archLine'), archLineP = $('archLineP'), chip2 = $('chip2');
function setMask(b) { footWrap.style.webkitMaskSize = `${b.w}px ${b.h}px`; footWrap.style.webkitMaskPosition = `${b.x}px ${b.y}px`; }
const scaleBox = (B, s) => ({ x: B.ox + (B.x - B.ox) * s, y: B.oy + (B.y - B.oy) * s, w: B.w * s, h: B.h * s });

// ───────── acte 3 ─────────
const MONT = [
  { p: $('p1'), w: $('w1'), text: 'Escarpins', max: 960 },
  { p: $('p2'), w: $('w2'), f: $('w2f'), text: 'Sandales', max: 980 },
  { p: $('p3'), w: $('w3'), text: 'Mules', max: 980 },
  { p: $('p4'), w: $('w4'), text: 'Sacs', max: 980 },
];
MONT.forEach((m, k) => { m.ts = 9.6 + k * 1.2; m.L = letterMasks(m.w, m.text); if (m.f) m.F = letterMasks(m.f, m.text); m.cap = m.p.querySelector('.cap'); m.idx = m.p.querySelector('.idx'); m.side = m.p.querySelector('.side'); });
const foot2 = $('foot2');

// ───────── acte 4 ─────────
function makePhone(id, layers) {
  const ph = document.createElement('div'); ph.className = 'phone'; ph.id = id;
  const sc = document.createElement('div'); sc.className = 'screen'; ph.appendChild(sc);
  const n = document.createElement('div'); n.className = 'notch'; sc.appendChild(n);
  const L = layers.map(([img, tab]) => { const l = document.createElement('div'); l.className = 'lay'; const im = document.createElement('img'); im.className = 'shot'; im.src = img; l.appendChild(im);
    if (tab) { const tb = document.createElement('img'); tb.className = 'tab'; tb.src = tab; l.appendChild(tb); } sc.appendChild(l); return { l, im }; });
  $('fanIn').appendChild(ph); return { ph, L };
}
const PH1 = makePhone('ph1', [['shots/boutique.png', 'shots/boutique-tab.png']]);
const PH3 = makePhone('ph3', [['shots/produit.png', 'shots/produit-tab.png']]);
const PH2 = makePhone('ph2', [['shots/home.png', 'shots/home-tab.png'], ['shots/produit.png', 'shots/produit-tab.png']]);
const H41 = headline($('h41'), 'Boutique en ligne', ['Votre boutique,', '<i>dans la poche</i>']);
const H42 = headline($('h42'), 'En quelques secondes', ['Commandez', '<i>en un geste</i>']);
const H43 = headline($('h43'), 'Wave · Orange Money · à la livraison', ['Payez', '<i>comme vous voulez</i>']);
const UI = [
  { el: $('u-price'), to: [40, 690], a: 17.0 }, { el: $('u-add'), to: [610, 1060], a: 17.12 },
  { el: $('u-colors'), to: [30, 1330], a: 17.24 }, { el: $('u-wa'), to: [215, 1660], a: 17.36 },
];
const TILES = [
  { el: $('t-wave'), y: 690, a: 19.3 }, { el: $('t-om'), y: 846, a: 19.42 }, { el: $('t-card'), y: 1002, a: 19.54 }, { el: $('t-cash'), y: 1176, a: 19.66 },
];

// ───────── acte 5 ─────────
const ROUTE = 'M110 1780 C 180 1560, 420 1600, 640 1560 S 900 1380, 820 1230 S 420 1150, 300 1010 S 280 800, 520 760 S 900 700, 960 560';
['routeRev', 'routeGhost', 'routeDots'].forEach(id => $(id).setAttribute('d', ROUTE));
const routeLen = $('routeGhost').getTotalLength();
const CITIES = ['Plateau', 'Médina', 'Sacré-Cœur', 'Almadies', 'Parcelles', 'Pikine', 'Rufisque', 'Thiès', 'Touba', 'Saint-Louis'].map((name, i) => {
  const g = $('routeGhost'), f = .05 + i * .1, pt = g.getPointAtLength(f * routeLen), a = g.getPointAtLength(Math.max(0, f * routeLen - 6)), b = g.getPointAtLength(Math.min(routeLen, f * routeLen + 6));
  let nx = -(b.y - a.y), ny = b.x - a.x; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
  const side = i % 2 ? 1 : -1; if (nx * side < 0) { nx = -nx; ny = -ny; } // étiquette vers l'extérieur, alternée
  const el = document.createElement('div'); el.className = 'city'; el.textContent = name; $('cities').appendChild(el);
  const pin = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); pin.setAttribute('cx', pt.x); pin.setAttribute('cy', pt.y); pin.setAttribute('r', 8); pin.setAttribute('fill', '#f0c9c1'); $('route').appendChild(pin);
  return { el, pin, f, px: pt.x, py: pt.y, nx, ny };
});
// courbes de niveau (carte abstraite)
{ const g = []; for (let i = 0; i < 11; i++) { const R = 120 + i * 105, pts = [];
    for (let a = 0; a <= 64; a++) { const th = a / 64 * Math.PI * 2, r = R * (1 + .09 * Math.sin(3 * th + i * .7) + .05 * Math.sin(5 * th - i) + .03 * Math.sin(9 * th + i * 1.3));
      pts.push(`${(560 + Math.cos(th) * r * 1.05).toFixed(1)},${(1120 + Math.sin(th) * r * .92).toFixed(1)}`); }
    g.push(`<path d="M${pts.join('L')}Z" fill="none" stroke="#c48a82" stroke-opacity="${(.22 - i * .012).toFixed(3)}" stroke-width="1.6" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>`); }
  $('topo').innerHTML = `<g id="topoG">${g.join('')}</g>`; }
const topoPaths = [...$('topo').querySelectorAll('path')];
const A5H = headline($('a5h'), 'Livraison', ['Partout', '<i>au Sénégal</i>']);
const FETES = ['Korité', 'Tabaski', 'Mariages', 'Baptêmes'].map(n => { const d = document.createElement('div'); d.className = 'fete'; d.textContent = n; $('fetes').appendChild(d); return d; });
const fetesKick = chars($('fetesKick'), 'Prête pour chaque fête');

// ───────── acte 6 ─────────
$('tag6').innerHTML = `<span class="ln" style="display:inline-block;vertical-align:top;padding-bottom:.12em"><span class="in">Belle</span></span> <span class="ln" style="display:inline-block;vertical-align:top;padding-bottom:.12em"><span class="in"><i>à chaque pas</i></span></span>`;
const tag6 = [...$('tag6').querySelectorAll('.in')];
const sub6 = chars($('sub6'), 'Chaussures & sacs · Dakar');

// ───────── particules ─────────
const dust = [];
for (let i = 0; i < 26; i++) { const e = document.createElement('div'); e.className = 'sp'; $('dust').appendChild(e); const z = rnd();
  dust.push({ e, x: rnd() * 1080, y: rnd() * 1920, s: .22 + z * .7, sp: 12 + z * 40, ph: rnd() * 6.28 }); }
for (let i = 0; i < 7; i++) { const e = document.createElement('div'); e.className = 'bokeh'; const d = 90 + rnd() * 200; e.style.width = e.style.height = d + 'px'; $('dust').appendChild(e);
  dust.push({ e, bokeh: true, d, x: rnd() * 1080, y: rnd() * 1920, sp: 8 + rnd() * 16, ph: rnd() * 6.28 }); }
const BURSTS = [[2.05, 540, 506, 18, 300], [12.18, 540, 880, 22, 420], [20.72, 485, 1465, 26, 400], [24.05, 900, 900, 8, 200], [24.65, 900, 900, 8, 200], [25.25, 900, 900, 8, 200], [25.85, 900, 900, 8, 200], [26.42, 540, 590, 34, 560]];
const BP = [];
BURSTS.forEach(([t0, x, y, n, f]) => { for (let i = 0; i < n; i++) { const e = document.createElement('div'); e.className = 'sp'; $('dust').appendChild(e);
  const a = rnd() * 6.283, v = f * (.4 + rnd() * .8); BP.push({ e, t0, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 100, s: .45 + rnd() * .9, rot: rnd() * 360, life: 1 + rnd() * .8 }); } });
const CONV = []; // particules qui convergent vers le logo final
for (let i = 0; i < 40; i++) { const e = document.createElement('div'); e.className = 'sp'; $('dust').appendChild(e); const a = rnd() * 6.283, r = 700 + rnd() * 600;
  CONV.push({ e, x: 540 + Math.cos(a) * r, y: 590 + Math.sin(a) * r * 1.3, d: rnd() * .25, s: .4 + rnd() * .8 }); }

// grain
{ const g = $('grain').getContext('2d'), im = g.createImageData(604, 1024); for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (rnd() - .5) * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); }

// ───────── vidéo (images pré-extraites, 60 i/s, lues au ralenti ½) ─────────
const cache = new Map();
function loadImg(url) {
  if (cache.has(url)) return cache.get(url);
  const p = new Promise(r => { const i = new Image(); i.onload = () => i.decode().then(() => r(i), () => r(i)); i.onerror = () => r(null); i.src = url; });
  cache.set(url, p); if (cache.size > 30) cache.delete(cache.keys().next().value); return p;
}
const footUrl = t => `foot/${String(Math.round(C((t - 3.9) * 30, 0, 526)) + 1).padStart(4, '0')}.jpg`;

// mesure des lettres (acte 3) pour caler la vidéo dans le texte
const acts = ['a1bg', 'a1fg', 'a2', 'a3', 'a4', 'a5', 'a6'].map($);
acts.forEach(a => a.style.display = 'block');
function fit(el, max) { const w = el.scrollWidth; if (w > max) el.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * max / w) + 'px'; }
MONT.forEach(m => { fit(m.w, m.max); if (m.f) m.f.style.fontSize = m.w.style.fontSize; });
fit($('noir'), 940);
const W1 = MONT[0].L.map(s => { const r = s.getBoundingClientRect(); return { s, x: r.left, y: r.top }; });
CITIES.forEach(c => { c.w = c.el.getBoundingClientRect().width; const ax = c.px + c.nx * 34, ay = c.py + c.ny * 34; c.x = c.nx >= 0 ? ax : ax - c.w; c.y = ay - 22; c.x = C(c.x, 30, 1050 - c.w); });
acts.forEach(a => a.style.display = 'none');

const show = (el, on) => { el.style.display = on ? 'block' : 'none'; };

window.DURATION = 30;
window.render = async function (t) {
  // ── vidéo
  const url = footUrl(t); await loadImg(url);
  // ── actes visibles
  show(acts[0], t < 4.85); show(acts[1], t < 4.85); show(acts[2], t >= 3.85 && t < 9.9); show(acts[3], t >= 9.3 && t < 14.7);
  show(acts[4], t >= 14.2 && t < 22.2); show(acts[5], t >= 21.35 && t < 26.6); show(acts[6], t >= 26.36); acts[6].style.opacity = P(t, 26.36, 26.5);

  // ── « coup » de caméra sur les temps forts (pendant le groove)
  let punch = 0; if (t >= 4.8 && t < 24) { const b = (t - 4.8) / .6, bi = Math.floor(b), ph = (b - bi) * .6; punch = (bi % 4 === 0 ? .012 : .004) * Math.exp(-ph * 10); }
  $('world').style.transform = `scale(${1 + punch})`;

  // ═════ ACTE 1 : la porte (0 → 4,8)
  if (t < 4.85) {
    const ring = E.io3(P(t, .35, 1.8)); $('m1ring').setAttribute('stroke-dashoffset', 1 - ring);
    $('c1r').setAttribute('y', L(100, 0, E.o5(P(t, 1.15, 2.3))));
    const md = E.io3(P(t, 1.6, 2.7)); $('m1M').setAttribute('stroke-dashoffset', 1 - md); $('m1M').setAttribute('fill-opacity', E.o3(P(t, 2.3, 3.1)));
    $('c1pr').setAttribute('width', 40 * E.io3(P(t, 2.7, 3.2)));
    $('m1shine').setAttribute('x', L(-40, 120, E.io3(P(t, 3.0, 3.8))));
    const dm = E.back(P(t, 1.95, 2.4)); $('m1diam').style.transformBox = 'view-box'; $('m1diam').style.transformOrigin = '50px 11.2px'; $('m1diam').style.transform = `scale(${dm})`;
    // point de lumière initial puis éclat sur la clé de voûte
    const g = Math.max(bell(t, .35, .28) * .8, bell(t, 2.1, .22)); const gl = $('glint1'); gl.style.left = '540px'; gl.style.top = '506px';
    gl.style.opacity = g; gl.style.transform = `rotate(${45 + t * 40}deg) scale(${.3 + g * (t > 1 ? 1.3 : .6)})`;
    $('n1r').setAttribute('width', 272 * E.io3(P(t, 2.75, 3.55)));
    tag1.forEach((c, i) => { const a = E.o3(P(t, 3.0 + i * .015, 3.5 + i * .015)); tf(c, { y: (1 - a) * 16, o: a * (1 - P(t, 3.75, 4.0)) }); });
    const nf = 1 - E.o3(P(t, 3.7, 4.05)); $('n1').style.opacity = nf; $('n1').style.transform = `translateY(${(1 - nf) * 30}px)`;
    // zoom à travers la porte
    const z = E.iX(P(t, 3.85, 4.8)), s = L(1, 28, z);
    logo1.style.transform = `scale(${s})`;
    $('m1fill').style.opacity = 1 - E.o3(P(t, 3.95, 4.3));
    m1.style.opacity = 1 - P(t, 4.45, 4.8);
    if (t >= 3.85) setMask(scaleBox({ ...DOOR }, s)), foot1.style.transform = `scale(${L(1.35, 1.12, E.o3(P(t, 3.85, 4.8)))})`;
  }
  // ═════ ACTE 2 : éditorial (4,8 → 9,6)
  if (t >= 3.85 && t < 9.9) {
    foot1.src = url; if (!foot1.complete) await foot1.decode().catch(() => {});
    const on = t >= 4.8; $('a2').style.background = on ? '' : 'transparent'; $('a2').querySelector('.bgGlow').style.opacity = on ? 1 : 0;
    if (on) {
      const pull = E.oX(P(t, 4.8, 6.1)), push = E.iX(P(t, 8.5, 9.6));
      const s = L(7.5, 1, pull) * L(1, 7.5, push);
      setMask(scaleBox(WIN, s));
      foot1.style.transform = `translateY(${(-60 * pull * (1 - push)).toFixed(1)}px) scale(${(L(1.12, .96, pull) + .07 * P(t, 6.1, 9.6) + push * .12).toFixed(4)})`;
      const lb = scaleBox(WIN, s); archLine.style.left = lb.x + 'px'; archLine.style.top = lb.y + 'px'; archLine.style.width = lb.w + 'px'; archLine.style.height = lb.h + 'px';
      archLineP.setAttribute('stroke-dashoffset', 1 - E.io3(P(t, 5.2, 6.6))); archLine.style.opacity = 1 - P(t, 8.5, 8.9);
    } else archLine.style.opacity = 0;
    belle.forEach((c, i) => { const a = E.oX(P(t, 4.9 + i * .07, 5.9 + i * .07)), o = E.iX(P(t, 7.0 + i * .05, 7.45 + i * .05)); c.style.transform = `translateY(${((1 - a) * 105 - o * 105).toFixed(2)}%)`; });
    chaque.forEach((c, i) => { const a = E.oX(P(t, 5.45 + i * .12, 6.35 + i * .12)), o = E.iX(P(t, 7.0 + i * .04, 7.35 + i * .04)); c.style.transform = `translateY(${((1 - a) * 110 + o * 110).toFixed(2)}%)`; });
    a2kick.forEach((c, i) => { const a = E.o3(P(t, 5.0 + i * .014, 5.4 + i * .014)), o = E.iX(P(t, 6.95 + i * .008, 7.3 + i * .008)); tf(c, { y: (1 - a) * 18, o: a * (1 - o) }); });
    a2coord.forEach((c, i) => { const a = E.o3(P(t, 5.2 + i * .014, 5.6 + i * .014)), o = P(t, 8.5, 8.8); tf(c, { y: (1 - a) * 18, o: a * (1 - o) }); });
    noirKick.forEach((c, i) => { const a = E.o3(P(t, 7.25 + i * .014, 7.65 + i * .014)), o = E.iX(P(t, 8.45, 8.8)); tf(c, { y: (1 - a) * 18 - o * 20, o: a * (1 - o) }); });
    noir.forEach((c, i) => { const a = E.oX(P(t, 7.3 + i * .12, 8.2 + i * .12)), o = E.iX(P(t, 8.45 + i * .05, 8.9 + i * .05)); c.style.transform = `translateY(${((1 - a) * 108 - o * 108).toFixed(2)}%)`; });
    { const a = E.spring(P(t, 7.6, 8.6)), o = E.iX(P(t, 8.45, 8.8)); tf(chip2, { x: 110 + (1 - C(a)) * -80, y: 1560 + (1 - C(a)) * 40 + Math.sin((t - 7.6) * 2.6) * 6, s: L(.7, 1, C(a)), o: C(P(t, 7.6, 7.9)) * (1 - o), b: (1 - C(P(t, 7.6, 7.9))) * 8 }); chip2.style.left = '0'; chip2.style.top = '0'; }
  }
  // ═════ ACTE 3 : montage (9,6 → 14,4)
  if (t >= 9.3 && t < 14.7) {
    foot2.src = url;
    MONT.forEach((m, k) => {
      const w = E.o5(P(t, m.ts - .16, m.ts + .26)), P1 = L(-40, 140, w);
      m.p.style.clipPath = `polygon(0 0, ${P1}% 0, ${P1 - 40}% 100%, 0 100%)`; m.p.style.display = t >= m.ts - .16 ? 'block' : 'none';
      const life = P(t, m.ts, m.ts + 1.6);
      m.w.style.transform = `scale(${1 + life * .05})`; if (m.f) m.f.style.transform = m.w.style.transform;
      m.L.forEach((c, i) => { const a = E.oX(P(t, m.ts + .02 + i * .035, m.ts + .75 + i * .035)); c.style.transform = `translateY(${((1 - a) * 108).toFixed(2)}%) rotate(${((1 - a) * 6).toFixed(2)}deg)`; });
      if (m.F) { m.F.forEach((c, i) => { c.style.transform = m.L[i].style.transform; }); m.f.style.clipPath = `inset(0 ${(100 - 100 * E.io3(P(t, m.ts + .35, m.ts + .95))).toFixed(2)}% 0 0)`; m.f.style.color = '#b03a64'; }
      if (k === 3) m.w.style.letterSpacing = L(.28, .04, E.oX(P(t, m.ts, m.ts + .9))) + 'em';
      const ca = E.o3(P(t, m.ts + .3, m.ts + .75)); tf(m.cap, { y: (1 - ca) * 30, o: ca });
      m.idx.style.opacity = m.side.style.opacity = E.o3(P(t, m.ts + .1, m.ts + .45));
    });
    // vidéo dans les lettres d'« Escarpins », fixée à l'écran
    W1.forEach(({ s, x, y }) => { s.style.webkitTextStroke = '1.6px rgba(240,201,193,.95)'; s.style.backgroundImage = `url(${url})`; s.style.backgroundSize = '1080px 1920px'; s.style.webkitBackgroundClip = 'text'; s.style.color = 'transparent';
      const m = /translateY\(([-\d.]+)%\)/.exec(s.style.transform), dy = m ? parseFloat(m[1]) / 100 * s.offsetHeight : 0; s.style.backgroundPosition = `${-x}px ${-(y + dy)}px`; });
    { const a = E.o5(P(t, 11.1, 11.6)); $('arch2').style.clipPath = `inset(${(100 - a * 100).toFixed(2)}% 0 0 0)`; }
  }
  // ═════ ACTE 4 : le site (14,4 → 21,6)
  if (t >= 14.2 && t < 22.2) {
    const a4 = $('a4'); const rv = E.oX(P(t, 14.22, 14.75)); a4.style.clipPath = `inset(${(100 - rv * 100).toFixed(2)}% 0 0 0 round ${(1 - rv) * 80}px ${(1 - rv) * 80}px 0 0)`;
    hlAnim(H41, t, 14.5, 16.8); hlAnim(H42, t, 16.9, 19.15); hlAnim(H43, t, 19.25, 21.7);
    const orbit = L(-9, 7, E.io3(P(t, 14.4, 16.9))) * (1 - E.io3(P(t, 16.9, 17.5)));
    $('fanIn').style.transform = `rotateY(${orbit}deg)`;
    const focus = E.io5(P(t, 16.8, 17.5)), pay = E.io5(P(t, 19.1, 19.8));
    const enter = i => E.oX(P(t, 14.35 + i * .09, 15.5 + i * .09));
    const e2 = enter(0), e1 = enter(1), e3 = enter(2);
    tf(PH2.ph, { x: L(0, -250, pay), y: (1 - e2) * 1700 + L(0, 30, focus) - pay * 10, z: 0, ry: L(0, 17, pay), s: L(.72, .8, focus) * L(1, .92, pay) });
    tf(PH1.ph, { x: -410 - focus * 700, y: (1 - e1) * 1700 + 40, z: -380, ry: 30, s: .7, o: 1 - focus });
    tf(PH3.ph, { x: 410 + focus * 700, y: (1 - e3) * 1700 + 40, z: -380, ry: -30, s: .7, o: 1 - focus });
    tf($('sh2'), { x: L(0, -250, pay), y: (1 - e2) * 400, s: L(.72, .8, focus), o: e2 * .9 });
    // défilement des écrans
    PH1.L[0].im.style.transform = `translateY(${-L(300, 1500, E.io3(P(t, 14.9, 16.8))) * K}px)`;
    PH3.L[0].im.style.transform = `translateY(${-L(600, 1700, E.io3(P(t, 14.9, 16.8))) * K}px)`;
    PH2.L[0].im.style.transform = `translateY(${-L(0, 1500, E.io3(P(t, 14.9, 16.8))) * K}px)`;
    const sw = E.io5(P(t, 16.85, 17.35)); PH2.L[1].l.style.transform = `translateX(${(1 - sw) * 620}px)`; PH2.L[0].l.style.transform = `translateX(${-sw * 200}px)`; PH2.L[0].l.style.filter = `brightness(${1 - sw * .4})`;
    PH2.L[1].im.style.transform = `translateY(${-L(0, 700, E.io3(P(t, 17.4, 19.0))) * K}px)`;
    // éléments d'interface qui jaillissent
    UI.forEach((u, i) => { const a = E.spring(P(t, u.a, u.a + 1.1)), o = E.iX(P(t, 19.05 + i * .04, 19.45 + i * .04));
      const fx = 540 - 200, fy = 1150, bob = Math.sin((t - u.a) * 2.3 + i) * 7;
      tf(u.el, { x: L(fx, u.to[0], a) + (i % 2 ? 1 : -1) * o * 500, y: L(fy, u.to[1], a) + bob, s: L(.45, 1, C(P(t, u.a, u.a + .5)) * .5 + a * .5) * (i === 1 ? 1 - .06 * bell(t, 18.15, .07) : 1), o: C(P(t, u.a, u.a + .2)) * (1 - o), r: (1 - C(a)) * (i % 2 ? 8 : -8) }); });
    // doigt : ajout au panier puis choix de Wave
    const taps = [[18.15, 610 + 210, 1060 + 64], [20.15, 400 + 310, 690 + 69]];
    let fo = 0, fx = 0, fy = 0, fs = 1, ro = 0, rx = 0, ry = 0, rs = 1;
    taps.forEach(([t0, x, y]) => { const k = P(t, t0 - .6, t0 + .5); if (k > 0 && k < 1) { const ar = E.o3(P(t, t0 - .6, t0 - .08)), lv = E.io3(P(t, t0 + .2, t0 + .5)), pr = P(t, t0 - .08, t0) * (1 - P(t, t0 + .04, t0 + .16));
        fo = Math.min(ar * 1.3, 1 - lv); fx = x + (1 - ar) * 240 + lv * 280; fy = y + (1 - ar) * 360 + lv * 400; fs = 1 - pr * .22; }
      const r = P(t, t0, t0 + .6); if (r > 0 && r < 1) { ro = 1 - r; rx = x; ry = y; rs = .3 + E.o3(r) * 1.2; } });
    tf($('finger'), { x: fx, y: fy, s: fs, o: fo }); tf($('rip'), { x: rx, y: ry, s: rs, o: ro });
    { const a = E.spring(P(t, 18.25, 19.2)), o = E.iX(P(t, 19.0, 19.3)); tf($('badge'), { x: 560, y: 520 - (1 - C(a)) * 60, s: L(.5, 1, C(a)), o: C(P(t, 18.25, 18.45)) * (1 - o) }); }
    // moyens de paiement
    TILES.forEach((u, i) => { const a = E.spring(P(t, u.a, u.a + 1.0)); const sel = i === 0 ? bell(t, 20.18, .09) : 0, dim = i ? E.o3(P(t, 20.25, 20.6)) : 0, out = E.iX(P(t, 21.2, 21.55));
      tf(u.el, { x: L(1250, 400, a) + out * 700, y: u.y + Math.sin((t - u.a) * 2 + i) * 5, r: (1 - C(a)) * -7, s: 1 + sel * .05 + (i === 0 ? .02 * E.o3(P(t, 20.15, 20.5)) : 0), o: C(P(t, u.a, u.a + .15)) * (1 - dim * .55) });
      if (i === 0) u.el.style.boxShadow = `0 40px 80px -24px rgba(58,31,45,.5), 0 0 0 ${(4 * E.o3(P(t, 20.15, 20.45))).toFixed(1)}px #b03a64`; });
    { const a = E.back(P(t, 20.55, 21.0)); tf($('check'), { x: 410, y: 1390, s: C(a, 0, 1.2), o: C(P(t, 20.55, 20.7)) });
      $('checkRing').setAttribute('stroke-dashoffset', 1 - E.io3(P(t, 20.6, 21.1))); $('checkTick').setAttribute('stroke-dashoffset', 1 - E.o3(P(t, 20.75, 21.05)));
      const m = E.spring(P(t, 20.8, 21.7)); tf($('u-merci'), { x: 580 + (1 - C(m)) * 60, y: 1415, s: L(.8, 1, C(m)), o: C(P(t, 20.8, 21.0)) }); }
  }
  // ═════ ACTE 5 : Sénégal (21,6 → 26,4)
  if (t >= 21.35 && t < 26.6) {
    const rv = E.io3(P(t, 21.38, 22.1)); $('a5').style.clipPath = `circle(${(rv * 2300).toFixed(1)}px at 485px 1465px)`;
    topoPaths.forEach((p, i) => p.setAttribute('stroke-dashoffset', 1 - E.io3(P(t, 21.6 + i * .06, 22.8 + i * .06))));
    const fetesOn = E.io3(P(t, 23.85, 24.25));
    $('topoG').setAttribute('transform', `rotate(${(t - 21.6) * 2} 560 1120)`); $('topo').style.opacity = 1 - fetesOn * .6;
    const rp = E.io3(P(t, 21.95, 23.75)), len = rp * routeLen;
    $('routeRev').setAttribute('stroke-dasharray', `${len} ${routeLen}`);
    const pt = $('routeGhost').getPointAtLength(Math.max(.1, len));
    $('courier').setAttribute('cx', pt.x); $('courier').setAttribute('cy', pt.y); $('pulse').setAttribute('cx', pt.x); $('pulse').setAttribute('cy', pt.y);
    const pb = ((t - 21.6) / .6) % 1; $('pulse').setAttribute('r', 16 + pb * 40); $('pulse').setAttribute('stroke-opacity', (1 - pb) * .8);
    $('route').style.opacity = C(P(t, 21.9, 22.1)) * (1 - fetesOn); $('route').style.filter = fetesOn > .02 ? `blur(${fetesOn * 10}px)` : 'none';
    CITIES.forEach(c => { const t0 = 21.95 + E.io3inv(c.f) * 1.8, a = E.back(P(t, t0, t0 + .4)); tf(c.el, { x: c.x + c.nx * (1 - C(a)) * -20, y: c.y - (1 - C(a)) * 16, s: L(.7, 1, C(a, 0, 1.2)), o: C(a * 2) * (1 - fetesOn) });
      c.pin.setAttribute('r', 8 * C(E.back(P(t, t0 - .05, t0 + .3)), 0, 1.4)); });
    hlAnim(A5H, t, 21.75, 23.95);
    { const a = E.o3(P(t, 22.4, 22.9)), o = P(t, 23.7, 24.0); tf($('a5sub'), { y: (1 - a) * 20, o: a * (1 - o) }); }
    // fêtes : index qui défile en rythme
    const idx = C(E.io5(P(t, 24.45, 24.75)) + E.io5(P(t, 25.05, 25.35)) + E.io5(P(t, 25.65, 25.95)), 0, 3);
    const out = E.iX(P(t, 26.0, 26.4));
    FETES.forEach((f, i) => { const d = i - idx, act = 1 - C(Math.abs(d));
      f.classList.toggle('on', act > .5);
      tf(f, { y: 860 + d * 215 - (1 - fetesOn) * 120, s: L(.78, 1, act) * (1 - out * .3), o: fetesOn * L(.2, 1, act) * (1 - out), b: (1 - act) * 2.5 + out * 14 + (1 - fetesOn) * 10 }); });
    fetesKick.forEach((c, i) => { const a = E.o3(P(t, 24.0 + i * .012, 24.4 + i * .012)); tf(c, { y: (1 - a) * 18, o: a * (1 - out) }); });
    { const a = E.o3(P(t, 24.5, 25.1)); tf($('wolof'), { y: (1 - a) * 24, o: a * (1 - out) }); }
  }
  // ═════ ACTE 6 : signature (26,4 → 30)
  if (t >= 26.36) {
    const a = E.oX(P(t, 26.4, 27.4)); $('logo6').style.transform = `scale(${(L(1.3, 1, a) * (1 + .035 * P(t, 27.4, 30))).toFixed(4)})`;
    const mo = E.o3(P(t, 26.38, 26.7)); $('m6').style.opacity = mo; $('m6').style.transform = `translateY(${(1 - a) * 40}px)`;
    $('m6ring').setAttribute('stroke-dashoffset', 1 - E.io3(P(t, 26.45, 27.2)));
    $('n6r').setAttribute('width', 272 * E.io3(P(t, 26.85, 27.6)));
    tag6.forEach((c, i) => { const k = E.oX(P(t, 27.25 + i * .14, 28.05 + i * .14)); c.style.transform = `translateY(${((1 - k) * 110).toFixed(2)}%)`; });
    sub6.forEach((c, i) => { const k = E.o3(P(t, 27.7 + i * .012, 28.1 + i * .012)); tf(c, { y: (1 - k) * 16, o: k }); });
    const ca = E.spring(P(t, 28.0, 29.0)); const pulse = t > 28.9 ? 1 + .022 * Math.max(0, Math.sin((t - 28.9) * 6)) : 1;
    $('cta').style.opacity = C(P(t, 28.0, 28.2)); $('cta').style.transform = `translateX(-50%) translateY(${((1 - C(ca)) * 60).toFixed(1)}px) scale(${(L(.6, 1, ca) * pulse).toFixed(4)})`;
    { const k = E.o3(P(t, 28.35, 28.9)); tf($('pay6'), { y: (1 - k) * 20, o: k }); }
    $('m6shine').setAttribute('x', L(-40, 120, E.io3(P(t, 28.7, 29.5))));
  }

  // ── particules d'ambiance
  const dark = t < 4.8 || (t >= 21.6 && t < 30) || (t >= 9.6 && t < 10.8);
  dust.forEach(p => { const y = ((p.y - t * p.sp) % 2100 + 2100) % 2100 - 90, tw = .35 + .65 * Math.abs(Math.sin(t * 1.25 + p.ph));
    if (p.bokeh) { tf(p.e, { x: p.x + Math.sin(t * .4 + p.ph) * 40 - p.d / 2, y, o: (dark ? .14 : .1) * tw }); return; }
    tf(p.e, { x: p.x + Math.sin(t * .7 + p.ph) * 18, y, r: t * 30 + p.ph * 50, s: p.s * tw, o: (dark ? .75 : .45) * tw }); });
  BP.forEach(p => { const k = (t - p.t0) / p.life; if (k <= 0 || k >= 1) { p.e.style.opacity = 0; return; } const tt = t - p.t0, dr = Math.exp(-tt * 2.4);
    tf(p.e, { x: p.x + p.vx * (1 - dr) / 2.4 - 15, y: p.y + p.vy * (1 - dr) / 2.4 + 80 * tt * tt - 15, r: p.rot + tt * 260, s: p.s * (1 - k * .6), o: Math.min(1, k * 8) * (1 - k) }); });
  CONV.forEach(p => { const k = E.iX(P(t, 25.9 + p.d, 26.42)); if (k <= 0 || k >= 1) { p.e.style.opacity = 0; return; }
    tf(p.e, { x: L(p.x, 540, k) - 15, y: L(p.y, 590, k) - 15, r: k * 400, s: p.s * (1 - k * .5), o: Math.min(1, k * 4) }); });

  // ── lumière : fuites aux coupes, flashs
  let lo = 0, lx = 0, ly = 0;
  for (const c of [4.8, 9.6, 14.4, 21.6, 26.4]) { const k = P(t, c - .35, c + .55); if (k > 0 && k < 1) { lo = Math.sin(k * Math.PI) * .45; lx = L(-300, 1400, k); ly = L(300, 1500, k); } }
  tf($('lk1'), { x: lx, y: ly, o: lo }); tf($('lk2'), { x: 1080 - lx * .8, y: 1920 - ly * .7, s: .7, o: lo * .7 });
  $('flash').style.opacity = Math.max(bell(t, 4.8, .12) * .55, bell(t, 26.42, .14) * .9);
  $('grain').style.transform = `translate(${-(Math.floor(t * 12) * 37) % 64}px,${-(Math.floor(t * 12) * 23) % 64}px)`;
};
window.ready = Promise.all([document.fonts.ready, loadImg(footUrl(0)), ...[...document.images].map(i => i.decode().catch(() => {}))]);
