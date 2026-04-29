/**
 * Migration : colonnes manquantes dans les tables commandes e-commerce
 * Compatible MySQL 5.7 — vérification colonne par colonne
 */
const { pool } = require('../config/database');

async function colExists(table, col) {
  const [[{ db }]] = await pool.query('SELECT DATABASE() AS db');
  const [r] = await pool.query(
    `SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [db, table, col]
  );
  return r[0].n > 0;
}

async function addCol(table, col, def) {
  if (await colExists(table, col)) return;
  await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${def}`);
  console.log(`  + ${table}.${col}`);
}

async function migrate() {
  console.log('📦 Migration schéma commandes e-commerce...');

  // ── ecom_orders : colonnes manquantes ──────────────────────────────
  const orderCols = [
    ['shipping_company',  'VARCHAR(255) DEFAULT NULL'],
    ['coupon_code',       'VARCHAR(50)  DEFAULT NULL'],
    ['ip_address',        'VARCHAR(45)  DEFAULT NULL'],
    ['user_agent',        'TEXT         DEFAULT NULL'],
    ['shipped_at',        'TIMESTAMP NULL DEFAULT NULL'],
    ['cancelled_at',      'TIMESTAMP NULL DEFAULT NULL'],
    ['cancelled_reason',  'TEXT         DEFAULT NULL'],
    ['delivered_at',      'TIMESTAMP NULL DEFAULT NULL'],
    // colonnes tracking (au cas où migrate_tracking.js ne s'est pas exécuté)
    ['delivery_lat',          'DECIMAL(10,7) DEFAULT NULL'],
    ['delivery_lng',          'DECIMAL(10,7) DEFAULT NULL'],
    ['driver_id',             'VARCHAR(36)   DEFAULT NULL'],
    ['tracking_token',        'VARCHAR(64)   DEFAULT NULL'],
    ['estimated_delivery_at', 'TIMESTAMP NULL DEFAULT NULL'],
    ['picked_up_at',          'TIMESTAMP NULL DEFAULT NULL'],
    ['cancellation_reason',   'TEXT DEFAULT NULL'],
  ];
  for (const [col, def] of orderCols) {
    await addCol('ecom_orders', col, def);
  }

  // ── ecom_order_items : cost_price ──────────────────────────────────
  await addCol('ecom_order_items', 'cost_price', 'DECIMAL(15,2) DEFAULT NULL');

  // ── ecom_order_status_history : s'assurer que la table a le bon schéma ──
  // orders.js insère avec id=UUID VARCHAR(36) + comment TEXT
  // Si la table n'existe pas encore, la créer avec le bon schéma
  const [[{ db2 }]] = await pool.query('SELECT DATABASE() AS db2');
  const [tables] = await pool.query(`SHOW TABLES LIKE 'ecom_order_status_history'`);
  if (tables.length === 0) {
    await pool.query(`
      CREATE TABLE ecom_order_status_history (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        order_id VARCHAR(36) NOT NULL,
        status VARCHAR(50) NOT NULL,
        comment TEXT DEFAULT NULL,
        created_by VARCHAR(36) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_osh_order (order_id),
        INDEX idx_osh_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  + table ecom_order_status_history (schéma UUID)');
  } else {
    // Vérifier si la colonne id est bien VARCHAR (et non INT auto_increment)
    const [idCol] = await pool.query(
      `SELECT DATA_TYPE, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ecom_order_status_history' AND COLUMN_NAME = 'id'`
    );
    if (idCol.length > 0 && idCol[0].DATA_TYPE === 'int') {
      // La table existe avec INT id — la recréer avec UUID
      console.log('  ⚠ ecom_order_status_history: id=INT détecté, migration vers UUID...');
      await pool.query('DROP TABLE ecom_order_status_history');
      await pool.query(`
        CREATE TABLE ecom_order_status_history (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          order_id VARCHAR(36) NOT NULL,
          status VARCHAR(50) NOT NULL,
          comment TEXT DEFAULT NULL,
          created_by VARCHAR(36) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_osh_order (order_id),
          INDEX idx_osh_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('  + ecom_order_status_history recréée avec id=UUID');
    }
    // Ajouter colonne comment si manquante (cas où note!=comment)
    await addCol('ecom_order_status_history', 'comment',     'TEXT DEFAULT NULL');
    await addCol('ecom_order_status_history', 'created_by',  'VARCHAR(36) DEFAULT NULL');
  }

  console.log('✅ Migration schéma commandes terminée');
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(err => { console.error('❌', err.message); process.exit(1); });
}
module.exports = { migrate };
