const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Middleware d'authentification pour toutes les routes
router.use(authenticateToken);

// GET /api/invoices - Liste de toutes les factures
router.get('/', async (req, res) => {
  try {
    const [invoices] = await pool.query(`
      SELECT
        i.*,
        c.name as customer_name,
        c.company as customer_company
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.user_id = ?
      ORDER BY i.created_at DESC
    `, [req.user.id]);

    // Récupérer les items de chaque facture
    for (let invoice of invoices) {
      const [items] = await pool.query(
        'SELECT * FROM invoice_items WHERE invoice_id = ?',
        [invoice.id]
      );
      invoice.items = items;
    }

    res.json({ success: true, data: invoices });
  } catch (error) {
    console.error('Erreur récupération factures:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// GET /api/invoices/:id - Détails d'une facture
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [invoices] = await pool.query(`
      SELECT 
        i.*,
        c.name as customer_name,
        c.company as customer_company,
        c.email as customer_email,
        c.phone as customer_phone,
        c.address as customer_address
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ?
    `, [id]);

    if (invoices.length === 0) {
      return res.status(404).json({ success: false, error: 'Facture non trouvée' });
    }

    const invoice = invoices[0];

    // Récupérer les items
    const [items] = await pool.query(
      'SELECT * FROM invoice_items WHERE invoice_id = ?',
      [id]
    );
    invoice.items = items;

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Erreur récupération facture:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// POST /api/invoices - Créer une facture
router.post('/', async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const {
      invoice_number,
      customer_id,
      invoice_date,
      due_date,
      status = 'draft',
      subtotal,
      tax_rate,
      tax_amount,
      total_amount,
      notes,
      company_name,
      company_rc,
      company_ninea,
      company_phone,
      company_email,
      company_address,
      items = []
    } = req.body;

    // Insérer la facture avec user_id
    const [result] = await connection.query(`
      INSERT INTO invoices (
        user_id, invoice_number, customer_id, invoice_date, due_date, status,
        subtotal, tax_rate, tax_amount, total_amount, notes,
        company_name, company_rc, company_ninea, company_phone, company_email, company_address,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      req.user.id, invoice_number, customer_id, invoice_date, due_date || null, status,
      subtotal, tax_rate, tax_amount, total_amount, notes,
      company_name, company_rc, company_ninea, company_phone, company_email, company_address
    ]);

    const invoiceId = result.insertId;

    // Insérer les items
    for (const item of items) {
      await connection.query(`
        INSERT INTO invoice_items (invoice_id, description, quantity, unit, unit_price, line_total)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [invoiceId, item.description, item.quantity, item.unit || 'Tonne', item.unit_price, item.line_total]);
    }

    await connection.commit();

    // Récupérer la facture complète
    const [newInvoice] = await connection.query(
      'SELECT * FROM invoices WHERE id = ?',
      [invoiceId]
    );
    const [newItems] = await connection.query(
      'SELECT * FROM invoice_items WHERE invoice_id = ?',
      [invoiceId]
    );

    res.status(201).json({
      success: true,
      data: { ...newInvoice[0], items: newItems },
      message: 'Facture créée avec succès'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Erreur création facture:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  } finally {
    connection.release();
  }
});

// PUT /api/invoices/:id - Modifier une facture
router.put('/:id', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const {
      invoice_number,
      customer_id,
      invoice_date,
      due_date,
      status,
      subtotal,
      tax_rate,
      tax_amount,
      total_amount,
      notes,
      company_name,
      company_rc,
      company_ninea,
      company_phone,
      company_email,
      company_address,
      items = []
    } = req.body;

    // Mettre à jour la facture
    await connection.query(`
      UPDATE invoices SET
        invoice_number = ?, customer_id = ?, invoice_date = ?, due_date = ?, status = ?,
        subtotal = ?, tax_rate = ?, tax_amount = ?, total_amount = ?, notes = ?,
        company_name = ?, company_rc = ?, company_ninea = ?, company_phone = ?, company_email = ?, company_address = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [
      invoice_number, customer_id, invoice_date, due_date || null, status,
      subtotal, tax_rate, tax_amount, total_amount, notes,
      company_name, company_rc, company_ninea, company_phone, company_email, company_address,
      id
    ]);

    // Supprimer les anciens items
    await connection.query('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);

    // Insérer les nouveaux items
    for (const item of items) {
      await connection.query(`
        INSERT INTO invoice_items (invoice_id, description, quantity, unit, unit_price, line_total)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [id, item.description, item.quantity, item.unit || 'Tonne', item.unit_price, item.line_total]);
    }

    await connection.commit();

    // Récupérer la facture mise à jour
    const [updatedInvoice] = await connection.query(
      'SELECT * FROM invoices WHERE id = ?',
      [id]
    );
    const [updatedItems] = await connection.query(
      'SELECT * FROM invoice_items WHERE invoice_id = ?',
      [id]
    );

    res.json({
      success: true,
      data: { ...updatedInvoice[0], items: updatedItems },
      message: 'Facture mise à jour avec succès'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Erreur mise à jour facture:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  } finally {
    connection.release();
  }
});

// DELETE /api/invoices/:id - Supprimer une facture
router.delete('/:id', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { id } = req.params;

    // Supprimer d'abord les items
    await connection.query('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);
    
    // Supprimer la facture
    await connection.query('DELETE FROM invoices WHERE id = ?', [id]);

    await connection.commit();

    res.json({ success: true, message: 'Facture supprimée avec succès' });
  } catch (error) {
    await connection.rollback();
    console.error('Erreur suppression facture:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  } finally {
    connection.release();
  }
});

module.exports = router;
