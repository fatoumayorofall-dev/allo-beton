/**
 * ALLO BÉTON — Tarifs dégressifs B2B (pricing tiers)
 * Table ecom_pricing_tiers : paliers de prix par produit
 * Logique : plus la quantité est grande, plus le prix unitaire baisse
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../../db');
const { authenticateToken, requireRole } = require('../../middleware/auth');

/**
 * Initialise la table ecom_pricing_tiers si absente
 */
async function ensureTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ecom_pricing_tiers (
        id VARCHAR(36) PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        min_quantity DECIMAL(12,2) NOT NULL,
        max_quantity DECIMAL(12,2) NULL,
        unit_price DECIMAL(12,2) NOT NULL,
        discount_percent DECIMAL(5,2) DEFAULT 0,
        label VARCHAR(100) NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_product_qty (product_id, min_quantity),
        INDEX idx_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (e) {
    console.error('❌ ensureTable ecom_pricing_tiers:', e.message);
  }
}
ensureTable();

// ============================================================
// GET /:product_id - paliers d'un produit (public)
// ============================================================
router.get('/:product_id', async (req, res) => {
  try {
    const { product_id } = req.params;

    const [tiers] = await pool.query(
      `SELECT id, min_quantity, max_quantity, unit_price, discount_percent, label
       FROM ecom_pricing_tiers
       WHERE product_id = ? AND is_active = 1
       ORDER BY min_quantity ASC`,
      [product_id]
    );

    res.json({
      success: true,
      data: tiers.map(t => ({
        ...t,
        min_quantity: Number(t.min_quantity),
        max_quantity: t.max_quantity ? Number(t.max_quantity) : null,
        unit_price: Number(t.unit_price),
        discount_percent: Number(t.discount_percent),
      })),
    });
  } catch (err) {
    console.error('❌ GET /pricing/:product_id:', err);
    res.status(500).json({ success: false, error: 'Erreur chargement tarifs' });
  }
});

// ============================================================
// GET /calculate/:product_id?quantity=X - prix calculé pour une quantité donnée
// ============================================================
router.get('/calculate/:product_id', async (req, res) => {
  try {
    const { product_id } = req.params;
    const quantity = parseFloat(req.query.quantity) || 1;

    // Prix de base du produit
    const [[product]] = await pool.query(
      'SELECT price, unit FROM ecom_products WHERE id = ? AND is_active = 1',
      [product_id]
    );
    if (!product) {
      return res.status(404).json({ success: false, error: 'Produit introuvable' });
    }

    const basePrice = Number(product.price);

    // Cherche le palier applicable
    const [tiers] = await pool.query(
      `SELECT unit_price, discount_percent, label, min_quantity, max_quantity
       FROM ecom_pricing_tiers
       WHERE product_id = ? AND is_active = 1
         AND min_quantity <= ?
         AND (max_quantity IS NULL OR max_quantity >= ?)
       ORDER BY min_quantity DESC
       LIMIT 1`,
      [product_id, quantity, quantity]
    );

    let unitPrice = basePrice;
    let discount = 0;
    let tierLabel = null;
    let tierApplied = false;

    if (tiers.length > 0) {
      const tier = tiers[0];
      unitPrice = Number(tier.unit_price);
      discount = Number(tier.discount_percent);
      tierLabel = tier.label;
      tierApplied = true;
    }

    const totalPrice = unitPrice * quantity;
    const savings = (basePrice - unitPrice) * quantity;

    res.json({
      success: true,
      data: {
        base_price: basePrice,
        unit_price: unitPrice,
        quantity,
        total_price: Math.round(totalPrice),
        discount_percent: discount,
        savings: Math.round(savings),
        tier_label: tierLabel,
        tier_applied: tierApplied,
        unit: product.unit || 'm³',
      },
    });
  } catch (err) {
    console.error('❌ GET /pricing/calculate:', err);
    res.status(500).json({ success: false, error: 'Erreur calcul prix' });
  }
});

// ============================================================
// ADMIN — CRUD paliers
// ============================================================

