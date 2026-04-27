const { pool } = require('../config/database');

// Créer la table audit_logs au démarrage
(async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        user_name VARCHAR(255) DEFAULT '',
        action ENUM('create', 'read', 'update', 'delete') NOT NULL,
        module VARCHAR(50) NOT NULL,
        resource_id VARCHAR(100) DEFAULT NULL,
        description TEXT NOT NULL,
        details JSON DEFAULT NULL,
        ip_address VARCHAR(45) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_module (module),
        INDEX idx_action (action),
        INDEX idx_created (created_at),
        INDEX idx_module_action (module, action)
      )
    `);
    console.log('✅ Table audit_logs créée/vérifiée');
  } catch (err) {
    console.error('❌ Erreur création table audit_logs:', err.message);
  }
})();

/**
 * Enregistre une action dans le journal d'audit
 * @param {Object} params
 * @param {Object} params.user - req.user (id, email, first_name, last_name)
 * @param {string} params.action - 'create' | 'read' | 'update' | 'delete'
 * @param {string} params.module - Nom du module (sales, customers, etc.)
 * @param {string} [params.resourceId] - ID de la ressource concernée
 * @param {string} params.description - Description lisible de l'action
 * @param {Object} [params.details] - Détails supplémentaires (données avant/après)
 * @param {string} [params.ip] - Adresse IP
 */
async function logAction({ user, action, module, resourceId, description, details, ip }) {
  try {
    const userName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;
    await pool.execute(
      'INSERT INTO audit_logs (user_id, user_email, user_name, action, module, resource_id, description, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        user.id,
        user.email,
        userName,
        action,
        module,
        resourceId || null,
        description,
        details ? JSON.stringify(details) : null,
        ip || null
      ]
    );
  } catch (err) {
    // Ne pas bloquer l'opération si l'audit échoue
    console.error('⚠️ Erreur audit log:', err.message);
  }
}

/**
 * Middleware Express qui ajoute req.audit() pour faciliter le logging
 * ET intercepte automatiquement les réponses réussies pour loguer les opérations CRUD
 */
function auditMiddleware(req, res, next) {
  // Fonction manuelle pour les cas spécifiques
  req.audit = (action, module, description, resourceId, details) => {
    if (!req.user) return;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
    return logAction({ user: req.user, action, module, resourceId, description, details, ip });
  };

  // Interception automatique des réponses
  const originalJson = res.json.bind(res);
  res.json = function(body) {
    // Ne loguer que les réponses réussies avec un user authentifié
    if (req.user && body && body.success === true && req.method !== 'GET') {
      const moduleName = getModuleFromPath(req.originalUrl);
      const action = getActionFromMethod(req.method);
      const resourceId = req.params?.id || body?.data?.id || null;

      if (moduleName && action) {
        const desc = buildDescription(action, moduleName, req, body);
        const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
        // Fire and forget
        logAction({
          user: req.user,
          action,
          module: moduleName,
          resourceId: resourceId ? String(resourceId) : null,
          description: desc,
          ip
        }).catch(() => {});
      }
    }
    return originalJson(body);
  };

  next();
}

// Détermine le module à partir de l'URL
function getModuleFromPath(url) {
  const MODULE_MAP = {
    '/api/sales': 'sales',
    '/api/customers': 'customers',
    '/api/products': 'products',
    '/api/suppliers': 'suppliers',
    '/api/payments': 'payments',
    '/api/auth/users': 'users',
    '/api/banks': 'banks',
    '/api/partners': 'partners',
    '/api/employees': 'hr',
    '/api/salaries': 'hr',
    '/api/salary-advances': 'hr',
    '/api/ecommerce': 'ecommerce',
    '/api/cash': 'cash',
    '/api/settings': 'settings',
    '/api/categories': 'products',
    '/api/invoices': 'sales',
    '/api/delivery-notes': 'transport',
    '/api/purchase-orders': 'suppliers',
    '/api/quotas': 'customers',
    '/api/comptabilite': 'comptabilite',
    '/api/accounting': 'comptabilite',
  };
  // Trouver le match le plus long
  const sorted = Object.keys(MODULE_MAP).sort((a, b) => b.length - a.length);
  for (const prefix of sorted) {
    if (url.startsWith(prefix)) return MODULE_MAP[prefix];
  }
  return null;
}

// Traduit la méthode HTTP en action CRUD
function getActionFromMethod(method) {
  switch (method) {
    case 'POST': return 'create';
    case 'PUT': case 'PATCH': return 'update';
    case 'DELETE': return 'delete';
    default: return null;
  }
}

// Construit une description lisible
const MODULE_LABELS = {
  sales: 'Vente', customers: 'Client', products: 'Produit',
  suppliers: 'Fournisseur', payments: 'Paiement', users: 'Utilisateur',
  banks: 'Banque', partners: 'Partenaire', hr: 'RH',
  ecommerce: 'E-commerce', cash: 'Caisse', settings: 'Paramètres',
  transport: 'Bon de transport',
};

const ACTION_LABELS = { create: 'Création', update: 'Modification', delete: 'Suppression' };

function buildDescription(action, module, req, body) {
  const modLabel = MODULE_LABELS[module] || module;
  const actLabel = ACTION_LABELS[action] || action;
  const id = req.params?.id || body?.data?.id || body?.data?.sale_number || '';
  const extra = [];

  // Enrichir la description avec des infos contextuelles
  if (body?.data?.sale_number) extra.push(`N° ${body.data.sale_number}`);
  if (body?.data?.name) extra.push(body.data.name);
  if (body?.data?.email) extra.push(body.data.email);
  if (req.body?.name) extra.push(req.body.name);
  if (req.body?.role) extra.push(`rôle: ${req.body.role}`);

  const suffix = extra.length > 0 ? ` (${extra.join(', ')})` : id ? ` #${id}` : '';
  return `${actLabel} ${modLabel}${suffix}`;
}

