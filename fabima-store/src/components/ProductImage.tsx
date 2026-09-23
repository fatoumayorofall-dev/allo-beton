import React, { useEffect, useRef, useState } from 'react';
import { BrandMark } from './Logo';

const TONES = [
  'from-[#fbe9e7] via-[#f5d5d6] to-[#e8b4b8]',
  'from-[#f8ecf2] via-[#ecd3e2] to-[#cfa9c6]',
  'from-[#fdf0ea] via-[#f6d9cc] to-[#e7b7a6]',
  'from-[#f6ecef] via-[#ead5dc] to-[#d4b0bd]',
];

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/**
 * Image produit. Si l'URL ne répond pas, affiche un visuel éditorial de remplacement
 * (dégradé ton sur ton + monogramme) plutôt qu'une image cassée.
 */
/** Tailles proposées au navigateur pour les photos Pexels : il choisit la plus légère adaptée à l'écran. */
const WIDTHS = [480, 720, 1080, 1440, 2000];
export function srcSetFor(src?: string): string | undefined {
  if (!src || !src.includes('images.pexels.com')) return undefined;
  const m = /[?&]w=(\d+)/.exec(src);
  if (!m) return undefined;
  const max = Number(m[1]);
  const widths = [...WIDTHS.filter(w => w < max), max];
  return widths.map(w => `${src.replace(/([?&]w=)\d+/, `$1${w}`)} ${w}w`).join(', ');
}

/**
 * `sizes` : largeur affichée (active le choix de résolution) ;
 * `priority` : image principale de la page (téléchargée en premier, jamais différée).
 */
export const ProductImage: React.FC<{ src?: string; alt: string; className?: string; label?: string; sizes?: string; priority?: boolean }> = ({ src, alt, className = '', label, sizes, priority }) => {
  const [failed, setFailed] = useState(false);
  // Apparition en fondu une fois la photo chargée (sauf photo principale et photos de survol)
  const fade = !priority && !className.includes('opacity-0');
  const [loaded, setLoaded] = useState(!fade);
  const img = useRef<HTMLImageElement>(null);
  useEffect(() => { setLoaded(!fade || !!(img.current?.complete && img.current.naturalWidth)); }, [src, fade]);
  if (!src || failed) {
    const tone = TONES[hash(src || alt || 'f') % TONES.length];
    const text = label ?? alt;
    return (
      <div role={alt ? 'img' : undefined} aria-label={alt || undefined}
        className={`relative overflow-hidden bg-gradient-to-br ${tone} ${className}`}>
        <BrandMark compact className="absolute -right-[8%] -bottom-[6%] h-[70%] w-auto opacity-[0.12] pointer-events-none" />
        <span aria-hidden className="absolute inset-4 border border-white/40" />
        {text && (
          <span aria-hidden className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <span className="font-script text-2xl text-ink/70 leading-none">Fabima</span>
            <span className="font-display italic text-lg sm:text-xl text-ink/75 leading-tight line-clamp-3">{text}</span>
          </span>
        )}
      </div>
    );
  }
  const srcSet = sizes ? srcSetFor(src) : undefined;
  return (
    <img ref={img} src={src} srcSet={srcSet} sizes={srcSet ? sizes : undefined} alt={alt}
      loading={priority ? 'eager' : 'lazy'} decoding={priority ? 'sync' : 'async'}
      {...(priority ? { fetchpriority: 'high' } : {})}
      onLoad={() => setLoaded(true)} onError={() => setFailed(true)}
      className={`object-cover ${fade ? (loaded ? 'animate-img-in' : 'opacity-0') : ''} ${className}`} />
  );
};
