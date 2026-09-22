import React from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../utils/usePageTitle';

export const NotFound: React.FC = () => {
  usePageTitle('Page introuvable');
  return (
    <div className="max-w-xl mx-auto text-center py-32 px-4">
      <p className="font-display text-8xl text-gold-light">404</p>
      <h1 className="font-display text-4xl mt-4">Cette page s'est éclipsée</h1>
      <p className="text-ink/60 mt-3">Elle n'existe pas ou a été déplacée.</p>
      <Link to="/" className="inline-block mt-8 px-7 py-3.5 rounded-full bg-ink text-ivory font-semibold">Retour à l'accueil</Link>
    </div>
  );
};
