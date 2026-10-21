import React from 'react';

/** Bloc gris qui « respire » pendant le chargement (au lieu d'un rond qui tourne sur une page vide) */
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-ink/[0.07] rounded-xl ${className}`} aria-hidden />
);
