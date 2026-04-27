const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');

// 🧠 Smart Accounting Engine - Comptabilité Invisible
let smartAccountingEngine = null;
try {
    smartAccountingEngine = require('../services/smartAccountingEngine');
    console.log('✅ Smart Accounting Engine chargé pour les ventes');
} catch (e) {
    console.warn('⚠️ Smart Accounting Engine non disponible:', e.message);
}

const router = express.Router();

// Auto-migration: ajouter les colonnes manquantes
(async () => {
  const migrations = [
    'ALTER TABLE sales ADD COLUMN tax_rate DECIMAL(5,2) DEFAULT 18.00 AFTER subtotal',
    "ALTER TABLE sales ADD COLUMN source ENUM('counter','phone','online','api') DEFAULT 'counter' AFTER payment_method",
    'ALTER TABLE sales ADD COLUMN created_by VARCHAR(255) NULL AFTER source',
    'ALTER TABLE customers ADD COLUMN has_online_access TINYINT(1) DEFAULT 0 AFTER status',
  ];
  for (const sql of migrations) {
    try { await pool.execute(sql); } catch (e) { /* colonne existe déjà */ }
  }
})();

// 🔒 Sécurité: Rate limiter pour les opérations d'écriture
const writeRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Max 30 créations/modifications par minute
  message: { success: false, error: 'Trop de requêtes, veuillez réessayer dans une minute' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 🔒 Sécurité: Sanitization XSS pour les champs texte
const sanitizeHtml = (str) => {
  if (!str) return str;
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

// 🔧 Helper: Normaliser une vente
const normalizeSale = (sale, items = [], user = {}) => ({
  id: sale.id,
  sale_number: sale.sale_number,
  customerId: sale.customer_id,
  customerName: sale.customer_name || sale.client_name || 'Client inconnu',
  customerCompany: sale.customer_company,
  sellerName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Vendeur',
  status: sale.status,
  sale_type: sale.sale_type || 'cash',
  source: sale.source || 'counter',
  created_by: sale.created_by || null,
  type_beton: sale.type_beton,
  camion: sale.camion,
  client_name: sale.client_name,
  notes: sale.notes,
  subtotal: Number(sale.subtotal || 0),
  tax_rate: Number(sale.tax_rate || 18),
  tax_amount: Number(sale.tax_amount || 0),
  total: Number(sale.total_amount || 0),
  total_amount: Number(sale.total_amount || 0),
  amount_paid: Number(sale.amount_paid || 0),
  remaining: Number(sale.total_amount || 0) - Number(sale.amount_paid || 0),
  payment_status: sale.payment_status || 'pending',
  payment_method: sale.payment_method,
  createdAt: sale.created_at,
  created_at: sale.created_at,
  sale_date: sale.sale_date,
  deliveryDate: sale.due_date,
  due_date: sale.due_date,
  items: items.map(item => ({
    productId: item.product_id,
    productName: item.product_name || 'Produit',
    productUnit: item.product_unit,
    quantity: Number(item.quantity || 0),
    price: Number(item.unit_price || 0),
    unit_price: Number(item.unit_price || 0),
    total: Number(item.line_total || 0),
    line_total: Number(item.line_total || 0),
  })),
});

// ────────────────────────────────────────────
// GET /  — Liste paginée (fix N+1 avec JOIN)
// ────────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    // Filtres optionnels
    const { date_from, date_to, sale_type, type_beton, search, status, source } = req.query;

    let whereExtra = '';
    const params = [req.user.id];

    if (date_from) {
      whereExtra += ' AND s.sale_date >= ?';
      params.push(date_from);
    }
    if (date_to) {
      whereExtra += ' AND s.sale_date <= ?';
      params.push(date_to + ' 23:59:59');
    }
    if (sale_type && sale_type !== 'all') {
      whereExtra += ' AND s.sale_type = ?';
      params.push(sale_type);
    }
    if (type_beton && type_beton !== 'all') {
      whereExtra += ' AND s.type_beton = ?';
      params.push(type_beton);
    }
    if (status && status !== 'all') {
      whereExtra += ' AND s.status = ?';
      params.push(status);
    }
    if (source && source !== 'all') {
      whereExtra += ' AND s.source = ?';
      params.push(source);
    }
    if (search) {
      whereExtra += ' AND (c.name LIKE ? OR s.client_name LIKE ? OR s.sale_number LIKE ? OR s.camion LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    // Compter le total pour la pagination
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.user_id = ? ${whereExtra}`,
      params
    );
    const totalRecords = countResult[0].total;

    // Requête principale avec JOIN (pas de N+1)
    const queryParams = [...params, parseInt(limit), parseInt(offset)];
    const [sales] = await pool.query(`
      SELECT
        s.*,
        c.name as customer_name,
        c.company as customer_company,
        COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.sale_id = s.id AND p.status = 'completed'), 0) as amount_paid
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.user_id = ? ${whereExtra}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `, queryParams);

    if (sales.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: { page, limit, total: totalRecords, totalPages: 0 }
      });
    }

    // ✅ FIX N+1: Charger TOUS les items en une seule requête
    const saleIds = sales.map(s => s.id);
    const placeholders = saleIds.map(() => '?').join(',');
    const [allItems] = await pool.execute(`
      SELECT
        si.*,
        p.name as product_name,
        p.unit as product_unit
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id IN (${placeholders})
    `, saleIds);

    // Grouper les items par sale_id
    const itemsBySale = {};
    for (const item of allItems) {
      if (!itemsBySale[item.sale_id]) itemsBySale[item.sale_id] = [];
      itemsBySale[item.sale_id].push(item);
    }

    const salesWithItems = sales.map(sale =>
      normalizeSale(sale, itemsBySale[sale.id] || [], req.user)
    );

    res.json({
      success: true,
      data: salesWithItems,
      pagination: {
        page,
        limit,
        total: totalRecords,
        totalPages: Math.ceil(totalRecords / limit)
      }
    });

  } catch (error) {
    console.error('Erreur récupération ventes:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des ventes'
    });
  }
});

// ────────────────────────────────────────────
// GET /:id  — Détail d'une vente unique
// ────────────────────────────────────────────
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [sales] = await pool.execute(`
      SELECT
        s.*,
        c.name as customer_name,
        c.company as customer_company,
        c.phone as customer_phone,
        c.email as customer_email,
        c.address as customer_address,
        c.customer_type,
        c.prepaid_balance,
        COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.sale_id = s.id AND p.status = 'completed'), 0) as amount_paid
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ? AND s.user_id = ?
    `, [id, req.user.id]);

    if (sales.length === 0) {
      return res.status(404).json({ success: false, error: 'Vente introuvable' });
    }

    const sale = sales[0];

    // Charger les items
    const [items] = await pool.execute(`
      SELECT si.*, p.name as product_name, p.unit as product_unit
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `, [id]);

    // Charger les paiements liés
    const [payments] = await pool.execute(`
      SELECT * FROM payments WHERE sale_id = ? ORDER BY payment_date DESC
    `, [id]);

    const normalized = normalizeSale(sale, items, req.user);
    normalized.customer = {
      id: sale.customer_id,
      name: sale.customer_name,
      company: sale.customer_company,
      phone: sale.customer_phone,
      email: sale.customer_email,
      address: sale.customer_address,
      customer_type: sale.customer_type,
      prepaid_balance: Number(sale.prepaid_balance || 0),
    };
    normalized.payments = payments.map(p => ({
      id: p.id,
      amount: Number(p.amount),
      payment_method: p.payment_method,
      payment_date: p.payment_date,
      reference_number: p.reference_number,
      status: p.status,
      notes: p.notes,
    }));

    res.json({ success: true, data: normalized });

  } catch (error) {
    console.error('Erreur détail vente:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération de la vente' });
  }
});

// ────────────────────────────────────────────
// POST /  — Créer une nouvelle vente
// ────────────────────────────────────────────
router.post('/', authenticateToken, requireRole(['admin', 'manager', 'seller']), writeRateLimiter, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const {
      customerId,
      items,
      deliveryDate,
      notes,
      status,
      sale_type,
      camion,
      type_beton,
      client_name,
      tax_rate: customTaxRate,
      source
    } = req.body;

    // Valider la source (omnichannel)
    const validSources = ['counter', 'phone', 'online', 'api'];
    const saleSource = validSources.includes(source) ? source : 'counter';

    // Validation
    if (!customerId && !client_name) {
      return res.status(400).json({
        success: false,
        error: 'Le client (customerId ou client_name) est obligatoire'
      });
    }
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Au moins un article est obligatoire'
      });
    }

    // Sanitize text inputs
    const safeNotes = notes ? sanitizeHtml(String(notes)) : null;
    const safeClientName = client_name ? sanitizeHtml(String(client_name)) : null;
    const safeCamion = camion ? sanitizeHtml(String(camion)) : null;

    // Fetcher le client pour les flags fiscaux (seulement si customerId fourni)
    let effectiveTaxRate = customTaxRate !== undefined ? Number(customTaxRate) : 18;
    let wholesaleDiscount = 0;
    if (customerId) {
      const [custRows] = await connection.execute(
        'SELECT tva_exempt, is_reseller, wholesale_discount FROM customers WHERE id = ?',
        [customerId]
      );
      const cust = custRows[0] || {};
      if (customTaxRate === undefined) {
        effectiveTaxRate = cust.tva_exempt ? 0 : 18;
      }
      wholesaleDiscount = cust.is_reseller ? Number(cust.wholesale_discount || 0) : 0;
    }

    // Validation du quota si vente quotataire
    if (sale_type === 'quotataire') {
      const [quotaRows] = await connection.execute(
        `SELECT * FROM client_quotas
         WHERE customer_id = ? AND status = 'active'
         ORDER BY created_at DESC LIMIT 1`,
        [customerId]
      );

      if (quotaRows.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          error: 'Aucun quota actif pour ce client. Veuillez créer un quota d\'abord.'
        });
      }

      const activeQuota = quotaRows[0];
      const totalOrdered = items.reduce((sum, item) => sum + Number(item.quantity), 0);

      const [consumed] = await connection.execute(`
        SELECT COALESCE(SUM(si.quantity), 0) as total_consumed
        FROM sales s JOIN sale_items si ON si.sale_id = s.id
        WHERE s.customer_id = ? AND s.sale_type = 'quotataire'
          AND s.created_at >= ? AND s.status != 'cancelled'
      `, [customerId, activeQuota.created_at]);

      const totalConsumed = Number(consumed[0].total_consumed);
      const remaining = Number(activeQuota.quota_initial) - totalConsumed;

      if (totalOrdered > remaining) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          error: `Quota dépassé. Quota initial: ${activeQuota.quota_initial}, Consommé: ${totalConsumed}, Restant: ${remaining}, Commandé: ${totalOrdered}`
        });
      }

      await connection.execute(
        `UPDATE client_quotas SET quota_consumed = ? WHERE id = ?`,
        [totalConsumed + totalOrdered, activeQuota.id]
      );

      if (totalConsumed + totalOrdered >= Number(activeQuota.quota_initial)) {
        await connection.execute(
          `UPDATE client_quotas SET status = 'completed' WHERE id = ?`,
          [activeQuota.id]
        );
      }
    }

    // Calculer les totaux avec discount et TVA dynamique
    let subtotal = 0;
    const processedItems = items.map(item => {
      const discountPct = wholesaleDiscount;
      const discountedPrice = item.price * (1 - discountPct / 100);
      const lineTotal = item.quantity * discountedPrice;
      subtotal += lineTotal;
      return {
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.price,
        line_total: lineTotal,
        tax_rate: effectiveTaxRate,
        discount_percentage: discountPct
      };
    });

    const taxAmount = subtotal * (effectiveTaxRate / 100);
    const totalAmount = subtotal + taxAmount;

    // Générer un numéro de vente unique
    const saleNumber = `VTE-${Date.now()}`;
    const saleId = uuidv4();

    // Créer la vente
    await connection.execute(
      `INSERT INTO sales (id, user_id, customer_id, sale_number, status, sale_date, due_date, subtotal, tax_rate, tax_amount, total_amount, payment_status, sale_type, camion, type_beton, client_name, notes, source, created_by)
       VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)`,
      [saleId, req.user.id, customerId || null, saleNumber, status || 'draft', deliveryDate || null, subtotal, effectiveTaxRate, taxAmount, totalAmount, sale_type || 'cash', safeCamion || null, type_beton || null, safeClientName || null, safeNotes || null, saleSource, req.user.first_name || req.user.email || null]
    );

    // Créer les articles de vente et déduire le stock
    for (const item of processedItems) {
      await connection.execute(
        `INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, discount_percentage, tax_rate, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), saleId, item.product_id || null, item.quantity, item.unit_price, item.discount_percentage, item.tax_rate, item.line_total]
      );

      // Déduire le stock si le produit est suivi en inventaire
      if (item.product_id) {
        const [invRows] = await connection.execute(
          'SELECT quantity FROM inventory_items WHERE product_id = ? AND user_id = ?',
          [item.product_id, req.user.id]
        );
        if (invRows.length > 0) {
          const previousStock = parseFloat(invRows[0].quantity) || 0;
          const newStock = Math.max(0, previousStock - parseFloat(item.quantity));

          await connection.execute(
            'UPDATE inventory_items SET quantity = ?, updated_at = NOW() WHERE product_id = ? AND user_id = ?',
            [newStock, item.product_id, req.user.id]
          );

          // Enregistrer le mouvement de sortie
          await connection.execute(
            `INSERT INTO stock_movements (id, user_id, product_id, movement_type, quantity, reference_type, reference_id, notes, previous_stock, new_stock)
             VALUES (?, ?, ?, 'out', ?, 'sale', ?, ?, ?, ?)`,
            [uuidv4(), req.user.id, item.product_id, item.quantity, saleId, `Vente ${saleNumber}`, previousStock, newStock]
          );

          // Vérifier alerte stock bas
          const [minRows] = await connection.execute(
            'SELECT min_stock_level FROM inventory_items WHERE product_id = ? AND user_id = ?',
            [item.product_id, req.user.id]
          );
          const minLevel = parseFloat(minRows[0]?.min_stock_level) || 0;
          if (minLevel > 0 && newStock <= minLevel) {
            const [prodInfo] = await connection.execute(
              'SELECT name FROM products WHERE id = ?', [item.product_id]
            );
            const prodName = prodInfo[0]?.name || 'Produit';
            try {
              await connection.execute(
                `INSERT INTO notifications (id, user_id, type, title, message, data, is_read)
                 VALUES (?, ?, 'stock_alert', ?, ?, ?, 0)`,
                [
                  uuidv4(), req.user.id,
                  `Stock bas: ${prodName}`,
                  newStock === 0
                    ? `${prodName} est en rupture de stock !`
                    : `${prodName} — stock restant: ${newStock} (seuil min: ${minLevel})`,
                  JSON.stringify({ product_id: item.product_id, stock: newStock, min_stock_level: minLevel })
                ]
              );
            } catch (notifErr) {
              console.warn('Notification stock bas non créée (table manquante?):', notifErr.message);
            }
          }
        }
      }
    }

    // ✅ Gestion atomique du solde client (quotataire: déduire prepaid_balance, cash: ajouter dette)
    if (customerId && sale_type === 'quotataire') {
      const [custBalRows] = await connection.execute(
        'SELECT prepaid_balance, current_balance FROM customers WHERE id = ?', [customerId]
      );
      if (custBalRows.length > 0) {
        const currentPrepaid = Number(custBalRows[0].prepaid_balance || 0);
        const currentDebt = Number(custBalRows[0].current_balance || 0);
        const amountFromPrepaid = Math.min(currentPrepaid, totalAmount);
        const amountAsDebt = totalAmount - amountFromPrepaid;

        const newPrepaid = currentPrepaid - amountFromPrepaid;
        const newDebt = currentDebt + amountAsDebt;

        await connection.execute(
          'UPDATE customers SET prepaid_balance = ?, current_balance = ?, updated_at = NOW() WHERE id = ?',
          [newPrepaid, newDebt, customerId]
        );

        // Si le solde couvre tout, marquer comme payé
        if (amountAsDebt <= 0) {
          await connection.execute(
            'UPDATE sales SET payment_status = ? WHERE id = ?',
            ['paid', saleId]
          );
          // Enregistrer le paiement auto
          await connection.execute(
            `INSERT INTO payments (id, user_id, sale_id, payment_number, amount, payment_method, status, notes)
             VALUES (?, ?, ?, ?, ?, 'prepaid', 'completed', 'Déduction automatique solde prépayé')`,
            [uuidv4(), req.user.id, saleId, `PRE-${Date.now()}`, totalAmount]
          );
        } else if (amountFromPrepaid > 0) {
          await connection.execute(
            'UPDATE sales SET payment_status = ? WHERE id = ?',
            ['partial', saleId]
          );
          await connection.execute(
            `INSERT INTO payments (id, user_id, sale_id, payment_number, amount, payment_method, status, notes)
             VALUES (?, ?, ?, ?, ?, 'prepaid', 'completed', 'Déduction partielle solde prépayé')`,
            [uuidv4(), req.user.id, saleId, `PRE-${Date.now()}`, amountFromPrepaid]
          );
        }
      }
    }

    await connection.commit();

    // 🧠 Comptabilité Invisible: Enregistrer automatiquement l'écriture comptable
    if (smartAccountingEngine && status === 'completed') {
      try {
        await smartAccountingEngine.enregistrerVente({
          id: saleId,
          sale_number: saleNumber,
          customer_id: customerId,
          client_name: safeClientName,
          total_amount: totalAmount,
          subtotal: subtotal,
          tax_amount: taxAmount,
          tax_rate: effectiveTaxRate,
          sale_type: sale_type || 'cash',
          payment_method: null,
          created_at: new Date()
        });
        console.log(`✅ Écriture comptable créée pour vente ${saleNumber}`);
      } catch (comptaError) {
        // Ne pas bloquer la vente si la comptabilité échoue
        console.error('⚠️ Erreur comptabilité (non bloquante):', comptaError.message);
      }
    }

    res.status(201).json({
      success: true,
      data: { id: saleId, sale_number: saleNumber, total_amount: totalAmount, tax_rate: effectiveTaxRate }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Erreur création vente:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la vente'
    });
  } finally {
    connection.release();
  }
});

