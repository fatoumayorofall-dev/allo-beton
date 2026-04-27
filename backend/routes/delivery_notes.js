const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Middleware d'authentification pour toutes les routes
router.use(authenticateToken);

// GET /api/delivery-notes - Liste de tous les bons de transport
router.get('/', async (req, res) => {
  try {
    const [notes] = await pool.query(`
      SELECT 
        dn.*,
        c.name as customer_name,
        c.company as customer_company
      FROM delivery_notes dn
      LEFT JOIN customers c ON dn.customer_id = c.id
      ORDER BY dn.delivery_date DESC, dn.created_at DESC
    `);

    res.json({ success: true, data: notes });
  } catch (error) {
    console.error('Erreur récupération bons de transport:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// GET /api/delivery-notes/:id - Détails d'un bon de transport
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [notes] = await pool.query(`
      SELECT 
        dn.*,
        c.name as customer_name,
        c.company as customer_company,
        c.email as customer_email,
        c.phone as customer_phone,
        c.address as customer_address
      FROM delivery_notes dn
      LEFT JOIN customers c ON dn.customer_id = c.id
      WHERE dn.id = ?
    `, [id]);

    if (notes.length === 0) {
      return res.status(404).json({ success: false, error: 'Bon de transport non trouvé' });
    }

    res.json({ success: true, data: notes[0] });
  } catch (error) {
    console.error('Erreur récupération bon de transport:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// POST /api/delivery-notes - Créer un bon de transport
router.post('/', async (req, res) => {
  try {
    const {
      delivery_number,
      customer_id,
      delivery_date,
      driver_name,
      vehicle_plate,
      product_type,
      loading_location,
      delivery_location,
      weight_tons,
      status = 'pending',
      notes,
      invoice_number
    } = req.body;

    const [result] = await pool.query(`
      INSERT INTO delivery_notes (
        delivery_number, customer_id, delivery_date, driver_name, vehicle_plate,
        product_type, loading_location, delivery_location, weight_tons, status,
        notes, invoice_number, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      delivery_number, customer_id, delivery_date, driver_name, vehicle_plate,
      product_type, loading_location, delivery_location, weight_tons, status,
      notes, invoice_number
    ]);

    const [newNote] = await pool.query(
      'SELECT * FROM delivery_notes WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: newNote[0],
      message: 'Bon de transport créé avec succès'
    });
  } catch (error) {
    console.error('Erreur création bon de transport:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// PUT /api/delivery-notes/:id - Modifier un bon de transport
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      delivery_number,
      customer_id,
      delivery_date,
      driver_name,
      vehicle_plate,
      product_type,
      loading_location,
      delivery_location,
      weight_tons,
      status,
      notes,
      invoice_number
    } = req.body;

    await pool.query(`
      UPDATE delivery_notes SET
        delivery_number = ?, customer_id = ?, delivery_date = ?, driver_name = ?, vehicle_plate = ?,
        product_type = ?, loading_location = ?, delivery_location = ?, weight_tons = ?, status = ?,
        notes = ?, invoice_number = ?, updated_at = NOW()
      WHERE id = ?
    `, [
      delivery_number, customer_id, delivery_date, driver_name, vehicle_plate,
      product_type, loading_location, delivery_location, weight_tons, status,
      notes, invoice_number, id
    ]);

    const [updatedNote] = await pool.query(
      'SELECT * FROM delivery_notes WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      data: updatedNote[0],
      message: 'Bon de transport mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur mise à jour bon de transport:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// DELETE /api/delivery-notes/:id - Supprimer un bon de transport
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM delivery_notes WHERE id = ?', [id]);

    res.json({ success: true, message: 'Bon de transport supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression bon de transport:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// GET /api/delivery-notes/by-customer/:customerId - Bons par client
router.get('/by-customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const [notes] = await pool.query(`
      SELECT * FROM delivery_notes 
      WHERE customer_id = ?
      ORDER BY delivery_date DESC
    `, [customerId]);

    res.json({ success: true, data: notes });
  } catch (error) {
    console.error('Erreur récupération bons par client:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// GET /api/delivery-notes/stats - Statistiques des bons de transport
router.get('/stats/summary', async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END) as in_transit,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(weight_tons) as total_tonnage
      FROM delivery_notes
    `);

    res.json({ success: true, data: stats[0] });
  } catch (error) {
    console.error('Erreur récupération stats:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

module.exports = router;
