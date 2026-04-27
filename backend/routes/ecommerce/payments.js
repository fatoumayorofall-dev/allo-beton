/**
 * ALLO BÉTON — API PAIEMENTS E-COMMERCE (via PayDunya)
 * Wave, Orange Money, Free Money, Carte bancaire, Espèces
 * + Synchronisation automatique avec le système de gestion
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../../db');
const { sendNotification } = require('../../services/emailService');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { authenticateCustomer } = require('../../middleware/ecommerceAuth');
const paydunyaService = require('../../services/paydunya');

// ID admin système pour les enregistrements de gestion
const SYSTEM_ADMIN_ID = '5f47cf1f-de20-4b41-98c4-2524814e6c15';

// ============================================================
// HELPERS
// ============================================================

/**
 * Générer un numéro de paiement unique
 */
const generatePaymentNumber = async () => {
  await pool.query(
    'UPDATE ecom_sequences SET current_value = current_value + 1 WHERE name = "payment"'
  );
  const [seq] = await pool.query('SELECT * FROM ecom_sequences WHERE name = "payment"');

  const prefix = seq[0].prefix;
  const value = seq[0].current_value;
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  return `${prefix}-${date}-${String(value).padStart(6, '0')}`;
};

/**
 * Mettre à jour le statut de paiement de la commande
 */
const updateOrderPaymentStatus = async (orderId) => {
  const [order] = await pool.query('SELECT total FROM ecom_orders WHERE id = ?', [orderId]);
  if (order.length === 0) return;

  const [payments] = await pool.query(
    'SELECT SUM(amount) as total_paid FROM ecom_payments WHERE order_id = ? AND status = "completed"',
    [orderId]
  );

  const totalPaid = parseFloat(payments[0].total_paid) || 0;
  const orderTotal = parseFloat(order[0].total);

  let paymentStatus = 'pending';
  if (totalPaid >= orderTotal) {
    paymentStatus = 'paid';
  } else if (totalPaid > 0) {
    paymentStatus = 'partial';
  }

  await pool.query(
    'UPDATE ecom_orders SET payment_status = ?, amount_paid = ? WHERE id = ?',
    [paymentStatus, totalPaid, orderId]
  );

  // Si payé, confirmer la commande automatiquement
  if (paymentStatus === 'paid') {
    const [currentOrder] = await pool.query('SELECT status FROM ecom_orders WHERE id = ?', [orderId]);
    if (currentOrder[0].status === 'pending') {
      await pool.query(
        'UPDATE ecom_orders SET status = "confirmed", confirmed_at = NOW() WHERE id = ?',
        [orderId]
      );
      await pool.query(`
        INSERT INTO ecom_order_status_history (id, order_id, status, comment)
        VALUES (?, ?, 'confirmed', 'Confirmée automatiquement après paiement PayDunya')
      `, [uuidv4(), orderId]);
    }

    // Mettre à jour la facture e-commerce comme payée
    try {
      await pool.query(`
        UPDATE ecom_invoices SET status = 'paid', amount_paid = ?, paid_at = NOW()
        WHERE order_id = ? AND type = 'invoice'
      `, [totalPaid, orderId]);
    } catch (e) {
      console.warn('[ECOM→FACTURE] Erreur mise à jour facture:', e.message);
    }
  } else if (paymentStatus === 'partial') {
    // Mettre à jour le montant payé sur la facture
    try {
      await pool.query(`
        UPDATE ecom_invoices SET status = 'partial', amount_paid = ?
        WHERE order_id = ? AND type = 'invoice'
      `, [totalPaid, orderId]);
    } catch (e) {
      console.warn('[ECOM→FACTURE] Erreur mise à jour partielle facture:', e.message);
    }
  }

  return paymentStatus;
};

/**
 * Synchroniser un paiement confirmé vers la table de gestion `payments`
 */
