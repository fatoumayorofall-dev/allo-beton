// 📦 Import des dépendances
const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// 🔒 Sécurité: Rate limiter pour les opérations sensibles (création/modification)
const writeRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Max 30 créations/modifications par minute
  message: { success: false, error: 'Trop de requêtes, veuillez réessayer dans une minute' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 🔒 Sécurité: Rate limiter pour les dépôts (opérations financières)
const depositRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Max 10 dépôts par minute
  message: { success: false, error: 'Trop d\'opérations financières, veuillez patienter' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 🔒 Sécurité: Validation email
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const isValidEmail = (email) => !email || EMAIL_REGEX.test(email);

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

// 🔧 Helper: Normaliser un client (éviter les fallbacks dupliqués)
const normalizeCustomer = (c) => ({
  id: c.id,
  name: c.name,
  email: c.email,
  phone: c.phone,
  address: c.address,
  city: c.city,
  postal_code: c.postal_code || null,
  country: c.country || 'Sénégal',
  company: c.company,
  tax_number: c.tax_number || null,
  payment_terms: Number(c.payment_terms || 30),
  notes: c.notes,
  status: c.status,
  created_at: c.created_at,
  updated_at: c.updated_at,
  // Champs fiscaux
  tva_exempt: !!c.tva_exempt,
  is_reseller: !!c.is_reseller,
  wholesale_discount: Number(c.wholesale_discount || 0),
  // Champs financiers (double convention pour compatibilité frontend)
  creditLimit: Number(c.credit_limit || 0),
  credit_limit: Number(c.credit_limit || 0),
  balance: Number(c.current_balance || 0),
  debt: Number(c.current_balance || 0),
  current_balance: Number(c.current_balance || 0),
  prepaidBalance: Number(c.prepaid_balance || 0),
  prepaid_balance: Number(c.prepaid_balance || 0),
  // Type de client
  customerType: c.customer_type || 'simple',
  customer_type: c.customer_type || 'simple',
  // Nouveaux champs v2
  responsable_commercial: c.responsable_commercial || null,
  responsableCommercial: c.responsable_commercial || null,
  gps_lat: c.gps_lat != null ? Number(c.gps_lat) : null,
  gps_lng: c.gps_lng != null ? Number(c.gps_lng) : null,
  gpsLat: c.gps_lat != null ? Number(c.gps_lat) : null,
  gpsLng: c.gps_lng != null ? Number(c.gps_lng) : null,
  // Stats calculées
  totalPurchases: Number(c.total_purchases || 0),
  totalOrders: Number(c.total_orders || 0),
  lastPurchaseDate: c.last_purchase_date || null,
  last_purchase_date: c.last_purchase_date || null,
});

/* -----------------------------------------------------------
   🧱 ROUTES CLIENTS (Allo Béton) - Système complet

   Types de clients:
   - OCCASIONNEL: Client ponctuel, paiement cash uniquement, pas de crédit, pas de remise
   - SIMPLE: Client standard, paie cash ou à crédit
   - QUOTATAIRE: Client avec solde prépayé (dépose de l'argent, achète jusqu'à épuisement)
   - REVENDEUR: Grossiste avec remises automatiques

   Champs financiers:
   - current_balance: Dette du client (ce qu'il doit) - pour clients simples/revendeurs
   - prepaid_balance: Solde prépayé (ce qu'il peut dépenser) - pour quotataires
   ----------------------------------------------------------- */

// Liste des types de clients valides
const VALID_CUSTOMER_TYPES = ['occasionnel', 'simple', 'quotataire', 'revendeur'];
// Liste des statuts valides
const VALID_STATUSES = ['active', 'inactive', 'suspended', 'bloque'];

// Auto-migration: ajouter colonnes manquantes
(async () => {
  try {
    const [cols] = await pool.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers'"
    );
    const names = cols.map(c => c.COLUMN_NAME);

    if (!names.includes('customer_type')) {
      await pool.execute("ALTER TABLE customers ADD COLUMN customer_type ENUM('occasionnel', 'simple', 'quotataire', 'revendeur') DEFAULT 'simple'");
      console.log('✅ Colonne customer_type ajoutée');
    } else {
      // Mettre à jour l'ENUM pour inclure 'occasionnel' si absente
      try {
        await pool.execute("ALTER TABLE customers MODIFY COLUMN customer_type ENUM('occasionnel', 'simple', 'quotataire', 'revendeur') DEFAULT 'simple'");
        console.log('✅ customer_type ENUM mis à jour (occasionnel ajouté)');
      } catch (e) { /* ENUM déjà à jour */ }
    }
    if (!names.includes('prepaid_balance')) {
      await pool.execute("ALTER TABLE customers ADD COLUMN prepaid_balance DECIMAL(15,2) DEFAULT 0");
      console.log('✅ Colonne prepaid_balance ajoutée');
    }
    if (!names.includes('responsable_commercial')) {
      await pool.execute("ALTER TABLE customers ADD COLUMN responsable_commercial VARCHAR(255) NULL");
      console.log('✅ Colonne responsable_commercial ajoutée');
    }
    if (!names.includes('gps_lat')) {
      await pool.execute("ALTER TABLE customers ADD COLUMN gps_lat DECIMAL(10,8) NULL");
      console.log('✅ Colonne gps_lat ajoutée');
    }
    if (!names.includes('gps_lng')) {
      await pool.execute("ALTER TABLE customers ADD COLUMN gps_lng DECIMAL(11,8) NULL");
      console.log('✅ Colonne gps_lng ajoutée');
    }
    // Mettre à jour l'ENUM status pour inclure 'bloque'
    try {
      await pool.execute("ALTER TABLE customers MODIFY COLUMN status ENUM('active', 'inactive', 'suspended', 'bloque') DEFAULT 'active'");
      console.log('✅ status ENUM mis à jour (bloque ajouté)');
    } catch (e) { /* ENUM déjà à jour */ }
  } catch (e) {
    console.error('Migration customers:', e.message);
  }
})();

// ✅ 1. Récupérer tous les clients
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [customers] = await pool.execute(`
      SELECT
        c.id,
        c.name,
        c.email,
        c.phone,
        c.address,
        c.city,
        c.postal_code,
        c.country,
        c.company,
        c.tax_number,
        c.credit_limit,
        c.current_balance,
        c.payment_terms,
        COALESCE(c.prepaid_balance, 0) as prepaid_balance,
        c.notes,
        c.tva_exempt,
        c.is_reseller,
        c.wholesale_discount,
        COALESCE(c.customer_type, 'simple') as customer_type,
        c.status,
        c.created_at,
        c.updated_at,
        c.responsable_commercial,
        c.gps_lat,
        c.gps_lng,
        COALESCE(SUM(s.total_amount), 0) AS total_purchases,
        COUNT(DISTINCT s.id) AS total_orders,
        MAX(s.sale_date) AS last_purchase_date
      FROM customers c
      LEFT JOIN sales s ON c.id = s.customer_id AND s.status != 'cancelled'
      WHERE c.status IN ('active', 'bloque', 'suspended') AND c.user_id = ?
      GROUP BY c.id
      ORDER BY c.name ASC
    `, [req.user.id]);

    const transformed = customers.map(c => normalizeCustomer(c));

    return res.json({ success: true, data: transformed });
  } catch (error) {
    console.error('❌ Erreur récupération clients:', error);
    return res.status(500).json({ success: false, error: 'Erreur lors de la récupération des clients' });
  }
});

