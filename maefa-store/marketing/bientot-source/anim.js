// Maefa — « Bientôt en ligne » : film 30 s, 1080×1920, calé sur la musique (100 BPM : 1 temps = 0,6 s, 1 mesure = 2,4 s).
// render(t) est déterministe : chaque image est calculée à partir du temps seul.
'use strict';
const DURATION = 30;
const $ = id => document.getElementById(id);
const C = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const P = (t, a, b) => C((t - a) / (b - a));
const L = (a, b, x) => a + (b - a) * x;
const E = {
  o3: x => 1 - Math.pow(1 - x, 3), o5: x => 1 - Math.pow(1 - x, 5),
  oX: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x), iX: x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10),
  i3: x => x * x * x,
  io3: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  io5: x => x < .5 ? 16 * Math.pow(x, 5) : 1 - Math.pow(-2 * x + 2, 5) / 2,
  back: x => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
  spring: x => x <= 0 ? 0 : 1 - Math.exp(-5.5 * x) * Math.cos(11 * x),
};
const bell = (t, c, w) => Math.exp(-Math.pow((t - c) / w, 2));
function tf(el, o) {
  el.style.transform = `translate3d(${(o.x || 0).toFixed(2)}px,${(o.y || 0).toFixed(2)}px,0)` + (o.r ? ` rotate(${o.r.toFixed(3)}deg)` : '') + ` scale(${(o.s === undefined ? 1 : o.s).toFixed(4)})` + (o.sx !== undefined ? ` scaleX(${o.sx.toFixed(4)})` : '');
  if (o.o !== undefined) el.style.opacity = C(o.o).toFixed(3);
  if (o.b !== undefined) el.style.filter = o.b > .05 ? `blur(${o.b.toFixed(2)}px)` : 'none';
}
const show = (el, v) => { el.style.display = v ? 'block' : 'none'; return v; };
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ───────── textes ─────────
function chars(el, text) { el.innerHTML = [...text].map(c => `<span class="c">${c === ' ' ? '&nbsp;' : c}</span>`).join(''); return [...el.querySelectorAll('.c')]; }
function letterMasks(el, text) {
  el.innerHTML = [...text].map(c => `<span class="ln"><span class="in">${c === ' ' ? '&nbsp;' : c}</span></span>`).join('');
  return [...el.querySelectorAll('.in')];
}
function kickIn(cs, t, tin, tout = 99, step = .018) {
  cs.forEach((c, i) => {
    const a = E.o3(P(t, tin + i * step, tin + .45 + i * step)), o = E.iX(P(t, tout - .4 + i * .006, tout - .05 + i * .006));
    tf(c, { y: (1 - a) * 26 - o * 18, o: a * (1 - o), b: (1 - a) * 6 });
  });
}
const slideIn = (el, t, tin, dur = .7, tout = 99) => {
  const a = E.oX(P(t, tin, tin + dur)), o = E.iX(P(t, tout - .45, tout));
  el.style.transform = `translateY(${((1 - a) * 112 - o * 112).toFixed(2)}%) rotate(${((1 - a) * 4).toFixed(2)}deg)`;
};

// ───────── images des séquences vidéo (préchargées et décodées) ─────────
const SEQ_N = 48, cache = {};
function seqSrc(name, f) { return `seq/${name}/${String(((f % SEQ_N) + SEQ_N) % SEQ_N + 1).padStart(3, '0')}.jpg`; }
const pending = [];
function setSrc(img, src) { if (img.getAttribute('src') !== src) { img.setAttribute('src', src); pending.push(img.decode().catch(() => {})); } }