const syncPaymentToManagement = async (payment, order) => {
  try {
    // Trouver la vente de gestion correspondante
    const saleNumber = `ECOM-${order.order_number}`;
    const [sales] = await pool.query(
      'SELECT id FROM sales WHERE sale_number = ? AND user_id = ?',
      [saleNumber, SYSTEM_ADMIN_ID]
    );

    if (sales.length === 0) {
      console.warn(`[ECOM→GESTION] Vente ${saleNumber} non trouvée pour sync paiement`);
      return;
    }

    const saleId = sales[0].id;

    // Vérifier si ce paiement a déjà été synchronisé
    const paymentRef = `ECOM-${payment.payment_number}`;
    const [existingPayments] = await pool.query(
      'SELECT id FROM payments WHERE reference_number = ? AND sale_id = ?',
      [paymentRef, saleId]
    );

    if (existingPayments.length > 0) return; // déjà synchronisé

    // Mapper la méthode de paiement e-commerce → gestion
    const methodMap = {
      'wave': 'mobile_money',
      'orange_money': 'mobile_money',
      'free_money': 'mobile_money',
      'card': 'bank_transfer',
      'cash': 'cash'
    };

    // Créer le paiement dans le système de gestion
    await pool.query(`
      INSERT INTO payments (id, user_id, sale_id, payment_number, amount, payment_method, payment_date, reference_number, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, 'completed', ?)
    `, [
      uuidv4(),
      SYSTEM_ADMIN_ID,
      saleId,
      paymentRef,
      payment.amount,
      methodMap[payment.method] || 'other',
      paymentRef,
      `Paiement en ligne ${payment.method} — Commande ${order.order_number}`
    ]);

    // Mettre à jour le statut de paiement de la vente
    const [totalPaidResult] = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE sale_id = ? AND status = "completed"',
      [saleId]
    );
    const totalPaidForSale = parseFloat(totalPaidResult[0].total) || 0;

    const [saleTotal] = await pool.query('SELECT total_amount FROM sales WHERE id = ?', [saleId]);
    const saleAmount = parseFloat(saleTotal[0]?.total_amount) || 0;

    let salePaymentStatus = 'pending';
    if (totalPaidForSale >= saleAmount) salePaymentStatus = 'paid';
    else if (totalPaidForSale > 0) salePaymentStatus = 'partial';

    await pool.query(
      'UPDATE sales SET payment_status = ?, payment_method = ? WHERE id = ?',
      [salePaymentStatus, methodMap[payment.method] || 'other', saleId]
    );

    // Mettre à jour le solde du client
    const [sale] = await pool.query('SELECT customer_id FROM sales WHERE id = ?', [saleId]);
    if (sale.length > 0 && sale[0].customer_id) {
      await pool.query(
        'UPDATE customers SET current_balance = GREATEST(0, current_balance - ?) WHERE id = ?',
        [payment.amount, sale[0].customer_id]
      );
    }

    console.log(`[ECOM→GESTION] Paiement ${paymentRef} synchronisé pour vente ${saleNumber}`);
  } catch (err) {
    console.warn('[ECOM→GESTION] Erreur sync paiement:', err.message);
  }
};

// ============================================================
// ROUTES CLIENT
// ============================================================

/**
 * POST /api/ecommerce/payments/initiate
 * Initier un paiement via PayDunya
 *
 * Body: { order_id, method, phone? }
 * method: 'wave' | 'orange_money' | 'free_money' | 'card' | 'cash'
 */
