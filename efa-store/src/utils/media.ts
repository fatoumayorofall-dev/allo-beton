/**
 * Adresse d'une vidéo ou d'une image du site.
 * Dans l'aperçu sans serveur (WAMP, dossier quelconque), « /videos/… » devient « ./videos/… »
 * pour être cherché à côté de la page, et non à la racine du serveur web.
 */
export const mediaUrl = (src: string) => (import.meta.env.VITE_ROUTER === 'hash' && src.startsWith('/') && !src.startsWith('//') ? `.${src}` : src);

/** Vrai quand le site tourne sans le serveur EFA (version WAMP / aperçu). */
export const staticMode = import.meta.env.VITE_ROUTER === 'hash';

/**
 * Ce que la gérante tape pour une vidéo déjà en ligne ou posée dans le dossier « videos » :
 * « sandales.mp4 », « videos/sandales.mp4 » ou un lien https. Renvoie l'adresse à enregistrer, ou null.
 */
export function normalizeVideoInput(v: string): string | null {
  const s = v.trim().replace(/\\/g, '/');
  if (/^https:\/\/\S+$/i.test(s)) return s;
  const name = s.replace(/^\.?\/?(videos\/)?/i, '');
  return /^[\w.-]+\.(mp4|webm|mov)$/i.test(name) ? `/videos/${name}` : null;
}
