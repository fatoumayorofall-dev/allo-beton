/**
 * ALLO BÉTON - Création de toutes les tables e-commerce
 * Exécuter: node scripts/create_all_ecom_tables.js
 */

const { pool } = require('../config/database');

async function createAllTables() {
  console.log('🔧 Création des tables e-commerce...\n');

  try {
    // 0a. ecom_categories
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ecom_categories (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        image_url VARCHAR(500),
        parent_id VARCHAR(36) DEFAULT NULL,
        sort_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_slug (slug),
        INDEX idx_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ ecom_categories');

    // 0b. ecom_products
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ecom_products (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        sku VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        category_id VARCHAR(36),
        description TEXT,
        short_description VARCHAR(500),
        price DECIMAL(12,2) NOT NULL DEFAULT 0,
        compare_price DECIMAL(12,2) DEFAULT NULL,
        compare_at_price DECIMAL(12,2) DEFAULT NULL,
        cost_price DECIMAL(12,2) DEFAULT NULL,
        unit VARCHAR(20) NOT NULL DEFAULT 'unité',
        min_quantity DECIMAL(10,2) DEFAULT 1,
        min_order_quantity DECIMAL(10,2) DEFAULT 1,
        step_quantity DECIMAL(10,2) DEFAULT 1,
        stock_quantity DECIMAL(12,2) DEFAULT 0,
        stock_status ENUM('in_stock', 'out_of_stock', 'on_backorder') DEFAULT 'in_stock',
        manage_stock TINYINT(1) DEFAULT 1,
        weight DECIMAL(10,3) DEFAULT NULL,
        image_url VARCHAR(500),
        gallery JSON,
        specifications JSON,
        meta_title VARCHAR(255),
        meta_description VARCHAR(500),
        is_featured TINYINT(1) DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        sort_order INT DEFAULT 0,
        view_count INT DEFAULT 0,
        views INT DEFAULT 0,
        sold_count INT DEFAULT 0,
        sales_count INT DEFAULT 0,
        rating_avg DECIMAL(3,2) DEFAULT 0,
        rating_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sku (sku),
        INDEX idx_slug (slug),
        INDEX idx_category (category_id),
        INDEX idx_active (is_active),
        INDEX idx_featured (is_featured),
        INDEX idx_price (price)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ ecom_products');

    // 1. ecom_customers (déjà créée probablement)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ecom_customers (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20) NOT NULL,
        password_hash VARCHAR(255),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        company_name VARCHAR(255),
        company_ninea VARCHAR(50),
        company_rc VARCHAR(50),
        customer_type ENUM('particulier', 'professionnel', 'entreprise') DEFAULT 'particulier',
        credit_limit DECIMAL(15,2) DEFAULT 0,
        current_balance DECIMAL(15,2) DEFAULT 0,
        payment_terms INT DEFAULT 0,
        discount_rate DECIMAL(5,2) DEFAULT 0,
        is_verified TINYINT(1) DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        last_login_at TIMESTAMP NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_phone (phone)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ ecom_customers');

    // 2. ecom_addresses
    await pool.query(`
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
        is_default TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_customer (customer_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ ecom_addresses');

    // 3. ecom_carts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ecom_carts (
        id VARCHAR(36) PRIMARY KEY,
        customer_id VARCHAR(36),
        session_id VARCHAR(100),
        status ENUM('active', 'abandoned', 'converted') DEFAULT 'active',
        subtotal DECIMAL(15,2) DEFAULT 0,
        tax_amount DECIMAL(15,2) DEFAULT 0,
        discount_amount DECIMAL(15,2) DEFAULT 0,
        total DECIMAL(15,2) DEFAULT 0,
        coupon_code VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_customer (customer_id),
        INDEX idx_session (session_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ ecom_carts');

    // 4. ecom_cart_items
    await pool.query(`
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_cart (cart_id),
        INDEX idx_product (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ ecom_cart_items');

    // 5. ecom_orders
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ecom_orders (
        id VARCHAR(36) PRIMARY KEY,
        order_number VARCHAR(20) NOT NULL UNIQUE,
        customer_id VARCHAR(36) NOT NULL,
        cart_id VARCHAR(36),
        status ENUM('pending', 'confirmed', 'processing', 'ready_for_pickup', 'shipped', 'in_transit', 'delivered', 'completed', 'cancelled', 'refunded') DEFAULT 'pending',
        payment_status ENUM('pending', 'partial', 'paid', 'refunded', 'failed') DEFAULT 'pending',
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
        shipping_address VARCHAR(255),
        shipping_city VARCHAR(100),
        shipping_phone VARCHAR(20),
        shipping_instructions TEXT,
        shipping_method VARCHAR(50),
        customer_notes TEXT,
        admin_notes TEXT,
        source VARCHAR(50) DEFAULT 'web',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_order_number (order_number),
        INDEX idx_customer (customer_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ ecom_orders');

    // 6. ecom_order_items
    await pool.query(`
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
        discount_amount DECIMAL(12,2) DEFAULT 0,
        tax_rate DECIMAL(5,2) DEFAULT 18.00,
        tax_amount DECIMAL(12,2) DEFAULT 0,
        subtotal DECIMAL(15,2) NOT NULL,
        total DECIMAL(15,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_order (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ ecom_order_items');

    // 7. ecom_payments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ecom_payments (
        id VARCHAR(36) PRIMARY KEY,
        order_id VARCHAR(36) NOT NULL,
        customer_id VARCHAR(36) NOT NULL,
        payment_number VARCHAR(20) NOT NULL UNIQUE,
        method ENUM('wave', 'orange_money', 'free_money', 'card', 'bank_transfer', 'cash', 'credit') NOT NULL,
        provider VARCHAR(50),
        amount DECIMAL(15,2) NOT NULL,
        status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded') DEFAULT 'pending',
        transaction_id VARCHAR(100),
        reference VARCHAR(100),
        paid_at TIMESTAMP NULL,
        failure_reason VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_order (order_id),
        INDEX idx_customer (customer_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ ecom_payments');

    // 8. ecom_invoices
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ecom_invoices (
        id VARCHAR(36) PRIMARY KEY,
        invoice_number VARCHAR(30) NOT NULL UNIQUE,
        order_id VARCHAR(36) NOT NULL,
        customer_id VARCHAR(36) NOT NULL,
        type ENUM('invoice', 'proforma', 'credit_note') DEFAULT 'invoice',
        status ENUM('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled') DEFAULT 'draft',
        subtotal DECIMAL(15,2) NOT NULL,
        tax_rate DECIMAL(5,2) DEFAULT 18.00,
        tax_amount DECIMAL(15,2) DEFAULT 0,
        discount_amount DECIMAL(12,2) DEFAULT 0,
        total DECIMAL(15,2) NOT NULL,
        amount_paid DECIMAL(15,2) DEFAULT 0,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255),
        customer_phone VARCHAR(20),
        customer_address TEXT,
        issue_date DATE NOT NULL,
        due_date DATE NOT NULL,
        paid_at TIMESTAMP NULL,
        pdf_path VARCHAR(500),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_order (order_id),
        INDEX idx_customer (customer_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ ecom_invoices');

    // 9. ecom_sequences
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ecom_sequences (
        name VARCHAR(50) PRIMARY KEY,
        prefix VARCHAR(10) NOT NULL,
        current_value INT NOT NULL DEFAULT 0,
        padding INT DEFAULT 6,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      INSERT IGNORE INTO ecom_sequences (name, prefix, current_value) VALUES
      ('order', 'CMD', 0),
      ('invoice', 'FAC', 0),
      ('payment', 'PAY', 0)
    `);
    console.log('✅ ecom_sequences');

    // Vérification finale
    const [tables] = await pool.query("SHOW TABLES LIKE 'ecom_%'");
    console.log('\n📋 Tables e-commerce créées:', tables.length);
    tables.forEach(t => console.log('   -', Object.values(t)[0]));

    console.log('\n✅ Toutes les tables e-commerce ont été créées avec succès!');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

createAllTables();
