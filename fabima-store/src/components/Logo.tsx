import React from 'react';
import { Link } from 'react-router-dom';

export const Logo: React.FC<{ light?: boolean; className?: string }> = ({ light, className = '' }) => (
  <Link to="/" className={`group flex flex-col items-center leading-none ${className}`} aria-label="Fabima Store — accueil">
    <span className={`font-script text-[40px] sm:text-[46px] leading-[0.9] transition-colors ${light ? 'text-ivory' : 'text-ink'}`}>
      Fabima
    </span>
    <span className={`-mt-0.5 flex items-center gap-2 text-[8px] sm:text-[9px] tracking-[0.55em] uppercase ${light ? 'text-gold-light' : 'text-gold-dark'}`}>
      <span aria-hidden className="text-[8px] transition-transform duration-700 group-hover:rotate-180">✿</span>Store<span aria-hidden className="text-[8px] transition-transform duration-700 group-hover:-rotate-180">✿</span>
    </span>
  </Link>
);
