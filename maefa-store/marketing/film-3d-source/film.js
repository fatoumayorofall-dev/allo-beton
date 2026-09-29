// Film Maefa 3D — 30 s, 1080×1920, même découpage que la musique (100 BPM : 1 temps = 0,6 s).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { MAT, makeLogo, makeBag, loadShoe, makePhone, makeArchFrame, makeDust, tex } from './assets.js';

// ───────── outils ─────────
const $ = id => document.getElementById(id);
const C = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const P = (t, a, b) => C((t - a) / (b - a));
const L = (a, b, x) => a + (b - a) * x;
const E = {
  o3: x => 1 - Math.pow(1 - x, 3), o5: x => 1 - Math.pow(1 - x, 5),
  oX: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x), iX: x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10),
  i3: x => x * x * x, io3: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  io5: x => x < .5 ? 16 * Math.pow(x, 5) : 1 - Math.pow(-2 * x + 2, 5) / 2,
  back: x => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
  spring: x => x <= 0 ? 0 : 1 - Math.exp(-5.5 * x) * Math.cos(11 * x),
};
const bell = (t, c, w) => Math.exp(-Math.pow((t - c) / w, 2));
function tf(el, o) {
  el.style.transform = `translate3d(${(o.x || 0).toFixed(2)}px,${(o.y || 0).toFixed(2)}px,0)` + (o.r ? ` rotate(${o.r}deg)` : '') + ` scale(${o.s === undefined ? 1 : o.s})`;
  if (o.o !== undefined) el.style.opacity = C(o.o);
  if (o.b !== undefined) el.style.filter = o.b > .05 ? `blur(${o.b.toFixed(2)}px)` : 'none';
}
const vis = (el, on) => { el.style.display = on ? '' : 'none'; };
let seed = 17; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
// trajectoire de caméra : Catmull-Rom dans le temps. keys = [t, px, py, pz, lx, ly, lz]
function track(keys, t, ease) {
  let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
  let u = C((t - k1[0]) / (k2[0] - k1[0])); if (ease && ease[i]) u = ease[i](u);
  const cr = (a, b, c, d) => .5 * ((2 * b) + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
  const v = [1, 2, 3, 4, 5, 6].map(j => cr(k0[j], k1[j], k2[j], k3[j]));
  return { p: new THREE.Vector3(v[0], v[1], v[2]), l: new THREE.Vector3(v[3], v[4], v[5]) };
}
function archShape(r, cy = 56, open = false) { const s = open ? new THREE.Path() : new THREE.Shape(); s.moveTo(-r, 0); s.lineTo(-r, cy); s.absarc(0, cy, r, Math.PI, 0, true); s.lineTo(r, 0); s.lineTo(-r, 0); return s; }
function planarUV(geo, x0, y0, w, h) { const p = geo.attributes.position, uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[i * 2] = (p.getX(i) - x0) / w; uv[i * 2 + 1] = (p.getY(i) - y0) / h; } geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return geo; }
function arcCurve(r, cy = 56, n = 90) { const pts = []; for (let k = 0; k <= 12; k++) pts.push(new THREE.Vector3(-r, cy * k / 12, 0)); for (let k = 1; k <= n; k++) { const a = Math.PI - Math.PI * k / n; pts.push(new THREE.Vector3(r * Math.cos(a), cy + r * Math.sin(a), 0)); } for (let k = 1; k <= 12; k++) pts.push(new THREE.Vector3(r, cy - cy * k / 12, 0)); return new THREE.CatmullRomCurve3(pts, false, 'centripetal'); }

// ───────── rendu ─────────
const R = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, preserveDrawingBuffer: true });
R.setPixelRatio(1); R.setSize(1080, 1920, false);
R.toneMapping = THREE.ACESFilmicToneMapping; R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
const env = new THREE.PMREMGenerator(R).fromScene(new RoomEnvironment(), .04).texture;
const cam = new THREE.PerspectiveCamera(30, 1080 / 1920, .03, 300);
function bgTex(inner, outer, cy = 400) { const c = document.createElement('canvas'); c.width = 540; c.height = 960; const g = c.getContext('2d'); const gr = g.createRadialGradient(270, cy, 20, 270, 480, 720); gr.addColorStop(0, inner); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, 540, 960); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function newScene(bg, fogColor, near, far) { const s = new THREE.Scene(); s.environment = env; s.background = bg; if (fogColor) s.fog = new THREE.Fog(fogColor, near, far); return s; }
function mirror(scene, color, op, rough) {
  const m = new Reflector(new THREE.PlaneGeometry(90, 90), { textureWidth: 540, textureHeight: 960, color: '#8a8a8a' }); m.rotation.x = -Math.PI / 2; scene.add(m);
  const f = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshPhysicalMaterial({ color, roughness: rough, transparent: true, opacity: op, clearcoat: 1 })); f.rotation.x = -Math.PI / 2; f.position.y = .003; f.receiveShadow = true; scene.add(f);
}
function spot(scene, pos, target, int, color = '#fff0e6', angle = .45, shadow = true) { const s = new THREE.SpotLight(color, int, 40, angle, .7, 1.6); s.position.set(...pos); s.target.position.set(...target); if (shadow) { s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -.0004; } scene.add(s, s.target); return s; }
function composer(scene, strength, thr, radius = .6) { const c = new EffectComposer(R); c.addPass(new RenderPass(scene, cam)); c.bloom = new UnrealBloomPass(new THREE.Vector2(540, 960), strength, radius, thr); c.addPass(c.bloom); c.addPass(new OutputPass()); return c; }

