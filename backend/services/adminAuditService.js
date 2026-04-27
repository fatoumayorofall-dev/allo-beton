/**
 * ALLO BÉTON — Service d'audit des actions admin
 * Trace toute action sensible (CRUD, validation paiement, modération…)
 * dans la table `ecom_admin_logs`.
 */
const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

let _tableReady = false;

async function ensureTable() {
  if (_tableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ecom_admin_logs (
      id              VARCHAR(36) PRIMARY KEY,
      admin_id        VARCHAR(36) DEFAULT NULL,
      admin_email     VARCHAR(150) DEFAULT NULL,
      admin_role      VARCHAR(40) DEFAULT NULL,
      action          VARCHAR(80) NOT NULL,
      resource_type   VARCHAR(60) NOT NULL,
      resource_id     VARCHAR(80) DEFAULT NULL,
      details         JSON DEFAULT NULL,
      ip_address      VARCHAR(45) DEFAULT NULL,
      user_agent      VARCHAR(255) DEFAULT NULL,
      created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_admin (admin_id),
      INDEX idx_resource (resource_type, resource_id),
      INDEX idx_action (action),
      INDEX idx_date (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  _tableReady = true;
}

/**
 * Log une action admin.
 *
 * @param {object} req                 - Requête Express (req.user attendu)
 * @param {string} action              - 'create' | 'update' | 'delete' | 'validate' | …
 * @param {string} resourceType        - 'product' | 'order' | 'customer' | 'promotion' | 'review' | 'payment' | 'settings' | …
 * @param {string|null} resourceId     - ID de la ressource concernée
 * @param {object|null} details        - Données additionnelles (avant/après, montant, raison…)
 */
async function logAdmin(req, action, resourceType, resourceId = null, details = null) {
  try {
    await ensureTable();
    const u = req.user || {};
    await pool.query(
      `INSERT INTO ecom_admin_logs
        (id, admin_id, admin_email, admin_role, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        uuidv4(),
        u.id || u.userId || null,
        u.email || null,
        u.role || null,
        action,
        resourceType,
        resourceId ? String(resourceId).slice(0, 80) : null,
        details ? JSON.stringify(details) : null,
        (req.headers?.['x-forwarded-for'] || req.ip || '').split(',')[0].trim().slice(0, 45) || null,
        (req.headers?.['user-agent'] || '').slice(0, 255) || null,
      ]
    );
  } catch (e) {
    // Ne JAMAIS faire crasher la route métier sur un problème d'audit
    console.error('[adminAudit]', e.message);
  }
}

/**
 * Liste paginée des logs (pour l'onglet "Journal" admin).
 */
async function listLogs({ page = 1, limit = 50, action, resourceType, adminId } = {}) {
  await ensureTable();
  const where = [];
  const params = [];
  if (action)       { where.push('action = ?');         params.push(action); }
  if (resourceType) { where.push('resource_type = ?');  params.push(resourceType); }
  if (adminId)      { where.push('admin_id = ?');       params.push(adminId); }
  const sql = `
    SELECT * FROM ecom_admin_logs
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;
  params.push(parseInt(limit, 10), (parseInt(page, 10) - 1) * parseInt(limit, 10));
  const [rows] = await pool.query(sql, params);
  const [c] = await pool.query(
    `SELECT COUNT(*) AS n FROM ecom_admin_logs ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`,
    params.slice(0, where.length)
  );
  return { rows, total: c[0].n };
}

module.exports = { logAdmin, listLogs, ensureTable };
