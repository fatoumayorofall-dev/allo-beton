import React from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../utils/usePageTitle';

export const NotFound: React.FC = () => {
  usePageTitle('Page introuvable');
  return (
    <div className="max-w-xl mx-auto text-center py-40 px-5">
      <p className="font-display italic text-[9rem] leading-none text-gold-light">404</p>
      <h1 className="font-display text-5xl mt-6">Cette page s'est éclipsée</h1>
      <p className="text-ink/60 mt-4">Elle n'existe pas ou a été déplacée.</p>
      <Link to="/" className="btn-dark mt-10">Retour à l'accueil</Link>
    </div>
  );
};
