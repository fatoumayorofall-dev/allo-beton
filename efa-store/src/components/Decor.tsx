import React from 'react';

/** Petite fleur stylisée (5 pétales), utilisée comme ornement. */
export const Flower: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = '', style }) => (
  <svg viewBox="0 0 40 40" aria-hidden className={className} style={style} fill="currentColor">
    {[0, 72, 144, 216, 288].map(r => (
      <ellipse key={r} cx="20" cy="10.5" rx="6" ry="9.5" transform={`rotate(${r} 20 20)`} opacity=".85" />
    ))}
    <circle cx="20" cy="20" r="4.2" fill="#fdf7f5" />
  </svg>
);

/** Éclat à quatre branches. */
export const Sparkle: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = '', style }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={className} style={style} fill="currentColor">
    <path d="M12 0c.6 5.6 2.8 9.4 12 12-9.2 2.6-11.4 6.4-12 12-.6-5.6-2.8-9.4-12-12C9.2 9.4 11.4 5.6 12 0z" />
  </svg>
);

/** Séparateur : filet rose doré + fleur centrale. */
export const Flourish: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center justify-center gap-4 text-gold ${className}`} aria-hidden>
    <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/60" />
    <Flower className="w-4 h-4" />
    <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/60" />
  </div>
);

/** Constellation d'éclats et de fleurs flottant en arrière-plan d'une section. */
export const FloatingPetals: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
    <Flower className="absolute top-[12%] left-[6%] w-8 h-8 text-blush animate-floaty" />
    <Sparkle className="absolute top-[20%] right-[10%] w-4 h-4 text-gold animate-twinkle" />
    <Flower className="absolute bottom-[14%] right-[7%] w-10 h-10 text-mauve/40 animate-floaty" style={{ animationDelay: '1.5s' }} />
    <Sparkle className="absolute bottom-[22%] left-[14%] w-3 h-3 text-gold-dark animate-twinkle" style={{ animationDelay: '1s' }} />
    <Sparkle className="absolute top-[55%] left-[48%] w-2.5 h-2.5 text-gold animate-twinkle" style={{ animationDelay: '2s' }} />
  </div>
);
