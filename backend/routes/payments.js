const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// 🧠 Smart Accounting Engine - Comptabilité Invisible
let smartAccountingEngine = null;
try {
    smartAccountingEngine = require('../services/smartAccountingEngine');
    console.log('✅ Smart Accounting Engine chargé pour les paiements');
} catch (e) {
    console.warn('⚠️ Smart Accounting Engine non disponible:', e.message);
}

// ─── Récupérer tous les paiements (avec pagination) ────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(10, parseInt(req.query.limit) || 100));
    const offset = (page - 1) * limit;

    // Filtres optionnels
    const { method, status, date_from, date_to, search } = req.query;

    let where = '1=1';
    const params = [];

    if (method && method !== 'all') {
      where += ' AND p.payment_method = ?';
      params.push(method);
    }
    if (status && status !== 'all') {
      where += ' AND p.status = ?';
      params.push(status);
    }
    if (date_from) {
      where += ' AND (p.payment_date >= ? OR p.created_at >= ?)';
      params.push(date_from, date_from);
    }
    if (date_to) {
      where += ' AND (p.payment_date <= ? OR p.created_at <= ?)';
      params.push(date_to + ' 23:59:59', date_to + ' 23:59:59');
    }
    if (search) {
      where += ' AND (p.payment_number LIKE ? OR c.name LIKE ? OR s.sale_number LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    // Compter le total
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM payments p
       LEFT JOIN sales s ON p.sale_id = s.id
       LEFT JOIN customers c ON s.customer_id = c.id
       WHERE ${where}`,
      params
    );

    const [payments] = await pool.execute(`
      SELECT
        p.*,
        s.sale_number,
        s.total_amount as sale_total,
        s.customer_id,
        c.name as customer_name,
        COALESCE(paid.total_paid, 0) as total_paid,
        COALESCE(s.total_amount - COALESCE(paid.total_paid, 0), 0) as remaining_amount
      FROM payments p
      LEFT JOIN sales s ON p.sale_id = s.id
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN (
        SELECT sale_id, SUM(amount) as total_paid
        FROM payments
        WHERE status = 'completed'
        GROUP BY sale_id
      ) paid ON paid.sale_id = s.id
      WHERE ${where}
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, params);

    const transformedPayments = payments.map(payment => ({
      ...payment,
      saleId: payment.sale_id,
      method: payment.payment_method,
      reference: payment.reference_number,
      date: payment.payment_date,
      sale_total: Number(payment.sale_total) || 0,
      total_paid: Number(payment.total_paid) || 0,
      remaining_amount: Number(payment.remaining_amount) || 0
    }));

    const total = countResult[0].total;

    res.json({
      success: true,
      data: transformedPayments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erreur récupération paiements:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des paiements'
    });
  }
});

