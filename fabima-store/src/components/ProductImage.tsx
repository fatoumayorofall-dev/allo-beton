import React, { useState } from 'react';

const TONES = [
  'from-[#efe4d6] via-[#e6d3c0] to-[#d7bf9f]',
  'from-[#ece6df] via-[#ddd0c3] to-[#c9b7a4]',
  'from-[#f1e6de] via-[#e5cfc4] to-[#d1b2a3]',
  'from-[#e9e4da] via-[#d8cdb9] to-[#bfae90]',
];

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/**
 * Image produit. Si l'URL ne répond pas, affiche un visuel éditorial de remplacement
 * (dégradé ton sur ton + monogramme) plutôt qu'une image cassée.
 */
export const ProductImage: React.FC<{ src?: string; alt: string; className?: string; label?: string }> = ({ src, alt, className = '', label }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    const tone = TONES[hash(src || alt || 'f') % TONES.length];
    const text = label ?? alt;
    return (
      <div role={alt ? 'img' : undefined} aria-label={alt || undefined}
        className={`relative overflow-hidden bg-gradient-to-br ${tone} ${className}`}>
        <span aria-hidden className="absolute -right-[8%] -bottom-[18%] font-display italic text-[14rem] leading-none text-white/35 select-none">F</span>
        <span aria-hidden className="absolute inset-4 border border-white/40" />
        {text && (
          <span aria-hidden className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <span className="text-[9px] uppercase tracking-luxe text-ink/45">Fabima</span>
            <span className="font-display italic text-lg sm:text-xl text-ink/70 leading-tight line-clamp-3">{text}</span>
          </span>
        )}
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} className={`object-cover ${className}`} />;
};
