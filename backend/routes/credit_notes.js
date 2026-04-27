const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// GET - Liste des avoirs
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [notes] = await pool.execute(`
      SELECT
        cn.*,
        c.name as customer_name,
        s.sale_number as original_sale_number
      FROM credit_notes cn
      JOIN customers c ON cn.customer_id = c.id
      LEFT JOIN sales s ON cn.original_sale_id = s.id
      WHERE cn.user_id = ?
      ORDER BY cn.created_at DESC
    `, [req.user.id]);

    // Récupérer les items pour chaque avoir
    const result = await Promise.all(notes.map(async (cn) => {
      const [items] = await pool.execute(`
        SELECT cni.*, p.name as product_name
        FROM credit_note_items cni
        LEFT JOIN products p ON cni.product_id = p.id
        WHERE cni.credit_note_id = ?
      `, [cn.id]);

      return {
        ...cn,
        subtotal: Number(cn.subtotal),
        tax_amount: Number(cn.tax_amount),
        total_amount: Number(cn.total_amount),
        items: items.map(i => ({
          ...i,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
          line_total: Number(i.line_total),
          productName: i.product_name || i.description,
        }))
      };
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Erreur récupération avoirs:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération des avoirs' });
  }
});

// GET - Un avoir par ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(`
      SELECT
        cn.*,
        c.name as customer_name,
        s.sale_number as original_sale_number
      FROM credit_notes cn
      JOIN customers c ON cn.customer_id = c.id
      LEFT JOIN sales s ON cn.original_sale_id = s.id
      WHERE cn.id = ? AND cn.user_id = ?
    `, [id, req.user.id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Avoir introuvable' });
    }

    const cn = rows[0];
    const [items] = await pool.execute(`
      SELECT cni.*, p.name as product_name
      FROM credit_note_items cni
      LEFT JOIN products p ON cni.product_id = p.id
      WHERE cni.credit_note_id = ?
    `, [cn.id]);

    res.json({
      success: true,
      data: {
        ...cn,
        subtotal: Number(cn.subtotal),
        tax_amount: Number(cn.tax_amount),
        total_amount: Number(cn.total_amount),
        items: items.map(i => ({
          ...i,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
          line_total: Number(i.line_total),
          productName: i.product_name || i.description,
        }))
      }
    });
  } catch (error) {
    console.error('Erreur récupération avoir:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération de l\'avoir' });
  }
});

// POST - Créer un avoir
router.post('/', authenticateToken, requireRole(['admin', 'manager', 'seller']), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { original_sale_id, customer_id, reason, items } = req.body;

    if (!customer_id || !items || items.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'customer_id et au moins un article sont obligatoires' });
    }

    // Fetcher le client pour vérifier tva_exempt
    const [custRows] = await connection.execute(
      'SELECT tva_exempt FROM customers WHERE id = ?',
      [customer_id]
    );
    if (custRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Client introuvable' });
    }
    const effectiveTaxRate = custRows[0].tva_exempt ? 0 : 18;

    // Calculer les totaux
    let subtotal = 0;
    const processedItems = items.map(item => {
      const lineTotal = Number(item.quantity) * Number(item.unit_price);
      subtotal += lineTotal;
      return {
        id: uuidv4(),
        product_id: item.product_id || null,
        description: item.description || item.productName || 'Article',
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        line_total: lineTotal,
      };
    });

    const taxAmount = subtotal * (effectiveTaxRate / 100);
    const totalAmount = subtotal + taxAmount;

    const cnId = uuidv4();
    const creditNoteNumber = `AV-${Date.now()}`;

    // Insérer l'avoir
    await connection.execute(
      `INSERT INTO credit_notes (id, user_id, credit_note_number, original_sale_id, customer_id, status, reason, subtotal, tax_amount, total_amount)
       VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)`,
      [cnId, req.user?.id || null, creditNoteNumber, original_sale_id || null, customer_id, reason || null, subtotal, taxAmount, totalAmount]
    );

    // Insérer les items
    for (const item of processedItems) {
      await connection.execute(
        `INSERT INTO credit_note_items (id, credit_note_id, product_id, description, quantity, unit_price, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [item.id, cnId, item.product_id, item.description, item.quantity, item.unit_price, item.line_total]
      );
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      data: {
        id: cnId,
        credit_note_number: creditNoteNumber,
        status: 'draft',
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Erreur création avoir:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la création de l\'avoir' });
  } finally {
    connection.release();
  }
});

// PUT - Mettre à jour le statut d'un avoir
router.put('/:id', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { status } = req.body;

    // Fetcher l'avoir actuel
    const [cnRows] = await connection.execute(
      'SELECT * FROM credit_notes WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (cnRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Avoir introuvable' });
    }

    const cn = cnRows[0];

    // Si transition vers 'validated', réduire le solde du client
    if (status === 'validated' && cn.status === 'draft') {
      await connection.execute(
        'UPDATE customers SET current_balance = current_balance - ?, updated_at = NOW() WHERE id = ?',
        [cn.total_amount, cn.customer_id]
      );
    }

    await connection.execute(
      'UPDATE credit_notes SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );

    await connection.commit();

    res.json({ success: true, message: 'Avoir mis à jour avec succès' });
  } catch (error) {
    await connection.rollback();
    console.error('Erreur mise à jour avoir:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour de l\'avoir' });
  } finally {
    connection.release();
  }
});

// DELETE - Supprimer un avoir (solo si draft)
router.delete('/:id', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;

    const [cnRows] = await pool.execute(
      'SELECT status FROM credit_notes WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (cnRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Avoir introuvable' });
    }
    if (cnRows[0].status !== 'draft') {
      return res.status(400).json({ success: false, error: 'Impossible de supprimer un avoir validé' });
    }

    await pool.execute('DELETE FROM credit_note_items WHERE credit_note_id = ?', [id]);
    await pool.execute('DELETE FROM credit_notes WHERE id = ?', [id]);

    res.json({ success: true, message: 'Avoir supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression avoir:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la suppression de l\'avoir' });
  }
});

module.exports = router;
