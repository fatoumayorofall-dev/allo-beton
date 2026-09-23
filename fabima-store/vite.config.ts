import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { CATEGORIES, INITIAL_PRODUCTS } from './src/data/catalog';
import { ARTICLES } from './src/data/journal';
import { SITE_CONFIG, SHOP_LOCATION } from './src/config/site';

// En développement, les appels /api sont relayés vers le serveur Fabima (npm run server).
const api = { '/api': { target: 'http://localhost:8787', changeOrigin: true } };

/**
 * Référencement : écrit dist/seo-data.json (pages, produits, articles) pour que le serveur produise
 * le sitemap et les aperçus de liens (WhatsApp, Facebook, Google) même avant la publication du catalogue.
 */
const seoData = (): Plugin => ({
  name: 'fabima-seo-data',
  apply: 'build',
  generateBundle() {
    const clip = (s: string, n = 160) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
    this.emitFile({
      type: 'asset',
      fileName: 'seo-data.json',
      source: JSON.stringify({
        site: { name: SITE_CONFIG.name, tagline: SITE_CONFIG.tagline, phone: SITE_CONFIG.phoneRaw, email: SITE_CONFIG.email, address: SITE_CONFIG.address, geo: SHOP_LOCATION, social: Object.values(SITE_CONFIG.social) },
        categories: CATEGORIES.map(c => ({ id: c.id, name: c.name })),
        products: INITIAL_PRODUCTS.map(p => ({ id: p.id, slug: p.slug, name: p.name, category: p.category, price: p.price, image: p.images[0], description: clip(p.description) })),
        articles: ARTICLES.map(a => ({ slug: a.slug, title: a.title, excerpt: clip(a.excerpt), image: a.image, date: a.date })),
      }),
    });
  },
});

export default defineConfig({
  plugins: [react(), seoData()],
  server: { port: 5174, proxy: api },
  preview: { proxy: api },
});
