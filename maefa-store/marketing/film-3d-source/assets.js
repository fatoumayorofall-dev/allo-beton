// Objets 3D du film Maefa (Three.js) : logo-porte en or, galerie d'arches, sac en cuir, basket, téléphones, particules.
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ───────── matériaux ─────────
export const MAT = {
  gold: new THREE.MeshPhysicalMaterial({ color: '#f3cbb8', metalness: 1, roughness: .2, clearcoat: .4, clearcoatRoughness: .15 }),
  goldSoft: new THREE.MeshPhysicalMaterial({ color: '#e9b9a4', metalness: 1, roughness: .32 }),
  plum: new THREE.MeshPhysicalMaterial({ color: '#2a0a1a', roughness: .5, sheen: .7, sheenColor: new THREE.Color('#6b2c48'), sheenRoughness: .5, clearcoat: .15 }),
  velvet: new THREE.MeshPhysicalMaterial({ color: '#230818', roughness: .75, sheen: 1, sheenColor: new THREE.Color('#6e3350'), sheenRoughness: .4, transparent: true }),
  stucco: new THREE.MeshStandardMaterial({ color: '#e7c9c1', roughness: .72 }),
  blush: new THREE.MeshPhysicalMaterial({ color: '#f1d3cf', roughness: .3, clearcoat: .6, clearcoatRoughness: .2 }),
  marble: new THREE.MeshPhysicalMaterial({ color: '#f7ece8', roughness: .12, clearcoat: 1, clearcoatRoughness: .05 }),
};

// normales procédurales (grain du cuir, stuc)
export function noiseNormal(size = 512, cells = 900, rMin = 2, rMax = 7, strength = 2.2, seed = 3) {
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, size, size);
  for (let i = 0; i < cells; i++) { const x = rnd() * size, y = rnd() * size, r = rMin + rnd() * (rMax - rMin), v = 100 + rnd() * 110;
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) { const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r); gr.addColorStop(0, `rgba(${v},${v},${v},.9)`); gr.addColorStop(1, 'rgba(128,128,128,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x + dx, y + dy, r, 0, 7); g.fill(); } }
  const h = g.getImageData(0, 0, size, size).data, out = g.createImageData(size, size), H = (x, y) => h[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength, l = Math.hypot(dx, dy, 1), i = (y * size + x) * 4;
    out.data[i] = (-dx / l * .5 + .5) * 255; out.data[i + 1] = (dy / l * .5 + .5) * 255; out.data[i + 2] = (1 / l * .5 + .5) * 255; out.data[i + 3] = 255; }
  g.putImageData(out, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
MAT.stucco.normalMap = noiseNormal(256, 500, 3, 12, 1.2, 9); MAT.stucco.normalMap.repeat.set(3, 3); MAT.stucco.normalScale.set(.35, .35);

// ───────── logo Maefa en volume : une porte en arche ─────────
function flipY(geo, dy) { // SVG (y vers le bas) → 3D (y vers le haut), en gardant les faces dans le bon sens
  geo.scale(1, -1, 1); geo.translate(0, dy, 0);
  for (const name of ['position', 'normal', 'uv']) { const a = geo.attributes[name]; if (!a) continue; const n = a.itemSize, arr = a.array;
    for (let i = 0; i < arr.length; i += 3 * n) for (let k = 0; k < n; k++) { const tmp = arr[i + n + k]; arr[i + n + k] = arr[i + 2 * n + k]; arr[i + 2 * n + k] = tmp; } }
  geo.computeVertexNormals(); return geo;
}
function archShape(r, cy = 56, open = false) { const s = open ? new THREE.Path() : new THREE.Shape(); s.moveTo(-r, 0); s.lineTo(-r, cy); s.absarc(0, cy, r, Math.PI, 0, true); s.lineTo(r, 0); s.lineTo(-r, 0); return s; }
export async function makeLogo(S = .04) {
  const svg = await (await fetch('maefa-monogramme.svg')).text();
  const ds = [...svg.matchAll(/<path d="([^"]+)"/g)].map(m => m[1]);
  const shapesOf = d => SVGLoader.createShapes(new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}" fill="#000"/></svg>`).paths[0]);
  const grp = new THREE.Group();
  const frameShape = archShape(32); frameShape.holes.push(archShape(28.4, 56, true));
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(frameShape, { depth: 6, bevelEnabled: true, bevelThickness: .8, bevelSize: .6, bevelSegments: 5, curveSegments: 96 }), MAT.plum);
  frame.position.z = -3; grp.add(frame);
  const panel = new THREE.Mesh(new THREE.ExtrudeGeometry(archShape(28.5), { depth: .6, bevelEnabled: false, curveSegments: 96 }), MAT.velvet);
  panel.position.z = -.3; grp.add(panel);
  const ringPts = [], rr = 28.4; for (let k = 0; k <= 12; k++) ringPts.push(new THREE.Vector3(-rr, 56 * k / 12, 0));
  for (let k = 1; k <= 90; k++) { const a = Math.PI - Math.PI * k / 90; ringPts.push(new THREE.Vector3(rr * Math.cos(a), 56 + rr * Math.sin(a), 0)); }
  for (let k = 1; k <= 12; k++) ringPts.push(new THREE.Vector3(rr, 56 - 56 * k / 12, 0));
  const ringCurve = new THREE.CatmullRomCurve3(ringPts, false, 'centripetal');
  const ringF = new THREE.Mesh(new THREE.TubeGeometry(ringCurve, 400, .75, 16), MAT.gold); ringF.position.z = 3.6; grp.add(ringF);
  const ringB = new THREE.Mesh(new THREE.TubeGeometry(ringCurve, 400, .75, 16), MAT.gold); ringB.position.z = -3.6; grp.add(ringB);
  const ext = (d, depth, bevel) => flipY(new THREE.ExtrudeGeometry(shapesOf(d), { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * .7, bevelSegments: 4, curveSegments: 40 }), 94);
  const M = new THREE.Mesh(ext(ds[3], 1.2, .35), MAT.gold); M.geometry.translate(-50, 0, 0); M.position.z = .3; grp.add(M);
  const par = new THREE.Mesh(ext(ds[4], .6, .2), MAT.gold); par.geometry.translate(-50, 0, 0); par.position.z = .3; grp.add(par);
  const diam = new THREE.Mesh(ext(ds[2], 1.6, .3), MAT.gold); diam.geometry.translate(-50, 1.6, 0); diam.position.z = 2.6; grp.add(diam);
  grp.scale.setScalar(S);
  return { grp, frame, panel, ringF, ringB, M, par, diam, ringCount: ringF.geometry.index ? ringF.geometry.index.count : ringF.geometry.attributes.position.count };
}

// ───────── galerie d'arches ─────────
export function makeArchFrame(S, mat = MAT.stucco, depth = 8) {
  const sh = archShape(32); sh.holes.push(archShape(26, 56, true));
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: .6, bevelSize: .5, bevelSegments: 3, curveSegments: 64 }), mat);
  m.geometry.translate(0, 0, -depth / 2); m.scale.setScalar(S); return m;
}

