const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Récupérer tous les paiements
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [payments] = await pool.execute(`
      SELECT 
        p.*,
        s.sale_number,
        c.name as customer_name
      FROM payments p
      LEFT JOIN sales s ON p.sale_id = s.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
      LIMIT 100
    `, [req.user.id]);

    // Transformer les données pour correspondre au format frontend
    const transformedPayments = payments.map(payment => ({
      ...payment,
      saleId: payment.sale_id,
      method: payment.payment_method,
      reference: payment.reference_number,
      date: payment.payment_date
    }));

    res.json({
      success: true,
      data: transformedPayments
    });

  } catch (error) {
    console.error('Erreur récupération paiements:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des paiements'
    });
  }
});

// Créer un nouveau paiement
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

    // Validation
    if (!saleId || !amount || !method) {
      return res.status(400).json({
        success: false,
        error: 'La vente, le montant et la méthode de paiement sont obligatoires'
      });
    }

    // Générer un numéro de paiement unique
    const paymentNumber = `PAY-${Date.now()}`;
    const paymentId = uuidv4();

    // Créer le paiement
    await connection.execute(
      `INSERT INTO payments (id, user_id, sale_id, payment_number, amount, payment_method, reference_number, status, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?)`,
      [paymentId, req.user.id, saleId, paymentNumber, amount, method, reference, notes]
    );

    // Mettre à jour le statut de paiement de la vente
    const [saleInfo] = await connection.execute(
      'SELECT total_amount FROM sales WHERE id = ?',
      [saleId]
    );

    if (saleInfo.length > 0) {
      const totalAmount = saleInfo[0].total_amount;
      
      // Calculer le total des paiements pour cette vente
      const [paymentSum] = await connection.execute(
        'SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE sale_id = ? AND status = "completed"',
        [saleId]
      );

      const totalPaid = paymentSum[0].total_paid;
      let paymentStatus = 'pending';

      if (totalPaid >= totalAmount) {
        paymentStatus = 'paid';
      } else if (totalPaid > 0) {
        paymentStatus = 'partial';
      }

      await connection.execute(
        'UPDATE sales SET payment_status = ?, updated_at = NOW() WHERE id = ?',
        [paymentStatus, saleId]
      );
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      data: { id: paymentId, payment_number: paymentNumber }
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

module.exports = router;