// ───────── poussière d'or ─────────
function makeDust(host, n, nb) {
  const out = [];
  for (let i = 0; i < n; i++) { const e = document.createElement('div'); e.className = 'sp'; host.appendChild(e); const z = rnd(); out.push({ e, x: rnd() * 1080, y: rnd() * 1920, s: .3 + z * .9, sp: 14 + z * 46, ph: rnd() * 6.28 }); }
  for (let i = 0; i < nb; i++) { const e = document.createElement('div'); e.className = 'bokeh'; const d = 110 + rnd() * 230; e.style.width = e.style.height = d + 'px'; host.appendChild(e); out.push({ e, bokeh: true, d, x: rnd() * 1080, y: rnd() * 1920, sp: 8 + rnd() * 18, ph: rnd() * 6.28 }); }
  return out;
}
function dustAt(list, t, amp = 1) {
  for (const d of list) {
    const y = ((d.y - d.sp * t) % 2100 + 2100) % 2100 - 90, x = d.x + Math.sin(t * .7 + d.ph) * 26;
    if (d.bokeh) tf(d.e, { x: x - d.d / 2, y: y - d.d / 2, o: amp * (.5 + .5 * Math.sin(t * .9 + d.ph)) });
    else tf(d.e, { x, y, s: d.s * (.7 + .5 * Math.sin(t * 3 + d.ph)), o: amp * (.35 + .65 * Math.abs(Math.sin(t * 1.7 + d.ph))) });
  }
}
const dust1 = makeDust($('dust1'), 34, 8), dust5 = makeDust($('dust5'), 40, 9);

// ───────── ACTE 1 : révélation (0 → 4,8) ─────────
const a1 = $('a1'), logo1 = $('logo1');
const archStroke = $('archStroke'), ring = $('ring'), archFill = $('archFill'), diam = $('diam'), par = $('par'), mclipR = $('mclipR'), nclipR = $('nclipR');
const LA = archStroke.getTotalLength(), LR = ring.getTotalLength();
archStroke.style.strokeDasharray = ring.style.strokeDasharray = '1000';
const tag1 = chars($('tag1'), 'Sacs & chaussures · Dakar');
const sheen = $('sheen').firstElementChild, glint1 = $('glint1');

function act1(t) {
  if (!show(a1, t < 4.95)) return;
  dustAt(dust1, t, C(t / 1.2));
  archStroke.style.strokeDashoffset = (1000 - LA * E.io3(P(t, .25, 1.9))).toFixed(2);
  archStroke.style.opacity = 1 - P(t, 2.2, 2.8) * .6;
  archFill.style.opacity = E.o3(P(t, 1.2, 2.2)).toFixed(3);
  ring.style.strokeDashoffset = (1000 - LR * E.io3(P(t, 1.5, 2.4))).toFixed(2);
  const h = 60 * E.o5(P(t, 1.8, 2.7));
  mclipR.setAttribute('y', (94 - h).toFixed(2)); mclipR.setAttribute('height', h.toFixed(2));
  const ds = E.spring(P(t, 2.3, 3.4));
  diam.setAttribute('transform', `translate(50 11.2) scale(${ds.toFixed(3)}) rotate(${((1 - ds) * 90).toFixed(1)}) translate(-50 -11.2)`);
  const pa = E.o5(P(t, 2.55, 3.2));
  par.setAttribute('transform', `translate(36.5 80) scale(${pa.toFixed(3)} 1) translate(-36.5 -80)`); par.style.opacity = pa;
  nclipR.setAttribute('width', (273 * E.io3(P(t, 2.75, 3.55))).toFixed(2));
  kickIn(tag1, t, 3.25);
  tf(sheen, { x: L(-260, 620, E.io3(P(t, 3.85, 4.45))) });
  const g = bell(t, 3.95, .32);
  tf(glint1, { x: 540, y: 565, s: .35 + g * .9, r: t * 40, o: g });
  // poussée dans l'arche → acte 2
  const z = E.iX(P(t, 4.45, 4.85));
  tf(logo1, { s: L(.96, 1, E.o3(P(t, 0, 4.4))) * (1 + z * 3.2), y: z * 120, b: z * 14 });
}