/**
 * Récupère les logs d'audit avec pagination et filtres
 */
async function getAuditLogs({ page = 1, limit = 50, userId, module, action, startDate, endDate, search }) {
  let where = '1=1';
  const params = [];

  if (userId) { where += ' AND user_id = ?'; params.push(userId); }
  if (module) { where += ' AND module = ?'; params.push(module); }
  if (action) { where += ' AND action = ?'; params.push(action); }
  if (startDate) { where += ' AND created_at >= ?'; params.push(startDate); }
  if (endDate) { where += ' AND created_at <= ?'; params.push(endDate); }
  if (search) { where += ' AND (description LIKE ? OR user_name LIKE ? OR user_email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

  const offset = (page - 1) * limit;

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) as total FROM audit_logs WHERE ${where}`,
    params
  );

  const [rows] = await pool.execute(
    `SELECT * FROM audit_logs WHERE ${where} ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
    params
  );

  return {
    logs: rows,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / limit)
  };
}

/**
 * Stats résumées pour le dashboard admin
 */
async function getAuditStats() {
  const [todayStats] = await pool.execute(`
    SELECT action, COUNT(*) as count 
    FROM audit_logs 
    WHERE DATE(created_at) = CURDATE() 
    GROUP BY action
  `);

  const [topUsers] = await pool.execute(`
    SELECT user_id, user_name, user_email, COUNT(*) as action_count 
    FROM audit_logs 
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY user_id, user_name, user_email 
    ORDER BY action_count DESC 
    LIMIT 5
  `);

  const [topModules] = await pool.execute(`
    SELECT module, COUNT(*) as count 
    FROM audit_logs 
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY module 
    ORDER BY count DESC 
    LIMIT 10
  `);

  const [recent] = await pool.execute(`
    SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10
  `);

  return { todayStats, topUsers, topModules, recent };
}

module.exports = { logAction, auditMiddleware, getAuditLogs, getAuditStats };