// ───────── sac à main en cuir (Sac à main Fatou) ─────────
const leatherN = noiseNormal(512, 2600, 1.5, 5, 3.2, 21);
export function makeBag(hex) {
  const leather = new THREE.MeshPhysicalMaterial({ color: hex, roughness: .48, clearcoat: .22, clearcoatRoughness: .3, sheen: .12, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: .9, envMapIntensity: .7, normalMap: leatherN, normalScale: new THREE.Vector2(1.1, 1.1) });
  leather.normalMap.repeat.set(2.5, 2.5);
  const g = new THREE.Group();
  // corps : trapèze aux coins arrondis, épaisseur avec arêtes adoucies
  const W0 = .72, W1 = .6, H = 1.0, R = .12;
  const s = new THREE.Shape(); s.moveTo(-W0 + R, 0); s.lineTo(W0 - R, 0); s.quadraticCurveTo(W0, 0, W0 - .01, R); s.lineTo(W1 + .01, H - R); s.quadraticCurveTo(W1, H, W1 - R, H); s.lineTo(-W1 + R, H); s.quadraticCurveTo(-W1, H, -W1 - .01, H - R); s.lineTo(-W0 + .01, R); s.quadraticCurveTo(-W0, 0, -W0 + R, 0);
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: .42, bevelEnabled: true, bevelThickness: .06, bevelSize: .06, bevelSegments: 8, curveSegments: 24 }), leather);
  body.geometry.translate(0, 0, -.21); body.castShadow = body.receiveShadow = true; g.add(body);
  // rabat
  const f = new THREE.Shape(); const fw = W1 + .04, fh = .52, fr = .16; f.moveTo(-fw, H); f.lineTo(fw, H); f.lineTo(fw + .02, H - fh + fr); f.quadraticCurveTo(fw + .02, H - fh, fw - fr, H - fh); f.lineTo(-fw + fr, H - fh); f.quadraticCurveTo(-fw - .02, H - fh, -fw - .02, H - fh + fr); f.lineTo(-fw, H);
  const flap = new THREE.Mesh(new THREE.ExtrudeGeometry(f, { depth: .025, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 4, curveSegments: 20 }), leather);
  flap.position.z = .28; flap.rotation.x = -.04; flap.castShadow = true; g.add(flap);
  // coutures du rabat
  const st = new THREE.Shape(); const sw = fw - .05, sh2 = fh - .05; st.moveTo(-sw, H - .02); st.lineTo(-sw, H - sh2 + fr); st.quadraticCurveTo(-sw, H - sh2, -sw + fr, H - sh2); st.lineTo(sw - fr, H - sh2); st.quadraticCurveTo(sw, H - sh2, sw, H - sh2 + fr); st.lineTo(sw, H - .02);
  const stPts = st.getSpacedPoints(160); const stitchMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).lerp(new THREE.Color('#fff4ec'), .55), roughness: .6 });
  const stitchGeo = new THREE.CapsuleGeometry(.0045, .016, 2, 6); stitchGeo.rotateZ(Math.PI / 2);
  const stitches = new THREE.InstancedMesh(stitchGeo, stitchMat, stPts.length - 1);
  for (let i = 0; i < stPts.length - 1; i++) { const a = stPts[i], b = stPts[i + 1], m = new THREE.Matrix4(); const ang = Math.atan2(b.y - a.y, b.x - a.x); m.makeRotationZ(ang); m.setPosition((a.x + b.x) / 2, (a.y + b.y) / 2, .315); stitches.setMatrixAt(i, m); }
  stitches.rotation.x = -.04; g.add(stitches);
  // fermoir doré
  const clasp = new THREE.Mesh(new RoundedBoxGeometry(.2, .13, .05, 4, .03), MAT.gold); clasp.position.set(0, H - fh + .02, .33); g.add(clasp);
  const claspIn = new THREE.Mesh(new RoundedBoxGeometry(.12, .06, .02, 3, .015), new THREE.MeshPhysicalMaterial({ color: hex, roughness: .45, clearcoat: .3 })); claspIn.position.set(0, H - fh + .02, .36); g.add(claspIn);
  // anse + anneaux
  const hc = new THREE.CatmullRomCurve3([new THREE.Vector3(-.36, H + .02, 0), new THREE.Vector3(-.34, H + .32, 0), new THREE.Vector3(0, H + .5, 0), new THREE.Vector3(.34, H + .32, 0), new THREE.Vector3(.36, H + .02, 0)]);
  const handle = new THREE.Mesh(new THREE.TubeGeometry(hc, 120, .032, 14), leather); handle.castShadow = true; g.add(handle);
  for (const x of [-.36, .36]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(.05, .012, 12, 32), MAT.gold); ring.position.set(x, H + .02, 0); g.add(ring); }
  // pieds dorés
  for (const x of [-.5, .5]) for (const z of [-.14, .14]) { const foot = new THREE.Mesh(new THREE.CylinderGeometry(.025, .03, .025, 20), MAT.gold); foot.position.set(x, -.06, z); g.add(foot); }
  g.userData.setColor = h => { leather.color.set(h); claspIn.material.color.set(h); stitchMat.color.set(new THREE.Color(h).lerp(new THREE.Color('#fff4ec'), .55)); };
  return g;
}

