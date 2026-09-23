import React, { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkle } from './Decor';

/*
 * La « magie » Fabima : poussière d'or, étincelles et ciel étoilé.
 * - un seul calque <canvas> pour tout le site, qui ne dessine que lorsqu'il y a des étincelles à l'écran
 * - les étincelles sont prédessinées une fois (sprites), puis simplement posées : très léger, même sur petit téléphone
 * - rien ne bouge si la cliente a demandé moins d'animations (réglage du téléphone)
 */

const reducedMotion = () => typeof window === 'undefined' || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const STAR = 'M12 0c.6 5.6 2.8 9.4 12 12-9.2 2.6-11.4 6.4-12 12-.6-5.6-2.8-9.4-12-12C9.2 9.4 11.4 5.6 12 0z';
const HEART = 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z';
/** Or rose, or chaud, framboise poudrée, mauve : lisibles sur fond clair comme sur fond prune. */
const PALETTE = ['#c48a82', '#b77a6f', '#e0b25c', '#d98c9f', '#b996b8', '#f0c9c1'];
const SPRITE = 64;

type Kind = 'star' | 'dot' | 'heart' | 'bokeh';
type Sprite = HTMLCanvasElement;
const sprites = new Map<string, Sprite>();

/** Étincelle prédessinée : halo doux + forme nette au centre. */
function sprite(color: string, kind: Kind, light = false): Sprite {
  const key = `${color}|${kind}|${light}`;
  const hit = sprites.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = SPRITE;
  const g = c.getContext('2d')!;
  const m = SPRITE / 2;
  const halo = g.createRadialGradient(m, m, 0, m, m, m);
  if (kind === 'bokeh') {
    halo.addColorStop(0, `${color}cc`); halo.addColorStop(0.55, `${color}55`); halo.addColorStop(1, `${color}00`);
    g.fillStyle = halo; g.fillRect(0, 0, SPRITE, SPRITE);
    sprites.set(key, c);
    return c;
  }
  halo.addColorStop(0, `${color}${light ? 'aa' : '77'}`);
  halo.addColorStop(0.3, `${color}26`);
  halo.addColorStop(1, `${color}00`);
  g.fillStyle = halo;
  g.fillRect(0, 0, SPRITE, SPRITE);
  g.fillStyle = color;
  if (kind === 'dot') {
    g.beginPath(); g.arc(m, m, SPRITE * 0.11, 0, Math.PI * 2); g.fill();
  } else {
    const s = kind === 'heart' ? SPRITE * 0.62 : SPRITE * 0.86;
    g.translate(m - s / 2, m - s / 2 + (kind === 'heart' ? s * 0.04 : 0));
    g.scale(s / 24, s / 24);
    g.fill(new Path2D(kind === 'heart' ? HEART : STAR));
  }
  if (light) { // cœur lumineux au centre des étoiles (sur fond sombre et sur les photos)
    g.setTransform(1, 0, 0, 1, 0, 0);
    const core = g.createRadialGradient(m, m, 0, m, m, SPRITE * 0.12);
    core.addColorStop(0, '#fffaf6'); core.addColorStop(1, '#fffaf600');
    g.fillStyle = core; g.fillRect(0, 0, SPRITE, SPRITE);
  }
  sprites.set(key, c);
  return c;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  age: number; life: number; size: number;
  rot: number; vr: number; gravity: number; drag: number; phase: number;
  img: Sprite;
}

/* Le calque s'inscrit ici quand il est affiché ; sans lui, les appels ne font rien. */
let emit: ((ps: Particle[]) => void) | null = null;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

function makeParticle(x: number, y: number, o: Partial<Particle> & { kind?: Kind; color?: string } = {}): Particle {
  const kind = o.kind ?? (Math.random() < 0.7 ? 'star' : 'dot');
  return {
    x, y, vx: 0, vy: 0, age: 0, life: 900, size: 10, rot: rand(-0.4, 0.4), vr: rand(-0.04, 0.04), gravity: 0.03, drag: 0.94, phase: rand(0, 6.28),
    ...o,
    img: sprite(o.color ?? pick(PALETTE), kind),
  };
}

const centerOf = (target: Element | { x: number; y: number }) => {
  if (!(target instanceof Element)) return target;
  const r = target.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

/** Gerbe d'étincelles (ajout au panier, favori, inscription…). */
export function sparkleBurst(target: Element | { x: number; y: number } | null | undefined, opts: { count?: number; hearts?: boolean; power?: number } = {}) {
  if (!emit || !target || reducedMotion()) return;
  const { x, y } = centerOf(target);
  const { count = 14, hearts = false, power = 1 } = opts;
  emit(Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + rand(-0.3, 0.3);
    const speed = rand(2.2, 5.2) * power;
    const kind: Kind = hearts && i % 3 === 0 ? 'heart' : Math.random() < 0.72 ? 'star' : 'dot';
    return makeParticle(x, y, {
      kind, color: kind === 'heart' ? pick(['#b03a64', '#d98c9f', '#c48a82']) : undefined,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1.2,
      size: kind === 'heart' ? rand(15, 22) : kind === 'star' ? rand(13, 24) : rand(9, 14), life: rand(700, 1200), gravity: 0.07, drag: 0.92,
    });
  }));
}

