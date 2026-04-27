/**
 * ALLO BÉTON - INITIALISATION TABLES E-COMMERCE
 * Ce script vérifie si les tables e-commerce existent et les crée si nécessaire
 */

const { pool } = require('../config/database');

const ECOMMERCE_TABLES_SQL = `
-- ============================================================
-- TABLES E-COMMERCE ALLO BÉTON
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Table clients e-commerce
CREATE TABLE IF NOT EXISTS ecom_customers (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) DEFAULT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  company_name VARCHAR(255),
  company_ninea VARCHAR(50),
  company_rc VARCHAR(50),
  customer_type ENUM('particulier', 'professionnel', 'entreprise') DEFAULT 'particulier',
  default_address_id VARCHAR(36),
  credit_limit DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  payment_terms INT DEFAULT 0,
  discount_rate DECIMAL(5,2) DEFAULT 0,
  is_verified TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  email_verified_at TIMESTAMP NULL,
  last_login_at TIMESTAMP NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table adresses clients
CREATE TABLE IF NOT EXISTS ecom_addresses (
  id VARCHAR(36) PRIMARY KEY,
  customer_id VARCHAR(36) NOT NULL,
  type ENUM('billing', 'shipping') DEFAULT 'shipping',
  label VARCHAR(50) DEFAULT 'Principal',
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  company VARCHAR(255),
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  region VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(2) DEFAULT 'SN',
  phone VARCHAR(20),
  instructions TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  is_default TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table paniers
CREATE TABLE IF NOT EXISTS ecom_carts (
  id VARCHAR(36) PRIMARY KEY,
  customer_id VARCHAR(36),
  session_id VARCHAR(100),
  status ENUM('active', 'abandoned', 'converted') DEFAULT 'active',
  currency VARCHAR(3) DEFAULT 'XOF',
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  coupon_code VARCHAR(50),
  notes TEXT,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_customer (customer_id),
  INDEX idx_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table lignes panier
CREATE TABLE IF NOT EXISTS ecom_cart_items (
  id VARCHAR(36) PRIMARY KEY,
  cart_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  quantity DECIMAL(12,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(15,2) NOT NULL,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 18.00,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  options JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cart (cart_id),
  INDEX idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table commandes
CREATE TABLE IF NOT EXISTS ecom_orders (
  id VARCHAR(36) PRIMARY KEY,
  order_number VARCHAR(20) NOT NULL UNIQUE,
  customer_id VARCHAR(36) NOT NULL,
  cart_id VARCHAR(36),
  status ENUM('pending', 'confirmed', 'processing', 'ready_for_pickup', 'shipped', 'in_transit', 'delivered', 'completed', 'cancelled', 'refunded') DEFAULT 'pending',
  payment_status ENUM('pending', 'partial', 'paid', 'refunded', 'failed') DEFAULT 'pending',
  currency VARCHAR(3) DEFAULT 'XOF',
  subtotal DECIMAL(15,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 18.00,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  shipping_amount DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  billing_first_name VARCHAR(100),
  billing_last_name VARCHAR(100),
  billing_company VARCHAR(255),
  billing_address VARCHAR(255),
  billing_city VARCHAR(100),
  billing_phone VARCHAR(20),
  billing_email VARCHAR(255),
  shipping_first_name VARCHAR(100),
  shipping_last_name VARCHAR(100),
  shipping_company VARCHAR(255),
  shipping_address VARCHAR(255),
  shipping_city VARCHAR(100),
  shipping_phone VARCHAR(20),
  shipping_instructions TEXT,
  shipping_method VARCHAR(50),
  estimated_delivery DATE,
  delivered_at TIMESTAMP NULL,
  coupon_code VARCHAR(50),
  customer_notes TEXT,
  admin_notes TEXT,
  ip_address VARCHAR(45),
  source VARCHAR(50) DEFAULT 'web',
  confirmed_at TIMESTAMP NULL,
  shipped_at TIMESTAMP NULL,
  cancelled_at TIMESTAMP NULL,
  cancelled_reason VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order_number (order_number),
  INDEX idx_customer (customer_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table lignes commandes
CREATE TABLE IF NOT EXISTS ecom_order_items (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36),
  sku VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(500),
  unit VARCHAR(20),
  quantity DECIMAL(12,2) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  cost_price DECIMAL(12,2),
  discount_amount DECIMAL(12,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 18.00,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  subtotal DECIMAL(15,2) NOT NULL,
  total DECIMAL(15,2) NOT NULL,
  options JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table paiements
CREATE TABLE IF NOT EXISTS ecom_payments (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  customer_id VARCHAR(36) NOT NULL,
  payment_number VARCHAR(20) NOT NULL UNIQUE,
  method ENUM('wave', 'orange_money', 'free_money', 'card', 'bank_transfer', 'cash', 'credit') NOT NULL,
  provider VARCHAR(50),
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'XOF',
  status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded') DEFAULT 'pending',
  transaction_id VARCHAR(100),
  reference VARCHAR(100),
  provider_response JSON,
  paid_at TIMESTAMP NULL,
  failed_at TIMESTAMP NULL,
  failure_reason VARCHAR(500),
  refund_amount DECIMAL(15,2) DEFAULT 0,
  refunded_at TIMESTAMP NULL,
  metadata JSON,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order (order_id),
  INDEX idx_customer (customer_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table factures
CREATE TABLE IF NOT EXISTS ecom_invoices (
  id VARCHAR(36) PRIMARY KEY,
  invoice_number VARCHAR(30) NOT NULL UNIQUE,
  order_id VARCHAR(36) NOT NULL,
  customer_id VARCHAR(36) NOT NULL,
  type ENUM('invoice', 'proforma', 'credit_note') DEFAULT 'invoice',
  status ENUM('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled') DEFAULT 'draft',
  currency VARCHAR(3) DEFAULT 'XOF',
  subtotal DECIMAL(15,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 18.00,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  shipping_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  customer_address TEXT,
  customer_ninea VARCHAR(50),
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMP NULL,
  pdf_path VARCHAR(500),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_invoice_number (invoice_number),
  INDEX idx_order (order_id),
  INDEX idx_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table séquences pour numérotation
CREATE TABLE IF NOT EXISTS ecom_sequences (
  name VARCHAR(50) PRIMARY KEY,
  prefix VARCHAR(10) NOT NULL,
  current_value INT NOT NULL DEFAULT 0,
  padding INT DEFAULT 6,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialiser les séquences
INSERT IGNORE INTO ecom_sequences (name, prefix, current_value) VALUES
  ('order', 'CMD', 0),
  ('invoice', 'FAC', 0),
  ('payment', 'PAY', 0);

SET FOREIGN_KEY_CHECKS = 1;
`;

