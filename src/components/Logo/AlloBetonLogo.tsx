/**
 * ALLO BÉTON - LOGO PROFESSIONNEL PREMIUM
 * Design créatif et original avec effet 3D béton
 * Icône moderne avec dégradés et effets visuels sophistiqués
 */

import React from 'react';

interface LogoProps {
  variant?: 'full' | 'icon' | 'compact';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showSlogan?: boolean;
  theme?: 'light' | 'dark';
  className?: string;
  animated?: boolean;
}

// Tailles
const SIZES = {
  xs: { icon: 32, text: 'text-base', slogan: 'text-[7px]', gap: 'gap-2' },
  sm: { icon: 40, text: 'text-lg', slogan: 'text-[8px]', gap: 'gap-2.5' },
  md: { icon: 48, text: 'text-xl', slogan: 'text-[9px]', gap: 'gap-3' },
  lg: { icon: 56, text: 'text-2xl', slogan: 'text-[10px]', gap: 'gap-3.5' },
  xl: { icon: 64, text: 'text-3xl', slogan: 'text-xs', gap: 'gap-4' },
  '2xl': { icon: 80, text: 'text-4xl', slogan: 'text-sm', gap: 'gap-5' },
};

// Couleurs du thème
const COLORS = {
  primary: '#1a365d',      // Bleu marine profond
  primaryLight: '#2c5282', // Bleu marine clair
  accent: '#ed8936',       // Orange béton/construction
  accentLight: '#f6ad55',  // Orange clair
  accentDark: '#c05621',   // Orange foncé
  concrete: '#a0aec0',     // Gris béton
  concreteLight: '#cbd5e0',
  concreteDark: '#718096',
};

// Composant Icône Premium avec effet 3D béton
const LogoIconPremium: React.FC<{ size: number; animated?: boolean }> = ({ size, animated = false }) => (
  <div
    className={`relative ${animated ? 'group' : ''}`}
    style={{ width: size, height: size }}
  >
    <svg
      viewBox="0 0 100 100"
      className={`w-full h-full ${animated ? 'transition-transform duration-500 group-hover:scale-105' : ''}`}
    >
      <defs>
        {/* Dégradé principal bleu marine */}
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2c5282" />
          <stop offset="50%" stopColor="#1a365d" />
          <stop offset="100%" stopColor="#0f2744" />
        </linearGradient>

        {/* Dégradé orange accent */}
        <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f6ad55" />
          <stop offset="50%" stopColor="#ed8936" />
          <stop offset="100%" stopColor="#dd6b20" />
        </linearGradient>

        {/* Dégradé pour effet béton */}
        <linearGradient id="concreteGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#a0aec0" />
        </linearGradient>

        {/* Effet de brillance */}
        <linearGradient id="shineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.3" />
          <stop offset="50%" stopColor="white" stopOpacity="0.1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>

        {/* Ombre portée */}
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#1a365d" floodOpacity="0.3"/>
        </filter>

        {/* Effet de relief pour les lettres */}
        <filter id="letterShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="1" dy="2" stdDeviation="1" floodColor="#0f2744" floodOpacity="0.4"/>
        </filter>
      </defs>

      {/* Fond carré arrondi avec dégradé */}
      <rect
        x="4" y="4"
        width="92" height="92"
        rx="18" ry="18"
        fill="url(#bgGradient)"
        filter="url(#shadow)"
      />

      {/* Effet de brillance en haut à gauche */}
      <path
        d="M4 22 Q4 4 22 4 L78 4 Q96 4 96 22 L96 40 Q50 35 4 22 Z"
        fill="url(#shineGradient)"
        opacity="0.6"
      />

      {/* Bande décorative en bas - représente le béton coulé */}
      <rect
        x="4" y="75"
        width="92" height="21"
        rx="0" ry="0"
        fill="url(#accentGradient)"
        clipPath="inset(0 0 0 0 round 0 0 18px 18px)"
      />
      <rect
        x="4" y="75"
        width="92" height="4"
        fill="white"
        opacity="0.15"
      />

      {/* Lettre A - Style moderne avec effet 3D */}
      <g filter="url(#letterShadow)">
        <text
          x="18" y="68"
          fontFamily="'Poppins', 'Segoe UI', 'Arial Black', sans-serif"
          fontSize="52"
          fontWeight="800"
          fill="white"
          letterSpacing="-3"
        >
          A
        </text>
      </g>

      {/* Lettre B - Style moderne avec accent orange */}
      <g filter="url(#letterShadow)">
        <text
          x="50" y="68"
          fontFamily="'Poppins', 'Segoe UI', 'Arial Black', sans-serif"
          fontSize="52"
          fontWeight="800"
          fill="url(#accentGradient)"
          letterSpacing="-3"
        >
          B
        </text>
      </g>

      {/* Petit accent décoratif - cube de béton stylisé */}
      <g transform="translate(78, 8)">
        <rect x="0" y="0" width="12" height="12" rx="3" fill="url(#accentGradient)" opacity="0.9"/>
        <rect x="0" y="0" width="12" height="4" rx="2" fill="white" opacity="0.3"/>
      </g>

      {/* Points décoratifs effet texture béton */}
      <circle cx="85" cy="35" r="2" fill="white" opacity="0.15"/>
      <circle cx="12" cy="45" r="1.5" fill="white" opacity="0.1"/>
      <circle cx="88" cy="55" r="1" fill="white" opacity="0.12"/>

    </svg>
  </div>
);