/** Poussière laissée derrière un objet qui vole (la photo envoyée au panier). */
export function sparkleTrail(x: number, y: number) {
  if (!emit || reducedMotion()) return;
  emit([makeParticle(x + rand(-10, 10), y + rand(-10, 10), { vx: rand(-0.6, 0.6), vy: rand(-0.2, 0.8), size: rand(10, 18), life: rand(550, 900), gravity: 0.02 })]);
}

/** Pluie d'étoiles qui tombe doucement du haut de l'écran (commande confirmée). */
export function sparkleRain(count = 70) {
  if (!emit || reducedMotion()) return;
  const w = window.innerWidth, h = window.innerHeight;
  const wave = (n: number) => emit?.(Array.from({ length: n }, () => makeParticle(rand(0, w), rand(-60, -10), {
    kind: Math.random() < 0.8 ? 'star' : 'heart', vx: rand(-0.6, 0.6), vy: rand(2, 4.2), size: rand(12, 24),
    life: rand(2600, 4200) * Math.min(1.4, Math.max(0.8, h / 800)), gravity: 0.015, drag: 0.996, vr: rand(-0.04, 0.04),
    color: pick(['#c48a82', '#e0b25c', '#d98c9f', '#b996b8', '#b77a6f', '#b03a64']),
  })));
  [0, 380, 800, 1300].forEach((t, i) => setTimeout(() => wave(Math.round(count * [0.35, 0.3, 0.2, 0.15][i])), t));
}

/**
 * Calque unique des étincelles, par-dessus le site (sans jamais gêner les clics).
 * Sur ordinateur, une fine poussière d'or suit aussi le curseur.
 */
export const MagicLayer: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  const { pathname } = useLocation();
  const trail = useRef(true);
  trail.current = !pathname.startsWith('/admin');

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || reducedMotion()) return;
    let dpr = 1, raf = 0, last = 0;
    const ps: Particle[] = [];
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    };
    resize();

    const frame = (now: number) => {
      const dt = Math.min(3, (now - (last || now)) / 16.67 || 1);
      last = now;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.age += dt * 16.67;
        if (p.age >= p.life) { ps.splice(i, 1); continue; }
        const k = Math.pow(p.drag, dt);
        p.vx *= k; p.vy = p.vy * k + p.gravity * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        const t = p.age / p.life;
        // apparition rapide, extinction douce ; léger scintillement
        const alpha = (t < 0.12 ? t / 0.12 : 1 - Math.pow((t - 0.12) / 0.88, 1.6)) * (0.8 + 0.2 * Math.sin(p.age * 0.025 + p.phase));
        const s = (p.size / SPRITE) * dpr * (t < 0.15 ? 0.5 + t * 3.4 : 1 - (t - 0.15) * 0.45);
        const cos = Math.cos(p.rot) * s, sin = Math.sin(p.rot) * s;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.setTransform(cos, sin, -sin, cos, p.x * dpr, p.y * dpr);
        ctx.drawImage(p.img, -SPRITE / 2, -SPRITE / 2);
      }
      raf = ps.length ? requestAnimationFrame(frame) : 0;
      if (!raf) { last = 0; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); }
    };

    emit = add => {
      ps.push(...add);
      if (ps.length > 320) ps.splice(0, ps.length - 320);
      if (!raf) raf = requestAnimationFrame(frame);
    };

    // Poussière d'or au bout du curseur (souris uniquement)
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let lx = 0, ly = 0, lt = 0;
    const onMove = (e: PointerEvent) => {
      if (!trail.current || e.pointerType !== 'mouse') return;
      const d = Math.hypot(e.clientX - lx, e.clientY - ly);
      if (d < 22 || e.timeStamp - lt < 30) return;
      lx = e.clientX; ly = e.clientY; lt = e.timeStamp;
      emit?.([makeParticle(e.clientX + rand(-4, 4), e.clientY + rand(-4, 4), {
        vx: rand(-0.35, 0.35), vy: rand(-0.1, 0.5), size: rand(9, 16), life: rand(600, 950), gravity: 0.018, drag: 0.97,
        kind: Math.random() < 0.65 ? 'star' : 'dot',
      })]);
    };
    window.addEventListener('resize', resize);
    if (fine) window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      emit = null;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[98] w-full h-full print:hidden" />;
};

/**
 * Poussière d'or qui flotte dans une photo ou un fond (héros de l'accueil).
 * `tone="light"` : grains de lumière pour les photos ; `tone="gold"` : or rose pour les fonds clairs.
 * Elle s'arrête hors de l'écran et quand l'onglet est caché.
 */
