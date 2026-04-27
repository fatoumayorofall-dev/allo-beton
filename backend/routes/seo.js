/**
 * ALLO BÉTON — Routes SEO publiques
 * sitemap.xml dynamique + robots.txt fallback
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');

const SITE_URL = process.env.FRONTEND_URL || 'https://allobeton.sn';

/**
 * GET /sitemap.xml
 * Génère un sitemap avec les pages statiques + catalogue + détails produits + catégories
 */
router.get('/sitemap.xml', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Pages statiques
    const staticUrls = [
      { loc: `${SITE_URL}/shop`, priority: '1.0', changefreq: 'daily' },
      { loc: `${SITE_URL}/shop?view=catalog`, priority: '0.9', changefreq: 'daily' },
      { loc: `${SITE_URL}/shop?view=cart`, priority: '0.3', changefreq: 'monthly' },
      { loc: `${SITE_URL}/shop?view=login`, priority: '0.5', changefreq: 'monthly' },
    ];

    // Produits actifs
    let products = [];
    try {
      const [rows] = await pool.query(
        `SELECT slug, id, updated_at FROM ecom_products
         WHERE is_active = 1
         ORDER BY updated_at DESC
         LIMIT 1000`
      );
      products = rows;
    } catch (e) {
      console.warn('⚠️  sitemap: impossible de charger les produits', e.message);
    }

    // Catégories actives
    let categories = [];
    try {
      const [rows] = await pool.query(
        `SELECT slug, id FROM ecom_categories WHERE is_active = 1 LIMIT 200`
      );
      categories = rows;
    } catch (e) {
      console.warn('⚠️  sitemap: impossible de charger les catégories', e.message);
    }

    // Construit le XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Pages statiques
    for (const u of staticUrls) {
      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(u.loc)}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>${u.changefreq}</changefreq>\n`;
      xml += `    <priority>${u.priority}</priority>\n`;
      xml += '  </url>\n';
    }

    // Produits
    for (const p of products) {
      const slug = p.slug || p.id;
      const lastmod = p.updated_at
        ? new Date(p.updated_at).toISOString().split('T')[0]
        : today;
      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(`${SITE_URL}/shop?view=product&id=${slug}`)}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    }

    // Catégories
    for (const c of categories) {
      const slug = c.slug || c.id;
      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(`${SITE_URL}/shop?view=catalog&category=${slug}`)}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.7</priority>\n';
      xml += '  </url>\n';
    }

    xml += '</urlset>\n';

    res.set({
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    });
    res.send(xml);
  } catch (err) {
    console.error('❌ Erreur sitemap:', err);
    res.status(500).send('<?xml version="1.0"?><error>sitemap generation failed</error>');
  }
});

/**
 * GET /robots.txt (fallback si pas servi par nginx)
 */
router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
    `User-agent: *\n` +
    `Allow: /\n` +
    `Allow: /shop\n` +
    `Disallow: /api/\n` +
    `Disallow: /admin\n` +
    `Disallow: /login\n\n` +
    `Sitemap: ${SITE_URL}/sitemap.xml\n`
  );
});

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = router;
