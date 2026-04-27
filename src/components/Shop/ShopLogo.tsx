/**
 * ALLO BÉTON — LOGO PREMIUM
 * Monogramme "AB" architectural avec accent doré subtil
 * Design type blason / shield moderne, inspiré Holcim / Lafarge
 */

import React from 'react';

interface ShopLogoProps {
  size?: number;
  withText?: boolean;
  tagline?: string;
  onClick?: () => void;
  variant?: 'light' | 'dark';
  className?: string;
}

export const ShopLogo: React.FC<ShopLogoProps> = ({
  size = 44,
  withText = true,
  tagline = 'MATÉRIAUX BTP · DAKAR',
  onClick,
  variant = 'light',
  className = '',
}) => {
  const isLight = variant === 'light';
  const textMain = isLight ? '#0f172a' : '#ffffff';
  const textMuted = isLight ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.65)';
  const accentText = '#7c2d12';

  const Wrapper: any = onClick ? 'button' : 'div';

  return (
    <Wrapper
      onClick={onClick}
      className={`inline-flex items-center gap-3 group flex-shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={onClick ? { background: 'transparent', border: 'none', padding: 0 } : undefined}
    >
      {/* ─── SVG LOGO ─── */}
      <div
        className="relative flex-shrink-0 transition-transform duration-500 group-hover:scale-[1.04]"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 120 120"
          className="w-full h-full drop-shadow-md"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Allô Béton"
        >
          <defs>
            {/* Gradient principal — bleu marine profond type corporate */}
            <linearGradient id="logoMain" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c2d12" />
              <stop offset="55%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Accent doré — sobre, juste une touche */}
            <linearGradient id="logoAccent" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>

            {/* Shine overlay */}
            <linearGradient id="logoShine" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            {/* Shadow filter */}
            <filter id="logoShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.25" />
            </filter>

            {/* Grid pattern for depth */}
            <pattern id="logoGrid" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
              <path d="M 12 0 L 0 0 0 12" fill="none" stroke="#ffffff" strokeWidth="0.3" opacity="0.08" />
            </pattern>
          </defs>

          {/* ─── Shield / container arrondi ─── */}
          <rect
            x="6"
            y="6"
            width="108"
            height="108"
            rx="22"
            ry="22"
            fill="url(#logoMain)"
            filter="url(#logoShadow)"
          />

          {/* Grid pattern overlay (subtle architectural feel) */}
          <rect x="6" y="6" width="108" height="108" rx="22" ry="22" fill="url(#logoGrid)" />

          {/* Shine top highlight */}
          <rect x="6" y="6" width="108" height="54" rx="22" ry="22" fill="url(#logoShine)" />

          {/* ─── Monogramme "AB" — typographie custom ─── */}
          {/* A : triangle stylisé type chevron (construction, élévation) */}
          <g>
            {/* Jambages du A */}
            <path
              d="M 24 84 L 40 36 L 56 84 L 48 84 L 44 72 L 36 72 L 32 84 Z"
              fill="#ffffff"
            />
            {/* Barre horizontale du A */}
            <rect x="37" y="66" width="6" height="4" fill="#ffffff" />
          </g>

          {/* B : structure solide avec boucles arrondies */}
          <g>
            <path
              d="M 62 36 L 82 36 C 90 36 94 40 94 46 C 94 50 92 54 88 56 C 94 58 96 62 96 67 C 96 74 92 78 84 78 L 62 78 Z M 71 44 L 71 53 L 80 53 C 83 53 85 51 85 48 C 85 45 83 44 80 44 Z M 71 60 L 71 70 L 82 70 C 85 70 87 68 87 65 C 87 62 85 60 82 60 Z"
              fill="#ffffff"
              transform="translate(0, 0)"
            />
          </g>

          {/* ─── Accent doré : bande "fondation" en bas ─── */}
          <path
            d="M 6 90 L 114 90 L 114 92 Q 114 114 92 114 L 28 114 Q 6 114 6 92 Z"
            fill="url(#logoAccent)"
          />
          {/* Fine line sur la bande dorée pour séparation */}
          <rect x="6" y="90" width="108" height="1" fill="#ffffff" opacity="0.25" />

          {/* Petit carré doré en signature coin sup droit (niveau/repère) */}
          <g transform="translate(90, 14)">
            <rect x="0" y="0" width="14" height="14" rx="3" fill="url(#logoAccent)" />
            <rect x="0" y="0" width="14" height="4" rx="2" fill="#ffffff" opacity="0.35" />
            <circle cx="7" cy="9" r="1.5" fill="#ffffff" opacity="0.6" />
          </g>

          {/* Discrete dots decoratifs */}
          <circle cx="100" cy="52" r="1.2" fill="#ffffff" opacity="0.2" />
          <circle cx="16" cy="46" r="1.2" fill="#ffffff" opacity="0.15" />
        </svg>
      </div>

      {/* ─── TEXTE ─── */}
      {withText && (
        <div className="hidden sm:block text-left leading-tight">
          <p
            className="font-display font-black text-[19px] tracking-tight"
            style={{ color: textMain, fontFamily: "'Manrope', 'Inter', sans-serif" }}
          >
            Allô&nbsp;<span style={{ color: accentText }}>Béton</span>
          </p>
          <p
            className="text-[9.5px] font-bold tracking-[0.18em] uppercase mt-0.5"
            style={{ color: textMuted }}
          >
            {tagline}
          </p>
        </div>
      )}
    </Wrapper>
  );
};

export default ShopLogo;
