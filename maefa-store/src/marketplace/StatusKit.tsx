import React, { useState } from 'react';
import { ImageDown, Loader2 } from 'lucide-react';
import { MP } from './config';

/**
 * Image prête pour le statut WhatsApp (1080 × 1920, le format des statuts) : la photo, le nom de l'article
 * ou de la boutique, son prix (ou « à négocier »), le lien court et un QR code. Les vendeuses et les clientes
 * la partagent : chaque statut amène des clientes, sans publicité payée.
 */
export interface StatusInput {
  photo: string | null;
  title: string;
  /** Prix, « Prix à négocier », ou une phrase pour une boutique */
  line: string;
  /** Petite ligne sous le titre (boutique, quartier) */
  small: string;
  link: string;
  color: string;
}

const W = 1080;
const H = 1920;
const SERIF = '"Bodoni Moda", Didot, Georgia, serif';
const SANS = 'Jost, Futura, system-ui, sans-serif';

const load = (src: string) =>
  new Promise<HTMLImageElement | null>(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

/** Coupe un texte en lignes qui tiennent dans la largeur (au plus `max` lignes, « … » sinon). */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, max: number) {
  const lines: string[] = [];
  let cur = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(next).width <= width || !cur) cur = next;
    else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  let last = kept[max - 1];
  while (last && ctx.measureText(`${last}…`).width > width) last = last.slice(0, -1);
  kept[max - 1] = `${last.trimEnd()}…`;
  return kept;
}

/** Coupe un lien (sans espaces) de préférence après « / » ou « . », sur 3 lignes au plus. */
function wrapLink(ctx: CanvasRenderingContext2D, link: string, width: number) {
  const lines: string[] = [];
  let rest = link;
  while (rest && lines.length < 3) {
    let n = rest.length;
    while (n > 1 && ctx.measureText(rest.slice(0, n)).width > width) n--;
    if (n < rest.length) {
      const cut = Math.max(rest.lastIndexOf('/', n - 1), rest.lastIndexOf('.', n - 1));
      if (cut > n / 2) n = cut + 1;
    }
    lines.push(rest.slice(0, n));
    rest = rest.slice(n);
  }
  return lines;
}

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function makeStatusImage(s: StatusInput): Promise<Blob> {
  await document.fonts?.ready.catch(() => {});
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = s.color;
  ctx.fillRect(0, 0, W, H);

  // Marque de la plateforme, en haut
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `600 34px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText(MP.name.toUpperCase().split('').join(' '), W / 2, 110);

  // Photo (recadrée pour remplir le cadre)
  const px = 80;
  const py = 160;
  const pw = W - 160;
  const ph = 1040;
  ctx.save();
  rounded(ctx, px, py, pw, ph, 48);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(px, py, pw, ph);
  const img = s.photo ? await load(s.photo) : null;
  if (img) {
    const k = Math.max(pw / img.width, ph / img.height);
    const w = img.width * k;
    const h = img.height * k;
    ctx.drawImage(img, px + (pw - w) / 2, py + (ph - h) / 2, w, h);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.font = `400 420px ${SERIF}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(s.title.trim()[0]?.toUpperCase() ?? '?', W / 2, py + ph / 2);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();

  // Carte blanche : titre, prix, boutique, lien et QR code
  const cy = 1150;
  rounded(ctx, px, cy, pw, H - cy - 80, 48);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.textAlign = 'left';
  const tx = px + 56;
  const tw = pw - 112;
  ctx.fillStyle = '#1c1917';
  ctx.font = `500 70px ${SERIF}`;
  let y = cy + 120;
  for (const l of wrap(ctx, s.title, tw, 2)) {
    ctx.fillText(l, tx, y);
    y += 82;
  }
  ctx.fillStyle = s.color;
  ctx.font = `700 54px ${SANS}`;
  for (const l of wrap(ctx, s.line, tw, 2)) {
    ctx.fillText(l, tx, y + 4);
    y += 64;
  }
  if (s.small) {
    ctx.fillStyle = 'rgba(28,25,23,0.6)';
    ctx.font = `400 38px ${SANS}`;
    ctx.fillText(wrap(ctx, s.small, tw, 1)[0], tx, y + 14);
  }

  const q = 250;
  const qx = px + pw - 56 - q;
  const qy = H - 80 - 56 - q;
  const QR = await import('qrcode');
  const qr = await load(await QR.toDataURL(s.link, { width: q * 2, margin: 0, color: { dark: '#1c1917' } }));
  if (qr) ctx.drawImage(qr, qx, qy, q, q);
  ctx.fillStyle = 'rgba(28,25,23,0.6)';
  ctx.font = `400 32px ${SANS}`;
  ctx.fillText('Commandez ici :', tx, qy + 48);
  ctx.fillStyle = '#1c1917';
  ctx.font = `600 36px ${SANS}`;
  let ly = qy + 100;
  for (const l of wrapLink(ctx, s.link.replace(/^https?:\/\//, ''), qx - tx - 30)) {
    ctx.fillText(l, tx, ly);
    ly += 46;
  }
  ctx.fillStyle = 'rgba(28,25,23,0.6)';
  ctx.font = `400 28px ${SANS}`;
  ctx.fillText('Paiement à la livraison', tx, qy + q - 4);

  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('image'))), 'image/jpeg', 0.9),
  );
}

/** Partage l'image (WhatsApp, Instagram…) quand le téléphone sait le faire ; sinon elle est téléchargée. */
export async function shareStatusImage(blob: Blob, filename: string, text: string) {
  const file = new File([blob], filename, { type: 'image/jpeg' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return 'partagee';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'annulee';
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  return 'telechargee';
}

/** Bouton « Image pour mon statut » */
export const StatusButton: React.FC<{
  make: () => StatusInput;
  filename: string;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  testId?: string;
  ariaLabel?: string;
}> = ({ make, filename, label = 'Image pour mon statut', className, style, testId, ariaLabel }) => {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setDone('');
          try {
            const input = make();
            const how = await shareStatusImage(
              await makeStatusImage(input),
              filename,
              `${input.title} · ${input.line}\n${input.link}`,
            );
            if (how === 'telechargee') setDone('Image enregistrée : mettez-la en statut WhatsApp.');
          } catch {
            setDone('Image impossible à créer sur ce téléphone.');
          }
          setBusy(false);
        }}
        className={
          className ??
          'h-10 px-4 rounded-full border border-ink/15 font-semibold text-sm inline-flex items-center gap-2'
        }
        style={style}
        aria-label={ariaLabel}
        data-testid={testId}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageDown className="w-4 h-4" />}
        {label && ` ${label}`}
      </button>
      {done && label && (
        <span className="mt-1 text-xs text-ink/65" role="status">
          {done}
        </span>
      )}
    </span>
  );
};
