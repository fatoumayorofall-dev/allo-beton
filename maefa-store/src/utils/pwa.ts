/**
 * Installation de Maefa sur l'écran d'accueil du téléphone (application web installable).
 * - Android / Chrome : on garde l'événement « beforeinstallprompt » pour proposer l'installation en un geste.
 * - iPhone / Safari : pas d'installation automatique, on montre les 3 gestes à faire.
 */
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

/** À appeler au démarrage de l'application (avant l'affichage). */
export function setupPwa() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    try {
      localStorage.setItem('maefa_installed', '1');
    } catch {
      /* ignore */
    }
    emit();
  });
  if (import.meta.env.PROD && import.meta.env.VITE_ROUTER !== 'hash' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }
  // Après une mise à jour du site, un onglet resté ouvert demande des fichiers qui n'existent plus :
  // on recharge la page une fois (au plus toutes les 30 s) pour prendre la nouvelle version.
  window.addEventListener('vite:preloadError', e => {
    e.preventDefault();
    reloadForNewVersion();
  });
}

/** Recharge la page pour obtenir la dernière version du site ; renvoie false si on vient déjà de le faire. */
export function reloadForNewVersion(): boolean {
  if (!navigator.onLine) return false; // hors ligne : recharger n'aiderait pas
  try {
    const last = Number(sessionStorage.getItem('maefa_reload_at') || 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem('maefa_reload_at', String(Date.now()));
  } catch {
    /* stockage indisponible : on recharge quand même */
  }
  window.location.reload();
  return true;
}

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const platform = (): 'ios' | 'android' | 'desktop' => {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
};

export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force(n => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  let installedBefore = false;
  try {
    installedBefore = localStorage.getItem('maefa_installed') === '1';
  } catch {
    /* ignore */
  }
  return {
    installed: isStandalone(),
    installedBefore,
    canPrompt: !!deferred,
    platform: platform(),
    /** Ouvre la fenêtre d'installation du navigateur. Renvoie false si elle n'est pas disponible. */
    promptInstall: async () => {
      if (!deferred) return false;
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      force(n => n + 1);
      return outcome === 'accepted';
    },
  };
}
