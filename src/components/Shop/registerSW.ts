/**
 * ALLO BETON — Service Worker registration + install prompt helper
 */

let deferredPrompt: any = null;

export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  // Uniquement en prod (éviter conflits HMR Vite)
  if (import.meta.env.DEV) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        // Notifie quand une nouvelle version est prête
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              // Une nouvelle version est dispo
              console.log('[SW] Nouvelle version disponible');
            }
          });
        });
      })
      .catch((err) => console.warn('[SW] registration failed', err));
  });

  // Capture l'event install prompt pour le déclencher plus tard
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });
}

/**
 * Déclenche l'invite d'installation PWA (si dispo)
 */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  try {
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return choice.outcome;
  } catch {
    return 'unavailable';
  }
}

export function isInstallable(): boolean {
  return deferredPrompt !== null;
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // @ts-ignore
    window.navigator.standalone === true
  );
}
