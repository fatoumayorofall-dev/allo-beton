/**
 * ALLO BÉTON - API COMMANDES E-COMMERCE
 * Gestion des commandes clients
 * + Synchronisation automatique avec le système de gestion (sales, customers, invoices)
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../../db');

const { authenticateCustomer } = require('../../middleware/ecommerceAuth');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { sendNotification } = require('../../services/emailService');

// ID de l'utilisateur système pour les enregistrements de gestion
const SYSTEM_ADMIN_ID = '5f47cf1f-de20-4b41-98c4-2524814e6c15';

// ============================================================
// HELPERS
// ============================================================

/**
 * Générer un numéro de commande unique
 */
const generateOrderNumber = async () => {
  const [result] = await pool.query(
    'UPDATE ecom_sequences SET current_value = current_value + 1 WHERE name = "order"'
  );
  const [seq] = await pool.query('SELECT * FROM ecom_sequences WHERE name = "order"');

  const prefix = seq[0].prefix;
  const value = seq[0].current_value;
  const padding = seq[0].padding;
  const date = new Date().toISOString().slice(0, 7).replace('-', '');

  return `${prefix}-${date}-${String(value).padStart(padding, '0')}`;
};

/**
 * Ajouter une entrée dans l'historique des statuts
 */
const addStatusHistory = async (orderId, status, comment = null, createdBy = null) => {
  await pool.query(`
    INSERT INTO ecom_order_status_history (id, order_id, status, comment, created_by)
    VALUES (?, ?, ?, ?, ?)
  `, [uuidv4(), orderId, status, comment, createdBy]);
};

// ============================================================
// SYNC HELPERS — E-COMMERCE → GESTION
// ============================================================

/**
 * Synchroniser ou créer un client dans la table de gestion `customers`
 * à partir d'un client e-commerce `ecom_customers`
 */
const syncCustomerToManagement = async (connection, ecomCustomer) => {
  // Vérifier si le client existe déjà par email
  const [existing] = await connection.query(
    'SELECT id FROM customers WHERE email = ? AND user_id = ?',
    [ecomCustomer.email, SYSTEM_ADMIN_ID]
  );

  if (existing.length > 0) {
    // Marquer le client existant comme ayant un accès en ligne
    await connection.query(
      'UPDATE customers SET has_online_access = 1 WHERE id = ?',
      [existing[0].id]
    );
    return existing[0].id;
  }

  // Créer le client dans la table de gestion
  const customerId = uuidv4();
  const customerName = `${ecomCustomer.first_name || ''} ${ecomCustomer.last_name || ''}`.trim() || 'Client E-commerce';

  await connection.query(`
    INSERT INTO customers (id, user_id, name, email, phone, company, address, city, customer_type, status, has_online_access, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'simple', 'active', 1, ?, NOW())
  `, [
    customerId,
    SYSTEM_ADMIN_ID,
    customerName,
    ecomCustomer.email,
    ecomCustomer.phone || null,
    ecomCustomer.company_name || null,
    ecomCustomer.address_line1 || null,
    ecomCustomer.city || 'Dakar',
    'Client créé automatiquement depuis la boutique en ligne'
  ]);

  return customerId;
};

/**
 * Créer une vente dans le système de gestion `sales` + `sale_items`
 * à partir d'une commande e-commerce
 */
const syncOrderToSale = async (connection, order, orderItems, managementCustomerId) => {
  const saleId = uuidv4();
  const saleNumber = `ECOM-${order.order_number}`;

  await connection.query(`
    INSERT INTO sales (
      id, user_id, customer_id, sale_number, status, sale_date, due_date,
      subtotal, tax_rate, tax_amount, discount_amount, shipping_amount, total_amount,
      payment_status, payment_method, source, created_by, notes, shipping_address, created_at
    ) VALUES (?, ?, ?, ?, 'confirmed', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY),
      ?, ?, ?, ?, ?, ?, 'pending', 'online', 'online', 'Boutique en ligne', ?, ?, NOW())
  `, [
    saleId,
    SYSTEM_ADMIN_ID,
    managementCustomerId,
    saleNumber,
    order.subtotal,
    order.tax_rate,
    order.tax_amount,
    order.discount_amount || 0,
    order.shipping_amount || 0,
    order.total,
    `Commande en ligne ${order.order_number} — Boutique e-commerce`,
    order.shipping_address || ''
  ]);

  // Créer les items de vente
  for (const item of orderItems) {
    await connection.query(`
      INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, tax_rate, line_total, created_at)
      VALUES (?, ?, NULL, ?, ?, ?, ?, NOW())
    `, [
      uuidv4(),
      saleId,
      item.quantity,
      item.unit_price,
      order.tax_rate || 18,
      parseFloat(item.quantity) * parseFloat(item.unit_price)
    ]);
  }

  return { saleId, saleNumber };
};

/**
 * Générer automatiquement une facture e-commerce pour la commande
 */