// ✅ 2. Créer un nouveau client
router.post('/', authenticateToken, requireRole(['admin', 'manager', 'seller']), writeRateLimiter, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      city,
      postal_code,
      country,
      company,
      tax_number,
      creditLimit,
      balance,
      prepaidBalance,
      payment_terms,
      notes,
      tva_exempt,
      is_reseller,
      wholesale_discount,
      customer_type,
      responsable_commercial,
      gps_lat,
      gps_lng,
    } = req.body;

    if (!name || String(name).trim() === '') {
      return res.status(400).json({ success: false, error: 'Le nom du client est obligatoire' });
    }

    const safeName = String(name).trim();
    const safePhone = phone ? String(phone).trim() : null;

    // Vérification des doublons
    if (safePhone) {
      const [existing] = await pool.execute(
        `SELECT id, name FROM customers WHERE user_id = ? AND status IN ('active', 'bloque', 'suspended')
         AND (LOWER(name) = LOWER(?) OR (phone IS NOT NULL AND phone = ?))`,
        [req.user.id, safeName, safePhone]
      );
      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Un client avec ce nom ou ce téléphone existe déjà: "${existing[0].name}"`
        });
      }
    }

    // Déterminer le type de client
    let custType = 'simple';
    if (customer_type && VALID_CUSTOMER_TYPES.includes(customer_type)) {
      custType = customer_type;
    } else if (is_reseller) {
      custType = 'revendeur';
    }

    // Règles métier par type
    let safeCreditLimit = Number.isFinite(Number(creditLimit)) ? Number(creditLimit) : 0;
    let safeBalance = Number.isFinite(Number(balance)) ? Number(balance) : 0;
    let safePrepaidBalance = Number.isFinite(Number(prepaidBalance)) ? Number(prepaidBalance) : 0;
    let safeWholesaleDiscount = Number.isFinite(Number(wholesale_discount)) ? Number(wholesale_discount) : 0;
    let safeIsReseller = is_reseller || custType === 'revendeur' ? 1 : 0;
    let safePaymentTerms = Number.isFinite(Number(payment_terms)) ? Number(payment_terms) : 30;

    if (custType === 'occasionnel') {
      // Occasionnel: pas de crédit, pas de remise, pas de prépayé, paiement cash
      safeCreditLimit = 0;
      safeBalance = 0;
      safePrepaidBalance = 0;
      safeWholesaleDiscount = 0;
      safeIsReseller = 0;
      safePaymentTerms = 0;
    } else if (custType === 'quotataire') {
      // Quotataire: pas de crédit, pas de remise
      safeCreditLimit = 0;
      safeWholesaleDiscount = 0;
      safeIsReseller = 0;
    } else if (custType === 'simple') {
      // Simple: pas de remise automatique
      safeWholesaleDiscount = 0;
      safeIsReseller = 0;
    }

    const safeValues = {
      id: uuidv4(),
      user_id: req.user.id,
      name: safeName,
      email: email ? String(email).trim().toLowerCase() : null,
      phone: safePhone,
      address: sanitizeHtml(address ? String(address).trim() : null),
      city: sanitizeHtml(city ? String(city).trim() : null),
      postal_code: sanitizeHtml(postal_code ? String(postal_code).trim() : null),
      country: sanitizeHtml(country ? String(country).trim() : null),
      company: sanitizeHtml(company ? String(company).trim() : null),
      tax_number: sanitizeHtml(tax_number ? String(tax_number).trim() : null),
      credit_limit: safeCreditLimit,
      current_balance: safeBalance,
      prepaid_balance: safePrepaidBalance,
      payment_terms: safePaymentTerms,
      notes: sanitizeHtml(notes ? String(notes).trim() : null),
      tva_exempt: tva_exempt ? 1 : 0,
      is_reseller: safeIsReseller,
      wholesale_discount: safeWholesaleDiscount,
      customer_type: custType,
      responsable_commercial: sanitizeHtml(responsable_commercial ? String(responsable_commercial).trim() : null),
      gps_lat: gps_lat != null && Number.isFinite(Number(gps_lat)) ? Number(gps_lat) : null,
      gps_lng: gps_lng != null && Number.isFinite(Number(gps_lng)) ? Number(gps_lng) : null,
    };

    await pool.execute(
      `INSERT INTO customers
        (id, user_id, name, email, phone, address, city, postal_code, country, company, tax_number, credit_limit, current_balance, prepaid_balance, payment_terms, notes, tva_exempt, is_reseller, wholesale_discount, customer_type, responsable_commercial, gps_lat, gps_lng, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW())`,
      [
        safeValues.id, safeValues.user_id, safeValues.name, safeValues.email,
        safeValues.phone, safeValues.address, safeValues.city, safeValues.postal_code,
        safeValues.country, safeValues.company, safeValues.tax_number,
        safeValues.credit_limit, safeValues.current_balance, safeValues.prepaid_balance,
        safeValues.payment_terms, safeValues.notes, safeValues.tva_exempt, safeValues.is_reseller,
        safeValues.wholesale_discount, safeValues.customer_type,
        safeValues.responsable_commercial, safeValues.gps_lat, safeValues.gps_lng,
      ]
    );

    const [rows] = await pool.execute('SELECT * FROM customers WHERE id = ?', [safeValues.id]);
    const created = rows[0];
    return res.status(201).json({
      success: true,
      data: normalizeCustomer(created)
    });
  } catch (error) {
    console.error('❌ Erreur création client:', error);
    return res.status(500).json({ success: false, error: 'Erreur lors de la création du client' });
  }
});

// ✅ 3. Mettre à jour un client
router.put('/:id', authenticateToken, requireRole(['admin', 'manager', 'seller']), writeRateLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, email, phone, address, city, postal_code, country, company, tax_number,
      creditLimit, balance, prepaidBalance, payment_terms, notes,
      tva_exempt, is_reseller, wholesale_discount, customer_type,
      responsable_commercial, gps_lat, gps_lng, status,
    } = req.body;

    if (!name || String(name).trim() === '') {
      return res.status(400).json({ success: false, error: 'Le nom du client est obligatoire' });
    }

    const safeName = String(name).trim();
    const safePhone = phone ? String(phone).trim() : null;

    // Vérification des doublons (exclure le client actuel)
    if (safePhone) {
      const [existing] = await pool.execute(
        `SELECT id, name FROM customers WHERE user_id = ? AND status IN ('active', 'bloque', 'suspended') AND id != ?
         AND (LOWER(name) = LOWER(?) OR (phone IS NOT NULL AND phone = ?))`,
        [req.user.id, id, safeName, safePhone]
      );
      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Un autre client avec ce nom ou ce téléphone existe déjà: "${existing[0].name}"`
        });
      }
    }

    let custType = customer_type || 'simple';
    if (!VALID_CUSTOMER_TYPES.includes(custType)) {
      custType = is_reseller ? 'revendeur' : 'simple';
    }

    // Règles métier par type
    let safeCreditLimit = Number.isFinite(Number(creditLimit)) ? Number(creditLimit) : 0;
    let safeBalance = Number.isFinite(Number(balance)) ? Number(balance) : 0;
    let safePrepaidBalance = Number.isFinite(Number(prepaidBalance)) ? Number(prepaidBalance) : 0;
    let safeWholesaleDiscount = Number.isFinite(Number(wholesale_discount)) ? Number(wholesale_discount) : 0;
    let safeIsReseller = is_reseller || custType === 'revendeur' ? 1 : 0;
    let safePaymentTerms = Number.isFinite(Number(payment_terms)) ? Number(payment_terms) : 30;

    if (custType === 'occasionnel') {
      safeCreditLimit = 0;
      safeWholesaleDiscount = 0;
      safeIsReseller = 0;
      safePaymentTerms = 0;
    } else if (custType === 'quotataire') {
      safeCreditLimit = 0;
      safeWholesaleDiscount = 0;
      safeIsReseller = 0;
    } else if (custType === 'simple') {
      safeWholesaleDiscount = 0;
      safeIsReseller = 0;
    }

    // Validation du statut si fourni
    let safeStatus = undefined;
    if (status && VALID_STATUSES.includes(status)) {
      safeStatus = status;
    }

    const updateFields = [
      'name=?', 'email=?', 'phone=?', 'address=?', 'city=?', 'postal_code=?', 'country=?',
      'company=?', 'tax_number=?', 'credit_limit=?', 'current_balance=?', 'prepaid_balance=?',
      'payment_terms=?', 'notes=?', 'tva_exempt=?', 'is_reseller=?', 'wholesale_discount=?',
      'customer_type=?', 'responsable_commercial=?', 'gps_lat=?', 'gps_lng=?', 'updated_at=NOW()'
    ];
    const updateValues = [
      safeName, email ? String(email).trim().toLowerCase() : null, safePhone,
      sanitizeHtml(address ? String(address).trim() : null),
      sanitizeHtml(city ? String(city).trim() : null),
      sanitizeHtml(postal_code ? String(postal_code).trim() : null),
      sanitizeHtml(country ? String(country).trim() : null),
      sanitizeHtml(company ? String(company).trim() : null),
      sanitizeHtml(tax_number ? String(tax_number).trim() : null),
      safeCreditLimit, safeBalance, safePrepaidBalance, safePaymentTerms,
      sanitizeHtml(notes ? String(notes).trim() : null),
      tva_exempt ? 1 : 0, safeIsReseller, safeWholesaleDiscount, custType,
      sanitizeHtml(responsable_commercial ? String(responsable_commercial).trim() : null),
      gps_lat != null && Number.isFinite(Number(gps_lat)) ? Number(gps_lat) : null,
      gps_lng != null && Number.isFinite(Number(gps_lng)) ? Number(gps_lng) : null,
    ];

    if (safeStatus) {
      updateFields.splice(updateFields.length - 1, 0, 'status=?');
      updateValues.push(safeStatus);
    }

    updateValues.push(id, req.user.id);

    await pool.execute(
      `UPDATE customers SET ${updateFields.join(', ')} WHERE id=? AND user_id=?`,
      updateValues
    );

    const [rows] = await pool.execute('SELECT * FROM customers WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Client introuvable' });
    }

    const updated = rows[0];
    return res.json({
      success: true,
      data: normalizeCustomer(updated),
      message: 'Client mis à jour avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur mise à jour client:', error);
    return res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour du client' });
  }
});