// Composant Texte Premium
const LogoTextPremium: React.FC<{
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showSlogan: boolean;
  theme: 'light' | 'dark';
}> = ({ size, showSlogan, theme }) => {
  const s = SIZES[size];
  const textColor = theme === 'dark' ? 'text-white' : 'text-[#1a365d]';
  const sloganColor = theme === 'dark' ? 'text-gray-300' : 'text-[#4a5568]';

  return (
    <div className="flex flex-col justify-center">
      {/* Titre principal avec style premium */}
      <div className={`${s.text} font-extrabold tracking-tight leading-none flex items-baseline`}>
        <span className={textColor} style={{ fontFamily: "'Poppins', 'Segoe UI', sans-serif" }}>
          Allô
        </span>
        <span
          className="ml-1.5 bg-gradient-to-r from-[#ed8936] to-[#dd6b20] bg-clip-text text-transparent"
          style={{ fontFamily: "'Poppins', 'Segoe UI', sans-serif" }}
        >
          Béton
        </span>
      </div>

      {/* Slogan avec style élégant */}
      {showSlogan && (
        <div className={`${s.slogan} ${sloganColor} font-semibold tracking-[0.2em] uppercase mt-1 flex items-center`}>
          <span>BÉTON</span>
          <span className="mx-2 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#ed8936] to-[#dd6b20]"></span>
          <span>MORTIER</span>
          <span className="mx-2 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#ed8936] to-[#dd6b20]"></span>
          <span>LIVRAISON</span>
        </div>
      )}
    </div>
  );
};

// Composant Principal
export const AlloBetonLogo: React.FC<LogoProps> = ({
  variant = 'full',
  size = 'md',
  showSlogan = false,
  theme = 'light',
  className = '',
  animated = true,
}) => {
  const s = SIZES[size];

  // Icône seule
  if (variant === 'icon') {
    return (
      <div className={className}>
        <LogoIconPremium size={s.icon} animated={animated} />
      </div>
    );
  }

  // Version compacte
  if (variant === 'compact') {
    return (
      <div className={`flex items-center ${s.gap} ${className}`}>
        <LogoIconPremium size={s.icon} animated={animated} />
        <LogoTextPremium size={size} showSlogan={false} theme={theme} />
      </div>
    );
  }

  // Version complète
  return (
    <div className={`flex items-center ${s.gap} ${className}`}>
      <LogoIconPremium size={s.icon} animated={animated} />
      <LogoTextPremium size={size} showSlogan={showSlogan} theme={theme} />
    </div>
  );
};

export default AlloBetonLogo;

// Export de l'icône seule
export const AlloBetonIcon: React.FC<{
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  animated?: boolean;
}> = ({ size = 'md', className = '', animated = true }) => (
  <div className={className}>
    <LogoIconPremium size={SIZES[size].icon} animated={animated} />
  </div>
);

// Export du texte seul
export const AlloBetonText: React.FC<{
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showSlogan?: boolean;
  theme?: 'light' | 'dark';
  className?: string;
}> = ({ size = 'md', showSlogan = false, theme = 'light', className = '' }) => (
  <div className={className}>
    <LogoTextPremium size={size} showSlogan={showSlogan} theme={theme} />
  </div>
);