router.post('/initiate', authenticateCustomer, async (req, res) => {
  try {
    const { order_id, method, phone } = req.body;
    const customerId = req.user.customer_id;

    if (!order_id || !method) {
      return res.status(400).json({ success: false, error: 'Paramètres manquants (order_id, method requis)' });
    }

    const validMethods = ['wave', 'orange_money', 'free_money', 'card', 'cash'];
    if (!validMethods.includes(method)) {
      return res.status(400).json({ success: false, error: `Méthode non supportée. Valide: ${validMethods.join(', ')}` });
    }

    // Wave/Orange Money nécessitent un numéro de téléphone
    if (['wave', 'orange_money', 'free_money'].includes(method) && !phone) {
      return res.status(400).json({ success: false, error: 'Numéro de téléphone requis pour les paiements mobile money' });
    }

    // Vérifier la commande
    const [orders] = await pool.query(
      'SELECT * FROM ecom_orders WHERE id = ? AND customer_id = ?',
      [order_id, customerId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, error: 'Commande non trouvée' });
    }

    const order = orders[0];

    if (order.payment_status === 'paid') {
      return res.status(400).json({ success: false, error: 'Commande déjà payée' });
    }

    // Montant restant à payer
    const amountDue = parseFloat(order.total) - parseFloat(order.amount_paid || 0);

    if (amountDue <= 0) {
      return res.status(400).json({ success: false, error: 'Aucun montant à payer' });
    }

    // Récupérer les articles de la commande
    const [orderItems] = await pool.query(
      'SELECT product_name, quantity, unit_price, total_price FROM ecom_order_items WHERE order_id = ?',
      [order_id]
    );

    // Récupérer les infos du client
    const [customers] = await pool.query(
      'SELECT first_name, last_name, email, phone FROM ecom_customers WHERE id = ?',
      [customerId]
    );
    const customer = customers[0] || {};

    // Générer numéro de paiement
    const paymentNumber = await generatePaymentNumber();
    const paymentId = uuidv4();

    // ── Créer la facture PayDunya ──
    const paydunyaResult = await paydunyaService.createInvoice({
      orderId: order_id,
      orderNumber: order.order_number || paymentNumber,
      amount: amountDue,
      description: `Commande ${order.order_number || paymentNumber} - Allo Béton`,
      items: orderItems.map(item => ({
        name: item.product_name,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        total_price: parseFloat(item.total_price),
      })),
      tax: amountDue - (amountDue / 1.18), // TVA 18%
      method,
      customer: {
        name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
        email: customer.email || '',
        phone: phone || customer.phone || '',
      },
    });

    if (!paydunyaResult.success) {
      return res.status(400).json({
        success: false,
        error: paydunyaResult.error || 'Erreur lors de l\'initiation du paiement',
      });
    }

    // Enregistrer le paiement en base
    await pool.query(`
      INSERT INTO ecom_payments (
        id, order_id, customer_id, payment_number, method, provider,
        amount, currency, status, transaction_id, reference, ip_address,
        metadata
      ) VALUES (?, ?, ?, ?, ?, 'paydunya', ?, 'XOF', 'pending', ?, ?, ?, ?)
    `, [
      paymentId,
      order_id,
      customerId,
      paymentNumber,
      method,
      amountDue,
      paydunyaResult.token || `CASH-${Date.now()}`, // token PayDunya ou ID local pour cash
      paymentNumber,
      req.ip,
      JSON.stringify({
        paydunya_token: paydunyaResult.token,
        checkout_url: paydunyaResult.url,
        simulation: paydunyaResult.simulation || false,
        phone: phone || null,
      }),
    ]);

    // Réponse selon la méthode
    const response = {
      success: true,
      data: {
        payment_id: paymentId,
        payment_number: paymentNumber,
        amount: amountDue,
        method,
        provider: 'paydunya',
        token: paydunyaResult.token,
        configured: paydunyaService.isConfigured(),
        simulation: paydunyaResult.simulation || false,
      },
    };

    // URL de paiement PayDunya (pour Wave, Orange Money, Card)
    if (paydunyaResult.url) {
      response.data.checkout_url = paydunyaResult.url;
      response.data.redirect_url = paydunyaResult.url;
    }

    // Message selon la méthode
    if (method === 'cash') {
      response.data.message = 'Paiement en espèces enregistré. À régler à la livraison.';
    } else if (paydunyaResult.simulation) {
      response.data.message = paydunyaResult.responseText;
    } else {
      response.data.message = 'Paiement initié. Vous allez être redirigé vers la page de paiement sécurisée PayDunya.';
    }

    res.json(response);

  } catch (error) {
    console.error('Erreur initiation paiement:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur lors de l\'initiation du paiement' });
  }
});

/**
 * POST /api/ecommerce/payments/:id/confirm
 * Confirmer / vérifier le statut d'un paiement
 */