// ✅ 4. Ajouter un dépôt (recharger le solde prépayé d'un quotataire)
// Si le client a une dette, elle est d'abord remboursée sur les ventes impayées (FIFO), le reste va dans le solde prépayé
// TRAÇABILITÉ COMPLÈTE: Enregistrement dans client_deposits et allocation aux ventes dans deposit_allocations
router.post('/:id/deposit', authenticateToken, requireRole(['admin', 'manager', 'seller']), depositRateLimiter, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { amount, notes, payment_method, reference } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'Montant invalide' });
    }

    await connection.beginTransaction();

    // Vérifier que le client existe
    const [customers] = await connection.execute(
      'SELECT * FROM customers WHERE id = ? AND user_id = ? AND status = "active"',
      [id, req.user.id]
    );
    if (customers.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Client introuvable' });
    }

    const customer = customers[0];
    const depositAmount = Number(amount);
    const currentDebt = Number(customer.current_balance || 0);
    const currentPrepaid = Number(customer.prepaid_balance || 0);

    let amountToDebt = 0;       // Montant qui rembourse la dette
    let amountToPrepaid = 0;    // Montant qui va au solde prépayé
    let newDebt = currentDebt;
    let newPrepaid = currentPrepaid;
    const allocations = [];     // Traçabilité: liste des ventes remboursées

    // Si le client a une dette, on rembourse d'abord sur les ventes impayées (FIFO)
    if (currentDebt > 0) {
      // Récupérer les ventes impayées ou partiellement payées (les plus anciennes d'abord)
      const [unpaidSales] = await connection.execute(`
        SELECT 
          s.id, s.sale_number, s.sale_date, s.total_amount, s.payment_status,
          COALESCE(SUM(p.amount), 0) as paid_amount,
          (s.total_amount - COALESCE(SUM(p.amount), 0)) as remaining_amount,
          GROUP_CONCAT(DISTINCT CONCAT(si.quantity, ' x ', COALESCE(pr.name, s.type_beton, 'Produit')) SEPARATOR ', ') as product_details
        FROM sales s
        LEFT JOIN payments p ON p.sale_id = s.id AND p.status = 'completed'
        LEFT JOIN sale_items si ON si.sale_id = s.id
        LEFT JOIN products pr ON si.product_id = pr.id
        WHERE s.customer_id = ? AND s.status != 'cancelled' 
          AND s.payment_status IN ('pending', 'partial')
        GROUP BY s.id
        HAVING remaining_amount > 0
        ORDER BY s.sale_date ASC, s.created_at ASC
      `, [id]);

      let remainingDeposit = depositAmount;

      for (const sale of unpaidSales) {
        if (remainingDeposit <= 0) break;

        const saleRemaining = Number(sale.remaining_amount);
        const allocatedAmount = Math.min(remainingDeposit, saleRemaining);
        
        amountToDebt += allocatedAmount;
        remainingDeposit -= allocatedAmount;

        // Ajouter à la liste des allocations pour la traçabilité
        allocations.push({
          saleId: sale.id,
          saleNumber: sale.sale_number,
          saleDate: sale.sale_date,
          saleTotal: sale.total_amount,
          productDetails: sale.product_details || 'Produits divers',
          amountAllocated: allocatedAmount,
          previousBalance: saleRemaining,
          newBalance: saleRemaining - allocatedAmount
        });

        // Mettre à jour le statut de paiement de la vente
        const newPaidAmount = Number(sale.paid_amount) + allocatedAmount;
        const newPaymentStatus = newPaidAmount >= Number(sale.total_amount) ? 'paid' : 'partial';

        await connection.execute(
          'UPDATE sales SET payment_status = ?, updated_at = NOW() WHERE id = ?',
          [newPaymentStatus, sale.id]
        );

        // Enregistrer le paiement dans la table payments
        const paymentId = uuidv4();
        await connection.execute(
          `INSERT INTO payments (id, user_id, sale_id, payment_number, amount, payment_method, reference_number, status, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?)`,
          [
            paymentId, 
            req.user.id, 
            sale.id, 
            `DEP-${Date.now()}-${sale.sale_number}`,
            allocatedAmount,
            payment_method || 'especes',
            reference || null,
            `Remboursement via dépôt client - ${notes || ''}`
          ]
        );
      }

      // Le reste va au solde prépayé
      amountToPrepaid = remainingDeposit;
      newDebt = currentDebt - amountToDebt;
      newPrepaid = currentPrepaid + amountToPrepaid;
    } else {
      // Pas de dette, tout va au solde prépayé
      amountToPrepaid = depositAmount;
      newPrepaid = currentPrepaid + depositAmount;
    }

    // Mettre à jour le client
    await connection.execute(
      'UPDATE customers SET current_balance = ?, prepaid_balance = ?, updated_at = NOW() WHERE id = ?',
      [newDebt, newPrepaid, id]
    );

    // Enregistrer le dépôt dans la table client_deposits
    let depositId = null;
    try {
      const depositNumber = `DEP-${Date.now()}`;
      const [depositResult] = await connection.execute(
        `INSERT INTO client_deposits 
          (customer_id, user_id, deposit_number, amount, amount_to_debt, amount_to_prepaid, 
           payment_method, reference_number, notes, previous_debt, new_debt, previous_prepaid, new_prepaid)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, req.user.id, depositNumber, depositAmount, amountToDebt, amountToPrepaid,
          payment_method || 'especes', reference || null, notes || null,
          currentDebt, newDebt, currentPrepaid, newPrepaid
        ]
      );
      depositId = depositResult.insertId;

      // Enregistrer les allocations (traçabilité des ventes remboursées)
      for (const alloc of allocations) {
        await connection.execute(
          `INSERT INTO deposit_allocations 
            (deposit_id, sale_id, amount_allocated, sale_number, sale_date, sale_total, 
             product_details, previous_sale_balance, new_sale_balance)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            depositId, alloc.saleId, alloc.amountAllocated, alloc.saleNumber,
            alloc.saleDate, alloc.saleTotal, alloc.productDetails,
            alloc.previousBalance, alloc.newBalance
          ]
        );
      }
    } catch (tableError) {
      // Tables de traçabilité pas encore créées, on continue sans
      console.log('⚠️ Tables de traçabilité non disponibles:', tableError.message);
    }

    // Construire la note détaillée
    let depositNote = `[Dépôt ${new Date().toLocaleDateString('fr-FR')}: +${depositAmount.toLocaleString('fr-FR')} F`;
    if (payment_method) {
      depositNote += ` (${payment_method})`;
    }
    if (allocations.length > 0) {
      depositNote += ` | REMBOURSEMENTS:`;
      for (const alloc of allocations) {
        depositNote += ` Vente ${alloc.saleNumber} (${alloc.productDetails}): ${alloc.amountAllocated.toLocaleString('fr-FR')} F;`;
      }
    }
    if (amountToPrepaid > 0) {
      depositNote += ` | Solde prépayé: +${amountToPrepaid.toLocaleString('fr-FR')} F`;
    }
    depositNote += notes ? ` - ${notes}]` : ']';

    await connection.execute(
      'UPDATE customers SET notes = CONCAT(COALESCE(notes, ""), "\n", ?) WHERE id = ?',
      [depositNote, id]
    );

    await connection.commit();

    // Construire le message de retour
    let message = `Dépôt de ${depositAmount.toLocaleString('fr-FR')} F effectué.`;
    if (allocations.length > 0) {
      message += ` Remboursement de ${allocations.length} vente(s): ${amountToDebt.toLocaleString('fr-FR')} F.`;
    }
    message += ` Nouveau solde prépayé: ${newPrepaid.toLocaleString('fr-FR')} F.`;
    if (newDebt > 0) {
      message += ` Dette restante: ${newDebt.toLocaleString('fr-FR')} F.`;
    }

    return res.json({
      success: true,
      data: {
        depositId,
        depositAmount,
        amountToDebt,
        amountToPrepaid,
        previousDebt: currentDebt,
        newDebt,
        previousBalance: currentPrepaid,
        newBalance: newPrepaid,
        allocations, // Détail des ventes remboursées
      },
      message
    });
  } catch (error) {
    await connection.rollback();
    console.error('❌ Erreur dépôt:', error);
    return res.status(500).json({ success: false, error: 'Erreur lors du dépôt' });
  } finally {
    connection.release();
  }
});