// ═════ S1 — la porte d'or (ouverture et final)
const S1 = newScene(bgTex('#3d1b2c', '#0b0407'), '#12070c', 9, 30);
const LOGO = await makeLogo(.04); S1.add(LOGO.grp);
const goldT = MAT.gold.clone(); goldT.transparent = true; LOGO.M.material = goldT; LOGO.par.material = goldT;
LOGO.grp.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
const ringCount = LOGO.ringF.geometry.index.count;
const portalRT = new THREE.WebGLRenderTarget(1080, 1920, { type: THREE.HalfFloatType });
const portal = new THREE.Mesh(new THREE.ShapeGeometry(archShape(28.6), 64), new THREE.ShaderMaterial({ uniforms: { tMap: { value: portalRT.texture }, uRes: { value: new THREE.Vector2(1080, 1920) } },
  vertexShader: 'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'uniform sampler2D tMap;uniform vec2 uRes;void main(){gl_FragColor=texture2D(tMap,gl_FragCoord.xy/uRes);}' }));
portal.position.z = -.45; portal.visible = false; LOGO.grp.add(portal);
mirror(S1, '#14070d', .8, .25);
const s1Key = spot(S1, [3, 5.5, 4.5], [0, 1.8, 0], 170, '#ffe6d8');
const s1Sweep = new THREE.PointLight('#ffe0d0', 0, 5, 1.5); S1.add(s1Sweep);
const s1Rim = new THREE.PointLight('#f09abb', 35, 12); s1Rim.position.set(-2.8, 3.2, -2.2); S1.add(s1Rim);
const dust1 = makeDust(600, [-6, 0, -8, 6, 7, 10], .045); S1.add(dust1);
const C1 = composer(S1, .42, .82);

// ═════ S2 — la galerie d'arches
const S2 = newScene(bgTex('#f6dfd8', '#b88c88'), '#e3c2bb', 10, 50);
for (let k = 0; k < 10; k++) { const a = makeArchFrame(.07); a.position.z = -3 - k * 5; a.castShadow = a.receiveShadow = true; S2.add(a); }
mirror(S2, '#d8b5ae', .74, .2);
for (let k = 0; k < 10; k++) { const l = new THREE.PointLight('#ffe6d8', 22, 9); l.position.set(0, 5.6, -5.5 - k * 5); S2.add(l); }
spot(S2, [4, 10, 6], [0, 0, -12], 260, '#fff0e6', .5); S2.add(new THREE.HemisphereLight('#fff6f0', '#d9aea8', .35));
const dust2 = makeDust(800, [-4, 0, -45, 4, 7, 3], .055); S2.add(dust2);
// écran-arche : la vraie vidéo des sandales
const SCR_Z = -16, SCR_S = .032, SCR_Y = .45;
const screenMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.35, 1.3, 1.28) });
const screen = new THREE.Mesh(planarUV(new THREE.ShapeGeometry(archShape(28), 64), -28, 0, 56, 84), screenMat);
screen.scale.setScalar(SCR_S); screen.position.set(0, SCR_Y, SCR_Z); S2.add(screen);
const scrFrame = new THREE.Mesh(new THREE.TubeGeometry(arcCurve(28.6), 300, .55, 12), MAT.gold); scrFrame.scale.setScalar(SCR_S); scrFrame.position.set(0, SCR_Y, SCR_Z + .01); S2.add(scrFrame);
const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.4, .45, 1.0), MAT.marble); plinth.position.set(0, .225, SCR_Z - .15); plinth.castShadow = plinth.receiveShadow = true; S2.add(plinth);
const scrBack = new THREE.Mesh(new THREE.ExtrudeGeometry(archShape(30.5), { depth: 3, bevelEnabled: true, bevelThickness: .5, bevelSize: .4, bevelSegments: 3, curveSegments: 64 }), MAT.plum); scrBack.scale.setScalar(SCR_S); scrBack.position.set(0, SCR_Y, SCR_Z - .3); S2.add(scrBack);
const C2 = composer(S2, .12, .95);

// ═════ S3 — le studio (basket, sac)
const S3 = newScene(bgTex('#f4ddd7', '#b08480'), '#d8b4ae', 8, 24);
const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.3, .32, 128), MAT.marble); ped.position.y = .16; ped.receiveShadow = ped.castShadow = true; S3.add(ped);
const pedRing = new THREE.Mesh(new THREE.TorusGeometry(1.275, .02, 12, 128), MAT.gold); pedRing.rotation.x = Math.PI / 2; pedRing.position.y = .32; S3.add(pedRing);
mirror(S3, '#d4b1ab', .8, .3);
spot(S3, [2.5, 6, 4], [0, .8, 0], 180, '#fff4ec'); const s3Rim = spot(S3, [-3, 4, -3], [0, .8, 0], 90, '#ffc9d6', .6, false);
const s3Sweep = new THREE.PointLight('#fff2ea', 0, 4, 1.5); S3.add(s3Sweep);
S3.add(new THREE.HemisphereLight('#fff6f0', '#e8c6c0', .25));
const SHOE = await loadShoe(); SHOE.grp.scale.setScalar(1.35); SHOE.grp.position.y = .32 + SHOE.grp.userData.size.y * 1.35 / 2; S3.add(SHOE.grp);
const BAG = makeBag('#1c1418'); BAG.scale.setScalar(.9); BAG.position.y = .32 + .075; S3.add(BAG);
BAG.traverse(o => { if (o.isMesh) o.castShadow = true; });
const dust3 = makeDust(300, [-3, 0, -3, 3, 4, 3], .035, '#fff0e8'); S3.add(dust3);
const C3 = composer(S3, .1, .96);

