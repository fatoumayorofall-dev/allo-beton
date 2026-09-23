// ============================================================
//  RÉFÉRENCEMENT
//  - /robots.txt et /sitemap.xml générés à partir du catalogue en ligne (+ Le Marché, le journal)
//  - chaque page HTML reçoit son titre, sa description et son image de partage :
//    les aperçus WhatsApp / Facebook / Google sont justes même sans JavaScript
//  Les données de secours (avant publication du catalogue) viennent de dist/seo-data.json,
//  écrit au moment de la compilation du site.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clip = (s, n = 160) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t; };
const fcfa = n => `${Math.round(n).toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ')} FCFA`;

/** Pages privées : jamais dans les résultats de recherche. */
const PRIVATE = /^\/(admin|livreur\/|commande|compte|confirmation\/|mes-commandes|panier|favoris)/;
const STATIC_PAGES = [
  { path: '/', priority: '1.0', freq: 'daily' },
  { path: '/boutique', priority: '0.9', freq: 'daily' },
  { path: '/marche', priority: '0.7', freq: 'daily' },
  { path: '/journal', priority: '0.6', freq: 'weekly' },
  { path: '/a-propos', priority: '0.4', freq: 'monthly' },
  { path: '/faq', priority: '0.4', freq: 'monthly' },
  { path: '/suivi', priority: '0.3', freq: 'monthly' },
  { path: '/authentique', priority: '0.3', freq: 'monthly' },
];

/** Lit un fichier et le garde en mémoire tant qu'il ne change pas. */
function cachedFile(file, parse) {
  let mtime = -1, value = null;
  return () => {
    try {
      const m = fs.statSync(file).mtimeMs;
      if (m !== mtime) { value = parse(fs.readFileSync(file, 'utf8')); mtime = m; }
    } catch { mtime = -1; value = null; }
    return value;
  };
}