const autoGenerateInvoice = async (connection, order, orderItems, ecomCustomer) => {
  // Générer numéro de facture
  await connection.query(
    'UPDATE ecom_sequences SET current_value = current_value + 1 WHERE name = "invoice"'
  );
  const [seq] = await connection.query('SELECT * FROM ecom_sequences WHERE name = "invoice"');
  const invoiceNumber = `${seq[0].prefix}-${new Date().getFullYear()}-${String(seq[0].current_value).padStart(6, '0')}`;

  const invoiceId = uuidv4();
  const issueDate = new Date();
  const dueDate = new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  const customerName = ecomCustomer.company_name
    || `${ecomCustomer.first_name || ''} ${ecomCustomer.last_name || ''}`.trim()
    || 'Client';

  await connection.query(`
    INSERT INTO ecom_invoices (
      id, invoice_number, order_id, customer_id, type, status,
      subtotal, tax_rate, tax_amount, discount_amount, total,
      amount_paid, customer_name, customer_email, customer_phone,
      customer_address, issue_date, due_date,
      notes
    ) VALUES (?, ?, ?, ?, 'invoice', 'draft',
      ?, ?, ?, ?, ?,
      0, ?, ?, ?,
      ?, ?, ?,
      ?)
  `, [
    invoiceId,
    invoiceNumber,
    order.id,
    order.customer_id,
    order.subtotal,
    order.tax_rate || 18,
    order.tax_amount,
    order.discount_amount || 0,
    order.total,
    customerName,
    ecomCustomer.email || '',
    ecomCustomer.phone || '',
    order.billing_address || order.shipping_address || '',
    issueDate,
    dueDate,
    `Facture générée automatiquement pour la commande ${order.order_number}`
  ]);

  // Créer les lignes de facture (table ecom_invoice_items)
  // Auto-création de la table si elle n'existe pas encore
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ecom_invoice_items (
        id VARCHAR(36) PRIMARY KEY,
        invoice_id VARCHAR(36) NOT NULL,
        order_item_id VARCHAR(36),
        product_id VARCHAR(36),
        sku VARCHAR(50),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        unit VARCHAR(20) DEFAULT 'm³',
        quantity DECIMAL(10,2) NOT NULL,
        unit_price DECIMAL(15,2) NOT NULL,
        discount_amount DECIMAL(12,2) DEFAULT 0,
        tax_rate DECIMAL(5,2) DEFAULT 18.00,
        tax_amount DECIMAL(15,2) DEFAULT 0,
        total DECIMAL(15,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_invoice_id (invoice_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (tableErr) {
    // Table existe déjà — OK
  }

  for (const item of orderItems) {
    const itemSubtotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
    const itemTax = itemSubtotal * ((order.tax_rate || 18) / 100);

    await connection.query(`
      INSERT INTO ecom_invoice_items (
        id, invoice_id, order_item_id, product_id, sku, name, description,
        unit, quantity, unit_price, discount_amount, tax_rate, tax_amount, total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      uuidv4(), invoiceId, item.id, item.product_id, item.sku || '',
      item.name, item.description || '', item.unit || 'm³',
      item.quantity, item.unit_price, item.discount_amount || 0,
      order.tax_rate || 18, itemTax, itemSubtotal + itemTax
    ]);
  }

  return { invoiceId, invoiceNumber };
};

// ============================================================
// ROUTES CLIENT
// ============================================================

/**
 * POST /api/ecommerce/orders
 * Créer une commande depuis le panier
 */
router.post('/', authenticateCustomer, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const customerId = req.user.customer_id;

    const {
      billing_address,
      shipping_address,
      shipping_method = 'delivery',
      customer_notes,
      use_same_address = true
    } = req.body;

    // Récupérer le panier
    const [carts] = await connection.query(`
      SELECT * FROM ecom_carts
      WHERE customer_id = ? AND status = 'active'
      ORDER BY created_at DESC LIMIT 1
    `, [customerId]);

    if (carts.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Panier vide' });
    }

    const cart = carts[0];

    // Récupérer les items du panier
    const [cartItems] = await connection.query(`
      SELECT ci.*, p.sku, p.name, p.description, p.unit, p.cost_price,
             p.stock_quantity, p.manage_stock
      FROM ecom_cart_items ci
      JOIN ecom_products p ON ci.product_id = p.id
      WHERE ci.cart_id = ?
    `, [cart.id]);

    if (cartItems.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Panier vide' });
    }

    // Vérifier le stock
    for (const item of cartItems) {
      if (item.manage_stock && parseFloat(item.quantity) > parseFloat(item.stock_quantity)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: `Stock insuffisant pour ${item.name}. Disponible: ${item.stock_quantity}`
        });
      }
    }

    // Récupérer les infos client
    const [customers] = await connection.query(
      'SELECT * FROM ecom_customers WHERE id = ?',
      [customerId]
    );
    const customer = customers[0];

    // Récupérer l'adresse par défaut si pas fournie
    let shippingAddr = shipping_address;
    let billingAddr = billing_address || shipping_address;

    if (!shippingAddr) {
      const [addresses] = await connection.query(
        'SELECT * FROM ecom_addresses WHERE customer_id = ? AND is_default = 1',
        [customerId]
      );
      if (addresses.length > 0) {
        shippingAddr = addresses[0];
        if (use_same_address) billingAddr = addresses[0];
      }
    }

    // Récupérer les paramètres
    const [settings] = await connection.query(
      'SELECT `key`, value FROM ecom_settings WHERE `key` IN ("tax_rate", "free_shipping_threshold", "default_shipping_cost", "min_order_amount")'
    );
    const settingsMap = {};
    settings.forEach(s => settingsMap[s.key] = parseFloat(s.value));

    const taxRate = settingsMap.tax_rate || 18;
    const freeShippingThreshold = settingsMap.free_shipping_threshold || 500000;
    const defaultShippingCost = settingsMap.default_shipping_cost || 15000;
    const minOrderAmount = settingsMap.min_order_amount || 50000;

    // Calculer les totaux
    let subtotal = 0;
    for (const item of cartItems) {
      subtotal += parseFloat(item.quantity) * parseFloat(item.unit_price);
    }

    if (subtotal < minOrderAmount) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: `Montant minimum de commande: ${minOrderAmount} FCFA`
      });
    }

    const taxAmount = subtotal * (taxRate / 100);
    const shippingAmount = subtotal >= freeShippingThreshold ? 0 : defaultShippingCost;
    const discountAmount = parseFloat(cart.discount_amount) || 0;
    const total = subtotal + taxAmount + shippingAmount - discountAmount;

    // Générer numéro de commande
    const orderNumber = await generateOrderNumber();
    const orderId = uuidv4();

    // Créer la commande
    await connection.query(`
      INSERT INTO ecom_orders (
        id, order_number, customer_id, cart_id, status, payment_status,
        subtotal, tax_rate, tax_amount, shipping_amount, discount_amount, total,
        billing_first_name, billing_last_name, billing_company, billing_address,
        billing_city, billing_phone, billing_email,
        shipping_first_name, shipping_last_name, shipping_company, shipping_address,
        shipping_city, shipping_phone, shipping_instructions,
        shipping_method, coupon_code, customer_notes, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, 'pending', 'pending', ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?)
    `, [
      orderId, orderNumber, customerId, cart.id,
      subtotal, taxRate, taxAmount, shippingAmount, discountAmount, total,
      billingAddr?.first_name || customer.first_name,
      billingAddr?.last_name || customer.last_name,
      billingAddr?.company || customer.company_name,
      billingAddr?.address_line1 || '',
      billingAddr?.city || 'Dakar',
      billingAddr?.phone || customer.phone,
      customer.email,
      shippingAddr?.first_name || customer.first_name,
      shippingAddr?.last_name || customer.last_name,
      shippingAddr?.company || customer.company_name,
      shippingAddr?.address_line1 || '',
      shippingAddr?.city || 'Dakar',
      shippingAddr?.phone || customer.phone,
      shippingAddr?.instructions || '',
      shipping_method,
      cart.coupon_code,
      customer_notes,
      req.ip,
      req.headers['user-agent']
    ]);

    // Créer les lignes de commande
    for (const item of cartItems) {
      const itemSubtotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
      const itemTax = itemSubtotal * (taxRate / 100);

      await connection.query(`
        INSERT INTO ecom_order_items (
          id, order_id, product_id, sku, name, description, unit,
          quantity, unit_price, cost_price, discount_amount, tax_rate, tax_amount,
          subtotal, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(), orderId, item.product_id, item.sku, item.name,
        item.description, item.unit, item.quantity, item.unit_price,
        item.cost_price, item.discount_amount || 0, taxRate, itemTax,
        itemSubtotal, itemSubtotal + itemTax
      ]);

      // Décrémenter le stock
      if (item.manage_stock) {
        await connection.query(`
          UPDATE ecom_products
          SET stock_quantity = stock_quantity - ?,
              sold_count = sold_count + ?,
              stock_status = CASE WHEN stock_quantity - ? <= 0 THEN 'out_of_stock' ELSE stock_status END
          WHERE id = ?
        `, [item.quantity, item.quantity, item.quantity, item.product_id]);
      }
    }

    // Marquer le panier comme converti
    await connection.query(
      'UPDATE ecom_carts SET status = "converted" WHERE id = ?',
      [cart.id]
    );

    // Ajouter à l'historique
    await addStatusHistory(orderId, 'pending', 'Commande créée');

    // Incrémenter usage coupon si utilisé
    if (cart.coupon_code) {
      await connection.query(
        'UPDATE ecom_coupons SET usage_count = usage_count + 1 WHERE code = ?',
        [cart.coupon_code]
      );
    }

    // ============================================================
    // SYNC AUTOMATIQUE → SYSTÈME DE GESTION
    // ============================================================

    // 1. Synchroniser le client e-commerce → table customers (gestion)
    let managementCustomerId = null;
    try {
      managementCustomerId = await syncCustomerToManagement(connection, customer);
    } catch (syncErr) {
      console.warn('[ECOM→GESTION] Erreur sync client:', syncErr.message);
    }

    // 2. Créer la vente dans le système de gestion (sales + sale_items)
    let saleInfo = null;
    try {
      if (managementCustomerId) {
        saleInfo = await syncOrderToSale(connection, {
          ...{ order_number: orderNumber, subtotal, tax_rate: taxRate, tax_amount: taxAmount, shipping_amount: shippingAmount, discount_amount: discountAmount, total, shipping_address: shippingAddr?.address_line1 || '' }
        }, cartItems, managementCustomerId);
      }
    } catch (syncErr) {
      console.warn('[ECOM→GESTION] Erreur sync vente:', syncErr.message);
    }

    // 3. Générer automatiquement la facture e-commerce
    let invoiceInfo = null;
    try {
      invoiceInfo = await autoGenerateInvoice(connection, {
        id: orderId,
        order_number: orderNumber,
        customer_id: customerId,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        shipping_amount: shippingAmount,
        total,
        billing_address: billingAddr?.address_line1 || '',
        shipping_address: shippingAddr?.address_line1 || ''
      }, cartItems.map((item, i) => ({
        id: uuidv4(), // temporaire pour le lien
        product_id: item.product_id,
        sku: item.sku,
        name: item.name,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_amount: item.discount_amount || 0
      })), customer);
    } catch (invoiceErr) {
      console.warn('[ECOM→FACTURE] Erreur génération facture:', invoiceErr.message);
    }

    await connection.commit();

    console.log(`[ECOM] Commande ${orderNumber} créée avec succès`);
    if (saleInfo) console.log(`[ECOM→GESTION] Vente ${saleInfo.saleNumber} créée`);
    if (invoiceInfo) console.log(`[ECOM→FACTURE] Facture ${invoiceInfo.invoiceNumber} générée`);

    // Envoyer l'email de confirmation au client (non-bloquant)
    const customerFullName = `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'Client';
    try {
      if (customer && customer.email) {
        sendNotification('ecom_order_confirmed', {
          orderNumber,
          customerName: customerFullName,
          total: new Intl.NumberFormat('fr-FR').format(total),
          itemCount: cartItems.length,
          shippingAddress: shippingAddress || null,
        }, customer.email).catch(err => console.warn('[ECOM→EMAIL CLIENT] Erreur:', err.message));
      }
    } catch (emailErr) {
      console.warn('[ECOM→EMAIL CLIENT] Erreur non-bloquante:', emailErr.message);
    }

    // Notifier l'admin par email (non-bloquant)
    const adminEmail = process.env.ADMIN_EMAIL || process.env.GMAIL_USER;
    if (adminEmail) {
      sendNotification('admin_new_order', {
        orderNumber,
        customerName: customerFullName,
        customerEmail: customer?.email || 'N/A',
        total: new Intl.NumberFormat('fr-FR').format(total),
        itemCount: cartItems.length,
        adminUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
      }, adminEmail).catch(err => console.warn('[ECOM→EMAIL ADMIN] Erreur:', err.message));
    }

    // Récupérer la commande complète
    const [orders] = await pool.query('SELECT * FROM ecom_orders WHERE id = ?', [orderId]);
    const [orderItems] = await pool.query('SELECT * FROM ecom_order_items WHERE order_id = ?', [orderId]);

    // Récupérer la facture générée
    let invoiceData = null;
    if (invoiceInfo) {
      const [inv] = await pool.query('SELECT id, invoice_number, status, issue_date, due_date, total FROM ecom_invoices WHERE id = ?', [invoiceInfo.invoiceId]);
      if (inv.length > 0) invoiceData = inv[0];
    }

    res.status(201).json({
      success: true,
      message: 'Commande créée avec succès',
      data: {
        ...orders[0],
        items: orderItems,
        invoice: invoiceData,
        management_sale: saleInfo ? { sale_id: saleInfo.saleId, sale_number: saleInfo.saleNumber } : null
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Erreur création commande:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  } finally {
    connection.release();
  }
});

/**
 * GET /api/ecommerce/orders
 * Liste des commandes du client connecté
 */
router.get('/', authenticateCustomer, async (req, res) => {
  try {
    const customerId = req.user.customer_id;
    const { page = 1, limit = 10, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE customer_id = ?';
    const params = [customerId];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    const [orders] = await pool.query(`
      SELECT * FROM ecom_orders
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM ecom_orders ${whereClause}`,
      params
    );

    // Récupérer le nombre d'items pour chaque commande
    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      const [items] = await pool.query(
        'SELECT COUNT(*) as item_count, SUM(quantity) as total_quantity FROM ecom_order_items WHERE order_id = ?',
        [order.id]
      );
      return {
        ...order,
        item_count: items[0].item_count,
        total_quantity: items[0].total_quantity
      };
    }));

    res.json({
      success: true,
      data: ordersWithItems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Erreur liste commandes:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/ecommerce/orders/:id
 * Détail d'une commande
 */
router.get('/:id', authenticateCustomer, async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user.customer_id;
    const isAdmin = req.user.role === 'admin';

    let query = 'SELECT * FROM ecom_orders WHERE (id = ? OR order_number = ?)';
    const params = [id, id];

    // Si pas admin, filtrer par client
    if (!isAdmin) {
      query += ' AND customer_id = ?';
      params.push(customerId);
    }

    const [orders] = await pool.query(query, params);

    if (orders.length === 0) {
      return res.status(404).json({ success: false, error: 'Commande non trouvée' });
    }

    const order = orders[0];

    // Récupérer les items
    const [items] = await pool.query(`
      SELECT oi.*, p.image_url, p.slug
      FROM ecom_order_items oi
      LEFT JOIN ecom_products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [order.id]);

    // Récupérer les paiements
    const [payments] = await pool.query(
      'SELECT * FROM ecom_payments WHERE order_id = ? ORDER BY created_at DESC',
      [order.id]
    );

    // Récupérer l'historique des statuts
    const [statusHistory] = await pool.query(
      'SELECT * FROM ecom_order_status_history WHERE order_id = ? ORDER BY created_at DESC',
      [order.id]
    );

    // Récupérer la facture si existe
    const [invoices] = await pool.query(
      'SELECT id, invoice_number, status, pdf_path FROM ecom_invoices WHERE order_id = ?',
      [order.id]
    );

    res.json({
      success: true,
      data: {
        ...order,
        items,
        payments,
        status_history: statusHistory,
        invoice: invoices.length > 0 ? invoices[0] : null
      }
    });

  } catch (error) {
    console.error('Erreur détail commande:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * POST /api/ecommerce/orders/:id/cancel
 * Annuler une commande (client)
 */
router.post('/:id/cancel', authenticateCustomer, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { reason } = req.body;
    const customerId = req.user.customer_id;

    const [orders] = await connection.query(
      'SELECT * FROM ecom_orders WHERE id = ? AND customer_id = ?',
      [id, customerId]
    );

    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Commande non trouvée' });
    }

    const order = orders[0];

    // Vérifier si annulation possible
    if (!['pending', 'confirmed'].includes(order.status)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: 'Cette commande ne peut plus être annulée'
      });
    }

    // Restaurer le stock
    const [items] = await connection.query(
      'SELECT * FROM ecom_order_items WHERE order_id = ?',
      [order.id]
    );

    for (const item of items) {
      await connection.query(`
        UPDATE ecom_products
        SET stock_quantity = stock_quantity + ?,
            sold_count = sold_count - ?,
            stock_status = 'in_stock'
        WHERE id = ?
      `, [item.quantity, item.quantity, item.product_id]);
    }

    // Mettre à jour le statut
    await connection.query(`
      UPDATE ecom_orders
      SET status = 'cancelled', cancelled_at = NOW(), cancelled_reason = ?
      WHERE id = ?
    `, [reason || 'Annulé par le client', order.id]);

    await addStatusHistory(order.id, 'cancelled', reason || 'Annulé par le client', customerId);

    await connection.commit();

    // Email d'annulation au client (non-bloquant)
    try {
      const [custInfo] = await pool.query('SELECT email, first_name, last_name FROM ecom_customers WHERE id = ?', [customerId]);
      if (custInfo.length > 0 && custInfo[0].email) {
        sendNotification('ecom_order_cancelled', {
          orderNumber: order.order_number,
          customerName: `${custInfo[0].first_name || ''} ${custInfo[0].last_name || ''}`.trim(),
          reason: reason || 'À la demande du client',
        }, custInfo[0].email).catch(() => {});
      }
    } catch (e) { /* non-bloquant */ }

    res.json({
      success: true,
      message: 'Commande annulée avec succès'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Erreur annulation:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  } finally {
    connection.release();
  }
});

// ============================================================
// ROUTES ADMIN
// ============================================================

/**
 * GET /api/ecommerce/orders/admin/list
 * Liste de toutes les commandes (admin)
 */
router.get('/admin/list', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const {
      page = 1, limit = 20, status, payment_status,
      search, date_from, date_to, sort = 'created_at', order = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }

    if (payment_status) {
      whereClause += ' AND o.payment_status = ?';
      params.push(payment_status);
    }

    if (search) {
      whereClause += ' AND (o.order_number LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ? OR c.phone LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    if (date_from) {
      whereClause += ' AND DATE(o.created_at) >= ?';
      params.push(date_from);
    }

    if (date_to) {
      whereClause += ' AND DATE(o.created_at) <= ?';
      params.push(date_to);
    }

    const allowedSorts = ['created_at', 'total', 'order_number', 'status'];
    const sortField = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [orders] = await pool.query(`
      SELECT o.*,
        COALESCE(c.first_name, o.billing_first_name, o.shipping_first_name) as first_name,
        COALESCE(c.last_name,  o.billing_last_name,  o.shipping_last_name)  as last_name,
        COALESCE(c.email, o.billing_email)   as email,
        COALESCE(c.phone, o.billing_phone, o.shipping_phone) as phone,
        c.company_name,
        (SELECT COUNT(*) FROM ecom_order_items WHERE order_id = o.id) as item_count
      FROM ecom_orders o
      LEFT JOIN ecom_customers c ON o.customer_id = c.id
      ${whereClause}
      ORDER BY o.${sortField} ${sortOrder}
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total
      FROM ecom_orders o
      LEFT JOIN ecom_customers c ON o.customer_id = c.id
      ${whereClause}
    `, params);

    // Stats rapides
    const [stats] = await pool.query(`
      SELECT
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as unpaid_orders,
        SUM(total) as total_revenue
      FROM ecom_orders
      WHERE DATE(created_at) = CURDATE()
    `);

    res.json({
      success: true,
      data: orders,
      stats: stats[0],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Erreur admin liste:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/ecommerce/orders/:id/status
 * Modifier le statut d'une commande (admin)
 */
router.put('/:id/status', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment, notify_customer = true } = req.body;

    const validStatuses = [
      'pending', 'confirmed', 'processing', 'ready_for_pickup',
      'shipped', 'in_transit', 'delivered', 'completed', 'cancelled', 'refunded'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Statut invalide' });
    }

    const [orders] = await pool.query('SELECT * FROM ecom_orders WHERE id = ?', [id]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, error: 'Commande non trouvée' });
    }

    const order = orders[0];
    const updates = { status };

    // Actions spécifiques selon le statut
    if (status === 'confirmed') {
      updates.confirmed_at = new Date();
    } else if (status === 'shipped') {
      updates.shipped_at = new Date();
    } else if (status === 'delivered') {
      updates.delivered_at = new Date();
    } else if (status === 'cancelled') {
      updates.cancelled_at = new Date();
      updates.cancelled_reason = comment;
    }

    // Mettre à jour
    const setClauses = Object.keys(updates).map(k => `${k} = ?`);
    await pool.query(
      `UPDATE ecom_orders SET ${setClauses.join(', ')} WHERE id = ?`,
      [...Object.values(updates), id]
    );

    // Historique
    await addStatusHistory(id, status, comment, req.user.id);

    // Notification email client selon le statut
    if (notify_customer) {
      try {
        const [custInfo] = await pool.query(
          'SELECT email, first_name, last_name FROM ecom_customers WHERE id = ?',
          [order.customer_id]
        );
        if (custInfo.length > 0 && custInfo[0].email) {
          const customerName = `${custInfo[0].first_name || ''} ${custInfo[0].last_name || ''}`.trim() || 'Client';
          const baseData = {
            orderNumber: order.order_number,
            customerName,
            total: new Intl.NumberFormat('fr-FR').format(order.total),
            shippingAddress: order.shipping_address_text || ''
          };
          if (status === 'shipped') {
            sendNotification('ecom_order_shipped', baseData, custInfo[0].email).catch(() => {});
          } else if (status === 'cancelled') {
            sendNotification('ecom_order_cancelled', { ...baseData, reason: comment || 'Annulation administrative' }, custInfo[0].email).catch(() => {});
          }
        }
      } catch { /* non bloquant */ }
    }

    res.json({
      success: true,
      message: 'Statut mis à jour',
      data: { status, previous_status: order.status }
    });

  } catch (error) {
    console.error('Erreur update statut:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/ecommerce/orders/admin/stats
 * Statistiques des commandes
 */
router.get('/admin/stats', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { period = '30' } = req.query;

    // Stats globales
    const [globalStats] = await pool.query(`
      SELECT
        COUNT(*) as total_orders,
        SUM(total) as total_revenue,
        AVG(total) as avg_order_value,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders
      FROM ecom_orders
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [parseInt(period)]);

    // Ventes par jour
    const [dailySales] = await pool.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as orders,
        SUM(total) as revenue
      FROM ecom_orders
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      AND status NOT IN ('cancelled', 'refunded')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [parseInt(period)]);

    // Top produits
    const [topProducts] = await pool.query(`
      SELECT
        oi.product_id, oi.name, oi.sku,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total) as total_revenue,
        COUNT(DISTINCT oi.order_id) as order_count
      FROM ecom_order_items oi
      JOIN ecom_orders o ON oi.order_id = o.id
      WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      AND o.status NOT IN ('cancelled', 'refunded')
      GROUP BY oi.product_id, oi.name, oi.sku
      ORDER BY total_revenue DESC
      LIMIT 10
    `, [parseInt(period)]);

    // Répartition par statut
    const [statusBreakdown] = await pool.query(`
      SELECT status, COUNT(*) as count, SUM(total) as total
      FROM ecom_orders
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY status
    `, [parseInt(period)]);

    // Répartition par méthode de paiement
    const [paymentMethods] = await pool.query(`
      SELECT method, COUNT(*) as count, SUM(amount) as total
      FROM ecom_payments
      WHERE status = 'completed'
      AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY method
    `, [parseInt(period)]);

    res.json({
      success: true,
      data: {
        global: globalStats[0],
        daily_sales: dailySales,
        top_products: topProducts,
        status_breakdown: statusBreakdown,
        payment_methods: paymentMethods,
        period: parseInt(period)
      }
    });

  } catch (error) {
    console.error('Erreur stats:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ============================================================
// COMMANDE VIA WHATSAPP
// ============================================================

/**
 * POST /api/ecommerce/orders/whatsapp
 * Enregistrer une commande initiée via WhatsApp Business
 * Accessible publiquement (le client n'est pas forcément connecté)
 * ou via auth client
 */
router.post('/whatsapp', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      customer_name,
      customer_phone,
      customer_email,
      customer_address,
      items, // [{ name, quantity, unit_price, unit }]
      notes
    } = req.body;

    if (!customer_phone || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Numéro de téléphone et au moins un article sont requis'
      });
    }

    await connection.beginTransaction();

    // Générer numéro de commande
    const orderNumber = await generateOrderNumber();
    const orderId = uuidv4();

    // Calculer totaux
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.quantity) * parseFloat(item.unit_price)), 0);
    const taxRate = 18;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    // Chercher ou créer le client e-commerce par téléphone
    let customerId = null;
    const [existingCustomer] = await connection.query(
      'SELECT id FROM ecom_customers WHERE phone = ?',
      [customer_phone]
    );

    if (existingCustomer.length > 0) {
      customerId = existingCustomer[0].id;
    } else if (customer_email) {
      const [byEmail] = await connection.query(
        'SELECT id FROM ecom_customers WHERE email = ?',
        [customer_email]
      );
      if (byEmail.length > 0) {
        customerId = byEmail[0].id;
      }
    }

    // Si aucun client trouvé, en créer un automatiquement
    if (!customerId) {
      customerId = uuidv4();
      const autoEmail = customer_email || `wa_${customer_phone.replace(/[^0-9]/g, '')}@allobeton.sn`;
      const nameParts = (customer_name || 'Client WhatsApp').split(' ');
      const firstName = nameParts[0] || 'Client';
      const lastName = nameParts.slice(1).join(' ') || 'WhatsApp';

      await connection.query(`
        INSERT INTO ecom_customers (id, email, password_hash, first_name, last_name, phone, customer_type, is_active, created_at)
        VALUES (?, ?, '', ?, ?, ?, 'particulier', 1, NOW())
      `, [customerId, autoEmail, firstName, lastName, customer_phone]);
    }

    // Créer la commande
    await connection.query(`
      INSERT INTO ecom_orders (
        id, order_number, customer_id, status, payment_status,
        subtotal, tax_rate, tax_amount, discount_amount, shipping_amount, total,
        shipping_address, billing_address, customer_notes, admin_notes, source, created_at
      ) VALUES (?, ?, ?, 'pending', 'pending',
        ?, ?, ?, 0, 0, ?,
        ?, ?, ?, ?, 'whatsapp', NOW())
    `, [
      orderId, orderNumber, customerId,
      subtotal, taxRate, taxAmount, total,
      customer_address || '',
      customer_address || '',
      notes || '',
      `Commande WhatsApp — ${customer_name || ''} — ${customer_phone}`
    ]);

    // Créer les items
    const orderItems = [];
    for (const item of items) {
      const itemId = uuidv4();
      const lineTotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
      const itemTax = lineTotal * (taxRate / 100);
      await connection.query(`
        INSERT INTO ecom_order_items (
          id, order_id, product_id, sku, name, description, unit, quantity,
          unit_price, discount_amount, tax_rate, tax_amount, subtotal, total, created_at
        ) VALUES (?, ?, NULL, '', ?, '', ?, ?, ?, 0, ?, ?, ?, ?, NOW())
      `, [
        itemId, orderId,
        item.name || 'Produit WhatsApp',
        item.unit || 'unité',
        item.quantity,
        item.unit_price,
        taxRate,
        itemTax,
        lineTotal,
        lineTotal + itemTax
      ]);
      orderItems.push({
        id: itemId,
        product_id: null,
        sku: '',
        name: item.name,
        unit: item.unit || 'unité',
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_amount: 0,
        description: ''
      });
    }

    // Historique de statut (non bloquant)
    try {
      await addStatusHistory(orderId, 'pending', 'Commande créée via WhatsApp Business');
    } catch (histErr) {
      console.log('Info: table ecom_order_status_history non disponible (non bloquant)');
    }

    // Synchroniser avec le système de gestion
    const order = {
      id: orderId,
      order_number: orderNumber,
      customer_id: customerId,
      subtotal, tax_rate: taxRate, tax_amount: taxAmount,
      discount_amount: 0, shipping_amount: 0, total,
      shipping_address: customer_address || '',
      billing_address: customer_address || ''
    };

    const ecomCustomer = {
      first_name: customer_name || 'Client',
      last_name: 'WhatsApp',
      email: customer_email || `whatsapp_${customer_phone.replace(/[^0-9]/g, '')}@allobeton.sn`,
      phone: customer_phone,
      company_name: null,
      address_line1: customer_address || null,
      city: 'Dakar'
    };

    try {
      const managementCustomerId = await syncCustomerToManagement(connection, ecomCustomer);
      await syncOrderToSale(connection, order, orderItems, managementCustomerId);
      await autoGenerateInvoice(connection, order, orderItems, ecomCustomer);
    } catch (syncErr) {
      console.error('Erreur sync gestion WhatsApp (non bloquant):', syncErr.message);
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      data: {
        order_id: orderId,
        order_number: orderNumber,
        total,
        source: 'whatsapp',
        message: 'Commande WhatsApp enregistrée avec succès'
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Erreur commande WhatsApp:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la création de la commande WhatsApp' });
  } finally {
    connection.release();
  }
});

// ============================================================
// REMBOURSEMENT
// ============================================================

/**
 * POST /api/ecommerce/orders/:id/refund
 * Rembourser une commande (admin uniquement)
 * - Restaure le stock
 * - Crée une entrée de paiement négatif (remboursement)
 * - Synchronise le remboursement vers le système de gestion
 * - Envoie un email au client
 */
router.post('/:id/refund', authenticateToken, requireRole(['admin']), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { reason, amount: partialAmount } = req.body;

    // Récupérer la commande
    const [orders] = await connection.query('SELECT * FROM ecom_orders WHERE id = ?', [id]);
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Commande non trouvée' });
    }

    const order = orders[0];

    // Vérifier si remboursement possible
    if (order.status === 'refunded') {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Commande déjà remboursée' });
    }

    if (order.payment_status !== 'paid' && order.payment_status !== 'partial') {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Aucun paiement à rembourser pour cette commande' });
    }

    const refundAmount = partialAmount ? Math.min(parseFloat(partialAmount), parseFloat(order.amount_paid || order.total)) : parseFloat(order.amount_paid || order.total);

    if (refundAmount <= 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Montant de remboursement invalide' });
    }

    // Restaurer le stock
    const [items] = await connection.query('SELECT * FROM ecom_order_items WHERE order_id = ?', [order.id]);
    for (const item of items) {
      await connection.query(`
        UPDATE ecom_products
        SET stock_quantity = stock_quantity + ?,
            sold_count = GREATEST(0, sold_count - ?),
            stock_status = 'in_stock'
        WHERE id = ?
      `, [item.quantity, item.quantity, item.product_id]);
    }

    // Mettre à jour le statut de la commande
    await connection.query(`
      UPDATE ecom_orders
      SET status = 'refunded',
          payment_status = 'refunded',
          cancelled_at = NOW(),
          cancelled_reason = ?
      WHERE id = ?
    `, [reason || 'Remboursement admin', order.id]);

    // Historique de statut
    await connection.query(`
      INSERT INTO ecom_order_status_history (id, order_id, status, comment, created_by)
      VALUES (?, ?, 'refunded', ?, ?)
    `, [uuidv4(), order.id, reason || 'Remboursement admin', req.user.id]);

    // Créer une entrée de paiement négatif (remboursement) dans ecom_payments
    const refundPaymentId = uuidv4();
    const refundPaymentNumber = `RMB-${order.order_number}`;
    await connection.query(`
      INSERT INTO ecom_payments (
        id, order_id, customer_id, payment_number, method, provider,
        amount, currency, status, transaction_id, reference, metadata
      ) VALUES (?, ?, ?, ?, 'refund', 'manual', ?, 'XOF', 'completed', ?, ?, ?)
    `, [
      refundPaymentId,
      order.id,
      order.customer_id,
      refundPaymentNumber,
      -refundAmount,
      `REFUND-${Date.now()}`,
      refundPaymentNumber,
      JSON.stringify({ reason: reason || 'Remboursement admin', admin_id: req.user.id })
    ]);

    // Mettre à jour la facture e-commerce
    await connection.query(`
      UPDATE ecom_invoices SET status = 'refunded' WHERE order_id = ? AND type = 'invoice'
    `, [order.id]);

    await connection.commit();

    // Synchroniser le remboursement vers le système de gestion (non-bloquant)
    try {
      const saleNumber = `ECOM-${order.order_number}`;
      const [sales] = await pool.query('SELECT id, customer_id FROM sales WHERE sale_number = ?', [saleNumber]);
      if (sales.length > 0) {
        const saleId = sales[0].id;

        // Créer un paiement négatif dans la gestion
        await pool.query(`
          INSERT INTO payments (id, user_id, sale_id, payment_number, amount, payment_method, payment_date, reference_number, status, notes)
          VALUES (?, ?, ?, ?, ?, 'other', NOW(), ?, 'completed', ?)
        `, [
          uuidv4(),
          req.user.id,
          saleId,
          refundPaymentNumber,
          -refundAmount,
          refundPaymentNumber,
          `Remboursement e-commerce — ${reason || 'Admin'}`
        ]);

        // Mettre à jour le statut de la vente
        await pool.query('UPDATE sales SET payment_status = ?, status = ? WHERE id = ?', ['refunded', 'cancelled', saleId]);

        // Ajuster le solde du client de gestion
        if (sales[0].customer_id) {
          await pool.query(
            'UPDATE customers SET current_balance = current_balance + ? WHERE id = ?',
            [refundAmount, sales[0].customer_id]
          );
        }
      }
    } catch (syncErr) {
      console.warn('[REMBOURSEMENT] Erreur sync vers gestion:', syncErr.message);
    }

    // Email de remboursement au client (non-bloquant)
    try {
      const [custInfo] = await pool.query('SELECT email, first_name, last_name FROM ecom_customers WHERE id = ?', [order.customer_id]);
      if (custInfo.length > 0 && custInfo[0].email) {
        sendNotification('ecom_refund_processed', {
          orderNumber: order.order_number,
          customerName: `${custInfo[0].first_name || ''} ${custInfo[0].last_name || ''}`.trim(),
          amount: new Intl.NumberFormat('fr-FR').format(refundAmount),
          reason: reason || 'Remboursement',
        }, custInfo[0].email).catch(() => {});
      }
    } catch (e) { /* non-bloquant */ }

    res.json({
      success: true,
      message: `Remboursement de ${new Intl.NumberFormat('fr-FR').format(refundAmount)} FCFA effectué`,
      data: {
        order_id: order.id,
        order_number: order.order_number,
        refund_amount: refundAmount,
        refund_payment_id: refundPaymentId,
        status: 'refunded'
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Erreur remboursement:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur lors du remboursement' });
  } finally {
    connection.release();
  }
});

module.exports = router;
