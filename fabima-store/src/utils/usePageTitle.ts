import { useEffect } from 'react';
import { SITE_CONFIG } from '../config/site';

const DEFAULT_DESCRIPTION = 'Fabima Store, la boutique de mode au féminin à Dakar : chaussures et sacs pour femme. Livraison 24h, paiement Wave, Orange Money ou à la livraison.';

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

/**
 * Titre d'onglet, description, adresse de référence et image de partage
 * (moteurs de recherche et aperçus WhatsApp / réseaux sociaux).
 * `canonicalPath` : adresse principale de la page quand elle en a plusieurs (ex. /p/… → /produit/…).
 */
export function usePageTitle(title?: string, description?: string, opts: { image?: string; canonicalPath?: string } = {}) {
  const { image, canonicalPath } = opts;
  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE_CONFIG.name}` : `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`;
    const desc = description ?? DEFAULT_DESCRIPTION;
    const url = `${window.location.origin}${canonicalPath ?? window.location.pathname}`;
    document.title = fullTitle;
    setMeta('name', 'description', desc);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:image', new URL(image || '/og-image.jpg', window.location.origin).href);
    setCanonical(url);
  }, [title, description, image, canonicalPath]);
}
