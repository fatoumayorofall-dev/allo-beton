/**
 * ALLO BÉTON - API PRODUITS E-COMMERCE
 * Routes et Controllers pour la gestion des produits
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../../db');

// Middleware d'authentification
const { authenticateToken, requireRole } = require('../../middleware/auth');

// ============================================================
// HELPERS
// ============================================================

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const generateSKU = (categorySlug, name) => {
  const prefix = categorySlug ? categorySlug.substring(0, 3).toUpperCase() : 'PRD';
  const suffix = name.substring(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${suffix}-${random}`;
};

// ============================================================
// ROUTES PUBLIQUES (Catalogue)
// ============================================================

/**
 * GET /api/ecommerce/products/categories
 * Liste des catégories actives avec comptage produits
 */
router.get('/categories', async (req, res) => {
  try {
    const [categories] = await pool.query(`
      SELECT c.*,
        COUNT(p.id) as product_count
      FROM ecom_categories c
      LEFT JOIN ecom_products p ON p.category_id = c.id AND p.is_active = 1
      WHERE c.is_active = 1
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC
    `);
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Erreur catégories:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/ecommerce/products
 * Liste des produits avec filtres, pagination, recherche
 * Lit depuis ecom_products + ecom_categories
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      search,
      min_price,
      max_price,
      sort = 'created_at',
      order = 'DESC',
      featured,
      in_stock
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let whereClause = 'WHERE p.is_active = 1';

    if (category) {
      whereClause += ' AND (c.name = ? OR c.id = ? OR c.slug = ?)';
      params.push(category, category, category);
    }

    if (search) {
      whereClause += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (min_price) {
      whereClause += ' AND p.price >= ?';
      params.push(parseFloat(min_price));
    }
    if (max_price) {
      whereClause += ' AND p.price <= ?';
      params.push(parseFloat(max_price));
    }

    if (featured === 'true') {
      whereClause += ' AND p.is_featured = 1';
    }

    if (in_stock === 'true') {
      whereClause += " AND p.stock_status = 'in_stock'";
    }

    const allowedSorts = ['price', 'name', 'created_at', 'sales_count'];
    const sortField = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const query = `
      SELECT
        p.id, p.sku, p.name, p.slug,
        COALESCE(p.short_description, SUBSTRING(p.description, 1, 150)) as short_description,
        COALESCE(p.description, '') as description,
        p.price, p.compare_at_price as compare_price,
        p.unit, p.min_order_quantity as min_quantity,
        p.stock_quantity, p.stock_status,
        p.image_url, p.gallery, p.specifications,
        p.is_featured, p.sales_count, p.views,
        p.created_at,
        c.id as category_id, c.name as category_name, c.slug as category_slug
      FROM ecom_products p
      LEFT JOIN ecom_categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY p.${sortField} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), offset);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM ecom_products p
      LEFT JOIN ecom_categories c ON p.category_id = c.id
      ${whereClause}
    `;

    const [products] = await pool.query(query, params);
    const [countResult] = await pool.query(countQuery, params.slice(0, -2));

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / parseInt(limit));

    const formattedProducts = products.map(p => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      slug: p.slug,
      short_description: p.short_description,
      description: p.description,
      price: parseFloat(p.price) || 0,
      compare_price: p.compare_price ? parseFloat(p.compare_price) : null,
      unit: p.unit || 'm³',
      min_quantity: parseFloat(p.min_quantity) || 1,
      step_quantity: 1,
      stock_quantity: parseFloat(p.stock_quantity) || 0,
      stock_status: p.stock_status,
      image_url: p.image_url || '/images/beton-default.jpg',
      gallery: p.gallery ? (typeof p.gallery === 'string' ? JSON.parse(p.gallery) : p.gallery) : [],
      specifications: p.specifications ? (typeof p.specifications === 'string' ? JSON.parse(p.specifications) : p.specifications) : {},
      is_featured: !!p.is_featured,
      rating_avg: 0,
      rating_count: 0,
      sold_count: p.sales_count || 0,
      created_at: p.created_at,
      category_name: p.category_name || null,
      category_slug: p.category_slug || null,
      category: p.category_id ? {
        id: p.category_id,
        name: p.category_name,
        slug: p.category_slug
      } : null
    }));

    res.json({
      success: true,
      data: formattedProducts,
      products: formattedProducts,
      total,
      pages: totalPages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Erreur liste produits:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/ecommerce/products/featured
 * Produits mis en avant (depuis ecom_products)
 */
router.get('/featured', async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const [products] = await pool.query(`
      SELECT
        p.id, p.sku, p.name, p.slug,
        COALESCE(p.short_description, SUBSTRING(p.description, 1, 100)) as short_description,
        p.price, p.compare_at_price as compare_price,
        p.unit, p.image_url, p.stock_status,
        p.is_featured, p.sales_count,
        c.name as category_name, c.slug as category_slug
      FROM ecom_products p
      LEFT JOIN ecom_categories c ON p.category_id = c.id
      WHERE p.is_active = 1 AND p.is_featured = 1
      ORDER BY p.sales_count DESC, p.created_at DESC
      LIMIT ?
    `, [parseInt(limit)]);

    const formattedProducts = products.map(p => ({
      ...p,
      price: parseFloat(p.price) || 0,
      compare_price: p.compare_price ? parseFloat(p.compare_price) : null,
      image_url: p.image_url || '/images/beton-default.jpg',
      is_featured: true,
      rating_avg: 0,
      rating_count: 0,
      sold_count: p.sales_count || 0
    }));

    res.json({ success: true, data: formattedProducts });

  } catch (error) {
    console.error('Erreur produits featured:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/ecommerce/products/bestsellers
 * Meilleures ventes (depuis ecom_products)
 */
router.get('/bestsellers', async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const [products] = await pool.query(`
      SELECT
        p.id, p.sku, p.name, p.slug,
        COALESCE(p.short_description, SUBSTRING(p.description, 1, 100)) as short_description,
        p.price, p.compare_at_price as compare_price,
        p.unit, p.image_url, p.stock_status,
        p.is_featured, p.sales_count,
        c.name as category_name
      FROM ecom_products p
      LEFT JOIN ecom_categories c ON p.category_id = c.id
      WHERE p.is_active = 1
      ORDER BY p.sales_count DESC, p.created_at DESC
      LIMIT ?
    `, [parseInt(limit)]);

    const formattedProducts = products.map(p => ({
      ...p,
      price: parseFloat(p.price) || 0,
      compare_price: p.compare_price ? parseFloat(p.compare_price) : null,
      image_url: p.image_url || '/images/beton-default.jpg',
      is_featured: !!p.is_featured,
      rating_avg: 0,
      sold_count: p.sales_count || 0
    }));

    res.json({ success: true, data: formattedProducts });

  } catch (error) {
    console.error('Erreur bestsellers:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/ecommerce/products/categories/list
 * Liste des catégories (depuis ecom_categories, DOIT être AVANT /:idOrSlug)
 */
router.get('/categories/list', async (req, res) => {
  try {
    const [categories] = await pool.query(`
      SELECT
        c.id, c.name, c.slug,
        COALESCE(c.description, '') as description,
        COALESCE(c.image_url, 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=800') as image_url,
        c.is_active, c.sort_order,
        (SELECT COUNT(*) FROM ecom_products p WHERE p.category_id = c.id AND p.is_active = 1) as product_count
      FROM ecom_categories c
      WHERE c.is_active = 1
      ORDER BY c.sort_order ASC, c.name ASC
    `);

    res.json({ success: true, data: categories });

  } catch (error) {
    console.error('Erreur liste catégories:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/ecommerce/products/:idOrSlug
 * Détail d'un produit (depuis ecom_products)
 */
router.get('/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;

    const [products] = await pool.query(`
      SELECT
        p.id, p.sku, p.name, p.slug,
        COALESCE(p.description, '') as description,
        COALESCE(p.short_description, SUBSTRING(p.description, 1, 150)) as short_description,
        p.price, p.compare_at_price as compare_price,
        p.unit, p.min_order_quantity as min_quantity,
        p.stock_quantity, p.stock_status,
        p.image_url, p.gallery, p.specifications,
        p.is_featured, p.views, p.sales_count,
        p.created_at,
        c.id as category_id, c.name as category_name, c.slug as category_slug
      FROM ecom_products p
      LEFT JOIN ecom_categories c ON p.category_id = c.id
      WHERE (p.id = ? OR p.slug = ?) AND p.is_active = 1
    `, [idOrSlug, idOrSlug.toLowerCase()]);

    if (products.length === 0) {
      return res.status(404).json({ success: false, error: 'Produit non trouvé' });
    }

    const p = products[0];

    // Incrémenter les vues
    await pool.query('UPDATE ecom_products SET views = views + 1 WHERE id = ?', [p.id]);

    const product = {
      id: p.id,
      sku: p.sku,
      name: p.name,
      slug: p.slug,
      description: p.description,
      short_description: p.short_description,
      price: parseFloat(p.price) || 0,
      compare_price: p.compare_price ? parseFloat(p.compare_price) : null,
      unit: p.unit || 'm³',
      min_quantity: parseFloat(p.min_quantity) || 1,
      step_quantity: 1,
      stock_quantity: parseFloat(p.stock_quantity) || 0,
      stock_status: p.stock_status,
      image_url: p.image_url || '/images/beton-default.jpg',
      gallery: p.gallery ? (typeof p.gallery === 'string' ? JSON.parse(p.gallery) : p.gallery) : [],
      specifications: p.specifications ? (typeof p.specifications === 'string' ? JSON.parse(p.specifications) : p.specifications) : {},
      is_featured: !!p.is_featured,
      rating_avg: 0,
      rating_count: 0,
      view_count: (p.views || 0) + 1,
      sold_count: p.sales_count || 0,
      category: p.category_id ? {
        id: p.category_id,
        name: p.category_name,
        slug: p.category_slug
      } : null
    };

    // Produits similaires (même catégorie)
    const [related] = await pool.query(`
      SELECT
        p.id, p.name, p.slug,
        p.price, p.compare_at_price as compare_price,
        p.image_url, p.stock_status, p.is_featured
      FROM ecom_products p
      WHERE p.category_id = ? AND p.id != ? AND p.is_active = 1
      ORDER BY p.sales_count DESC
      LIMIT 4
    `, [p.category_id, product.id]);

    res.json({
      success: true,
      data: {
        ...product,
        reviews: [],
        related: related.map(r => ({
          ...r,
          price: parseFloat(r.price) || 0,
          compare_price: r.compare_price ? parseFloat(r.compare_price) : null,
          image_url: r.image_url || '/images/beton-default.jpg',
          rating_avg: 0
        }))
      }
    });

  } catch (error) {
    console.error('Erreur détail produit:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ============================================================
// ROUTES ADMIN (CRUD)
// ============================================================

/**
 * GET /api/ecommerce/products/admin/list
 * Liste admin (tous les produits, y compris inactifs)
 */
router.get('/admin/list', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let whereClause = 'WHERE 1=1';

    if (search) {
      whereClause += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (category) {
      whereClause += ' AND p.category_id = ?';
      params.push(category);
    }

    if (status === 'active') {
      whereClause += ' AND p.is_active = 1';
    } else if (status === 'inactive') {
      whereClause += ' AND p.is_active = 0';
    }

    const [products] = await pool.query(`
      SELECT
        p.*, c.name as category_name
      FROM ecom_products p
      LEFT JOIN ecom_categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total FROM ecom_products p ${whereClause}
    `, params);

    res.json({
      success: true,
      data: products.map(p => ({
        ...p,
        gallery: p.gallery ? JSON.parse(p.gallery) : [],
        specifications: p.specifications ? JSON.parse(p.specifications) : {}
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Erreur admin list:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * POST /api/ecommerce/products
 * Créer un produit
 */
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const {
      name, category_id, description, short_description,
      price, compare_price, cost_price, unit = 'm³',
      min_quantity = 1, step_quantity = 1,
      stock_quantity = 0, manage_stock = true,
      weight, image_url, gallery, specifications,
      meta_title, meta_description, is_featured = false
    } = req.body;

    if (!name || !price) {
      return res.status(400).json({ success: false, error: 'Nom et prix requis' });
    }

    const id = uuidv4();
    const slug = generateSlug(name);

    // Vérifier slug unique
    const [existing] = await pool.query('SELECT id FROM ecom_products WHERE slug = ?', [slug]);
    const finalSlug = existing.length > 0 ? `${slug}-${Date.now()}` : slug;

    // Générer SKU
    let categorySlug = '';
    if (category_id) {
      const [cat] = await pool.query('SELECT slug FROM ecom_categories WHERE id = ?', [category_id]);
      if (cat.length > 0) categorySlug = cat[0].slug;
    }
    const sku = generateSKU(categorySlug, name);

    await pool.query(`
      INSERT INTO ecom_products (
        id, sku, name, slug, category_id, description, short_description,
        price, compare_price, cost_price, unit, min_quantity, step_quantity,
        stock_quantity, stock_status, manage_stock, weight,
        image_url, gallery, specifications,
        meta_title, meta_description, is_featured, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [
      id, sku, name, finalSlug, category_id || null, description, short_description,
      parseFloat(price), compare_price ? parseFloat(compare_price) : null,
      cost_price ? parseFloat(cost_price) : null, unit, min_quantity, step_quantity,
      parseFloat(stock_quantity), stock_quantity > 0 ? 'in_stock' : 'out_of_stock',
      manage_stock ? 1 : 0, weight ? parseFloat(weight) : null,
      image_url, gallery ? JSON.stringify(gallery) : null,
      specifications ? JSON.stringify(specifications) : null,
      meta_title || name, meta_description || short_description,
      is_featured ? 1 : 0
    ]);

    const [newProduct] = await pool.query('SELECT * FROM ecom_products WHERE id = ?', [id]);

    res.status(201).json({
      success: true,
      message: 'Produit créé avec succès',
      data: newProduct[0]
    });

  } catch (error) {
    console.error('Erreur création produit:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/ecommerce/products/:id
 * Modifier un produit
 */
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Vérifier existence
    const [existing] = await pool.query('SELECT * FROM ecom_products WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Produit non trouvé' });
    }

    // Construire la mise à jour
    const allowedFields = [
      'name', 'category_id', 'description', 'short_description',
      'price', 'compare_price', 'cost_price', 'unit',
      'min_quantity', 'step_quantity', 'stock_quantity', 'stock_status',
      'manage_stock', 'weight', 'image_url', 'gallery', 'specifications',
      'meta_title', 'meta_description', 'is_featured', 'is_active', 'sort_order'
    ];

    const setClauses = [];
    const values = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        let value = updates[field];

        // Sérialiser JSON
        if (['gallery', 'specifications'].includes(field) && typeof value === 'object') {
          value = JSON.stringify(value);
        }

        values.push(value);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, error: 'Aucune modification' });
    }

    // Mettre à jour slug si nom modifié
    if (updates.name && updates.name !== existing[0].name) {
      const newSlug = generateSlug(updates.name);
      const [slugExists] = await pool.query(
        'SELECT id FROM ecom_products WHERE slug = ? AND id != ?',
        [newSlug, id]
      );
      setClauses.push('slug = ?');
      values.push(slugExists.length > 0 ? `${newSlug}-${Date.now()}` : newSlug);
    }

    // Mettre à jour stock_status si stock modifié
    if (updates.stock_quantity !== undefined) {
      setClauses.push('stock_status = ?');
      values.push(parseFloat(updates.stock_quantity) > 0 ? 'in_stock' : 'out_of_stock');
    }

    values.push(id);

    await pool.query(
      `UPDATE ecom_products SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    const [updated] = await pool.query('SELECT * FROM ecom_products WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Produit modifié avec succès',
      data: {
        ...updated[0],
        gallery: updated[0].gallery ? JSON.parse(updated[0].gallery) : [],
        specifications: updated[0].specifications ? JSON.parse(updated[0].specifications) : {}
      }
    });

  } catch (error) {
    console.error('Erreur modification produit:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/ecommerce/products/:id
 * Supprimer un produit (soft delete)
 */
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT * FROM ecom_products WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Produit non trouvé' });
    }

    // Soft delete
    await pool.query('UPDATE ecom_products SET is_active = 0 WHERE id = ?', [id]);

    res.json({ success: true, message: 'Produit désactivé avec succès' });

  } catch (error) {
    console.error('Erreur suppression produit:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * POST /api/ecommerce/products/:id/stock
 * Ajuster le stock
 */
router.post('/:id/stock', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { adjustment, reason } = req.body;

    if (!adjustment) {
      return res.status(400).json({ success: false, error: 'Ajustement requis' });
    }

    const [product] = await pool.query('SELECT * FROM ecom_products WHERE id = ?', [id]);
    if (product.length === 0) {
      return res.status(404).json({ success: false, error: 'Produit non trouvé' });
    }

    const newStock = parseFloat(product[0].stock_quantity) + parseFloat(adjustment);
    const stockStatus = newStock > 0 ? 'in_stock' : 'out_of_stock';

    await pool.query(
      'UPDATE ecom_products SET stock_quantity = ?, stock_status = ? WHERE id = ?',
      [newStock, stockStatus, id]
    );

    res.json({
      success: true,
      message: 'Stock ajusté avec succès',
      data: {
        previous_stock: product[0].stock_quantity,
        adjustment: parseFloat(adjustment),
        new_stock: newStock,
        reason
      }
    });

  } catch (error) {
    console.error('Erreur ajustement stock:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ============================================================
// ROUTES CATÉGORIES (admin)
// ============================================================

/**
 * POST /api/ecommerce/products/categories
 * Créer une catégorie
 */
router.post('/categories', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, description, image_url, parent_id, sort_order = 0 } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Nom requis' });
    }

    const id = uuidv4();
    const slug = generateSlug(name);

    await pool.query(`
      INSERT INTO ecom_categories (id, name, slug, description, image_url, parent_id, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, name, slug, description, image_url, parent_id, sort_order]);

    const [category] = await pool.query('SELECT * FROM ecom_categories WHERE id = ?', [id]);

    res.status(201).json({
      success: true,
      message: 'Catégorie créée',
      data: category[0]
    });

  } catch (error) {
    console.error('Erreur création catégorie:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

module.exports = router;
