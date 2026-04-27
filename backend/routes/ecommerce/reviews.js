/**
 * ALLO BÉTON — Avis clients (product reviews)
 * Table ecom_reviews avec modération admin
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const pool = require('../../db');
const { authenticateCustomer } = require('../../middleware/ecommerceAuth');
const { authenticateToken, requireRole } = require('../../middleware/auth');

// Rate limit création d'avis : 5 / heure / IP
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Trop d\'avis soumis. Réessayez plus tard.' },
});

/**
 * Initialise la table ecom_reviews si absente (appelé au boot)
 */
async function ensureTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ecom_reviews (
        id VARCHAR(36) PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        customer_id VARCHAR(36) NULL,
        customer_name VARCHAR(100) NOT NULL,
        customer_email VARCHAR(150) NULL,
        rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
        title VARCHAR(200) NULL,
        comment TEXT NOT NULL,
        verified_purchase TINYINT(1) DEFAULT 0,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        helpful_count INT DEFAULT 0,
        admin_reply TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP NULL,
        INDEX idx_product (product_id, status),
        INDEX idx_customer (customer_id),
        INDEX idx_status (status, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (e) {
    console.error('❌ ensureTable ecom_reviews:', e.message);
  }
}
ensureTable();

// ============================================================
// GET /:product_id - liste des avis approuvés d'un produit
// ============================================================
router.get('/:product_id', async (req, res) => {
  try {
    const { product_id } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const [rows] = await pool.query(
      `SELECT id, customer_name, rating, title, comment, verified_purchase,
              helpful_count, admin_reply, created_at
       FROM ecom_reviews
       WHERE product_id = ? AND status = 'approved'
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [product_id, limit, offset]
    );

    // Stats
    const [[stats]] = await pool.query(
      `SELECT
         COUNT(*) AS total,
         AVG(rating) AS avg_rating,
         SUM(rating = 5) AS star5,
         SUM(rating = 4) AS star4,
         SUM(rating = 3) AS star3,
         SUM(rating = 2) AS star2,
         SUM(rating = 1) AS star1
       FROM ecom_reviews
       WHERE product_id = ? AND status = 'approved'`,
      [product_id]
    );

    res.json({
      success: true,
      data: rows,
      stats: {
        total: Number(stats.total) || 0,
        average: stats.avg_rating ? Number(parseFloat(stats.avg_rating).toFixed(1)) : 0,
        distribution: {
          5: Number(stats.star5) || 0,
          4: Number(stats.star4) || 0,
          3: Number(stats.star3) || 0,
          2: Number(stats.star2) || 0,
          1: Number(stats.star1) || 0,
        },
      },
    });
  } catch (err) {
    console.error('❌ GET /reviews:', err);
    res.status(500).json({ success: false, error: 'Erreur lors du chargement des avis' });
  }
});

// ============================================================
// POST / - créer un avis (auth optionnelle, anonyme ok)
// ============================================================
router.post('/', createLimiter, async (req, res) => {
  try {
    const { product_id, customer_name, customer_email, rating, title, comment } = req.body;

    if (!product_id || !customer_name || !rating || !comment) {
      return res.status(400).json({
        success: false,
        error: 'Champs requis : product_id, customer_name, rating, comment',
      });
    }
    const r = parseInt(rating, 10);
    if (isNaN(r) || r < 1 || r > 5) {
      return res.status(400).json({ success: false, error: 'Note invalide (1-5)' });
    }
    if (String(comment).trim().length < 10) {
      return res.status(400).json({ success: false, error: 'Commentaire trop court (min. 10 caractères)' });
    }
    if (String(customer_name).trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Nom invalide' });
    }

    // Vérifie que le produit existe
    const [[product]] = await pool.query(
      'SELECT id FROM ecom_products WHERE id = ? AND is_active = 1',
      [product_id]
    );
    if (!product) {
      return res.status(404).json({ success: false, error: 'Produit introuvable' });
    }

    // Identifie un customer éventuel via JWT (optionnel)
    let customer_id = null;
    let verified_purchase = 0;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'allo-beton-secret-key-2024');
        customer_id = decoded.customer_id || null;
        if (customer_id) {
          // Vérifie si le client a déjà acheté ce produit
          const [[purchase]] = await pool.query(
            `SELECT 1 FROM ecom_order_items oi
             JOIN ecom_orders o ON o.id = oi.order_id
             WHERE o.customer_id = ? AND oi.product_id = ?
             LIMIT 1`,
            [customer_id, product_id]
          );
          if (purchase) verified_purchase = 1;
        }
      } catch { /* token invalide ou absent, on continue en anonyme */ }
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO ecom_reviews
       (id, product_id, customer_id, customer_name, customer_email, rating, title, comment, verified_purchase, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        id,
        product_id,
        customer_id,
        String(customer_name).trim().substring(0, 100),
        customer_email ? String(customer_email).trim().substring(0, 150) : null,
        r,
        title ? String(title).trim().substring(0, 200) : null,
        String(comment).trim(),
        verified_purchase,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Merci pour votre avis ! Il sera publié après modération.',
      data: { id, status: 'pending' },
    });
  } catch (err) {
    console.error('❌ POST /reviews:', err);
    res.status(500).json({ success: false, error: 'Erreur lors de l\'envoi de l\'avis' });
  }
});

// ============================================================
// POST /:id/helpful - marquer un avis comme utile
// ============================================================
router.post('/:id/helpful', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      'UPDATE ecom_reviews SET helpful_count = helpful_count + 1 WHERE id = ? AND status = "approved"',
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('❌ POST /reviews/:id/helpful:', err);
    res.status(500).json({ success: false });
  }
});

// ============================================================
// ADMIN — gestion modération
// ============================================================

// Liste des avis (tous statuts) pour modération
router.get('/admin/all', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { status, limit: limitQ } = req.query;
    const limit = Math.min(parseInt(limitQ, 10) || 50, 200);

    const validStatuses = ['pending', 'approved', 'rejected'];
    const filterByStatus = status && validStatuses.includes(status);

    const whereClause = filterByStatus ? 'WHERE r.status = ?' : '';
    const params = filterByStatus ? [status, limit] : [limit];

    const [rows] = await pool.query(
      `SELECT r.*, p.name AS product_name, p.slug AS product_slug
       FROM ecom_reviews r
       LEFT JOIN ecom_products p ON p.id = r.product_id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT ?`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('❌ admin/all reviews:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Approuver / rejeter un avis
router.patch('/admin/:id', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_reply } = req.body;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Statut invalide' });
    }

    await pool.query(
      `UPDATE ecom_reviews
       SET status = ?, admin_reply = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [status, admin_reply || null, id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('❌ PATCH /reviews/admin/:id:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Supprimer un avis
router.delete('/admin/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM ecom_reviews WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ DELETE /reviews/admin/:id:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

module.exports = router;