// ───────── ACTE 2 : teaser (4,8 → 9,6) ─────────
const a2 = $('a2');
const a2kick = chars($('a2kick'), 'Maefa · Dakar · 2026');
$('teaser').innerHTML = `<span class="row"><span class="ln"><span class="in">Quelque</span></span> <span class="ln"><span class="in">chose</span></span></span>`
  + `<span class="row"><span class="ln"><span class="in"><i>de beau</i></span></span></span><span class="row"><span class="ln"><span class="in">arrive.</span></span></span>`;
const TW = [...$('teaser').querySelectorAll('.in')], teaser = $('teaser');
const TW_T = [4.82, 5.12, 5.42, 6.02]; // sur les temps
const win = $('win'), winImg = $('winImg'), winLine = $('winLine'), winLineP = $('winLineP'), chipN = $('chipNdella');
const LW = winLineP.getTotalLength(); winLineP.style.strokeDasharray = 1000;
const WIN = { x: 240, y: 800, w: 600, h: 816 };
const FULL = { x: -330, y: -560, w: 1740, h: 2366 };
function box(el, b) { el.style.left = b.x.toFixed(1) + 'px'; el.style.top = b.y.toFixed(1) + 'px'; el.style.width = b.w.toFixed(1) + 'px'; el.style.height = b.h.toFixed(1) + 'px'; }
const lerpBox = (A, B, k) => ({ x: L(A.x, B.x, k), y: L(A.y, B.y, k), w: L(A.w, B.w, k), h: L(A.h, B.h, k) });
const ndellaFrame = t => Math.floor((t - 6.9) * 30 * .92);

function act2(t) {
  if (!show(a2, t > 4.72 && t < 9.7)) return;
  kickIn(a2kick, t, 4.95, 8.9);
  TW.forEach((w, i) => slideIn(w, t, TW_T[i], .55, 8.95 + i * .03));
  const up = E.io5(P(t, 6.75, 7.45));
  tf(teaser, { y: -330 * up, s: 1 - .3 * up });
  // l'arche s'ouvre sur le sac Ndella
  const open = E.io5(P(t, 7.05, 7.85)), grow = E.io5(P(t, 8.85, 9.6));
  const b0 = { x: 540, y: WIN.y + WIN.h, w: 0, h: 0 };
  let b = open < 1 ? { x: L(540 - 2, WIN.x, open), y: L(WIN.y + WIN.h - 4, WIN.y, open), w: L(4, WIN.w, open), h: L(4, WIN.h, open) } : WIN;
  if (grow > 0) b = lerpBox(WIN, FULL, grow);
  box(win, b); win.style.opacity = open > 0 ? 1 : 0;
  setSrc(winImg, seqSrc('sac-ndella-camel', Math.max(0, ndellaFrame(t))));
  tf(winImg, { s: 1.25 - .18 * E.o3(P(t, 7.05, 9.6)) });
  box(winLine, { x: WIN.x - 14, y: WIN.y - 14, w: WIN.w + 28, h: WIN.h + 28 });
  winLineP.style.strokeDashoffset = (1000 - LW * E.io3(P(t, 6.95, 7.75))).toFixed(2);
  winLine.style.opacity = 1 - P(t, 8.7, 9.0);
  const cp = E.back(P(t, 7.95, 8.5)), co = P(t, 8.75, 9.0);
  tf(chipN, { x: 540 - 305, y: 1680 + (1 - cp) * 70, s: .85 + .15 * cp, o: P(t, 7.95, 8.2) * (1 - co) });
}