// ✅ 4b. Récupérer l'historique des dépôts d'un client avec traçabilité complète
router.get('/:id/deposits', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer les dépôts
    const [deposits] = await pool.execute(`
      SELECT 
        d.*,
        c.name as customer_name
      FROM client_deposits d
      LEFT JOIN customers c ON d.customer_id = c.id
      WHERE d.customer_id = ?
      ORDER BY d.created_at DESC
    `, [id]);

    // Pour chaque dépôt, récupérer les allocations (ventes remboursées)
    const depositsWithAllocations = await Promise.all(
      deposits.map(async (deposit) => {
        const [allocations] = await pool.execute(`
          SELECT 
            da.*,
            s.sale_number,
            s.total_amount as sale_total,
            s.sale_date
          FROM deposit_allocations da
          LEFT JOIN sales s ON da.sale_id = s.id
          WHERE da.deposit_id = ?
          ORDER BY da.created_at ASC
        `, [deposit.id]);

        return {
          ...deposit,
          allocations: allocations.map(a => ({
            saleId: a.sale_id,
            saleNumber: a.sale_number,
            saleDate: a.sale_date,
            saleTotal: Number(a.sale_total || a.sale_total),
            productDetails: a.product_details,
            amountAllocated: Number(a.amount_allocated),
            previousBalance: Number(a.previous_sale_balance),
            newBalance: Number(a.new_sale_balance)
          }))
        };
      })
    );

    return res.json({ 
      success: true, 
      data: depositsWithAllocations 
    });

  } catch (error) {
    console.error('❌ Erreur récupération dépôts:', error);
    // Si les tables n'existent pas encore, renvoyer un tableau vide
    return res.json({ success: true, data: [] });
  }
});