router.post('/:id/confirm', authenticateCustomer, async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user.customer_id;

    const [payments] = await pool.query(
      'SELECT * FROM ecom_payments WHERE id = ? AND customer_id = ?',
      [id, customerId]
    );

    if (payments.length === 0) {
      return res.status(404).json({ success: false, error: 'Paiement non trouvé' });
    }

    const payment = payments[0];

    if (payment.status !== 'pending') {
      return res.json({
        success: true,
        data: { status: payment.status },
        message: payment.status === 'completed' ? 'Paiement déjà confirmé' : `Statut: ${payment.status}`,
      });
    }

    // Récupérer le token PayDunya
    let metadata = {};
    try { metadata = JSON.parse(payment.metadata || '{}'); } catch { /* */ }

    const token = metadata.paydunya_token || payment.transaction_id;

    // Vérifier auprès de PayDunya
    const result = await paydunyaService.checkInvoiceStatus(token);

    if (result.status === 'completed') {
      await pool.query(`
        UPDATE ecom_payments
        SET status = 'completed', paid_at = NOW(), provider_response = ?
        WHERE id = ?
      `, [JSON.stringify(result), id]);

      const paymentStatus = await updateOrderPaymentStatus(payment.order_id);

      // Synchroniser le paiement vers le système de gestion
      const [orderForSync] = await pool.query('SELECT * FROM ecom_orders WHERE id = ?', [payment.order_id]);
      if (orderForSync.length > 0) {
        await syncPaymentToManagement(payment, orderForSync[0]);
      }

      // Récupérer la facture pour la renvoyer au client
      const [invoiceData] = await pool.query(
        'SELECT id, invoice_number, status, total FROM ecom_invoices WHERE order_id = ? AND type = "invoice" LIMIT 1',
        [payment.order_id]
      );

      res.json({
        success: true,
        message: 'Paiement confirmé avec succès',
        data: {
          status: 'completed',
          order_payment_status: paymentStatus,
          receipt_url: result.receiptURL || null,
          invoice: invoiceData.length > 0 ? invoiceData[0] : null,
        },
      });
    } else if (result.status === 'cancelled' || result.status === 'failed') {
      await pool.query(`
        UPDATE ecom_payments
        SET status = 'failed', failed_at = NOW(), failure_reason = ?
        WHERE id = ?
      `, [result.error || 'Paiement annulé/échoué', id]);

      res.json({
        success: false,
        error: 'Paiement échoué ou annulé',
        data: { status: 'failed' },
      });
    } else {
      res.json({
        success: true,
        message: 'Paiement en attente de confirmation',
        data: { status: 'pending' },
      });
    }

  } catch (error) {
    console.error('Erreur confirmation paiement:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/ecommerce/payments/:id/status
 * Vérifier le statut d'un paiement
 */
router.get('/:id/status', authenticateCustomer, async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user.customer_id;

    const [payments] = await pool.query(
      'SELECT * FROM ecom_payments WHERE id = ? AND customer_id = ?',
      [id, customerId]
    );

    if (payments.length === 0) {
      return res.status(404).json({ success: false, error: 'Paiement non trouvé' });
    }

    const payment = payments[0];

    // Si en attente, vérifier auprès de PayDunya
    if (payment.status === 'pending' && payment.method !== 'cash') {
      let metadata = {};
      try { metadata = JSON.parse(payment.metadata || '{}'); } catch { /* */ }

      const token = metadata.paydunya_token || payment.transaction_id;
      const result = await paydunyaService.checkInvoiceStatus(token);

      if (result.status === 'completed') {
        await pool.query(`
          UPDATE ecom_payments SET status = 'completed', paid_at = NOW(), provider_response = ?
          WHERE id = ?
        `, [JSON.stringify(result), id]);

        await updateOrderPaymentStatus(payment.order_id);

        // Synchroniser vers le système de gestion
        const [orderForSync] = await pool.query('SELECT * FROM ecom_orders WHERE id = ?', [payment.order_id]);
        if (orderForSync.length > 0) {
          await syncPaymentToManagement(payment, orderForSync[0]);
        }

        payment.status = 'completed';
        payment.receipt_url = result.receiptURL;
      } else if (result.status === 'cancelled' || result.status === 'failed') {
        await pool.query(`
          UPDATE ecom_payments SET status = 'failed', failed_at = NOW()
          WHERE id = ?
        `, [id]);
        payment.status = 'failed';
      }
    }

    res.json({
      success: true,
      data: {
        id: payment.id,
        payment_number: payment.payment_number,
        status: payment.status,
        amount: parseFloat(payment.amount),
        method: payment.method,
        provider: payment.provider || 'paydunya',
        paid_at: payment.paid_at,
      },
    });

  } catch (error) {
    console.error('Erreur statut paiement:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ============================================================
// WEBHOOK PayDunya (IPN - Instant Payment Notification)
// ============================================================

/**
 * POST /api/ecommerce/payments/webhook/paydunya
 * Callback IPN de PayDunya (appelé automatiquement après paiement)
 *
 * PayDunya envoie un POST avec les données du paiement.
 * Ce endpoint est PUBLIC (pas d'auth) car appelé par les serveurs PayDunya.
 * Sécurisé par vérification du master_key PayDunya.
 */
router.post('/webhook/paydunya', async (req, res) => {
  try {
    const { data } = req.body;

    if (!data) {
      console.warn('[PayDunya Webhook] Données manquantes:', req.body);
      return res.json({ received: true });
    }

    // Vérification de la signature PayDunya (master_key)
    const masterKey = process.env.PAYDUNYA_MASTER_KEY;
    if (masterKey && data.hash && data.hash !== masterKey) {
      console.warn('[PayDunya Webhook] Signature invalide — requête rejetée');
      return res.status(403).json({ received: false, error: 'Signature invalide' });
    }

    const {
      status,
      custom_data: customData,
      invoice,
      customer,
      receipt_url,
    } = data;

    const orderId = customData?.order_id;

    if (!orderId) {
      console.warn('[PayDunya Webhook] order_id manquant dans custom_data');
      return res.json({ received: true });
    }

    console.log(`[PayDunya Webhook] Ordre ${orderId} - Statut: ${status}`);

    // Trouver le paiement par order_id
    const [payments] = await pool.query(
      'SELECT * FROM ecom_payments WHERE order_id = ? AND status = "pending" ORDER BY created_at DESC LIMIT 1',
      [orderId]
    );

    if (payments.length === 0) {
      console.warn(`[PayDunya Webhook] Paiement non trouvé pour commande ${orderId}`);
      return res.json({ received: true });
    }

    const payment = payments[0];

    if (status === 'completed') {
      // Paiement réussi
      await pool.query(`
        UPDATE ecom_payments
        SET status = 'completed',
            paid_at = NOW(),
            provider_response = ?,
            metadata = JSON_SET(COALESCE(metadata, '{}'),
              '$.receipt_url', ?,
              '$.customer_name', ?,
              '$.customer_email', ?,
              '$.customer_phone', ?
            )
        WHERE id = ?
      `, [
        JSON.stringify(data),
        receipt_url || '',
        customer?.name || '',
        customer?.email || '',
        customer?.phone || '',
        payment.id,
      ]);

      await updateOrderPaymentStatus(payment.order_id);

      // Synchroniser le paiement vers le système de gestion
      const [orderForSync] = await pool.query('SELECT * FROM ecom_orders WHERE id = ?', [payment.order_id]);
      if (orderForSync.length > 0) {
        await syncPaymentToManagement(payment, orderForSync[0]);
      }

      // Email de confirmation de paiement au client (non-bloquant)
      try {
        const [custInfo] = await pool.query('SELECT email, first_name, last_name FROM ecom_customers WHERE id = ?', [payment.customer_id]);
        const [orderInfo] = await pool.query('SELECT order_number FROM ecom_orders WHERE id = ?', [payment.order_id]);
        if (custInfo.length > 0 && custInfo[0].email) {
          const methodLabels = { wave: 'Wave', orange_money: 'Orange Money', free_money: 'Free Money', card: 'Carte bancaire', cash: 'Espèces' };
          sendNotification('ecom_payment_success', {
            orderNumber: orderInfo[0]?.order_number || payment.payment_number,
            customerName: `${custInfo[0].first_name || ''} ${custInfo[0].last_name || ''}`.trim(),
            amount: new Intl.NumberFormat('fr-FR').format(payment.amount),
            method: methodLabels[payment.method] || payment.method,
            receiptUrl: receipt_url || null,
          }, custInfo[0].email).catch(() => {});
        }
      } catch (e) { /* non-bloquant */ }

      console.log(`[PayDunya Webhook] Paiement ${payment.payment_number} confirmé !`);
    } else if (status === 'failed' || status === 'cancelled') {
      await pool.query(`
        UPDATE ecom_payments
        SET status = 'failed', failed_at = NOW(), failure_reason = ?, provider_response = ?
        WHERE id = ?
      `, [
        `PayDunya: ${status}`,
        JSON.stringify(data),
        payment.id,
      ]);

      console.log(`[PayDunya Webhook] Paiement ${payment.payment_number} échoué: ${status}`);
    }

    // Toujours répondre 200 pour que PayDunya ne re-tente pas
    res.json({ received: true });

  } catch (error) {
    console.error('[PayDunya Webhook] Erreur:', error);
    // Répondre 200 même en cas d'erreur pour éviter les re-tentatives
    res.json({ received: true, error: true });
  }
});

// Legacy webhooks (garder pour compatibilité)
router.post('/webhook/wave', async (req, res) => {
  res.json({ received: true, message: 'Veuillez utiliser le webhook PayDunya à /webhook/paydunya' });
});

router.post('/webhook/orange', async (req, res) => {
  res.json({ received: true, message: 'Veuillez utiliser le webhook PayDunya à /webhook/paydunya' });
});

// ============================================================
// ROUTES ADMIN
// ============================================================

/**
 * GET /api/ecommerce/payments/admin/list
 * Liste des paiements (admin)
 */
router.get('/admin/list', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, method, date_from, date_to } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      whereClause += ' AND p.status = ?';
      params.push(status);
    }

    if (method) {
      whereClause += ' AND p.method = ?';
      params.push(method);
    }

    if (date_from) {
      whereClause += ' AND DATE(p.created_at) >= ?';
      params.push(date_from);
    }

    if (date_to) {
      whereClause += ' AND DATE(p.created_at) <= ?';
      params.push(date_to);
    }

    const [payments] = await pool.query(`
      SELECT p.*, o.order_number, c.first_name, c.last_name, c.phone
      FROM ecom_payments p
      JOIN ecom_orders o ON p.order_id = o.id
      JOIN ecom_customers c ON p.customer_id = c.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total FROM ecom_payments p ${whereClause}
    `, params);

    // Stats rapides
    const [stats] = await pool.query(`
      SELECT
        COUNT(*) as total_payments,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_collected,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count
      FROM ecom_payments
    `);

    res.json({
      success: true,
      data: payments,
      stats: stats[0] || {},
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / parseInt(limit)),
      },
    });

  } catch (error) {
    console.error('Erreur admin payments:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/ecommerce/payments/:id/validate
 * Valider un paiement manuellement (admin) — surtout pour les paiements cash
 */
router.put('/:id/validate', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const [payments] = await pool.query('SELECT * FROM ecom_payments WHERE id = ?', [id]);

    if (payments.length === 0) {
      return res.status(404).json({ success: false, error: 'Paiement non trouvé' });
    }

    const payment = payments[0];

    if (status === 'completed') {
      await pool.query(`
        UPDATE ecom_payments
        SET status = 'completed', paid_at = NOW(),
            metadata = JSON_SET(COALESCE(metadata, '{}'), '$.validated_by', ?, '$.validation_notes', ?)
        WHERE id = ?
      `, [req.user.id, notes || '', id]);

      await updateOrderPaymentStatus(payment.order_id);

      // Synchroniser vers le système de gestion
      const [orderForSync] = await pool.query('SELECT * FROM ecom_orders WHERE id = ?', [payment.order_id]);
      if (orderForSync.length > 0) {
        await syncPaymentToManagement(payment, orderForSync[0]);
      }
    } else if (status === 'failed') {
      await pool.query(`
        UPDATE ecom_payments
        SET status = 'failed', failed_at = NOW(), failure_reason = ?
        WHERE id = ?
      `, [notes || 'Rejeté par admin', id]);
    }

    res.json({
      success: true,
      message: `Paiement ${status === 'completed' ? 'validé' : 'rejeté'} avec succès`,
    });

  } catch (error) {
    console.error('Erreur validation admin:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/ecommerce/payments/config
 * Info de configuration PayDunya (pour le frontend)
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      provider: 'paydunya',
      configured: paydunyaService.isConfigured(),
      mode: process.env.PAYDUNYA_MODE || 'test',
      methods: [
        { id: 'wave', name: 'Wave', type: 'mobile', icon: 'wave', available: true },
        { id: 'orange_money', name: 'Orange Money', type: 'mobile', icon: 'orange', available: true },
        { id: 'free_money', name: 'Free Money', type: 'mobile', icon: 'free', available: true },
        { id: 'card', name: 'Carte Bancaire', type: 'card', icon: 'card', available: true },
        { id: 'cash', name: 'Espèces', type: 'cash', icon: 'cash', available: true },
      ],
    },
  });
});

module.exports = router;