// ───────── basket (modèle Khronos, 3 coloris) ─────────
export async function loadShoe() {
  const gl = await new GLTFLoader().loadAsync('models/shoe.glb');
  const mats = await Promise.all([0, 1, 2].map(i => gl.parser.getDependency('material', i)));
  let mesh; gl.scene.traverse(o => { if (o.isMesh) { mesh = o; o.castShadow = true; o.receiveShadow = true; } });
  const box = new THREE.Box3().setFromObject(gl.scene), sz = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
  const inner = gl.scene; inner.position.sub(ctr); const grp = new THREE.Group(); const norm = new THREE.Group(); norm.scale.setScalar(1 / Math.max(sz.x, sz.z)); norm.add(inner); grp.add(norm);
  grp.userData.size = sz.clone().multiplyScalar(1 / Math.max(sz.x, sz.z));
  return { grp, setVariant: i => { mesh.material = mats[i]; } };
}

// ───────── téléphone ─────────
function roundedRectShape(w, h, r) { const s = new THREE.Shape(); s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); return s; }
function planarUV(geo, w, h) { const p = geo.attributes.position, uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) / w + .5; uv[i * 2 + 1] = p.getY(i) / h + .5; } geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return geo; }
const texCache = new Map();
export function tex(url) { if (!texCache.has(url)) { const t = new THREE.TextureLoader().load(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; texCache.set(url, t); } return texCache.get(url); }
export function makePhone(layers) { // layers : [{ img, h (hauteur en px de capture), tab }]
  const W = .76, H = 1.62, D = .085, SW = .712, SH = 1.544;
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 8, .1), new THREE.MeshPhysicalMaterial({ color: '#3a1f2d', metalness: .85, roughness: .28, clearcoat: .6 }));
  body.castShadow = true; g.add(body);
  const bezel = new THREE.Mesh(new THREE.ShapeGeometry(roundedRectShape(W - .02, H - .02, .09), 24), new THREE.MeshStandardMaterial({ color: '#0c0508', roughness: .4 })); bezel.position.z = D / 2 + .001; g.add(bezel);
  const screens = layers.map((L, i) => {
    const t = tex(L.img).clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    const geo = planarUV(new THREE.ShapeGeometry(roundedRectShape(SW, SH, .075), 24), SW, SH);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t, toneMapped: false, transparent: true }));
    m.position.z = D / 2 + .002 + i * .0005; g.add(m);
    let tab = null; if (L.tab) { const tt = tex(L.tab); const th = SW * 130 / 780; tab = new THREE.Mesh(planarUV(new THREE.PlaneGeometry(SW - .002, th), SW, th), new THREE.MeshBasicMaterial({ map: tt, toneMapped: false, transparent: true })); tab.position.set(0, -SH / 2 + th / 2 + .012, D / 2 + .0035 + i * .0005); g.add(tab); }
    const view = SH / SW * 780; // hauteur visible, en px de capture
    return { m, t, tab, H: L.h, view, set(scroll, x = 0, o = 1) { t.repeat.set(1, view / L.h); t.offset.set(0, 1 - (scroll + view) / L.h); m.position.x = x; m.material.opacity = o; if (tab) { tab.position.x = x; tab.material.opacity = o; } m.visible = o > .01 && Math.abs(x) < SW; if (tab) tab.visible = m.visible; } };
  });
  const notch = new THREE.Mesh(new THREE.ShapeGeometry(roundedRectShape(.17, .045, .022), 12), new THREE.MeshBasicMaterial({ color: '#050203' })); notch.position.set(0, SH / 2 - .045, D / 2 + .006); g.add(notch);
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(roundedRectShape(W - .02, H - .02, .09), 24), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .04, metalness: 0, transparent: true, opacity: .035, clearcoat: 1, envMapIntensity: 1 }));
  glass.position.z = D / 2 + .008; g.add(glass);
  return { grp: g, screens };
}

// ───────── particules dorées ─────────
export function makeDust(n, box, size = .05, color = '#ffd9c8', seed = 5) {
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,240,230,.8)'); gr.addColorStop(1, 'rgba(255,220,210,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const pos = new Float32Array(n * 3), base = [];
  for (let i = 0; i < n; i++) { const p = [box[0] + rnd() * (box[3] - box[0]), box[1] + rnd() * (box[4] - box[1]), box[2] + rnd() * (box[5] - box[2])]; base.push({ p, ph: rnd() * 6.28, sp: .05 + rnd() * .2 }); pos.set(p, i * 3); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size, map: new THREE.CanvasTexture(c), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  pts.userData.update = t => { for (let i = 0; i < n; i++) { const b = base[i]; pos[i * 3] = b.p[0] + Math.sin(t * .5 + b.ph) * .15; pos[i * 3 + 1] = b.p[1] + ((t * b.sp) % (box[4] - box[1])) ; if (pos[i * 3 + 1] > box[4]) pos[i * 3 + 1] -= box[4] - box[1]; pos[i * 3 + 2] = b.p[2] + Math.cos(t * .4 + b.ph) * .15; } geo.attributes.position.needsUpdate = true; };
  return pts;
}