// Lister tous les paliers (admin)
router.get('/admin/all', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { product_id } = req.query;
    let query = `
      SELECT t.*, p.name AS product_name, p.price AS base_price, p.unit
      FROM ecom_pricing_tiers t
      LEFT JOIN ecom_products p ON p.id = t.product_id
    `;
    const params = [];

    if (product_id) {
      query += ' WHERE t.product_id = ?';
      params.push(product_id);
    }
    query += ' ORDER BY t.product_id, t.min_quantity ASC';

    const [rows] = await pool.query(query, params);
    res.json({
      success: true,
      data: rows.map(r => ({
        ...r,
        min_quantity: Number(r.min_quantity),
        max_quantity: r.max_quantity ? Number(r.max_quantity) : null,
        unit_price: Number(r.unit_price),
        base_price: Number(r.base_price),
        discount_percent: Number(r.discount_percent),
      })),
    });
  } catch (err) {
    console.error('❌ admin/all pricing:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Créer un palier
router.post('/admin', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { product_id, min_quantity, max_quantity, unit_price, discount_percent, label } = req.body;

    if (!product_id || min_quantity === undefined || !unit_price) {
      return res.status(400).json({
        success: false,
        error: 'Champs requis : product_id, min_quantity, unit_price',
      });
    }

    // Vérifie le produit
    const [[product]] = await pool.query(
      'SELECT id, price FROM ecom_products WHERE id = ?',
      [product_id]
    );
    if (!product) {
      return res.status(404).json({ success: false, error: 'Produit introuvable' });
    }

    const id = uuidv4();
    const calcDiscount = discount_percent ||
      (Number(product.price) > 0
        ? Math.round(((Number(product.price) - Number(unit_price)) / Number(product.price)) * 100 * 100) / 100
        : 0);

    await pool.query(
      `INSERT INTO ecom_pricing_tiers
       (id, product_id, min_quantity, max_quantity, unit_price, discount_percent, label)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        product_id,
        Number(min_quantity),
        max_quantity ? Number(max_quantity) : null,
        Number(unit_price),
        Math.max(0, calcDiscount),
        label || null,
      ]
    );

    res.status(201).json({ success: true, data: { id } });
  } catch (err) {
    console.error('❌ POST /pricing/admin:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Modifier un palier
router.put('/admin/:id', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { min_quantity, max_quantity, unit_price, discount_percent, label, is_active } = req.body;

    const sets = [];
    const params = [];

    if (min_quantity !== undefined) { sets.push('min_quantity = ?'); params.push(Number(min_quantity)); }
    if (max_quantity !== undefined) { sets.push('max_quantity = ?'); params.push(max_quantity ? Number(max_quantity) : null); }
    if (unit_price !== undefined) { sets.push('unit_price = ?'); params.push(Number(unit_price)); }
    if (discount_percent !== undefined) { sets.push('discount_percent = ?'); params.push(Number(discount_percent)); }
    if (label !== undefined) { sets.push('label = ?'); params.push(label || null); }
    if (is_active !== undefined) { sets.push('is_active = ?'); params.push(is_active ? 1 : 0); }

    if (sets.length === 0) {
      return res.status(400).json({ success: false, error: 'Aucun champ à mettre à jour' });
    }

    params.push(id);
    await pool.query(`UPDATE ecom_pricing_tiers SET ${sets.join(', ')} WHERE id = ?`, params);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ PUT /pricing/admin/:id:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Supprimer un palier
router.delete('/admin/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    await pool.query('DELETE FROM ecom_pricing_tiers WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ DELETE /pricing/admin/:id:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ============================================================
// Seed exemples (appel POST /pricing/admin/seed)
// ============================================================
router.post('/admin/seed', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // Récupère les 5 premiers produits actifs
    const [products] = await pool.query(
      'SELECT id, price FROM ecom_products WHERE is_active = 1 LIMIT 5'
    );

    let count = 0;
    for (const p of products) {
      const base = Number(p.price);
      if (base <= 0) continue;

      const tiers = [
        { min: 10,  max: 24,  pct: 3,  label: 'Remise 3% — 10+ unités' },
        { min: 25,  max: 49,  pct: 5,  label: 'Remise 5% — 25+ unités' },
        { min: 50,  max: 99,  pct: 8,  label: 'Remise 8% — 50+ unités' },
        { min: 100, max: null, pct: 12, label: 'Remise PRO 12% — 100+ unités' },
      ];

      for (const t of tiers) {
        const id = uuidv4();
        const unitPrice = Math.round(base * (1 - t.pct / 100));
        await pool.query(
          `INSERT INTO ecom_pricing_tiers
           (id, product_id, min_quantity, max_quantity, unit_price, discount_percent, label)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE unit_price = VALUES(unit_price)`,
          [id, p.id, t.min, t.max, unitPrice, t.pct, t.label]
        );
        count++;
      }
    }

    res.json({ success: true, message: `${count} paliers créés pour ${products.length} produits` });
  } catch (err) {
    console.error('❌ seed pricing:', err);
    res.status(500).json({ success: false, error: 'Erreur seed' });
  }
});

module.exports = router;