// ✅ 5. Déduire du solde prépayé (lors d'une vente quotataire)
router.post('/:id/deduct', authenticateToken, requireRole(['admin', 'manager', 'seller']), depositRateLimiter, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { amount, saleId } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'Montant invalide' });
    }

    await connection.beginTransaction();

    const [customers] = await connection.execute(
      'SELECT * FROM customers WHERE id = ? AND user_id = ? AND status = "active"',
      [id, req.user.id]
    );
    if (customers.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Client introuvable' });
    }

    const customer = customers[0];
    const deductAmount = Number(amount);
    const currentBalance = Number(customer.prepaid_balance || 0);

    if (deductAmount > currentBalance) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: `Solde insuffisant. Solde actuel: ${currentBalance.toLocaleString('fr-FR')} F, Montant demandé: ${deductAmount.toLocaleString('fr-FR')} F`
      });
    }

    const newBalance = currentBalance - deductAmount;

    await connection.execute(
      'UPDATE customers SET prepaid_balance = ?, updated_at = NOW() WHERE id = ?',
      [newBalance, id]
    );

    await connection.commit();

    return res.json({
      success: true,
      data: {
        previousBalance: currentBalance,
        deductedAmount: deductAmount,
        newBalance,
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('❌ Erreur déduction:', error);
    return res.status(500).json({ success: false, error: 'Erreur lors de la déduction' });
  } finally {
    connection.release();
  }
});