// ═════ S4 — la boutique dans le téléphone
const S4 = newScene(bgTex('#f7e4df', '#c09692'), '#e2c4bf', 9, 26);
mirror(S4, '#dcbcb6', .82, .3); spot(S4, [2, 5.5, 4.5], [0, 1.2, 0], 130, '#fff4ec'); spot(S4, [-3, 3.5, 2], [0, 1.2, 0], 50, '#ffd6de', .6, false);
S4.add(new THREE.HemisphereLight('#fff6f0', '#e8c6c0', .35));
const PH1 = makePhone([{ img: 'shots/boutique.png', h: 7200, tab: 'shots/boutique-tab.png' }]);
const PH2 = makePhone([{ img: 'shots/home.png', h: 7200, tab: 'shots/home-tab.png' }, { img: 'shots/produit.png', h: 7200, tab: 'shots/produit-tab.png' }]);
const PH3 = makePhone([{ img: 'shots/produit.png', h: 7200, tab: 'shots/produit-tab.png' }]);
[PH1, PH2, PH3].forEach(p => S4.add(p.grp));
const dust4 = makeDust(260, [-3, 0, -3, 3, 3.5, 3], .03, '#fff2ea'); S4.add(dust4);
async function cardTex(src, pad, radius, bg = '#fdf7f5', scale = 1) { // carte arrondie avec marge, rendue sur toile
  const img = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  const w = img.width * scale + pad * 2, h = img.height * scale + pad * 2, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, w, h, radius); g.fill(); g.save(); g.beginPath(); g.roundRect(0, 0, w, h, radius); g.clip(); g.drawImage(img, pad, pad, img.width * scale, img.height * scale); g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { t, w, h };
}
function shadowTex() { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'); g.filter = 'blur(18px)'; g.fillStyle = 'rgba(58,31,45,.55)'; g.beginPath(); g.roundRect(40, 34, 176, 60, 30); g.fill(); return new THREE.CanvasTexture(c); }
const SHT = shadowTex();
async function card3d(src, widthM, pad = 36, radius = 44, bg) {
  const { t, w, h } = await cardTex(src, pad, radius, bg); const hm = widthM * h / w;
  const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.PlaneGeometry(widthM, hm), new THREE.MeshBasicMaterial({ map: t, transparent: true, color: new THREE.Color(1.18, 1.16, 1.15) }));
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(widthM * 1.45, hm * 2.1), new THREE.MeshBasicMaterial({ map: SHT, transparent: true, depthWrite: false })); sh.position.set(.02, -.05, -.06);
  g.add(sh, m); g.userData.m = m; g.userData.sh = sh; S4.add(g); return g;
}
const UI = [
  { g: await card3d('el/price.png', .44, 40, 40), to: [-.36, 1.66, .34], a: 17.0 },
  { g: await card3d('el/add.png', .42, 0, 80, 'rgba(0,0,0,0)'), to: [.37, 1.04, .42], a: 17.12 },
  { g: await card3d('el/colors.png', .56, 30, 40), to: [-.33, .74, .3], a: 17.24 },
  { g: await card3d('el/whatsapp.png', .62, 0, 80, 'rgba(0,0,0,0)'), to: [.06, .44, .36], a: 17.36 },
];
const TILES = [
  { g: await card3d('el/pay-wave.png', .74, 0, 48, 'rgba(0,0,0,0)'), y: 1.58, a: 19.3 }, { g: await card3d('el/pay-om.png', .74, 0, 48, 'rgba(0,0,0,0)'), y: 1.38, a: 19.42 },
  { g: await card3d('el/pay-card.png', .74, 0, 48, 'rgba(0,0,0,0)'), y: 1.17, a: 19.54 }, { g: await card3d('el/pay-cash.png', .74, 0, 48, 'rgba(0,0,0,0)'), y: .94, a: 19.66 },
];
[...UI, ...TILES].forEach(u => u.g.visible = false);
const C4 = composer(S4, .1, .96);

