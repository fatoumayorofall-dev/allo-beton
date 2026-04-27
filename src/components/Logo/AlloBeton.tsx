/**
 * ALLO BÉTON - COMPOSANT LOGO
 * Logo professionnel avec variations (couleur, taille, type)
 */

import React from 'react';

interface LogoProps {
  variant?: 'full' | 'icon' | 'text';
  theme?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZES = {
  sm: { full: 'h-8', icon: 'h-8 w-8', text: 'text-base' },
  md: { full: 'h-12', icon: 'h-12 w-12', text: 'text-xl' },
  lg: { full: 'h-16', icon: 'h-16 w-16', text: 'text-2xl' },
  xl: { full: 'h-20', icon: 'h-20 w-20', text: 'text-4xl' },
};

export const AlloBeton: React.FC<LogoProps> = ({
  variant = 'full',
  theme = 'dark',
  size = 'md',
  className = '',
}) => {
  // Logo icône seule (cube 3D)
  if (variant === 'icon') {
    return (
      <div className={`${SIZES[size].icon} ${className}`}>
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <g transform="translate(5, 5)">
            <path d="M15 2 L28 9 L28 24 L15 31 L2 24 L2 9 Z" fill="url(#gradient1)" stroke="#B45309" strokeWidth="0.5"/>
            <path d="M15 2 L28 9 L28 24 L15 17 Z" fill="url(#gradient2)" opacity="0.9"/>
            <path d="M2 9 L15 2 L15 17 L2 24 Z" fill="url(#gradient3)" opacity="0.85"/>
            <circle cx="10" cy="14" r="1.5" fill="#FFFFFF" opacity="0.35"/>
            <circle cx="18" cy="12" r="1" fill="#FFFFFF" opacity="0.3"/>
            <circle cx="22" cy="16" r="1.2" fill="#FFFFFF" opacity="0.4"/>
            <path d="M15 2 L18 4 L18 8 L15 6 Z" fill="#FBBF24" opacity="0.7"/>
            <text x="15" y="20" fontFamily="Arial Black, sans-serif" fontSize="12" fontWeight="900" fill="#FFFFFF" textAnchor="middle" opacity="0.95">
              A
            </text>
          </g>
          <defs>
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#F59E0B', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#D97706', stopOpacity: 1 }} />
            </linearGradient>
            <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#D97706', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#B45309', stopOpacity: 1 }} />
            </linearGradient>
            <linearGradient id="gradient3" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#B45309', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#92400E', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  // Logo texte seul
  if (variant === 'text') {
    return (
      <div className={`font-black ${SIZES[size].text} ${className}`}>
        <span className={theme === 'dark' ? 'text-gray-900' : 'text-white'}>ALLO</span>
        <span className="text-amber-500"> BÉTON</span>
      </div>
    );
  }

  // Logo complet (icône + texte)
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Icône */}
      <div className={SIZES[size].icon}>
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <g transform="translate(5, 5)">
            <path d="M15 2 L28 9 L28 24 L15 31 L2 24 L2 9 Z" fill="url(#grad1)" stroke="#B45309" strokeWidth="0.5"/>
            <path d="M15 2 L28 9 L28 24 L15 17 Z" fill="url(#grad2)" opacity="0.9"/>
            <path d="M2 9 L15 2 L15 17 L2 24 Z" fill="url(#grad3)" opacity="0.85"/>
            <circle cx="10" cy="14" r="1.5" fill="#FFFFFF" opacity="0.35"/>
            <circle cx="18" cy="12" r="1" fill="#FFFFFF" opacity="0.3"/>
            <circle cx="22" cy="16" r="1.2" fill="#FFFFFF" opacity="0.4"/>
            <path d="M15 2 L18 4 L18 8 L15 6 Z" fill="#FBBF24" opacity="0.7"/>
            <text x="15" y="20" fontFamily="Arial Black, sans-serif" fontSize="12" fontWeight="900" fill="#FFFFFF" textAnchor="middle" opacity="0.95">
              A
            </text>
          </g>
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#F59E0B', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#D97706', stopOpacity: 1 }} />
            </linearGradient>
            <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#D97706', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#B45309', stopOpacity: 1 }} />
            </linearGradient>
            <linearGradient id="grad3" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#B45309', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#92400E', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Texte */}
      <div className="flex flex-col leading-none">
        <span className={`font-black tracking-tight ${size === 'sm' ? 'text-base' : size === 'md' ? 'text-xl' : size === 'lg' ? 'text-2xl' : 'text-3xl'} ${theme === 'dark' ? 'text-gray-900' : 'text-white'}`}>
          ALLO
        </span>
        <span className={`font-black tracking-tight ${size === 'sm' ? 'text-base' : size === 'md' ? 'text-xl' : size === 'lg' ? 'text-2xl' : 'text-3xl'} ${theme === 'dark' ? 'text-amber-500' : 'text-amber-400'}`}>
          BÉTON
        </span>
      </div>
    </div>
  );
};

export default AlloBeton;