export const GoldDust: React.FC<{ className?: string; tone?: 'light' | 'gold'; density?: number }> = ({ className = '', tone = 'light', density = 1 }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || reducedMotion()) return;
    const colors = tone === 'light' ? ['#fff4ec', '#f8e2da', '#f0c9c1', '#f6d9a8'] : ['#c48a82', '#e0b25c', '#d98c9f', '#b996b8'];
    let w = 0, h = 0, dpr = 1, raf = 0, last = 0, visible = false;
    type Mote = { x: number; y: number; r: number; vy: number; sway: number; phase: number; tw: number; img: Sprite; soft: boolean };
    let motes: Mote[] = [];
    const seed = () => {
      const n = Math.round(Math.min(46, Math.max(14, (w * h) / 9000)) * density);
      motes = Array.from({ length: n }, (_, i) => {
        const kind: Kind = i % 7 === 0 ? 'bokeh' : Math.random() < 0.34 ? 'star' : 'dot';
        return {
          x: Math.random() * w, y: Math.random() * h, r: kind === 'bokeh' ? rand(22, 46) : kind === 'star' ? rand(12, 22) : rand(5, 11),
          vy: kind === 'bokeh' ? rand(0.06, 0.16) : rand(0.12, 0.42), sway: rand(0.2, 0.7), phase: rand(0, 6.28), tw: rand(0.0012, 0.0032),
          img: sprite(pick(colors), kind, tone === 'light'), soft: kind === 'bokeh',
        };
      });
    };
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      seed();
    };
    const frame = (now: number) => {
      const dt = Math.min(3, (now - (last || now)) / 16.67 || 1);
      last = now;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const m of motes) {
        m.y -= m.vy * dt;
        m.x += Math.sin(now * 0.0006 + m.phase) * m.sway * 0.3 * dt;
        if (m.y < -m.r) { m.y = h + m.r; m.x = Math.random() * w; }
        const glow = 0.5 + 0.5 * Math.sin(now * m.tw + m.phase);
        const s = (m.r / SPRITE) * dpr * (0.75 + glow * 0.4);
        ctx.globalAlpha = m.soft ? 0.12 + glow * 0.22 : 0.25 + glow * 0.7;
        ctx.setTransform(s, 0, 0, s, m.x * dpr, m.y * dpr);
        ctx.drawImage(m.img, -SPRITE / 2, -SPRITE / 2);
      }
      raf = requestAnimationFrame(frame);
    };
    const run = () => {
      const on = visible && !document.hidden;
      if (on && !raf) { last = 0; raf = requestAnimationFrame(frame); }
      if (!on && raf) { cancelAnimationFrame(raf); raf = 0; }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; run(); });
    io.observe(canvas);
    document.addEventListener('visibilitychange', run);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', run); };
  }, [tone, density]);
  return <canvas ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 w-full h-full ${className}`} />;
};

/** Petit générateur pseudo-aléatoire : les étoiles restent au même endroit d'un affichage à l'autre. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Ciel étoilé en CSS (pied de page, bandeaux sombres, confirmation) : points de lumière qui scintillent,
 * quelques éclats à quatre branches et, si demandé, des étoiles filantes.
 */
export const Twinkles: React.FC<{ count?: number; seed?: number; className?: string; tone?: 'light' | 'gold'; shooting?: boolean }> = ({ count = 30, seed = 7, className = '', tone = 'light', shooting = false }) => {
  const stars = useMemo(() => {
    const r = seeded(seed);
    return Array.from({ length: count }, (_, i) => ({
      left: `${(r() * 100).toFixed(2)}%`, top: `${(r() * 100).toFixed(2)}%`,
      size: i % 5 === 0 ? 7 + r() * 6 : 1.5 + r() * 2.2,
      delay: `${(r() * 6).toFixed(2)}s`, duration: `${(2.6 + r() * 3.4).toFixed(2)}s`,
      sparkle: i % 5 === 0,
    }));
  }, [count, seed]);
  const color = tone === 'light' ? 'text-gold-light' : 'text-gold';
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {stars.map((s, i) => s.sparkle
        ? <Sparkle key={i} className={`absolute animate-twinkle ${color}`} style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: s.delay, animationDuration: s.duration }} />
        : <span key={i} className={`absolute rounded-full animate-twinkle ${tone === 'light' ? 'bg-ivory shadow-[0_0_6px_1px_rgba(240,201,193,.7)]' : 'bg-gold shadow-[0_0_6px_1px_rgba(196,138,130,.5)]'}`}
            style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: s.delay, animationDuration: s.duration }} />)}
      {shooting && (
        <>
          <span className="shooting-star" style={{ top: '14%', left: '8%' }} />
          <span className="shooting-star" style={{ top: '38%', left: '46%', animationDelay: '6.5s' }} />
        </>
      )}
    </div>
  );
};

/** Trois éclats qui scintillent autour d'un élément (titres, pastilles). */
export const SparkleTrio: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden>
    <Sparkle className="absolute -top-3 -right-5 w-4 h-4 animate-twinkle" />
    <Sparkle className="absolute top-1/3 -right-9 w-2.5 h-2.5 animate-twinkle" style={{ animationDelay: '1.2s' }} />
    <Sparkle className="absolute -bottom-1 -left-4 w-3 h-3 animate-twinkle" style={{ animationDelay: '2.1s' }} />
  </span>
);