// ───────── ACTE 3 : montage (9,6 → 19,2) ─────────
const a3 = $('a3');
const SHOTS = [...document.querySelectorAll('.shot')].map((el, i) => ({
  el, ts: 9.6 + i * 1.2, big: el.querySelector('.big'), frame: el.querySelector('.frame'), img: el.querySelector('.frame img'),
  ringP: el.querySelector('.ring path'), cap: el.querySelector('.cap'), bg: el.style.background,
  seq: (el.querySelector('.frame img').getAttribute('src').match(/^seq\/([^/]+)\//) || [])[1],
}));
SHOTS.forEach(s => {
  s.kick = chars(s.cap.querySelector('.kick'), s.cap.querySelector('.kick').textContent);
  const b = s.cap.querySelector('b'); b.innerHTML = `<span class="ln"><span class="in">${b.textContent}</span></span>`; s.name = b.querySelector('.in');
  s.bigL = letterMasks(s.big, s.big.textContent);
  s.LR = s.ringP.getTotalLength(); s.ringP.style.strokeDasharray = 1000;
});
const wipe = $('wipeA');
const NEXT_BG = [...SHOTS.slice(1).map(s => s.bg), '#1c0a14'];
function act3(t) {
  if (!show(a3, t > 9.55 && t < 19.5)) return;
  SHOTS.forEach((s, i) => {
    const te = s.ts + 1.2;
    if (!show(s.el, t >= s.ts - .001 && t < te + (i === 7 ? .3 : .001))) return;
    const k = t - s.ts;
    // grand mot en parallaxe, lettres révélées
    s.bigL.forEach((l, j) => { const a = E.oX(P(t, s.ts + j * .035, s.ts + .5 + j * .035)); l.style.transform = `translateY(${((1 - a) * 105).toFixed(1)}%)`; });
    tf(s.big, { x: L(140, -90, k / 1.5) });
    // cadre en arche : entrée douce (le 1er plan sort de l'arche plein écran de l'acte 2)
    let fs = 1 + .1 * (1 - E.o5(P(k, 0, .75))), fy = 50 * (1 - E.o5(P(k, 0, .75)));
    if (i === 0) { const g = E.io5(P(k, 0, .75)); fs = L(2.36, 1, g); fy = L(-352, 0, g); }
    tf(s.frame, { s: fs, y: fy });
    tf(s.img, { s: 1.14 - .1 * E.o3(P(k, 0, 1.3)) });
    if (s.seq) setSrc(s.img, seqSrc(s.seq, i === 0 ? ndellaFrame(t) : Math.floor(k * 30 * .92)));
    s.ringP.style.strokeDashoffset = (1000 - s.LR * E.io3(P(k, .08, .7))).toFixed(1);
    tf(s.el.querySelector('.ring'), { s: fs, y: fy, o: i === 0 ? P(k, .4, .7) : 1 });
    kickIn(s.kick, t, s.ts + .12, 99, .012);
    slideIn(s.name, t, s.ts + .2, .55);
  });
  // volet diagonal de la couleur du plan suivant, calé sur chaque changement de plan
  let shown = false;
  for (let i = 0; i < 8; i++) {
    const c = 9.6 + (i + 1) * 1.2, k = P(t, c - .3, c + .3);
    if (k > 0 && k < 1) {
      shown = true; wipe.style.background = NEXT_BG[i];
      wipe.style.boxShadow = '0 0 0 6px rgba(240,201,193,.55)';
      tf(wipe, { y: L(2300, -2500, E.io3(k)), r: -14 });
    }
  }
  show(wipe, shown);
}

// ───────── ACTE 4 : promesses (19,2 → 24) ─────────
const a4 = $('a4'), mosaic = $('mosaic');
const a4kick = chars($('a4kick'), 'La promesse Maefa');
const a4t = [...$('a4title').querySelectorAll('.in')];
const CARDS = [$('card1'), $('card2'), $('card3')], CARD_T = [20.0, 20.9, 21.8], CARD_Y = [930, 1180, 1430];
function act4(t) {
  if (!show(a4, t > 19.05 && t < 24.3)) return;
  a4.style.opacity = (1 - E.io3(P(t, 23.75, 24.2))).toFixed(3);
  const z = E.o5(P(t, 19.2, 20.2));
  tf(mosaic, { y: -85 * (t - 19.2), r: -9, s: L(1.3, 1.04, z) });
  kickIn(a4kick, t, 19.35, 23.4);
  a4t.forEach((l, i) => slideIn(l, t, 19.45 + i * .12, .6, 23.45 + i * .05));
  CARDS.forEach((c, i) => {
    const a = E.o5(P(t, CARD_T[i], CARD_T[i] + .6)), o = E.io3(P(t, 23.1 + i * .08, 23.6 + i * .08));
    tf(c, { x: (1 - a) * 160, y: CARD_Y[i] - o * 140, o: a * (1 - o), b: (1 - a) * 14 });
    tf(c.querySelector('.ic'), { s: E.back(P(t, CARD_T[i] + .15, CARD_T[i] + .6)) });
  });
}

// ───────── ACTE 5 : final (24 → 30) ─────────
const a5 = $('a5'), fin = $('fin');
const bientot = letterMasks($('bientot'), 'Bientôt');
const enligne = $('enligne').querySelector('.in');
const coming = chars($('coming'), 'Coming soon');
const soon = chars($('soon'), 'Bientôt en ligne · Coming soon');
const tag5 = chars($('tag5'), 'Sacs & chaussures · Dakar');
const mono5 = $('mono5'), nom5 = $('nom5'), cta = $('cta').firstElementChild, glint5 = $('glint5'), goldline = $('goldline');
function act5(t) {
  if (!show(a5, t > 23.8)) return;
  a5.style.opacity = E.io3(P(t, 23.8, 24.2)).toFixed(3);
  dustAt(dust5, t, .9);
  const out = E.io3(P(t, 26.05, 26.5));
  bientot.forEach((l, i) => { const a = E.oX(P(t, 24.05 + i * .07, 24.8 + i * .07)); l.style.transform = `translateY(${((1 - a) * 110 - out * 120).toFixed(1)}%)`; });
  slideIn(enligne, t, 24.65, .7, 26.45);
  kickIn(coming, t, 25.0, 26.4, .03);
  goldline.style.width = (760 * E.io3(P(t, 25.2, 26.2)) * (1 - out)).toFixed(1) + 'px';
  goldline.style.marginLeft = (-380 * E.io3(P(t, 25.2, 26.2)) * (1 - out)).toFixed(1) + 'px';
  // grand final sur le temps fort (26,4)
  const m = E.spring(P(t, 26.4, 27.5));
  tf(mono5, { s: .55 + .45 * m, y: (1 - E.o5(P(t, 26.4, 27.1))) * 60, o: P(t, 26.4, 26.6), b: (1 - P(t, 26.4, 26.8)) * 10 });
  nom5.style.clipPath = `inset(0 ${(100 - 100 * E.io3(P(t, 26.65, 27.35))).toFixed(1)}% 0 0)`;
  kickIn(soon, t, 27.0, 99, .014);
  const cp = E.back(P(t, 27.45, 28.05));
  tf(cta, { y: (1 - cp) * 90, s: .8 + .2 * cp, o: P(t, 27.45, 27.7) });
  kickIn(tag5, t, 27.9);
  tf(fin, { s: 1 + .035 * P(t, 26.4, 30) });
  const g = bell(t, 27.55, .35);
  tf(glint5, { x: 545, y: 440, s: .3 + g, r: t * 45, o: g });
}

// ───────── rendu ─────────
const flash = $('flash'), grain = $('grain');
function render(t) {
  pending.length = 0;
  act1(t); act2(t); act3(t); act4(t); act5(t);
  flash.style.opacity = C(bell(t, 4.8, .1) * .95 + bell(t, 26.4, .09) * .4).toFixed(3);
  const f = Math.floor(t * 30);
  grain.style.backgroundPosition = `${(f * 137) % 512}px ${(f * 251) % 512}px`;
  return Promise.all(pending);
}
window.DURATION = DURATION;
window.render = render;
// Préchargement des séquences et des polices
const pre = [];
for (const s of ['sac-ndella-camel', 'pochette-papillon-dore', 'tongs-anneau-dore-dore', 'mules-croisees-strass-noir-dore'])
  for (let f = 0; f < SEQ_N; f++) { const im = new Image(); im.src = seqSrc(s, f); pre.push(im.decode().catch(() => {})); cache[im.src] = im; }
window.ready = Promise.all([document.fonts.ready, ...pre, ...[...document.images].map(i => i.decode().catch(() => {}))]).then(() => render(0));