// ────────────────────────────────────────────
// POST /:id/duplicate  — Dupliquer une vente
// ────────────────────────────────────────────
router.post('/:id/duplicate', authenticateToken, requireRole(['admin', 'manager', 'seller']), writeRateLimiter, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;

    // Charger la vente originale
    const [origSales] = await connection.execute(
      'SELECT * FROM sales WHERE id = ? AND user_id = ?', [id, req.user.id]
    );
    if (origSales.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, error: 'Vente introuvable' });
    }
    const orig = origSales[0];

    // Charger les items originaux
    const [origItems] = await connection.execute(
      'SELECT * FROM sale_items WHERE sale_id = ?', [id]
    );

    const newSaleId = uuidv4();
    const newSaleNumber = `VTE-${Date.now()}`;

    await connection.execute(
      `INSERT INTO sales (id, user_id, customer_id, sale_number, status, sale_date, due_date, subtotal, tax_rate, tax_amount, total_amount, payment_status, sale_type, camion, type_beton, client_name, notes, source, created_by)
       VALUES (?, ?, ?, ?, 'draft', NOW(), ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)`,
      [newSaleId, req.user.id, orig.customer_id, newSaleNumber, orig.due_date, orig.subtotal, orig.tax_rate || 18, orig.tax_amount, orig.total_amount, orig.sale_type, orig.camion, orig.type_beton, orig.client_name, orig.notes ? `[Copie] ${orig.notes}` : '[Copie]', orig.source || 'counter', req.user.first_name || req.user.email || null]
    );

    for (const item of origItems) {
      await connection.execute(
        `INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, discount_percentage, tax_rate, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), newSaleId, item.product_id, item.quantity, item.unit_price, item.discount_percentage || 0, item.tax_rate || 18, item.line_total]
      );
    }

    await connection.commit();
    res.status(201).json({ success: true, data: { id: newSaleId, sale_number: newSaleNumber } });

  } catch (error) {
    await connection.rollback();
    console.error('Erreur duplication vente:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la duplication' });
  } finally {
    connection.release();
  }
});

// ────────────────────────────────────────────
// PUT /:id  — Mettre à jour une vente
// ────────────────────────────────────────────
router.put('/:id', authenticateToken, requireRole(['admin', 'manager', 'seller']), writeRateLimiter, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const updates = req.body;

    // Vérifier le statut actuel de la vente
    const [currentSale] = await connection.execute(
      'SELECT status, sale_number FROM sales WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (currentSale.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, error: 'Vente introuvable' });
    }
    const previousStatus = currentSale[0]?.status;

    // Construire la requête de mise à jour dynamiquement
    const allowedFields = ['status', 'due_date', 'payment_status', 'payment_method', 'notes', 'sale_type', 'camion', 'type_beton', 'client_name', 'tax_rate'];
    const setClause = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (setClause.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        success: false,
        error: 'Aucun champ valide à mettre à jour'
      });
    }

    setClause.push('updated_at = NOW()');
    values.push(id, req.user.id);

    await connection.execute(
      `UPDATE sales SET ${setClause.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );

    // Si la vente est annulée, remettre le stock ET restaurer le solde client
    if (updates.status === 'cancelled' && previousStatus !== 'cancelled') {
      // Récupérer les infos complètes de la vente pour restaurer le solde
      const [saleInfo] = await connection.execute(
        'SELECT customer_id, sale_type, total_amount FROM sales WHERE id = ?', [id]
      );
      const cancelledSale = saleInfo[0];

      // Remettre le stock
      const [saleItems] = await connection.execute(
        'SELECT product_id, quantity FROM sale_items WHERE sale_id = ?',
        [id]
      );

      for (const item of saleItems) {
        if (!item.product_id) continue;

        const [invRows] = await connection.execute(
          'SELECT quantity FROM inventory_items WHERE product_id = ? AND user_id = ?',
          [item.product_id, req.user.id]
        );
        if (invRows.length > 0) {
          const previousStock = parseFloat(invRows[0].quantity) || 0;
          const newStock = previousStock + parseFloat(item.quantity);

          await connection.execute(
            'UPDATE inventory_items SET quantity = ?, updated_at = NOW() WHERE product_id = ? AND user_id = ?',
            [newStock, item.product_id, req.user.id]
          );

          await connection.execute(
            `INSERT INTO stock_movements (id, user_id, product_id, movement_type, quantity, reference_type, reference_id, notes, previous_stock, new_stock)
             VALUES (?, ?, ?, 'in', ?, 'return', ?, ?, ?, ?)`,
            [uuidv4(), req.user.id, item.product_id, item.quantity, id,
             `Retour stock - Annulation vente ${currentSale[0]?.sale_number || id}`,
             previousStock, newStock]
          );
        }
      }

      // ✅ Restaurer le solde prépayé du client si vente quotataire
      if (cancelledSale && cancelledSale.customer_id) {
        // Récupérer les paiements 'prepaid' effectués sur cette vente
        const [prepaidPayments] = await connection.execute(
          `SELECT SUM(amount) as total_prepaid FROM payments WHERE sale_id = ? AND payment_method = 'prepaid' AND status = 'completed'`,
          [id]
        );
        const prepaidRefund = Number(prepaidPayments[0]?.total_prepaid || 0);

        if (prepaidRefund > 0) {
          // Restaurer le solde prépayé
          await connection.execute(
            'UPDATE customers SET prepaid_balance = prepaid_balance + ?, updated_at = NOW() WHERE id = ?',
            [prepaidRefund, cancelledSale.customer_id]
          );
        }

        // Réduire la dette si elle avait été augmentée
        const saleTotal = Number(cancelledSale.total_amount || 0);
        const debtPortion = saleTotal - prepaidRefund;
        if (debtPortion > 0) {
          await connection.execute(
            'UPDATE customers SET current_balance = GREATEST(0, current_balance - ?), updated_at = NOW() WHERE id = ?',
            [debtPortion, cancelledSale.customer_id]
          );
        }

        // Marquer les paiements prepaid comme annulés
        await connection.execute(
          `UPDATE payments SET status = 'cancelled', notes = CONCAT(COALESCE(notes, ''), ' [Annulé - vente annulée]') WHERE sale_id = ? AND payment_method = 'prepaid'`,
          [id]
        );
      }
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Vente mise à jour avec succès'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Erreur mise à jour vente:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de la vente'
    });
  } finally {
    connection.release();
  }
});

module.exports = router;
