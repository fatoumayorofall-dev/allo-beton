/**
 * Migration : ajouter le système de tracking livraison (Yango-like)
 * - Colonnes tracking sur ecom_orders
 * - Table ecom_drivers (livreurs)
 * - Table ecom_order_status_history (historique des statuts)
 * Compatible MySQL 5.7 — pas de ALTER TABLE IF NOT EXISTS COLUMN.
 */

const { pool } = require('../config/database');

async function columnExists(table, column) {
  const [[{ db }]] = await pool.query('SELECT DATABASE() AS db');
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [db, table, column]
  );
  return rows[0].cnt > 0;
}

async function addColumnIfMissing(table, column, definition) {
  if (await columnExists(table, column)) return;
  await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  console.log(`  + ${table}.${column}`);
}

async function migrate() {
  console.log('🚚 Migration tracking livraison...');

  // ─── 1) Colonnes tracking sur ecom_orders ──────────────────────────
  const orderCols = [
    ['delivery_lat',           'DECIMAL(10,7) DEFAULT NULL'],
    ['delivery_lng',           'DECIMAL(10,7) DEFAULT NULL'],
    ['driver_id',              'VARCHAR(36) DEFAULT NULL'],
    ['tracking_token',         'VARCHAR(64) DEFAULT NULL'],
    ['estimated_delivery_at',  'TIMESTAMP NULL DEFAULT NULL'],
    ['picked_up_at',           'TIMESTAMP NULL DEFAULT NULL'],
    ['delivered_at',           'TIMESTAMP NULL DEFAULT NULL'],
    ['cancelled_at',           'TIMESTAMP NULL DEFAULT NULL'],
    ['cancellation_reason',    'TEXT DEFAULT NULL'],
  ];
  for (const [col, def] of orderCols) {
    await addColumnIfMissing('ecom_orders', col, def);
  }
  // Index unique sur tracking_token
  try {
    await pool.query('CREATE UNIQUE INDEX idx_orders_tracking_token ON ecom_orders(tracking_token)');
    console.log('  + ecom_orders.idx_orders_tracking_token');
  } catch (e) { /* déjà existe */ }
  try {
    await pool.query('CREATE INDEX idx_orders_driver ON ecom_orders(driver_id)');
    console.log('  + ecom_orders.idx_orders_driver');
  } catch (e) { /* déjà existe */ }

  // ─── 2) Table ecom_drivers ─────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ecom_drivers (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      phone VARCHAR(20) NOT NULL UNIQUE,
      email VARCHAR(120) DEFAULT NULL,
      vehicle_type ENUM('camion', 'moto', 'fourgon', 'voiture') DEFAULT 'camion',
      vehicle_plate VARCHAR(20) DEFAULT NULL,
      vehicle_label VARCHAR(120) DEFAULT NULL,
      avatar_url TEXT DEFAULT NULL,
      tracking_token VARCHAR(64) UNIQUE NOT NULL,
      current_lat DECIMAL(10,7) DEFAULT NULL,
      current_lng DECIMAL(10,7) DEFAULT NULL,
      last_position_at TIMESTAMP NULL DEFAULT NULL,
      is_active TINYINT(1) DEFAULT 1,
      is_available TINYINT(1) DEFAULT 1,
      rating DECIMAL(3,2) DEFAULT 5.00,
      total_deliveries INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_drivers_phone (phone),
      INDEX idx_drivers_active (is_active, is_available)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('  ✓ ecom_drivers');

  // ─── 3) Table ecom_order_status_history ────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ecom_order_status_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id VARCHAR(36) NOT NULL,
      status VARCHAR(40) NOT NULL,
      note TEXT DEFAULT NULL,
      changed_by VARCHAR(80) DEFAULT NULL,
      lat DECIMAL(10,7) DEFAULT NULL,
      lng DECIMAL(10,7) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_status_history_order (order_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('  ✓ ecom_order_status_history');

  // ─── 4) Table ecom_driver_positions (historique GPS pour replay) ──
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ecom_driver_positions (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      driver_id VARCHAR(36) NOT NULL,
      order_id VARCHAR(36) DEFAULT NULL,
      lat DECIMAL(10,7) NOT NULL,
      lng DECIMAL(10,7) NOT NULL,
      heading FLOAT DEFAULT NULL,
      speed FLOAT DEFAULT NULL,
      accuracy FLOAT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_positions_driver (driver_id, created_at),
      INDEX idx_positions_order (order_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('  ✓ ecom_driver_positions');

  console.log('✅ Migration tracking terminée');
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(err => { console.error('❌ Erreur migration tracking:', err); process.exit(1); });
}

module.exports = { migrate };
