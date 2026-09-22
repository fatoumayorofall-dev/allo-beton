/**
 * Fabrique l'image d'un statut WhatsApp (1080 × 1920) pour une pièce :
 * photo en arche, nom, prix en grand, couleurs disponibles et lien court à taper.
 */
import type { Product } from '../data/types';
import { discountPercent, formatPrice } from './format';
import { displayLink } from './share';

const W = 1080;
const H = 1920;
const INK = '#3a1f2d';
const WINE = '#b03a64';
const GOLD = '#c48a82';
const GOLD_LIGHT = '#f0c9c1';

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // nécessaire pour pouvoir exporter le canvas
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
    setTimeout(() => resolve(null), 8000);
  });
}

function archPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const top = w / 2;
  ctx.beginPath();
  ctx.moveTo(x, y + top);
  ctx.arc(x + top, y + top, top, Math.PI, 0);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.closePath();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}

/** Dessine le statut et renvoie un fichier JPEG prêt à partager. */
export async function renderStatusImage(p: Product): Promise<Blob> {
  await Promise.all([
    document.fonts.load('400 120px "Pinyon Script"'),
    document.fonts.load('500 80px "Cormorant Garamond"'),
    document.fonts.load('700 100px Manrope'),
  ]).catch(() => {});

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Fond : crème rosée + halos pastel
  ctx.fillStyle = '#fdf7f5';
  ctx.fillRect(0, 0, W, H);
  for (const [x, y, r, c] of [[120, 260, 620, 'rgba(245,213,214,.85)'], [1000, 700, 520, 'rgba(185,150,184,.28)'], [540, 1900, 700, 'rgba(240,201,193,.7)']] as const) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, c);
    g.addColorStop(1, 'rgba(253,247,245,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // Logo
  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = '400 110px "Pinyon Script", cursive';
  ctx.fillText('Fabima', W / 2, 165);
  ctx.fillStyle = GOLD;
  ctx.font = '600 24px Manrope, sans-serif';
  ctx.fillText('✿  S T O R E  ✿', W / 2, 212);

  // Photo en arche
  const ax = 150, ay = 260, aw = 780, ah = 960;
  ctx.save();
  archPath(ctx, ax, ay, aw, ah, 48);
  ctx.clip();
  const g = ctx.createLinearGradient(ax, ay, ax + aw, ay + ah);
  g.addColorStop(0, '#fbe9e7');
  g.addColorStop(1, '#e8b4b8');
  ctx.fillStyle = g;
  ctx.fillRect(ax, ay, aw, ah);
  const img = p.images[0] ? await loadImage(p.images[0]) : null;
  if (img) {
    const scale = Math.max(aw / img.width, ah / img.height);
    const iw = img.width * scale, ih = img.height * scale;
    ctx.drawImage(img, ax + (aw - iw) / 2, ay + (ah - ih) / 2, iw, ih);
  } else {
    ctx.fillStyle = 'rgba(58,31,45,.55)';
    ctx.font = 'italic 500 64px "Cormorant Garamond", serif';
    wrap(ctx, p.name, aw - 140, 3).forEach((l, i, arr) => ctx.fillText(l, W / 2, ay + ah / 2 - (arr.length - 1) * 38 + i * 76));
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.7)';
  ctx.lineWidth = 3;
  archPath(ctx, ax + 22, ay + 22, aw - 44, ah - 44, 30);
  ctx.stroke();

  // Pastille promo / nouveauté
  const off = discountPercent(p.price, p.oldPrice);
  const badge = off ? `-${off}%` : p.isNew ? 'NOUVEAU' : '';
  if (badge) {
    ctx.font = '700 40px Manrope, sans-serif';
    const bw = ctx.measureText(badge).width + 64;
    ctx.fillStyle = off ? WINE : INK;
    roundRect(ctx, ax + aw - bw - 10, ay + ah - 110, bw, 76, 38);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(badge, ax + aw - 10 - bw / 2, ay + ah - 58);
  }

  // Nom
  ctx.fillStyle = INK;
  ctx.font = '500 70px "Cormorant Garamond", serif';
  const nameLines = wrap(ctx, p.name, 900, 2);
  nameLines.forEach((l, i) => ctx.fillText(l, W / 2, 1310 + i * 74));
  let y = 1310 + (nameLines.length - 1) * 74;

  // Prix
  y += 118;
  ctx.font = '800 112px Manrope, sans-serif';
  ctx.fillStyle = off ? WINE : INK;
  const price = formatPrice(p.price);
  ctx.fillText(price, W / 2, y);
  if (p.oldPrice) {
    y += 58;
    ctx.font = '500 44px Manrope, sans-serif';
    ctx.fillStyle = 'rgba(58,31,45,.45)';
    const old = formatPrice(p.oldPrice);
    ctx.fillText(old, W / 2, y);
    const ow = ctx.measureText(old).width;
    ctx.fillRect(W / 2 - ow / 2, y - 15, ow, 4);
  }

  // Couleurs
  if (p.colors.length) {
    y += 78;
    const n = Math.min(p.colors.length, 6), r = 30, gap = 22;
    const total = n * r * 2 + (n - 1) * gap;
    p.colors.slice(0, 6).forEach((c, i) => {
      const cx = W / 2 - total / 2 + r + i * (r * 2 + gap);
      ctx.beginPath();
      ctx.arc(cx, y, r, 0, Math.PI * 2);
      if (c.hex.startsWith('linear')) {
        const cg = ctx.createLinearGradient(cx - r, y - r, cx + r, y + r);
        cg.addColorStop(0, '#e0a526'); cg.addColorStop(0.5, '#b33a1f'); cg.addColorStop(1, '#1f5f8b');
        ctx.fillStyle = cg;
      } else ctx.fillStyle = c.hex;
      ctx.fill();
      ctx.strokeStyle = 'rgba(58,31,45,.18)';
      ctx.lineWidth = 3;
      ctx.stroke();
    });
    y += 72;
    ctx.font = '600 34px Manrope, sans-serif';
    ctx.fillStyle = 'rgba(58,31,45,.7)';
    ctx.fillText(p.colors.length > 1 ? `${p.colors.length} couleurs disponibles` : p.colors[0].name, W / 2, y);
  }

  // Bandeau lien
  const by = H - 230;
  ctx.fillStyle = INK;
  roundRect(ctx, 70, by, W - 140, 170, 85);
  ctx.fill();
  ctx.fillStyle = GOLD_LIGHT;
  ctx.font = '600 32px Manrope, sans-serif';
  ctx.fillText('👆 Voir toutes les photos et commander', W / 2, by + 62);
  ctx.fillStyle = '#fff';
  const link = displayLink(p);
  let size = 52;
  do { ctx.font = `700 ${size}px Manrope, sans-serif`; size -= 2; } while (ctx.measureText(link).width > W - 220 && size > 28);
  ctx.fillText(link, W / 2, by + 128);

  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('export impossible'))), 'image/jpeg', 0.92);
    } catch (err) {
      reject(err); // photo sans autorisation d'export (CORS) : l'appelant régénère sans photo
    }
  });
}

/** Variante sans photo, si le serveur d'images interdit l'export. */
export async function renderStatusImageSafe(p: Product): Promise<Blob> {
  try {
    return await renderStatusImage(p);
  } catch {
    return renderStatusImage({ ...p, images: [] });
  }
}