export function registerSeoRoutes(app, { store, dist }) {
  const seoData = cachedFile(path.join(dist, 'seo-data.json'), JSON.parse);
  const indexHtml = cachedFile(path.join(dist, 'index.html'), s => s);
  const data = () => seoData() ?? { site: { name: 'Fabima Store' }, categories: [], products: [], articles: [] };

  const originOf = req => (process.env.SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
  const abs = (origin, u) => (!u ? `${origin}/og-image.jpg` : /^https?:\/\//.test(u) ? u : `${origin}${u.startsWith('/') ? '' : '/'}${u}`);

  /** Pièces de la boutique en vente (catalogue publié par la gérante, sinon celui du site). */
  const shopProducts = () => {
    const d = data();
    const onSale = new Set(d.categories.map(c => c.id));
    const catalog = store.getCatalog();
    if (!catalog) return d.products;
    return catalog.filter(p => onSale.has(p.category)).map(p => ({ id: p.id, slug: p.slug, name: p.name, category: p.category, price: p.price, image: p.images?.[0], description: p.description }));
  };
  const marketProducts = () => {
    const names = new Set(data().categories.map(c => c.name.toLowerCase()));
    return store.listMarketProducts().filter(p => p.active && names.has(String(p.category).trim().toLowerCase()));
  };

  /** Titre, description, image… de la page demandée. */
  function pageMeta(pathname) {
    const d = data();
    const site = d.site?.name || 'Fabima Store';
    const base = { title: `${site} — Chaussures & sacs pour elle · Sénégal`, description: 'Fabima Store, votre boutique de mode en ligne : chaussures et sacs pour femme. Livraison rapide à Dakar, paiement Wave, Orange Money ou à la livraison.', image: null, type: 'website', canonical: pathname };
    const titled = (t, description = base.description) => ({ ...base, title: `${t} · ${site}`, description });
    let m;
    if (pathname === '/') return base;
    if (pathname === '/boutique') return titled('La boutique', 'Toutes nos chaussures et nos sacs pour femme : nouveautés, best-sellers et promotions. Livraison à Dakar et dans tout le Sénégal.');
    if ((m = /^\/boutique\/([^/]+)$/.exec(pathname))) {
      const c = d.categories.find(x => x.id === m[1]);
      return c ? titled(`${c.name} pour femme`, `${c.name} pour femme chez ${site} : pièces choisies à Dakar, livraison 24h, paiement Wave, Orange Money ou à la livraison.`) : base;
    }
    if ((m = /^\/(produit\/([^/]+)|p\/([^/]+))$/.exec(pathname))) {
      const list = shopProducts();
      const p = m[2] ? list.find(x => x.slug === m[2]) : list.find(x => x.id.replace(/^FAB-/, '').toLowerCase() === m[3]);
      if (!p) return base;
      return { ...titled(p.name, clip(`${p.name} — ${fcfa(p.price)}. ${p.description || ''}`)), image: p.image, type: 'product', price: p.price, canonical: `/produit/${p.slug}` };
    }
    if (pathname === '/marche') return titled('Le Marché', `Le Marché ${site} : encore plus de chaussures et de sacs, commandés pour vous chez nos partenaires et livrés chez vous au Sénégal.`);
    if ((m = /^\/marche\/([^/]+)$/.exec(pathname))) {
      const p = marketProducts().find(x => x.slug === m[1]);
      return p ? { ...titled(p.name, clip(`${p.name} — ${fcfa(p.price)}, livré chez vous au Sénégal. ${p.description || ''}`)), image: p.images?.[0], type: 'product', price: p.price } : base;
    }
    if (pathname === '/journal') return titled('Le journal', 'Conseils de style, guides d\'occasion et astuces d\'entretien par l\'équipe Fabima Store.');
    if ((m = /^\/journal\/([^/]+)$/.exec(pathname))) {
      const a = d.articles.find(x => x.slug === m[1]);
      return a ? { ...titled(a.title, a.excerpt), image: a.image, type: 'article' } : base;
    }
    if (pathname === '/a-propos') return titled('Notre maison');
    if (pathname === '/faq') return titled('Aide & FAQ');
    if (pathname === '/suivi') return titled('Suivre ma commande');
    if (pathname.startsWith('/authentique')) return { ...titled('Vérifier l\'authenticité', 'Scannez l\'étiquette de votre pièce Fabima ou saisissez son code : nous vous confirmons qu\'elle est authentique.'), canonical: '/authentique' };
    return base;
  }

  function headTags(req) {
    const origin = originOf(req);
    const meta = pageMeta(req.path);
    const url = `${origin}${meta.canonical}`;
    const image = abs(origin, meta.image);
    const tags = [
      `<title>${esc(meta.title)}</title>`,
      `<meta name="description" content="${esc(meta.description)}" />`,
      `<link rel="canonical" href="${esc(url)}" />`,
      `<meta property="og:type" content="${meta.type}" />`,
      `<meta property="og:url" content="${esc(url)}" />`,
      `<meta property="og:title" content="${esc(meta.title)}" />`,
      `<meta property="og:description" content="${esc(meta.description)}" />`,
      `<meta property="og:image" content="${esc(image)}" />`,
      ...(meta.image ? [] : ['<meta property="og:image:width" content="1200" />', '<meta property="og:image:height" content="630" />']),
      `<meta property="og:image:alt" content="${esc(meta.title)}" />`,
      '<meta name="twitter:card" content="summary_large_image" />',
      ...(meta.price ? [`<meta property="product:price:amount" content="${meta.price}" />`, '<meta property="product:price:currency" content="XOF" />'] : []),
      ...(PRIVATE.test(req.path) ? ['<meta name="robots" content="noindex, nofollow" />'] : []),
    ];
    return tags.join('\n    ');
  }

  /* robots.txt : tout est ouvert sauf les espaces privés */
  app.get('/robots.txt', (req, res) => {
    res.type('text/plain').set('Cache-Control', 'public, max-age=3600').send([
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin', 'Disallow: /livreur/', 'Disallow: /commande', 'Disallow: /compte', 'Disallow: /confirmation/', 'Disallow: /mes-commandes', 'Disallow: /api/',
      '',
      `Sitemap: ${originOf(req)}/sitemap.xml`,
      '',
    ].join('\n'));
  });

  /* sitemap.xml : pages, univers, pièces (avec photo), Marché et articles */
  app.get('/sitemap.xml', (req, res) => {
    const origin = originOf(req);
    const d = data();
    const updated = (store.getCatalogUpdatedAt() || new Date().toISOString()).slice(0, 10);
    const url = (loc, { lastmod, freq, priority, image, title } = {}) => [
      '  <url>',
      `    <loc>${esc(origin + loc)}</loc>`,
      lastmod && `    <lastmod>${lastmod}</lastmod>`,
      freq && `    <changefreq>${freq}</changefreq>`,
      priority && `    <priority>${priority}</priority>`,
      image && `    <image:image><image:loc>${esc(abs(origin, image))}</image:loc>${title ? `<image:title>${esc(title)}</image:title>` : ''}</image:image>`,
      '  </url>',
    ].filter(Boolean).join('\n');
    const urls = [
      ...STATIC_PAGES.map(p => url(p.path, { freq: p.freq, priority: p.priority, lastmod: p.path === '/' || p.path === '/boutique' ? updated : undefined })),
      ...d.categories.map(c => url(`/boutique/${c.id}`, { freq: 'daily', priority: '0.8', lastmod: updated })),
      ...shopProducts().map(p => url(`/produit/${p.slug}`, { freq: 'weekly', priority: '0.8', lastmod: updated, image: p.image, title: p.name })),
      ...marketProducts().map(p => url(`/marche/${p.slug}`, { freq: 'weekly', priority: '0.5', lastmod: String(p.updatedAt || p.createdAt || '').slice(0, 10) || undefined, image: p.images?.[0], title: p.name })),
      ...d.articles.map(a => url(`/journal/${a.slug}`, { freq: 'monthly', priority: '0.5', lastmod: a.date, image: a.image, title: a.title })),
    ];
    res.type('application/xml').set('Cache-Control', 'public, max-age=900').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>\n`,
    );
  });

  /** Page HTML du site, avec les balises de partage de la page demandée. */
  return function sendPage(req, res, next) {
    const html = indexHtml();
    if (!html) return next();
    const origin = originOf(req);
    const page = html
      .replace(/<!--seo-->[\s\S]*?<!--\/seo-->/, headTags(req))
      // Données structurées (boutique, recherche) : adresses complètes
      .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, block => block.replace(/": "\//g, `": "${origin}/`));
    res.type('html').set('Cache-Control', 'no-cache').send(page);
  };
}
