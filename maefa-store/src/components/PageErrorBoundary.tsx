import React from 'react';
import { RefreshCw } from 'lucide-react';
import { reloadForNewVersion } from '../utils/pwa';

/**
 * Filet de sécurité : si une page plante (ancienne version du site gardée par le téléphone,
 * connexion coupée pendant le chargement…), on recharge une fois automatiquement,
 * sinon on affiche un bouton « Recharger » au lieu d'une page blanche.
 */
export class PageErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error('Page :', error);
    if (/dynamically imported module|Importing a module script|Failed to fetch|Loading chunk/i.test(error.message))
      reloadForNewVersion();
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="min-h-[60vh] grid place-items-center px-6 text-center" role="alert">
        <div className="max-w-sm">
          <p className="font-display text-3xl">La page n'a pas pu s'afficher</p>
          <p className="text-sm text-ink/70 mt-3">
            La connexion a peut-être été coupée, ou le site vient d'être mis à jour. Rechargez pour voir les pièces.
          </p>
          <button onClick={() => window.location.reload()} className="btn-dark !h-12 !px-7 mt-6 inline-flex gap-2">
            <RefreshCw className="w-4 h-4" /> Recharger
          </button>
        </div>
      </div>
    );
  }
}