// ─── Récupérer les ventes en attente de paiement ────────────────────────────
router.get('/pending-sales', authenticateToken, async (req, res) => {
  try {
    const [sales] = await pool.execute(`
      SELECT
        s.id,
        s.sale_number,
        s.total_amount,
        s.payment_status,
        s.status,
        s.created_at,
        s.sale_date,
        s.sale_type,
        c.id as customer_id,
        c.name as customer_name,
        c.company as customer_company,
        c.phone as customer_phone,
        COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.sale_id = s.id AND p.status = 'completed'), 0) as amount_paid,
        (s.total_amount - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.sale_id = s.id AND p.status = 'completed'), 0)) as remaining_amount
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.status != 'cancelled'
        AND s.total_amount > 0
        AND (s.total_amount - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.sale_id = s.id AND p.status = 'completed'), 0)) > 0
      ORDER BY
        CASE
          WHEN COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.sale_id = s.id AND p.status = 'completed'), 0) = 0 THEN 1
          ELSE 2
        END,
        s.created_at DESC
      LIMIT 100
    `);

    const transformedSales = sales.map(sale => {
      const amountPaid = Number(sale.amount_paid) || 0;
      const totalAmount = Number(sale.total_amount) || 0;
      const remainingAmount = Math.max(0, totalAmount - amountPaid);

      return {
        id: sale.id,
        sale_number: sale.sale_number,
        total_amount: totalAmount,
        amount_paid: amountPaid,
        remaining_amount: remainingAmount,
        payment_status: amountPaid === 0 ? 'pending' : 'partial',
        status: sale.status,
        sale_type: sale.sale_type,
        created_at: sale.created_at,
        sale_date: sale.sale_date,
        customer_id: sale.customer_id,
        customer_name: sale.customer_name,
        customer_company: sale.customer_company,
        customer_phone: sale.customer_phone,
        payment_progress: totalAmount > 0
          ? Math.min(100, Math.round((amountPaid / totalAmount) * 100))
          : 0
      };
    });

    const pending = transformedSales.filter(s => s.payment_status === 'pending');
    const partial = transformedSales.filter(s => s.payment_status === 'partial');

    const stats = {
      total_pending: pending.length,
      total_partial: partial.length,
      total_remaining: transformedSales.reduce((sum, s) => sum + s.remaining_amount, 0),
      total_amount: transformedSales.reduce((sum, s) => sum + s.total_amount, 0),
      total_paid: transformedSales.reduce((sum, s) => sum + s.amount_paid, 0)
    };

    res.json({
      success: true,
      data: transformedSales,
      stats
    });

  } catch (error) {
    console.error('Erreur récupération ventes en attente:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des ventes en attente'
    });
  }
});

// ─── Créer un nouveau paiement ──────────────────────────────────────────────
router.post('/', authenticateToken, requireRole(['admin', 'manager', 'seller']), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const {
      saleId,
      amount,
      method,
      reference,
      notes
    } = req.body;

    // Validation de base
    if (!saleId || !amount || !method) {
      connection.release();
      return res.status(400).json({
        success: false,
        error: 'La vente, le montant et la méthode de paiement sont obligatoires'
      });
    }

    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      connection.release();
      return res.status(400).json({
        success: false,
        error: 'Le montant doit être un nombre positif'
      });
    }

    // ✅ Vérifier la vente et le montant restant (avec verrouillage)
    const [saleInfo] = await connection.execute(
      `SELECT s.id, s.total_amount, s.customer_id, s.sale_type,
              COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.sale_id = s.id AND p.status = 'completed'), 0) as already_paid
       FROM sales s WHERE s.id = ? AND s.status != 'cancelled' FOR UPDATE`,
      [saleId]
    );

    if (saleInfo.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        error: 'Vente introuvable ou annulée'
      });
    }

    const sale = saleInfo[0];
    const totalAmount = Number(sale.total_amount);
    const alreadyPaid = Number(sale.already_paid);
    const remainingOnSale = totalAmount - alreadyPaid;

    // ✅ Validation: pas de surpaiement
    if (paymentAmount > remainingOnSale + 0.01) {
      connection.release();
      return res.status(400).json({
        success: false,
        error: `Le montant (${paymentAmount}) dépasse le reste à payer (${remainingOnSale.toFixed(0)})`
      });
    }

    // Générer un numéro de paiement unique
    const paymentNumber = `PAY-${Date.now()}`;
    const paymentId = uuidv4();

    // Créer le paiement
    await connection.execute(
      `INSERT INTO payments (id, user_id, sale_id, payment_number, amount, payment_method, reference_number, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?)`,
      [paymentId, req.user.id, saleId, paymentNumber, paymentAmount, method, reference || null, notes || null]
    );

    // Calculer le nouveau total payé
    const newTotalPaid = alreadyPaid + paymentAmount;
    let paymentStatus = 'pending';
    if (newTotalPaid >= totalAmount) {
      paymentStatus = 'paid';
    } else if (newTotalPaid > 0) {
      paymentStatus = 'partial';
    }

    // Mettre à jour le statut de paiement de la vente
    await connection.execute(
      'UPDATE sales SET payment_status = ?, updated_at = NOW() WHERE id = ?',
      [paymentStatus, saleId]
    );

    // ✅ NOUVEAU: Réduire la dette du client (current_balance)
    if (sale.customer_id) {
      // Récupérer le solde actuel du client
      const [customerInfo] = await connection.execute(
        'SELECT current_balance FROM customers WHERE id = ? FOR UPDATE',
        [sale.customer_id]
      );

      if (customerInfo.length > 0) {
        const currentDebt = Number(customerInfo[0].current_balance) || 0;
        // Réduire la dette du montant payé (sans aller en négatif)
        const newDebt = Math.max(0, currentDebt - paymentAmount);
        await connection.execute(
          'UPDATE customers SET current_balance = ?, updated_at = NOW() WHERE id = ?',
          [newDebt, sale.customer_id]
        );
      }
    }

    await connection.commit();

    // 🧠 Comptabilité Invisible: Enregistrer automatiquement l'écriture comptable du paiement
    if (smartAccountingEngine) {
      try {
        await smartAccountingEngine.enregistrerPaiementClient({
          id: paymentId,
          payment_number: paymentNumber,
          sale_id: saleId,
          customer_id: sale.customer_id,
          amount: paymentAmount,
          payment_method: method,
          reference_number: reference,
          created_at: new Date()
        });
        console.log(`✅ Écriture comptable créée pour paiement ${paymentNumber}`);
      } catch (comptaError) {
        // Ne pas bloquer le paiement si la comptabilité échoue
        console.error('⚠️ Erreur comptabilité (non bloquante):', comptaError.message);
      }
    }

    res.status(201).json({
      success: true,
      data: {
        id: paymentId,
        payment_number: paymentNumber,
        payment_status: paymentStatus,
        customer_id: sale.customer_id
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Erreur création paiement:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du paiement'
    });
  } finally {
    connection.release();
  }
});

