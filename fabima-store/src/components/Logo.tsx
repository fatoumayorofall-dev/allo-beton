import React from 'react';
import { Link } from 'react-router-dom';

export const Logo: React.FC<{ light?: boolean; className?: string }> = ({ light, className = '' }) => (
  <Link to="/" className={`group flex flex-col items-center leading-none ${className}`} aria-label="Fabima Store — accueil">
    <span className={`font-display text-[28px] sm:text-[32px] tracking-[0.18em] uppercase transition-colors ${light ? 'text-ivory' : 'text-ink'}`}>
      Fabima
    </span>
    <span className={`mt-1 flex items-center gap-2 text-[8px] sm:text-[9px] tracking-[0.55em] uppercase ${light ? 'text-gold-light' : 'text-gold-dark'}`}>
      <span className="w-4 h-px bg-current" />Store<span className="w-4 h-px bg-current" />
    </span>
  </Link>
);
