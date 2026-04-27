/**
 * ALLO BETON — Hook page meta (SEO dynamique)
 * Met à jour title + meta + JSON-LD au changement de vue
 */

import { useEffect } from 'react';

interface PageMeta {
  title?: string;
  description?: string;
  ogImage?: string;
  ogType?: string;
  canonical?: string;
  // Pour les fiches produit : injecte un JSON-LD Product
  product?: {
    name: string;
    description?: string;
    image?: string;
    sku?: string;
    price?: number;
    currency?: string;
    stockStatus?: 'in_stock' | 'out_of_stock' | 'low_stock';
    category?: string;
  };
}

const DEFAULT_TITLE = "Allô Béton — Matériaux BTP & Béton prêt à l'emploi · Sénégal";
const DEFAULT_DESCRIPTION =
  "Fournisseur n°1 de béton, ciment, fer et matériaux BTP au Sénégal. Livraison rapide à Dakar et environs.";
const DEFAULT_OG = 'https://allobeton.sn/og-image.jpg';

function setMeta(name: string, content: string, isProperty = false) {
  const attr = isProperty ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setCanonical(href: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
}

function setJsonLd(id: string, data: any) {
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

function clearJsonLd(id: string) {
  const script = document.getElementById(id);
  if (script) script.remove();
}

export function usePageMeta(meta: PageMeta) {
  useEffect(() => {
    const title = meta.title || DEFAULT_TITLE;
    const description = meta.description || DEFAULT_DESCRIPTION;
    const ogImage = meta.ogImage || DEFAULT_OG;
    const ogType = meta.ogType || 'website';
    const canonical = meta.canonical || window.location.href.split('?')[0];

    // Title
    document.title = title;

    // Standards
    setMeta('description', description);

    // Open Graph
    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setMeta('og:image', ogImage, true);
    setMeta('og:type', ogType, true);
    setMeta('og:url', window.location.href, true);

    // Twitter
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:image', ogImage);

    // Canonical
    setCanonical(canonical);

    // JSON-LD Product (si fourni)
    if (meta.product) {
      const p = meta.product;
      setJsonLd('ld-product', {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.name,
        description: p.description || description,
        image: p.image ? [p.image] : undefined,
        sku: p.sku,
        category: p.category,
        brand: {
          '@type': 'Brand',
          name: 'Allô Béton',
        },
        offers: p.price
          ? {
              '@type': 'Offer',
              price: p.price,
              priceCurrency: p.currency || 'XOF',
              availability:
                p.stockStatus === 'out_of_stock'
                  ? 'https://schema.org/OutOfStock'
                  : 'https://schema.org/InStock',
              seller: {
                '@type': 'Organization',
                name: 'Allô Béton',
              },
            }
          : undefined,
      });
    } else {
      clearJsonLd('ld-product');
    }
  }, [
    meta.title,
    meta.description,
    meta.ogImage,
    meta.ogType,
    meta.canonical,
    meta.product?.name,
    meta.product?.price,
    meta.product?.stockStatus,
  ]);
}
