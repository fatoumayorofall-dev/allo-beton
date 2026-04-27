/**
 * ALLO BÉTON — Lecture du journal d'audit admin
 */
const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../../middleware/auth');
const { listLogs } = require('../../services/adminAuditService');
const { MATRIX, ROLES } = require('../../config/permissions');

router.use(authenticateToken, requireAdmin);

/* Matrice de permissions (lecture pour l'UI admin) */
router.get('/permissions', (req, res) => {
  res.json({ success: true, data: { roles: ROLES, matrix: MATRIX } });
});

/* ─── Maintenance ─────────────────────────────────────── */

/* GET /api/ecommerce/admin-logs/maintenance/carts — aperçu des paniers à purger */
router.get('/maintenance/carts', async (req, res) => {
  try {
    const { pool } = require('../../config/database');
    const days = parseInt(req.query.days, 10) || 30;

    const [stale] = await pool.query(`
      SELECT COUNT(*) AS cnt, SUM(IFNULL(ci_count.n,0)) AS items
      FROM ecom_carts c
      LEFT JOIN (
        SELECT cart_id, COUNT(*) AS n FROM ecom_cart_items GROUP BY cart_id
      ) ci_count ON ci_count.cart_id = c.id
      WHERE c.customer_id IS NULL
        AND c.updated_at < DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [days]);

    const [empty] = await pool.query(`
      SELECT COUNT(*) AS cnt FROM ecom_carts c
      LEFT JOIN ecom_cart_items ci ON ci.cart_id = c.id
      WHERE ci.id IS NULL AND c.updated_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    const [total] = await pool.query(`SELECT COUNT(*) AS cnt FROM ecom_carts`);

    res.json({
      success: true,
      data: {
        total_carts: total[0].cnt,
        stale_anonymous: stale[0].cnt,
        stale_items: stale[0].items || 0,
        empty_carts: empty[0].cnt,
        days_threshold: days,
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/* DELETE /api/ecommerce/admin-logs/maintenance/carts — purge effective */
router.delete('/maintenance/carts', async (req, res) => {
  try {
    const { pool } = require('../../config/database');
    const days = parseInt(req.query.days, 10) || 30;
    const { logAdmin } = require('../../services/adminAuditService');

    // Collecter les IDs à supprimer
    const [stale] = await pool.query(`
      SELECT c.id FROM ecom_carts c
      WHERE c.customer_id IS NULL
        AND c.updated_at < DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [days]);

    const [empty] = await pool.query(`
      SELECT c.id FROM ecom_carts c
      LEFT JOIN ecom_cart_items ci ON ci.cart_id = c.id
      WHERE ci.id IS NULL AND c.updated_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    const allIds = [...new Set([...stale.map(r => r.id), ...empty.map(r => r.id)])];

    if (allIds.length === 0) {
      return res.json({ success: true, deleted_carts: 0, deleted_items: 0 });
    }

    const ph = allIds.map(() => '?').join(',');
    const [itemsDel] = await pool.query(`DELETE FROM ecom_cart_items WHERE cart_id IN (${ph})`, allIds);
    const [cartsDel] = await pool.query(`DELETE FROM ecom_carts WHERE id IN (${ph})`, allIds);

    logAdmin(req, 'purge', 'cart', null, { deleted_carts: cartsDel.affectedRows, days_threshold: days });

    res.json({
      success: true,
      deleted_carts: cartsDel.affectedRows,
      deleted_items: itemsDel.affectedRows,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/* ─── Logs ──────────────────────────────────────────────── */

router.get('/', async (req, res) => {
  try {
    const { page, limit, action, resourceType, adminId } = req.query;
    const data = await listLogs({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 50,
      action, resourceType, adminId,
    });
    res.json({ success: true, ...data });
  } catch (e) {
    console.error('Erreur listLogs:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

module.exports = router;
