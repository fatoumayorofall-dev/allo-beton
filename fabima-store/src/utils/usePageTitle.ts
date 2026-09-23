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

/** Titre d'onglet + description (moteurs de recherche et aperçus WhatsApp / réseaux sociaux). */
export function usePageTitle(title?: string, description?: string) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE_CONFIG.name}` : `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`;
    const desc = description ?? DEFAULT_DESCRIPTION;
    document.title = fullTitle;
    setMeta('name', 'description', desc);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', desc);
  }, [title, description]);
}
