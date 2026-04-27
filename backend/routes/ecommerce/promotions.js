/**
 * ALLO BÉTON — Promotions / Codes promo e-commerce
 * Endpoints admin (CRUD) + endpoint public (validation)
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../../config/database');
const { authenticateToken, requireAdmin } = require('../../middleware/auth');
const { logAdmin } = require('../../services/adminAuditService');

/* Création table à la volée si absente */
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ecom_promotions (
      id              VARCHAR(36) PRIMARY KEY,
      code            VARCHAR(40) NOT NULL UNIQUE,
      description     VARCHAR(255) DEFAULT NULL,
      discount_type   ENUM('percent','fixed','free_shipping') NOT NULL DEFAULT 'percent',
      discount_value  DECIMAL(12,2) NOT NULL DEFAULT 0,
      min_amount      DECIMAL(12,2) DEFAULT 0,
      max_uses        INT DEFAULT NULL,
      max_uses_per_customer INT DEFAULT NULL,
      starts_at       DATETIME DEFAULT NULL,
      ends_at         DATETIME DEFAULT NULL,
      applies_to      ENUM('all','category','product','customer_type') NOT NULL DEFAULT 'all',
      target_ids      JSON DEFAULT NULL,
      is_active       TINYINT(1) NOT NULL DEFAULT 1,
      uses_count      INT NOT NULL DEFAULT 0,
      created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_code (code),
      INDEX idx_active (is_active, ends_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ecom_promotion_uses (
      id              VARCHAR(36) PRIMARY KEY,
      promotion_id    VARCHAR(36) NOT NULL,
      customer_id     VARCHAR(36) DEFAULT NULL,
      order_id        VARCHAR(36) DEFAULT NULL,
      discount_applied DECIMAL(12,2) NOT NULL DEFAULT 0,
      used_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_promo (promotion_id),
      INDEX idx_customer (customer_id),
      INDEX idx_order (order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

/* ─────────────────────────────────────────────────────
   PUBLIC : valider un code (utilisé par le panier shop)
   ──────────────────────────────────────────────────── */
router.post('/validate', async (req, res) => {
  try {
    await ensureTable();
    const { code, cart_total = 0, customer_id = null, customer_type = null, category_ids = [], product_ids = [] } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Code requis' });

    const [rows] = await pool.query(
      `SELECT * FROM ecom_promotions WHERE code = ? LIMIT 1`,
      [code.trim().toUpperCase()]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Code promo inconnu' });
    }
    const p = rows[0];

    /* Validations */
    if (!p.is_active) return res.status(400).json({ success: false, error: 'Code désactivé' });
    const now = new Date();
    if (p.starts_at && new Date(p.starts_at) > now) {
      return res.status(400).json({ success: false, error: 'Code pas encore valable' });
    }
    if (p.ends_at && new Date(p.ends_at) < now) {
      return res.status(400).json({ success: false, error: 'Code expiré' });
    }
    if (p.max_uses != null && p.uses_count >= p.max_uses) {
      return res.status(400).json({ success: false, error: 'Code épuisé' });
    }
    if (Number(p.min_amount) > Number(cart_total)) {
      return res.status(400).json({
        success: false,
        error: `Montant minimum requis : ${Number(p.min_amount).toLocaleString('fr-FR')} FCFA`
      });
    }
    /* Limite par client */
    if (p.max_uses_per_customer != null && customer_id) {
      const [u] = await pool.query(
        `SELECT COUNT(*) AS n FROM ecom_promotion_uses WHERE promotion_id = ? AND customer_id = ?`,
        [p.id, customer_id]
      );
      if (u[0].n >= p.max_uses_per_customer) {
        return res.status(400).json({ success: false, error: 'Limite d\'utilisation par client atteinte' });
      }
    }
    /* Cible */
    const targets = p.target_ids ? (typeof p.target_ids === 'string' ? JSON.parse(p.target_ids) : p.target_ids) : [];
    if (p.applies_to === 'category' && targets.length > 0 && !category_ids.some(id => targets.includes(id))) {
      return res.status(400).json({ success: false, error: 'Code non applicable à votre panier' });
    }
    if (p.applies_to === 'product' && targets.length > 0 && !product_ids.some(id => targets.includes(id))) {
      return res.status(400).json({ success: false, error: 'Code non applicable à votre panier' });
    }
    if (p.applies_to === 'customer_type' && targets.length > 0 && !targets.includes(customer_type)) {
      return res.status(400).json({ success: false, error: 'Code non applicable à votre type de compte' });
    }

    /* Calcul */
    let discount = 0;
    if (p.discount_type === 'percent') {
      discount = Math.round(Number(cart_total) * (Number(p.discount_value) / 100));
    } else if (p.discount_type === 'fixed') {
      discount = Math.min(Number(p.discount_value), Number(cart_total));
    } else if (p.discount_type === 'free_shipping') {
      discount = 0; // géré au niveau de la livraison
    }

    res.json({
      success: true,
      data: {
        id: p.id, code: p.code, description: p.description,
        discount_type: p.discount_type, discount_value: Number(p.discount_value),
        discount_amount: discount, free_shipping: p.discount_type === 'free_shipping'
      }
    });
  } catch (e) {
    console.error('Erreur validate promo:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/* ─────────────────────────────────────────────────────
   ADMIN : CRUD promotions
   ──────────────────────────────────────────────────── */
router.use(authenticateToken, requireAdmin);

router.get('/', async (req, res) => {
  try {
    await ensureTable();
    const [rows] = await pool.query(
      `SELECT * FROM ecom_promotions ORDER BY created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('Erreur liste promotions:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

router.post('/', async (req, res) => {
  try {
    await ensureTable();
    const {
      code, description, discount_type, discount_value,
      min_amount, max_uses, max_uses_per_customer,
      starts_at, ends_at, applies_to, target_ids, is_active
    } = req.body;

    if (!code || !discount_type || discount_value == null) {
      return res.status(400).json({ success: false, error: 'code, discount_type et discount_value requis' });
    }
    const id = uuidv4();
    await pool.query(
      `INSERT INTO ecom_promotions
        (id, code, description, discount_type, discount_value, min_amount,
         max_uses, max_uses_per_customer, starts_at, ends_at,
         applies_to, target_ids, is_active)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id, String(code).trim().toUpperCase(), description || null,
        discount_type, discount_value, min_amount || 0,
        max_uses || null, max_uses_per_customer || null,
        starts_at || null, ends_at || null,
        applies_to || 'all',
        target_ids ? JSON.stringify(target_ids) : null,
        is_active === false ? 0 : 1,
      ]
    );
    const [rows] = await pool.query(`SELECT * FROM ecom_promotions WHERE id = ?`, [id]);
    logAdmin(req, 'create', 'promotion', id, { code: rows[0].code, discount_type, discount_value });
    res.status(201).json({ success: true, data: rows[0] });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: 'Ce code existe déjà' });
    }
    console.error('Erreur création promotion:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const fields = [
      'code','description','discount_type','discount_value','min_amount',
      'max_uses','max_uses_per_customer','starts_at','ends_at',
      'applies_to','target_ids','is_active'
    ];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        if (f === 'code') {
          updates.push('code = ?');
          params.push(String(req.body.code).trim().toUpperCase());
        } else if (f === 'target_ids') {
          updates.push('target_ids = ?');
          params.push(req.body.target_ids ? JSON.stringify(req.body.target_ids) : null);
        } else if (f === 'is_active') {
          updates.push('is_active = ?');
          params.push(req.body.is_active ? 1 : 0);
        } else {
          updates.push(`${f} = ?`);
          params.push(req.body[f]);
        }
      }
    }
    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'Aucun champ à mettre à jour' });
    }
    params.push(req.params.id);
    await pool.query(
      `UPDATE ecom_promotions SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    const [rows] = await pool.query(`SELECT * FROM ecom_promotions WHERE id = ?`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'Promotion introuvable' });
    logAdmin(req, 'update', 'promotion', req.params.id, { changes: Object.keys(req.body) });
    res.json({ success: true, data: rows[0] });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: 'Ce code existe déjà' });
    }
    console.error('Erreur update promotion:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM ecom_promotions WHERE id = ?`, [req.params.id]);
    logAdmin(req, 'delete', 'promotion', req.params.id);
    res.json({ success: true });
  } catch (e) {
    console.error('Erreur delete promotion:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/* Stats : nombre d'utilisations + montant total remisé */
router.get('/:id/stats', async (req, res) => {
  try {
    const [stats] = await pool.query(
      `SELECT COUNT(*) AS total_uses, COALESCE(SUM(discount_applied), 0) AS total_discount
       FROM ecom_promotion_uses WHERE promotion_id = ?`,
      [req.params.id]
    );
    res.json({ success: true, data: stats[0] });
  } catch (e) {
    console.error('Erreur stats promotion:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

module.exports = router;
