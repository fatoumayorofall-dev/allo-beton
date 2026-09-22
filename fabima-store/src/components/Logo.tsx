import React from 'react';
import { Link } from 'react-router-dom';

export const Logo: React.FC<{ light?: boolean }> = ({ light }) => (
  <Link to="/" className="flex items-center gap-2.5 group" aria-label="Fabima Store — accueil">
    <span className={`w-10 h-10 rounded-full grid place-items-center font-display italic text-2xl transition-transform group-hover:rotate-12 ${
      light ? 'bg-ivory text-ink' : 'bg-ink text-gold-light'}`}>F</span>
    <span className="leading-none">
      <span className={`block font-display text-xl tracking-wide ${light ? 'text-ivory' : 'text-ink'}`}>Fabima</span>
      <span className="block text-[10px] tracking-[0.35em] uppercase text-gold">Store</span>
    </span>
  </Link>
);