// ✅ 6. Supprimer un client (désactivation)
router.delete('/:id', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute(
      'UPDATE customers SET status="inactive", updated_at=NOW() WHERE id=? AND user_id=?',
      [id, req.user.id]
    );
    return res.json({ success: true, message: 'Client supprimé avec succès' });
  } catch (error) {
    console.error('❌ Erreur suppression client:', error);
    return res.status(500).json({ success: false, error: 'Erreur lors de la suppression du client' });
  }
});

// ✅ 7. Obtenir les statistiques clients
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [stats] = await pool.execute(`
      SELECT
        COUNT(*) as total_customers,
        SUM(CASE WHEN customer_type = 'occasionnel' THEN 1 ELSE 0 END) as occasionnel_count,
        SUM(CASE WHEN customer_type = 'simple' OR customer_type IS NULL THEN 1 ELSE 0 END) as simple_count,
        SUM(CASE WHEN customer_type = 'quotataire' THEN 1 ELSE 0 END) as quotataire_count,
        SUM(CASE WHEN customer_type = 'revendeur' THEN 1 ELSE 0 END) as revendeur_count,
        SUM(CASE WHEN current_balance > 0 THEN 1 ELSE 0 END) as with_debt_count,
        SUM(CASE WHEN prepaid_balance > 0 THEN 1 ELSE 0 END) as with_prepaid_count,
        SUM(current_balance) as total_debt,
        SUM(prepaid_balance) as total_prepaid,
        SUM(CASE WHEN status = 'bloque' THEN 1 ELSE 0 END) as blocked_count
      FROM customers
      WHERE user_id = ? AND status IN ('active', 'bloque', 'suspended')
    `, [req.user.id]);

    return res.json({
      success: true,
      data: {
        totalCustomers: Number(stats[0].total_customers || 0),
        occasionnelCount: Number(stats[0].occasionnel_count || 0),
        simpleCount: Number(stats[0].simple_count || 0),
        quotataireCount: Number(stats[0].quotataire_count || 0),
        revendeurCount: Number(stats[0].revendeur_count || 0),
        withDebtCount: Number(stats[0].with_debt_count || 0),
        withPrepaidCount: Number(stats[0].with_prepaid_count || 0),
        totalDebt: Number(stats[0].total_debt || 0),
        totalPrepaid: Number(stats[0].total_prepaid || 0),
        blockedCount: Number(stats[0].blocked_count || 0),
      }
    });
  } catch (error) {
    console.error('❌ Erreur stats:', error);
    return res.status(500).json({ success: false, error: 'Erreur lors de la récupération des statistiques' });
  }
});

module.exports = router;