// ─── Annuler un paiement ────────────────────────────────────────────────────
router.put('/:id/cancel', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const paymentId = req.params.id;

    // Récupérer le paiement à annuler
    const [paymentInfo] = await connection.execute(
      `SELECT p.*, s.customer_id, s.total_amount, s.sale_type
       FROM payments p
       LEFT JOIN sales s ON p.sale_id = s.id
       WHERE p.id = ? AND p.status = 'completed'`,
      [paymentId]
    );

    if (paymentInfo.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        error: 'Paiement introuvable ou déjà annulé'
      });
    }

    const payment = paymentInfo[0];
    const paymentAmount = Number(payment.amount);

    // Marquer le paiement comme annulé
    await connection.execute(
      "UPDATE payments SET status = 'cancelled', updated_at = NOW() WHERE id = ?",
      [paymentId]
    );

    // Recalculer le statut de paiement de la vente
    const [paymentSum] = await connection.execute(
      "SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE sale_id = ? AND status = 'completed'",
      [payment.sale_id]
    );

    const totalPaid = Number(paymentSum[0].total_paid);
    const totalAmount = Number(payment.total_amount);
    let newStatus = 'pending';
    if (totalPaid >= totalAmount) {
      newStatus = 'paid';
    } else if (totalPaid > 0) {
      newStatus = 'partial';
    }

    await connection.execute(
      'UPDATE sales SET payment_status = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, payment.sale_id]
    );

    // Restaurer la dette du client
    if (payment.customer_id) {
      const [customerInfo] = await connection.execute(
        'SELECT current_balance FROM customers WHERE id = ? FOR UPDATE',
        [payment.customer_id]
      );

      if (customerInfo.length > 0) {
        const currentDebt = Number(customerInfo[0].current_balance) || 0;
        const restoredDebt = currentDebt + paymentAmount;
        await connection.execute(
          'UPDATE customers SET current_balance = ?, updated_at = NOW() WHERE id = ?',
          [restoredDebt, payment.customer_id]
        );
      }
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Paiement annulé avec succès',
      data: {
        payment_id: paymentId,
        new_sale_status: newStatus,
        customer_id: payment.customer_id
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Erreur annulation paiement:', error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de l'annulation du paiement"
    });
  } finally {
    connection.release();
  }
});

module.exports = router;