// ═════ S5 — le Sénégal
const S5 = newScene(bgTex('#2a1020', '#07030a', 250), '#0b050a', 14, 34);
mirror(S5, '#0a0407', .9, .35); S5.add(new THREE.HemisphereLight('#6b3a52', '#0a0406', .12));
const RP = [[-1.9, 6.2], [-1.1, 4.5], [.7, 3.6], [1.5, 1.9], [.5, .4], [-1.3, -.9], [-1.25, -2.8], [.4, -4.1], [1.7, -5.7], [1.1, -7.6], [-.2, -9.2]];
const route = new THREE.CatmullRomCurve3(RP.map(([x, z]) => new THREE.Vector3(x * .72, .035, z * .72 - .6)), false, 'centripetal');
const routeMat = new THREE.MeshStandardMaterial({ color: '#e8a88f', emissive: '#e39a7f', emissiveIntensity: 1.35, roughness: .3 });
const routeMesh = new THREE.Mesh(new THREE.TubeGeometry(route, 700, .026, 10), routeMat); S5.add(routeMesh);
const routeCount = routeMesh.geometry.index.count;
const ghost = new THREE.Mesh(new THREE.TubeGeometry(route, 400, .008, 6), new THREE.MeshBasicMaterial({ color: '#8a4a5e', transparent: true, opacity: .5 })); S5.add(ghost);
const courier = new THREE.Mesh(new THREE.SphereGeometry(.075, 32, 16), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff4ec', emissiveIntensity: 1.8 })); S5.add(courier);
const courierLight = new THREE.PointLight('#ffd7c6', .8, 2, 2); S5.add(courierLight); S5.environmentIntensity = .07;
for (let i = 0; i < 9; i++) { const pts = []; const R0 = .8 + i * .75; for (let a = 0; a <= 96; a++) { const th = a / 96 * Math.PI * 2, r = R0 * (1 + .1 * Math.sin(3 * th + i) + .05 * Math.sin(7 * th - i * 1.7)); pts.push(new THREE.Vector3(Math.cos(th) * r * .95, .01, -1.6 + Math.sin(th) * r * 1.2)); }
  S5.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#c48a82', transparent: true, opacity: .22 - i * .018 }))); }
const CITY_NAMES = ['Plateau', 'Médina', 'Sacré-Cœur', 'Almadies', 'Parcelles', 'Pikine', 'Rufisque', 'Thiès', 'Touba', 'Saint-Louis'];
const beamTex = (() => { const c = document.createElement('canvas'); c.width = 8; c.height = 128; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, 'rgba(255,220,205,1)'); gr.addColorStop(1, 'rgba(255,220,205,0)'); g.fillStyle = gr; g.fillRect(0, 0, 8, 128); return new THREE.CanvasTexture(c); })();
const CITIES = CITY_NAMES.map((name, i) => { const f = .05 + i * .1, p = route.getPointAt(f);
  const pin = new THREE.Mesh(new THREE.SphereGeometry(.05, 24, 12), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#f7c9b9', emissiveIntensity: 1.6 })); pin.position.copy(p); S5.add(pin);
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(.07, 1.6), new THREE.MeshBasicMaterial({ map: beamTex, color: new THREE.Color(.9, .75, .7), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); beam.position.set(p.x, .8, p.z); S5.add(beam);
  const el = document.createElement('div'); el.className = 'city'; el.textContent = name; $('cities').appendChild(el);
  return { f, p, pin, beam, el, side: i % 2 ? 1 : -1 }; });
const dust5 = makeDust(260, [-5, .2, -8, 5, 3, 5], .05, '#ffd6c8'); S5.add(dust5);
const sky5 = makeDust(700, [-16, 16, -46, 16, 44, -6], 1.3, '#ffd6c8', 9); S5.add(sky5);
const C5 = composer(S5, .45, .82, .42);

// ───────── vidéo des sandales (images 60 i/s lues au ralenti ½) ─────────
const ftCache = new Map();
function footTex(t) {
  const url = `foot/${String(Math.round(C((t - 3.5) * 30, 0, 526)) + 1).padStart(4, '0')}.jpg`;
  if (!ftCache.has(url)) { ftCache.set(url, new Promise(res => new THREE.TextureLoader().load(url, x => { x.colorSpace = THREE.SRGBColorSpace; res(x); }, undefined, () => res(null))));
    if (ftCache.size > 10) { const k = ftCache.keys().next().value; const p = ftCache.get(k); ftCache.delete(k); p.then(x => x && x.dispose()); } }
  return ftCache.get(url);
}

// ───────── textes ─────────
function chars(el, text) { el.innerHTML = [...text].map(c => `<span class="c">${c === ' ' ? '&nbsp;' : c}</span>`).join(''); return [...el.querySelectorAll('.c')]; }
function masks(el, parts) { el.innerHTML = parts.map(p => `<span class="ln"><span class="in">${p}</span></span>`).join(' '); return [...el.querySelectorAll('.in')]; }
function headline(el, kick, lines) { el.innerHTML = `<div class="kick"></div><div class="ttl shadowTxt">${lines.map(l => `<span class="ln"><span class="in">${l}</span></span>`).join('')}</div>`; return { k: chars(el.querySelector('.kick'), kick), l: [...el.querySelectorAll('.ttl .in')], el }; }
function hlAnim(h, t, tin, tout) {
  const on = t > tin - .05 && t < tout + .05; vis(h.el, on); if (!on) return;
  h.k.forEach((c, i) => { const a = E.o3(P(t, tin + i * .012, tin + .4 + i * .012)), o = E.iX(P(t, tout - .45 + i * .006, tout - .1 + i * .006)); tf(c, { y: (1 - a) * 22 - o * 16, o: a * (1 - o) }); });
  h.l.forEach((l, i) => { const a = E.oX(P(t, tin + .1 + i * .09, tin + .95 + i * .09)), o = E.iX(P(t, tout - .5 + i * .06, tout - .05 + i * .06)); l.style.transform = `translateY(${((1 - a) * 110 - o * 110).toFixed(2)}%) rotate(${((1 - a) * 3).toFixed(2)}deg)`; });
}
const rise = (arr, t, t0, st, dur, out0, outDur, dir = 1) => arr.forEach((c, i) => { const a = E.oX(P(t, t0 + i * st, t0 + dur + i * st)), o = out0 ? E.iX(P(t, out0 + i * .04, out0 + outDur + i * .04)) : 0; c.style.transform = `translateY(${((1 - a) * 108 * dir - o * 108 * dir).toFixed(2)}%)`; });
const kickAnim = (arr, t, t0, out0) => arr.forEach((c, i) => { const a = E.o3(P(t, t0 + i * .014, t0 + .4 + i * .014)), o = out0 ? E.iX(P(t, out0 + i * .006, out0 + .35 + i * .006)) : 0; tf(c, { y: (1 - a) * 18 - o * 16, o: a * (1 - o) }); });
const nomSvg = await (await fetch('maefa-nom.svg')).text();
const nomClair = nomSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/#3a1f2d/g, '#fdf7f5').replace(/#8f544e/g, '#e9bcb1');
$('wm1g').innerHTML = nomClair; $('wm6g').innerHTML = nomClair;
const tag1 = chars($('tag1'), 'Chaussures & sacs · Dakar');
const a2kick = chars($('a2kick'), 'Collection automne 2026');
const belle = masks($('belle'), [...'Belle']);
const chaque = masks($('chaque'), ['à', 'chaque', 'pas']);
const noirKick = chars($('noirKick'), 'La pièce du moment');
const noir = masks($('noir'), ['Noir', '<i>&amp; or</i>']);
$('chip2').innerHTML = `<span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg></span>Sandales · cuir noir &amp; détails dorés`;
const PA = { idx: chars($('prodA').querySelector('.idx'), '01 — La basket'), name: masks($('prodA').querySelector('.name'), ['Sneakers']), k: chars($('priceA').querySelector('.k'), 'Confort & style'), v: masks($('priceA').querySelector('.v'), ['dès', '28 500', 'FCFA']) };
const PB = { idx: chars($('prodB').querySelector('.idx'), '02 — Le sac'), name: masks($('prodB').querySelector('.name'), ['Sac', '<i>Fatou</i>']), k: chars($('priceB').querySelector('.k'), 'Noir · Camel · Rose'), v: masks($('priceB').querySelector('.v'), ['45 000', 'FCFA']) };
const swB = [...$('priceB').querySelectorAll('.swatches span')];
const H41 = headline($('h41'), 'Boutique en ligne', ['Votre boutique,', '<i>dans la poche</i>']);
const H42 = headline($('h42'), 'En quelques secondes', ['Commandez', '<i>en un geste</i>']);
const H43 = headline($('h43'), 'Wave · Orange Money · à la livraison', ['Payez', '<i>comme vous voulez</i>']);
$('badge').innerHTML = `<span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg></span>+1 · ajouté au panier`;
const A5H = headline($('a5h'), 'Livraison', ['Partout', '<i>au Sénégal</i>']);
const FETES = ['Korité', 'Tabaski', 'Mariages', 'Baptêmes'].map(n => { const d = document.createElement('div'); d.className = 'fete'; d.textContent = n; $('fetes').appendChild(d); return d; });
const fetesKick = chars($('fetesKick'), 'Prête pour chaque fête');
const tag6 = masks($('tag6'), ['Belle', '<i>à chaque pas</i>']);
const sub6 = chars($('sub6'), 'Chaussures & sacs · Dakar');
{ const brand = await (await fetch('wa.txt')).text(); $('cta').innerHTML = `<svg viewBox="0 0 256 258">${brand}</svg>Commander sur WhatsApp`; }
{ const g = $('grain').getContext('2d'), im = g.createImageData(604, 1024); for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (rnd() - .5) * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); }
const proj = v => { const p = v.clone().project(cam); return [(p.x * .5 + .5) * 1080, (-p.y * .5 + .5) * 1920]; };

// ───────── caméras ─────────
const K1 = [[0, .7, 3.35, 2.3, 0, 3.25, 0], [1.4, .95, 2.65, 5.2, 0, 2.4, 0], [2.4, 1.1, 2.0, 9.8, 0, 1.85, 0], [3.4, .5, 1.8, 6.4, 0, 1.75, 0], [4.78, 0, 1.55, -.9, 0, 1.52, -8]];
const K2 = [[4.6, 0, 1.56, .3, 0, 1.52, -8], [4.8, 0, 1.58, -.9, 0, 1.6, -10], [7.2, .15, 1.8, -7.5, 0, 1.9, -16], [8.4, .8, 1.9, -10.5, 0, 1.9, -16], [9.6, 0, 1.83, -14.6, 0, 1.83, -16.5]];
const K4 = [[14.4, 1.0, 1.55, 7.6, 0, 1.3, 0], [16.6, -.8, 1.4, 6.9, 0, 1.3, 0], [17.4, .12, 1.4, 4.7, 0, 1.42, 0], [19.1, -.3, 1.45, 4.5, 0, 1.42, 0], [19.8, .15, 1.4, 4.9, .12, 1.42, 0], [21.6, .35, 1.45, 4.7, .12, 1.42, 0]];
const K6 = [[26.4, .25, 2.3, 5.5, 0, 1.7, 0], [27.6, .6, 2.7, 14.2, 0, .15, 0], [30, 1.0, 2.8, 15.6, 0, .2, 0]];

let prevScene = null;
window.DURATION = 30;
window.render = async function (t) {
  const ov = id => $(id);
  let scene, comp, exposure = 1;
  // ═════ 0 → 4,8 : la porte d'or ; 26,4 → 30 : la signature
  const inS1 = t < 4.78 || t >= 26.4;
  const through = t >= 3.5 && t < 4.78;
  if (inS1) {
    scene = S1; comp = C1; exposure = through ? L(1, .88, P(t, 3.5, 4.4)) : 1.0;
    const fin = t >= 26.4;
    const c = fin ? track(K6, t, [E.oX, E.io3]) : track(K1, t, [E.o3, E.o3, E.io3, E.iX]);
    cam.position.copy(c.p); cam.lookAt(c.l);
    LOGO.grp.rotation.y = fin ? L(-.25, -.12, P(t, 26.4, 30)) : L(-.5, -.12, E.io3(P(t, 0, 3.6)));
    const draw = fin ? E.io3(P(t, 26.4, 27.2)) : E.io3(P(t, .25, 1.9));
    LOGO.ringF.geometry.setDrawRange(0, Math.floor(ringCount * draw / 3) * 3); LOGO.ringB.geometry.setDrawRange(0, Math.floor(ringCount * draw / 3) * 3);
    const mz = fin ? 1 : E.o5(P(t, 1.3, 2.5)); LOGO.M.position.z = L(-2.2, .3, mz); LOGO.par.position.z = L(-1.4, .3, fin ? 1 : E.o5(P(t, 2.1, 2.9)));
    const mFade = fin ? 0 : E.io3(P(t, 3.75, 4.2)); goldT.opacity = 1 - mFade; LOGO.M.visible = goldT.opacity > .01; LOGO.par.visible = LOGO.M.visible;
    const dm = fin ? C(E.back(P(t, 26.9, 27.4)), 0, 1.3) : C(E.back(P(t, 1.75, 2.25)), 0, 1.3); LOGO.diam.scale.setScalar(Math.max(.001, dm));
    MAT.velvet.opacity = fin ? 1 : 1 - E.io3(P(t, 3.6, 4.15));
    portal.visible = through && t >= 3.55;
    // lumière qui balaie l'or
    const sw = fin ? P(t, 27.2, 29.2) : P(t, .9, 3.3); s1Sweep.intensity = 32 * Math.sin(sw * Math.PI); s1Sweep.position.set(L(-2.2, 2.2, sw), fin ? 2.2 : L(3.2, 1.6, sw), 1.3);
    s1Key.intensity = fin ? 170 : L(40, 170, E.io3(P(t, .2, 2.2)));
    dust1.userData.update(t);
    C1.bloom.strength = fin ? .42 + .5 * bell(t, 26.45, .25) : .42 + .5 * bell(t, 2.0, .2);
    if (portal.visible) { const f = await footTex(t); if (f && screenMat.map !== f) { screenMat.map = f; screenMat.needsUpdate = true; } dust2.userData.update(t); R.toneMappingExposure = .85; R.setRenderTarget(portalRT); R.render(S2, cam); R.setRenderTarget(null); }
  }
  // ═════ 4,8 → 9,6 : la galerie d'arches
  else if (t < 9.6) {
    scene = S2; comp = C2; exposure = .88;
    const c = track(K2, t, [E.o3, E.o3, E.io3, E.iX]); cam.position.copy(c.p); cam.lookAt(c.l);
    const f = await footTex(t); if (f && screenMat.map !== f) { screenMat.map = f; screenMat.needsUpdate = true; }
    dust2.userData.update(t);
  }
  // ═════ 9,6 → 14,4 : le studio
  else if (t < 14.4) {
    scene = S3; comp = C3; exposure = .84;
    const shoeOn = t < 12.0;
    SHOE.grp.visible = shoeOn; BAG.visible = !shoeOn;
    const whip = E.io5(P(t, 11.8, 12.2));
    const th = shoeOn ? L(-.5, .35, E.io3(P(t, 9.6, 11.8))) + whip * 1.6 : 1.6 + L(-1.6 + .2, .3, E.o3(P(t, 12.0, 14.4))) * .5 + (1 - whip) * -1.6 + 1.6 - 1.6;
    const rad = shoeOn ? L(4.6, 4.0, P(t, 9.6, 11.8)) : L(5.0, 4.5, E.io3(P(t, 12.0, 14.4)));
    const camH = shoeOn ? L(.5, 1.05, E.o3(P(t, 9.6, 10.8))) : L(1.75, 1.45, E.o3(P(t, 12.0, 13.0)));
    const ang = shoeOn ? th : L(-.35, .45, E.io3(P(t, 12.0, 14.4))) + (1 - E.o5(P(t, 12.0, 12.35))) * -1.4;
    cam.position.set(Math.sin(ang) * rad, camH, Math.cos(ang) * rad); cam.lookAt(0, shoeOn ? .66 : 1.12, 0);
    SHOE.grp.rotation.y = -1.05 + (t - 9.6) * .5;
    SHOE.setVariant(t < 10.8 ? 1 : 2);
    BAG.rotation.y = -.55 + (t - 12) * .28;
    const col = t < 12.6 ? '#1c1418' : t < 13.2 ? '#a8744c' : t < 13.8 ? '#d9969b' : '#1c1418'; BAG.userData.setColor(col);
    const flashC = Math.max(bell(t, 10.8, .08), bell(t, 12.6, .08), bell(t, 13.2, .08), bell(t, 13.8, .08));
    s3Sweep.intensity = 40 * flashC + 18 * Math.max(0, Math.sin((t - 9.6) * 1.3)); s3Sweep.position.set(Math.sin(t * 1.4) * 1.6, 1.8, 1.8);
    dust3.userData.update(t);
  }
  // ═════ 14,4 → 21,6 : la boutique
  else if (t < 21.6) {
    scene = S4; comp = C4; exposure = .86;
    const c = track(K4, t, [E.io3, E.io5, E.io3, E.io5, E.io3]); cam.position.copy(c.p); cam.lookAt(c.l);
    const focus = E.io5(P(t, 16.8, 17.45)), pay = E.io5(P(t, 19.1, 19.8));
    const enter = i => E.oX(P(t, 14.35 + i * .1, 15.6 + i * .1));
    const bob = i => Math.sin(t * 1.3 + i * 2) * .02;
    PH2.grp.position.set(L(0, -.42, pay), L(-2.6, 1.25, enter(0)) + bob(0), 0); PH2.grp.rotation.set(-.04, L(L(-.08, -.14, focus), .38, pay), .015);
    PH1.grp.position.set(-.68 - focus * 2.2, L(-2.6, 1.2, enter(1)) + bob(1), -.55); PH1.grp.rotation.set(-.04, .52, .02);
    PH3.grp.position.set(.68 + focus * 2.2, L(-2.6, 1.2, enter(2)) + bob(2), -.55); PH3.grp.rotation.set(-.04, -.52, -.02);
    PH1.screens[0].set(L(300, 1500, E.io3(P(t, 15.0, 16.8))));
    PH3.screens[0].set(L(600, 1800, E.io3(P(t, 15.0, 16.8))));
    const swp = E.io5(P(t, 16.85, 17.35));
    PH2.screens[0].set(L(0, 1600, E.io3(P(t, 15.0, 16.8))), -swp * .3, 1 - swp); PH2.screens[1].set(L(0, 700, E.io3(P(t, 17.4, 19.0))), (1 - swp) * .72, swp > 0 ? 1 : 0);
    UI.forEach((u, i) => { const a = E.spring(P(t, u.a, u.a + 1.1)), o = E.iX(P(t, 19.0 + i * .04, 19.4 + i * .04)); u.g.visible = t > u.a && o < 1;
      const from = new THREE.Vector3(PH2.grp.position.x, 1.25, .06), to = new THREE.Vector3(...u.to);
      u.g.position.lerpVectors(from, to, a); u.g.position.y += Math.sin((t - u.a) * 2.3 + i) * .012; u.g.position.z += o * 1.2;
      u.g.scale.setScalar(L(.4, 1, C(a)) * (i === 1 ? 1 - .06 * bell(t, 18.15, .07) : 1)); u.g.rotation.set(0, (1 - C(a)) * .6 * (i % 2 ? -1 : 1) + (cam.position.x - u.g.position.x) * .08, (1 - C(a)) * .1);
      u.g.userData.m.material.opacity = C(P(t, u.a, u.a + .15)) * (1 - o); u.g.userData.sh.material.opacity = u.g.userData.m.material.opacity; });
    TILES.forEach((u, i) => { const a = E.spring(P(t, u.a, u.a + 1.0)), sel = i === 0 ? E.o3(P(t, 20.15, 20.45)) : 0, dim = i ? E.o3(P(t, 20.25, 20.6)) : 0; u.g.visible = t > u.a;
      u.g.position.set(L(2.4, .4, a), u.y + Math.sin((t - u.a) * 2 + i) * .008, .34 + sel * .12); u.g.rotation.set(0, (1 - C(a)) * -.7 - .12, 0); u.g.scale.setScalar(1 + sel * .05 + .04 * bell(t, 20.18, .08));
      u.g.userData.m.material.opacity = C(P(t, u.a, u.a + .12)) * (1 - dim * .55); u.g.userData.sh.material.opacity = u.g.userData.m.material.opacity; });
    dust4.userData.update(t);
  }
  // ═════ 21,6 → 26,4 : le Sénégal
  else {
    scene = S5; comp = C5; exposure = 1.0;
    const rp = E.io3(P(t, 21.7, 23.8)), up = E.io3(P(t, 23.7, 24.6));
    routeMesh.geometry.setDrawRange(0, Math.floor(routeCount * rp / 3) * 3);
    const head = route.getPointAt(C(rp, .001, 1)), lag = route.getPointAt(C(rp - .06, 0, 1));
    courier.position.copy(head).setY(.08); courierLight.position.copy(head).setY(.35);
    const dolly = E.io3(P(t, 21.6, 23.9)); const camP = new THREE.Vector3(L(1.6, -1.2, dolly), 10.5 + up * 1.5, L(8.2, 7.2, dolly) - up * 2), look = new THREE.Vector3(L(.3, -.2, dolly), up * 11, -2.6 - up * 5);
    cam.position.copy(camP); cam.lookAt(look);
    CITIES.forEach(c => { const k = E.back(P(t, 21.7 + E.io3inv(c.f) * 2.1 - .02, 21.7 + E.io3inv(c.f) * 2.1 + .35)); c.pin.scale.setScalar(Math.max(.001, C(k, 0, 1.3))); c.beam.scale.y = Math.max(.001, C(k)); c.beam.position.y = .8 * C(k); c.beam.lookAt(cam.position.x, c.beam.position.y, cam.position.z); });
    dust5.userData.update(t); sky5.userData.update(t); sky5.visible = up > .01; sky5.material.opacity = up; C5.bloom.strength = .45 + up * .35;
  }
  R.toneMappingExposure = exposure;
  comp.render();

  // ═════ calques HTML
  // acte 1
  { const on = t < 4.2; vis(ov('wm1'), on); vis(ov('tag1'), on);
    if (on) { $('wm1r').setAttribute('width', 272 * E.io3(P(t, 2.7, 3.5))); const o = E.o3(P(t, 3.6, 4.0)); ov('wm1').style.opacity = 1 - o; kickAnim(tag1, t, 3.0, 3.6); } }
  // glint sur la clé de voûte
  { const g = Math.max(bell(t, 1.95, .2), bell(t, 27.1, .2)); vis(ov('glint'), g > .01); if (g > .01) { const [x, y] = proj(LOGO.diam.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 3.44, 0.1))); tf(ov('glint'), { x, y, r: 45 + t * 40, s: .3 + g * 1.2, o: g }); } }
  // acte 2
  { const on = t >= 4.8 && t < 9.2; ['a2kick', 'belle', 'chaque', 'noirKick', 'noir', 'chip2'].forEach(id => vis(ov(id), on));
    if (on) { kickAnim(a2kick, t, 5.0, 6.95); rise(belle, t, 4.9, .07, 1.0, 7.0, .45); rise(chaque, t, 5.45, .12, .9, 7.0, .35, -1);
      kickAnim(noirKick, t, 7.25, 8.45); rise(noir, t, 7.3, .12, .9, 8.45, .45);
      const a = E.spring(P(t, 7.6, 8.6)), o = E.iX(P(t, 8.45, 8.8)); tf(ov('chip2'), { x: 110 - (1 - C(a)) * 80, y: 1560 + (1 - C(a)) * 40 + Math.sin((t - 7.6) * 2.6) * 6, s: L(.7, 1, C(a)), o: C(P(t, 7.6, 7.9)) * (1 - o), b: (1 - C(P(t, 7.6, 7.9))) * 8 }); } }
  // acte 3
  { const onA = t >= 9.6 && t < 12.0, onB = t >= 12.0 && t < 14.4; ['prodA', 'priceA'].forEach(id => vis(ov(id), onA)); ['prodB', 'priceB'].forEach(id => vis(ov(id), onB));
    if (onA) { kickAnim(PA.idx, t, 9.7, 11.6); rise(PA.name, t, 9.75, .08, .9, 11.55, .35); kickAnim(PA.k, t, 10.2, 11.6); rise(PA.v, t, 10.3, .08, .8, 11.6, .3); }
    if (onB) { kickAnim(PB.idx, t, 12.1, 14.0); rise(PB.name, t, 12.15, .1, .9, 14.0, .35); kickAnim(PB.k, t, 12.5, 14.0); rise(PB.v, t, 12.55, .1, .8, 14.0, .3);
      const ci = t < 12.6 ? 0 : t < 13.2 ? 1 : t < 13.8 ? 2 : 0; swB.forEach((s, i) => { const a = E.back(P(t, 12.5 + i * .06, 12.9 + i * .06)); s.style.transform = `scale(${(C(a, 0, 1.2) * (i === ci ? 1.25 : 1)).toFixed(3)})`; s.style.boxShadow = i === ci ? '0 0 0 3px #fff,0 0 0 6px #b03a64' : ''; }); } }
  // acte 4
  hlAnim(H41, t, 14.5, 16.8); hlAnim(H42, t, 16.9, 19.15); hlAnim(H43, t, 19.25, 21.7);
  { const on = t >= 14.4 && t < 21.6; ['finger', 'rip', 'badge', 'check', 'merci'].forEach(id => vis(ov(id), on));
    if (on) { const addP = proj(UI[1].g.position), waveP = proj(TILES[0].g.position);
      const taps = [[18.15, ...addP], [20.15, ...waveP]]; let fo = 0, fx = 0, fy = 0, fs = 1, ro = 0, rx = 0, ry = 0, rs = 1;
      taps.forEach(([t0, x, y]) => { const k = P(t, t0 - .6, t0 + .5); if (k > 0 && k < 1) { const ar = E.o3(P(t, t0 - .6, t0 - .08)), lv = E.io3(P(t, t0 + .2, t0 + .5)), pr = P(t, t0 - .08, t0) * (1 - P(t, t0 + .04, t0 + .16));
          fo = Math.min(ar * 1.3, 1 - lv); fx = x + (1 - ar) * 240 + lv * 280; fy = y + (1 - ar) * 360 + lv * 400; fs = 1 - pr * .22; }
        const r = P(t, t0, t0 + .6); if (r > 0 && r < 1) { ro = 1 - r; rx = x; ry = y; rs = .3 + E.o3(r) * 1.2; } });
      tf(ov('finger'), { x: fx, y: fy, s: fs, o: fo }); tf(ov('rip'), { x: rx, y: ry, s: rs, o: ro });
      { const a = E.spring(P(t, 18.25, 19.2)), o = E.iX(P(t, 19.0, 19.3)); tf(ov('badge'), { x: 560, y: 520 - (1 - C(a)) * 60, s: L(.5, 1, C(a)), o: C(P(t, 18.25, 18.45)) * (1 - o) }); }
      { const a = E.back(P(t, 20.55, 21.0)); tf(ov('check'), { x: 150, y: 1500, s: C(a, 0, 1.2), o: C(P(t, 20.55, 20.7)) }); $('checkRing').setAttribute('stroke-dashoffset', 1 - E.io3(P(t, 20.6, 21.1))); $('checkTick').setAttribute('stroke-dashoffset', 1 - E.o3(P(t, 20.75, 21.05)));
        const m = E.spring(P(t, 20.8, 21.7)); tf(ov('merci'), { x: 330 + (1 - C(m)) * 60, y: 1530, s: L(.8, 1, C(m)), o: C(P(t, 20.8, 21.0)) }); } } }
  // acte 5
  { const on = t >= 21.6 && t < 26.45; ['a5sub', 'cities', 'fetesKick', 'fetes', 'wolof'].forEach(id => vis(ov(id), on)); hlAnim(A5H, t, 21.75, 23.9);
    if (on) { const fetesOn = E.io3(P(t, 23.85, 24.3));
      { const a = E.o3(P(t, 22.3, 22.8)), o = P(t, 23.6, 23.9); tf(ov('a5sub'), { y: (1 - a) * 20, o: a * (1 - o) }); }
      CITIES.forEach(c => { const k = E.back(P(t, 21.7 + E.io3inv(c.f) * 2.1, 21.7 + E.io3inv(c.f) * 2.1 + .4)); const [x, y] = proj(c.p.clone().setY(1.2 * C(k)));
        const w = c.el.offsetWidth; tf(c.el, { x: c.side > 0 ? x + 26 : x - w - 26, y: y - 24 - (1 - C(k)) * 14, s: L(.7, 1, C(k, 0, 1.2)), o: C(k * 2) * (1 - fetesOn) * (y > 480 ? 1 : C((y - 380) / 100)) }); });
      const idx = C(E.io5(P(t, 24.45, 24.75)) + E.io5(P(t, 25.05, 25.35)) + E.io5(P(t, 25.65, 25.95)), 0, 3), out = E.iX(P(t, 26.0, 26.4));
      FETES.forEach((f, i) => { const d = i - idx, act = 1 - C(Math.abs(d)); f.classList.toggle('on', act > .5); tf(f, { y: 860 + d * 215 - (1 - fetesOn) * 120, s: L(.78, 1, act) * (1 - out * .3), o: fetesOn * L(.2, 1, act) * (1 - out), b: (1 - act) * 2.5 + out * 14 + (1 - fetesOn) * 10 }); });
      kickAnim(fetesKick, t, 24.0, 25.95); { const a = E.o3(P(t, 24.5, 25.1)); tf(ov('wolof'), { y: (1 - a) * 24, o: a * (1 - out) }); } } }
  // acte 6
  { const on = t >= 26.4; ['wm6', 'tag6', 'sub6', 'cta', 'pay6', 'shade6'].forEach(id => vis(ov(id), on)); if (on) ov('shade6').style.opacity = E.o3(P(t, 26.6, 27.6));
    if (on) { $('wm6r').setAttribute('width', 272 * E.io3(P(t, 26.9, 27.6))); rise(tag6, t, 27.3, .14, .8); kickAnim(sub6, t, 27.75);
      const ca = E.spring(P(t, 28.0, 29.0)), pulse = t > 28.9 ? 1 + .022 * Math.max(0, Math.sin((t - 28.9) * 6)) : 1;
      ov('cta').style.opacity = C(P(t, 28.0, 28.2)); ov('cta').style.transform = `translateX(-50%) translateY(${((1 - C(ca)) * 60).toFixed(1)}px) scale(${(L(.6, 1, ca) * pulse).toFixed(4)})`;
      { const k = E.o3(P(t, 28.35, 28.9)); tf(ov('pay6'), { y: (1 - k) * 20, o: k }); } } }
  // lumière, flash, grain
  let lo = 0, lx = 0, ly = 0;
  for (const c of [4.78, 9.6, 12.0, 14.4, 21.6, 26.4]) { const k = P(t, c - .35, c + .55); if (k > 0 && k < 1) { lo = Math.sin(k * Math.PI) * .45; lx = L(-300, 1400, k); ly = L(300, 1500, k); } }
  tf($('lk1'), { x: lx, y: ly, o: lo }); tf($('lk2'), { x: 1080 - lx * .8, y: 1920 - ly * .7, s: .7, o: lo * .7 });
  $('flash').style.opacity = Math.max(bell(t, 4.78, .1) * .5, bell(t, 9.6, .08) * .45, bell(t, 21.6, .1) * .4, bell(t, 26.42, .14) * .85);
  $('grain').style.transform = `translate(${-(Math.floor(t * 12) * 37) % 64}px,${-(Math.floor(t * 12) * 23) % 64}px)`;
};
E.io3inv = y => y < .5 ? Math.cbrt(y / 4) : 1 - Math.cbrt((1 - y) * 2) / 2;
await Promise.all([document.fonts.ready, footTex(3.5), footTex(4.8)]);
for (const s of [0, 5, 10, 13, 16, 22, 27]) await window.render(s); // compile les shaders de chaque scène
window.ready = true;
