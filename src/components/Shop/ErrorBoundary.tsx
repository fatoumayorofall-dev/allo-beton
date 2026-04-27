/**
 * ALLO BÉTON — Error Boundary + error reporting hook
 * En prod, envoie les erreurs vers Sentry (VITE_SENTRY_DSN)
 * Sinon, affiche un fallback gracieux
 */

import React, { Component, ErrorInfo, useEffect } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

let sentryLoaded = false;

/**
 * Charge Sentry dynamiquement (lazy, ne bloque pas le rendu)
 */
async function initSentry() {
  if (sentryLoaded || !SENTRY_DSN) return;
  sentryLoaded = true;
  try {
    const Sentry = await import(/* @vite-ignore */ 'https://browser.sentry-cdn.com/7.118.0/bundle.min.js' as any)
      .catch(() => null);
    // Si l'import dynamique ne fonctionne pas (CSP), fallback script tag
    if (!Sentry && typeof document !== 'undefined') {
      const s = document.createElement('script');
      s.src = `https://browser.sentry-cdn.com/7.118.0/bundle.min.js`;
      s.crossOrigin = 'anonymous';
      s.onload = () => {
        if ((window as any).Sentry) {
          (window as any).Sentry.init({
            dsn: SENTRY_DSN,
            environment: import.meta.env.MODE || 'production',
            tracesSampleRate: 0.2,
            replaysSessionSampleRate: 0.05,
          });
        }
      };
      document.head.appendChild(s);
    }
  } catch {
    // Sentry non critique — jamais casser l'app
  }
}

/**
 * Rapporte une erreur (vers Sentry si configuré, sinon console)
 */
export function reportError(error: Error, context?: Record<string, any>) {
  console.error('[ErrorReport]', error, context);
  try {
    if ((window as any).Sentry?.captureException) {
      (window as any).Sentry.captureException(error, {
        extra: context,
      });
    }
  } catch {
    // noop
  }
}

/**
 * Hook pour initialiser le monitoring une fois
 */
export function useErrorMonitoring() {
  useEffect(() => {
    initSentry();

    // Global error handler
    const onError = (event: ErrorEvent) => {
      reportError(event.error || new Error(event.message), {
        source: 'window.onerror',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));
      reportError(error, { source: 'unhandledrejection' });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
}

/**
 * Error Boundary — affiche un fallback au lieu d'un crash
 */
interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ShopErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, {
      source: 'ErrorBoundary',
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="font-display text-2xl font-black text-slate-900 mb-3">
              Oups, une erreur est survenue
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Nous avons rencontré un problème inattendu. Notre équipe en a été notifiée.
              Veuillez réessayer ou revenir à l'accueil.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-3 rounded-xl text-sm transition-all shadow-lg shadow-orange-600/25"
              >
                <RefreshCw className="w-4 h-4" />
                Recharger la page
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: undefined });
                  window.location.hash = '';
                  window.location.search = '';
                }}
                className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-5 py-3 rounded-xl text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour accueil
              </button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-6 p-4 bg-slate-900 text-red-400 rounded-xl text-xs text-left overflow-auto max-h-48">
                {this.state.error.message}
                {'\n'}
                {this.state.error.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ShopErrorBoundary;