/**
 * Vérifie si les tables e-commerce existent
 */
async function checkEcommerceTablesExist() {
  try {
    const [tables] = await pool.query("SHOW TABLES LIKE 'ecom_customers'");
    return tables.length > 0;
  } catch (error) {
    console.error('Erreur vérification tables:', error.message);
    return false;
  }
}

/**
 * Crée les tables e-commerce
 */
async function createEcommerceTables() {
  try {
    // Séparer les requêtes par le délimiteur ;
    const statements = ECOMMERCE_TABLES_SQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.length > 5) {
        try {
          await pool.query(statement);
        } catch (err) {
          // Ignorer les erreurs de table déjà existante
          if (!err.message.includes('already exists')) {
            console.log(`Note: ${err.message.substring(0, 100)}`);
          }
        }
      }
    }

    console.log('✅ Tables e-commerce créées avec succès');
    return true;
  } catch (error) {
    console.error('❌ Erreur création tables e-commerce:', error.message);
    return false;
  }
}

/**
 * Initialise les tables e-commerce si elles n'existent pas
 */
async function initEcommerceTables() {
  console.log('🔍 Vérification des tables e-commerce...');

  const tablesExist = await checkEcommerceTablesExist();

  if (tablesExist) {
    console.log('✅ Tables e-commerce déjà présentes');
    return true;
  }

  console.log('📦 Création des tables e-commerce...');
  return await createEcommerceTables();
}

module.exports = {
  initEcommerceTables,
  checkEcommerceTablesExist,
  createEcommerceTables
};

// Exécuter si appelé directement
if (require.main === module) {
  initEcommerceTables()
    .then(() => {
      console.log('✅ Initialisation terminée');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Erreur:', err);
      process.exit(1);
    });
}
